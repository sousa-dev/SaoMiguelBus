import 'package:intl/intl.dart';
import 'package:timezone/data/latest.dart' as tz;
import 'package:timezone/timezone.dart' as tz;
import 'dart:developer' as developer;

import 'package:saomiguelbus/models/card_route.dart';
import 'package:saomiguelbus/models/stop.dart';
import 'package:saomiguelbus/services/notifications.dart';

class TrackBus {
  late CardRoute cardRoute;

  late DateTime alertTime;

  TrackBus(
    this.cardRoute, {
    Duration alertTimeThreshold = const Duration(minutes: 70),
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
      id: int.parse(cardRoute.routeId +
          now.day.toString() +
          now.hour.toString() +
          now.minute.toString()),
      title: 'Bus ${cardRoute.routeId} is coming!',
      body: 'Alerted at ${alertTime.hour}:${alertTime.minute}',
      year: now.year,
      month: now.month,
      day: now.day, //TODO: Change to search values
      hour: catchTimeInAzores.hour,
      minute: catchTimeInAzores.minute,
    );
  }

  void track() {
    // Logic to track the bus
    developer.log(
        'Tracking bus ${cardRoute.routeId}: $cardRoute -> Catch Time: ${cardRoute.catchTime} - Arrival Time: ${cardRoute.arrivalTime}');
    // Implement your tracking logic here
  }
}
