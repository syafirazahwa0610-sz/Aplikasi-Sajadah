import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { hitungKiblat } from "../utils/kiblat";

// Cadangan jika GPS tidak tersedia: Jakarta Selatan
const DEFAULT = { lat: -6.26, lon: 106.81, nama: "Jakarta Selatan" };

export default function Kiblat() {
  const [lokasi, setLokasi] = useState(DEFAULT);
  const [heading, setHeading] = useState<number | null>(null);
  const [akurasi, setAkurasi] = useState<number>(3); // 0 = buruk, 3 = baik
  const [sensorAda, setSensorAda] = useState(true);
  const [pesan, setPesan] = useState<string | null>(null);

  useEffect(() => {
    let langganan: Location.LocationSubscription | null = null;
    let batal = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPesan("Izin lokasi ditolak. Arah dihitung dari Jakarta Selatan.");
        setSensorAda(false);
        return;
      }

      // Posisi pengguna untuk hitungan kiblat
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!batal) {
          setLokasi({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            nama: "Lokasi Anda",
          });
        }
      } catch {
        if (!batal) setPesan("GPS tidak tersedia. Arah dihitung dari Jakarta Selatan.");
      }

      // Arah hadap perangkat (kompas)
      try {
        const sub = await Location.watchHeadingAsync((h) => {
          const nilai = h.trueHeading >= 0 ? h.trueHeading : h.magHeading;
          setHeading(nilai);
          setAkurasi(h.accuracy);
        });
        if (batal) sub.remove();
        else langganan = sub;
      } catch {
        if (!batal) setSensorAda(false);
      }
    })();

    return () => {
      batal = true;
      langganan?.remove();
    };
  }, []);

  const derajatKiblat = hitungKiblat(lokasi.lat, lokasi.lon);

  // Putaran lingkaran kompas dan panah kiblat
  const putarKompas = heading !== null ? -heading : 0;
  const putarKiblat = derajatKiblat - (heading ?? 0);

  // Selisih ke kiblat dalam rentang -180..180; ≤ 5° dianggap sudah menghadap
  const selisih = ((derajatKiblat - (heading ?? 0) + 540) % 360) - 180;
  const menghadap = heading !== null && Math.abs(selisih) <= 5;

  return (
    <View style={s.layar}>
      <View style={s.wadah}>
        {/* Lingkaran kompas: N selalu menunjuk utara sebenarnya */}
        <View style={[s.lingkaran, { transform: [{ rotate: `${putarKompas}deg` }] }]}>
          <Text style={[s.mata, s.utara]}>N</Text>
          <Text style={[s.mata, s.timur]}>E</Text>
          <Text style={[s.mata, s.selatan]}>S</Text>
          <Text style={[s.mata, s.barat]}>W</Text>
        </View>

        {/* Panah kiblat */}
        <View style={[s.panahWadah, { transform: [{ rotate: `${putarKiblat}deg` }] }]}>
          <Text style={[s.panah, menghadap && s.panahAktif]}>▲</Text>
          <Text style={s.kaabah}>🕋</Text>
        </View>
      </View>

      <Text style={s.derajat}>{derajatKiblat.toFixed(1)}°</Text>
      <Text style={s.label}>Arah Kiblat dari {lokasi.nama}</Text>

      {menghadap && <Text style={s.sukses}>Anda sudah menghadap kiblat</Text>}
      {!sensorAda && (
        <Text style={s.peringatan}>
          Sensor kompas tidak tersedia. Gunakan angka derajat di atas dengan
          kompas lain (0° = utara, searah jarum jam).
        </Text>
      )}
      {sensorAda && akurasi <= 1 && (
        <Text style={s.peringatan}>
          Akurasi kompas rendah. Gerakkan HP membentuk angka 8 untuk kalibrasi.
        </Text>
      )}
      {pesan && <Text style={s.peringatan}>{pesan}</Text>}
      <Text style={s.catatan}>Pastikan perangkat Anda memiliki kompas yang akurat.</Text>
    </View>
  );
}

const UKURAN = 260;
const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: "#FBF5EC", alignItems: "center", padding: 20, paddingTop: 32 },
  wadah: { width: UKURAN, height: UKURAN, alignItems: "center", justifyContent: "center" },
  lingkaran: {
    position: "absolute", width: UKURAN, height: UKURAN, borderRadius: UKURAN / 2,
    borderWidth: 3, borderColor: "#E6C98A", backgroundColor: "#FFF9EE",
  },
  mata: { position: "absolute", fontWeight: "bold", color: "#5A3A1E", fontSize: 18 },
  utara: { top: 8, alignSelf: "center", color: "#B00020" },
  selatan: { bottom: 8, alignSelf: "center" },
  timur: { right: 12, top: UKURAN / 2 - 12 },
  barat: { left: 12, top: UKURAN / 2 - 12 },
  panahWadah: { position: "absolute", width: UKURAN, height: UKURAN, alignItems: "center" },
  panah: { fontSize: 34, color: "#8B5A2B", marginTop: 28 },
  panahAktif: { color: "#2E8B57" },
  kaabah: { fontSize: 36, marginTop: 4 },
  derajat: { fontSize: 48, fontWeight: "bold", color: "#3B2412", marginTop: 28 },
  label: { color: "#8B7355", marginTop: 4 },
  sukses: { color: "#2E8B57", fontWeight: "600", marginTop: 12 },
  peringatan: { color: "#B36B00", marginTop: 12, textAlign: "center", paddingHorizontal: 12 },
  catatan: { color: "#A08A6C", fontSize: 12, marginTop: 20 },
});