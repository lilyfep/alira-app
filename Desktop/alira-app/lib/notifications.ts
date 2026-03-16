// lib/notifications.ts
// Sistema de notificaciones Alira
// - Locales: objetivo completado, libro terminado, recordatorio leyendo
// - Push: libros prestados (backend), sin leer en 30 días (backend)

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiFetch } from './api';

// ── Configuración global ──────────────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

// ── Pedir permisos y registrar token push ─────────────────────────────────────
export const registerForPushNotifications = async (): Promise<string | null> => {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return null;

    // Obtener token Expo Push
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'alira-app', // debe coincidir con el slug en app.json
    });
    const token = tokenData.data;

    // Guardar token localmente
    await AsyncStorage.setItem('push_token', token);

    // Enviar al backend para notificaciones server-side
    await apiFetch('/profile/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    // Canal Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alira', {
        name:       'Alira',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token;
  } catch (e) {
    console.error('Error registrando notificaciones:', e);
    return null;
  }
};

// ── Notificación local: libro terminado ───────────────────────────────────────
export const notifyLibroTerminado = async (titulo: string) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📚 ¡Libro terminado!',
      body:  `Has terminado "${titulo}". ¡Genial!`,
      sound: true,
    },
    trigger: null, // inmediata
  });
};

// ── Notificación local: objetivo completado ───────────────────────────────────
export const notifyObjetivoCompletado = async (total: number, objetivo: number) => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 ¡Objetivo conseguido!',
      body:  `Has leído ${total} libros este año. ¡Has superado tu objetivo de ${objetivo}!`,
      sound: true,
    },
    trigger: null, // inmediata
  });
};

// ── Notificación local: recordatorio libros leyendo ───────────────────────────
// Se programa para 30 días — se cancela y reprograma cada vez que terminas un libro
export const programarRecordatorioLeyendo = async (titulosLeyendo: string[]) => {
  // Cancelar recordatorio anterior
  await cancelarRecordatorioLeyendo();

  if (titulosLeyendo.length === 0) return;

  const lista = titulosLeyendo.slice(0, 3).join(', ');
  const body  = titulosLeyendo.length === 1
    ? `Llevas un tiempo sin avanzar en "${lista}". ¿Retomamos?`
    : `Tienes ${titulosLeyendo.length} libros en progreso: ${lista}…`;

  await Notifications.scheduleNotificationAsync({
    identifier: 'recordatorio_leyendo',
    content: {
      title: '📖 ¿Sigues leyendo?',
      body,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24 * 30, // 30 días
      repeats: false,
    },
  });
};

export const cancelarRecordatorioLeyendo = async () => {
  try {
    await Notifications.cancelScheduledNotificationAsync('recordatorio_leyendo');
  } catch {}
};

// ── Programar recordatorio mensual libros prestados (local fallback) ──────────
export const programarRecordatorioPrestados = async (nombresPrestados: string[]) => {
  if (nombresPrestados.length === 0) return;

  await Notifications.scheduleNotificationAsync({
    identifier: 'recordatorio_prestados',
    content: {
      title: '🤝 Libros prestados',
      body:  `Tienes ${nombresPrestados.length} libro${nombresPrestados.length > 1 ? 's' : ''} prestado${nombresPrestados.length > 1 ? 's' : ''}. ¿Te los han devuelto?`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24 * 30, // 30 días
      repeats: true,
    },
  });
};

// ── Verificar y enviar notificaciones al abrir la app ─────────────────────────
export const checkNotificationsOnOpen = async (books: any[]) => {
  try {
    const lastCheck = await AsyncStorage.getItem('last_notif_check');
    const now       = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // Solo verificar una vez al día máximo
    if (lastCheck && now - parseInt(lastCheck) < 24 * 60 * 60 * 1000) return;

    await AsyncStorage.setItem('last_notif_check', String(now));

    // Libros leyendo — programar recordatorio si no hay ninguno terminado en 30 días
    const leyendo = books.filter(b => b.estado === 'leyendo');
    const leidosRecientes = books.filter(b => {
      if (b.estado !== 'leido' || !b.fecha_fin) return false;
      const fechaFin = new Date(b.fecha_fin).getTime();
      return now - fechaFin < thirtyDays;
    });

    if (leyendo.length > 0 && leidosRecientes.length === 0) {
      await programarRecordatorioLeyendo(leyendo.map(b => b.title));
    } else {
      await cancelarRecordatorioLeyendo();
    }

    // Libros prestados — programar recordatorio mensual
    const prestados = books.filter(b => b.ubicacion === 'prestado');
    if (prestados.length > 0) {
      await programarRecordatorioPrestados(prestados.map(b => b.title));
    }

  } catch (e) {
    console.error('Error checkNotificationsOnOpen:', e);
  }
};
