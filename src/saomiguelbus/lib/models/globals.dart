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
