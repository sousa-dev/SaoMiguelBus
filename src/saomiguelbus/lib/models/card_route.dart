import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'dart:developer' as developer;

import 'package:saomiguelbus/models/stop.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/services/track_bus.dart';

class CardRoute {
  final Icon trailing;
  final Icon leading;

  late String routeId;
  late Text title;
  late Text subtitle;
  late Duration duration;
  late String durationStr;
  late String catchTime;
  late Stop catchStop;
  late String arrivalTime;
  late Stop arrivalStop;
  late Map<Stop, String> stops;

  late DateTime date;

  CardRoute(route, origin, destination, context, this.date)
      : trailing = const Icon(Icons.arrow_forward_ios),
        leading = const Icon(Icons.directions_bus) {
    routeId = route.id;
    stops = route.stops;

    developer.log('Date: $date', name: 'CardRoute');

    for (String stop in origin) {
      var (originStop, originTime) = route.getStopTime(stop);
      if (originStop != null) {
        catchStop = originStop;
        catchTime = originTime;
        break;
      }
    }

    for (String stop in destination) {
      var (destinationStop, destinationTime) = route.getStopTime(stop);
      if (destinationStop != null) {
        arrivalStop = destinationStop;
        arrivalTime = destinationTime;
        break;
      }
    }

    DateTime startTimeDateTime = DateTime.parse(
        '2001-05-08 ${catchTime.split("h")[0]}:${catchTime.split("h")[1]}:00');
    DateTime endTimeDateTime = DateTime.parse(
        '2001-05-08 ${arrivalTime.split("h")[0]}:${arrivalTime.split("h")[1]}:00');
    duration = endTimeDateTime.difference(startTimeDateTime);
    durationStr = durationText(duration, context);

    title = Text(route.id + ': ' + durationStr);

    subtitle = Text('${catchStop.name} - ${arrivalStop.name}');
  }

  Card getCardRouteWidget(CardRoute route) {
    return Card(
      elevation: 2.0,
      child: Column(
        children: [
          ExpansionTile(
            iconColor: Colors.blue,
            textColor: Colors.black,
            title: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.directions_bus,
                          color: Color(0xFF218732),
                        ),
                        const SizedBox(
                            width:
                                8.0), // Fixed to width for horizontal spacing
                        Text(
                          routeId,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8.0),
                    Text(
                      durationStr,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        catchTime,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        textAlign: TextAlign.right,
                      ),
                      const SizedBox(height: 8.0),
                      Text(
                        catchStop.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF218732),
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.arrow_right_alt,
                  size: 40.0,
                  color: Color(0xFF218732),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        arrivalTime,
                        style: const TextStyle(fontWeight: FontWeight.bold),
                        textAlign: TextAlign.right,
                      ),
                      const SizedBox(height: 8.0),
                      Text(
                        arrivalStop.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF218732),
                        ),
                        textAlign: TextAlign.right,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            children: [
              for (var stop in stops.keys)
                Text('${stops[stop]} - ${stop.name}'),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: ElevatedButton(
              onPressed: () {
                TrackBus(route).track();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: primaryColor, // Button color
                foregroundColor: Colors.white, // Text color
              ),
              child: const Text('Track'), //TODO: Change to localized string
            ),
          ),
        ],
      ),
    );
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
