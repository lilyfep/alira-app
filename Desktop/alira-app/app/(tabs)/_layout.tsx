// app/(tabs)/_layout.tsx
import { Colors } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { Platform, Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0b1220',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor:   Colors.accent,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="buscar"    options={{ title: 'Buscar',    tabBarIcon: ({ focused }) => <TI e="🔍" f={focused} /> }} />
      <Tabs.Screen name="coleccion" options={{ title: 'Colección', tabBarIcon: ({ focused }) => <TI e="📚" f={focused} /> }} />
      <Tabs.Screen name="wishreads" options={{ title: 'Wishreads', tabBarIcon: ({ focused }) => <TI e="✨" f={focused} /> }} />
      <Tabs.Screen name="perfil"    options={{ title: 'Perfil',    tabBarIcon: ({ focused }) => <TI e="👤" f={focused} /> }} />
      <Tabs.Screen name="rachas"    options={{ title: 'Rachas', tabBarIcon: ({ focused }) => <TI e="🔥" f={focused} /> }} />
      <Tabs.Screen name="index"     options={{ href: null }} />
      <Tabs.Screen name="explore"   options={{ href: null }} />
      
    </Tabs>
  );
}

function TI({ e, f }: { e: string; f: boolean }) {
  return <Text style={{ fontSize: 20, opacity: f ? 1 : 0.5 }}>{e}</Text>;
}