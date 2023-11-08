import 'dart:convert';

import 'package:saomiguelbus/models/ad.dart';
import 'package:saomiguelbus/utils/network_utility.dart';
import 'package:saomiguelbus/models/globals.dart';

Future<String?> fetchAdBanner(
    {String on = 'home', String platform = 'android'}) async {
  Uri uri = Uri.https("api.saomiguelbus.com", "api/v1/ad", {
    'on': on,
    'platform': platform,
  });
  String? response = await NetworkUtility.fetchURL(uri);
  return response;
}

//var URL = "https://saomiguelbus-api.herokuapp.com/api/v1/infos"

Future<String?> fetchInfos() async {
  Uri uri = Uri.https("saomiguelbus-api.herokuapp.com", "api/v1/infos");
  String? response = await NetworkUtility.fetchURL(uri);
  if (response != null) {
    response = utf8.decode(response.runes.toList());
  }
  return response;
}

Future<BannerAd?> clickAdBanner(String id) async {
  Uri uri = Uri.https("saomiguelbus-api.herokuapp.com", "api/v1/ad/click", {
    'id': id,
  });
  String? response = await NetworkUtility.postURL(uri);
  BannerAd bannerAd = BannerAd.fromJson(jsonDecode(response!));
  return bannerAd;
}

Future<String?> postStat(String requestType,
    {String origin = 'NA',
    String destination = 'NA',
    String time = 'NA',
    String day = 'NA'}) async {
//Get current language

  Uri uri = Uri.https("saomiguelbus-api.herokuapp.com", "api/v1/stat", {
    'request': requestType,
    'origin': origin,
    'destination': destination,
    'time': time,
    'day': day,
    'language': language,
    'platform': platform,
  });
  String? response = await NetworkUtility.postURL(uri);
  return response;
}
