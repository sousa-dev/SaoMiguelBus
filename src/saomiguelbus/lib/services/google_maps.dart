import 'dart:convert';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import 'package:saomiguelbus/env.dart';

import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/instruction.dart';

Future<Instruction> getGoogleRoutes(Stop origin, Stop destination,
    TypeOfDay typeOfDay, String languageCode) async {
  if (!canUseMaps) {
    return Instruction().initWarning('Maps monthly limit reached');
  }
  // TODO: Add date and time to the API request
  // Load Possible Routes from GMAPS API
  var mapsURL =
      "https://maps.googleapis.com/maps/api/directions/json?origin=${origin.name}&destination=${destination.name}&mode=transit&key=${Env.googleMapsApiKey}&language=${languageCode}&alternatives=true";
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
