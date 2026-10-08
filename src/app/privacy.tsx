import { router } from "expo-router";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppIcon from "@/components/AppIcon";
import { colors } from "@/constants/theme";
import policy from "@/content/privacy-policy.json";

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function emailDeveloper() {
    try {
      await Linking.openURL(`mailto:${policy.contactEmail}?subject=ToDoo%20privacy`);
    } catch {
      Alert.alert("Contact the developer", `Email ${policy.contactEmail} with your privacy question.`);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[
      styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
    ]}>
      <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to tasks">
        <AppIcon name="back" size={20} color={colors.primary} />
        <Text style={styles.backText}>Back to tasks</Text>
      </Pressable>
      <Text style={styles.brand}>{policy.appName}</Text>
      <Text style={styles.title} accessibilityRole="header">Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: {policy.lastUpdated}</Text>
      <View style={styles.summaryCard}>
        <Text selectable style={styles.body}>{policy.summary}</Text>
      </View>
      {policy.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} selectable style={styles.body}>{paragraph}</Text>
          ))}
        </View>
      ))}
      <View style={styles.contactCard}>
        <Text style={styles.sectionTitle} accessibilityRole="header">Contact</Text>
        <Text selectable style={styles.body}>{policy.developer}</Text>
        <Text selectable style={styles.email}>{policy.contactEmail}</Text>
        <Pressable style={styles.emailButton} onPress={() => void emailDeveloper()} accessibilityRole="button">
          <Text style={styles.emailButtonText}>Email the developer</Text>
          <AppIcon name="arrow" size={18} color="#ffffff" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, width: "100%", maxWidth: 680, alignSelf: "center", gap: 16 },
  backButton: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  backText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  brand: { fontSize: 14, fontWeight: "700", color: colors.primary },
  title: { fontSize: 32, fontWeight: "700", color: colors.ink },
  updated: { fontSize: 14, color: colors.muted },
  summaryCard: { padding: 18, borderRadius: 18, backgroundColor: colors.primarySoft },
  body: { fontSize: 16, lineHeight: 25, color: colors.ink },
  section: { gap: 10, paddingTop: 8 },
  sectionTitle: { fontSize: 20, fontWeight: "600", lineHeight: 28, color: colors.ink },
  contactCard: { backgroundColor: colors.surface, padding: 18, borderRadius: 18, borderWidth: 1, borderColor: colors.border, gap: 12 },
  email: { fontSize: 15, color: colors.primary },
  emailButton: { minHeight: 52, padding: 14, borderRadius: 14, backgroundColor: colors.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  emailButtonText: { fontSize: 15, fontWeight: "600", color: "#ffffff", flexShrink: 1 },
});
