import 'dart:math' show cos, sin, sqrt, asin, pi;

import 'package:saomiguelbus/models/location.dart';

double haversineDistance(Location a, Location b) {
  const earthRadius = 6371; // km

  final lat1 = a.latitude * pi / 180;
  final lat2 = b.latitude * pi / 180;
  final lon1 = a.longitude * pi / 180;
  final lon2 = b.longitude * pi / 180;

  final dLat = lat2 - lat1;
  final dLon = lon2 - lon1;

  final hav = sin(dLat / 2) * sin(dLat / 2) +
      cos(lat1) * cos(lat2) * sin(dLon / 2) * sin(dLon / 2);
  final c = 2 * asin(sqrt(hav));

  return earthRadius * c;
}
