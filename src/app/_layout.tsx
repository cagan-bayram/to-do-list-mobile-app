import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { configureReminderNotifications } from "@/lib/reminders";
import { colors } from "@/constants/theme";

configureReminderNotifications();

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </>
  );
}
