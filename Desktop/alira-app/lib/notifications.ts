// lib/notifications.ts
// Sistema completo de notificaciones Alira
// ─────────────────────────────────────────────────────────────────────────────
// Locales (inmediatas o programadas en dispositivo):
//   • Libro terminado
//   • Objetivo anual completado
//   • Racha de lectura (3, 7, 30 días)
//   • Primer libro del año
//   • Libro número redondo (10, 25, 50, 100...)
//   • Récord personal
//   • Recordatorio libros leyendo (30 días sin terminar)
//   • Recordatorio libros prestados (mensual)
//   • Mitad de año (1 julio)
//   • Final de año (1 diciembre)
//   • Resumen del mes (1 de cada mes)
//
// Push via backend:
//   • Libros prestados mensual
//   • Sin leer en 30 días

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

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'alira-app',
    });
    const token = tokenData.data;
    await AsyncStorage.setItem('push_token', token);

    await apiFetch('/push/token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Platform.OS }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alira', {
        name:             'Alira',
        importance:       Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    return token;
  } catch (e) {
    console.error('Error registrando notificaciones:', e);
    return null;
  }
};

// ── Helper: enviar notificación local inmediata ───────────────────────────────
const notifLocal = async (id: string, title: string, body: string) => {
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body, sound: true },
    trigger: null,
  });
};

// ── 1. Libro terminado ────────────────────────────────────────────────────────
export const notifyLibroTerminado = async (titulo: string) => {
  await notifLocal('libro_terminado', '📚 ¡Libro terminado!', `Has terminado "${titulo}". ¡Genial!`);
};

// ── 2. Objetivo anual completado ──────────────────────────────────────────────
export const notifyObjetivoCompletado = async (total: number, objetivo: number) => {
  await notifLocal('objetivo_completado', '🎉 ¡Objetivo conseguido!',
    `Has leído ${total} libros este año. ¡Superaste tu objetivo de ${objetivo}!`);
};

// ── 3. Primer libro del año ───────────────────────────────────────────────────
export const notifyPrimerLibroAnio = async (anio: number) => {
  await notifLocal('primer_libro_anio', `🎊 ¡Primer libro de ${anio}!`,
    `¡Empezaste el año con buen pie! El primero de muchos.`);
};

// ── 4. Libro número redondo ───────────────────────────────────────────────────
export const notifyLibroRedondo = async (total: number) => {
  const emojis: Record<number, string> = {
    10: '🔟', 25: '✨', 50: '🌟', 100: '💯', 200: '🏆', 500: '👑',
  };
  const emoji = emojis[total] || '📚';
  await notifLocal(`libro_redondo_${total}`, `${emoji} ¡Libro número ${total}!`,
    `Has leído ${total} libros en Alira. ¡Eres increíble!`);
};

// ── 5. Racha de lectura ───────────────────────────────────────────────────────
export const notifyRacha = async (dias: number) => {
  const mensajes: Record<number, [string, string]> = {
    3:  ['🔥 ¡3 días seguidos!',   '¡Llevas 3 días leyendo seguidos! Sigue así.'],
    7:  ['🔥 ¡Una semana!',        '¡7 días de racha lectora! Eres una máquina.'],
    30: ['🏆 ¡30 días de racha!',  '¡Un mes leyendo cada día! Récord increíble.'],
  };
  const [title, body] = mensajes[dias] || [`🔥 ¡${dias} días de racha!`, `Llevas ${dias} días leyendo seguidos.`];
  await notifLocal(`racha_${dias}`, title, body);
};

// ── 6. Récord personal ────────────────────────────────────────────────────────
export const notifyRecord = async (anioActual: number, totalActual: number, anioAnterior: number, totalAnterior: number) => {
  await notifLocal('record_personal', '🏆 ¡Nuevo récord personal!',
    `Con ${totalActual} libros ya superaste tu mejor año (${totalAnterior} en ${anioAnterior}). ¡Increíble!`);
};

// ── 7. Recordatorio libros leyendo (30 días sin terminar) ─────────────────────
export const programarRecordatorioLeyendo = async (titulosLeyendo: string[]) => {
  await cancelarRecordatorioLeyendo();
  if (titulosLeyendo.length === 0) return;

  const lista = titulosLeyendo.slice(0, 2).join(' y ');
  const body  = titulosLeyendo.length === 1
    ? `Llevas un tiempo sin avanzar en "${lista}". ¿Retomamos?`
    : `Tienes ${titulosLeyendo.length} libros en progreso. ¿Seguimos con "${lista}"?`;

  await Notifications.scheduleNotificationAsync({
    identifier: 'recordatorio_leyendo',
    content: { title: '📖 ¿Sigues leyendo?', body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24 * 30,
      repeats: false,
    },
  });
};

export const cancelarRecordatorioLeyendo = async () => {
  try { await Notifications.cancelScheduledNotificationAsync('recordatorio_leyendo'); } catch {}
};

// ── 8. Recordatorio libros prestados (mensual) ────────────────────────────────
export const programarRecordatorioPrestados = async (prestados: string[]) => {
  if (prestados.length === 0) return;
  const n = prestados.length;
  await Notifications.scheduleNotificationAsync({
    identifier: 'recordatorio_prestados',
    content: {
      title: '🤝 Libros prestados',
      body:  `Tienes ${n} libro${n > 1 ? 's' : ''} prestado${n > 1 ? 's' : ''}. ¿Te ${n > 1 ? 'los' : 'lo'} han devuelto?`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 60 * 60 * 24 * 30,
      repeats: true,
    },
  });
};

// ── 9. Recordatorio mitad de año (1 julio) ────────────────────────────────────
export const programarMitadAnio = async (leidosActual: number, objetivo: number) => {
  const ahora   = new Date();
  const julio1  = new Date(ahora.getFullYear(), 6, 1, 10, 0, 0);
  if (ahora >= julio1) return; // ya pasó

  const segundos = Math.floor((julio1.getTime() - ahora.getTime()) / 1000);
  const faltan   = objetivo - leidosActual;
  const body     = faltan > 0
    ? `Llevas ${leidosActual} libros. Te faltan ${faltan} para tu objetivo. ¡Tú puedes!`
    : `¡Ya cumpliste tu objetivo con ${leidosActual} libros! ¿Lo subimos?`;

  await Notifications.scheduleNotificationAsync({
    identifier: 'mitad_anio',
    content: { title: '📊 ¡Mitad de año!', body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: segundos,
      repeats: false,
    },
  });
};

// ── 10. Recordatorio final de año (1 diciembre) ───────────────────────────────
export const programarFinalAnio = async (leidosActual: number, objetivo: number) => {
  const ahora    = new Date();
  const dic1     = new Date(ahora.getFullYear(), 11, 1, 10, 0, 0);
  if (ahora >= dic1) return;

  const segundos = Math.floor((dic1.getTime() - ahora.getTime()) / 1000);
  const faltan   = objetivo - leidosActual;
  const body     = faltan > 0
    ? `Quedan 31 días del año y te faltan ${faltan} libros para tu objetivo. ¡Al lío!`
    : `¡Objetivo cumplido con ${leidosActual} libros! Aún quedan 31 días para mejorar el récord.`;

  await Notifications.scheduleNotificationAsync({
    identifier: 'final_anio',
    content: { title: '🗓 ¡Último mes del año!', body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: segundos,
      repeats: false,
    },
  });
};

// ── 11. Resumen del mes (1 de cada mes) ───────────────────────────────────────
export const programarResumenMensual = async () => {
  const ahora      = new Date();
  const proxMes    = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1, 9, 0, 0);
  const segundos   = Math.floor((proxMes.getTime() - ahora.getTime()) / 1000);

  await Notifications.scheduleNotificationAsync({
    identifier: 'resumen_mensual',
    content: {
      title: '📅 Resumen de lectura',
      body:  '¡Nuevo mes! Entra en Alira para ver cuánto leíste el mes pasado.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: segundos,
      repeats: false,
    },
  });
};

// ── Función principal: verificar y disparar notificaciones ───────────────────
// Se llama al abrir la app y al guardar un libro
export const checkAndNotify = async (books: any[], options?: {
  libroRecienTerminado?: string;
  totalLeidos?: number;
}) => {
  try {
    const thisYear    = new Date().getFullYear();
    const objetivo    = parseInt(await AsyncStorage.getItem('objetivo_anual') || '12');
    const leidos      = books.filter(b => b.estado === 'leido');
    const leyendo     = books.filter(b => b.estado === 'leyendo');
    const prestados   = books.filter(b => b.ubicacion === 'prestado');

    // Leídos este año
    const leidosAnio  = leidos.filter(b => {
      if (!b.fecha_fin) return false;
      return new Date(b.fecha_fin).getFullYear() === thisYear;
    });

    const totalAnio   = leidosAnio.length;
    const totalGlobal = leidos.length;

    // ── Si acaba de terminar un libro ──────────────────────────────────────
    if (options?.libroRecienTerminado) {
      await notifyLibroTerminado(options.libroRecienTerminado);

      // Primer libro del año
      if (totalAnio === 1) {
        await notifyPrimerLibroAnio(thisYear);
      }

      // Objetivo completado
      if (totalAnio === objetivo) {
        await notifyObjetivoCompletado(totalAnio, objetivo);
      }

      // Libros redondos globales
      const redondos = [10, 25, 50, 100, 200, 500];
      if (redondos.includes(totalGlobal)) {
        await notifyLibroRedondo(totalGlobal);
      }

      // Racha de lectura
      const fechas = leidos
        .filter(b => b.fecha_fin)
        .map(b => new Date(b.fecha_fin).toDateString())
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();

      let racha = 1;
      for (let i = fechas.length - 1; i > 0; i--) {
        const diff = (new Date(fechas[i]).getTime() - new Date(fechas[i-1]).getTime()) / 86400000;
        if (diff === 1) racha++;
        else break;
      }
      if ([3, 7, 30].includes(racha)) await notifyRacha(racha);

      // Récord personal — comparar con año anterior
      const anioAnterior = thisYear - 1;
      const leidosAnt    = leidos.filter(b => {
        if (!b.fecha_fin) return false;
        return new Date(b.fecha_fin).getFullYear() === anioAnterior;
      }).length;

      const recordKey = `record_${anioAnterior}`;
      const yaNotif   = await AsyncStorage.getItem(recordKey);
      if (!yaNotif && leidosAnt > 0 && totalAnio > leidosAnt) {
        await notifyRecord(thisYear, totalAnio, anioAnterior, leidosAnt);
        await AsyncStorage.setItem(recordKey, '1');
      }

      // Reprogramar recordatorio leyendo
      const leyendoRestante = leyendo.filter(b => b.title !== options.libroRecienTerminado);
      if (leyendoRestante.length > 0) {
        await programarRecordatorioLeyendo(leyendoRestante.map((b: any) => b.title));
      } else {
        await cancelarRecordatorioLeyendo();
      }
    }

    // ── Al abrir la app (una vez al día) ──────────────────────────────────
    const lastCheck = await AsyncStorage.getItem('last_notif_check');
    const now       = Date.now();
    if (!lastCheck || now - parseInt(lastCheck) > 24 * 60 * 60 * 1000) {
      await AsyncStorage.setItem('last_notif_check', String(now));

      // Programar recordatorios de calendario
      await programarMitadAnio(totalAnio, objetivo);
      await programarFinalAnio(totalAnio, objetivo);
      await programarResumenMensual();

      // Recordatorio libros leyendo si no terminó nada en 30 días
      const leidosRecientes = leidos.filter(b => {
        if (!b.fecha_fin) return false;
        return now - new Date(b.fecha_fin).getTime() < 30 * 24 * 60 * 60 * 1000;
      });
      if (leyendo.length > 0 && leidosRecientes.length === 0) {
        await programarRecordatorioLeyendo(leyendo.map((b: any) => b.title));
      }

      // Recordatorio prestados
      if (prestados.length > 0) {
        await programarRecordatorioPrestados(prestados.map((b: any) => b.title));
      }
    }

  } catch (e) {
    console.error('Error checkAndNotify:', e);
  }
};

// Exportar alias para compatibilidad
export const notifyLibroTerminado_standalone  = notifyLibroTerminado;
export const notifyObjetivoCompletado_standalone = notifyObjetivoCompletado;
export const checkNotificationsOnOpen = (books: any[]) => checkAndNotify(books);
