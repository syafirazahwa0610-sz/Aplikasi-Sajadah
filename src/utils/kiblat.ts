const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

// Koordinat Ka'bah
const KAABA_LAT = rad(21.4225);
const KAABA_LON = rad(39.8262);

export function hitungKiblat(lat: number, lon: number): number {
  const phi = rad(lat);
  const dLon = KAABA_LON - rad(lon);
  const y = Math.sin(dLon);
  const x =
    Math.cos(phi) * Math.tan(KAABA_LAT) - Math.sin(phi) * Math.cos(dLon);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}