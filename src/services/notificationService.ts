import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getRecurringTransactions, type RecurringTransaction } from './recurringService';
import { dbQuery } from './database';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Plaćanja',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
    await Notifications.setNotificationChannelAsync('tips', {
      name: 'Financijski savjeti',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  return true;
};

// Cancel all scheduled notifications and reschedule
export const scheduleAllNotifications = async (userId: string) => {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const recurring = await getRecurringTransactions(userId);
  const active = recurring.filter((t) => t.isActive);

  // Schedule payment reminders (24h before due date)
  for (const tx of active) {
    await schedulePaymentReminder(tx);
  }

  // Schedule weekly budget check (every Monday at 9:00)
  await scheduleWeeklyBudgetReminder();

  // Schedule monthly summary (1st of each month at 10:00)
  await scheduleMonthlySummaryReminder();
};

// Schedule a reminder 24h before a recurring payment
const schedulePaymentReminder = async (tx: RecurringTransaction) => {
  const dueDate = new Date(tx.nextDueDate);
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(9, 0, 0, 0);

  // Only schedule if the reminder is in the future
  if (reminderDate.getTime() <= Date.now()) return;

  const amountStr = `${tx.amount.toFixed(2)} €`;
  const typeLabel = tx.type === 'expense' ? 'plaćanje' : 'prihod';

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Sutra dospijeva: ${tx.description}`,
      body: `${typeLabel === 'plaćanje' ? 'Potrebno platiti' : 'Očekivani prihod'}: ${amountStr}. Dospijeva ${tx.nextDueDate}.`,
      data: { type: 'payment_reminder', recurringId: tx.id },
      ...(Platform.OS === 'android' ? { channelId: 'payments' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
    },
  });
};

// Schedule weekly budget check - every Monday at 9:00
const scheduleWeeklyBudgetReminder = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Tjedni financijski pregled',
      body: 'Pogledajte kako stojite s budžetom ovaj tjedan. Malo kontrole = puno uštede!',
      data: { type: 'weekly_budget' },
      ...(Platform.OS === 'android' ? { channelId: 'tips' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2, // Monday (1=Sunday, 2=Monday)
      hour: 9,
      minute: 0,
    },
  });
};

// Schedule monthly summary - 1st of each month at 10:00
const scheduleMonthlySummaryReminder = async () => {
  // Schedule for the next 1st of the month
  const now = new Date();
  const nextFirst = new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Mjesečni sažetak je spreman',
      body: 'Novi mjesec, novi budžet! Pregledajte prošli mjesec i postavite ciljeve za ovaj.',
      data: { type: 'monthly_summary' },
      ...(Platform.OS === 'android' ? { channelId: 'tips' } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: nextFirst,
    },
  });
};

// Send an immediate test notification
export const sendTestNotification = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sthedisia',
      body: 'Obavijesti su uspješno uključene! Primit ćete podsjetnike za plaćanja i financijske savjete.',
      ...(Platform.OS === 'android' ? { channelId: 'tips' } : {}),
    },
    trigger: null, // immediate
  });
};

// Get count of scheduled notifications (for debugging)
export const getScheduledCount = async (): Promise<number> => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.length;
};
