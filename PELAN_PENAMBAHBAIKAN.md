# Pelan Penambahbaikan VisiJadual Pro v2

_Tarikh analisis asal: 29 Oktober 2026_  
_Kemaskini: Diselaraskan dengan Analisis Pendapat Kedua (Second Opinion)_

---

## 1. Gambaran Sistem Semasa

| Komponen | Butiran |
|---|---|
| Platform | Google Apps Script (Web App) + Google Sheets |
| Backend | `Code.js` (~414 baris: setup database, CRUD agihan, arkib, reset, restore, import Excel) |
| Frontend | `index.html` (4,461 baris: CSS + HTML + JS + data mock dalam satu fail) |
| Tab UI | Guru, Matriks, Kelas, Subjek, Banding, Arkib |
| Pangkalan Data | `DB_Guru`, `DB_Kelas`, `DB_Subjek`, `DB_Transaksi`, `DB_Arkib`, `DB_Tetapan` |
| Pustaka Luar | Tailwind CDN (Play CDN), Lucide Icons (`@latest`), SheetJS 0.20.1, Google Fonts |

### Kekuatan Sedia Ada
- **Mod Mock Luar Talian**: Boleh dipratonton di pelayar tempatan secara terus tanpa talian internet (apabila `google` tiada).
- **Simpanan Pukal (`simpanJadualBulk`)**: Meminimumkan bilangan panggilan pelayan Google Apps Script.
- **Draf Tempatan**: Draf disimpan dalam `localStorage` pelayar untuk mengelak kehilangan input borang yang belum disimpan.
- **Fungsi Undo (Ctrl+Z)**: Sokongan pemulihan agihan yang baru dipadam.
- **Arkib & Perbandingan**: Modul Arkib (snapshot), restore, serta analisis perbandingan data (Banding) dengan sokongan eksport/import Excel.

---

## 2. Penemuan Analisis Asal

### 🔴 Kritikal: Keselamatan & Kehilangan Data

| # | Isu | Lokasi | Kesan |
|---|---|---|---|
| 1 | **Tiada kawalan akses.** Web app `ANYONE_ANONYMOUS` + `USER_DEPLOYING` | `appsscript.json` | Sesiapa dengan pautan boleh membaca semua data dan memanggil `resetAgihan([])` atau `importExcelJadual()` untuk memadam seluruh `DB_Transaksi`. |
| 2 | **Tiada sandaran automatik** sebelum operasi memusnah | `resetAgihan`, `restoreArkib`, `importExcelJadual` | Pelaksanaan `clearContents()` diikuti tulis semula. Jika berlaku ralat atau timeout di tengah jalan, data hilang sepenuhnya. |
| 3 | **Tiada `LockService`** | Semua fungsi tulis backend | Dua pengguna serentak boleh menindih data antara satu sama lain (*race condition*). |
| 4 | **`updateAgihan` tidak atomik** | `Code.js` | Padam dahulu (`deleteRow`), kemudian `appendRow`. Jika fasa tambah gagal, rekod hilang terus. UUID dan timestamp asal juga bertukar. |
| 5 | **Risiko XSS.** 99 penggunaan `innerHTML` tanpa escape | cth. `index.html:1879` | Data teks dari fail Excel import boleh menyuntik HTML atau skrip berniat jahat. |
| 6 | `XFrameOptionsMode.ALLOWALL` | `doGet()` | Halaman boleh dibenamkan oleh mana-mana laman luar (risiko *clickjacking*). |

### 🟠 Integriti Data

| # | Isu | Kesan |
|---|---|---|
| 7 | Rekod dikenal pasti melalui **nama guru**, bukan ID unik (stats, reset, restore) | Perubahan nama atau guru dengan nama serupa merosakkan integriti statistik dan data arkib. |
| 8 | **Tiada validasi di pelayan** | Nilai `masa` dan `pecahan` boleh bercanggah; ID kelas/subjek tidak disahkan; had `Maksimum Masa` guru tidak dikuatkuasakan di pelayan. |
| 9 | **Format tarikh tidak konsisten** | Ditukar ke string `ms-MY` di pelayan; import `new Date("05/11/2026")` boleh disalah tafsir antara format US dan UK/MY. |
| 10 | Master data hanya boleh diubah terus dalam Google Sheets | Tiada fungsi CRUD guru, kelas, dan subjek terus dari UI web. |
| 11 | `setupDatabase()` memasukkan data contoh secara automatik | Data demonstrasi boleh bercampur dengan data operasi sebenar jika helaian baru dibina semula. |

### 🟡 Prestasi & Kebolehselenggaraan

| # | Isu | Kesan |
|---|---|---|
| 12 | Setiap perubahan memanggil `loadAllData()` dan melukis semula kelima-lima tab | Beban pelayan dan masa menunggu tinggi (1–3 saat setiap tindakan di GAS). |
| 13 | `innerHTML +=` dalam gelung paparan | DOM reflow berulang kali; masa melukis membesar secara kuadratik bagi dataset besar. |
| 14 | `cdn.tailwindcss.com` & `lucide@latest` tidak dipin | Amaran konsol pada persekitaran produksi; risiko aplikasi rosak jika pustaka pihak ketiga mengemaskini API terkini. |
| 15 | Baris data sebagai array dengan indeks magik (`row[7]`, `t[8]`) | Sukar dibaca dan terdedah kepada kecuaian pemaju apabila struktur lajur berubah. |
| 16 | Satu fail HTML 4,461 baris | Sukar diselenggara, diuji, dan disemak perbezaan versinya. |
| 17 | Tiada repositori Git; sandaran manual `index.backup.html`; projek dalam Google Drive | Tiada jejak sejarah perubahan yang teratur. |
| 18 | Tiada ujian automatik | Regresi logik sukar dikesan lebih awal. |
| 19 | `DB_Arkib` terus membesar tanpa indeks | Bacaan arkib semakin perlahan apabila bilangan snapshot bertambah. |

---

## 3. Analisis Pendapat Kedua & Titik Buta (Blind Spots)

Berdasarkan penilaian semula terhadap kekangan ekosistem Google Apps Script, Google Drive for Desktop, dan senario penggunaan sebenar di sekolah Malaysia, 6 titik buta berikut disepadukan ke dalam pelan:

### 3.1 Pengesahan Akses: Paparan Bebas (View-Only) & Kata Laluan HANYA untuk Edit
* **Konteks & Prinsip Reka Bentuk:** 
  1. **Paparan Bebas Tanpa Halangan (*Zero Friction for Viewers*):** Sesiapa sahaja (guru, staf pentadbir) yang membuka pautan web app boleh terus masuk dan melihat jadual serta-merta tanpa sebarang skrin log masuk atau sekatan kata laluan.
  2. **Kata Laluan HANYA untuk Mengubah Data (*Password-Gated Edit Mode*):** Kata laluan hanya diperlukan apabila pentadbir mahu membuat penambahan, pengemaskinian, pemadaman, reset, atau import data.
  3. **Data Jadual Bukan Sulit & Penggunaan Ringkas:** Sistem digunakan oleh 1–2 orang pentadbir jadual, maka mekanismenya dibuat seringkas dan semesra pengguna yang mungkin tanpa enkripsi rumit (*KISS principle*).
* **Aliran Pengguna (User Flow):**
  - **Akses Biasa / Guru (Mod Paparan Sahaja):**
    - Membuka web app ➔ Terus melihat papan pemuka, statistik beban guru, matriks agihan, jadual kelas, perbandingan data, dan boleh mencetak slip tugas.
    - Butang-butang tindakan merbahaya disembunyikan atau dikunci dengan ikon mangga (🔒).
  - **Mengaktifkan Mod Edit (Pentadbir):**
    - Pentadbir menekan butang **"Aktifkan Mod Edit"** di bar atas (Header) ATAU menekan mana-mana butang tindakan (Tambah/Edit/Padam/Import/Reset).
    - Tetingkap dialog (*modal*) ringkas muncul: *"Masukkan Kata Laluan Pentadbir"*.
    - Selepas memasukkan kata laluan yang betul (lalai: **`admin123`**), sistem mengaktifkan status `isEditMode = true` dalam sesi pelayar.
    - Semua borang agihan, butang edit, padam, import Excel, reset, dan menu Tetapan Sistem kini dibuka sepenuhnya.
    - Bar atas memaparkan lencana hijau: **"🟢 Mod Edit Aktif"** berserta butang **"Kunci Semula / Selesai"**.
  - **Penyimpanan & Pemulihan Kata Laluan (`DB_Tetapan`):**
    - Kata laluan disimpan terus dalam helaian `DB_Tetapan` (Format: `Parameter: Kata_Laluan` | `Nilai: admin123`).
    - **Mudah & Telus:** Jika pentadbir terlupa kata laluan, mereka boleh terus membuka Google Sheets di tab `DB_Tetapan` untuk melihat atau menukar kata laluan tersebut tanpa memerlukan bantuan teknikal.
  - **Menu Tetapan Sistem:**
    - Menyediakan borang ringkas dalam UI untuk pentadbir menukar kata laluan pada bila-bila masa (mengemaskini helaian `DB_Tetapan`).

### 3.2 Realiti Latensi GAS vs Sasaran UX (< 1 saat)
* **Isu pada Pelan Asal:** Kriteria Fasa 2 menyasarkan tindakan simpan/padam terasa segera (< 1 saat di UI).
* **Kekangan Teknikal:** Panggilan `google.script.run` mempunyai *network overhead* dan masa permulaan pelayan Google (*cold start*) sekitar **1.2 hingga 3.0 saat**, walaupun fungsinya hanya mengemas kini satu baris. Mengharapkan respons pelayan GAS di bawah 1 saat secara konsisten adalah tidak realistik.
* **Ketetapan Pendapat Kedua:**
  - Laksanakan **Optimistic UI Updates**: Apabila pengguna memadam atau mengubah agihan, kemaskini state memori setempat (`dbData`) dan elemen DOM **serta-merta (0ms)**.
  - Jalankan operasi pelayan di latar belakang. Jika pelayan mengembalikan ralat (*failure handler*), batalkan perubahan (*rollback*) dan paparkan amaran ralat. Ini menjamin aplikasi terasa responsif setaraf aplikasi desktop moden.

### 3.3 Bahaya Repositori Git di dalam Google Drive Sync (`j:\My Drive\...`)
* **Isu pada Pelan Asal:** Menjalankan `git init` terus di dalam folder projek Google Drive Desktop.
* **Kekangan Teknikal:** Klien penyelarasan Google Drive sering mengunci fail binary dan fail indeks dalam `.git/` semasa git sedang menulis objek. Ini kerap mencetuskan ralat `Permission denied`, `index.lock`, atau kerosakan repositori Git.
* **Ketetapan Pendapat Kedua:**
  - Disyorkan memindahkan repositori pembangunan ke folder pemacu tempatan (contohnya `C:\Projects\VisiJadualProv2`), menggunakan Git dan GitHub/GitLab di sana, dan menguruskan penggunaan (*deployment*) ke Apps Script melalui `clasp push`.
  - Jika projek wajib kekal di pemacu Google Drive, pastikan `.git/` diletakkan di bawah pengawasan rapi atau elakkan operasi commit serentak semasa Google Drive sedang menyelaraskan fail.

### 3.4 Pengekalan "Mod Mock Luar Talian" vs Pemecahan Fail (`include()`)
* **Isu pada Pelan Asal:** Memecahkan `index.html` kepada fail separa (`css.html`, `js_matriks.html`, dll.) menggunakan skrip templating GAS `<?!= include(...) ?>`.
* **Kekangan Teknikal:** Kelebihan besar projek ini sekarang ialah pembangun boleh membuka `index.html` secara terus di pelayar tempatan (*double click*) untuk pratonton luar talian (apabila `google` tiada). Sekiranya tag scriplet GAS disuntik terus ke dalam fail HTML tanpa pemproses binaan (*build step*), keupayaan pratonton luar talian ini akan musnah.
* **Ketetapan Pendapat Kedua:**
  - Kekalkan struktur fail monolitik `index.html` buat masa ini untuk Fasa 0 hingga 2, tetapi susun kod menggunakan penanda seksyen (*clean sectional banners*).
  - Hanya laksanakan pemecahan fail pada Fasa 3 sekiranya dilengkapi dengan skrip penggabung ringkas (*bundler/build script*) yang membolehkan pratonton mock kekal berfungsi.

### 3.5 Had Sekatan Fail pada `.claspignore`
* **Isu:** Kandungan `.claspignore` sedia ada mengecualikan semua fail kecuali tiga fail utama:
  ```text
  **/**
  !appsscript.json
  !Code.js
  !index.html
  ```
* **Ketetapan Pendapat Kedua:** Sebarang pembahagian fail backend (cth. `Db.js`, `Agihan.js`) atau penambahan fail baharu wajib diiringi dengan kemaskini serentak pada `.claspignore` agar tidak diabaikan secara senyap semasa `clasp push`.

### 3.6 Sandaran Pantas: Gunakan `sheet.copyTo()` Asli Google Sheets
* **Isu pada Pelan Asal:** Operasi sandaran `AUTO-<tarikh>` ke dalam `DB_Arkib` menyalin rekod baris-demi-baris sebelum `clearContents()`. Apabila dataset membesar, proses ini memakan kuota had masa 6 minit Apps Script.
* **Ketetapan Pendapat Kedua:**
  - Sebelum sebarang operasi memusnah (`resetAgihan`, `restoreArkib`, `importExcelJadual`), salin keseluruhan helaian sasaran secara native menggunakan:
    ```javascript
    const bak = sheet.copyTo(ss).setName(`BAK_${Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss")}`);
    bak.hideSheet();
    ```
  - Kaedah ini hanya mengambil masa < 100ms, selamat sepenuhnya, dan pentadbir boleh mengembalikan data hanya dengan memaparkan semula (*unhide*) helaian tersebut.

---

## 4. Pelan Tindakan yang Diselaraskan (Fasa 0 – Fasa 4)

### Fasa 0: Keselamatan, Mod Edit Berkata Laluan & Sandaran Kebal (Segera, 1–2 Hari)

| # | Tugasan | Fail Terlibat | Rasionale & Butiran Pelaksanaan |
|---|---|---|---|
| 0.1 | **Mod Edit Berkata Laluan (Default: `admin123`) & Paparan Bebas** | `Code.js`, `index.html` | 1. Sesiapa sahaja boleh melihat jadual terus tanpa login/password (*view-only by default*).<br>2. Butang "Mod Edit" / buka kunci di bar atas.<br>3. Semakan kata laluan ringkas (lalai: `admin123`) daripada helaian `DB_Tetapan`.<br>4. Apabila dibuka kunci, butang tambah agihan, edit baris, padam, reset, dan import diaktifkan. Butang kunci semula disediakan untuk tamatkan mod edit. |
| 0.2 | **Panel Tetapan Sistem & Tukar Kata Laluan** | `Code.js`, `index.html` | 1. Modal ringkas "Tetapan Sistem" (hanya boleh diakses dalam Mod Edit).<br>2. Borang tukar kata laluan terus mengemaskini rekod dalam `DB_Tetapan`.<br>3. Pentadbir juga boleh menukar/melihat kata laluan terus di Google Sheets tab `DB_Tetapan` jika terlupa. |
| 0.3 | **Balut Semua Fungsi Tulis dengan `LockService`** | `Code.js` | Gunakan `LockService.getScriptLock()` dengan masa menunggu 20-30 saat pada `simpanJadualBulk`, `deleteAgihan`, `updateAgihan`, `resetAgihan`, `restoreArkib`, dan `importExcelJadual` bagi menghapuskan *race condition*. |
| 0.4 | **Sandaran Pantas Otomatik (`sheet.copyTo()`)** | `Code.js` | Duplikasi dan sembunyikan helaian `DB_Transaksi` sebelum operasi `clearContents()` dalam `resetAgihan`, `restoreArkib`, dan `importExcelJadual`. |
| 0.5 | **Kemas Kini `updateAgihan` Secara In-Place** | `Code.js` | Gantikan logik padam-dan-tambah dengan pengemaskinian baris di tempat asal (*in-place update*), mengekalkan UUID dan cap masa asal serta merekod cap masa kemaskini. |
| 0.6 | **Pembersihan XSS (`escapeHtml`)** | `index.html` | Sediakan utiliti `escapeHtml()` dan sanitasi semua teks dinamik daripada data transaksi dan Excel sebelum dimasukkan ke dalam `innerHTML`. |
| 0.7 | **Penetapan X-Frame & Keselamatan Sesi** | `Code.js` | Tukar `ALLOWALL` kepada `DEFAULT` (melainkan perlu dibenam dalam Google Sites rasmi). |

**Kriteria Siap Fasa 0:**
1. Pengguna umum/guru boleh terus membuka pautan dan melihat jadual serta mencetak slip tanpa sebarang gangguan skrin login (*frictionless view*).
2. Fungsi ubah, padam, reset, dan import hanya aktif apabila Mod Edit dibuka dengan kata laluan (lalai: `admin123`).
3. Pentadbir boleh menukar kata laluan dengan mudah sama ada melalui UI Tetapan Sistem atau terus membuka Google Sheets (`DB_Tetapan`) jika terlupa.
4. Semua operasi ubah/padam terlindung dengan `LockService` dan mempunyai sandaran helaian pendua automatik sebelum operasi padam.

---

### Fasa 1: Integriti Data & Pemadanan Tepat (2–3 Hari)

| # | Tugasan | Rasionale & Butiran |
|---|---|---|
| 1.1 | **Ganti Padanan Nama Guru kepada `ID_Guru`** | Kemas kini statistik beban tugas, penapisan transaksi, reset, dan pemulihan arkib berasaskan ID unik guru. |
| 1.2 | **Validasi Logik di Pelayan (Backend)** | Sahkan bahawa jumlah waktu sepadan dengan pecahan masa; semak kewujudan ID Guru, Kelas, dan Subjek sebelum rekod disimpan. |
| 1.3 | **Standardisasi Format Tarikh (ISO 8601)** | Simpan dan hantar tarikh dalam format standard ISO; formatkan kepada format paparan tempatan di pelayar pengguna. |
| 1.4 | **Pratonton Import Excel Sebelum Tulis** | Paparkan tetingkap pengesahan (*preview modal*) yang menyenaraikan bilangan baris sah, ralat format, atau rekod yang tidak ditemui dalam master data sebelum menulis ke dalam helaian. |
| 1.5 | **Asingkan Data Demo dari `setupDatabase()`** | Pisahkan data contoh kepada fungsi berasingan (`seedDemoData()`) supaya tidak mencemarkan data sebenar. |

**Kriteria Siap Fasa 1:** Pertukaran nama guru tidak menjejaskan rekod sedia ada; fail Excel dengan format tarikh berbeza diproses dengan tepat; tiada rekod tidak sah boleh menembusi pangkalan data.

---

### Fasa 2: Prestasi UI & Pengalaman Pengguna (2–3 Hari)

| # | Tugasan | Rasionale & Butiran |
|---|---|---|
| 2.1 | **Laksanakan Optimistic UI Updates** | Kemas kini UI serta-merta semasa pengguna menambah atau memadam agihan tanpa menunggu respons rangkaian daripada GAS. |
| 2.2 | **Pengemaskinian Setempat (Partial Refresh)** | Elakkan pemanggilan `loadAllData()` secara penuh selepas setiap tindakan kecil; hanya kemas kini rekod yang terkesan dalam memori `dbData`. |
| 2.3 | **Lazy Tab Rendering & Pengoptimuman DOM** | Hanya lukis tab yang sedang aktif; bina rentetan HTML dalam tatasusunan (*array*) dan cantumkan menggunakan `.join('')` untuk menghapuskan kesan `innerHTML +=` bertingkat. |
| 2.4 | **Lengkapkan Fungsi Redo (Ctrl+Shift+Z / Ctrl+Y)** | Perluaskan sistem draf dan undo sedia ada untuk menyokong operasi kemas kini dan redo. |

**Kriteria Siap Fasa 2:** Interaksi pengguna (tambah, padam, kemas kini) memberi maklum balas serta-merta di skrin (< 100ms di UI); tab bertukar dengan lancar tanpa lag.

---

### Fasa 3: Seni Bina Kod & Penyelenggaraan (3–4 Hari)

| # | Tugasan | Rasionale & Butiran |
|---|---|---|
| 3.1 | **Pin Versi Pustaka & Tangani CSS** | Pin versi Lucide Icons; pertimbangkan pengekstrakan CSS Tailwind yang diperlukan untuk mengurangkan kebergantungan kepada runtime CDN. |
| 3.2 | **Struktur Pemalar Lajur (Column Mapping Constants)** | Gantikan indeks nombor rawak (`row[7]`, `t[8]`) dengan pemalar objek yang jelas (cth: `COL_TRANSAKSI.MASA = 7`). |
| 3.3 | **Penyelarasan `.claspignore` & Aliran Kerja Git** | Sediakan repositori Git di lokasi selamat; pastikan `.claspignore` dikemaskini sebelum sebarang pembahagian fail skrip. |
| 3.4 | **Modularisasi Skrip Bersyarat** | Pecahkan modul logik backend (`Code.js`) kepada fail modular (`Db.js`, `Agihan.js`, `Arkib.js`, `Import.js`) dengan menguji keserasian `clasp push`. |

**Kriteria Siap Fasa 3:** Tiada amaran produksi pustaka di konsol; kod mudah dibaca dan mempunyai pemetaan lajur berpusat.

---

### Fasa 4: Ciri-Ciri Tambahan Bernilai Tinggi (Berperingkat)

| Keutamaan | Ciri Baharu | Manfaat Operasi Sekolah |
|---|---|---|
| P1 | **Slip Agihan Tugas Guru & Jadual Kelas (Cetak / PDF)** | Memudahkan cetakan rasmi untuk mesyuarat kurikulum dan fail guru. |
| P2 | **Panel Pengurusan Master Data (Guru/Kelas/Subjek) dari UI** | Pentadbir boleh menambah guru atau kelas baharu tanpa perlu membuka Google Sheets. |
| P3 | **Portal Guru Kendiri (Personal Teacher View)** | Menambah baik mod paparan guru kepada portal khusus di mana setiap guru boleh memilih/menapis jadual mereka sendiri dengan lebih interaktif. |
| P4 | **Helaian Log Audit (`DB_Log`)** | Merekod sejarah siapa yang membuat pengubahan dan masa transaksi dilakukan. |
| P5 | **Pengindeksan Helaian Arkib Mengikut Sesi/Tahun** | Memastikan pembukaan rekod arkib kekal pantas walaupun sistem telah digunakan bertahun-tahun. |

---

## 5. Ringkasan Garis Masa & Cadangan Pelaksanaan

| Fasa | Fokus Utama | Tempoh Anggaran | Status |
|---|---|---|---|
| **Fasa 0** | Paparan Bebas (View-Only) + Mod Edit Berkata Laluan (`admin123` via `DB_Tetapan`), LockService & Sandaran Pantas | 1 – 2 hari | ✅ **SELESAI** |
| **Fasa 1** | Integriti Data (ID Guru, Validasi & Import) | 2 – 3 hari | **Keutamaan Seterusnya** |
| **Fasa 2** | Prestasi UI (Optimistic Updates & Tab Rendering) | 2 – 3 hari | Seterusnya |
| **Fasa 3** | Struktur Kod, Pemalar & Penyelenggaraan | 3 – 4 hari | Susulan |
| **Fasa 4** | Ciri Tambahan (Laporan PDF, CRUD Master Data, Portal Guru, dsb.) | Berperingkat | Fleksibel |

> **Cadangan Tindakan Seterusnya (Fasa 0):**  
> Mulakan pelaksanaan serta-merta dengan menyunting [Code.js](file:///j:/My%20Drive/Antigravity/VisiJadualProv2/Code.js) dan [index.html](file:///j:/My%20Drive/Antigravity/VisiJadualProv2/index.html) untuk:
> 1. **Setup `DB_Tetapan`:** Tambah helaian `DB_Tetapan` dalam `setupDatabase()` mengandungi `Kata_Laluan` = `admin123` (telus & boleh dilihat/ditukar terus dalam Google Sheets).
> 2. **Backend Auth Ringkas:** Cipta fungsi `sahkanKataLaluanAdmin(inputPass)` dan `kemaskiniKataLaluanAdmin(newPass)` dalam [Code.js](file:///j:/My%20Drive/Antigravity/VisiJadualProv2/Code.js).
> 3. **UI Mod Edit di [index.html](file:///j:/My%20Drive/Antigravity/VisiJadualProv2/index.html):**
>    - Halaman dibuka sebagai **Mod Paparan (View-Only)** secara automatik tanpa sebarang pop-up kata laluan.
>    - Sediakan butang **"Aktifkan Mod Edit" (🔒)** di header.
>    - Modal kata laluan hanya muncul apabila butang tersebut atau sebarang butang tindakan (tambah/edit/padam/reset/import) ditekan.
>    - Butang **"Tetapan Sistem"** (tukar kata laluan) dan butang **"Kunci Semula"** apabila Mod Edit aktif.
> 4. **Keselamatan Data & Transaksi:** Memasang `LockService`, sandaran automatik `sheet.copyTo()`, kemaskini `updateAgihan` secara in-place, dan sanitasi XSS (`escapeHtml`).
