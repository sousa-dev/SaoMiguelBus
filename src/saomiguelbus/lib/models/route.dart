import 'index.dart';

class Route {
  final String id;
  final String uniqueId;
  final Map<Stop, List<String>> stops;
  final TypeOfDay day;
  final int company;
  final String? info;

  List<Stop> allStops = [];
  Stop? origin;
  Stop? destination;

  Route(this.id, this.uniqueId, this.stops, this.day, this.company, {this.info}) {
    allStops = stops.keys.toList();
    origin = allStops[0];
    destination = allStops[allStops.length - 1];
    // if (Datasource().getRouteHash().containsKey(uniqueId)) {
    //   print('ERROR: $uniqueId duplicated');
    // } else {
    //   Datasource().addRouteToHash(uniqueId, this);
    // }
  }

  String? getStopTime(Stop? stop, int position) {
    return stops[stop]?.elementAt(position);
  }

  int getTimeIdx(List<String> times, String? time) {
    for (int i = 0; i < times.length; i++) {
      if (times[i] == time) {
        return i;
      }
    }
    return -1;
  }

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
  String toString() {
    return '$id | $stops';
  }
}