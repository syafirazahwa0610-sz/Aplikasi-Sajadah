import { ambilKalender, HariJadwal, Hijri, JadwalHarian } from "../api/aladhan";
import { tambahHari, tanggalDiKota } from "../utils/waktu";
import { ambilTimezone, getDb, Kota, simpanKota } from "./database";

export const tanggalISO = (d: Date) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Antrian penulisan: satu transaksi pada satu waktu
let antrianTulis: Promise<unknown> = Promise.resolve();
function urutkan<T>(fn: () => Promise<T>): Promise<T> {
  const hasil = antrianTulis.then(fn);
  antrianTulis = hasil.catch(() => {});
  return hasil;
}

async function simpanJadwal(kotaId: string, hari: HariJadwal[]) {
  const db = await getDb();
  await urutkan(() =>
    db.withTransactionAsync(async () => {
      for (const h of hari) {
        await db.runAsync(
          `INSERT OR REPLACE INTO jadwal
           (kota_id, tanggal, subuh, terbit, dzuhur, ashar, maghrib, isya,
            hijri_hari, hijri_bulan, hijri_tahun)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [kotaId, h.tanggal, h.jadwal.Subuh, h.jadwal.Terbit, h.jadwal.Dzuhur,
           h.jadwal.Ashar, h.jadwal.Maghrib, h.jadwal.Isya,
           h.hijri?.hari ?? null, h.hijri?.bulan ?? null, h.hijri?.tahun ?? null]
        );
      }
    })
  );
}

export async function bacaCache(kotaId: string, tanggal: string): Promise<JadwalHarian | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<any>(
    "SELECT * FROM jadwal WHERE kota_id=? AND tanggal=?",
    [kotaId, tanggal]
  );
  if (!r) return null;
  return { Subuh: r.subuh, Terbit: r.terbit, Dzuhur: r.dzuhur,
           Ashar: r.ashar, Maghrib: r.maghrib, Isya: r.isya };
}

async function bacaHijri(kotaId: string, tanggal: string): Promise<Hijri | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<any>(
    "SELECT hijri_hari, hijri_bulan, hijri_tahun FROM jadwal WHERE kota_id=? AND tanggal=?",
    [kotaId, tanggal]
  );
  if (!r || r.hijri_hari == null) return null;
  return { hari: r.hijri_hari, bulan: r.hijri_bulan, tahun: r.hijri_tahun };
}

// Jam Subuh hari berikutnya (menurut zona waktu kota) dari cache
export async function subuhBesok(kotaId: string, tz?: string): Promise<string | undefined> {
  const r = await bacaCache(kotaId, tambahHari(tanggalDiKota(tz), 1));
  return r?.Subuh;
}

// Beberapa hari jadwal dari cache (untuk penjadwalan notifikasi)
export async function jadwalBeberapaHari(kotaId: string, mulai: string, jumlah: number) {
  const db = await getDb();
  const baris = await db.getAllAsync<any>(
    "SELECT * FROM jadwal WHERE kota_id=? AND tanggal>=? ORDER BY tanggal LIMIT ?",
    [kotaId, mulai, jumlah]
  );
  return baris.map((r) => ({
    tanggal: r.tanggal as string,
    jadwal: {
      Subuh: r.subuh, Terbit: r.terbit, Dzuhur: r.dzuhur,
      Ashar: r.ashar, Maghrib: r.maghrib, Isya: r.isya,
    } as JadwalHarian,
  }));
}

// Online dulu; kalau gagal, pakai cache. "Hari ini" mengikuti zona waktu KOTA.
export async function jadwalHariIni(kota: Kota) {
  // Zona waktu kota: dari pencarian, atau dari catatan sebelumnya
  let tz: string | undefined = kota.timezone ?? (await ambilTimezone(kota.id));
  let kunci = tanggalDiKota(tz);
  let galat: unknown = null;

  try {
    const [tahun, bulan] = kunci.split("-").map(Number);
    const bulanIni = await ambilKalender(kota.lat, kota.lon, tahun, bulan);
    tz = bulanIni.timezone ?? tz;
    let semuaHari: HariJadwal[] = bulanIni.hari;

    // Zona dari Aladhan bisa mengoreksi tanggal (mis. kota dari GPS yang zonanya belum diketahui)
    const kunciBenar = tanggalDiKota(tz);
    if (kunciBenar !== kunci) {
      kunci = kunciBenar;
      const [t2, b2] = kunci.split("-").map(Number);
      if (t2 !== tahun || b2 !== bulan) {
        const lain = await ambilKalender(kota.lat, kota.lon, t2, b2);
        semuaHari = [...semuaHari, ...lain.hari];
      }
    }

    await simpanKota({ ...kota, timezone: tz });
    await simpanJadwal(kota.id, semuaHari);

    // Bulan berikutnya: tambahan di latar belakang. Gagal pun tidak masalah.
    const [ty, tm] = kunci.split("-").map(Number);
    const depan = new Date(ty, tm, 1);
    ambilKalender(kota.lat, kota.lon, depan.getFullYear(), depan.getMonth() + 1)
      .then((b) => simpanJadwal(kota.id, b.hari))
      .catch(() => {});

    const hari = semuaHari.find((h) => h.tanggal === kunci);
    if (hari) {
      return {
        jadwal: hari.jadwal,
        hijri: hari.hijri ?? null,
        dariCache: false,
        timezone: tz,
        tanggal: kunci,
      };
    }
  } catch (e) {
    galat = e; // simpan alasannya, lalu coba cache di bawah
  }

  const cache = await bacaCache(kota.id, kunci);
  if (!cache) {
    const alasan = galat instanceof Error ? galat.message : "Gagal mengambil data.";
    throw new Error(`${alasan} Jadwal kota ini juga belum tersimpan di perangkat.`);
  }
  return {
    jadwal: cache,
    hijri: await bacaHijri(kota.id, kunci),
    dariCache: true,
    timezone: tz,
    tanggal: kunci,
  };
}