import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CHANNEL_ID = "task-reminders";
const IDENTIFIER_PREFIX = "todo.task-reminder.";

type ReminderTask = {
  id: number;
  title: string;
  completed: boolean;
  reminderAt: Date | null;
};

function isSupported() {
  return Platform.OS === "android" || Platform.OS === "ios";
}

export function configureReminderNotifications() {
  if (!isSupported()) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function hasPermission(permission: Notifications.NotificationPermissionsStatus) {
  if (Platform.OS === "ios" && permission.ios) {
    return [
      Notifications.IosAuthorizationStatus.AUTHORIZED,
      Notifications.IosAuthorizationStatus.PROVISIONAL,
      Notifications.IosAuthorizationStatus.EPHEMERAL,
    ].includes(permission.ios.status);
  }
  return permission.granted;
}

async function prepareChannel() {
  if (Platform.OS !== "android") return;

  const channel = await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Task reminders",
    importance: Notifications.AndroidImportance.HIGH,
    // Omit sound to use Android's default; channel sound strings are asset filenames.
  });
  if (channel?.importance === Notifications.AndroidImportance.NONE) {
    throw new Error("Task reminders are turned off in your phone's notification settings.");
  }
}

// Called only when the user explicitly enables a reminder.
export async function requestReminderPermission() {
  if (!isSupported()) {
    throw new Error("Task reminders are available on Android and iOS.");
  }
  await prepareChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!hasPermission(permission) && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  }
  return hasPermission(permission);
}

export function defaultReminderDate() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setSeconds(0, 0);
  return date;
}

export function restoreReminderDate(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Stable identifiers let the app find its reminders again after a restart.
// The caller queues this operation with task saves to prevent competing updates.
export async function syncTaskReminders(tasks: readonly ReminderTask[]) {
  if (!isSupported()) return;

  const now = Date.now();
  // A past reminder may still be awaiting delivery. Keep it until it fires or the task changes.
  const desired = new Map<string, ReminderTask>(
    tasks
      .filter((task) => !task.completed && task.reminderAt !== null)
      .map((task) => [`${IDENTIFIER_PREFIX}${task.id}`, task] as const)
  );
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const matching = new Set<string>();
  const failedCancellations = new Set<string>();

  for (const notification of scheduled) {
    if (!notification.identifier.startsWith(IDENTIFIER_PREFIX)) continue;
    const task = desired.get(notification.identifier);
    if (
      task &&
      notification.content.title === task.title &&
      notification.content.data?.reminderAt === task.reminderAt?.toISOString()
    ) {
      matching.add(notification.identifier);
      continue;
    }

    // Remove deleted/completed reminders and the previous version of edited ones.
    try {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    } catch {
      failedCancellations.add(notification.identifier);
    }
  }

  const futureReminders = [...desired].filter(
    ([, task]) => task.reminderAt !== null && task.reminderAt.getTime() > now
  );
  let failedSchedules = 0;
  if (futureReminders.length > 0) {
    await prepareChannel();
    if (!hasPermission(await Notifications.getPermissionsAsync())) {
      throw new Error("Notifications are turned off. Enable them in your phone's settings, then tap Retry reminders.");
    }

    for (const [identifier, task] of futureReminders) {
      if (matching.has(identifier) || failedCancellations.has(identifier)) continue;
      // The user may have chosen a very near time; never schedule an expired date.
      if (!task.reminderAt || task.reminderAt.getTime() <= Date.now()) continue;
      try {
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: task.title,
            body: "Your task reminder is due.",
            sound: "default",
            data: { taskId: task.id, reminderAt: task.reminderAt.toISOString() },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: task.reminderAt,
            channelId: CHANNEL_ID,
          },
        });
      } catch {
        failedSchedules += 1;
      }
    }
  }

  if (failedCancellations.size > 0 || failedSchedules > 0) {
    throw new Error("Some reminders could not be updated or cancelled. Tap Retry reminders.");
  }
}
