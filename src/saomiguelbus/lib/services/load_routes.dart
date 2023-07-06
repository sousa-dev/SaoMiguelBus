import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:package_info/package_info.dart';

import './android_load_v2.dart';

void retrieveData(kDebugMode) async {
  // TODO: get version from pubspec.yaml
  // final packageInfo = await PackageInfo.fromPlatform();
  // final version = packageInfo.version;
  final version = '1.0.0';
  Map information = {'version': version, 'maps': true};
  List data = [];
  if (kDebugMode) {
    data = androidLoadV2();
  } else {
    final response = await http
        .get(Uri.parse('https://api.saomiguelbus.com/api/v2/android/load'));

    if (response.statusCode == 200) {
      final jsonString = utf8.decode(response.bodyBytes);
      data = jsonDecode(jsonString);
      information = data[0];
      data = data.sublist(1);
    } else {
      print('Request failed with status: ${response.statusCode}.');
    }
  }
  print(information);
  print(data);
}
