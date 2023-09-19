import 'package:http/http.dart' as http;
import 'dart:developer' as developer;

class NetworkUtility {
  static Future<String?> fetchURL(Uri uri,
      {Map<String, String>? headers}) async {
    try {
      final response = await http.get(uri, headers: headers);
      if (response.statusCode == 200) {
        return response.body;
      } else {
        return null;
      }
    } catch (e) {
      developer.log(e.toString(), name: 'NetworkUtility');
    }
    return null;
  }
}
