import { Platform, Share } from 'react-native';

/**
 * Hand a JSON data export to the user. On native this opens the system share
 * sheet (save to Files, mail, etc.); on web it downloads a `.json` file.
 */
export async function shareJsonExport(filename: string, data: unknown, title: string): Promise<void> {
  const json = JSON.stringify(data, null, 2);

  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }
    return;
  }

  await Share.share({ message: json, title });
}
