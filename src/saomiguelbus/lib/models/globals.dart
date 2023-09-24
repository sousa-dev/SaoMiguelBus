library my_project.globals;

import 'package:flutter/material.dart';
import 'package:saomiguelbus/layout/index.dart';
import 'package:saomiguelbus/utils/on_change.dart';

List allRoutes = [];
var allStops = {};

String origin = '';
String destination = '';

String language = 'en';

bool canUseMaps = false;
bool internetConnection = false;
String latestVersion = '';

String sessionToken = '';

final List<StatefulWidget> pages = [
  HomePageBody(
    key: UniqueKey(),
    onChangeOrigin: onChangeOriginHome,
    onChangeDestination: onChangeDestinationHome,
  ),
  const FindPageBody(),
  MapPageBody(
    key: UniqueKey(),
    onChangeOrigin: onChangeOriginHome,
    onChangeDestination: onChangeDestinationHome,
  ),
  const InfoPageBody(),
];

Map<String, Icon> icons = {
  'accounting': const Icon(Icons.account_balance),
  'airport': const Icon(Icons.local_airport),
  'amusement_park': const Icon(Icons.festival),
  'aquarium': const Icon(Icons.water_drop),
  'art_gallery': const Icon(Icons.palette),
  'atm': const Icon(Icons.atm),
  'bakery': const Icon(Icons.local_cafe),
  'bank': const Icon(Icons.account_balance),
  'bar': const Icon(Icons.local_bar),
  'beauty_salon': const Icon(Icons.spa),
  'bicycle_store': const Icon(Icons.directions_bike),
  'book_store': const Icon(Icons.book),
  'bowling_alley': const Icon(Icons.sports),
  'bus_station': const Icon(Icons.directions_bus),
  'cafe': const Icon(Icons.local_cafe),
  'campground': const Icon(Icons.fireplace),
  'car_dealer': const Icon(Icons.directions_car),
  'car_rental': const Icon(Icons.directions_car),
  'car_repair': const Icon(Icons.build),
  'car_wash': const Icon(Icons.local_car_wash),
  'casino': const Icon(Icons.casino),
  'church': const Icon(Icons.church),
  'city_hall': const Icon(Icons.location_city),
  'clothing_store': const Icon(Icons.local_mall),
  'convenience_store': const Icon(Icons.local_grocery_store),
  'courthouse': const Icon(Icons.account_balance),
  'dentist': const Icon(Icons.local_hospital),
  'department_store': const Icon(Icons.local_mall),
  'doctor': const Icon(Icons.local_hospital),
  'drugstore': const Icon(Icons.local_pharmacy),
  'electrician': const Icon(Icons.build),
  'electronics_store': const Icon(Icons.devices),
  'embassy': const Icon(Icons.account_balance),
  'fire_station': const Icon(Icons.local_fire_department),
  'florist': const Icon(Icons.local_florist),
  'funeral_home': const Icon(Icons.account_balance),
  'furniture_store': const Icon(Icons.weekend),
  'gas_station': const Icon(Icons.local_gas_station),
  'gym': const Icon(Icons.fitness_center),
  'hair_care': const Icon(Icons.spa),
  'hardware_store': const Icon(Icons.build),
  'hospital': const Icon(Icons.local_hospital),
  'insurance_agency': const Icon(Icons.account_balance),
  'jewelry_store': const Icon(Icons.local_offer),
  'laundry': const Icon(Icons.local_laundry_service),
  'lawyer': const Icon(Icons.account_balance),
  'library': const Icon(Icons.local_library),
  'light_rail_station': const Icon(Icons.directions_transit),
  'liquor_store': const Icon(Icons.local_drink),
  'local_government_office': const Icon(Icons.account_balance),
  'locksmith': const Icon(Icons.build),
  'lodging': const Icon(Icons.hotel),
  'meal_delivery': const Icon(Icons.delivery_dining),
  'meal_takeaway': const Icon(Icons.takeout_dining),
  'movie_rental': const Icon(Icons.local_movies),
  'movie_theater': const Icon(Icons.local_movies),
  'moving_company': const Icon(Icons.local_shipping),
  'museum': const Icon(Icons.museum),
  'night_club': const Icon(Icons.nightlife),
  'painter': const Icon(Icons.build),
  'park': const Icon(Icons.park),
  'parking': const Icon(Icons.local_parking),
  'pet_store': const Icon(Icons.pets),
  'pharmacy': const Icon(Icons.local_pharmacy),
  'physiotherapist': const Icon(Icons.local_hospital),
  'plumber': const Icon(Icons.build),
  'police': const Icon(Icons.local_police),
  'post_office': const Icon(Icons.local_post_office),
  'primary_school': const Icon(Icons.school),
  'real_estate_agency': const Icon(Icons.account_balance),
  'restaurant': const Icon(Icons.restaurant),
  'roofing_contractor': const Icon(Icons.build),
  'rv_park': const Icon(Icons.local_parking),
  'school': const Icon(Icons.school),
  'secondary_school': const Icon(Icons.school),
  'shoe_store': const Icon(Icons.local_offer),
  'shopping_mall': const Icon(Icons.local_mall),
  'spa': const Icon(Icons.spa),
  'stadium': const Icon(Icons.sports_soccer),
  'storage': const Icon(Icons.local_shipping),
  'store': const Icon(Icons.store),
  'subway_station': const Icon(Icons.directions_subway),
  'supermarket': const Icon(Icons.local_grocery_store),
  'synagogue': const Icon(Icons.local_offer),
  'taxi_stand': const Icon(Icons.local_taxi),
  'train_station': const Icon(Icons.directions_railway),
  'transit_station': const Icon(Icons.directions_transit),
  'travel_agency': const Icon(Icons.local_offer),
  'university': const Icon(Icons.school),
  'veterinary_care': const Icon(Icons.pets),
  'zoo': const Icon(Icons.local_florist),
};
