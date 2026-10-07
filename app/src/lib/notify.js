/* ---------------------------------------------------------
   Notifications, booked on the phone. No server, no push, no account.

   APP.md, "When they don't open it": every notification is a complete
   answer on its own, and there are few of them. The Thursday one is
   built from the plan computed the last time the app was open — a closed
   app isn't reliably woken to compute a fresh one — so its words only
   promise what that plan can deliver.

   Permission is asked after the first save or Go, never at launch.
   --------------------------------------------------------- */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { V } from './voice';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

let channelReady = false;
async function channel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Allez',
    importance: Notifications.AndroidImportance.DEFAULT
  });
  channelReady = true;
}

export async function allowed() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function ask() {
  try {
    await channel();
    if (await allowed()) return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/* The coming Thursday at five, or next week's if that has passed. */
function nextThursday(now = new Date()) {
  const d = new Date(now);
  d.setHours(17, 0, 0, 0);
  const add = (4 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  if (d <= now) d.setDate(d.getDate() + 7);
  return d;
}

async function book(identifier, content, date) {
  if (!(await allowed())) return;
  await channel();
  try { await Notifications.cancelScheduledNotificationAsync(identifier); } catch {}
  if (date.getTime() <= Date.now()) return;
  await Notifications.scheduleNotificationAsync({
    identifier,
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: 'default' }
  });
}

export function weekendReady(firstTitle) {
  return book('weekend', {
    title: V.notify.weekendTitle,
    body: V.notify.weekendBody(firstTitle),
    data: { url: '/weekend' }
  }, nextThursday()).catch(() => {});
}

export function howWasIt(outing) {
  return book('how-' + outing.key, {
    title: V.notify.howTitle(outing.title),
    body: V.notify.howBody,
    data: { url: `/how/${outing.key}` }
  }, new Date(outing.dueAt)).catch(() => {});
}

export function cancelAll() {
  return Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
