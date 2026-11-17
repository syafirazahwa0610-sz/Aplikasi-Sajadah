import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync("waktuibadah.db");
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS kota (
          id TEXT PRIMARY KEY,
          nama TEXT NOT NULL,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          timezone TEXT,
          favorit INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS jadwal (
          kota_id TEXT NOT NULL,
          tanggal TEXT NOT NULL,
          subuh TEXT, terbit TEXT, dzuhur TEXT,
          ashar TEXT, maghrib TEXT, isya TEXT,
          PRIMARY KEY (kota_id, tanggal)
        );
        CREATE TABLE IF NOT EXISTS pengaturan (
          kunci TEXT PRIMARY KEY,
          nilai TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS riwayat (
          id TEXT PRIMARY KEY,
          nama TEXT NOT NULL,
          lat REAL NOT NULL,
          lon REAL NOT NULL,
          timezone TEXT,
          wilayah TEXT,
          waktu INTEGER NOT NULL
        );
      `);

      // Migrasi: tambah kolom tanggal Hijriah jika belum ada
      const kolom = await db.getAllAsync<{ name: string }>("PRAGMA table_info(jadwal)");
      if (!kolom.some((k) => k.name === "hijri_hari")) {
        await db.execAsync(`
          ALTER TABLE jadwal ADD COLUMN hijri_hari INTEGER;
          ALTER TABLE jadwal ADD COLUMN hijri_bulan INTEGER;
          ALTER TABLE jadwal ADD COLUMN hijri_tahun INTEGER;
        `);
      }

      return db;
    })();
  }
  return dbPromise;
}

export type Kota = {
  id: string;
  nama: string;
  lat: number;
  lon: number;
  timezone?: string;
};

export const idKota = (lat: number, lon: number) =>
  `${lat.toFixed(2)},${lon.toFixed(2)}`;

export async function simpanKota(k: Kota) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO kota (id, nama, lat, lon, timezone) VALUES (?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET nama=excluded.nama, timezone=excluded.timezone`,
    [k.id, k.nama, k.lat, k.lon, k.timezone ?? null]
  );
}

export async function setFavorit(id: string, nilai: boolean) {
  const db = await getDb();
  await db.runAsync("UPDATE kota SET favorit=? WHERE id=?", [nilai ? 1 : 0, id]);
}

export async function daftarFavorit(): Promise<Kota[]> {
  const db = await getDb();
  return db.getAllAsync<Kota>("SELECT id, nama, lat, lon, timezone FROM kota WHERE favorit=1");
}

export async function ambilTimezone(id: string): Promise<string | undefined> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ timezone: string | null }>(
    "SELECT timezone FROM kota WHERE id=?",
    [id]
  );
  return r?.timezone ?? undefined;
}

export async function tambahFavorit(k: Kota) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO kota (id, nama, lat, lon, timezone, favorit) VALUES (?,?,?,?,?,1)
     ON CONFLICT(id) DO UPDATE SET
       favorit=1, nama=excluded.nama,
       timezone=COALESCE(excluded.timezone, kota.timezone)`,
    [k.id, k.nama, k.lat, k.lon, k.timezone ?? null]
  );
}

export async function hapusFavorit(id: string) {
  const db = await getDb();
  await db.runAsync("UPDATE kota SET favorit=0 WHERE id=?", [id]);
}

export async function hapusSemuaFavorit() {
  const db = await getDb();
  await db.runAsync("UPDATE kota SET favorit=0");
}

export async function apakahFavorit(id: string): Promise<boolean> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ favorit: number }>(
    "SELECT favorit FROM kota WHERE id=?",
    [id]
  );
  return r?.favorit === 1;
}

export async function hapusCacheJadwal() {
  const db = await getDb();
  await db.runAsync("DELETE FROM jadwal");
}

export type InfoCache = {
  id: string;
  nama: string;
  sampai: string;     // tanggal terakhir yang tersimpan (YYYY-MM-DD)
  jumlahHari: number; // jumlah hari tersimpan mulai hari ini
};

// hariIni: format YYYY-MM-DD
export async function infoCacheJadwal(hariIni: string): Promise<InfoCache[]> {
  const db = await getDb();
  return db.getAllAsync<InfoCache>(
    `SELECT j.kota_id AS id,
            COALESCE(k.nama, j.kota_id) AS nama,
            MAX(j.tanggal) AS sampai,
            SUM(CASE WHEN j.tanggal >= ? THEN 1 ELSE 0 END) AS jumlahHari
     FROM jadwal j
     LEFT JOIN kota k ON k.id = j.kota_id
     GROUP BY j.kota_id
     ORDER BY MAX(j.tanggal) DESC, nama`,
    [hariIni]
  );
}

export async function ambilPengaturan(kunci: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ nilai: string }>(
    "SELECT nilai FROM pengaturan WHERE kunci=?",
    [kunci]
  );
  return r?.nilai ?? null;
}

export async function simpanPengaturan(kunci: string, nilai: string) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO pengaturan (kunci, nilai) VALUES (?,?)
     ON CONFLICT(kunci) DO UPDATE SET nilai=excluded.nilai`,
    [kunci, nilai]
  );
}

// Bawaan: aktif (hanya "0" yang berarti nonaktif)
export async function lokasiOtomatis(): Promise<boolean> {
  return (await ambilPengaturan("lokasi_otomatis")) !== "0";
}

export async function simpanLokasiOtomatis(nilai: boolean) {
  await simpanPengaturan("lokasi_otomatis", nilai ? "1" : "0");
}

export async function ambilKotaTerakhir(): Promise<Kota | null> {
  const s = await ambilPengaturan("kota_terakhir");
  if (!s) return null;
  try {
    return JSON.parse(s) as Kota;
  } catch {
    return null;
  }
}

export async function simpanKotaTerakhir(k: Kota) {
  await simpanPengaturan("kota_terakhir", JSON.stringify(k));
}

export type ItemRiwayat = Kota & { wilayah?: string };

const BATAS_RIWAYAT = 10;

export async function tambahRiwayat(k: ItemRiwayat) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO riwayat (id, nama, lat, lon, timezone, wilayah, waktu)
     VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET
       nama=excluded.nama, timezone=excluded.timezone,
       wilayah=excluded.wilayah, waktu=excluded.waktu`,
    [k.id, k.nama, k.lat, k.lon, k.timezone ?? null, k.wilayah ?? null, Date.now()]
  );
  // Simpan hanya yang terbaru
  await db.runAsync(
    `DELETE FROM riwayat WHERE id NOT IN
     (SELECT id FROM riwayat ORDER BY waktu DESC LIMIT ?)`,
    [BATAS_RIWAYAT]
  );
}

export async function daftarRiwayat(): Promise<ItemRiwayat[]> {
  const db = await getDb();
  const baris = await db.getAllAsync<any>(
    "SELECT id, nama, lat, lon, timezone, wilayah FROM riwayat ORDER BY waktu DESC"
  );
  return baris.map((r) => ({
    id: r.id,
    nama: r.nama,
    lat: r.lat,
    lon: r.lon,
    timezone: r.timezone ?? undefined,
    wilayah: r.wilayah ?? undefined,
  }));
}

export async function hapusRiwayat(id: string) {
  const db = await getDb();
  await db.runAsync("DELETE FROM riwayat WHERE id=?", [id]);
}

export async function hapusSemuaRiwayat() {
  const db = await getDb();
  await db.runAsync("DELETE FROM riwayat");
}