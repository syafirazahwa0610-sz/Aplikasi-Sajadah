import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, View } from "react-native";

type Props = { onSelesai: () => void };

const TINGGI_TANAH = 170;

export default function SplashSajadah({ onSelesai }: Props) {
  const isi = useRef(new Animated.Value(0)).current;   // logo dan teks muncul perlahan
  const semua = useRef(new Animated.Value(1)).current; // seluruh layar memudar di akhir

  useEffect(() => {
    Animated.timing(isi, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    const t = setTimeout(() => {
      Animated.timing(semua, { toValue: 0, duration: 450, useNativeDriver: true }).start(
        () => onSelesai()
      );
    }, 2200);

    return () => clearTimeout(t);
  }, []);

  const naik = isi.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  return (
    <Animated.View style={[s.layar, { opacity: semua }]}>
      <MaterialCommunityIcons
        name="moon-waning-crescent"
        size={64}
        color="#F2C879"
        style={s.bulan}
      />

      <Animated.View style={[s.tengah, { opacity: isi, transform: [{ translateY: naik }] }]}>
        <MaterialCommunityIcons name="mosque" size={96} color="#5A3A1E" />
        <Text style={s.nama}>SAJADAH</Text>
        <Text style={s.kepanjangan}>Sistem Arah Kiblat dan Jadwal Ibadah Harian</Text>
        <Text style={s.tagline}>Jadwal Sholat, Arah Kiblat di Genggaman Anda</Text>
      </Animated.View>

      {/* Siluet masjid di cakrawala */}
      <View style={s.cakrawala}>
        <MaterialCommunityIcons name="mosque" size={56} color="#C9A27A" />
        <MaterialCommunityIcons name="mosque" size={88} color="#B98A5E" />
        <MaterialCommunityIcons name="mosque" size={64} color="#C9A27A" />
        <MaterialCommunityIcons name="mosque" size={96} color="#B98A5E" />
        <MaterialCommunityIcons name="mosque" size={60} color="#C9A27A" />
      </View>

      <View style={s.tanah}>
        <ActivityIndicator color="#F3E3CF" size="large" />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
   layar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#F7EBDA",
    zIndex: 100,
  },
  bulan: { position: "absolute", top: 90, right: 40 },
  tengah: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: TINGGI_TANAH },
  nama: { fontSize: 40, fontWeight: "bold", color: "#3B2412", letterSpacing: 4, marginTop: 8 },
  kepanjangan: {
    fontSize: 14, color: "#5A3A1E", textAlign: "center",
    marginTop: 6, paddingHorizontal: 32, fontWeight: "600",
  },
  tagline: { fontSize: 13, color: "#8B7355", textAlign: "center", marginTop: 10, paddingHorizontal: 32 },
  cakrawala: {
    position: "absolute", left: 0, right: 0, bottom: TINGGI_TANAH,
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-end", paddingHorizontal: 8,
  },
  tanah: {
    position: "absolute", left: 0, right: 0, bottom: 0, height: TINGGI_TANAH,
    backgroundColor: "#8B5A2B", alignItems: "center", paddingTop: 44,
  },
});