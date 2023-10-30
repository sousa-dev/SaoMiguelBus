import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:saomiguelbus/utils/ad_utility.dart';

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
  static GestureDetector fetchImage(String id, String url,
      {String targetUrl = 'https://ad.saomiguelbus.com', String action = ''}) {
    return GestureDetector(
      onTap: () {
        String warningMsg = onTapBanner(id, url, targetUrl, action);
        developer.log(warningMsg, name: 'fetchImage');
        if (warningMsg.isNotEmpty) {
          //TODO: Figure why this is not showing
          Fluttertoast.showToast(
            msg: warningMsg,
            toastLength: Toast.LENGTH_SHORT,
            gravity: ToastGravity.BOTTOM,
          );
        }
      },
      child: Image.network(
        url,
        errorBuilder: (context, error, stackTrace) {
          developer.log('Error occurred: $error');
          return Text('Failed to load image');
        },
      ),
    );
  }
}
