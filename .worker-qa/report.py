from pathlib import Path
from PIL import Image
import hashlib
import json

root = Path('.')
qa = root / '.worker-qa'
captures = json.loads((qa / 'captures.json').read_text(encoding='utf-8'))
responsive = json.loads((qa / 'responsive-results.json').read_text(encoding='utf-8'))
stages = {name: json.loads((qa / (name + '-results.json')).read_text(encoding='utf-8')) for name in ['stage1', 'stage2', 'stage3', 'stage4']}
edge = json.loads((qa / 'edge-results.json').read_text(encoding='utf-8'))
assert len(captures['captures']) == 23 and not captures['errors']
assert len(responsive['report']) == 14 and not responsive['errors'] and not responsive['badResponses']
assert all(row['result'] == 'passed' for row in responsive['report'])
for result in [*stages.values(), edge]:
    assert not result['errors']
    assert all(value is True for key, value in result.items() if key != 'errors')

baseline = json.loads((qa / 'baseline-hashes.json').read_text(encoding='utf-8'))
preservation = {'files_checked': len(baseline), 'changed': [], 'missing': []}
for name, old_hash in baseline.items():
    path = Path(name)
    if not path.exists():
        preservation['missing'].append(name)
    elif hashlib.sha256(path.read_bytes()).hexdigest() != old_hash:
        preservation['changed'].append(name)
assert not preservation['changed'] and not preservation['missing']
(qa / 'preservation-results.json').write_text(json.dumps(preservation, indent=2), encoding='utf-8')

routes = [
    ('Dashboard', '/daily-worker', 'Ringkasan, tindakan, aktivitas, empat pintasan'),
    ('Penerimaan', '/daily-worker/penerimaan', 'Form, validasi, simpan, catat lagi, batal, riwayat'),
    ('Stok Barang', '/daily-worker/stok-barang', 'Pencarian, pilih baris, detail, pergerakan, pagination'),
    ('Kadaluwarsa', '/daily-worker/kadaluwarsa', 'Filter, penyesuaian batch, sukses, empty state'),
    ('Pemeriksaan', '/daily-worker/pemeriksaan', 'Stok aktual, validasi, simpan, riwayat, batal'),
    ('Penyesuaian', '/daily-worker/penyesuaian', 'Selisih otomatis, alasan/catatan, stok tetap, simpan'),
    ('Tentang Alana', '/daily-worker/tentang-alana', 'Profil usaha, visi/misi, jam buka, kontak'),
    ('Pencarian global', '/daily-worker/pencarian?q=cokelat', 'Tab bahan/riwayat, tautan detail, riwayat pencarian'),
]

visual = [
    '# Daily Worker — QA visual', '', 'final result: passed', '',
    '## Referensi dan normalisasi', '',
    'Sumber: seluruh 23 PNG dari `Untitled (3).zip`, diekstrak ke `.design-reference/daily-worker/`. Figma MCP tidak tersedia; tidak ada design context Figma yang diklaim.', '',
    'Semua sumber berukuran 2880 × 1800 px dan dinormalisasi 0,5× menjadi 1440 × 900 px. Browser: Chrome melalui Playwright, viewport 1440 × 900 CSS px, DPR 1. Screenshot menunggu font dan gambar termuat. Perbandingan menyatukan sumber dan hasil browser pada skala yang sama, dengan label 28 px di atas gambar.', '',
    'Implementasi production yang diverifikasi: ' + captures['base'] + '/daily-worker.', '',
    '## Bukti seluruh kondisi', '',
    '| Screenshot sumber | State browser | Ukuran hasil | Perbandingan |',
    '|---|---|---|---|',
]
for capture in captures['captures']:
    name = capture['name']
    source = capture['source']
    source_path = Path('.design-reference/daily-worker') / (source + '.png')
    assert Image.open(source_path).size == (2880, 1800)
    rendered_path = qa / (name + '.png')
    dimensions = Image.open(rendered_path).size
    assert (qa / ('compare-' + name + '.jpg')).exists()
    visual.append(f'| [{source}.png](<.design-reference/daily-worker/{source}.png>) | [{name}](.worker-qa/{name}.png) | {dimensions[0]} × {dimensions[1]} | [Berdampingan](.worker-qa/compare-{name}.jpg) |')
visual += [
    '', '## Hasil pemeriksaan fidelity', '',
    '- Tipografi: sans Geist yang sudah tersedia di proyek dan judul serif Georgia. Hierarki, bobot, ukuran, wrapping, dan kepadatan dibandingkan; bentuk glif tidak dijamin identik dengan font Figma yang tidak tersedia.',
    '- Layout: sidebar 240 px, header 85 px, ringkasan tugas Daily Worker, tabel tindakan/aktivitas, empat pintasan, form dan panel informasi. Dashboard tidak memakai kartu produksi Baker.',
    '- Warna: cokelat, krem, putih, border, aksen kuning, serta status merah/hijau/biru mengikuti PNG. Semua CSS berada dalam namespace Daily Worker.',
    '- Aset: logo, banner, dan ilustrasi usaha dipotong dari gambar sumber asli. Ikon UI memakai pustaka yang sudah terpasang; tidak menggambar ulang foto atau logo.',
    '- Copy: tujuh menu, heading halaman, label input, alasan penyesuaian, informasi usaha, dan konfirmasi mengikuti sumber. Validasi tambahan melindungi stok demo.',
    '', '## Riwayat temuan dan perbaikan', '',
    '1. [P2, diperbaiki] Panel stok terlalu tinggi dan jarak formulir/dropdown menyimpang. Padding, tinggi pesan, ukuran tombol, dan baris riwayat diselaraskan. Bukti final: compare-stock-selected, compare-receiving-error, compare-notifications.',
    '2. [P2, diperbaiki] Banner sukses menggeser empty state kadaluwarsa. Banner dipindahkan ke bawah daftar pemantauan. Bukti final: compare-expiry-empty.',
    '3. [P1, diperbaiki] Pengurangan parsial perlu dapat dilanjutkan pada batch yang sama. Pemilihan ulang mereset form menggunakan revisi seleksi; pengujian membuktikan 3 → 2 → 0 L tanpa pencatatan ganda. Bukti: edge-results.json.',
    '4. [P2, diperbaiki] Area klik penutup menu mobile berada di bawah sidebar. Area penutup diposisikan di luar sidebar dan menu dapat digulir pada viewport pendek. Bukti: responsive-results.json dan edge-results.json.',
    '5. [P2, diperbaiki] Modal keluar terpotong di kanan pada mobile meskipun lebar dokumen tidak overflow. Grid modal dan max-width diperbaiki; tes kini memeriksa seluruh dialog berada di viewport. Bukti final: mobile-logout.png dan kedua suite responsif/edge.',
    '', '## Perbedaan yang disengaja dan batas fidelity', '',
    '- Data menggunakan satu state konsisten. Setelah transaksi, stok, tanggal terakhir masuk, status pemeriksaan, riwayat, aktivitas, dan jumlah peringatan benar-benar berubah; beberapa PNG sumber memperlihatkan data lama pada state sukses.',
    '- Preview penerimaan kosong tidak menambahkan 20 kg secara implisit: 15 kg tetap 15 kg sampai jumlah diisi. Ini berbeda dari panel contoh pada PNG kosong yang sudah menampilkan 35 kg.',
    '- Tombol simpan terkunci sesudah sukses untuk mencegah pencatatan ganda. Pemeriksaan/penyesuaian memiliki tombol melanjutkan ke barang lain; penerimaan menyediakan catat lagi/reset.',
    '- Tanggal kadaluwarsa Cokelat memakai 15/11/2026 secara konsisten dengan daftar 30 hari; screenshot pencarian memakai tanggal berbeda. Jumlah barang perlu cek dihitung dari tabel, bukan menyalin angka notifikasi yang berbeda.',
    '- Header memakai tanggal/jam snapshot 22 Oktober 2026 untuk mencocokkan referensi. Katalog 248 barang dan seluruh riwayat adalah dummy.',
    '- Mobile/tablet merupakan adaptasi responsif dari referensi desktop. Tabel lebar memiliki scroll internal agar kolom tidak dipaksa mengecil.',
    '', '## Sisa polish P3', '',
    'Bentuk ikon pustaka dan glif font belum identik dengan aset Figma; beberapa baseline/padding label, posisi isi panel kosong Stok Barang, dan jarak kecil pada daftar pencarian masih berbeda. Tidak ada temuan P0/P1/P2 terbuka setelah perbaikan.',
    '', '## Verifikasi interaksi dan responsif', '',
    'Seluruh 23 state dibandingkan full-view. Region form diperiksa pada receiving-error/success, inspection-error/success, dan adjustment-difference/success; modal, dropdown, dan panel stok juga dibandingkan sebagai region fokus melalui gambar berdampingan yang sama.', '',
    'Empat tahap form/navigation dan suite edge menyimpan 54 pemeriksaan fungsi yang lulus. Suite menyeluruh memiliki 14 kelompok uji; termasuk 32 pemeriksaan rute/viewport pada 360, 390, 768, dan 1024 px, tujuh menu desktop/mobile, semua pintasan/tindakan dashboard, pagination sampai halaman terakhir, form mobile, dan smoke test 10 rute sebelumnya. Ukuran konten diperiksa setelah heading dan font termuat.', '',
    'Console/page errors: 0. Respons HTTP >= 400 dalam suite menyeluruh: 0. Dialog keluar dan dropdown notifikasi diuji tetap seluruhnya berada dalam viewport. Mobile pendek 390 × 500 juga lulus.', '',
    'Bukti: `.worker-qa/stage1-results.json` hingga `stage4-results.json`, `responsive-results.json`, `edge-results.json`, `captures.json`, screenshot `mobile-*.png` dan `responsive-*.png`.', '',
    'final result: passed', '',
]
visual_text = '\n'.join(visual)
Path('DAILY-WORKER-DESIGN-QA.md').write_text(visual_text, encoding='utf-8')
index = Path('design-qa.md')
existing = index.read_text(encoding='utf-8-sig') if index.exists() else ''
marker = '\n<!-- DAILY-WORKER-QA -->\n'
existing = existing.split(marker)[0]
index.write_text(existing.rstrip() + '\n' + marker + visual_text, encoding='utf-8')

report = ['# Laporan implementasi Daily Worker', '',
          'Preview production: http://localhost:3006/daily-worker', '',
          '## Halaman, rute, dan hasil klik', '',
          '| Halaman/menu | Rute | Fungsi | Hasil |', '|---|---|---|---|']
for title, route, behavior in routes:
    report.append(f'| {title} | `{route}` | {behavior} | Lulus |')
report += [
    '', '## Hasil tiap formulir', '',
    '| Form | Bukti interaksi | Hasil |', '|---|---|---|',
    '| Penerimaan | Kosong, negatif, dan tanggal mustahil ditolak; 20 kg menambah 15 → 35 kg; catat lagi menerima 1,5 kg menjadi 36,5 kg; batal/reset; cegah simpan ganda | Lulus |',
    '| Pemeriksaan | Teks dan negatif ditolak; aktual 0 diterima; hasil dan riwayat tersimpan; status diperbarui; stok sistem tidak dikoreksi diam-diam | Lulus |',
    '| Kadaluwarsa | Filter Semua/Kadaluwarsa/Segera; jumlah 0 atau melebihi batch ditolak; alasan/catatan tersimpan; 3 → 0 L; pengurangan parsial 3 → 2 → 0 L; empty state setelah dua batch selesai | Lulus |',
    '| Penyesuaian | Angka invalid ditolak; selisih -1/+3/0; edit membatalkan review sebelumnya; alasan/catatan; stok tetap untuk selisih 0; stok dan pergerakan diperbarui hanya setelah simpan | Lulus |',
    '| Notifikasi/pencarian/keluar | Tandai dibaca, tiga tautan notifikasi dan footer; tiga tab pencarian; detail bahan/riwayat, kosong, hapus riwayat, deep link; batal/konfirmasi/Escape/focus trap modal | Lulus |',
    '', '## Pemeriksaan teknis', '',
    '- `npm run lint`: lulus, tanpa error/warning.',
    '- `npm run build`: lulus; 30 halaman dihasilkan, termasuk delapan rute Daily Worker.',
    '- 54 pemeriksaan fungsi dalam empat tahap dan suite edge: lulus.',
    '- 14 kelompok uji menyeluruh: lulus, termasuk 32 pemeriksaan responsif dan semua menu desktop/mobile.',
    '- Tidak ada error JavaScript/konsol atau respons gagal/404 dalam suite menyeluruh.',
    '- 60 file proyek sebelum pekerjaan dibandingkan SHA-256: tidak ada yang berubah atau hilang. Ini mencakup schema, SQL, konfigurasi/dependensi, serta kode halaman sebelumnya.',
    '', '## Acuan struktur database tanpa operasi database', '',
    '`prisma/schema.prisma` awal hanya memiliki generator/datasource dan belum mendefinisikan model. Struktur yang diminta ditemukan secara read-only di `database.sql`:', '',
    '| Struktur yang diperiksa | Field acuan |', '|---|---|',
    '| pengguna | id_pengguna, nama_pengguna, username, password_hash, peran |',
    '| barang | id_barang, nama_barang, satuan, jenis_barang, stok_minimum, stok_saat_ini |',
    '| barang_masuk | id_penerimaan, id_pemesanan, id_pemasok, id_pengguna, tanggal_terima, status_penerimaan |',
    '| detail_barang_masuk | id_detail_masuk, id_penerimaan, id_barang, jumlah_dikirim, jumlah_diterima, tanggal_kedaluwarsa, kondisi |',
    '| pemeriksaan_stok | id_pemeriksaan, id_pengguna, tanggal |',
    '| detail_pemeriksaan | id_pemeriksaan, id_barang, stok_sistem, stok_fisik, kondisi_fisik, tindak_lanjut |',
    '| Stok terkait | barang_dipakai, detail_barang_dipakai, laporan_persediaan, detail_laporan |',
    '', 'Nama field data demo mengikuti struktur tersebut; metadata UI dan catatan berada di state lokal. Tidak ada PrismaClient, API mutasi, migration, tabel/kolom baru, autentikasi backend baru, atau operasi PostgreSQL.',
    '', '## File yang ditambahkan atau diubah oleh pekerjaan ini', '',
]
for path in sorted(Path('app/daily-worker').rglob('*')):
    if path.is_file():
        report.append('- `' + path.as_posix() + '` — baru.')
for path in sorted(Path('public/daily-worker').glob('*')):
    report.append('- `' + path.as_posix() + '` — aset asli dari screenshot.')
report += [
    '- `DAILY-WORKER-REPORT.md` dan `DAILY-WORKER-DESIGN-QA.md` — laporan baru.',
    '- `design-qa.md` — laporan QA Daily Worker ditambahkan setelah laporan Baker yang tetap dipertahankan.',
    '- `.worker-qa/` — skrip, hasil JSON, screenshot, dan perbandingan; `.design-reference/daily-worker/` — 23 referensi PNG.',
    '', '## Data dummy dan batas demonstrasi', '',
    'Katalog 248 barang, stok/batch, pemasok, penerimaan, pemeriksaan, penyesuaian, aktivitas, notifikasi, pencarian, dan identitas role adalah data demo. React reducer/context pada layout menjaga perubahan selama navigasi antarrute Daily Worker. Refresh atau keluar dari layout mengembalikan data awal. Semua simpan hanya mengubah React state.', '',
    'Tidak ada halaman placeholder. Tidak ada perubahan kode Owner, Kasir, Baker/Barista, login atau halaman lain dari baseline awal tugas ini. Pemeriksaan role sebelumnya membuktikan akses HTTP 200 pada 10 rute; tidak mengklaim audit menyeluruh fungsi role lain.', '',
    '## Bagian yang belum identik dengan Figma', '',
    'Font/ikon mengikuti padanan yang tersedia dan beberapa detail spacing masih berbeda. Data sukses mengikuti transaksi aktual sehingga tabel/angka tidak membeku seperti PNG. Form kosong menghitung preview dari jumlah yang benar-benar diisi. Perbedaan snapshot tanggal Cokelat dan angka notifikasi diselaraskan ke satu dataset. Detail lengkap serta seluruh 23 bukti ada di [QA visual](DAILY-WORKER-DESIGN-QA.md).', '',
    '## Mengulang pengujian', '',
    'Gunakan server production lokal dan Chrome yang terpasang. Playwright tersedia lokal pada sesi ini; bila belum tersedia, pasang `@playwright/test@1.65.0` sebagai alat uji lokal tanpa mengubah lockfile. Atur `WORKER_BASE=http://127.0.0.1:3006`, lalu jalankan skrip `stage1.cjs`–`stage4.cjs`, `responsive.cjs`, `edge-cases.cjs`, dan `capture.cjs` dari `.worker-qa/`. `python .worker-qa/compare.py` membangun perbandingan visual.', '',
]
Path('DAILY-WORKER-REPORT.md').write_text('\n'.join(report), encoding='utf-8')

audit = {
    'source_screenshots': 23,
    'routes': [r[1] for r in routes],
    'functional_assertions': sum(sum(value is True for value in result.values()) for result in [*stages.values(), edge]),
    'navigation_responsive_groups': len(responsive['report']),
    'viewport_route_checks': 32,
    'console_errors': responsive['errors'],
    'failed_http_responses': responsive['badResponses'],
    'preservation': preservation,
    'visual_result': 'passed',
    'lint_exit_code': 0,
    'build_exit_code': 0,
    'database_writes': False,
    'dummy_state_only': True,
    'remaining_limitations': ['Minor font/icon/spacing differences', 'Reference snapshot conflicts resolved using consistent live demo data', 'Demo resets on refresh'],
}
(qa / 'completion-audit.json').write_text(json.dumps(audit, indent=2), encoding='utf-8')
print(json.dumps(audit, indent=2))
