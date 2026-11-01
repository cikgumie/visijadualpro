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
| Tetapkan slot boleh isi / blok bagi setiap kelas | tab **Slot Masa** | |

- Di **Chrome / Edge**, "Simpan" menulis terus ke fail ZIP yang sama selepas kali pertama.
- Di pelayar lain (Safari, Firefox), "Simpan" memuat turun fail ZIP ke folder Downloads.
- Titik kuning pada nama fail / `•` pada tajuk tab = ada perubahan belum disimpan.
- Data turut disimpan sementara dalam pelayar (autosimpan), jadi refresh tidak menghilangkan kerja.
  Tetapi **fail ZIP ialah salinan rasmi** — simpan selalu.
- Kata laluan Mod Edit lalai: `admin123` (tukar di Tetapan). Kata laluan disimpan dalam fail ZIP.
  Ini hanya penghalang daripada tersalah edit, bukan keselamatan sebenar.

## Isi fail ZIP

```
manifest.json        versi format & tarikh simpan
data/guru.json       [ID, Nama Guru, Singkatan, Maksimum Masa]
data/kelas.json      [ID, Nama Kelas, Tingkatan, Guru Kelas]
data/subjek.json     [ID, Nama Subjek, Kod, Masa Per Minggu]
data/transaksi.json  agihan jadual (sama lajur seperti DB_Transaksi lama)
data/arkib.json      sesi arkib
data/tetapan.json    kata laluan pentadbir
data/slot.json       hari, waktu, label blok & slot diblok setiap kelas
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
