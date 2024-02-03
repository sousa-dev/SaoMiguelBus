import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:timezone/timezone.dart' as tz;
import 'package:timezone/data/latest.dart' as tz_latest;
import 'dart:developer' as developer;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  final FlutterLocalNotificationsPlugin notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<void> initNotification() async {
    AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings(
            '@android:drawable/ic_dialog_info'); // Logo for notification
    var initializationSettingsIOS = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
        onDidReceiveLocalNotification:
            (int id, String? title, String? body, String? payload) async {});
    final InitializationSettings initializationSettings =
        InitializationSettings(
            android: initializationSettingsAndroid,
            iOS: initializationSettingsIOS);
    await notificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveBackgroundNotificationResponse: backgroundNotificationHandler,
    );
  }

  notificationDetails() {
    return const NotificationDetails(
      android: AndroidNotificationDetails(
        'channel id',
        'channel name',
        importance: Importance.max,
        priority: Priority.high,
      ),
      iOS: DarwinNotificationDetails(),
    );
  }

  Future<void> scheduleNotification({
    required int id,
    required String title,
    required String body,
    required int year,
    required int month,
    required int day,
    required int hour,
    required int minute,
  }) async {
    if (Platform.isAndroid) {
      var androidInfo = await DeviceInfoPlugin().androidInfo;
      var sdkInt = androidInfo.version.sdkInt;
      if (sdkInt < 24) {
        developer.log(
            'NotificationService.scheduleNotification: Android version is lower than 24',
            name: 'NotificationService');
        return;
      }
    }

    var details = await notificationDetails();

    // Initialize time zone data
    tz_latest.initializeTimeZones();

    // Define the Azores timezone
    var azoresTimeZone = tz.getLocation('Atlantic/Azores');

    // Create a TZDateTime for the scheduled time in the Azores timezone
    var scheduledDateInAzoresTimeZone =
        tz.TZDateTime(azoresTimeZone, year, month, day, hour, minute);

    // Convert the Azores time to the local timezone
    var scheduledDateInLocalTimeZone =
        tz.TZDateTime.from(scheduledDateInAzoresTimeZone, tz.local);

    // Check if the time has already passed in local timezone
    var nowInLocalTimeZone = tz.TZDateTime.now(tz.local);
    if (scheduledDateInLocalTimeZone.isBefore(nowInLocalTimeZone)) {
      developer.log(
          'NotificationService.scheduleNotification: Scheduled time has already passed',
          name: 'NotificationService');
      scheduledDateInLocalTimeZone =
          scheduledDateInLocalTimeZone.add(Duration(days: 1));
    }

    developer.log(
        'Notification scheduled for: ${scheduledDateInLocalTimeZone.toLocal()} (Local Timezone)',
        name: 'NotificationService');

    await notificationsPlugin.zonedSchedule(
      id,
      title,
      body,
      scheduledDateInLocalTimeZone,
      details,
      androidScheduleMode: AndroidScheduleMode.exactAllowWhileIdle,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
    await checkScheduledNotifications();
  }

  Future<void> checkScheduledNotifications() async {
    List<PendingNotificationRequest> pendingNotificationRequests =
        await notificationsPlugin.pendingNotificationRequests();

    for (var notificationRequest in pendingNotificationRequests) {
      // Get the scheduled time in the local time zone

      // Display the notification details along with the local time
      developer.log('Notification ID: ${notificationRequest.id}');
      developer.log('Title: ${notificationRequest.title}');
      developer.log('Body: ${notificationRequest.body}');
      developer.log('Scheduled Time (Local): ${notificationRequest.payload}');
    }
  }
}

void backgroundNotificationHandler(NotificationResponse response) {
  // Handle background notification
  developer.log('NotificationService.backgroundNotificationHandler',
      name: 'NotificationService');
}
