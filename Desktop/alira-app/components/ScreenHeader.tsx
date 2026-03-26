// components/ScreenHeader.tsx
// Header reutilizable para todas las pantallas de Alira
// Estructura: [left] [título centrado] [right]
// — Si no se pasa left/right, se reserva el espacio para mantener el título centrado
// — Usar en todas las pantallas fuera de (tabs) para consistencia visual

import { Colors, Spacing } from '@/constants/theme';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title: string;

  // Elemento izquierdo — por defecto "← Volver"
  // Pasar null para ocultarlo (ej: pantallas sin back)
  leftElement?: ReactNode | null;

  // Elemento derecho — por defecto espacio vacío
  // Pasar null para ocultarlo
  rightElement?: ReactNode | null;

  // Callback del botón volver — por defecto router.back()
  onBack?: () => void;
}

export default function ScreenHeader({
  title,
  leftElement,
  rightElement,
  onBack,
}: ScreenHeaderProps) {

  // Left por defecto: botón volver
  const left = leftElement !== undefined
    ? leftElement
    : (
      <TouchableOpacity
        onPress={onBack ?? (() => router.back())}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={s.side}
      >
        <Text style={s.backText}>← Volver</Text>
      </TouchableOpacity>
    );

  // Right por defecto: espacio vacío (mantiene título centrado)
  const right = rightElement !== undefined
    ? rightElement
    : <View style={s.side} />;

  return (
    <View style={s.header}>
      <View style={s.side}>{left}</View>
      <Text style={s.title} numberOfLines={1}>{title}</Text>
      <View style={s.side}>{right}</View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.bg,
  },
  side: {
    width: 80,                  // ancho fijo → título siempre centrado
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
    color: Colors.text,
    fontWeight: '800',
    fontSize: 17,
    textAlign: 'center',
  },
  backText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
});
