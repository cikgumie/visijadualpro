/**
 * VISIJADUAL PRO V2 — BACKEND LOGIC (Code.js)
 * Dikemaskini: Fasa 0 (Keselamatan, Mod Edit Berkata Laluan, LockService, Sandaran Pantas & In-Place Update)
 */

/**
 * FUNGSI 1: SETUP PANGKALAN DATA & HELAIAN
 */
function setupDatabase() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheets = [
        { name: 'DB_Guru', headers: ['ID', 'Nama Guru', 'Singkatan', 'Maksimum Masa'] },
        { name: 'DB_Kelas', headers: ['ID', 'Nama Kelas', 'Tingkatan', 'Guru Kelas'] },
        { name: 'DB_Subjek', headers: ['ID', 'Nama Subjek', 'Kod', 'Masa Per Minggu'] },
        { name: 'DB_Transaksi', headers: ['Timestamp', 'ID_Guru', 'Nama Guru', 'ID_Kelas', 'Nama Kelas', 'ID_Subjek', 'Nama Subjek', 'Masa Diperuntukkan', 'UUID', 'Label', 'Pecahan'] },
        { name: 'DB_Arkib', headers: ['Nama_Sesi', 'Tarikh_Arkib', 'Timestamp', 'ID_Guru', 'Nama_Guru', 'ID_Kelas', 'Nama_Kelas', 'ID_Subjek', 'Nama_Subjek', 'Masa', 'UUID', 'Label', 'Pecahan'] },
        { name: 'DB_Tetapan', headers: ['Parameter', 'Nilai'] }
    ];

    sheets.forEach(schema => {
        let sheet = ss.getSheetByName(schema.name);
        if (!sheet) {
            sheet = ss.insertSheet(schema.name);
            sheet.appendRow(schema.headers);
            if (schema.name === 'DB_Guru') sheet.appendRow(['G01', 'Cikgu Ali', 'ALI', 20]);
            if (schema.name === 'DB_Kelas') sheet.appendRow(['K01', '1 Arif', 1, 'Cikgu Ali']);
            if (schema.name === 'DB_Subjek') sheet.appendRow(['S01', 'Bahasa Melayu', 'BM', 6]);
            if (schema.name === 'DB_Tetapan') sheet.appendRow(['Kata_Laluan', 'admin123']);
        }
    });
}

function doGet() {
    return HtmlService.createTemplateFromFile('index')
        .evaluate()
        .setTitle('VisiJadual Pro v2')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * UTILITI KESELAMATAN & SANDARAN PANTAS (NATIVE)
 */

/**
 * Salin pendua helaian DB_Transaksi secara native sebelum operasi berisiko (clear/reset/import)
 */
function backupTransaksiSheet_(ss) {
    try {
        const sheet = ss.getSheetByName('DB_Transaksi');
        if (!sheet || sheet.getLastRow() <= 1) return null;
        const timestamp = Utilities.formatDate(new Date(), "GMT+8", "yyyyMMdd_HHmmss");
        const backupName = `BAK_${timestamp}`;
        const backupSheet = sheet.copyTo(ss).setName(backupName);
        backupSheet.hideSheet();
        return backupName;
    } catch (e) {
        console.warn("Peringatan: Gagal membuat helaian sandaran automatik: " + e.message);
        return null;
    }
}

/**
 * Dapatkan kata laluan pentadbir dari DB_Tetapan (lalai: admin123)
 */
function getAdminPassword_() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('DB_Tetapan');
    if (!sheet) {
        setupDatabase();
        sheet = ss.getSheetByName('DB_Tetapan');
    }
    if (sheet && sheet.getLastRow() > 1) {
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]).trim().toLowerCase() === 'kata_laluan') {
                const val = String(data[i][1]).trim();
                if (val) return val;
            }
        }
    }
    return 'admin123';
}

/**
 * FUNGSI 2A: SAHKAN KATA LALUAN MOD EDIT
 */
function sahkanKataLaluanAdmin(inputPass) {
    const actualPass = getAdminPassword_();
    if (String(inputPass || "").trim() === actualPass) {
        return { success: true, message: "Kata laluan disahkan. Mod Edit aktif!" };
    }
    return { success: false, message: "Kata laluan tidak tepat. Sila cuba lagi." };
}

/**
 * FUNGSI 2B: TUKAR KATA LALUAN PENTADBIR
 */
function kemaskiniKataLaluanAdmin(oldPass, newPass) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const actualPass = getAdminPassword_();
        if (String(oldPass || "").trim() !== actualPass) {
            throw new Error("Kata laluan semasa tidak tepat.");
        }
        if (!newPass || String(newPass).trim().length < 3) {
            throw new Error("Kata laluan baharu mestilah sekurang-kurangnya 3 aksara.");
        }

        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('DB_Tetapan');
        if (!sheet) {
            setupDatabase();
            sheet = ss.getSheetByName('DB_Tetapan');
        }
        const data = sheet.getDataRange().getValues();
        let found = false;
        for (let i = 1; i < data.length; i++) {
            if (String(data[i][0]).trim().toLowerCase() === 'kata_laluan') {
                sheet.getRange(i + 1, 2).setValue(String(newPass).trim());
                found = true;
                break;
            }
        }
        if (!found) {
            sheet.appendRow(['Kata_Laluan', String(newPass).trim()]);
        }
        return { success: true, message: "Kata laluan pentadbir berjaya dikemaskini!" };
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 3: DAPATKAN DATA (VIEW-ONLY UNTUK SEMUA)
 */
function getAllData() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const getSafeData = (name) => {
        const s = ss.getSheetByName(name);
        return s ? s.getDataRange().getValues().slice(1) : [];
    };

    const rawGuru = getSafeData('DB_Guru');
    const rawKelas = getSafeData('DB_Kelas');
    const rawSubjek = getSafeData('DB_Subjek');
    let rawTransaksi = getSafeData('DB_Transaksi');

    rawTransaksi = rawTransaksi.map(row => {
        const uuid = row[8] || (row[0] instanceof Date ? row[0].toISOString() : String(row[0]));
        const label = row[9] || "";
        const pecahan = row[10] ? String(row[10]).trim() : (row[7] ? String(row[7]).trim() : "");
        let dateStr = row[0];
        if (row[0] instanceof Date) {
            dateStr = row[0].toLocaleDateString('ms-MY') + ' ' + row[0].toLocaleTimeString('ms-MY');
        }
        row[0] = dateStr;
        row[8] = uuid;
        row[9] = label;
        row[10] = pecahan;
        return row;
    });

    let stats = {};
    rawTransaksi.forEach(row => {
        let namaGuru = row[2];
        let masa = parseInt(row[7]) || 0;
        stats[namaGuru] = (stats[namaGuru] || 0) + masa;
    });

    return { guru: rawGuru, kelas: rawKelas, subjek: rawSubjek, transaksi: rawTransaksi.reverse(), stats: stats };
}

/**
 * FUNGSI 4: SIMPAN DATA (BULK) — DILINDUNGI LOCKSERVICE
 */
function simpanJadualBulk(dataList) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('DB_Transaksi');
        if (!sheet) { setupDatabase(); sheet = ss.getSheetByName('DB_Transaksi'); }

        const timestamp = new Date();
        const newRows = dataList.map(data => {
            return [
                timestamp,
                data.guruId, data.guruNama,
                data.kelasId, data.kelasNama,
                data.subjekId, data.subjekNama,
                parseInt(data.masa),
                data.uuid || Utilities.getUuid(),
                data.label || "",
                data.pecahan || String(data.masa)
            ];
        });

        if (newRows.length > 0) {
            sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
        }
        return `Disimpan: ${newRows.length} rekod.`;
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 5: PADAM DATA — DILINDUNGI LOCKSERVICE
 */
function deleteAgihan(targetUuid) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('DB_Transaksi');
        const data = sheet.getDataRange().getValues();
        const targets = Array.isArray(targetUuid) ? targetUuid.map(String) : [String(targetUuid)];
        let deleted = 0;

        for (let i = data.length - 1; i >= 1; i--) {
            const rowUuid = String(data[i][8]);
            const rowDateStr = data[i][0] instanceof Date ? data[i][0].toISOString() : String(data[i][0]);
            if (targets.includes(rowUuid) || targets.includes(rowDateStr)) {
                sheet.deleteRow(i + 1);
                deleted++;
            }
        }
        if (deleted > 0) {
            return `${deleted} rekod dipadam.`;
        }
        throw new Error("Data tidak dijumpai.");
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 6: UPDATE DATA (SECARA IN-PLACE TANPA PADAM & APPEND)
 */
function updateAgihan(data, oldUuid) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('DB_Transaksi');
        const values = sheet.getDataRange().getValues();

        for (let i = 1; i < values.length; i++) {
            const rowUuid = values[i][8];
            const rowDateStr = values[i][0] instanceof Date ? values[i][0].toISOString() : String(values[i][0]);
            if (String(rowUuid) === String(oldUuid) || rowDateStr === oldUuid) {
                const originalTimestamp = values[i][0];
                const updatedRow = [
                    originalTimestamp, // kekalkan cap masa asal
                    data.guruId, data.guruNama,
                    data.kelasId, data.kelasNama,
                    data.subjekId, data.subjekNama,
                    parseInt(data.masa),
                    oldUuid, // kekalkan UUID asal
                    data.label || "",
                    data.pecahan || String(data.masa)
                ];
                sheet.getRange(i + 1, 1, 1, updatedRow.length).setValues([updatedRow]);
                return "Data dikemaskini!";
            }
        }

        // Jika rekod lama tidak ditemui, tambah rekod baharu
        sheet.appendRow([
            new Date(),
            data.guruId, data.guruNama,
            data.kelasId, data.kelasNama,
            data.subjekId, data.subjekNama,
            parseInt(data.masa),
            Utilities.getUuid(),
            data.label || "",
            data.pecahan || String(data.masa)
        ]);
        return "Data ditambah sebagai rekod baharu.";
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 6B: SIMPAN & KEMASKINI SECARA BULK (BATCH UPDATE & INSERT)
 */
function simpanDanKemaskiniBulk(updatesList, newInsertsList) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('DB_Transaksi');
        if (!sheet) { setupDatabase(); sheet = ss.getSheetByName('DB_Transaksi'); }

        const values = sheet.getDataRange().getValues();
        const uuidMap = {};
        for (let i = 1; i < values.length; i++) {
            const rowUuid = String(values[i][8]);
            const rowDateStr = values[i][0] instanceof Date ? values[i][0].toISOString() : String(values[i][0]);
            if (rowUuid) uuidMap[rowUuid] = i;
            if (rowDateStr) uuidMap[rowDateStr] = i;
        }

        let updatedCount = 0;
        if (Array.isArray(updatesList) && updatesList.length > 0) {
            updatesList.forEach(item => {
                const targetUuid = String(item.uuid);
                const rowIdx = uuidMap[targetUuid];
                if (rowIdx !== undefined) {
                    const rowData = [...values[rowIdx]];
                    while (rowData.length < 11) rowData.push("");

                    const d = item.data;
                    if (d.guruId !== undefined && d.guruId !== null) rowData[1] = d.guruId;
                    if (d.guruNama !== undefined && d.guruNama !== null) rowData[2] = d.guruNama;
                    if (d.kelasId !== undefined && d.kelasId !== null) rowData[3] = d.kelasId;
                    if (d.kelasNama !== undefined && d.kelasNama !== null) rowData[4] = d.kelasNama;
                    if (d.subjekId !== undefined && d.subjekId !== null) rowData[5] = d.subjekId;
                    if (d.subjekNama !== undefined && d.subjekNama !== null) rowData[6] = d.subjekNama;
                    if (d.masa !== undefined && d.masa !== null) rowData[7] = parseInt(d.masa);
                    if (d.label !== undefined && d.label !== null) rowData[9] = d.label;
                    if (d.pecahan !== undefined && d.pecahan !== null) rowData[10] = d.pecahan;

                    sheet.getRange(rowIdx + 1, 1, 1, rowData.length).setValues([rowData]);
                    updatedCount++;
                }
            });
        }

        let insertedCount = 0;
        if (Array.isArray(newInsertsList) && newInsertsList.length > 0) {
            const timestamp = new Date();
            const newRows = newInsertsList.map(data => [
                timestamp,
                data.guruId, data.guruNama,
                data.kelasId, data.kelasNama,
                data.subjekId, data.subjekNama,
                parseInt(data.masa),
                data.uuid || Utilities.getUuid(),
                data.label || "",
                data.pecahan || String(data.masa)
            ]);
            sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
            insertedCount = newRows.length;
        }

        let msgs = [];
        if (updatedCount > 0) msgs.push(`${updatedCount} rekod dikemaskini`);
        if (insertedCount > 0) msgs.push(`${insertedCount} rekod baharu ditambah`);
        return msgs.length > 0 ? msgs.join(', ') + '!' : "Tiada perubahan.";
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 7: KEMASKINI GURU KELAS — DILINDUNGI LOCKSERVICE
 */
function updateGuruKelas(namaKelas, namaGuru) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('DB_Kelas');
        const data = sheet.getDataRange().getValues();

        for (let i = 1; i < data.length; i++) {
            if (data[i][1] === namaKelas) {
                sheet.getRange(i + 1, 4).setValue(namaGuru);
                return `Guru kelas untuk ${namaKelas} berjaya dikemaskini!`;
            }
        }
        throw new Error("Kelas tidak dijumpai dalam pangkalan data.");
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 8: ARKIB AGIHAN (SALIN SAHAJA - TIDAK PADAM)
 */
function arkibkanAgihan(guruNamaList, snapshotName) {
    if (!snapshotName || snapshotName.trim() === "") {
        throw new Error("Nama sesi arkib tidak boleh kosong.");
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const transaksiSheet = ss.getSheetByName('DB_Transaksi');
        let arkibSheet = ss.getSheetByName('DB_Arkib');

        if (!arkibSheet) {
            setupDatabase();
            arkibSheet = ss.getSheetByName('DB_Arkib');
        }

        const tarikhArkib = new Date();
        const rows = transaksiSheet.getDataRange().getValues().slice(1);

        const arkibRows = rows
            .filter(row => guruNamaList.length === 0 || guruNamaList.indexOf(String(row[2])) > -1)
            .map(row => [snapshotName.trim(), tarikhArkib, ...row]);

        if (arkibRows.length === 0) {
            throw new Error("Tiada rekod untuk guru yang dipilih.");
        }

        const lastRow = arkibSheet.getLastRow();
        arkibSheet.getRange(lastRow + 1, 1, arkibRows.length, arkibRows[0].length).setValues(arkibRows);

        return `${arkibRows.length} rekod berjaya disalin ke sesi arkib "${snapshotName.trim()}". Data aktif masih kekal.`;
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 8B: RESET AGIHAN (DENGAN SANDARAN PANTAS OTOMATIK & LOCKSERVICE)
 */
function resetAgihan(guruNamaList) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = ss.getSheetByName('DB_Transaksi');
        const allData = sheet.getDataRange().getValues();
        const header = allData[0];
        const rows = allData.slice(1);

        let deletedCount = 0;
        const rowsToKeep = rows.filter(row => {
            const namaGuru = String(row[2]);
            const shouldDelete = guruNamaList.length === 0 || guruNamaList.indexOf(namaGuru) > -1;
            if (shouldDelete) deletedCount++;
            return !shouldDelete;
        });

        if (deletedCount === 0) {
            throw new Error("Tiada rekod untuk guru yang dipilih.");
        }

        // Sandaran automatik sebelum clearContents
        backupTransaksiSheet_(ss);

        sheet.clearContents();
        const allRowsToWrite = [header, ...rowsToKeep];
        sheet.getRange(1, 1, allRowsToWrite.length, allRowsToWrite[0].length).setValues(allRowsToWrite);

        return `${deletedCount} rekod berjaya dipadamkan dari senarai aktif. Sandaran automatik telah dicipta.`;
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 9: DAPATKAN SENARAI SESI ARKIB
 */
function getArkibSesi() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_Arkib');
    if (!sheet || sheet.getLastRow() <= 1) return [];

    const rows = sheet.getDataRange().getValues().slice(1);
    const sesiMap = {};

    rows.forEach(row => {
        const namaSesi = String(row[0]);
        const tarikhArkib = row[1] instanceof Date ? row[1].toLocaleDateString('ms-MY') + ' ' + row[1].toLocaleTimeString('ms-MY') : String(row[1]);
        if (!sesiMap[namaSesi]) {
            sesiMap[namaSesi] = { nama: namaSesi, tarikh: tarikhArkib, bilRekod: 0 };
        }
        sesiMap[namaSesi].bilRekod++;
    });

    return Object.values(sesiMap).reverse();
}

/**
 * FUNGSI 10: DAPATKAN DETAIL SESI ARKIB TERTENTU
 */
function getArkibDetail(snapshotName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_Arkib');
    if (!sheet || sheet.getLastRow() <= 1) return [];

    const rows = sheet.getDataRange().getValues().slice(1);
    return rows
        .filter(row => String(row[0]) === snapshotName)
        .map(row => {
            let dateStr = row[2];
            if (row[2] instanceof Date) {
                dateStr = row[2].toLocaleDateString('ms-MY') + ' ' + row[2].toLocaleTimeString('ms-MY');
            }
            return [dateStr, row[3], row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12]];
        });
}

/**
 * FUNGSI 11: RESTORE DATA DARI ARKIB (DENGAN SANDARAN PANTAS OTOMATIK & LOCKSERVICE)
 */
function restoreArkib(snapshotName) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const arkibSheet = ss.getSheetByName('DB_Arkib');
        const transaksiSheet = ss.getSheetByName('DB_Transaksi');

        if (!arkibSheet || arkibSheet.getLastRow() <= 1) {
            throw new Error("Tiada data arkib dijumpai.");
        }

        const allArkib = arkibSheet.getDataRange().getValues().slice(1);
        const rowsToRestore = allArkib
            .filter(row => String(row[0]) === snapshotName)
            .map(row => row.slice(2, 13));

        if (rowsToRestore.length === 0) {
            throw new Error("Tiada rekod untuk sesi arkib ini.");
        }

        const teachersToRestore = [...new Set(rowsToRestore.map(row => String(row[2])))];

        const allActiveData = transaksiSheet.getDataRange().getValues();
        const header = allActiveData[0];
        const activeRows = allActiveData.slice(1);

        const rowsToKeep = activeRows.filter(row => {
            const namaGuru = String(row[2]);
            return teachersToRestore.indexOf(namaGuru) === -1;
        });

        // Sandaran automatik sebelum clearContents
        backupTransaksiSheet_(ss);

        transaksiSheet.clearContents();
        const allRowsToWrite = [header, ...rowsToKeep];
        transaksiSheet.getRange(1, 1, allRowsToWrite.length, allRowsToWrite[0].length).setValues(allRowsToWrite);

        const lastRow = transaksiSheet.getLastRow();
        transaksiSheet.getRange(lastRow + 1, 1, rowsToRestore.length, rowsToRestore[0].length).setValues(rowsToRestore);

        return `${rowsToRestore.length} rekod dari sesi "${snapshotName}" berjaya dipulihkan ke senarai aktif (rekod lama guru yang sama telah digantikan). Sandaran automatik telah disimpan.`;
    } finally {
        lock.releaseLock();
    }
}

/**
 * FUNGSI 12: IMPORT JADUAL DARI FAIL EXCEL (DENGAN SANDARAN PANTAS OTOMATIK & LOCKSERVICE)
 */
function importExcelJadual(rows) {
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const transaksiSheet = ss.getSheetByName('DB_Transaksi');
        
        // Ambil data rujukan untuk lookup
        const guruData = ss.getSheetByName('DB_Guru').getDataRange().getValues().slice(1);
        const kelasData = ss.getSheetByName('DB_Kelas').getDataRange().getValues().slice(1);
        const subjekData = ss.getSheetByName('DB_Subjek').getDataRange().getValues().slice(1);
        
        const guruMap = {};
        guruData.forEach(row => {
            guruMap[String(row[1]).trim().toLowerCase()] = row[0];
        });
        
        const kelasMap = {};
        kelasData.forEach(row => {
            kelasMap[String(row[1]).trim().toLowerCase()] = row[0];
        });
        
        const subjekMap = {};
        subjekData.forEach(row => {
            subjekMap[String(row[1]).trim().toLowerCase()] = row[0];
        });
        
        const newRows = [];
        const timestamp = new Date();
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            
            const guruNama = String(row.Guru || row["Nama Guru"] || row["Nama_Guru"] || "").trim();
            const kelasNama = String(row.Kelas || row["Nama Kelas"] || row["Nama_Kelas"] || "").trim();
            const subjekNama = String(row.Subjek || row["Nama Subjek"] || row["Nama_Subjek"] || "").trim();
            const masa = parseInt(row.Masa || row["Masa Diperuntukkan"] || 0) || 0;
            const label = String(row.Label || "").trim();
            const pecahan = String(row.Pecahan || row["Pecahan Masa"] || row["Pecahan_Masa"] || row.Masa || "").trim();
            const originalTarikhStr = row.Tarikh || row["Tarikh"] || "";
            
            if (!guruNama && !kelasNama && !subjekNama) continue;
            
            const guruId = guruMap[guruNama.toLowerCase()] || "";
            
            const kelasNamesList = kelasNama.split(',').map(s => s.trim());
            const kelasIdsList = kelasNamesList.map(name => kelasMap[name.toLowerCase()] || name);
            const kelasId = kelasIdsList.join(', ');
            
            const subjekId = subjekMap[subjekNama.toLowerCase()] || "";
            
            let rowDate = timestamp;
            if (originalTarikhStr) {
                try {
                    const parsedDate = new Date(originalTarikhStr);
                    if (!isNaN(parsedDate.getTime())) {
                        rowDate = parsedDate;
                    }
                } catch (e) {}
            }
            
            newRows.push([
                rowDate,
                guruId,
                guruNama,
                kelasId,
                kelasNama,
                subjekId,
                subjekNama,
                masa,
                Utilities.getUuid(),
                label === "-" ? "" : label,
                pecahan || String(masa)
            ]);
        }
        
        if (newRows.length === 0) {
            throw new Error("Tiada rekod sah untuk diimport.");
        }
        
        // Sandaran automatik sebelum clearContents
        backupTransaksiSheet_(ss);

        transaksiSheet.clearContents();
        const header = ['Timestamp', 'ID_Guru', 'Nama Guru', 'ID_Kelas', 'Nama Kelas', 'ID_Subjek', 'Nama Subjek', 'Masa Diperuntukkan', 'UUID', 'Label', 'Pecahan'];
        
        const allRowsToWrite = [header, ...newRows];
        transaksiSheet.getRange(1, 1, allRowsToWrite.length, allRowsToWrite[0].length).setValues(allRowsToWrite);
        
        return `Berjaya mengimport ${newRows.length} rekod jadual dari fail Excel. Sandaran automatik telah dicipta.`;
    } finally {
        lock.releaseLock();
    }
}