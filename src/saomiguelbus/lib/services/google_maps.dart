import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:saomiguelbus/env.dart';

import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';

Future<String> getGoogleRoutes(
    Stop origin, Stop destination, TypeOfDay typeOfDay) async {
  // Load Possible Routes from GMAPS API
  var mapsURL = "https://maps.googleapis.com/maps/api/directions/json?" +
      "origin=" +
      origin.name +
      "&destination=" +
      destination.name +
      "&mode=transit" +
      "&key=" +
      Env.googleMapsApiKey;
  //+ "&language=" + lang

  final responseStops = await http.get(Uri.parse(mapsURL));
  if (responseStops.statusCode == 200) {
    print(responseStops.body);
    return responseStops.body;
  } else {
    return 'NA';
  }
}
