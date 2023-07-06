import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:package_info/package_info.dart';

import './android_load_v2.dart';

List localLoad() {
  return androidLoadV2();
}

void retrieveData(kDebugMode) async {
  final packageInfo = await PackageInfo.fromPlatform();
  final version = packageInfo.version;
  Map information = {'version': version, 'maps': false};
  List data = [];
  if (kDebugMode) {
    data = localLoad();
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
      data = localLoad();
    }
  }
  print(information);
  print(data);
}
