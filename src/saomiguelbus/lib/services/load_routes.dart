import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:package_info/package_info.dart';
import 'package:saomiguelbus/models/index.dart';
import 'package:saomiguelbus/models/globals.dart';

import './android_load_v2.dart';
import './get_stops_v1.dart';

List localLoad() {
  return androidLoadV2();
}

List localStops() {
  return getStopsV1();
}

void loadStops(List stopsJSON) {
  for (var i = 0; i < stopsJSON.length; i++) {
    var stop = stopsJSON[i];
    allStops[stop['name']] =
        Stop(stop['name'], Location(stop['latitude'], stop['longitude']));
  }
  print("Loaded ${allStops.length} stops");
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
        print("Invalid Route Number: $route");
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

    if (i < 0 && kDebugMode) {
      print(data[i]);
      print(id);
      print(route);
      print(stops);
      print(times);
      print(stopsMap);
      print(weekday);
      print(info);
      print(company);
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
  Map information = {'version': version, 'maps': false};
  List data = [];
  List stopsJSON = [];
  if (kDebugMode) {
    data = localLoad();
    stopsJSON = localStops();
  } else {
    // Load Stops from API
    final responseStops =
        await http.get(Uri.parse('https://api.saomiguelbus.com/api/v1/stops'));
    if (responseStops.statusCode == 200) {
      final jsonString = utf8.decode(responseStops.bodyBytes);
      print(jsonString);
      stopsJSON = jsonDecode(jsonString);
    } else {
      print('Request failed with status: ${responseStops.statusCode}.');
      stopsJSON = localStops();
    }

    // Load Routes from API
    final response = await http
        .get(Uri.parse('https://api.saomiguelbus.com/api/v2/android/load'));
    if (response.statusCode == 200) {
      final jsonString = utf8.decode(response.bodyBytes);
      data = jsonDecode(jsonString);
      information = data[0];
      data = data.sublist(1);
    } else {
      print('Request failed with status: ${response.statusCode}.');
      data = localLoad();
    }
  }

  createLocalDB(data, stopsJSON);
}
