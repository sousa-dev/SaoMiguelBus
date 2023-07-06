import 'index.dart';

class Stop {
  String name;
  Location coordinates;

  Stop(this.name, this.coordinates) {
    // if (!Datasource().getStops().contains(this)) {
    //   Datasource().addStop(this);
    // }
  }

  @override
  String toString() {
    return name;
  }
}