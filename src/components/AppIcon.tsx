import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { View } from "react-native";
import { colors } from "@/constants/theme";

const symbols = {
  check: { ios: "checkmark", android: "check", web: "check" },
  plus: { ios: "plus", android: "add", web: "add" },
  calendar: { ios: "calendar", android: "calendar_today", web: "calendar_today" },
  bell: { ios: "bell", android: "notifications", web: "notifications" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  edit: { ios: "pencil", android: "edit", web: "edit" },
  trash: { ios: "trash", android: "delete", web: "delete" },
  close: { ios: "xmark", android: "close", web: "close" },
  arrow: { ios: "arrow.up.right", android: "open_in_new", web: "open_in_new" },
  back: { ios: "chevron.left", android: "arrow_back", web: "arrow_back" },
  list: { ios: "checklist", android: "checklist", web: "checklist" },
} satisfies Record<string, SymbolViewProps["name"]>;

export default function AppIcon({ name, size = 22, color = colors.ink }: {
  name: keyof typeof symbols;
  size?: number;
  color?: string;
}) {
  return (
    <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <SymbolView name={symbols[name]} size={size} tintColor={color} />
    </View>
  );
}
