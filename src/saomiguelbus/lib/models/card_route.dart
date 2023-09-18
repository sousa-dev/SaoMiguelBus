import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

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
  late Map<Stop, String> stops;

  CardRoute(route, origin, destination, context)
      : trailing = const Icon(Icons.arrow_forward_ios),
        leading = const Icon(Icons.directions_bus) {
    routeId = route.id;
    stops = route.stops;

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

    title = Text(route.id + ': ' + durationText(duration, context));

    subtitle = Text(origin + ' - ' + destination);
  }

  String durationText(duration, context) {
    int hours = duration.inMinutes ~/ 60;
    int minutes = duration.inMinutes % 60;
    String text = '';
    if (hours == 1) {
      text += '$hours ${AppLocalizations.of(context)!.hour}';
    } else if (hours > 1) {
      text += '$hours ${AppLocalizations.of(context)!.hours}';
    }
    if (minutes == 1) {
      text += ' $minutes ${AppLocalizations.of(context)!.minute}';
    } else if (minutes > 1) {
      text += ' $minutes ${AppLocalizations.of(context)!.minutes}';
    }
    return text.trim();
  }
}
