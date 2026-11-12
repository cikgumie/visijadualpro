"""
Tukar fail Excel (muat turun Google Sheet sistem lama VisiJadual) kepada fail ZIP untuk versi web.

Guna:
    python3 tools/xlsx_ke_zip.py VISIJADUALPROV2.xlsx [output.zip]

Perlu: pip install openpyxl
"""
import collections
import io
import json
import sys
import uuid
import zipfile
from datetime import datetime, timedelta, timezone

import openpyxl

TZ = timezone(timedelta(hours=8))  # Google Sheet sekolah dalam waktu Malaysia
ZIP_FORMAT_VERSION = 1


def rows(wb, name):
    if name not in wb.sheetnames:
        return []
    return [list(r) for r in wb[name].iter_rows(min_row=2, values_only=True)
            if any(v not in (None, '') for v in r)]


def text(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip()


def num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def iso(v):
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=TZ)
        return v.isoformat(timespec='milliseconds')
    return text(v)


def pad(r, n):
    return (r + [None] * n)[:n]


def convert(src):
    wb = openpyxl.load_workbook(src, data_only=True)
    notes = []

    # ---- Guru (betulkan ID berulang) ----
    guru, seen, max_n = [], set(), 0
    raw_guru = [pad(r, 4) for r in rows(wb, 'DB_Guru')]
    for r in raw_guru:
        digits = ''.join(c for c in text(r[0]) if c.isdigit())
        if digits:
            max_n = max(max_n, int(digits))
    remap_guru = {}  # nama guru -> ID baharu
    for r in raw_guru:
        gid, nama = text(r[0]), text(r[1])
        if not nama:
            continue
        if not gid or gid in seen:
            max_n += 1
            new_id = f'G{max_n:02d}'
            notes.append(f'Guru "{nama}": ID {gid or "(kosong)"} berulang, ditukar ke {new_id}')
            remap_guru[nama] = new_id
            gid = new_id
        seen.add(gid)
        guru.append([gid, nama, text(r[2]), num(r[3])])

    kelas = [[text(r[0]), text(r[1]), num(r[2]) or text(r[2]), text(r[3])]
             for r in (pad(r, 4) for r in rows(wb, 'DB_Kelas')) if text(r[1])]
    subjek = [[text(r[0]), text(r[1]), text(r[2]), num(r[3])]
              for r in (pad(r, 4) for r in rows(wb, 'DB_Subjek')) if text(r[1])]

    def trans_row(r):
        # [Timestamp, ID_Guru, Nama Guru, ID_Kelas, Nama Kelas, ID_Subjek, Nama Subjek, Masa, UUID, Label, Pecahan]
        r = pad(r, 11)
        masa = num(r[7])
        nama_guru = text(r[2])
        return [
            iso(r[0]),
            remap_guru.get(nama_guru, text(r[1])), nama_guru,
            text(r[3]), text(r[4]),
            text(r[5]), text(r[6]),
            masa,
            text(r[8]) or str(uuid.uuid4()),
            text(r[9]),
            text(r[10]) or str(masa),
        ]

    transaksi = [trans_row(r) for r in rows(wb, 'DB_Transaksi')]
    arkib = [[text(r[0]), iso(r[1])] + trans_row(pad(r, 13)[2:13]) for r in rows(wb, 'DB_Arkib')]

    tetapan = {'Kata_Laluan': 'admin123'}
    for r in rows(wb, 'DB_Tetapan'):
        if text(r[0]):
            tetapan[text(r[0])] = text(r[1] if len(r) > 1 else '')

    # ---- Semakan rujukan ----
    gid_set = {g[0] for g in guru}
    sid_set = {s[0] for s in subjek}
    bad_g = collections.Counter(t[2] for t in transaksi if t[1] not in gid_set)
    bad_s = collections.Counter(t[6] for t in transaksi if t[5] not in sid_set)
    if bad_g:
        notes.append(f'AMARAN: agihan dengan guru tiada dalam DB_Guru: {dict(bad_g)}')
    if bad_s:
        notes.append(f'AMARAN: agihan dengan subjek tiada dalam DB_Subjek: {dict(bad_s)}')

    db = {'guru': guru, 'kelas': kelas, 'subjek': subjek,
          'transaksi': transaksi, 'arkib': arkib, 'tetapan': tetapan}
    return db, notes


def write_zip(db, out):
    counts = {k: len(db[k]) for k in ('guru', 'kelas', 'subjek', 'transaksi')}
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('manifest.json', json.dumps({
            'app': 'VisiJadual Pro v2', 'format': ZIP_FORMAT_VERSION,
            'savedAt': datetime.now(TZ).isoformat(timespec='milliseconds'),
            'counts': counts, 'source': 'xlsx_ke_zip.py',
        }, indent=2, ensure_ascii=False))
        for key in ('guru', 'kelas', 'subjek', 'transaksi', 'arkib', 'tetapan'):
            z.writestr(f'data/{key}.json', json.dumps(db[key], indent=1, ensure_ascii=False))
        z.writestr('BACA_SAYA.txt',
                   'Fail data VisiJadual Pro v2.\r\n'
                   'Buka fail ZIP ini melalui butang "Buka" dalam aplikasi VisiJadual.\r\n'
                   'Jangan ubah struktur folder "data/" secara manual.\r\n')
    return counts


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else src.rsplit('.', 1)[0] + '.zip'
    db, notes = convert(src)
    counts = write_zip(db, out)
    print(f'Siap: {out}')
    print(f'  {counts["guru"]} guru, {counts["kelas"]} kelas, {counts["subjek"]} subjek, '
          f'{counts["transaksi"]} agihan, {len(db["arkib"])} rekod arkib')
    for n in notes:
        print('  - ' + n)
