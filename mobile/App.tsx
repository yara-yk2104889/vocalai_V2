// VocalAI iPad shell: shows the hosted VocalAI web app full screen, with no
// browser bars. All app logic (and the API keys) stay on Vercel.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync } from 'expo-audio';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const APP_URL = 'https://vocalai-v2.vercel.app/';

export default function App() {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0); // bumping it remounts the WebView to retry

  // Speech must still play when the iPad's mute switch is on.
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        {failed ? (
          <View style={styles.center}>
            <Text style={styles.message}>{"Can't reach VocalAI. Check the internet connection."}</Text>
            <Text style={styles.message}>تعذّر الاتصال. تحقّق من الاتصال بالإنترنت.</Text>
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              onPress={() => { setFailed(false); setAttempt(a => a + 1); }}
            >
              <Text style={styles.buttonText}>Try again · حاول مرة أخرى</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            key={attempt}
            source={{ uri: APP_URL }}
            style={styles.container}
            // Audio: play inline and allow speech to start from the app's own code.
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            // Camera (profile and custom tile photos): grant to the page, after iOS asks once.
            mediaCapturePermissionGrantType="grant"
            // Feel like an app, not a web page.
            bounces={false}
            allowsBackForwardNavigationGestures={false}
            allowsLinkPreview={false}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.center}>
                <ActivityIndicator size="large" />
              </View>
            )}
            onError={() => setFailed(true)}
            onHttpError={e => { if (e.nativeEvent.statusCode >= 500) setFailed(true); }}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    backgroundColor: '#fff',
  },
  message: {
    fontSize: 18,
    color: '#334155',
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#2563eb',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});
