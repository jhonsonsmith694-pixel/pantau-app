import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "../../src/hooks/useApp";
import { useTheme } from "../../src/hooks";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; label: string; icon: IconName }[] = [
  { name: "index", label: "Beranda", icon: "home" },
  { name: "pantau", label: "Pantau", icon: "eye" },
  { name: "catatan", label: "Catatan", icon: "document-text" },
  { name: "profil", label: "Profil", icon: "person" },
];

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { monitors } = useApp();
  const activeCount = monitors.filter(m => m.active).length;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 0.5,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 4,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
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
            tabBarIcon: ({ focused, color, size }) => (
              <View style={styles.tabItem}>
                <Ionicons name={focused ? tab.icon : (`${tab.icon}-outline` as IconName)} size={22} color={color} />
                {tab.name === "pantau" && activeCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.badgeText}>{activeCount > 9 ? "9+" : activeCount}</Text>
                  </View>
                )}
                <Text style={[styles.tabLabel, { color: focused ? colors.primary : colors.textTertiary }]}>{tab.label}</Text>
              </View>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: "center", justifyContent: "center", width: 60 },
  tabLabel: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  badge: { position: "absolute", top: -2, right: 8, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
});
