import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class L10n {
  static final all = [
    const Locale('en'),
    const Locale('pt'),
    const Locale('es'),
    const Locale('fr'),
    const Locale('de'),
  ];

  static Locale defaultLocale = const Locale('pt');

  static List<LocalizationsDelegate<Object>> localizationsDelegates = const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];
}
