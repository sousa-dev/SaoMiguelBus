import 'dart:developer' as developer;

import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/utils/levenshtein_distance.dart';

List<Route> findRoutes(Stop origin, Stop destination, TypeOfDay typeOfDay) {
  List<Route> routes = [];
  for (var route in allRoutes) {
    if (route.stops.containsKey(origin) &&
        route.stops.containsKey(destination) &&
        route.day == typeOfDay &&
        route.stops.keys.toList().indexOf(origin) <
            route.stops.keys.toList().indexOf(destination)) {
      routes.add(route);
    }
  }
  return routes;
}

Stop getStop(String name) {
  if (allStops[name] == null) {
    developer.log("Stop $name not found");
    String? mostSimilarStop;
    double smallestDistance = double.infinity;
    for (var stopName in allStops.keys) {
      int distance = levenshteinDistance(name, stopName);
      if (distance < smallestDistance) {
        smallestDistance = distance.toDouble();
        mostSimilarStop = stopName;
      }
    }
    if (mostSimilarStop == null) {
      developer.log("No similar stop found");
      return Stop(name, Location(0, 0));
    }
    developer.log("$name not found, using $mostSimilarStop instead");
    return allStops[mostSimilarStop];
  }
  return allStops[name];
}
