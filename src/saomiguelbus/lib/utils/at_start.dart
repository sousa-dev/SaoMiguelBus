import '../services/index.dart';
import '../utils/index.dart';

void start(kDebugMode) {
  retrieveData(kDebugMode);
  kDebugMode ? init_debug_mode() : init_release_mode();
}

void init_debug_mode() {
  print("Running in debug mode...");
}

void init_release_mode() {}
