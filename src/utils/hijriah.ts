import { Hijri } from "../api/aladhan";

const BULAN_HIJRIAH = [
  "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir", "Jumadil Awal", "Jumadil Akhir",
  "Rajab", "Syaban", "Ramadan", "Syawal", "Zulkaidah", "Zulhijah",
];
const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN_MASEHI = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const formatHijri = (h: Hijri) =>
  `${h.hari} ${BULAN_HIJRIAH[h.bulan - 1] ?? ""} ${h.tahun} H`;

export const formatMasehi = (d: Date = new Date()) =>
  `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN_MASEHI[d.getMonth()]} ${d.getFullYear()}`;

// Tanggal Masehi berbahasa Indonesia dari "YYYY-MM-DD"
export function formatMasehiISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${HARI[hari]}, ${d} ${BULAN_MASEHI[m - 1]} ${y}`;
}