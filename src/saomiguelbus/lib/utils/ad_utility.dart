import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

import 'package:flutter/foundation.dart';
import 'dart:developer' as developer;
import 'package:saomiguelbus/services/smb_api.dart';
import 'package:url_launcher/url_launcher.dart';

String onTapBanner(String id, String url, String targetUrl, String action,
    {required BuildContext context}) {
  if (!kDebugMode) {
    clickAdBanner(id);
  }

  String toastMsg = '';
  Uri? uri;

  switch (action) {
    //TODO: change targeturl to description and/or entity
    case 'open':
      uri = Uri.parse(targetUrl);
      toastMsg = AppLocalizations.of(context)!.openExternalLink;
      break;
    case 'directions':
      uri = Uri.parse('google.navigation:q=$targetUrl&mode=transit');
      toastMsg = '${AppLocalizations.of(context)!.directionsTo} $targetUrl...';
      break;
    case 'call':
      uri = Uri.parse('tel:$targetUrl');
      toastMsg = '${AppLocalizations.of(context)!.dialing} $targetUrl...';
      break;
    case 'sms':
      uri = Uri.parse('smsto:$targetUrl');
      toastMsg = '${AppLocalizations.of(context)!.sendMessageTo} $targetUrl...';
      break;
    case 'email':
      uri = Uri.parse('mailto:$targetUrl');
      toastMsg = '${AppLocalizations.of(context)!.sendEmailTo} $targetUrl...';
      break;
    case 'whatsapp':
      uri = Uri.parse('https://wa.me/$targetUrl');
      toastMsg = '${AppLocalizations.of(context)!.sendMessageTo} $targetUrl...';
      break;
    default:
      developer.log('WARN: Unknown action: $action');
      toastMsg = AppLocalizations.of(context)!.errorOpeningAd;
  }

  launchUrl(uri!);
  return toastMsg;
}
