import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

type NamaIkon = React.ComponentProps<typeof Ionicons>["name"];

const ikon =
  (nama: NamaIkon) =>
  ({ color, size }: { color: any; size: number }) =>
    <Ionicons name={nama} size={size} color={color ?? undefined} />;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#8B5A2B",
        tabBarInactiveTintColor: "#A08A6C",
        tabBarStyle: { backgroundColor: "#FBF5EC", borderTopColor: "#E6D5BF" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Beranda", tabBarIcon: ikon("home") }} />
      <Tabs.Screen name="favorit" options={{ title: "Favorit", tabBarIcon: ikon("star") }} />
      <Tabs.Screen name="pengaturan" options={{ title: "Pengaturan", tabBarIcon: ikon("settings") }} />
      <Tabs.Screen name="tentang" options={{ title: "Tentang", tabBarIcon: ikon("information-circle") }} />
    </Tabs>
  );
}