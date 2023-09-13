import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/stop.dart';

class CardRoute {
  final Icon trailing;
  final Icon leading;

  late String routeId;
  late Text title;
  late Text subtitle;
  late Duration duration;
  late String catchTime;
  late Stop catchStop;
  late String arrivalTime;
  late Stop arrivalStop;

  CardRoute(route, origin, destination)
      : trailing = const Icon(Icons.arrow_forward_ios),
        leading = const Icon(Icons.directions_bus) {
    routeId = route.id;

    var (originStop, originTime) = route.getStopTime(origin);
    catchStop = originStop;
    catchTime = originTime;

    var (destinationStop, destinationTime) = route.getStopTime(destination);
    arrivalStop = destinationStop;
    arrivalTime = destinationTime;

    DateTime startTimeDateTime = DateTime.parse(
        '2001-05-08 ${catchTime.split("h")[0]}:${catchTime.split("h")[1]}:00');
    DateTime endTimeDateTime = DateTime.parse(
        '2001-05-08 ${arrivalTime.split("h")[0]}:${arrivalTime.split("h")[1]}:00');
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
