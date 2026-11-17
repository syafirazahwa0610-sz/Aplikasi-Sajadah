import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import {
  InfoCache, lokasiOtomatis, simpanLokasiOtomatis,
} from "../../db/database";
import {
  aktifkanNotifikasi, matikanNotifikasi,
  NotifTerjadwal, notifBerikutnya, ringkasanNotifikasi, statusNotifikasi,
} from "../../utils/notifikasi";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const HARI_SINGKAT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function formatTanggalID(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${BULAN[m - 1]} ${y}`;
}

function hariIniISO() {
  const n = new Date();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${n.getFullYear()}-${mm}-${dd}`;
}

const dua = (n: number) => String(n).padStart(2, "0");

// Jam dan hari menurut perangkat (bukan menurut kota)
function labelPerangkat(ms: number) {
  const d = new Date(ms);
  const sekarang = new Date();
  const besok = new Date();
  besok.setDate(sekarang.getDate() + 1);
  const sama = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const hari = sama(d, sekarang)
    ? "Hari ini"
    : sama(d, besok)
    ? "Besok"
    : `${HARI_SINGKAT[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  return `${hari}, ${dua(d.getHours())}:${dua(d.getMinutes())}`;
}

export default function Pengaturan() {
  // const [daftar, setDaftar] = useState<InfoCache[] | null>(null);
  const [otomatis, setOtomatis] = useState<boolean | null>(null);
  const [notif, setNotif] = useState<boolean | null>(null);
  const [izinDicabut, setIzinDicabut] = useState(false);
  const [jumlahNotif, setJumlahNotif] = useState(0);
  const [berikutnya, setBerikutnya] = useState<NotifTerjadwal[]>([]);
  const [pesanNotif, setPesanNotif] = useState<string | null>(null);

  const muatNotif = useCallback(() => {
    statusNotifikasi()
      .then((s) => { setNotif(s.aktif); setIzinDicabut(s.izinDicabut); })
      .catch(() => setNotif(false));
    ringkasanNotifikasi().then(setJumlahNotif).catch(() => setJumlahNotif(0));
    notifBerikutnya(3).then(setBerikutnya).catch(() => setBerikutnya([]));
  }, []);

  // Muat ulang tiap tab Pengaturan dibuka
  useFocusEffect(
    useCallback(() => {
      // infoCacheJadwal(hariIniISO()).then(setDaftar).catch(() => setDaftar([]));
      lokasiOtomatis().then(setOtomatis).catch(() => setOtomatis(true));
      muatNotif();
    }, [muatNotif])
  );

  const ubahOtomatis = async (nilai: boolean) => {
    setOtomatis(nilai);
    await simpanLokasiOtomatis(nilai);
  };

  const ubahNotif = async (nilai: boolean) => {
    setPesanNotif(null);
    if (nilai) {
      const r = await aktifkanNotifikasi();
      setPesanNotif(
        r.ok
          ? r.pesan ?? `${r.jumlah} notifikasi dijadwalkan untuk 7 hari ke depan.`
          : r.pesan ?? null
      );
    } else {
      await matikanNotifikasi();
    }
    muatNotif();
  };

  const hariIni = hariIniISO();

  return (
    <ScrollView style={s.layar} contentContainerStyle={{ padding: 20, paddingTop: 60 }}>
      <Text style={s.judul}>Pengaturan</Text>

      <View style={s.kartu}>
        <View style={s.barisSwitch}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.nilai}>Notifikasi waktu sholat</Text>
            <Text style={s.catatan}>
              Pengingat saat masuk waktu Subuh, Dzuhur, Ashar, Maghrib, dan Isya untuk kota yang
              aktif di Beranda. Jadwal 7 hari ke depan diperbarui setiap aplikasi dibuka.
            </Text>
          </View>
          <Switch
            value={notif ?? false}
            onValueChange={ubahNotif}
            disabled={notif === null}
            trackColor={{ true: "#8B5A2B" }}
          />
        </View>

        {izinDicabut && (
          <Text style={s.kedaluwarsa}>
            Izin notifikasi dicabut di pengaturan HP, jadi pengingat tidak dikirim. Aktifkan lagi
            izin Notifikasi untuk aplikasi ini, lalu nyalakan toggle di atas.
          </Text>
        )}

        {notif && (
          <>
            <Text style={s.catatan}>Terjadwal: {jumlahNotif} notifikasi.</Text>
            {berikutnya.length > 0 && (
              <View style={s.baris}>
                <Text style={s.label}>Berikutnya</Text>
                {berikutnya.map((n) => (
                  <View key={n.ms} style={{ marginTop: 8 }}>
                    <Text style={s.kota}>
                      {n.nama} • {n.jam}{n.zona ? ` ${n.zona}` : ""}
                    </Text>
                    <Text style={s.catatan}>
                      {n.kota} — di HP Anda: {labelPerangkat(n.ms)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {pesanNotif && <Text style={s.kedaluwarsa}>{pesanNotif}</Text>}
      </View>

      <View style={s.kartu}>
        <View style={s.barisSwitch}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={s.nilai}>Lokasi otomatis</Text>
            <Text style={s.catatan}>
              Aktif: Beranda memakai GPS setiap aplikasi dibuka. Nonaktif: Beranda menampilkan
              kota terakhir yang Anda pilih. Berlaku saat aplikasi dibuka berikutnya.
            </Text>
          </View>
          <Switch
            value={otomatis ?? true}
            onValueChange={ubahOtomatis}
            disabled={otomatis === null}
            trackColor={{ true: "#8B5A2B" }}
          />
        </View>
      </View>

      <View style={s.kartu}>
        <Text style={s.label}>Metode perhitungan</Text>
        <Text style={s.nilai}>Kemenag RI</Text>
        <Text style={s.catatan}>Sudut Subuh 20° dan Isya 18°. Metode lain belum tersedia.</Text>
      </View>

      <View style={s.kartu}>
        <Text style={s.label}>Kalender Hijriah</Text>
        <Text style={s.nilai}>Perkiraan hitungan</Text>
        <Text style={s.catatan}>
          Tanggal Hijriah berasal dari data Aladhan dan dapat berbeda satu hari dari ketetapan Kemenag.
        </Text>
      </View>

      <View style={s.kartu}>
        <Text style={s.label}>Zona waktu</Text>
        <Text style={s.nilai}>Mengikuti kota yang dipilih</Text>
        <Text style={s.catatan}>WIB, WITA, atau WIT tampil di samping nama kota di Beranda.</Text>
      </View>

      {/* <View style={s.kartu}>
        <Text style={s.label}>Data tersimpan (offline)</Text>

        {daftar === null && <Text style={s.catatan}>Memuat...</Text>}

        {daftar !== null && daftar.length === 0 && (
          <Text style={s.catatan}>
            Belum ada jadwal tersimpan. Buka sebuah kota saat terhubung ke internet.
          </Text>
        )}

        {daftar?.map((k) => {
          const kedaluwarsa = k.sampai < hariIni;
          return (
            <View key={k.id} style={s.baris}>
              <Text style={s.kota}>{k.nama}</Text>
              {kedaluwarsa ? (
                <Text style={s.kedaluwarsa}>
                  Sudah kedaluwarsa sejak {formatTanggalID(k.sampai)}. Hubungkan internet untuk memperbarui.
                </Text>
              ) : (
                <Text style={s.catatan}>
                  Tersimpan sampai {formatTanggalID(k.sampai)} ({k.jumlahHari} hari ke depan)
                </Text>
              )}
            </View>
          );
        })}
      </View> */}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  layar: { flex: 1, backgroundColor: "#FBF5EC" },
  judul: { fontSize: 22, fontWeight: "bold", color: "#5A3A1E", marginBottom: 16 },
  kartu: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#EFE2CF" },
  barisSwitch: { flexDirection: "row", alignItems: "center" },
  label: { fontSize: 13, color: "#8B7355" },
  nilai: { fontSize: 18, fontWeight: "600", color: "#3B2412", marginTop: 4 },
  catatan: { fontSize: 14, color: "#6B5239", marginTop: 6, lineHeight: 20 },
  baris: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#E6D5BF" },
  kota: { fontSize: 16, fontWeight: "600", color: "#3B2412" },
  kedaluwarsa: { fontSize: 14, color: "#B36B00", marginTop: 8, lineHeight: 20 },
});