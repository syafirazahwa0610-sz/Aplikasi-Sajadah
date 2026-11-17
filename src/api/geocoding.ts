import { idKota, Kota } from "../db/database";
import { ambilJson } from "./http";

export type HasilKota = Kota & { wilayah?: string };

export async function cariKota(kataKunci: string): Promise<HasilKota[]> {
  const q = kataKunci.trim();
  if (q.length < 3) return [];

  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(q)}&count=10&language=id&format=json`;

  const json = await ambilJson(url);

  // Jika tidak ada hasil, Open-Meteo tidak mengirim field "results"
  const hasil: any[] = json.results ?? [];
  return hasil.map((r) => ({
    id: idKota(r.latitude, r.longitude),
    nama: r.name,
    lat: r.latitude,
    lon: r.longitude,
    timezone: r.timezone,
    wilayah: [r.admin1, r.country].filter(Boolean).join(", "),
  }));
}