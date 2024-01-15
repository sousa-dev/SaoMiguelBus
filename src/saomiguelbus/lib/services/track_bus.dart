import 'package:intl/intl.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'dart:developer' as developer;

import 'package:saomiguelbus/models/card_route.dart';
import 'package:saomiguelbus/models/stop.dart';

class TrackBus {
  late CardRoute cardRoute;

  late DateTime alertTime;

  TrackBus(
    this.cardRoute, {
    Duration alertTimeThreshold = const Duration(minutes: 10),
  }) {
    // Initialize the timezone data
    tz.initializeTimeZones();

    // Replace 'h' with ':' to match the standard time format "HH:mm"
    String formattedCatchTimeStr = cardRoute.catchTime.replaceAll('h', ':');

    // Parse catchTime
    var format = DateFormat("HH:mm");
    var catchTime = format.parse(formattedCatchTimeStr);

    // Get the current date
    var now = DateTime.now();

    // Create a DateTime object for catchTime in Azores Timezone
    var azoresTimeZone = tz.getLocation('Atlantic/Azores');
    var catchTimeInAzores = tz.TZDateTime(azoresTimeZone, now.year, now.month,
        now.day, catchTime.hour, catchTime.minute);

    // log current time on device
    developer.log('Current Time: ${now.hour}:${now.minute}', name: 'TrackBus');

    // Calculate the offset difference between Azores Timezone and local timezone
    var localTimeZoneOffset = tz.TZDateTime.now(tz.local).timeZoneOffset;
    var azoresTimeZoneOffset = tz.TZDateTime.now(azoresTimeZone).timeZoneOffset;
    var offsetDifference = localTimeZoneOffset - azoresTimeZoneOffset;

    // Log times and difference
    developer.log('Local Timezone: $localTimeZoneOffset');
    developer.log('Azores Timezone: $azoresTimeZoneOffset');
    developer.log('Local Timezone Offset: $offsetDifference');

    // Adjust catchTime by the time difference and the threshold
    var alertTime =
        catchTimeInAzores.add(offsetDifference).subtract(alertTimeThreshold);

    // Log the alertTime
    developer.log('Alert Time: ${alertTime.hour}:${alertTime.minute}',
        name: 'TrackBus');
  }

  void track() {
    // Logic to track the bus
    developer.log(
        'Tracking bus ${cardRoute.routeId}: $cardRoute -> Catch Time: ${cardRoute.catchTime} - Arrival Time: ${cardRoute.arrivalTime}');
    // Implement your tracking logic here
  }

  // Add more methods or properties if needed
}
