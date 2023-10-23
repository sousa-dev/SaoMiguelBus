import 'package:saomiguelbus/utils/network_utility.dart';
import 'dart:developer' as developer;

Future<String?> fetchAdBanner(
    {String on = 'home', String platform = 'android'}) async {
  Uri uri = Uri.https("api.saomiguelbus.com", "api/v1/ad", {
    'on': on,
    'platform': platform,
  });
  String? response = await NetworkUtility.fetchURL(uri);
  return response;
}
