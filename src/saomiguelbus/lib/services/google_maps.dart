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

Future<Instruction> getGoogleRoutes(String origin, String destination,
    TypeOfDay typeOfDay, String languageCode) async {
  if (!canUseMaps) {
    return Instruction().initWarning('Maps monthly limit reached');
  }
  // TODO: Add date and time to the API request
  // Load Possible Routes from GMAPS API
  var mapsURL =
      "https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=transit&key=${Env.googleMapsApiKey}&language=${languageCode}&alternatives=true";
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

Future<List<String>> placesAutocomplete(
    String place, BuildContext context) async {
  List<String> suggestions = [];
  if (!canUseMaps) {
    return ["Maps monthly limit reached"];
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
        suggestions.add(prediction['description']);
      }
    }
  }
  return suggestions;
}
