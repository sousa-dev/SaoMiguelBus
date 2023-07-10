import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';

List<Route> findRoutes(Stop origin, Stop destination, TypeOfDay typeOfDay) {
  List<Route> routes = [];
  for (var route in allRoutes) {
    if (route.stops.containsKey(origin) &&
        route.stops.containsKey(destination) &&
        route.day == typeOfDay &&
        route.stops.keys.toList().indexOf(origin) < route.stops.keys.toList().indexOf(destination)) {
      routes.add(route);
    }
  }
  return routes;
}

Stop getStop(String name) {
  //TODO: Try to work on the Stop name to find even if it has a typo
  return allStops[name];
}
