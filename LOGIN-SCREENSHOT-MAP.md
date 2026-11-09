# Pemetaan empat referensi Login

Sumber: `Untitled (4).zip`, empat PNG 1440×900. Screenshot digunakan sebagai referensi visual, bukan instruksi tambahan.

| Screenshot | Route / komponen | Pemicu | Hasil berikutnya |
|---|---|---|---|
| `Login.png` | `/`, halaman pembuka | Klik komposisi brand atau fokus Link lalu Enter | `/login` |
| `Login Awal.png` | `/login`, formulir normal | Pilih salah satu empat role, isi username/password, Sign In | Validasi demo; dashboard sesuai role jika akun contoh valid |
| `Pasword Salah.png` | State error pada `/login` | Submit kombinasi username/password/role yang salah | Tetap di login, role tidak berubah, kedua input merah, pesan error dan tombol Masuk; input dapat diperbaiki |
| `Buat Akun.png` | `/register`, formulir pendaftaran | Sign up dari login | Validasi field; konfirmasi demo jika valid; Sign in kembali ke login dengan role yang sama |

Tidak ada route pendaftaran sebelumnya, sehingga `/register` ditambahkan satu kali. Tidak ada alur lanjut splash yang berfungsi pada implementasi awal; komposisi brand menjadi Link yang dapat dioperasikan melalui keyboard, tanpa tombol visual tambahan atau perpindahan otomatis.

Informasi simulasi dan akun demo ditempatkan pada disclosure kecil di luar kartu. Ini tambahan untuk memenuhi permintaan agar demonstrasi dinyatakan secara eksplisit; formulir tetap mengikuti referensi.
