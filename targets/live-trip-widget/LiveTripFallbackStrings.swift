import Foundation

/// A compiled-in `pt` dictionary, used only when `LiveTripSharedStore` cannot
/// read the App Group suite.
///
/// `pt` because it is the app's own declared i18next fallback locale
/// (`locales/pt.json`, see `lib/i18n.ts`), and a Portuguese string on a São
/// Miguel bus line beats an empty banner. This is a last resort, not a
/// substitute for the real templates -- it exists so a signing/entitlement
/// mismatch degrades to "readable, wrong language" instead of "blank".
enum LiveTripFallbackStrings {
  static let values: [String: String] = [
    "locale": "pt",
    "title": "{route} → {destination}",
    "waiting": "Parte às {time}",
    "riding": "Próxima paragem {stop} · {minutes} min",
    "arriving": "A chegar a {stop}",
    "late": "{minutes} min de atraso",
    "onTime": "À hora",
    "stale": "Sem sinal",
    "completed": "Viagem terminada",
  ]
}
