import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { staticIslandConfig } from '@/config/island';
import { useAppTheme } from '@/lib/theme';

type Props = {
  url: string;
  slug: string;
};

function isSvgDocument(slug: string, url: string): boolean {
  if (slug === 'schematic') {
    return true;
  }
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.svg');
  } catch {
    return false;
  }
}

export function MinibusPdfViewer({ url, slug }: Props) {
  const theme = useAppTheme();
  const headers = { 'X-Island': staticIslandConfig.islandKey };

  if (isSvgDocument(slug, url)) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <WebView
          source={{ uri: url, headers }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator color={theme.primary} />
            </View>
          )}
        />
      </View>
    );
  }

  // iOS WKWebView often fails on raw PDF URLs — load with auth headers via injected fetch HTML.
  if (Platform.OS === 'ios') {
    const islandKey = staticIslandConfig.islandKey;
    const html = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<style>html,body{margin:0;height:100%;background:#fff}embed{width:100%;height:100%;border:0}</style>
</head><body>
<script>
fetch(${JSON.stringify(url)}, { headers: { 'X-Island': ${JSON.stringify(islandKey)} } })
  .then(r => r.blob())
  .then(b => { document.body.innerHTML = '<embed type="application/pdf" src="' + URL.createObjectURL(b) + '" />'; })
  .catch(() => { document.body.innerHTML = '<p style="padding:16px;font-family:sans-serif">PDF load failed</p>'; });
</script>
</body></html>`;

    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <WebView
          source={{ html, baseUrl: url }}
          originWhitelist={['*']}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loader}>
              <ActivityIndicator color={theme.primary} />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <WebView
        source={{ uri: url, headers }}
        startInLoadingState
        originWhitelist={['*']}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color={theme.primary} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
