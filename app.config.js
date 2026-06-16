const ADMOB_DEFAULTS = require('./config/admob-defaults');

/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  const androidAppId =
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ?? ADMOB_DEFAULTS.appIdAndroid;
  const iosAppId = process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ?? ADMOB_DEFAULTS.appIdIos;

  const googleMobileAdsJson = {
    android_app_id: androidAppId,
    ios_app_id: iosAppId,
    delay_app_measurement_init: true,
  };

  const plugins = [...(config.plugins ?? [])];
  const hasAdMobPlugin = plugins.some(
    (entry) =>
      (Array.isArray(entry) && entry[0] === 'react-native-google-mobile-ads') ||
      entry === 'react-native-google-mobile-ads',
  );

  if (!hasAdMobPlugin) {
    plugins.push([
      'react-native-google-mobile-ads',
      {
        androidAppId,
        iosAppId,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription:
          'Used to deliver personalized ads. You can use the app with non-personalized ads if you opt out.',
      },
    ]);
  }

  return {
    ...config,
    plugins,
    'react-native-google-mobile-ads': googleMobileAdsJson,
  };
};
