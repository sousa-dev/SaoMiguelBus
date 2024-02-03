import 'index.dart';

class Route {
  final String id;
  final String uniqueId;
  final Map<Stop, String> stops;
  final TypeOfDay day;
  final Company company;
  final String? info;

  List<Stop> allStops = [];
  Stop? origin;
  Stop? destination;

  Route(this.id, this.uniqueId, this.stops, this.day, this.company,
      {this.info}) {
    allStops = stops.keys.toList();
    origin = allStops[0];
    destination = allStops[allStops.length - 1];

    // if (Datasource().getRouteHash().containsKey(uniqueId)) {
    //   developer.log('ERROR: $uniqueId duplicated');
    // } else {
    //   Datasource().addRouteToHash(uniqueId, this);
    // }
  }

  //TODO: Refactor this bcoz it's not a list anymore
  (Stop?, String?) getStopTime(String stopName) {
    for (Stop stop in stops.keys) {
      if (stop.name == stopName) {
        return (stop, stops[stop]);
      }
    }
    return (null, null);
  }

  //TODO: Refactor this bcoz it's not a list anymore
  int getTimeIdx(List<String> times, String? time) {
    for (int i = 0; i < times.length; i++) {
      if (times[i] == time) {
        return i;
      }
    }
    return -1;
  }

  //TODO: Refactor this bcoz it's not a list anymore
  int getStopIdx(Stop? stop) {
    int i = 0;
    for (Stop st in stops.keys) {
      if (st == stop) {
        return i;
      } else {
        i++;
      }
    }
    return -1;
  }

  Stop? getOrigin() {
    return origin;
  }

  Stop? getDestination() {
    return destination;
  }

  int? getNStops(Stop? stop) {
    return stops[stop]?.length;
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Route &&
          runtimeType == other.runtimeType &&
          uniqueId == other.uniqueId;

  @override
  int get hashCode => uniqueId.hashCode;

  @override
  String toString() {
    return '$id | $stops';
  }
}
