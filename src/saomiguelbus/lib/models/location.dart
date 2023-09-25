class Location {
  final double latitude;
  final double longitude;

  Location(this.latitude, this.longitude);

  @override
  String toString() {
    return '$latitude,$longitude';
  }
}