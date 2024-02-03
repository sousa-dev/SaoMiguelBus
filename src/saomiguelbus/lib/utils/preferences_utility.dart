import 'dart:convert';
import 'dart:developer' as developer;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:saomiguelbus/models/favourite.dart';
import 'package:saomiguelbus/models/track_bus.dart';
import 'package:saomiguelbus/models/globals.dart';

void saveOnSharedPreferences(List<dynamic> list, String prefsKey) async {
  final prefs = await SharedPreferences.getInstance();
  final jsonString = jsonEncode(list.map((val) => val.toJson()).toList());
  prefs.setString(prefsKey, jsonString);
}

void loadFromSharedPreferences(String prefsKey) async {
  final prefs = await SharedPreferences.getInstance();
  final jsonString = prefs.getString(prefsKey);
  if (jsonString != null) {
    final json = jsonDecode(jsonString);
    if (prefsKey == 'favourites') {
      favourites =
          json.map<Favourite>((obj) => Favourite.fromJson(obj)).toList();
    } else if (prefsKey == 'track_buses') {
      developer.log('Loading trackBuses from prefs');
      developer.log(json.toString());
      trackBuses = json.map<TrackBus>((obj) => TrackBus.fromJson(obj)).toList();
      developer.log('Loaded $trackBuses from prefs');
    } else {
      throw Exception('Invalid prefsKey');
    }
  }
}
