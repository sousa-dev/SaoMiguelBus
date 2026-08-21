---
title: "Copy and internationalisation"
parent: ./00-overview.md
---

# 07 — Copy and i18n

Satisfies **R19**. Every string below must exist in all eight locale files.

---

## 1. The parity constraint

`locales/` holds eight flat JSON files — `pt`, `en`, `de`, `es`, `fr`, `it`, `uk`, `zh` — and
`__tests__/lib/locale-parity.test.ts` fails the build if their key sets diverge. **A key added
to `en.json` and nowhere else breaks CI.**

Portuguese is the primary locale (`CFBundleDevelopmentRegion: "pt"`, and `bannerCopy` falls
back `locale → base → pt`), so PT and EN are authored here and the remaining six are
translated from them.

---

## 2. Rules for notification copy

Different constraints from in-app text, and getting them wrong is expensive because the result
is on a lock screen:

1. **Title ≤ ~40 characters, body ≤ ~120.** Android truncates collapsed notifications hard;
   German and Ukrainian run long, so the English must leave headroom.
2. **Never promise certainty.** Every instant here is timetable-derived; there is no vehicle
   feed on this network. "Your bus is arriving" is a claim the app cannot support. "Your bus is
   due" is.
3. **Name the thing.** A lock-screen glance should carry the stop or the route — "Get off at
   Ponta Garça" beats "Your stop is next."
4. **Minutes are interpolated as `minutes`, never `count`.** `count` is what i18next resolves
   plurals against, and `lib/bus-tracking.ts` documents that every locale here abbreviates the
   unit invariantly. Following `trackStatusMinutes`' existing convention.
5. **No emoji in notification content.** They render inconsistently across Android OEM shells
   and add nothing on a lock screen.

---

## 3. Service announcements

| Key | EN | PT |
|---|---|---|
| `notificationScheduleChangeTitle` | The bus timetables have changed | Os horários dos autocarros mudaram |
| `notificationScheduleChangeBody` | New times are in force from today. Check your bus before you leave. | Os novos horários entram em vigor hoje. Confirme o seu autocarro antes de sair. |

### The in-app permission row ([01](./01-service-announcements.md) §4.1)

| Key | EN | PT |
|---|---|---|
| `notificationsAnnouncePromptTitle` | Get told when timetables change | Saiba quando os horários mudarem |
| `notificationsAnnouncePromptBody` | We'll send one notification when the bus times change. | Enviamos uma notificação quando os horários mudarem. |
| `notificationsAnnouncePromptAction` | Turn on | Ativar |
| `notificationsAnnouncePromptDismiss` | Not now | Agora não |

Existing and already translated — reused unchanged for the in-app banner on the day:
`transitScheduleLiveBanner`.

---

## 4. Journey alarms

| Key | EN | PT |
|---|---|---|
| `notificationLeaveNowTitle` | Time to leave | Está na hora de sair |
| `notificationLeaveNowBody` | Your {{route}} leaves {{stop}} in {{minutes}} min. | O seu {{route}} sai de {{stop}} em {{minutes}} min. |
| `notificationChangeTitle` | Your change is coming | A sua mudança aproxima-se |
| `notificationChangeBody` | Change at {{stop}} for the {{route}} in {{minutes}} min. | Mude em {{stop}} para o {{route}} em {{minutes}} min. |
| `notificationChangeTightTitle` | Tight change ahead | Mudança apertada |
| `notificationChangeTightBody` | Only {{minutes}} min at {{stop}} to catch the {{route}}. | Apenas {{minutes}} min em {{stop}} para apanhar o {{route}}. |
| `notificationAlightTitle` | Your stop is next | A sua paragem é a seguir |
| `notificationAlightBody` | Get off at {{stop}}. | Saia em {{stop}}. |
| `notificationCompleteTitle` | You've arrived | Chegou |
| `notificationCompleteBody` | {{stop}} — end of your journey. | {{stop}} — fim da sua viagem. |

The tight-change pair exists because `TrackedTransfer.tight` is already computed and
`computeJourneyStatus` already treats that moment as the one the paid feature exists for
([04](./04-scheduling-engine.md) §3.2).

---

## 5. The preference sheet

| Key | EN | PT |
|---|---|---|
| `notificationsSheetTitle` | Notify me about this journey | Notificar-me sobre esta viagem |
| `notificationsSheetDefaultTitle` | Notification defaults | Predefinições de notificações |
| `notificationsTypeLeaveNow` | Time to leave | Hora de sair |
| `notificationsTypeChange` | Change is coming | Mudança a aproximar-se |
| `notificationsTypeAlight` | Get off at next stop | Sair na próxima paragem |
| `notificationsTypeComplete` | Journey complete | Viagem concluída |
| `notificationsLeadMinutes` | {{minutes}} min before | {{minutes}} min antes |
| `notificationsSaveDefault` | Save as my default | Guardar como predefinição |
| `notificationsPinnedRoutes` | Also notify me for my pinned routes | Notificar também as minhas rotas fixadas |
| `notificationsConfirm` | Notify me | Notificar-me |
| `notificationsSave` | Save | Guardar |
| `notificationsChooseOne` | Choose at least one | Escolha pelo menos uma |

---

## 6. States, errors, confirmations

| Key | EN | PT |
|---|---|---|
| `notificationsArmed` | We'll tell you at {{times}} | Avisamos às {{times}} |
| `notificationsArmedAlight` | …and one stop before you arrive | …e uma paragem antes de chegar |
| `notificationsSomeSkipped` | Some alerts were skipped — this journey has already started | Alguns alertas foram ignorados — esta viagem já começou |
| `notificationsAllPast` | This journey has already departed | Esta viagem já partiu |
| `notificationsDeniedTitle` | Notifications are turned off | As notificações estão desativadas |
| `notificationsDeniedBody` | São Miguel Hub can't send you bus alerts until notifications are allowed for the app. | O São Miguel Hub não pode enviar alertas até permitir notificações para a aplicação. |
| `notificationsOpenSettings` | Open settings | Abrir definições |
| `notificationsRevokedWarning` | Alerts are off for this app | Os alertas estão desativados para esta aplicação |
| `notificationsRevokedAction` | Turn them back on | Reativar |
| `notificationsSettingsRow` | Notifications | Notificações |
| `notificationsSettingsSubtitle` | Bus alerts and service updates | Alertas de autocarros e avisos de serviço |

### Android channel names

Channel names are user-visible in Android system settings and are set at registration, so they
resolve against the locale at **first run** and do not follow a later language change.

| Key | EN | PT |
|---|---|---|
| `notificationsChannelAlarms` | Bus alerts | Alertas de autocarros |
| `notificationsChannelAnnouncements` | Service updates | Avisos de serviço |

---

## 7. Existing unused keys

Four keys were translated into all eight locales for a webapp premium pitch and are rendered
by nothing:

| Key | EN | Disposition |
|---|---|---|
| `premiumFeatureNotifications` | Smart notifications for tracked buses | **Reuse** — the settings row's premium description |
| `smartNotificationsFeature` | Smart notifications before departure | **Reuse** — paywall feature bullet |
| `smartNotificationsTitle` | SMART ALERTS | **Retire** — an all-caps webapp section heading with no home in this UI |
| `busNotificationsText` | Get notified about your buses | **Reuse** — the settings row subtitle for free riders |

Retiring `smartNotificationsTitle` means removing it from all eight files in one commit, or
`locale-parity` fails. It is not urgent; leaving it costs nothing but a dead key.

> Reusing the first two is worth doing for a reason beyond tidiness: the app has been carrying
> translated marketing for this feature since before it existed. Wiring them up is the moment
> the promise and the product finally agree.

---

## 8. Translation checklist

- [ ] PT and EN authored (above)
- [ ] DE, ES, FR, IT, UK, ZH translated from PT
- [ ] `__tests__/lib/locale-parity.test.ts` green
- [ ] Longest locale (typically DE/UK) checked against the length limits in §2 on a real device
- [ ] `{{minutes}}`, `{{stop}}`, `{{route}}` placeholders present and unrenamed in every locale
- [ ] `scripts/apply-locale-patches.mjs` re-run if it governs these files
