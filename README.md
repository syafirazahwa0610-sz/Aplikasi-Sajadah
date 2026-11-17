# SAJADAH

**Sistem Arah Kiblat dan Jadwal Ibadah Harian**

Aplikasi mobile (React Native + Expo + TypeScript) untuk melihat jadwal sholat, hitung mundur, arah kiblat, kalender Hijriah, kota favorit, dan notifikasi waktu sholat. Jadwal disimpan di SQLite sehingga tetap bisa dibuka saat offline.

## Fitur

- Jadwal sholat harian berdasarkan lokasi GPS atau kota pilihan (metode Kemenag)
- Hitung mundur ke waktu sholat berikutnya, dengan zona waktu kota (WIB, WITA, WIT)
- Cari kota (minimal 3 huruf) dan riwayat pencarian
- Kota favorit dengan waktu sholat berikutnya
- Arah kiblat (rumus di perangkat) dan kompas
- Kalender Hijriah
- Notifikasi waktu sholat (lokal, 7 hari ke depan)
- Mode offline lewat cache SQLite, dengan percobaan ulang saat jaringan atau server bermasalah

## Teknologi

React Native, Expo (Expo Router), TypeScript, expo-sqlite, expo-location, expo-notifications.

## Sumber Data

- [Aladhan API](https://aladhan.com/prayer-times-api): jadwal sholat dan tanggal Hijriah
- [Open-Meteo Geocoding](https://open-meteo.com/): pencarian kota (CC BY 4.0)

## Cara Menjalankan

1. Pasang Node.js, lalu di folder proyek jalankan:

   ```bash
   npm install
   npx expo start
   ```

2. Pasang aplikasi **Expo Go** di HP (iPhone atau Android), lalu pindai kode QR yang tampil di terminal.

## Struktur Folder

```
src/
  api/         http.ts, aladhan.ts, geocoding.ts
  db/          database.ts, jadwalRepo.ts
  utils/       kiblat.ts, waktu.ts, hijriah.ts, lokasi.ts, notifikasi.ts
  components/  StatusKosong.tsx, SplashSajadah.tsx
  app/         layar dan navigasi (Expo Router)
```

## Keterbatasan

- Diuji di iPhone melalui Expo Go. Build Android dikonfigurasi lewat EAS Build (`eas.json`).
- Tanggal Hijriah adalah perkiraan hitungan dan dapat berbeda satu hari dari ketetapan Kemenag.
- Notifikasi memakai suara bawaan sistem dan perlu aplikasi dibuka minimal seminggu sekali.

## Pembuat

Syafira Zahwa. Proyek mata kuliah Pemrograman Berbasis Platform.