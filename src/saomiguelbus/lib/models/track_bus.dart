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
    init(cardRoute, cardRoute.date);
    updateStatus();
    //scheduleNotification(alertTimeThreshold);
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
    bool shouldBreak = false;
    for (var stop in stops.entries) {
      var stopTime = DateTime.parse(
          '${DateFormat('yyyy-MM-dd').format(searchDay)} ${stop.value.replaceAll('h', ':')}');

      if (currentTime.isBefore(stopTime) && !shouldBreak) {
        currentStop = lastStop ?? catchStop;
        nextStop = stop.key;

        // Calculate time to next stop
        timeToNextStop = stopTime.difference(currentTime);

        // Calculate time to catch
        if (currentStop == catchStop) {
          timeToCatch = timeToNextStop;
        }

        shouldBreak = true;
      }

      lastStop = stop.key;

      // Calculate time to arrival
      if (lastStop == arrivalStop) {
        timeToArrival = stopTime.difference(currentTime);
        if (shouldBreak) {
          break;
        }
      }
    }

    if (status == Status.off) {
      currentStop = null;
      nextStop = stops.keys.first;
    }
  }

  void scheduleNotification(alertTimeThreshold) {
    // Replace 'h' with ':' to match the standard time format "HH:mm"
    String formattedCatchTimeStr = this.catchTime.replaceAll('h', ':');

    // Parse catchTime
    var format = DateFormat("HH:mm");
    var catchTime = format.parse(formattedCatchTimeStr);

    // Get the current date
    var now = DateTime.now();
    developer.log('Now: $now', name: 'TrackBus');

    // Create a DateTime object for catchTime in Azores Timezone
    var azoresTimeZone = tz.getLocation('Atlantic/Azores');
    var catchTimeInAzores = tz.TZDateTime(azoresTimeZone, now.year, now.month,
        now.day, catchTime.hour, catchTime.minute);

    // Adjust catchTime by the time difference and the threshold
    var alertTime = catchTimeInAzores.subtract(alertTimeThreshold);

    // Log the alertTime TODO: Make sure the alert is being calculated right
    developer.log('Alert Time: ${alertTime.hour}:${alertTime.minute}',
        name: 'TrackBus');

    NotificationService().scheduleNotification(
      id: int.parse(routeId +
          now.day.toString() +
          now.hour.toString() +
          now.minute.toString()),
      title: 'Bus $routeId is coming!',
      body: 'Alerted at ${alertTime.hour}:${alertTime.minute}',
      year: searchDay.year,
      month: searchDay.month,
      day: searchDay.day,
      hour: catchTimeInAzores.hour,
      minute: catchTimeInAzores.minute,
    );
  }

  void track() {
    developer.log(
        'Tracking bus $routeId: $this -> Catch Time: $catchTime - Arrival Time: $arrivalTime');
  }

  void _save() {
    trackBuses.add(this);
    // Sort trackBuses based on timeToCatch
    trackBuses.sort((a, b) => a.timeToCatch!.compareTo(b.timeToCatch!));
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
