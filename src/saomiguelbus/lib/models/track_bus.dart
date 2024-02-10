import 'dart:convert';

import 'package:intl/intl.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/utils/preferences_utility.dart';
import 'package:timezone/timezone.dart' as tz;
import 'dart:developer' as developer;

import 'package:saomiguelbus/models/card_route.dart';
import 'package:saomiguelbus/models/stop.dart';
import 'package:saomiguelbus/services/notifications.dart';

enum Status { off, waiting, running, finished, delayed, paused }

class TrackBus {
  late String id;

  late Map<Stop, String> stops;
  late String catchTime;
  late Stop catchStop;
  late String arrivalTime;
  late Stop arrivalStop;
  late Duration routeDuration;
  late String routeId;

  late DateTime searchDay;

  Status status = Status.off;
  late Stop? currentStop;
  late Stop? nextStop;
  late String routeStart;
  late String routeFinish;

  DateTime? alertTime;
  Duration? timeToArrival;
  Duration? timeToCatch;
  Duration? timeToNextStop;

  TrackBus(
    cardRoute, {
    Duration alertTimeThreshold = const Duration(minutes: 10),
  }) {
    developer.log('Creating TrackBus', name: 'TrackBus');
    init(cardRoute, cardRoute.date);
    updateStatus();
    scheduleNotification(alertTimeThreshold);
    _save();
  }

  void init(CardRoute cardRoute, DateTime searchDay) {
    id = cardRoute.routeId +
        searchDay.millisecondsSinceEpoch.toString() +
        cardRoute.catchTime +
        cardRoute.arrivalTime;

    stops = cardRoute.stops;
    catchTime = cardRoute.catchTime;
    catchStop = cardRoute.catchStop;
    arrivalTime = cardRoute.arrivalTime;
    arrivalStop = cardRoute.arrivalStop;
    routeDuration = cardRoute.duration;
    routeId = cardRoute.routeId;

    routeStart = stops.values.first;
    routeFinish = stops.values.last;

    this.searchDay = searchDay;
  }

  void updateStatus() {
    var now = DateTime.now();
    var azoresTimeZone = tz.getLocation('Atlantic/Azores');
    var currentTime =
        normalizeDateTime(tz.TZDateTime.from(now, azoresTimeZone));

    // developer.log("Current Time in Azores: $currentTime");

    String formattedSearchDay =
        "${searchDay.year}-${searchDay.month.toString().padLeft(2, '0')}-${searchDay.day.toString().padLeft(2, '0')}";
    var catchDateTime =
        DateTime.parse('$formattedSearchDay $catchTime'.replaceAll('h', ':'));
    var arrivalDateTime =
        DateTime.parse('$formattedSearchDay $arrivalTime'.replaceAll('h', ':'));
    var routeStartDateTime =
        DateTime.parse('$formattedSearchDay $routeStart'.replaceAll('h', ':'));
    var routeFinishDateTime =
        DateTime.parse('$formattedSearchDay $routeFinish'.replaceAll('h', ':'));

    // Determine the status of the bus
    // developer.log('Catch Time: $catchDateTime');
    // developer.log('Arrival Time: $arrivalDateTime');
    // developer.log('Route Start Time: $routeStartDateTime');
    // developer.log('Route Finish Time: $routeFinishDateTime');
    timeToArrival =
        arrivalDateTime.add(const Duration(minutes: 1)).difference(currentTime);
    timeToCatch =
        catchDateTime.add(const Duration(minutes: 1)).difference(currentTime);

    if (currentTime.isAfter(routeStartDateTime) &&
        currentTime.isBefore(catchDateTime)) {
      status = Status.waiting;
    } else if (currentTime.isAfter(catchDateTime) &&
        currentTime.isBefore(arrivalDateTime)) {
      status = Status.running;
    } else if (currentTime.isAfter(arrivalDateTime) &&
        currentTime.isBefore(routeFinishDateTime)) {
      status = Status.finished;
    } else if (currentTime
        .isAfter(routeFinishDateTime.add(const Duration(minutes: 2)))) {
      if (trackBuses.contains(this)) {
        _remove();
      }
      return;
    } else {
      status = Status.off;
    }

    // Update the currentStop and nextStop
    updateStops(currentTime, searchDay);
  }

  void updateStops(DateTime currentTime, DateTime searchDay) {
    if (status == Status.finished) {
      currentStop = arrivalStop;
      nextStop = null;
      return;
    }

    Stop? lastStop;
    for (var stop in stops.entries) {
      var stopTime = DateTime.parse(
          '${DateFormat('yyyy-MM-dd').format(searchDay)} ${stop.value.replaceAll('h', ':')}');

      if (currentTime.isBefore(stopTime)) {
        currentStop = lastStop ?? catchStop; //TODO: Fix this stop
        nextStop = stop.key;

        // Calculate time to next stop
        timeToNextStop =
            stopTime.add(const Duration(minutes: 1)).difference(currentTime);
      }

      lastStop = stop.key;
    }

    if (status == Status.off) {
      currentStop = null;
      nextStop = stops.keys.first;
    }
  }

  void scheduleNotification(alertTimeThreshold) {
    developer.log('Alert Time:', name: 'TrackBus');
    // Replace 'h' with ':' to match the standard time format "HH:mm"
    String formattedCatchTimeStr = this.catchTime.replaceAll('h', ':');

    // Parse catchTime
    var format = DateFormat("HH:mm");
    var catchTime = format.parse(formattedCatchTimeStr);

    // Create a DateTime object for catchTime in Azores Timezone
    var azoresTimeZone = tz.getLocation('Atlantic/Azores');
    var catchTimeInAzores = tz.TZDateTime(azoresTimeZone, searchDay.year,
        searchDay.month, searchDay.day, catchTime.hour, catchTime.minute);

    NotificationService().scheduleNotification(
      id: int.parse(routeId +
          searchDay.day.toString() +
          searchDay.hour.toString() +
          searchDay.minute.toString()),
      title: 'Bus $routeId is coming!',
      body: 'Alerted at ${catchTimeInAzores.hour}:${catchTimeInAzores.minute}',
      year: catchTimeInAzores.year,
      month: catchTimeInAzores.month,
      day: catchTimeInAzores.day,
      hour: catchTimeInAzores.hour,
      minute: catchTimeInAzores.minute,
      alertTimeThreshold: alertTimeThreshold,
    );
  }

  void track() {
    developer.log(
        'Tracking bus $routeId: $this -> Catch Time: $catchTime - Arrival Time: $arrivalTime');
  }

  void _save() {
    trackBuses.add(this);
    // Sort trackBuses based on timeToCatch
    trackBuses.sort((a, b) {
      // Assuming timeToCatch can be null and you treat null as "less than" any non-null value
      if (a.timeToCatch == null && b.timeToCatch == null) return 0;
      if (a.timeToCatch == null) return -1;
      if (b.timeToCatch == null) return 1;
      return a.timeToCatch!.compareTo(b.timeToCatch!);
    });
    _saveTrackBusOnPrefs();
  }

  void _remove() {
    trackBuses.remove(this);
    _saveTrackBusOnPrefs();
  }

  void _saveTrackBusOnPrefs() async {
    saveOnSharedPreferences(trackBuses, 'track_buses');
  }

  void loadTrackBusToGlobals() async {
    loadFromSharedPreferences('track_buses');
  }

  @override
  String toString() {
    return 'TrackBus: {'
        'id: $id, '
        'status: $status, '
        'currentStop: ${currentStop?.name}, '
        'nextStop: ${nextStop?.name}, '
        'catchStop: ${catchStop.name}, '
        'arrivalStop: ${arrivalStop.name}, '
        'catchTime: $catchTime, '
        'arrivalTime: $arrivalTime, '
        'timeToArrival: ${timeToArrival?.inMinutes} minutes, '
        'timeToNextStop: ${timeToNextStop?.inMinutes} minutes, '
        'timeToCatch: ${timeToCatch?.inMinutes} minutes'
        '}';
  }

  DateTime normalizeDateTime(DateTime dateTime) {
    return DateTime(dateTime.year, dateTime.month, dateTime.day, dateTime.hour,
        dateTime.minute, dateTime.second);
  }

  TrackBus.fromJson(Map<String, dynamic> json)
      : id = json['id'],
        stops = (json['stops'] as Map<String, dynamic>).map(
            (key, value) => MapEntry(Stop.fromJson(jsonDecode(key)), value)),
        catchTime = json['catchTime'],
        catchStop = Stop.fromJson(json['catchStop']),
        arrivalTime = json['arrivalTime'],
        arrivalStop = Stop.fromJson(json['arrivalStop']),
        routeDuration = Duration(minutes: json['routeDuration']),
        routeId = json['routeId'],
        searchDay = DateTime.parse(json['searchDay']),
        status = Status.values[json['status']],
        currentStop = json['currentStop'] != null
            ? Stop.fromJson(json['currentStop'])
            : null,
        nextStop =
            json['nextStop'] != null ? Stop.fromJson(json['nextStop']) : null,
        routeStart = json['routeStart'],
        routeFinish = json['routeFinish'],
        alertTime = json['alertTime'] != null
            ? DateTime.parse(json['alertTime'])
            : null,
        timeToArrival = json['timeToArrival'] != null
            ? Duration(minutes: json['timeToArrival'])
            : null,
        timeToCatch = json['timeToCatch'] != null
            ? Duration(minutes: json['timeToCatch'])
            : null,
        timeToNextStop = json['timeToNextStop'] != null
            ? Duration(minutes: json['timeToNextStop'])
            : null;

  Map<String, dynamic> toJson() => {
        'id': id,
        'stops': stops
            .map((key, value) => MapEntry(jsonEncode(key.toJson()), value)),
        'catchTime': catchTime,
        'catchStop': catchStop.toJson(),
        'arrivalTime': arrivalTime,
        'arrivalStop': arrivalStop.toJson(),
        'routeDuration': routeDuration.inMinutes,
        'routeId': routeId,
        'searchDay': searchDay.toIso8601String(),
        'status': status.index,
        'currentStop': currentStop?.toJson(),
        'nextStop': nextStop?.toJson(),
        'routeStart': routeStart,
        'routeFinish': routeFinish,
        'alertTime': alertTime?.toIso8601String(),
        'timeToArrival': timeToArrival?.inMinutes,
        'timeToCatch': timeToCatch?.inMinutes,
        'timeToNextStop': timeToNextStop?.inMinutes,
      };
}
