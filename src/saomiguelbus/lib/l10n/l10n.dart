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

  static Locale? Function(Locale?, Iterable<Locale>)? localeFallback =
      (locale, supportedLocales) {
    print('localeFallback: $locale');
    print('supportedLocales: $supportedLocales');
    final _supportedLanguageCodes =
        supportedLocales.map((e) => e.languageCode).toList();
    if (!_supportedLanguageCodes.contains(locale?.languageCode)) {
      return const Locale('en');
    }
    return locale;
  };

  static List<LocalizationsDelegate<Object>> localizationsDelegates = const [
    AppLocalizations.delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];
}
