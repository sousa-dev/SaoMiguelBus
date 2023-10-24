import 'package:flutter/material.dart';

import 'package:http/http.dart' as http;
import 'dart:developer' as developer;

import 'package:saomiguelbus/models/globals.dart';

class NetworkUtility {
  static Future<String?> fetchURL(Uri uri,
      {Map<String, String>? headers}) async {
    try {
      final response = await http.get(uri, headers: headers);
      if (response.statusCode == 200) {
        internetConnection = true;
        return response.body;
      } else {
        return null;
      }
    } catch (e) {
      developer.log(e.toString(), name: 'NetworkUtility');
    }
    return null;
  }

  static Future<String?> postURL(Uri uri,
      {Map<String, String>? headers, Map<String, String>? body}) async {
    try {
      final response = await http.post(uri, headers: headers, body: body);
      if (response.statusCode == 200) {
        internetConnection = true;
        return response.body;
      } else {
        return null;
      }
    } catch (e) {
      developer.log(e.toString(), name: 'NetworkUtility');
    }
    return null;
  }

  //fetchImage
  static Image fetchImage(String url) {
    return Image.network(url);
  }
}
