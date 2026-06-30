import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";
import { t } from "../../src/services/i18n";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; labelKey: string; icon: IconName }[] = [
  { name: "index", labelKey: "tab.home", icon: "home" },
  { name: "pantau", labelKey: "tab.monitor", icon: "eye" },
  { name: "ai", labelKey: "tab.ai", icon: "sparkles" },
  { name: "catatan", labelKey: "tab.notes", icon: "document-text" },
  { name: "profil", labelKey: "tab.profile", icon: "person" },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { monitors, language } = useApp();
  const activeCount = monitors.filter(m => m.active).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarShowLabel: false,
      }}
    >
      {TABS.map(tab => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ focused, color }) => {
              // AI is the centerpiece: render it as a raised accent button.
              if (tab.name === "ai") {
                return (
                  <View style={styles.aiTabWrap}>
                    <View style={[styles.aiTabBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
                      <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                    </View>
                    <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textTertiary }]}>{t(tab.labelKey)}</Text>
                  </View>
                );
              }
              return (
                <View style={styles.tabItem}>
                  <Ionicons name={focused ? tab.icon : (`${tab.icon}-outline` as IconName)} size={22} color={color} />
                  {tab.name === "pantau" && activeCount > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                      <Text style={styles.badgeText}>{activeCount > 9 ? "9+" : activeCount}</Text>
                    </View>
                  )}
                  <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textTertiary }]}>{t(tab.labelKey)}</Text>
                </View>
              );
            },
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: "center", justifyContent: "center", width: 60 },
  tabLabel: { fontSize: 10, fontFamily: "Outfit_600SemiBold", marginTop: 2 },
  aiTabWrap: { alignItems: "center", justifyContent: "center", width: 60 },
  aiTabBtn: {
    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
    marginTop: -18, marginBottom: 2,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  badge: { position: "absolute", top: -2, right: 8, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
});
