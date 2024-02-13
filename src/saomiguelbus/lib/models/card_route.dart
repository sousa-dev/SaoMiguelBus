import 'dart:ffi';

import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'dart:developer' as developer;
import 'package:timezone/timezone.dart' as tz;

import 'package:saomiguelbus/models/stop.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/track_bus.dart';

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
    //Check if card is trackable
    // Get current date and time in Azores
    var now = DateTime.now();
    var azoresTimeZone = tz.getLocation('Atlantic/Azores');
    var currentTime =
        normalizeDateTime(tz.TZDateTime.from(now, azoresTimeZone));

    var routeFinishTime = DateTime(
        route.date.year,
        route.date.month,
        route.date.day,
        int.parse(route.arrivalTime.split("h")[0]),
        int.parse(route.arrivalTime.split("h")[1]),
        0);
    bool isRouteDatePast = routeFinishTime.isBefore(currentTime);
    Color buttonColor = isRouteDatePast ? Colors.grey : primaryColor;

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
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: ElevatedButton(
                  onPressed: isRouteDatePast
                      ? () {
                          // Use FlutterToast to show a toast message
                          Fluttertoast.showToast(
                              msg:
                                  "This route is no longer available.", //TODO: Change to localized string
                              toastLength: Toast.LENGTH_SHORT,
                              gravity: ToastGravity.BOTTOM,
                              timeInSecForIosWeb: 1,
                              backgroundColor: Colors.red,
                              textColor: Colors.white,
                              fontSize: 16.0);
                        }
                      : () {
                          // Your tracking logic
                          var trackId = route.routeId +
                              route.date.millisecondsSinceEpoch.toString() +
                              route.catchTime +
                              route.arrivalTime;
                          // Check if trackId is already being tracked in trackBuses list
                          for (var track in trackBuses) {
                            if (trackId == track.id) {
                              Fluttertoast.showToast(
                                  msg:
                                      "This route is already being tracked. Check it at the home page", //TODO: Change to localized string
                                  toastLength: Toast.LENGTH_SHORT,
                                  gravity: ToastGravity.BOTTOM,
                                  timeInSecForIosWeb: 1,
                                  backgroundColor: Colors.red,
                                  textColor: Colors.white,
                                  fontSize: 16.0);
                              return;
                            }
                          }
                          // Check if there are already 10 buses being tracked
                          if (trackBuses.length >= 10) {
                            Fluttertoast.showToast(
                                msg:
                                    "You can only track 10 buses at a time. Check the Home Page to see the buses you are tracking", //TODO: Change to localized string
                                toastLength: Toast.LENGTH_SHORT,
                                gravity: ToastGravity.BOTTOM,
                                timeInSecForIosWeb: 1,
                                backgroundColor: Colors.red,
                                textColor: Colors.white,
                                fontSize: 16.0);
                            return;
                          }

                          TrackBus(route).track();
                          Fluttertoast.showToast(
                              msg:
                                  "Tracking Route. You can check it on the Home Page", //TODO: Change to localized string
                              toastLength: Toast.LENGTH_SHORT,
                              gravity: ToastGravity.BOTTOM,
                              timeInSecForIosWeb: 1,
                              backgroundColor: primaryColor,
                              textColor: Colors.white,
                              fontSize: 16.0);
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor:
                        buttonColor, // Button color based on date comparison
                    foregroundColor: Colors.white, // Text color
                  ),
                  child: Text('Track'), //TODO: Change to localized string
                ),
              ),
            ],
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

  normalizeDateTime(tz.TZDateTime tzDateTime) {
    return DateTime(tzDateTime.year, tzDateTime.month, tzDateTime.day,
        tzDateTime.hour, tzDateTime.minute, tzDateTime.second);
  }
}
