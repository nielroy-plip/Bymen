import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATION_LAST_SENT_AT_KEY = 'sync_pending_notification_last_sent_at';
const NOTIFICATION_LAST_COUNT_KEY = 'sync_pending_notification_last_count';
const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications() {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const asked = await Notifications.requestPermissionsAsync();
    if (!asked.granted) return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sync-pending', {
      name: 'Pendências de sincronização',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  return true;
}

export async function notifySyncPending(count: number) {
  if (count <= 0) return;

  const [lastSentRaw, lastCountRaw] = await Promise.all([
    AsyncStorage.getItem(NOTIFICATION_LAST_SENT_AT_KEY),
    AsyncStorage.getItem(NOTIFICATION_LAST_COUNT_KEY),
  ]);

  const now = Date.now();
  const lastSent = Number(lastSentRaw || 0);
  const lastCount = Number(lastCountRaw || 0);
  const onCooldown = now - lastSent < NOTIFICATION_COOLDOWN_MS;

  if (onCooldown && count <= lastCount) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pendências de sincronização',
      body: `Você possui ${count} ${count === 1 ? 'pendência' : 'pendências'} para revisar.`,
      data: { screen: 'PendenciasSync' },
    },
    trigger: null,
  });

  await Promise.all([
    AsyncStorage.setItem(NOTIFICATION_LAST_SENT_AT_KEY, String(now)),
    AsyncStorage.setItem(NOTIFICATION_LAST_COUNT_KEY, String(count)),
  ]);
}

export async function resetSyncPendingNotificationState() {
  await Promise.all([
    AsyncStorage.removeItem(NOTIFICATION_LAST_SENT_AT_KEY),
    AsyncStorage.removeItem(NOTIFICATION_LAST_COUNT_KEY),
  ]);
}
