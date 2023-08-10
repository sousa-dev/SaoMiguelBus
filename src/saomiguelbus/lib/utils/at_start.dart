import 'dart:developer' as developer;

import 'package:saomiguelbus/services/index.dart';

bool start(kDebugMode) {
  retrieveData(kDebugMode);
  kDebugMode ? init_debug_mode() : init_release_mode();
  return true;
}

void init_debug_mode() {
  developer.log("Running in debug mode...");
}

void init_release_mode() {}
