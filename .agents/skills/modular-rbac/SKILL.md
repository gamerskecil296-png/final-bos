---
name: modular-rbac
description: Panduan arsitektur dan standar implementasi Role-Based Access Control (RBAC) berbasis Modul (bukan role silo) untuk proyek final-bos. Gunakan skill ini setiap kali membuat, mengedit, atau men-debug fitur terkait otentikasi, otorisasi, manajemen route, dan UI berbasis hak akses.
---

# Modular RBAC Guidelines (final-bos)

Aplikasi `final-bos` menggunakan pendekatan **Module-Based RBAC** yang lebih modern dibandingkan pendekatan Role-Silo tradisional. Panduan ini harus selalu ditaati saat membangun fitur baru atau melakukan *refactoring*.

## 1. Konsep Dasar

- **Tinggalkan Pemikiran Silo Role**: Jangan pernah berpikir *"Ini halaman untuk Mahasiswa, ini halaman untuk Dosen"*. Berpikirlah *"Ini adalah modul Kencana, permission apa saja yang dibutuhkan untuk melihat dan mengedit isinya?"*.
- **Role Hanyalah Wadah**: Di database, Role (misal: `mahasiswa`, `admin`) hanyalah array/kumpulan dari string permission. Semua evaluasi hak akses di dalam kode **harus berdasarkan Permission**, bukan pengecekan nama role.
- **Standarisasi Penamaan Permission**: Gunakan format `<nama_modul>.<sub_modul>.<aksi>`.
  - Contoh benar: `kencana.mentoring.view`, `akademik.grades.edit`, `kesehatan.booking.create`.
  - Contoh salah: `mahasiswa_kencana`, `admin_can_edit_score`.

## 2. Standar Frontend (React/Vite)

### A. Dynamic Layout & Unified Routing
Semua *authenticated user* akan diarahkan ke base route `/app/...`. Tidak ada lagi pembagian *root path* yang kaku seperti `/student`, `/faculty`, atau `/admin`.
1. **Dynamic Sidebar**: Sidebar harus me-render item menu berdasarkan permission. Gunakan array navigasi di mana setiap item memiliki properti `requiredPermission`.
2. **Module Route Protection**: Semua rute halaman modul harus dibungkus oleh komponen `<ProtectedRoute required="module_name.view">`.

### B. Component-Level Rendering (Feature Toggles)
Tombol atau bagian UI yang sensitif (seperti fitur Hapus, Edit, Tambah) harus disembunyikan menggunakan komponen pembungkus jika user tidak memiliki izin spesifik.
**Contoh Implementasi yang Diharapkan:**
```jsx
// Jangan gunakan ini:
// { user.role === 'admin' && <button>Edit</button> }

// Gunakan ini:
<HasPermission required="kencana.score.edit">
  <button>Edit Nilai</button>
</HasPermission>
```

## 3. Standar Backend (Golang)

### A. Middleware Berbasis Permission Murni
- Middleware **tidak boleh** memiliki logika *hardcoded bypass* berdasarkan nama role (misal: `if role == "mahasiswa" { ... }`).
- Middleware tugas utamanya hanya mengekstrak array permission dari token JWT (atau context/database) dan memeriksa keberadaan permission target.

### B. API Route Grouping by Module
Pengelompokan rute API harus berdasarkan domain/modul dan dilindungi di level grup (jika memungkinkan) atau per endpoint.
**Contoh Implementasi yang Diharapkan:**
```go
// Group Modul Akademik
akademikGroup := api.Group("/akademik")
akademikGroup.Use(middleware.RequirePermission("akademik.view"))

// Spesifik endpoint
akademikGroup.Post("/grades", middleware.RequirePermission("akademik.grades.edit"), controllers.UpdateGrade)
```

## 4. Checklist Saat Menambahkan Modul Baru

Jika Anda diminta untuk membangun modul baru (misal: Modul Asrama), ikuti langkah ini:
1. Definisikan list permission modul tersebut (contoh: `asrama.view`, `asrama.booking.create`, `asrama.rooms.edit`).
2. Buat Backend routes dengan middleware `RequirePermission` sesuai desain permission di atas.
3. Buat direktori halaman frontend di `src/pages/modules/asrama`.
4. Tambahkan rute frontend di bawah `/app/asrama` dan lindungi rutenya dengan `<ProtectedRoute>`.
5. Daftarkan menu navigasi Asrama di konfigurasi sidebar dengan `requiredPermission: 'asrama.view'`.

## 5. Dilarang Keras (Do Not Do This)

- **JANGAN** membuat *hardcoded routing* yang membypass logic utama berdasarkan kondisi nama role tertentu.
- **JANGAN** menduplikasi UI yang sama persis di 2 tempat berbeda hanya karena diakses oleh role yang berbeda (misal: `KencanaAdminPage` dan `KencanaStudentPage`). Buat satu modul `KencanaPage` dan sembunyikan/tampilkan fitur di dalamnya dengan `<HasPermission>`.
