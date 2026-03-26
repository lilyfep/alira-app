import { registerForPushNotifications } from '@/lib/notifications';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="libro/[id]" />
        <Stack.Screen name="wish/[id]" />
        <Stack.Screen name="resumen/[year]" />
        <Stack.Screen name="bibliotecas/index" />
        <Stack.Screen name="bibliotecas/[id]" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="premium" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', headerShown: true, title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}