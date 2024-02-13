import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:timezone/timezone.dart' as tz;
import 'dart:developer' as developer;
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  final FlutterLocalNotificationsPlugin notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  Future<NotificationService> initNotification() async {
    AndroidInitializationSettings initializationSettingsAndroid =
        const AndroidInitializationSettings(
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

    const AndroidNotificationChannel androidChannel =
        AndroidNotificationChannel(
      'smb_alerts',
      'Bus Alerts',
      description: 'Notifications for bus alerts',
      importance: Importance.high,
      playSound: true,
      enableVibration: true,
    );
    await notificationsPlugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);

    await notificationsPlugin.initialize(
      initializationSettings,
      onDidReceiveBackgroundNotificationResponse: backgroundNotificationHandler,
    );
    return this;
  }

  notificationDetails() {
    return const NotificationDetails(
      android: AndroidNotificationDetails(
        'smb_alerts',
        'Bus Alerts',
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        showWhen: true,
        visibility: NotificationVisibility.public,
      ),
      iOS: DarwinNotificationDetails(
        sound: 'notification_sound.aiff',
      ),
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
    Duration alertTimeThreshold = Duration.zero,
  }) async {
    if (Platform.isAndroid) {
      var androidInfo = await DeviceInfoPlugin().androidInfo;
      var sdkInt = androidInfo.version.sdkInt;
      if (sdkInt < 24) {
        developer.log(
            'NotificationService.scheduleNotification: Android version is lower than 24',
            name: 'NotificationService');
        Fluttertoast.showToast(
            msg:
                "Your android version is not compatible with alerts. You can still track the bus on the Home Page", //TODO: Change to localized string
            toastLength: Toast.LENGTH_SHORT,
            gravity: ToastGravity.BOTTOM,
            timeInSecForIosWeb: 1,
            backgroundColor: Colors.red,
            textColor: Colors.white,
            fontSize: 16.0);
        return;
      }
    }

    var details = await notificationDetails();

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
      return;
    }

    //var alertTime = scheduledDateInLocalTimeZone.subtract(alertTimeThreshold);
    var alertTime = nowInLocalTimeZone.add(const Duration(seconds: 60));
    developer.log('Notification scheduled for: $alertTime (Local Timezone)',
        name: 'NotificationService');
    await notificationsPlugin.zonedSchedule(
      id,
      title,
      body,
      alertTime,
      details,
      androidScheduleMode: AndroidScheduleMode.alarmClock,
      uiLocalNotificationDateInterpretation:
          UILocalNotificationDateInterpretation.absoluteTime,
    );
    //await checkScheduledNotifications();
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
