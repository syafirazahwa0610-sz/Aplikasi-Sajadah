import { Stack } from "expo-router";
import { useState } from "react";
import SplashSajadah from "../components/SplashSajadah";
import { aturPenangan } from "../utils/notifikasi";

aturPenangan();

export default function RootLayout() {
  const [splashSelesai, setSplashSelesai] = useState(false);

  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#FBF5EC" },
          headerTintColor: "#5A3A1E",
          headerTitleStyle: { fontWeight: "bold" },
          contentStyle: { backgroundColor: "#FBF5EC" },
          headerBackTitle: "Kembali",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="kiblat" options={{ title: "Arah Kiblat" }} />
        <Stack.Screen name="explore" options={{ title: "Cari Kota" }} />
      </Stack>

      {!splashSelesai && <SplashSajadah onSelesai={() => setSplashSelesai(true)} />}
    </>
  );
}