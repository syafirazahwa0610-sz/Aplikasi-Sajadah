import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Hijri, JadwalHarian } from "../../api/aladhan";
import StatusKosong from "../../components/StatusKosong";
import {
  ambilKotaTerakhir, apakahFavorit, hapusFavorit, idKota, Kota,
  lokasiOtomatis, simpanKotaTerakhir, tambahFavorit,
} from "../../db/database";
import { jadwalHariIni, subuhBesok } from "../../db/jadwalRepo";
import { formatHijri, formatMasehiISO } from "../../utils/hijriah";
import { ambilLokasiSaya } from "../../utils/lokasi";
import { jadwalkanNotifikasi } from "../../utils/notifikasi";
import { cariBerikutnya, formatHMS, tanggalDiKota, zonaLabel } from "../../utils/waktu";

const DEFAULT: Kota = {
  id: idKota(-6.26, 106.81), nama: "Jakarta Selatan", lat: -6.26, lon: 106.81,
};

export default function Beranda() {
  const router = useRouter();
  const [kota, setKota] = useState<Kota>(DEFAULT);
  const [jadwal, setJadwal] = useState<JadwalHarian | null>(null);
  const [hijri, setHijri] = useState<Hijri | null>(null);
  const [tanggal, setTanggal] = useState<string | null>(null); // tanggal jadwal (menurut kota)
  const [dariCache, setDariCache] = useState(false);
  const [timezone, setTimezone] = useState<string | undefined>();
  const [galat, setGalat] = useState<string | null>(null);     // gagal memuat jadwal
  const [infoGps, setInfoGps] = useState<string | null>(null); // catatan soal lokasi
  const [memuat, setMemuat] = useState(false);
  const [menarik, setMenarik] = useState(false);               // pull-to-refresh
  const [mencariGps, setMencariGps] = useState(false);
  const [fav, setFav] = useState(false);
  const [subuhEsok, setSubuhEsok] = useState<string | undefined>();
  const [, setTick] = useState(0);

  // true jika pengguna memilih kota sendiri (Cari/Favorit): GPS awal tidak boleh menimpa
  const pilihManual = useRef(false);
  // Nomor permintaan jadwal terakhir; hasil dari permintaan lama diabaikan
  const idPermintaan = useRef(0);
  // Tanggal (menurut kota) dari jadwal yang sedang tampil; dipakai mendeteksi pergantian hari
  const tanggalDicoba = useRef<string | null>(null);

  const params = useLocalSearchParams<{
    t?: string; id?: string; nama?: string; lat?: string; lon?: string; tz?: string;
  }>();

  // Status favorit: cek saat kota berganti dan saat layar kembali difokuskan
  useFocusEffect(
    useCallback(() => {
      apakahFavorit(kota.id).then(setFav);
    }, [kota.id])
  );

  const toggleFavorit = async () => {
    if (fav) {
      await hapusFavorit(kota.id);
      setFav(false);
    } else {
      await tambahFavorit({ ...kota, timezone: timezone ?? kota.timezone });
      setFav(true);
    }
  };

  // Kota dipilih dari layar Cari Kota atau Favorit
  useEffect(() => {
    if (params.id && params.lat && params.lon) {
      pilihManual.current = true;
      setInfoGps(null);
      const k: Kota = {
        id: params.id,
        nama: params.nama ?? "Kota",
        lat: Number(params.lat),
        lon: Number(params.lon),
        timezone: params.tz || undefined,
      };
      setKota(k);
      simpanKotaTerakhir(k).catch(() => {});
    }
  }, [params.id, params.t]);

  // 1) Saat aplikasi dibuka: GPS jika "Lokasi otomatis" aktif, jika tidak pakai kota terakhir
  useEffect(() => {
    (async () => {
      let otomatis = true;
      try {
        otomatis = await lokasiOtomatis();
      } catch {}

      if (!otomatis) {
        const terakhir = await ambilKotaTerakhir().catch(() => null);
        if (terakhir && !pilihManual.current) setKota(terakhir);
        return;
      }

      const r = await ambilLokasiSaya();
      if (pilihManual.current) return; // pengguna sudah memilih kota
      if (r.kota) setKota(r.kota);
      else if (r.galat) setInfoGps(`${r.galat} Menampilkan Jakarta Selatan.`);
    })();
  }, []);

  // Tombol "Pakai Lokasi Saya": ambil GPS satu kali, kapan pun
  const pakaiLokasiSaya = async () => {
    setMencariGps(true);
    setInfoGps(null);
    const r = await ambilLokasiSaya();
    setMencariGps(false);
    if (r.kota) {
      pilihManual.current = false;
      setKota(r.kota);
      simpanKotaTerakhir(r.kota).catch(() => {});
    } else if (r.galat) {
      setInfoGps(r.galat);
    }
  };

  // 2) Jadwal untuk kota yang aktif
  const muat = useCallback(async () => {
    const saya = ++idPermintaan.current;
    tanggalDicoba.current = null; // diisi lagi setelah berhasil
    setMemuat(true);
    setGalat(null);
    try {
      const r = await jadwalHariIni(kota);
      if (saya !== idPermintaan.current) return; // permintaan basi, abaikan
      setJadwal(r.jadwal);
      setHijri(r.hijri);
      setTanggal(r.tanggal);
      tanggalDicoba.current = r.tanggal;
      setDariCache(r.dariCache);
      // Zona waktu dari pencarian kota diutamakan, API hanya cadangan (untuk GPS)
      const tz = kota.timezone ?? r.timezone;
      setTimezone(tz);
      subuhBesok(kota.id, tz).then((v) => {
        if (saya === idPermintaan.current) setSubuhEsok(v);
      });
      // Jadwalkan notifikasi untuk kota ini (hanya jika fitur diaktifkan di Pengaturan)
      jadwalkanNotifikasi(kota, tz).catch(() => {});
    } catch (e: any) {
      if (saya !== idPermintaan.current) return; // permintaan basi, abaikan
      setJadwal(null);
      setHijri(null);
      setTanggal(null);
      setDariCache(false);
      setTimezone(kota.timezone);
      setGalat(e?.message ?? "Gagal memuat jadwal.");
    } finally {
      if (saya === idPermintaan.current) setMemuat(false);
    }
  }, [kota]);

  useEffect(() => {
    setJadwal(null);
    setHijri(null);
    setTanggal(null);
    setTimezone(kota.timezone); // jangan pakai zona waktu kota sebelumnya
    muat();
  }, [muat]);

  // Tarik layar ke bawah untuk memuat ulang
  const onTarik = useCallback(async () => {
    setMenarik(true);
    await muat();
    setMenarik(false);
  }, [muat]);

  // 3) Hitung mundur: render ulang tiap detik, dan muat ulang saat hari berganti di kota ini
  useEffect(() => {
    const t = setInterval(() => {
      setTick((x) => x + 1);
      const sekarang = tanggalDiKota(timezone ?? kota.timezone);
      if (tanggalDicoba.current && sekarang !== tanggalDicoba.current) {
        tanggalDicoba.current = sekarang;
        muat();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [timezone, kota.timezone, muat]);

  const berikutnya = jadwal ? cariBerikutnya(jadwal, timezone, subuhEsok) : null;

  return (
    <ScrollView
      style={s.layar}
      contentContainerStyle={{ padding: 20, paddingTop: 60, paddingBottom: 40 }}
      alwaysBounceVertical
      refreshControl={
        <RefreshControl
          refreshing={menarik}
          onRefresh={onTarik}
          tintColor="#8B5A2B"
          colors={["#8B5A2B"]}
        />
      }
    >
      <Text style={s.kota}>
        {kota.nama} {timezone ? `(${zonaLabel(timezone)})` : ""}
      </Text>
      <Text style={s.tanggal}>
        {formatMasehiISO(tanggal ?? tanggalDiKota(timezone ?? kota.timezone))}
        {hijri ? `  •  ${formatHijri(hijri)}` : ""}
      </Text>

      {berikutnya && (
        <View style={s.kartu}>
          <Text style={s.kartuLabel}>Waktu Berikutnya</Text>
          <Text style={s.kartuNama}>{berikutnya.nama}</Text>
          <Text style={s.kartuHitung}>{formatHMS(berikutnya.sisaDetik)}</Text>
        </View>
      )}

      {infoGps && <Text style={s.cache}>{infoGps}</Text>}
      {dariCache && <Text style={s.cache}>Data tersimpan (offline)</Text>}
      {memuat && !menarik && !jadwal && <Text style={s.info}>Memuat jadwal...</Text>}

      {!jadwal && !memuat && galat && (
        <StatusKosong
          judul="Jadwal Belum Bisa Dimuat"
          isi={galat}
          onCobaLagi={muat}
        />
      )}

      {jadwal &&
        Object.entries(jadwal).map(([nama, jam]) => (
          <View key={nama} style={[s.baris, berikutnya?.nama === nama && s.barisAktif]}>
            <Text style={s.barisNama}>{nama}</Text>
            <Text style={s.barisJam}>{jam}</Text>
          </View>
        ))}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
        <Pressable style={s.tombolKecil} onPress={() => router.push("/kiblat")}>
          <Text style={s.tombolKecilTeks}>🧭 Arah Kiblat</Text>
        </Pressable>
        <Pressable style={s.tombolKecil} onPress={() => router.push("/explore")}>
          <Text style={s.tombolKecilTeks}>🔍 Cari Kota</Text>
        </Pressable>
      </View>

      <Pressable style={s.tombolLebar} onPress={pakaiLokasiSaya} disabled={mencariGps}>
        <Text style={s.tombolKecilTeks}>
          {mencariGps ? "Mencari lokasi..." : "📍 Pakai Lokasi Saya"}
        </Text>
      </Pressable>

      <Pressable
        style={[s.tombol, { backgroundColor: fav ? "#B8860B" : "#8B5A2B" }]}
        onPress={toggleFavorit}
      >
        <Text style={s.tombolTeks}>{fav ? "★ Hapus dari Favorit" : "☆ Tambah Favorit"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: "#FBF5EC" },
  kota: { fontSize: 18, fontWeight: "600", color: "#5A3A1E", marginBottom: 4 },
  tanggal: { fontSize: 14, color: "#8B7355", marginBottom: 12 },
  kartu: { backgroundColor: "#8B5A2B", borderRadius: 16, padding: 20, marginBottom: 16 },
  kartuLabel: { color: "#F3E3CF", fontSize: 14 },
  kartuNama: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  kartuHitung: { color: "#fff", fontSize: 32, fontWeight: "bold" },
  cache: { color: "#D98A00", marginBottom: 8 },
  info: { color: "#8B7355", marginBottom: 8 },
  baris: { flexDirection: "row", justifyContent: "space-between", padding: 14, borderRadius: 12 },
  barisAktif: { backgroundColor: "#FBE3B8" },
  barisNama: { fontSize: 17, color: "#3B2412" },
  barisJam: { fontSize: 17, color: "#3B2412", fontWeight: "600" },
  tombol: { marginTop: 20, backgroundColor: "#5A3A1E", padding: 14, borderRadius: 12, alignItems: "center" },
  tombolTeks: { color: "#fff", fontWeight: "600" },
  tombolKecil: { flex: 1, backgroundColor: "#F3E3CF", padding: 14, borderRadius: 12, alignItems: "center" },
  tombolLebar: { marginTop: 10, backgroundColor: "#F3E3CF", padding: 14, borderRadius: 12, alignItems: "center" },
  tombolKecilTeks: { color: "#5A3A1E", fontWeight: "600" },
});