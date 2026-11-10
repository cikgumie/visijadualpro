# VisiJadual Pro v2 (Versi Web / GitHub Pages)

Sistem Agihan Waktu & Kawalan Beban Guru — **tanpa Google Sheet dan tanpa Apps Script**.
Semua data berada dalam memori pelayar, dan disimpan/dibuka sebagai **fail ZIP** di komputer pengguna.

## Cara guna

| Tindakan | Butang | Pintasan |
|---|---|---|
| Buka fail data | **Buka** (atau seret & lepas fail ZIP ke halaman) | Ctrl+O |
| Simpan ke fail ZIP | **Simpan** | Ctrl+S |
| Simpan sebagai fail baharu | ikon di sebelah Simpan | Ctrl+Shift+S |
| Mula fail kosong | **Baru** | |
| Urus senarai Guru / Kelas / Subjek | **Data Induk** | |
| Tetapkan slot boleh isi / blok bagi setiap kelas | tab **Slot Masa** → Kelas | |
| Tetapkan slot guru tidak boleh mengajar | tab **Slot Masa** → Guru | |
| Peraturan susunan jadual | tab **Slot Masa** → Peraturan Susunan | |
| Susun jadual automatik, lihat jadual kelas / guru, kunci sesi | tab **Susun Jadual** | |

- Di **Chrome / Edge**, "Simpan" menulis terus ke fail ZIP yang sama selepas kali pertama.
- Di pelayar lain (Safari, Firefox), "Simpan" memuat turun fail ZIP ke folder Downloads.
- Titik kuning pada nama fail / `•` pada tajuk tab = ada perubahan belum disimpan.
- Data turut disimpan sementara dalam pelayar (autosimpan), jadi refresh tidak menghilangkan kerja.
  Tetapi **fail ZIP ialah salinan rasmi** — simpan selalu.
- Kata laluan Mod Edit lalai: `admin123` (tukar di Tetapan). Kata laluan disimpan dalam fail ZIP.
  Ini hanya penghalang daripada tersalah edit, bukan keselamatan sebenar.

## Susun jadual automatik

- Setiap agihan dipecah mengikut **pecahan** (cth `2,2,2`). Agihan tanpa pecahan (pecahan = jumlah masa) dipecah
  sama rata secara automatik jika pilihan *Pecah automatik* ditanda (cth 6 → 2,2,2; 15 → 3,3,3,3,3).
- **Label serentak:** agihan dengan **huruf label yang sama** (cth C1/C2, G1/G2/G3), masa yang sama dan berkongsi
  sekurang-kurangnya satu kelas dijadualkan pada slot yang sama.
- Slot diblok kelas & guru, serta peraturan susunan, sentiasa dipatuhi. Sesi yang tidak muat disenaraikan bersama sebabnya.
- **Hubungan** (butang *Hubungan* dalam tab Susun Jadual) — 30 jenis kekangan antara sesi. Pilih agihan melalui penapis
  subjek / guru / kelas (Kumpulan A, dan Kumpulan B bagi jenis "A & B"):
  - *Waktu & serentak:* mesti serentak · tidak boleh pada waktu yang sama · maks sesi pada satu waktu
  - *Hari:* tidak boleh hari sama · maks/min waktu sehari · maks sesi sehari · maks/min hari seminggu ·
    maks hari berturut-turut · maks hari lapang di antara sesi
  - *Berturut & lompong:* maks waktu berturut-turut · maks/min julat sehari · maks lompong sehari / seminggu
    (termasuk varian kiraan waktu kosong di awal / akhir)
  - *Slot:* hanya / tidak boleh pada slot · tidak boleh bermula / berakhir pada slot · slot A hari ini & slot B hari esok
  - *Susunan A & B:* A tidak diikuti terus oleh B · tidak bersebelahan · A sebelum B (sehari / seminggu) ·
    hari A sebelum hari B · A mesti bersebelahan B
  - Jenis bertanda **lembut** (min, lompong, hari berturut / lapang) diusahakan tetapi tidak dijamin; pelanggaran dilaporkan.
- Klik sesi untuk **kunci** — sesi berkunci kekal di tempatnya apabila jadual disusun semula.

## Guru ganti

Tab **Guru Ganti** menggunakan jadual yang telah disusun (tab Susun Jadual).

- **Kalendar:** pilih tarikh → rekod guru tidak hadir (sepanjang hari atau julat waktu) → sistem mencadangkan guru ganti
  bagi setiap waktu yang terjejas → tukar pilihan jika perlu → **Sahkan & Simpan**. Rekod boleh dibatalkan, dicetak atau dieksport ke Excel.
- **Cadangan adil:** calon disusun mengikut jumlah minit ganti paling rendah (sejak *Mula pengiraan beban* + minit dibawa),
  kemudian tugas ganti paling lama. Hanya rekod yang **disahkan** dikira.
- Calon mestilah layak, hadir, tidak mengajar pada waktu itu, slot guru tidak diblok, belum ganti pada waktu yang sama
  dan belum mencapai had tugas ganti sehari (lalai 2).
- **Beban Guru Ganti:** laporan minit & bilangan tugas setiap guru.
- **Tetapan & Cuti:** nama sekolah untuk cetakan, tarikh mula pengiraan, kelayakan / had / minit bawa setiap guru, senarai cuti.

## Isi fail ZIP

```
manifest.json        versi format & tarikh simpan
data/guru.json       [ID, Nama Guru, Singkatan, Maksimum Masa]
data/kelas.json      [ID, Nama Kelas, Tingkatan, Guru Kelas]
data/subjek.json     [ID, Nama Subjek, Kod, Masa Per Minggu]
data/transaksi.json  agihan jadual (sama lajur seperti DB_Transaksi lama)
data/arkib.json      sesi arkib
data/tetapan.json    kata laluan pentadbir
data/slot.json       hari, waktu, label blok & slot diblok setiap kelas dan setiap guru
data/peraturan.json  peraturan susunan jadual (sesi subjek sehari, had waktu guru)
data/jadual.json     kedudukan setiap sesi dalam jadual (hari, waktu, dikunci)
data/hubungan.json   hubungan / kekangan antara sesi
data/gantian.json    guru ganti: tetapan, kelayakan guru, guru tidak hadir, cuti, rekod pengesahan
```

## Pindah data dari versi Google Sheet lama

1. Dalam sistem lama, klik **Eksport Excel**.
2. Dalam versi web ini: **Mula Baru** → **Data Induk** → tampal senarai Guru, Kelas & Subjek
   (salin lajur dari helaian `DB_Guru`, `DB_Kelas`, `DB_Subjek` tanpa lajur ID) → **Simpan Senarai**.
3. Klik **Import Excel** dan pilih fail yang dieksport pada langkah 1.
4. Klik **Simpan** untuk menyimpan fail ZIP.

## Muat naik ke GitHub Pages

Laman langsung: https://cikgumie.github.io/visijadualpro/

1. Push ke cawangan `main` — `index.html` dan `.nojekyll` berada di akar repositori.
2. Repositori → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)`.
3. Selepas 1–2 minit, perubahan tersedia di laman di atas.

> Jangan push fail ZIP data sekolah — `.gitignore` sudah mengecualikan `*.zip`.

Uji di komputer sendiri:

```bash
python3 -m http.server 8765 --directory .
```
