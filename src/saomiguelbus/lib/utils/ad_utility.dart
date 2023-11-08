import 'package:flutter/foundation.dart';
import 'dart:developer' as developer;
import 'package:saomiguelbus/services/smb_api.dart';
import 'package:url_launcher/url_launcher.dart';

String onTapBanner(String id, String url, String targetUrl, String action) {
  if (!kDebugMode) {
    clickAdBanner(id);
  }

  String toastMsg = '';
  Uri? uri;

  switch (action) {
    //TODO: change this to i18n string
    case 'open':
      uri = Uri.parse(targetUrl);
      toastMsg = 'Opening external link...';
      break;
    case 'directions':
      uri = Uri.parse('google.navigation:q=$targetUrl&mode=transit');
      toastMsg = 'Directions to $targetUrl...';
      break;
    case 'call':
      uri = Uri.parse('tel:$targetUrl');
      toastMsg = 'Calling $targetUrl...';
      break;
    case 'sms':
      uri = Uri.parse('smsto:$targetUrl');
      toastMsg = 'Sending message to $targetUrl...';
      break;
    case 'email':
      uri = Uri.parse('mailto:$targetUrl');
      toastMsg = 'Emailing $targetUrl...';
      break;
    case 'whatsapp':
      uri = Uri.parse('https://wa.me/$targetUrl');
      toastMsg = 'Sending message to $targetUrl...';
      break;
    default:
      developer.log('WARN: Unknown action: $action');
      toastMsg = 'There was a unexpected problem opening the ad';
  }

  launchUrl(uri!);
  return toastMsg;
}
