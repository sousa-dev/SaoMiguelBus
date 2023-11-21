import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/models/route.dart' as myRoute;
import 'package:saomiguelbus/models/location.dart';
import 'package:saomiguelbus/models/stop.dart';
import 'package:saomiguelbus/models/autocomplete_place.dart';
import 'package:saomiguelbus/models/type_of_day.dart';
import 'package:saomiguelbus/services/google_maps.dart';
import 'package:saomiguelbus/services/queries.dart';
import 'package:saomiguelbus/models/route.dart';
import 'dart:developer' as developer;
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

Future<Map<String, dynamic>> fetchRoutes(
  String origin,
  String destination,
  DateTime date,
  String departureType,
  Map<String, AutocompletePlace> autoComplete,
  List<dynamic> routes,
  BuildContext context,
  String key,
  Instruction instructions,
  String languageCode,
) async {
  developer.log("Fetching Routes...", name: 'fetchRoutes');
  Map<String, dynamic> result = {};

  if (gMapsResultsCached.containsKey(key) &&
      routesResultsCached.containsKey(key)) {
    developer.log("Getting Results from cache...", name: 'cache');
    result['gMaps'] = gMapsResultsCached[key];
    result['bdSmb'] = routesResultsCached[key];
    result['routes'] = routes;
    result['instructions'] = instructions;
    return result;
  }

  if (!autoComplete.keys.contains(origin)) {
    autoComplete[origin] = AutocompletePlace(
      name: origin,
      placeID: 'custom',
      type: 'custom',
    );
  }

  if (!autoComplete.keys.contains(destination)) {
    autoComplete[destination] = AutocompletePlace(
      name: destination,
      placeID: 'custom',
      type: 'custom',
    );
  }

  final value = await getLatLngFromPlaceID(
    autoComplete[origin]!.placeID,
    autoComplete[destination]!.placeID,
    origin,
    destination,
  );

  Location originLocation = value[0];
  Location destinationLocation = value[1];

  String originQuery = originLocation.toString();
  String destinationQuery = destinationLocation.toString();

  if (originQuery == '0.0,0.0') {
    if (autoComplete[origin]!.placeID == 'custom') {
      originQuery = origin;
      originLocation = getStop(origin).location;
    } else {
      originLocation = getStop(autoComplete[origin]!.name).location;
      originQuery = originLocation.toString();
    }
  }

  if (destinationQuery == '0.0,0.0') {
    if (autoComplete[destination]!.placeID == 'custom') {
      destinationQuery = destination;
      destinationLocation = getStop(destination).location;
    } else {
      destinationLocation = getStop(autoComplete[destination]!.name).location;
      destinationQuery = destinationLocation.toString();
    }
  }


  final routesValue = await getGoogleRoutes(
    originQuery,
    destinationQuery,
    date,
    languageCode,
    arrival_departure: departureType,
  );

  instructions = routesValue;

  // if (instructions.runtimeType == String) {
  //   ScaffoldMessenger.of(context).showSnackBar(SnackBar(
  //     content: Text(instructions.toString()),
  //   ));
  //   return null;
  // }

  Map gMapsResults = {
    'origin': origin,
    'destination': destination,
    'routesNumber': instructions.routes.length,
    'instructions': instructions,
  };

  List<Stop> originClosestStops = getClosestStops(originLocation);
  List<Stop> destinationClosestStops = getClosestStops(destinationLocation);

  routes = [];
  for (var originStop in originClosestStops) {
    for (var destinationStop in destinationClosestStops) {
      developer.log(originStop.name);
      developer.log(destinationStop.name);
      developer.log(routes.toString());
      routes.addAll(findRoutes(
        originStop,
        destinationStop,
        _getDayOfWeekString(date.weekday),
      ));
    }
  }

  routes = routes.toSet().toList();

  Map routesResults = {
    'origin': originClosestStops.map((stop) => stop.name).toList(),
    'destination': destinationClosestStops.map((stop) => stop.name).toList(),
    'routesNumber': routes.length,
    'routes': routes,
  };

  // Store the results in the global variables
  developer.log("Storing Results in cache...", name: 'cache');
  gMapsResultsCached[key] = gMapsResults;
  routesResultsCached[key] = routesResults;

  result['gMaps'] = gMapsResults;
  result['bdSmb'] = routesResults;
  result['routes'] = routes;
  result['instructions'] = instructions;
  developer.log(result.toString(), name: 'fetchRoutes');
  return result;
}

TypeOfDay _getDayOfWeekString(int weekday) {
  developer.log(weekday.toString(), name: 'weekday');
  switch (weekday) {
    case 6:
      return TypeOfDay.saturday;
    case 7:
      return TypeOfDay.sunday;
    default:
      return TypeOfDay.weekday;
  }
}
