import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

type ReminderSettingsModule = {
  canScheduleExactAlarms(): Promise<boolean>;
  openAlarmSettings(): Promise<void>;
};

export const needsAlarmPermission = Platform.OS === "android" && Platform.Version >= 31;

function getModule() {
  const module = requireOptionalNativeModule<ReminderSettingsModule>("ReminderSettings");
  if (!module) {
    throw new Error("Reminder setup needs the latest app build. Install the updated app and try again.");
  }
  return module;
}

export async function canScheduleExactAlarms() {
  return !needsAlarmPermission || await getModule().canScheduleExactAlarms();
}

export async function openAlarmSettings() {
  if (needsAlarmPermission) await getModule().openAlarmSettings();
}
