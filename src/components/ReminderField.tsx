import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";

type ReminderFieldProps = {
  value: Date | null;
  onChange: (value: Date | null) => void;
  onEnable: () => void;
  requestingPermission: boolean;
  disabled?: boolean;
};

export default function ReminderField({
  value,
  onChange,
  onEnable,
  requestingPermission,
  disabled = false,
}: ReminderFieldProps) {
  const [picker, setPicker] = useState<"date" | "time" | null>(null);

  if (Platform.OS === "web") return null;

  return (
    <View style={styles.field}>
      <View style={styles.row}>
        <Text style={styles.label}>Remind me</Text>
        <Switch
          value={value !== null}
          disabled={disabled || requestingPermission}
          accessibilityLabel="Enable a task reminder"
          onValueChange={(enabled) => {
            setPicker(null);
            if (enabled) onEnable();
            else onChange(null);
          }}
        />
      </View>
      {disabled && <Text style={styles.note}>Reopen this task to add a reminder.</Text>}
      {requestingPermission && <Text style={styles.note}>Checking notification permission…</Text>}
      {value !== null && !disabled && (
        <>
          <View style={styles.buttons}>
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              accessibilityLabel={`Reminder date: ${value.toLocaleDateString()}`}
              onPress={() => setPicker("date")}
            >
              <Text style={styles.buttonText}>Date: {value.toLocaleDateString()}</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              accessibilityLabel={`Reminder time: ${value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              onPress={() => setPicker("time")}
            >
              <Text style={styles.buttonText}>
                Time: {value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.note}>The reminder is scheduled when you save the task.</Text>
          {Platform.OS === "android" && Platform.Version >= 31 && (
            <Text style={styles.note}>
              For reminders at the selected time, allow Alarms &amp; reminders for this app in your phone settings.
            </Text>
          )}
          {picker !== null && (
            <>
              <DateTimePicker
                key={picker}
                value={value}
                mode={picker}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                minimumDate={picker === "date" ? new Date() : undefined}
                onValueChange={(_event, selected) => {
                  const next = new Date(value);
                  if (picker === "date") {
                    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                  } else {
                    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
                  }
                  onChange(next);
                  if (Platform.OS !== "ios") setPicker(null);
                }}
                onDismiss={() => setPicker(null)}
              />
              {Platform.OS === "ios" && (
                <Pressable style={styles.button} accessibilityRole="button" onPress={() => setPicker(null)}>
                  <Text style={styles.buttonText}>Done</Text>
                </Pressable>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 12, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    minHeight: 48,
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#e2e8f0",
  },
  buttonText: { fontSize: 16, color: "#0f172a" },
  note: { fontSize: 14, color: "#475569" },
});
