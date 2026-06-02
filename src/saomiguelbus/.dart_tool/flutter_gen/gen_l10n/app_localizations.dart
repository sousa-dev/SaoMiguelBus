import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_de.dart';
import 'app_localizations_en.dart';
import 'app_localizations_es.dart';
import 'app_localizations_fr.dart';
import 'app_localizations_pt.dart';

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'gen_l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale) : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate = _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates = <LocalizationsDelegate<dynamic>>[
    delegate,
    GlobalMaterialLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
  ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('de'),
    Locale('en'),
    Locale('es'),
    Locale('fr'),
    Locale('pt')
  ];

  /// No description provided for @arrive.
  ///
  /// In pt, this message translates to:
  /// **'Chegar'**
  String get arrive;

  /// No description provided for @depart.
  ///
  /// In pt, this message translates to:
  /// **'Partir'**
  String get depart;

  /// Label for destination text fields
  ///
  /// In pt, this message translates to:
  /// **'Destino'**
  String get destination;

  /// No description provided for @dialing.
  ///
  /// In pt, this message translates to:
  /// **'Ligar para'**
  String get dialing;

  /// No description provided for @directionsPageLabel.
  ///
  /// In pt, this message translates to:
  /// **'Passo a passo'**
  String get directionsPageLabel;

  /// No description provided for @directionsTo.
  ///
  /// In pt, this message translates to:
  /// **'A obter direções para'**
  String get directionsTo;

  /// No description provided for @errorOpeningAd.
  ///
  /// In pt, this message translates to:
  /// **'Ocorreu um error inesperado ao abrir o anúncio'**
  String get errorOpeningAd;

  /// No description provided for @fillFields.
  ///
  /// In pt, this message translates to:
  /// **'Preencha a Origem e o Destino'**
  String get fillFields;

  /// Label for find button
  ///
  /// In pt, this message translates to:
  /// **'Ver'**
  String get find;

  /// Label for home button
  ///
  /// In pt, this message translates to:
  /// **'Início'**
  String get home;

  /// No description provided for @hour.
  ///
  /// In pt, this message translates to:
  /// **'hora'**
  String get hour;

  /// No description provided for @hours.
  ///
  /// In pt, this message translates to:
  /// **'horas'**
  String get hours;

  /// Label for info button
  ///
  /// In pt, this message translates to:
  /// **'Info'**
  String get info;

  /// The current language of the application
  ///
  /// In pt, this message translates to:
  /// **'Portuguese'**
  String get language;

  /// The current language code of the application
  ///
  /// In pt, this message translates to:
  /// **'pt_PT'**
  String get languageCode;

  /// Label for map button
  ///
  /// In pt, this message translates to:
  /// **'Mapa'**
  String get map;

  /// No description provided for @minute.
  ///
  /// In pt, this message translates to:
  /// **'minuto'**
  String get minute;

  /// No description provided for @minutes.
  ///
  /// In pt, this message translates to:
  /// **'minutos'**
  String get minutes;

  /// Text for when there were no routes found
  ///
  /// In pt, this message translates to:
  /// **'Não Foram Encontradas Rotas'**
  String get noRoutesFound;

  /// No description provided for @noWifiContent.
  ///
  /// In pt, this message translates to:
  /// **'noWifiContent'**
  String get noWifiContent;

  /// No description provided for @noWifiTitle.
  ///
  /// In pt, this message translates to:
  /// **'noWifiTitle'**
  String get noWifiTitle;

  /// No description provided for @openExternalLink.
  ///
  /// In pt, this message translates to:
  /// **'A abrir link externo...'**
  String get openExternalLink;

  /// Label for origin text fields
  ///
  /// In pt, this message translates to:
  /// **'Origem'**
  String get origin;

  /// No description provided for @routesPageLabel.
  ///
  /// In pt, this message translates to:
  /// **'Rotas'**
  String get routesPageLabel;

  /// Label for search button
  ///
  /// In pt, this message translates to:
  /// **'Pesquisar'**
  String get search;

  /// No description provided for @sendEmailTo.
  ///
  /// In pt, this message translates to:
  /// **'Enviar email para'**
  String get sendEmailTo;

  /// No description provided for @sendMessageTo.
  ///
  /// In pt, this message translates to:
  /// **'Enviar mensagem para'**
  String get sendMessageTo;
}

class _AppLocalizationsDelegate extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) => <String>['de', 'en', 'es', 'fr', 'pt'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {


  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'de': return AppLocalizationsDe();
    case 'en': return AppLocalizationsEn();
    case 'es': return AppLocalizationsEs();
    case 'fr': return AppLocalizationsFr();
    case 'pt': return AppLocalizationsPt();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.'
  );
}
