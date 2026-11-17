import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { ambilPengaturan, Kota, simpanPengaturan } from "../db/database";
import { jadwalBeberapaHari } from "../db/jadwalRepo";
import { tanggalDiKota, waktuKeUtc, zonaLabel } from "./waktu";


const HARI_DEPAN = 7;
const WAKTU = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"] as const;
const KANAL = "adzan";

export type NotifTerjadwal = {
  nama: string;     // Subuh, Dzuhur, ...
  jam: string;      // jam lokal kota, misalnya "15:03"
  zona?: string;    // WIB / WITA / WIT
  kota: string;
  ms: number;       // waktu tepatnya (milidetik)
};

// Antrian: penjadwalan berjalan satu per satu agar hasilnya tidak bercampur
let antrian: Promise<unknown> = Promise.resolve();
function urut<T>(fn: () => Promise<T>): Promise<T> {
  const hasil = antrian.then(fn);
  antrian = hasil.catch(() => {});
  return hasil;
}

// Tampilkan notifikasi juga saat aplikasi sedang terbuka
export function aturPenangan() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function siapkanKanal() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(KANAL, {
    name: "Waktu sholat",
    importance: Notifications.AndroidImportance.HIGH,
  });
}

// Pilihan pengguna (toggle). Belum tentu izinnya masih ada.
async function notifDiminta(): Promise<boolean> {
  return (await ambilPengaturan("notif_adzan")) === "1";
}

export type StatusNotif = { aktif: boolean; izinDicabut: boolean };

// Status sebenarnya: toggle menyala DAN izin sistem masih ada
export async function statusNotifikasi(): Promise<StatusNotif> {
  if (!(await notifDiminta())) return { aktif: false, izinDicabut: false };
  const izin = await Notifications.getPermissionsAsync();
  return { aktif: izin.granted, izinDicabut: !izin.granted };
}

export async function kotaNotif(): Promise<Kota | null> {
  const s = await ambilPengaturan("kota_notif");
  if (!s) return null;
  try {
    return JSON.parse(s) as Kota;
  } catch {
    return null;
  }
}

export async function ringkasanNotifikasi(): Promise<number> {
  const semua = await Notifications.getAllScheduledNotificationsAsync();
  return semua.length;
}

// Notifikasi berikutnya yang sudah kita jadwalkan (dari catatan kita sendiri)
export async function notifBerikutnya(jumlah = 3): Promise<NotifTerjadwal[]> {
  const s = await ambilPengaturan("notif_daftar");
  if (!s) return [];
  try {
    const daftar = JSON.parse(s) as NotifTerjadwal[];
    const sekarang = Date.now();
    return daftar.filter((n) => n.ms > sekarang).slice(0, jumlah);
  } catch {
    return [];
  }
}

async function jadwalkanLangsung(kota: Kota, timezone?: string): Promise<number> {
  const tz = timezone ?? kota.timezone;
  const zona = tz ? zonaLabel(tz) : undefined;
  // Ingat kota aktif, supaya Pengaturan bisa menjadwalkan saat toggle dinyalakan
  await simpanPengaturan("kota_notif", JSON.stringify({ ...kota, timezone: tz }));

  const status = await statusNotifikasi();
  if (!status.aktif) return 0;

  await siapkanKanal();
  const hari = await jadwalBeberapaHari(kota.id, tanggalDiKota(tz), HARI_DEPAN);

  await Notifications.cancelAllScheduledNotificationsAsync();

  const sekarang = Date.now();
  const daftar: NotifTerjadwal[] = [];

  for (const h of hari) {
    for (const nama of WAKTU) {
      const jam = h.jadwal[nama];
      if (!jam) continue;
      const waktu = waktuKeUtc(h.tanggal, jam, tz);
      if (waktu.getTime() <= sekarang + 5000) continue; // sudah lewat

      await Notifications.scheduleNotificationAsync({
        identifier: `adzan-${h.tanggal}-${nama}`,
        content: {
          title: `Waktu ${nama}`,
          body: `Sudah masuk waktu ${nama} untuk ${kota.nama} (${jam}${zona ? " " + zona : ""})`,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: waktu,
          channelId: KANAL,
        },
      });
      daftar.push({ nama, jam, zona, kota: kota.nama, ms: waktu.getTime() });
    }
  }

  await simpanPengaturan("notif_daftar", JSON.stringify(daftar));
  return daftar.length;
}

// Jadwalkan 7 hari ke depan untuk kota yang aktif. Mengembalikan jumlahnya.
export function jadwalkanNotifikasi(kota: Kota, timezone?: string): Promise<number> {
  return urut(() => jadwalkanLangsung(kota, timezone));
}

export type HasilAktif = { ok: boolean; jumlah?: number; pesan?: string };

export async function aktifkanNotifikasi(): Promise<HasilAktif> {
  // Android 13+: dialog izin baru muncul setelah ada minimal satu kanal notifikasi
  await siapkanKanal();
  let izin = await Notifications.getPermissionsAsync();
  if (!izin.granted) izin = await Notifications.requestPermissionsAsync();
  if (!izin.granted) {
    return {
      ok: false,
      pesan: "Izin notifikasi ditolak. Aktifkan di pengaturan HP (bagian Notifikasi), lalu coba lagi.",
    };
  }
  await simpanPengaturan("notif_adzan", "1");

  const k = await kotaNotif();
  if (!k) {
    return { ok: true, jumlah: 0, pesan: "Notifikasi aktif. Buka sebuah kota di Beranda agar jadwalnya dibuat." };
  }
  const jumlah = await jadwalkanNotifikasi(k, k.timezone);
  if (jumlah === 0) {
    return { ok: true, jumlah: 0, pesan: "Notifikasi aktif, tetapi jadwal kota ini belum tersimpan. Buka Beranda saat online." };
  }
  return { ok: true, jumlah };
}

export function matikanNotifikasi() {
  return urut(async () => {
    await simpanPengaturan("notif_adzan", "0");
    await simpanPengaturan("notif_daftar", "[]");
    await Notifications.cancelAllScheduledNotificationsAsync();
  });
}

// Notifikasi uji: muncul 5 detik kemudian. Mengembalikan pesan galat bila gagal.
export async function kirimNotifikasiUji(): Promise<string | null> {
  let izin = await Notifications.getPermissionsAsync();
  if (!izin.granted) izin = await Notifications.requestPermissionsAsync();
  if (!izin.granted) return "Izin notifikasi ditolak. Aktifkan di pengaturan HP.";

  await siapkanKanal();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "SAJADAH",
      body: "Notifikasi waktu sholat aktif. Pengingat akan muncul saat masuk waktu sholat.",
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: KANAL,
    },
  });
  return null;
}