/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'widget',
  name: 'LiveTripWidget',
  // -> com.sousadev.saomiguelhub.LiveTripWidget
  bundleIdentifier: '.LiveTripWidget',
  // Pinned independently of the app's own deploymentTarget (also 16.4, set via
  // expo-build-properties in app.json) so an SDK-default drift on either side
  // cannot move the two targets apart.
  deploymentTarget: '16.4',
  entitlements: {
    // Must match the app's own entitlement in app.json exactly, or
    // `UserDefaults(suiteName:)` returns nil in the widget and every template
    // string renders empty -- a signing mismatch that looks like a layout bug.
    'com.apple.security.application-groups': ['group.com.sousadev.saomiguelhub'],
  },
};
