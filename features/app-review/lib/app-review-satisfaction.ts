import { Alert, Platform } from 'react-native';

export type AppReviewSatisfaction = 'enjoying' | 'not_enjoying' | 'dismissed';

export function askAppReviewSatisfaction(input: {
  title: string;
  message: string;
  yesLabel: string;
  noLabel: string;
}): Promise<AppReviewSatisfaction> {
  if (Platform.OS === 'web') {
    return Promise.resolve('dismissed');
  }

  return new Promise((resolve) => {
    Alert.alert(
      input.title,
      input.message,
      [
        { text: input.noLabel, style: 'cancel', onPress: () => resolve('not_enjoying') },
        { text: input.yesLabel, onPress: () => resolve('enjoying') },
      ],
      { cancelable: true, onDismiss: () => resolve('dismissed') },
    );
  });
}
