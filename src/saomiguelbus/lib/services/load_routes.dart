// ignore_for_file: deprecated_member_use

import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:developer' as developer;
import 'package:package_info/package_info.dart';

import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/services/android_load_v2.dart';
import 'package:saomiguelbus/services/get_stops_v1.dart';
import 'package:shared_preferences/shared_preferences.dart';

List localLoad(SharedPreferences prefs) {
  var data = androidLoadV2();
  developer.log("localload: ${prefs.getKeys()}");

  if (prefs.containsKey('routes_api_response')) {
    final jsonString = prefs.getString('routes_api_response');
    developer.log("Loading Stored API Response...");
    data = jsonDecode(jsonString!);
    //information = data[0];
    data = data.sublist(1);
  }
  return data;
}

List localStops(SharedPreferences prefs) {
  var stopsJSON = getStopsV1();

  if (prefs.containsKey('stops_api_response')) {
    final jsonString = prefs.getString('stops_api_response');
    developer.log("Loading Stored API Response...");
    developer.log(jsonString!);
    stopsJSON = jsonDecode(jsonString);
  }
  return stopsJSON;
}

void loadStops(List stopsJSON) {
  for (var i = 0; i < stopsJSON.length; i++) {
    var stop = stopsJSON[i];
    allStops[stop['name']] =
        Stop(stop['name'], Location(stop['latitude'], stop['longitude']));
  }
  developer.log("Loaded ${allStops.length} stops");
}

void loadRoutes(List data) {
  for (var i = 0; i < data.length; i++) {
    var id = data[i]['id'];
    var route = data[i]['route'];
    var stops = data[i]['stops'];
    var times = data[i]['times'];
    var weekday = TypeOfDay.values.firstWhere((e) =>
        e.toString().split('.').last == data[i]['weekday'].toLowerCase());
    var info = data[i]['information'];
    Company company = Company.avm;
    if (info == "None") {
      info = '';
    }

    if (route[0] == '2') {
      company = Company.avm;
    } else if (route[0] == '1') {
      company = Company.crp;
    } else if (route[0] == '3') {
      company = Company.varela;
    } else {
      if (kDebugMode) {
        developer.log("Invalid Route Number: $route");
        Error();
      }
    }

    Map<Stop, String> stopsMap = {};
    for (var j = 0; j < stops.length; j++) {
      var stop = stops[j];
      var time = times[j];
      Stop stopObj = Stop(stop, Location(0, 0));
      if (allStops.containsKey(stop)) {
        stopObj = allStops[stop];
      } else {
        allStops[stop] = stopObj;
      }
      stopsMap[stopObj] = time;
    }

    Route routeObj =
        Route(route, id.toString(), stopsMap, weekday, company, info: info);
    allRoutes.add(routeObj);
  }
}

void createLocalDB(List data, List stops) {
  loadStops(stops);
  loadRoutes(data);
}

void retrieveData(kDebugMode) async {
  final packageInfo = await PackageInfo.fromPlatform();
  final version = packageInfo.version;
  Map information = {
    'version': version,
    'maps': true
  }; //TODO: Change default to false on production
  List data = [];
  List stopsJSON = [];
  //SharedPreferences.setMockInitialValues({});
  SharedPreferences prefs = await SharedPreferences.getInstance();
  if (kDebugMode &&
      prefs.containsKey('routes_api_response') &&
      prefs.containsKey('stops_api_response')) {
    final response =
        await http.get(Uri.parse('https://api.saomiguelbus.com/api/v1/stops'));
    if (response.statusCode == 200) internetConnection = true;
    data = localLoad(prefs);
    stopsJSON = localStops(prefs);
  } else {
    try {
      // Load Stops from API
      final responseStops = await http
          .get(Uri.parse('https://api.saomiguelbus.com/api/v1/stops'));
      if (responseStops.statusCode == 200) {
        final jsonString = utf8.decode(responseStops.bodyBytes);
        developer.log(jsonString);
        prefs.setString('stops_api_response', jsonString);
        prefs.commit();
        developer.log("Storing new routes API Response on cache...");
        stopsJSON = jsonDecode(jsonString);

        internetConnection = true;
      } else {
        developer
            .log('Request failed with status: ${responseStops.statusCode}.');

        stopsJSON = localStops(prefs);
      }
    } catch (e) {
      developer.log(e.toString());
      stopsJSON = localStops(prefs);
    }

    try {
      // Load Routes from API
      final response = await http
          .get(Uri.parse('https://api.saomiguelbus.com/api/v2/android/load'));
      if (response.statusCode == 200) {
        final jsonString = utf8.decode(response.bodyBytes);
        data = jsonDecode(jsonString);
        prefs.setString('routes_api_response', jsonString);
        prefs.commit();
        developer.log("Storing new routes API Response on cache...");
        developer.log("data: $data");
        information = data[0];
        data = data.sublist(1);
        internetConnection = true;
      } else {
        developer.log('Request failed with status: ${response.statusCode}.');
        data = localLoad(prefs);
      }
    } catch (e) {
      developer.log(e.toString());
      data = localLoad(prefs);
    }
  }
  developer.log("fisrt: ${prefs.getKeys()}");
  canUseMaps = information['maps'];
  latestVersion = information['version'];

  developer.log("canUseMaps: $canUseMaps");
  developer.log("latestVersion: $latestVersion");
  developer.log("internetConnection: $internetConnection");

  createLocalDB(data, stopsJSON);
}
