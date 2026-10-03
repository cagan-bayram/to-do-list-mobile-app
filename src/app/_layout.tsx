import { Stack } from "expo-router";
import { configureReminderNotifications } from "@/lib/reminders";

configureReminderNotifications();

export default function RootLayout() {
  return <Stack />;
}
