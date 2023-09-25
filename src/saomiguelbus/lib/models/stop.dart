import 'index.dart';

class Stop {
  String name;
  Location location;

  Stop(this.name, this.location) {
    // if (!Datasource().getStops().contains(this)) {
    //   Datasource().addStop(this);
    // }
  }

  @override
  String toString() {
    return "$name, loc: $location";
  }
}
