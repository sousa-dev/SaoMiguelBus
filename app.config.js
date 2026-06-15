/** @type {import('expo/config').ConfigContext} */
module.exports = ({ config }) => {
  const androidAppId =
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID ?? 'ca-app-pub-8246676797736648~5996375679';
  const iosAppId =
    process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS ?? 'ca-app-pub-8246676797736648~5996375679';

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
  };
};
