//go:build ignore

package main

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func execOrFatal(query string) {
	err := config.DB.Exec(query).Error
	if err != nil {
		fmt.Printf("Error exec %s: %v\n", query, err)
	}
}

func main() {
	err := godotenv.Load("../.env")
	if err != nil {
		godotenv.Load(".env")
	}
	config.ConnectDB()

	fmt.Println("Memulai proses pembersihan database...")

	// Gunakan TRUNCATE CASCADE untuk menghapus semua data terkait
	execOrFatal("TRUNCATE TABLE mahasiswa.mahasiswa CASCADE")
	execOrFatal("TRUNCATE TABLE ormawa.ormawa CASCADE")
	execOrFatal("TRUNCATE TABLE fakultas.fakultas CASCADE")
	execOrFatal("TRUNCATE TABLE fakultas.program_studi CASCADE")
	execOrFatal("TRUNCATE TABLE fakultas.dosen CASCADE")
	execOrFatal("TRUNCATE TABLE psikolog.profiles CASCADE")
	execOrFatal("TRUNCATE TABLE public.tenaga_kesehatan CASCADE")

	// Hapus Data Master Super Admin
	execOrFatal("TRUNCATE TABLE public.berita CASCADE")
	execOrFatal("TRUNCATE TABLE public.kategori_berita CASCADE")
	execOrFatal("TRUNCATE TABLE ormawa.kategori_ormawa CASCADE")
	execOrFatal("TRUNCATE TABLE fakultas.academic_periods CASCADE")
	execOrFatal("TRUNCATE TABLE fakultas.pengaturan_akademik CASCADE")
	execOrFatal("TRUNCATE TABLE fakultas.program_mbkm CASCADE")
	execOrFatal("TRUNCATE TABLE mahasiswa.notifikasi CASCADE")
	execOrFatal("TRUNCATE TABLE mahasiswa.log_aktivitas CASCADE")
	execOrFatal("TRUNCATE TABLE ormawa.proposal CASCADE")
	execOrFatal("TRUNCATE TABLE public.pkkmb_kegiatan CASCADE")

	// Hapus users spesifik yang mungkin tersisa
	execOrFatal("DELETE FROM public.users WHERE email IN ('admin.ft@kampus.id', 'bem.ft@kampus.id', 'bem.univ@kampus.id', 'mhs.lama@student.id', 'mhs.baru@student.id', 'mhs.bemuniv@student.id', 'psikolog@kampus.id', 'nakes@kampus.id')")
	execOrFatal("DELETE FROM public.users WHERE role != 'super_admin'") // coba hapus yang lain juga

	fmt.Println("Data berhasil dibersihkan.")
	fmt.Println("Menyuntikkan data baru...")

	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password12345678"), bcrypt.DefaultCost)
	hashedPassword := string(passwordHash)

	// 1. Fakultas & Prodi
	fakultas := models.Fakultas{Nama: "Fakultas Teknik", Kode: "FT", Dekan: "Prof. Teknik", Email: "ft@kampus.id", NoHP: "0811111"}
	if err := config.DB.Create(&fakultas).Error; err != nil {
		fmt.Println("Error create fakultas:", err)
	}

	prodi := models.ProgramStudi{FakultasID: fakultas.ID, Nama: "Teknik Informatika", Kode: "TIF", Jenjang: "S1"}
	if err := config.DB.Create(&prodi).Error; err != nil {
		fmt.Println("Error create prodi:", err)
	}

	// Admin Fakultas
	adminFakUser := models.User{Email: "admin.ft@kampus.id", Password: hashedPassword, Role: "faculty_admin", FakultasID: &fakultas.ID, NamaLengkap: "Admin Fakultas Teknik"}
	if err := config.DB.Create(&adminFakUser).Error; err != nil {
		fmt.Println("Error create adminFakUser:", err)
	}

	// 2. Ormawa
	// Ormawa Fakultas
	ormawaFakultas := models.Ormawa{Nama: "BEM Fakultas Teknik", Singkatan: "BEM FT", Deskripsi: "BEM Tingkat Fakultas", FakultasID: &fakultas.ID, Kategori: "BEM", Status: "Aktif"}
	if err := config.DB.Create(&ormawaFakultas).Error; err != nil {
		fmt.Println("Error create ormawaFakultas:", err)
	}

	// Ormawa Univ (FakultasID null)
	ormawaUniv := models.Ormawa{Nama: "BEM Universitas", Singkatan: "BEM Univ", Deskripsi: "BEM Tingkat Universitas", Kategori: "BEM", Status: "Aktif"}
	if err := config.DB.Create(&ormawaUniv).Error; err != nil {
		fmt.Println("Error create ormawaUniv:", err)
	}

	// Akun khusus Ormawa ditiadakan, diganti dengan menghubungkan akun Mahasiswa ke tabel OrmawaAnggota

	// 3. Mahasiswa
	// Mahasiswa Lama
	userMhsLama := models.User{Email: "mhs.lama@student.id", Password: hashedPassword, Role: "mahasiswa", FakultasID: &fakultas.ID, ProgramStudiID: &prodi.ID}
	if err := config.DB.Create(&userMhsLama).Error; err != nil {
		fmt.Println("Error create user mhsLama:", err)
	}
	mhsLama := models.Mahasiswa{
		PenggunaID:       userMhsLama.ID,
		NIM:              "20210001",
		Nama:             "Mahasiswa Lama",
		FakultasID:       fakultas.ID,
		ProgramStudiID:   prodi.ID,
		SemesterSekarang: 5,
		StatusAkun:       "Aktif",
		StatusAkademik:   "Aktif",
		EmailKampus:      "mhs.lama@student.id",
	}
	if err := config.DB.Create(&mhsLama).Error; err != nil {
		fmt.Println("Error create mhsLama:", err)
	}

	// Mahasiswa Baru (Calon)
	userMhsBaru := models.User{Email: "mhs.baru@student.id", Password: hashedPassword, Role: "mahasiswa", FakultasID: &fakultas.ID, ProgramStudiID: &prodi.ID}
	if err := config.DB.Create(&userMhsBaru).Error; err != nil {
		fmt.Println("Error create user mhsBaru:", err)
	}
	mhsBaru := models.Mahasiswa{
		PenggunaID:       userMhsBaru.ID,
		NIM:              "20240001",
		Nama:             "Calon Mahasiswa Baru",
		FakultasID:       fakultas.ID,
		ProgramStudiID:   prodi.ID,
		SemesterSekarang: 1,
		StatusAkun:       "Aktif",
		StatusAkademik:   "Baru Mendaftar",
		EmailKampus:      "mhs.baru@student.id",
	}
	if err := config.DB.Create(&mhsBaru).Error; err != nil {
		fmt.Println("Error create mhsBaru:", err)
	}

	// Mahasiswa Khusus BEM Univ
	userMhsBemUniv := models.User{Email: "mhs.bemuniv@student.id", Password: hashedPassword, Role: "mahasiswa", FakultasID: &fakultas.ID, ProgramStudiID: &prodi.ID}
	if err := config.DB.Create(&userMhsBemUniv).Error; err != nil {
		fmt.Println("Error create user MhsBemUniv:", err)
	}
	mhsBemUniv := models.Mahasiswa{
		PenggunaID:       userMhsBemUniv.ID,
		NIM:              "20220001",
		Nama:             "Mahasiswa Ketua BEM Univ",
		FakultasID:       fakultas.ID,
		ProgramStudiID:   prodi.ID,
		SemesterSekarang: 3,
		StatusAkun:       "Aktif",
		StatusAkademik:   "Aktif",
		EmailKampus:      "mhs.bemuniv@student.id",
	}
	if err := config.DB.Create(&mhsBemUniv).Error; err != nil {
		fmt.Println("Error create mhsBemUniv:", err)
	}

	// Hubungkan Mahasiswa Lama -> BEM Fakultas Teknik
	config.DB.Create(&models.OrmawaAnggota{
		OrmawaID:    ormawaFakultas.ID,
		MahasiswaID: mhsLama.ID,
		Role:        "Ketua",
		Status:      "Aktif",
		Divisi:      "Inti",
	})

	// Hubungkan Mahasiswa BEM Univ -> BEM Universitas
	config.DB.Create(&models.OrmawaAnggota{
		OrmawaID:    ormawaUniv.ID,
		MahasiswaID: mhsBemUniv.ID,
		Role:        "Ketua",
		Status:      "Aktif",
		Divisi:      "Inti",
	})

	// 4. Psikolog
	userPsikolog := models.User{Email: "psikolog@kampus.id", Password: hashedPassword, Role: "psikolog"}
	if err := config.DB.Create(&userPsikolog).Error; err != nil {
		fmt.Println("Error create userPsikolog:", err)
	}
	psikolog := models.Psikolog{
		UserID:       userPsikolog.ID,
		Nama:         "Psikolog Ahli",
		Email:        "psikolog@kampus.id",
		NoHP:         "0812345",
		Spesialisasi: "Klinis",
		IsAktif:      true,
	}
	if err := config.DB.Create(&psikolog).Error; err != nil {
		fmt.Println("Error create psikolog:", err)
	}

	// 5. Tenaga Kesehatan
	userNakes := models.User{Email: "nakes@kampus.id", Password: hashedPassword, Role: "tenaga_kesehatan"}
	if err := config.DB.Create(&userNakes).Error; err != nil {
		fmt.Println("Error create userNakes:", err)
	}
	nakes := models.TenagaKesehatan{
		UserID:       userNakes.ID,
		Nama:         "Dr. Nakes Sehat",
		Email:        "nakes@kampus.id",
		NoHP:         "0812346",
		Spesialisasi: "Umum",
		IsAktif:      true,
	}
	if err := config.DB.Create(&nakes).Error; err != nil {
		fmt.Println("Error create nakes:", err)
	}

	fmt.Println("Suntik data selesai!")
	fmt.Println("=== KREDENSIAL AKUN PENGUJIAN (Password: password12345678) ===")
	fmt.Println("- Admin Fakultas : admin.ft@kampus.id")
	fmt.Println("- Mhs Lama (BEM FT) : mhs.lama@student.id")
	fmt.Println("- Mhs Baru (Calon)  : mhs.baru@student.id")
	fmt.Println("- Mhs BEM Univ      : mhs.bemuniv@student.id")
	fmt.Println("- Psikolog       : psikolog@kampus.id")
	fmt.Println("- Nakes          : nakes@kampus.id")
}
