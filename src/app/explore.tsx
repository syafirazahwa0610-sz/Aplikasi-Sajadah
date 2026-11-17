import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { cariKota, HasilKota } from "../api/geocoding";
import { daftarRiwayat, hapusRiwayat, hapusSemuaRiwayat, tambahRiwayat } from "../db/database";
import { zonaLabel } from "../utils/waktu";

export default function CariKota() {
  const router = useRouter();
  const [teks, setTeks] = useState("");
  const [hasil, setHasil] = useState<HasilKota[]>([]);
  const [riwayat, setRiwayat] = useState<HasilKota[]>([]);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);

  const muatRiwayat = useCallback(() => {
    daftarRiwayat().then(setRiwayat).catch(() => setRiwayat([]));
  }, []);

  // Muat ulang riwayat setiap layar ini dibuka
  useFocusEffect(useCallback(() => { muatRiwayat(); }, [muatRiwayat]));

  // Debounce 400 ms agar tidak memanggil API di setiap ketukan
  useEffect(() => {
    if (teks.trim().length < 3) {
      setHasil([]);
      setPesan(null);
      return;
    }
    let batal = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setPesan(null);
      try {
        const r = await cariKota(teks);
        if (batal) return;
        setHasil(r);
        if (r.length === 0) setPesan("Kota tidak ditemukan.");
      } catch (e: any) {
        if (batal) return;
        setHasil([]);
        setPesan(e?.message ?? "Pencarian gagal. Coba lagi.");
      } finally {
        if (!batal) setLoading(false);
      }
    }, 400);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [teks]);

  const pilih = async (k: HasilKota) => {
    try {
      await tambahRiwayat(k);
    } catch {}
    router.navigate({
      pathname: "/" as any,
      params: {
        t: String(Date.now()),
        id: k.id,
        nama: k.nama,
        lat: String(k.lat),
        lon: String(k.lon),
        tz: k.timezone ?? "",
      },
    });
  };

  const hapusSatu = async (id: string) => {
    await hapusRiwayat(id);
    muatRiwayat();
  };

  const konfirmasiHapusSemua = () =>
    Alert.alert("Hapus semua riwayat?", "Daftar pencarian terakhir akan dikosongkan.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => { await hapusSemuaRiwayat(); muatRiwayat(); },
      },
    ]);

  // Kolom kosong atau kurang dari 3 huruf: tampilkan riwayat
  const modeRiwayat = teks.trim().length < 3;
  const data = modeRiwayat ? riwayat : hasil;

  return (
    <View style={s.layar}>
      <TextInput
        style={s.input}
        placeholder="Masukkan nama kota..."
        value={teks}
        onChangeText={setTeks}
        autoCorrect={false}
        autoCapitalize="words"
      />
      {loading && <Text style={s.info}>Mencari...</Text>}
      {pesan && <Text style={s.info}>{pesan}</Text>}

      <FlatList
        data={data}
        keyExtractor={(k, i) => `${k.id}-${i}`}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          modeRiwayat && riwayat.length > 0
            ? () => (
                <View style={s.kepala}>
                  <Text style={s.kepalaTeks}>Pencarian terakhir</Text>
                  <Pressable onPress={konfirmasiHapusSemua} hitSlop={10}>
                    <Text style={s.hapusSemua}>Hapus Semua</Text>
                  </Pressable>
                </View>
              )
            : undefined
        }
        ListEmptyComponent={
          modeRiwayat
            ? () => <Text style={s.info}>Ketik minimal 3 huruf untuk mencari kota.</Text>
            : undefined
        }
        renderItem={({ item }) => (
          <Pressable style={s.baris} onPress={() => pilih(item)}>
            <View style={{ flex: 1 }}>
              <Text style={s.nama}>{item.nama}</Text>
              <Text style={s.wilayah}>
                {item.wilayah}
                {item.wilayah && item.timezone ? "  •  " : ""}
                {item.timezone ? zonaLabel(item.timezone) : ""}
              </Text>
            </View>
            {modeRiwayat ? (
              <Pressable onPress={() => hapusSatu(item.id)} hitSlop={12}>
                <Text style={s.hapus}>✕</Text>
              </Pressable>
            ) : (
              <Text style={s.panah}>›</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: "#FBF5EC", padding: 20, paddingTop: 16 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14,
    fontSize: 16, borderWidth: 1, borderColor: "#E6D5BF", marginBottom: 8,
  },
  info: { color: "#8B5A2B", marginVertical: 8 },
  kepala: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8, marginBottom: 4 },
  kepalaTeks: { fontSize: 14, fontWeight: "600", color: "#8B7355" },
  hapusSemua: { fontSize: 14, color: "#B00020" },
  baris: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#D9C7AE",
  },
  nama: { fontSize: 17, color: "#3B2412", fontWeight: "600" },
  wilayah: { fontSize: 13, color: "#8B7355", marginTop: 2 },
  panah: { fontSize: 24, color: "#8B5A2B" },
  hapus: { fontSize: 18, color: "#A08A6C", paddingLeft: 12 },
});