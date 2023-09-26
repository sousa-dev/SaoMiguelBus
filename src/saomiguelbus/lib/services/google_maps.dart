import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import 'package:saomiguelbus/env.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/instruction.dart';
import 'package:saomiguelbus/utils/network_utility.dart';

Future<Instruction> getGoogleRoutes(
    String origin, String destination, DateTime datetime, String languageCode,
    {String arrival_departure = 'departure'}) async {
  if (!canUseMaps) {
    return Instruction().initWarning('Maps monthly limit reached');
  }
  // Load Possible Routes from GMAPS API
  var mapsURL =
      "https://maps.googleapis.com/maps/api/directions/json?origin=$origin&destination=$destination&mode=transit&key=${Env.googleMapsApiKey}&language=$languageCode&alternatives=true";
  if (arrival_departure == 'arrival') {
    mapsURL =
        "$mapsURL&arrival_time=${datetime.millisecondsSinceEpoch ~/ 1000}";
  } else {
    mapsURL =
        "$mapsURL&departure_time=${datetime.millisecondsSinceEpoch ~/ 1000}";
  }
  try {
    final responseStops = await http.get(Uri.parse(mapsURL));
    if (responseStops.statusCode == 200) {
      var instructions = Instruction()
          .initInstructions(jsonDecode(responseStops.body)['routes']);
      developer.log("Routes Length: ${instructions.routes.length}");
      return instructions;
    } else {
      return Instruction().initWarning('NA');
    }
  } catch (e) {
    return Instruction().initWarning('NA');
  }
}

Future<List<Location>> getLatLngFromPlaceID(
    String originPlaceID, String destinationPlaceID) async {
  Location originLocation = Location(0, 0);
  Location destinationLocation = Location(0, 0);
  if (!canUseMaps) {
    return [originLocation, destinationLocation];
  }
  for (String target in ['origin', 'destination']) {
    Uri uri = Uri.https("maps.googleapis.com", "/maps/api/place/details/json", {
      "place_id": target == 'origin' ? originPlaceID : destinationPlaceID,
      "fields": "name,formatted_address,geometry",
      "key": Env.googleMapsApiKey,
    });

    String? response = await NetworkUtility.fetchURL(uri);

    if (response != null) {
      var decoded = jsonDecode(response);
      if (decoded['status'] == 'OK') {
        Location temp = Location(
            decoded['result']['geometry']['location']['lat'],
            decoded['result']['geometry']['location']['lng']);
        if (target == 'origin') {
          originLocation = temp;
        } else {
          destinationLocation = temp;
        }
      }
    }
  }
  return [originLocation, destinationLocation];
}

Future<List<dynamic>> placesAutocomplete(
    String place, BuildContext context) async {
  List<AutocompletePlace> suggestions = [];
  if (!canUseMaps) {
    return [];
  }

  Uri uri =
      Uri.https("maps.googleapis.com", "/maps/api/place/autocomplete/json", {
    "locationrestriction": "circle:50000@37.7804,-25.4970",
    "input": place,
    "sessiontoken": sessionToken,
    "key": Env.googleMapsApiKey,
    "language": AppLocalizations.of(context)!.languageCode,
  });

  String? response = await NetworkUtility.fetchURL(uri);

  if (response != null) {
    var decoded = jsonDecode(response);
    if (decoded['status'] == 'OK') {
      for (var prediction in decoded['predictions']) {
        var placeName = prediction['structured_formatting']['main_text'];
        var types = prediction['types'];
        var iD = prediction['place_id'];
        suggestions.add(AutocompletePlace(
          name: placeName,
          placeID: iD,
          type: types.length > 0 ? types[0] : null,
        ));
      }
    }
  }
  Map<String, AutocompletePlace> placesMap = {};
  for (var suggestion in suggestions) {
    placesMap[suggestion.name] = suggestion;
  }
  List<String> placesNames = [];
  for (var suggestion in suggestions) {
    placesNames.add(suggestion.name);
  }
  return [placesNames, placesMap];
}
