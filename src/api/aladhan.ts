import { ambilJson } from "./http";

export type JadwalHarian = {
  Subuh: string;
  Terbit: string;
  Dzuhur: string;
  Ashar: string;
  Maghrib: string;
  Isya: string;
};

export type Hijri = { hari: number; bulan: number; tahun: number };
export type HariJadwal = { tanggal: string; jadwal: JadwalHarian; hijri?: Hijri }; // tanggal: YYYY-MM-DD

// Aladhan kadang menambah suffix zona waktu, misalnya "04:32 (WIB)"
const bersihkan = (s: string) => s.split(" ")[0];

// Format tanggal Aladhan: DD-MM-YYYY
export function formatTanggal(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

export async function ambilJadwal(
  lat: number,
  lon: number,
  tanggal: Date = new Date()
): Promise<JadwalHarian> {
  // method=20 diasumsikan Kemenag RI. Verifikasi di dokumentasi Aladhan.
  const url =
    `https://api.aladhan.com/v1/timings/${formatTanggal(tanggal)}` +
    `?latitude=${lat}&longitude=${lon}&method=20`;

  const json = await ambilJson(url);
  const t = json.data.timings;
  return {
    Subuh: bersihkan(t.Fajr),
    Terbit: bersihkan(t.Sunrise),
    Dzuhur: bersihkan(t.Dhuhr),
    Ashar: bersihkan(t.Asr),
    Maghrib: bersihkan(t.Maghrib),
    Isya: bersihkan(t.Isha),
  };
}

// Ambil satu bulan penuh sekaligus (untuk cache)
export async function ambilKalender(
  lat: number,
  lon: number,
  tahun: number,
  bulan: number
): Promise<{ timezone: string; hari: HariJadwal[] }> {
  const url =
    `https://api.aladhan.com/v1/calendar/${tahun}/${bulan}` +
    `?latitude=${lat}&longitude=${lon}&method=20`;

  const json = await ambilJson(url);

  const hari: HariJadwal[] = json.data.map((d: any) => {
    const [dd, mm, yyyy] = d.date.gregorian.date.split("-"); // DD-MM-YYYY
    const t = d.timings;
    const h = d.date?.hijri;
    return {
      tanggal: `${yyyy}-${mm}-${dd}`,
      jadwal: {
        Subuh: bersihkan(t.Fajr),
        Terbit: bersihkan(t.Sunrise),
        Dzuhur: bersihkan(t.Dhuhr),
        Ashar: bersihkan(t.Asr),
        Maghrib: bersihkan(t.Maghrib),
        Isya: bersihkan(t.Isha),
      },
      hijri: h?.month?.number
        ? { hari: Number(h.day), bulan: Number(h.month.number), tahun: Number(h.year) }
        : undefined,
    };
  });
  return { timezone: json.data[0].meta.timezone, hari };
}