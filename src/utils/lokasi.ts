import * as Location from "expo-location";
import { idKota, Kota } from "../db/database";

export type HasilLokasi = { kota?: Kota; galat?: string };

export async function ambilLokasiSaya(): Promise<HasilLokasi> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      return { galat: "Izin lokasi ditolak. Aktifkan izin lokasi di pengaturan HP." };
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = pos.coords;

    let nama = "Lokasi Saya";
    try {
      const [g] = await Location.reverseGeocodeAsync({ latitude, longitude });
      nama = g?.subregion || g?.city || g?.region || nama;
    } catch {}

    return { kota: { id: idKota(latitude, longitude), nama, lat: latitude, lon: longitude } };
  } catch {
    return { galat: "Lokasi tidak dapat ditentukan. Pastikan GPS aktif." };
  }
}