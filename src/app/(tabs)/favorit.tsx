import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { JadwalHarian } from "../../api/aladhan";
import { daftarFavorit, hapusFavorit, hapusSemuaFavorit, Kota } from "../../db/database";
import { bacaCache, jadwalHariIni } from "../../db/jadwalRepo";
import { cariBerikutnya, tanggalDiKota, zonaLabel } from "../../utils/waktu";

type Item = Kota & { jadwal: JadwalHarian | null };

export default function Favorit() {
  const router = useRouter();
  const [data, setData] = useState<Item[]>([]);
  const [, setTick] = useState(0);

  const muat = useCallback(async () => {
    const daftar = await daftarFavorit();
    const hasil: Item[] = [];
    for (const k of daftar) {
        let j = await bacaCache(k.id, tanggalDiKota(k.timezone));
      if (!j) {
        // Belum ada cache: coba ambil sekali (diam-diam gagal jika offline)
        try { j = (await jadwalHariIni(k)).jadwal; } catch {}
      }
      hasil.push({ ...k, jadwal: j });
    }
    setData(hasil);
  }, []);

  useFocusEffect(useCallback(() => { muat(); }, [muat]));

  // Perbarui "waktu berikutnya" tiap 30 detik
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const buka = (k: Kota) =>
   router.navigate({
    pathname: "/" as any,
    params: {
      id: k.id, nama: k.nama, lat: String(k.lat),
      lon: String(k.lon), tz: k.timezone ?? "",
    },
  });

  const hapusSatu = async (id: string) => {
    await hapusFavorit(id);
    muat();
  };

  const konfirmasiHapusSemua = () =>
    Alert.alert("Hapus semua favorit?", "Semua kota favorit akan dihapus.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => { await hapusSemuaFavorit(); muat(); },
      },
    ]);

  return (
    <View style={s.layar}>
      <Text style={s.judul}>Favorit</Text>

      <FlatList
        data={data}
        keyExtractor={(k) => k.id}
        ListEmptyComponent={
          <Text style={s.kosong}>
            Belum ada kota favorit. Buka sebuah kota di Beranda lalu tekan "Tambah Favorit".
          </Text>
        }
        renderItem={({ item }) => {
          const b = item.jadwal ? cariBerikutnya(item.jadwal, item.timezone) : null;
          return (
            <Pressable style={s.baris} onPress={() => buka(item)}>
              <View style={{ flex: 1 }}>
                <Text style={s.nama}>
                  {item.nama}
                  {item.timezone ? `  (${zonaLabel(item.timezone)})` : ""}
                </Text>
                <Text style={s.berikutnya}>
                  {b && item.jadwal
                    ? `Berikutnya: ${b.nama} ${item.jadwal[b.nama]}`
                    : "Jadwal belum tersimpan"}
                </Text>
              </View>
              <Pressable onPress={() => hapusSatu(item.id)} hitSlop={12}>
                <Text style={s.bintang}>★</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />

      {data.length > 0 && (
        <Pressable style={s.tombol} onPress={konfirmasiHapusSemua}>
          <Text style={s.tombolTeks}>Hapus Semua</Text>
        </Pressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: "#FBF5EC", padding: 20, paddingTop: 60 },
  judul: { fontSize: 22, fontWeight: "bold", color: "#5A3A1E", marginBottom: 12 },
  kosong: { color: "#8B7355", marginTop: 24, lineHeight: 22 },
  baris: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D9C7AE",
  },
  nama: { fontSize: 17, color: "#3B2412", fontWeight: "600" },
  berikutnya: { fontSize: 14, color: "#8B5A2B", marginTop: 3 },
  bintang: { fontSize: 26, color: "#F2A400", paddingLeft: 12 },
  tombol: { backgroundColor: "#5A3A1E", padding: 14, borderRadius: 12, alignItems: "center", marginBottom: 20 },
  tombolTeks: { color: "#fff", fontWeight: "600" },
});