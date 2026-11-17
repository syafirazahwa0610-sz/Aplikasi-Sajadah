import Constants from "expo-constants";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const EMAIL = "syafira.zahwa24031@mhs.uin.gusdur.ac.id"; // ganti dengan email Anda

export default function Tentang() {
  const versi = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView style={s.layar} contentContainerStyle={{ padding: 20, paddingTop: 60, alignItems: "center" }}>
      <Text style={s.nama}>SAJADAH</Text>
      <Text style={s.versi}>Versi {versi}</Text>
      <Text style={s.deskripsi}>
        Aplikasi untuk melihat jadwal sholat, mengetahui arah kiblat, dan menyimpan kota favorit dengan mudah.
      </Text>

      <View style={s.kartu}>
        <Text style={s.judulKartu}>Sumber Data</Text>
        <Pressable onPress={() => Linking.openURL("https://aladhan.com/prayer-times-api")}>
          <Text style={s.tautan}>• Aladhan API – Jadwal Sholat</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL("https://open-meteo.com/")}>
          <Text style={s.tautan}>• Open-Meteo – Geocoding Kota (CC BY 4.0)</Text>
        </Pressable>
        <Text style={s.catatan}>Data lokasi oleh Open-Meteo.com</Text>
        <Text style={s.catatan}>
          Arah kiblat dihitung langsung di perangkat. Penggunaan kedua layanan mengikuti ketentuan masing-masing penyedia.
        </Text>
      </View>

      <Pressable style={s.tombol} onPress={() => Linking.openURL(`mailto:${EMAIL}`)}>
        <Text style={s.tombolTeks}>✉  Kontak Kami</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: "#FBF5EC" },
  nama: { fontSize: 28, fontWeight: "bold", color: "#8B5A2B" },
  versi: { color: "#8B7355", marginTop: 4 },
  deskripsi: { textAlign: "center", color: "#3B2412", marginVertical: 16, lineHeight: 22 },
  kartu: { alignSelf: "stretch", backgroundColor: "#fff", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#EFE2CF" },
  judulKartu: { fontWeight: "bold", color: "#3B2412", marginBottom: 8 },
  tautan: { color: "#8B5A2B", paddingVertical: 4, fontSize: 15 },
  catatan: { color: "#6B5239", fontSize: 13, marginTop: 8, lineHeight: 18 },
  tombol: { alignSelf: "stretch", marginTop: 20, backgroundColor: "#5A3A1E", padding: 14, borderRadius: 24, alignItems: "center" },
  tombolTeks: { color: "#fff", fontWeight: "600" },
});