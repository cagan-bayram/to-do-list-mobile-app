import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import AppIcon from "@/components/AppIcon";
import { colors } from "@/constants/theme";

type ReminderFieldProps = {
  value: Date | null;
  onChange: (value: Date | null) => void;
  onEnable: () => void;
  onSetup: () => void;
  requestingPermission: boolean;
  disabled?: boolean;
};

export default function ReminderField({
  value,
  onChange,
  onEnable,
  onSetup,
  requestingPermission,
  disabled = false,
}: ReminderFieldProps) {
  const [picker, setPicker] = useState<"date" | "time" | null>(null);

  if (Platform.OS === "web") return null;

  return (
    <View style={styles.field}>
      <View style={styles.row}>
        <View style={styles.labelRow}><AppIcon name="bell" size={20} color={colors.primary} /><Text style={styles.label}>Remind me</Text></View>
        <Switch
          value={value !== null}
          disabled={disabled || requestingPermission}
          accessibilityLabel="Enable a task reminder"
          trackColor={{ false: colors.border, true: colors.primary }}
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
              disabled={requestingPermission}
            >
              <Text style={styles.buttonText}>Date: {value.toLocaleDateString()}</Text>
            </Pressable>
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              accessibilityLabel={`Reminder time: ${value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              onPress={() => setPicker("time")}
              disabled={requestingPermission}
            >
              <Text style={styles.buttonText}>
                Time: {value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.note}>The reminder is scheduled when you save the task.</Text>
          <Pressable style={styles.settingsLink} onPress={onSetup} accessibilityRole="button">
            <Text style={styles.settingsText}>Reminder settings</Text>
            <AppIcon name="arrow" size={16} color={colors.primary} />
          </Pressable>
          {picker !== null && (
            <>
              <DateTimePicker
                key={picker}
                value={value}
                mode={picker}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="light"
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
  field: { gap: 8, backgroundColor: colors.background, borderRadius: 14, padding: 12 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  label: { fontSize: 15, color: colors.ink },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: {
    minHeight: 48,
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  buttonText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  note: { fontSize: 13, lineHeight: 20, color: colors.muted },
  settingsLink: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 6 },
  settingsText: { fontSize: 13, fontWeight: "600", color: colors.primary },
});
