import { Colors } from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function IndexScreen() {
  useEffect(() => {
    AsyncStorage.getItem('access_token').then(token => {
      if (token) router.replace('/(tabs)/buscar');
      else router.replace('/login');
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.accent} />
    </View>
  );
}