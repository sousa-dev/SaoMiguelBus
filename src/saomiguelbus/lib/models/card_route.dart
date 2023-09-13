import 'package:flutter/material.dart';

class CardRoute {
  final Icon trailing;
  final Icon leading;

  late Text title;
  late Text subtitle;
  late Duration duration;

  CardRoute(route, origin, destination)
      : trailing = const Icon(Icons.arrow_forward_ios),
        leading = const Icon(Icons.directions_bus) {
    String startTime = route.getStopTime(origin);
    String endTime = route.getStopTime(destination);
    DateTime startTimeDateTime = DateTime.parse(
        '2022-01-01 ${startTime.split("h")[0]}:${startTime.split("h")[1]}:00');
    DateTime endTimeDateTime = DateTime.parse(
        '2022-01-01 ${endTime.split("h")[0]}:${endTime.split("h")[1]}:00');
    duration = endTimeDateTime.difference(startTimeDateTime);

    title = Text(route.id + ': ' + durationText(duration));

    subtitle = Text(origin + ' - ' + destination);
  }

  String durationText(duration) {
    //TODO: Replace with int8 text
    int hours = duration.inMinutes ~/ 60;
    int minutes = duration.inMinutes % 60;
    String text = '';
    if (hours == 1) {
      text += '$hours hour';
    } else if (hours > 1) {
      text += '$hours hours';
    }
    if (minutes == 1) {
      text += ' $minutes minute';
    } else if (minutes > 1) {
      text += ' $minutes minutes';
    }
    return text.trim();
  }
}
