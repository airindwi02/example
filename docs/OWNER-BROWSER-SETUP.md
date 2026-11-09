# Owner pertama melalui formulir Sign Up

## Status pekerjaan

Kode disiapkan, tidak diaktifkan pada konfigurasi asli. Tidak ada undangan untuk database asli yang diterbitkan dan tidak ada Owner sumber yang dibuat/diubah. Pembacaan sumber terakhir: delapan akun, tepat satu Owner PENDING, lima akun seed tetap sama untuk ID/nama/username/password/role. Schema Prisma, stok, barang, dan transaksi tidak diubah.

Pengguna menggunakan `/register` yang sama: pilih Owner, isi nama, username baru, kontak, password, konfirmasi, dan kode setup administrator. Tidak ada password akun yang diminta melalui terminal. Password di-hash Argon2id pada server. Setelah setup sah, akun baru ACTIVE dan diarahkan ke `/login?registered=active&role=owner`, kemudian dapat masuk `/owner`. Owner lama tidak pernah dipakai ulang, diaktifkan, atau diganti passwordnya.

## Otorisasi administrator dan kode setup

Penerbit lokal `scripts/issue-owner-invite.ps1` mensyaratkan token administrator Windows yang sungguh elevated, UAC aktif, kebijakan yang tidak melepas prompt elevasi, dan secure desktop. Tidak ada parameter untuk mengaku sebagai administrator dan tidak ada fallback environment/localhost sebagai bukti kewenangan. Penerbit juga meminta konfirmasi eksplisit bahwa administrator telah memverifikasi identitas penerima username baru. Ini otorisasi akun administrator OS plus verifikasi penerima oleh administrator, bukan klaim Windows Hello/biometrik atau OTP email otomatis.

Utilitas dijalankan melalui RunAs/UAC. Standard user harus mendapat persetujuan/credential administrator melalui dialog Windows. PowerShell memakai RemoteSigned hanya pada proses tersebut untuk script lokal; tidak mengubah kebijakan sistem dan tidak melewati Group Policy. Jika organisasi melarangnya, atau token/UAC/ACL tidak sesuai, proses berhenti. Alternatif yang perlu ditinjau adalah utilitas lokal bertanda tangan administrator; jangan mengganti pemeriksaan dengan flag sederhana.

Penerbit melakukan SELECT read-only untuk memastikan username belum ada dan masih hanya terdapat satu Owner lama PENDING dengan password yang belum diinisialisasi. Lalu menerbitkan kode bertanda tangan RSA-SHA256 dengan jti acak 256-bit, username penerima, binding database, fingerprint baseline Owner lama, dan masa berlaku 15 menit. Tidak ada kode/secret/hash kode yang ditanam dalam source, Git, URL, atau log. Kode ditampilkan hanya melalui dialog lokal terlindungi untuk disalin ke formulir; jangan membagikannya atau memakai perekaman layar/clipboard history.

Private key hanya berada dalam memori penerbit dan tidak dipersistenkan. Public key dan digest payload berada di `%ProgramData%\ALANA\OwnerSetup\public.json` dengan owner/ACL Administrator dan SYSTEM untuk penulisan, pengguna hanya membaca. Server memeriksa ACL dan reparse point sebelum mempercayainya. Lokasi ini tidak dapat dipilih melalui request/URL atau diganti dengan public key dari browser. File state konsumsi berada di `%ProgramData%\ALANA\OwnerSetupState`, ditulis hanya akun OS server yang ditentukan administrator serta Administrator/SYSTEM.

Jika direktori trust/state sudah ada, penerbit menolak menerbitkan lagi. Kode kedaluwarsa tidak diperbarui otomatis; diperlukan pemeriksaan administrator dan prosedur pemulihan tersendiri. Jangan menghapus file untuk mengulang sendiri.

## Sekali pakai, konkurensi, dan restart

Server memeriksa signature, digest payload terotorisasi, username, database, expiry, dan baseline Owner lama. Sebelum membuat Owner, transaksi memperoleh advisory lock PostgreSQL yang sama untuk seluruh jalur setup/permintaan Owner. Setelah lock didapat, seluruh kondisi diperiksa ulang.

Reservasi file per database dibuat atomik dengan exclusive-create dan fsync sebelum INSERT/COMMIT. File tidak pernah dihapus untuk percobaan ulang otomatis. Bila proses mati sebelum commit, PostgreSQL rollback, tetapi reservasi tetap terkunci (fail closed). Bila commit berhasil namun response terputus, akun baru tetap dapat Login dan pengulangan setup ditolak. Ketika Owner hasil bootstrap sudah ada, pemeriksaan database juga menolak setup ulang, meski status Owner itu kemudian berubah atau file reservasi hilang. Undangan baru tidak boleh memakai baseline sebelum setup.

Lingkup jaminan adalah satu komputer lokal dengan filesystem persisten yang sama dan administrator/akun OS aplikasi tepercaya. Ini bukan deployment beberapa mesin dengan state lokal masing-masing, dan bukan perlindungan terhadap administrator yang sengaja menghapus akun/merollback database sekaligus menghapus state. Untuk lingkungan tersebut dibutuhkan penyimpanan bootstrap/transaksi yang otoritatif bersama; perubahan schema/layanan tambahan memerlukan persetujuan terpisah. Aplikasi ini tidak otomatis menerapkan perubahan itu.

## Owner berikutnya

Tanpa kode setup, role Owner hanya dapat membuat permintaan PENDING bila `ALANA_OWNER_REQUESTS=enabled` dan database sudah memiliki Owner ACTIVE. Memilih Owner tidak pernah memberi ACTIVE secara otomatis. Owner aktif harus Login dan memverifikasi ulang password untuk menyetujui, bukan pemohon sendiri. Jalur persetujuan tetap memakai pemeriksaan server dan transaksi yang ada. `ALANA_APPROVALS` mengendalikan pengaktifan antarmukanya.

## Pengujian yang benar-benar dilakukan

- `node --conditions=react-server --import tsx scripts/test-owner-setup.cjs`: PostgreSQL sementara dengan 15 tabel referensi dan lima akun sintetis.
- Signature salah, expiry, binding database/username salah: ditolak tanpa akun baru.
- Dua pendaftaran bersamaan: satu commit, satu ditolak; replay dan setup kedua ditolak.
- Proses anak dihentikan mendadak setelah reservasi: transaksi rollback, reservasi tetap menolak percobaan setelah restart.
- Owner lama dan empat staf sintetis tidak berubah/PENDING.
- Pendaftaran Owner berikutnya melalui formulir browser: password Argon2id, akun PENDING, Login ditolak sebelum persetujuan.
- Browser nyata: Login Owner hasil setup ke `/owner`, cookie HttpOnly, Logout, akses tanpa Login ditolak, Kasir tidak dapat membuka `/owner`.
- Penerbit Windows `-CheckOnly` menolak token non-administrator. Kedua script PowerShell lolos parsing.

Otoritas penandatanganan pada uji integrasi adalah key RSA fixture acak di memori, hanya untuk database uji; tidak ada bypass fixture dalam kode server asli. **Penerbitan undangan melalui UAC administrator yang sah belum dijalankan. Karena itu pengiriman formulir bootstrap dengan kode dari penerbit Windows belum diuji end-to-end di browser.** Cabang kriptografi/transaksi valid diuji langsung, sedangkan Login/Logout dan pendaftaran Owner tambahan diuji di browser. Jangan menyebut seluruh rantai UAC sampai Sign Up pertama sudah terverifikasi.

## Langkah aktivasi localhost — hanya setelah izin pembuatan Owner sumber

1. Gunakan username baru, berbeda dari Owner PENDING lama. Pastikan backup terbaru dan administrator lokal tersedia. Jangan jalankan langkah penerbitan pada database asli tanpa izin berikutnya.
2. Hentikan server dev lama. Pada PowerShell biasa di `E:\example`, aktifkan sementara:

```powershell
$env:ALANA_DATABASE_AUTH = 'enabled'
$env:ALANA_SIGNUP = 'enabled'
$env:ALANA_LOCAL_STAFF_SIGNUP = 'enabled'
$env:ALANA_OWNER_BOOTSTRAP = 'enabled'
$env:ALANA_OWNER_REQUESTS = 'enabled'
$env:ALANA_APPROVALS = 'enabled'
$env:ALANA_SESSION_SECRET = [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
npm run dev -- --hostname 127.0.0.1
```

3. Di PowerShell biasa lain, dari folder project, terbitkan izin sekali pakai. Ganti `owner_baru` dengan username yang akan dipakai pada formulir. Akun Windows normal server ditentukan oleh SID, bukan username frontend:

```powershell
$serverSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value
Start-Process powershell.exe -Verb RunAs -ArgumentList @('-NoProfile','-ExecutionPolicy','RemoteSigned','-File','E:\example\scripts\issue-owner-invite.ps1','-Username','owner_baru','-ServerUserSid',$serverSid)
```

Administrator menanggapi UAC dan dialog persetujuan identitas. Kode hanya muncul pada dialog lokal, tidak di terminal. Jangan lanjut jika pemeriksaan gagal; tidak ada penonaktifan pengaman otomatis.

4. Buka `http://127.0.0.1:3000/register?role=owner`. Isi kode setup dan formulir yang sama seperti staf. Username harus sama dengan undangan. Buat password melalui browser, tekan Sign up, kemudian Login dan buka `/owner`.
5. Setelah berhasil, hapus flag `ALANA_OWNER_BOOTSTRAP` dari environment dan restart dev server; state dan guard database tetap menolak setup ulang walaupun flag lupa dihapus. Jangan menghapus direktori trust/state. Pendaftaran Owner berikutnya menjadi PENDING dan diputuskan melalui `/owner/persetujuan`.

File yang ditambahkan: lib/owner-invite-core.ts, lib/owner-setup-service.ts, lib/owner-setup.ts, scripts/check-owner-trust.ps1, scripts/issue-owner-invite.ps1, scripts/owner-invite-preflight.cjs, scripts/owner-setup-crash-probe.cjs, scripts/test-owner-setup.cjs, dan dokumen ini. Integrasi di auth-config, auth-local, repository/actions, AuthMode, AuthForm, layout, dan unit test. Tidak ada schema/migrasi tambahan atau akun sumber yang dibuat.

Referensi perilaku UAC dan token elevasi: [Microsoft Learn](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/how-it-works). UAC dapat meminta consent atau credential sesuai kebijakan Windows; aplikasi tidak mengklaim bahwa setiap elevasi selalu meminta password baru.

Verifikasi akhir tahap kode: 19/19 unit test lulus, lint lulus, build lulus (34 halaman), pengujian integrasi Owner terisolasi lulus, dan regresi browser Sign Up/Login/Logout Kasir serta pendaftaran Barista lulus. Uji UAC administrator sukses dan Sign Up bootstrap browser penuh tetap prasyarat manual sebelum aktivasi asli; tidak ada klaim bahwa kedua uji tersebut telah dilakukan.
