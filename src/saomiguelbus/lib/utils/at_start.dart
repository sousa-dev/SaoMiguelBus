import 'dart:developer' as developer;
import 'package:uuid/uuid.dart';

import 'package:saomiguelbus/services/index.dart';
import 'package:saomiguelbus/models/globals.dart';
import 'dart:io' show Platform;

Future<bool> start(kDebugMode) async {
  sessionToken = const Uuid().v4();
  if (Platform.isAndroid) {
    platform = 'android';
  } else if (Platform.isIOS) {
    platform = 'ios';
  } else if (Platform.isLinux) {
    platform = 'linux';
  } else if (Platform.isMacOS) {
    platform = 'macos';
  } else if (Platform.isWindows) {
    platform = 'windows';
  } else {
    platform = 'unknown';
  }
  await retrieveData(kDebugMode);
  kDebugMode ? init_debug_mode() : init_release_mode();
  return true;
}

void init_debug_mode() {
  developer.log("Running in debug mode...");
}

void init_release_mode() {}
