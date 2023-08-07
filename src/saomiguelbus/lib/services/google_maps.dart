import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:saomiguelbus/env.dart';

import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/models/instruction.dart';

Future<Object> getGoogleRoutes(Stop origin, Stop destination,
    TypeOfDay typeOfDay, String languageCode) async {
  // Load Possible Routes from GMAPS API
  var mapsURL =
      "https://maps.googleapis.com/maps/api/directions/json?origin=${origin.name}&destination=${destination.name}&mode=transit&key=${Env.googleMapsApiKey}&language=${languageCode}";

  final responseStops = await http.get(Uri.parse(mapsURL));
  if (responseStops.statusCode == 200) {
    var instructions = Instruction()
        .initInstructions(jsonDecode(responseStops.body)['routes']);
    return instructions;
  } else {
    return 'NA';
  }
}
