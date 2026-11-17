import { JadwalHarian } from "../api/aladhan";

const ZONA: Record<string, string> = {
  "Asia/Jakarta": "WIB",
  "Asia/Pontianak": "WIB",
  "Asia/Makassar": "WITA",
  "Asia/Jayapura": "WIT",
};
export const zonaLabel = (tz?: string) => (tz && ZONA[tz]) || tz || "";

// Detik sejak tengah malam, menurut zona waktu kota (bukan zona HP)
export function detikSekarang(tz?: string, now = new Date()): number {
  let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  if (tz) {
    try {
      const p = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }).formatToParts(now);
      const ambil = (t: string) => Number(p.find((x) => x.type === t)?.value ?? 0);
      h = ambil("hour") % 24; m = ambil("minute"); s = ambil("second");
    } catch {}
  }
  return h * 3600 + m * 60 + s;
}

const keDetik = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 3600 + m * 60;
};

const WAKTU_SHOLAT = ["Subuh", "Dzuhur", "Ashar", "Maghrib", "Isya"] as const;

/// Waktu sholat berikutnya (Terbit tidak dihitung).
// subuhBesok: jam Subuh hari berikutnya (dari cache); jika kosong, pakai Subuh hari ini sebagai pendekatan
export function cariBerikutnya(j: JadwalHarian, tz?: string, subuhBesok?: string) {
  const sekarang = detikSekarang(tz);
  for (const nama of WAKTU_SHOLAT) {
    const t = keDetik(j[nama]);
    if (t > sekarang) return { nama, sisaDetik: t - sekarang };
  }
  return {
    nama: "Subuh" as const,
    sisaDetik: 86400 - sekarang + keDetik(subuhBesok ?? j.Subuh),
  };
}

export function formatHMS(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const dua = (n: number) => String(n).padStart(2, "0");
  return `${dua(h)}:${dua(m)}:${dua(s)}`;
}

function offsetMenit(tz: string, utcMs: number): number {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  const sebagaiUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return Math.round((sebagaiUtc - utcMs) / 60000);
}

// Ubah "tanggal + jam lokal kota" menjadi waktu absolut (Date)
export function waktuKeUtc(tanggal: string, jam: string, tz?: string): Date {
  const [y, m, d] = tanggal.split("-").map(Number);
  const [h, mi] = jam.split(":").map(Number);
  if (!tz) return new Date(y, m - 1, d, h, mi, 0);
  try {
    const nominal = Date.UTC(y, m - 1, d, h, mi, 0);
    let tebak = nominal - offsetMenit(tz, nominal) * 60000;
    tebak = nominal - offsetMenit(tz, tebak) * 60000; // koreksi kedua
    return new Date(tebak);
  } catch {
    return new Date(y, m - 1, d, h, mi, 0);
  }
}

// Tanggal (YYYY-MM-DD) saat ini menurut zona waktu kota. Tanpa zona: tanggal perangkat.
export function tanggalDiKota(tz?: string, now = new Date()): string {
  if (tz) {
    try {
      const p = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
      }).formatToParts(now);
      const g = (t: string) => p.find((x) => x.type === t)?.value;
      if (g("year") && g("month") && g("day")) return `${g("year")}-${g("month")}-${g("day")}`;
    } catch {}
  }
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

// Tambah n hari pada tanggal YYYY-MM-DD (tanpa pengaruh zona waktu)
export function tambahHari(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${t.getUTCFullYear()}-${mm}-${dd}`;
}