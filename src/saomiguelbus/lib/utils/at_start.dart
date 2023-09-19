import 'dart:developer' as developer;
import 'package:uuid/uuid.dart';

import 'package:saomiguelbus/services/index.dart';
import 'package:saomiguelbus/models/globals.dart';

bool start(kDebugMode) {
  sessionToken = const Uuid().v4();

  retrieveData(kDebugMode);
  kDebugMode ? init_debug_mode() : init_release_mode();
  return true;
}

void init_debug_mode() {
  developer.log("Running in debug mode...");
}

void init_release_mode() {}
