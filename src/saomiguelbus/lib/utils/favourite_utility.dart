import 'package:saomiguelbus/models/favourite.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/utils/preferences_utility.dart';

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
  saveOnSharedPreferences(favourites, 'favourites');
}

void loadFavouritesToGlobals() async {
  loadFromSharedPreferences('favourites');
}
