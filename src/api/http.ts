export class GalatApi extends Error {
  status?: number;
  constructor(pesan: string, status?: number) {
    super(pesan);
    this.status = status;
  }
}

const SIMULASI_STATUS: number | null = null;

const BATAS_WAKTU_MS = 12000;
const MAKS_PERCOBAAN = 3;

const jeda = (ms: number) => new Promise((r) => setTimeout(r, ms));

function pesanStatus(status: number) {
  if (status === 429) return "Server sedang membatasi permintaan (kode 429). Coba lagi beberapa saat lagi.";
  if (status >= 500) return `Layanan sedang bermasalah (kode ${status}). Coba lagi nanti.`;
  return `Gagal mengambil data (kode ${status}).`;
}

async function ambilDenganBatasWaktu(url: string): Promise<Response> {
  const pengendali = new AbortController();
  const pewaktu = setTimeout(() => pengendali.abort(), BATAS_WAKTU_MS);
  try {
    return await fetch(url, { signal: pengendali.signal });
  } finally {
    clearTimeout(pewaktu);
  }
}

// Maksimal 3 percobaan untuk 429, error server, timeout, dan gangguan jaringan
export async function ambilJson(url: string): Promise<any> {
  let terakhir = new GalatApi("Gagal mengambil data.");

  for (let percobaan = 1; percobaan <= MAKS_PERCOBAAN; percobaan++) {
    try {
      const res = SIMULASI_STATUS
        ? ({ ok: false, status: SIMULASI_STATUS } as Response)
        : await ambilDenganBatasWaktu(url);

      if (res.ok) return await res.json();

      terakhir = new GalatApi(pesanStatus(res.status), res.status);
      // Kode 4xx selain 429 tidak akan membaik jika diulang
      if (res.status !== 429 && res.status < 500) break;
    } catch (e: any) {
      if (e?.name === "AbortError") {
        terakhir = new GalatApi("Server terlalu lama merespons. Periksa koneksi internet Anda.");
      } else if (e instanceof TypeError) {
        terakhir = new GalatApi("Tidak dapat terhubung ke internet.");
      } else {
        terakhir = new GalatApi("Data dari server tidak dapat dibaca.");
      }
    }

    console.log(`[ambilJson] percobaan ${percobaan}/${MAKS_PERCOBAAN} gagal: ${terakhir.message}`);
    if (percobaan < MAKS_PERCOBAAN) await jeda(1500 * percobaan);
  }
  throw terakhir;
}