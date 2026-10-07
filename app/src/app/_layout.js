/* The root: fonts, the app's memory, and a plain stack with no headers —
   every screen says what it is in its own first line. */

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import Stack from 'expo-router/stack';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import { Nunito_400Regular } from '@expo-google-fonts/nunito/400Regular';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_800ExtraBold } from '@expo-google-fonts/nunito/800ExtraBold';
import { AppProvider } from '../lib/state';
import { useTheme } from '../lib/theme';

export default function Root() {
  const c = useTheme();
  const [loaded] = useFonts({ Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold });

  /* A tapped notification opens what it was about. */
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(r => {
      const url = r.notification.request.content.data && r.notification.request.content.data.url;
      if (typeof url === 'string') router.push(url);
    });
    return () => sub.remove();
  }, []);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.muted} /></View>;

  return (
    <AppProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="go/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="how/[key]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="postcard/[key]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="deck" options={{ presentation: 'modal' }} />
        <Stack.Screen name="me" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </AppProvider>
  );
}
