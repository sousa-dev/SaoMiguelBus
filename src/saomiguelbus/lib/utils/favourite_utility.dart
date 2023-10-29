import 'dart:convert';

import 'package:saomiguelbus/models/favourite.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:shared_preferences/shared_preferences.dart';

bool checkIfFavourite(String origin, String destination) {
  for (var favourite in favourites) {
    if (favourite.origin == origin && favourite.destination == destination) {
      return true;
    }
  }
  return false;
}

void addFavourite(String origin, String destination) {
  favourites.add(Favourite(origin: origin, destination: destination));
  _saveFavouritesOnCache();
}

void removeFavourite(String origin, String destination) {
  for (var favourite in favourites) {
    if (favourite.origin == origin && favourite.destination == destination) {
      favourites.remove(favourite);
      break;
    }
  }
  _saveFavouritesOnCache();
}

void _saveFavouritesOnCache() async {
  final prefs = await SharedPreferences.getInstance();
  final favouritesJsonString = jsonEncode(favourites.map((favourite) => favourite.toJson()).toList());
  prefs.setString('favourites', favouritesJsonString);
}

void loadFavouritesToGlobals() async {
  final prefs = await SharedPreferences.getInstance();
  final favouritesJsonString = prefs.getString('favourites');
  if (favouritesJsonString != null) {
    final favouritesJson = jsonDecode(favouritesJsonString);
    favourites = favouritesJson.map<Favourite>((favouriteJson) => Favourite.fromJson(favouriteJson)).toList();
  }
}
