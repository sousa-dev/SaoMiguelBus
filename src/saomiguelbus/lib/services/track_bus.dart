import 'package:intl/intl.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:timezone/timezone.dart' as tz;
import 'dart:developer' as developer;

import 'package:saomiguelbus/models/card_route.dart';
import 'package:saomiguelbus/models/stop.dart';
import 'package:saomiguelbus/services/notifications.dart';

enum Status { off, waiting, running, finished, delayed, paused }

class TrackBus {
  late Map<Stop, String> stops;
  late String catchTime;
  late Stop catchStop;
  late String arrivalTime;
  late Stop arrivalStop;
  late Duration routeDuration;
  late String routeId;

  late DateTime searchDay;

  late Status status;
  late Stop? currentStop;
  late Stop? nextStop;
  late String routeStart;
  late String routeFinish;

  late DateTime alertTime;

  TrackBus(
    cardRoute, {
    Duration alertTimeThreshold = const Duration(minutes: 10),
  }) {
    init(cardRoute, cardRoute.date);
    updateStatus();
    //scheduleNotification(alertTimeThreshold);
    trackBuses.add(this);
  }

  void init(CardRoute cardRoute, DateTime searchDay) {
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
        trackBuses.remove(this);
      }
      return;
    } else {
      status = Status.off;
    }

    // Update the currentStop and nextStop
    updateStops(currentTime, searchDay);
  }

  void updateStops(DateTime currentTime, DateTime searchDay) {
    if (status == Status.off) {
      currentStop = null;
      nextStop = null;
      return;
    }

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
        currentStop = lastStop ?? catchStop;
        nextStop = stop.key;
        break;
      }
      lastStop = stop.key;
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
    // Logic to track the bus
    developer.log(
        'Tracking bus $routeId: $this -> Catch Time: $catchTime - Arrival Time: $arrivalTime');
    // Implement your tracking logic here
  }

  @override
  String toString() {
    return 'TrackBus: {'
        'status: $status, '
        'currentStop: ${currentStop?.name}, '
        'catchStop: ${catchStop.name}, '
        'arrivalStop: ${arrivalStop.name}, '
        'catchTime: $catchTime, '
        'arrivalTime: $arrivalTime, '
        '}';
  }

  DateTime normalizeDateTime(DateTime dateTime) {
    return DateTime(dateTime.year, dateTime.month, dateTime.day, dateTime.hour,
        dateTime.minute, dateTime.second);
  }
}
