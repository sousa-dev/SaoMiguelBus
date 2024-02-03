// Map Page Body Widget
// Path: lib/layout/map.dart

import 'package:flutter/material.dart';
import 'dart:developer' as developer;
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_osm_plugin/flutter_osm_plugin.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/services/index.dart';

class MapPageBody extends StatefulWidget {
  const MapPageBody(
      {Key? key,
      required this.onChangeOrigin,
      required this.onChangeDestination})
      : super(key: key);

  final Function onChangeOrigin;
  final Function onChangeDestination;

  @override
  _MapPageBodyState createState() => _MapPageBodyState();
}

class _MapPageBodyState extends State<MapPageBody> {
  final _mapController = MapController(
      initPosition: GeoPoint(latitude: 37.7804, longitude: -25.4970));

  @override
  Widget build(BuildContext context) {
    return OSMFlutter(
        controller: _mapController,
        mapIsLoading: const Center(child: CircularProgressIndicator.adaptive()),
        onMapIsReady: (isReady) async {
          if (isReady) {
            await Future.delayed(const Duration(seconds: 1), () async {
              await _mapController.currentLocation();
            });
          }
        },
        osmOption: OSMOption(
            userLocationMarker: UserLocationMaker(
              personMarker: const MarkerIcon(
                  icon: Icon(
                Icons.person_pin_circle,
                color: Color(0xFF218732),
                size: 48,
              )),
              directionArrowMarker: const MarkerIcon(
                  icon: Icon(
                Icons.location_on,
                color: Colors.black,
                size: 48,
              )),
            ),
            roadConfiguration: const RoadOption(
              roadColor: Colors.blueGrey,
              roadWidth: 8,
            ),
            markerOption: MarkerOption(
              defaultMarker: const MarkerIcon(
                  icon: Icon(
                Icons.person_pin_circle,
                color: Colors.black,
                size: 48,
              )),
            ),
            zoomOption: const ZoomOption(
              initZoom: 9.4,
              minZoomLevel: 8,
              maxZoomLevel: 18,
              stepZoom: 1.8,
            ),
            staticPoints: getStopPoints(getStopList(allStops))));
  }
}
