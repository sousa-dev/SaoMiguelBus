import 'dart:convert';
import 'dart:developer' as developer;

import 'package:flutter/material.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'package:saomiguelbus/services/smb_api.dart';
import 'package:saomiguelbus/widgets/navBar.dart';
import 'package:saomiguelbus/utils/network_utility.dart';

PreferredSizeWidget getTopBar({title = "São Miguel Bus", required context}) {
  return AppBar(
    title: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(title),
        FutureBuilder<GestureDetector>(
          future:
              fetchAdBanner(on: currentAdOn, platform: platform).then((value) {
            if (value == null) {
              return NetworkUtility.fetchImage("", "",
                  targetUrl: "", action: "", context: context);
            }
            Map<String, dynamic> valueMap = jsonDecode(value.toString());
            developer.log(valueMap.toString(), name: 'getTopBar');
            String id = valueMap['id'].toString();
            String url = valueMap['media'];
            String targetUrl = valueMap['target'];
            String action = valueMap['action'];
            return NetworkUtility.fetchImage(id, url,
                targetUrl: targetUrl, action: action, context: context);
          }),
          builder:
              (BuildContext context, AsyncSnapshot<GestureDetector> snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const LinearProgressIndicator(); // Show a loading spinner while waiting
            } else if (snapshot.hasError) {
              developer.log(snapshot.error.toString(),
                  name: 'getTopBar', error: snapshot.error);
              return Container(); // Show an error message if something went wrong
            } else {
              return snapshot.data!; // Show the image when the Future completes
            }
          },
        ),
      ],
    ),
  );
}

Widget getNavBar(currentIndex, updateBody) {
  return NavBar(
      key: UniqueKey(), currentIndex: currentIndex, onItemSelected: updateBody);
}
