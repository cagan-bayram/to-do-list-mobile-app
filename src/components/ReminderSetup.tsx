import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { needsAlarmPermission, openAlarmSettings } from "../../modules/reminder-settings";
import { getReminderPermissions, requestReminderPermission } from "@/lib/reminders";
import { colors } from "@/constants/theme";
import AppIcon from "@/components/AppIcon";

type PermissionStatus = Awaited<ReturnType<typeof getReminderPermissions>>;

export default function ReminderSetup({ onClose, onReady }: {
  onClose: () => void;
  onReady: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(() => {
    const version = ++requestVersion.current;
    return getReminderPermissions()
      .then((next) => {
        if (version !== requestVersion.current) return;
        setStatus(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (version === requestVersion.current) {
          setStatus(null);
          setError(cause instanceof Error ? cause.message : "Could not check settings. Please try again.");
        }
      })
      .finally(() => {
        if (version === requestVersion.current) setBusy(false);
      });
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setBusy(true);
        void refresh();
      }
    });
    return () => {
      requestVersion.current += 1;
      subscription.remove();
    };
  }, [refresh]);

  async function runAction(action: () => Promise<unknown>, finish = false) {
    if (busy) return;
    const version = ++requestVersion.current;
    setBusy(true);
    setError(null);
    try {
      await action();
      if (version !== requestVersion.current) return;
      const next = await getReminderPermissions();
      if (version !== requestVersion.current) return;
      setStatus(next);
      if (finish && next.notifications && next.alarms) onReady();
    } catch (cause) {
      if (version === requestVersion.current) {
        setError(cause instanceof Error ? cause.message : "Could not open settings. Please try again.");
      }
    } finally {
      if (version === requestVersion.current) setBusy(false);
    }
  }

  const ready = status?.notifications && status.alarms;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.backdrop, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heading}>
              <View style={styles.heroIcon}><AppIcon name="bell" size={28} color={colors.primary} /></View>
              <Pressable style={styles.close} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close reminder setup">
                <AppIcon name="close" />
              </Pressable>
            </View>
            <Text style={styles.title} accessibilityRole="header">Let’s set up reminders</Text>
            <Text style={styles.description}>
              {needsAlarmPermission
                ? "Two settings help your reminders reach you. Notifications must be on, and without Alarms & reminders access they may arrive late."
                : "Allow notifications so your task reminders can reach you."}
            </Text>
            <View style={styles.step}>
              <Text style={styles.stepTitle}>1. Notifications {status?.notifications ? "— enabled" : ""}</Text>
              <Text style={styles.description}>Let this app show task alerts. Keep the Task reminders notification category enabled too.</Text>
              {status?.notifications ? (
                <View style={styles.enabled}><AppIcon name="check" color={colors.primary} /><Text style={styles.enabledText}>Ready</Text></View>
              ) : (
                <Pressable style={[styles.button, busy && styles.disabled]} disabled={busy} accessibilityRole="button"
                  onPress={() => void runAction(status?.canAskAgain ? requestReminderPermission : Linking.openSettings)}>
                  <Text style={styles.buttonText}>{status?.canAskAgain ? "Allow notifications" : "Open notification settings"}</Text>
                  <AppIcon name="arrow" size={18} color={colors.primary} />
                </Pressable>
              )}
            </View>
            {needsAlarmPermission && (
              <View style={styles.step}>
                <Text style={styles.stepTitle}>2. Alarms &amp; reminders {status?.alarms ? "— enabled" : ""}</Text>
                <Text style={styles.description}>Open settings, turn on “Allow setting alarms and reminders” for this app, then come back here. If a list opens, choose to-do.</Text>
                {status?.alarms ? (
                  <View style={styles.enabled}><AppIcon name="check" color={colors.primary} /><Text style={styles.enabledText}>Ready</Text></View>
                ) : (
                  <Pressable style={[styles.button, (busy || !status?.notifications) && styles.disabled]}
                    disabled={busy || !status?.notifications} accessibilityRole="button"
                    onPress={() => void runAction(openAlarmSettings)}>
                    <Text style={styles.buttonText}>Open alarms &amp; reminders</Text>
                    <AppIcon name="arrow" size={18} color={colors.primary} />
                  </Pressable>
                )}
              </View>
            )}
            {busy && <ActivityIndicator color={colors.primary} accessibilityLabel="Checking reminder settings" />}
            {error !== null && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
            <Pressable style={styles.recheck} onPress={() => { setBusy(true); void refresh(); }} disabled={busy} accessibilityRole="button">
              <Text style={styles.enabledText}>Check settings again</Text>
            </Pressable>
            <Pressable style={[styles.continue, (!ready || busy) && styles.disabled]} disabled={!ready || busy}
              accessibilityRole="button" accessibilityState={{ disabled: !ready || busy }}
              onPress={() => void runAction(async () => {}, true)}>
              <Text style={styles.continueText}>Continue</Text>
            </Pressable>
            <Text style={styles.footnote}>You can close this setup and use your task list without reminders.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(19, 36, 28, 0.45)", justifyContent: "flex-end" },
  sheet: { maxHeight: "100%", backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, alignSelf: "center", width: "100%", maxWidth: 600 },
  content: { padding: 24, gap: 16 },
  heading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "700", color: colors.ink },
  description: { fontSize: 15, lineHeight: 23, color: colors.muted },
  step: { backgroundColor: colors.background, padding: 16, borderRadius: 18, gap: 10 },
  stepTitle: { fontSize: 17, fontWeight: "600", color: colors.ink },
  enabled: { flexDirection: "row", alignItems: "center", gap: 6 },
  enabledText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  button: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, padding: 12, backgroundColor: colors.primarySoft, borderRadius: 12 },
  buttonText: { flexShrink: 1, fontSize: 15, fontWeight: "600", color: colors.primary },
  recheck: { minHeight: 48, alignItems: "center", justifyContent: "center" },
  continue: { minHeight: 52, backgroundColor: colors.primary, borderRadius: 16, alignItems: "center", justifyContent: "center", padding: 12 },
  continueText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  disabled: { opacity: 0.45 },
  error: { fontSize: 14, color: colors.danger, lineHeight: 21 },
  footnote: { fontSize: 13, lineHeight: 20, color: colors.muted, textAlign: "center" },
});
