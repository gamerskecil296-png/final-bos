//go:build ignore

package main

import (
	"encoding/json"
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"
)

func main() {
	err := godotenv.Load("../.env")
	if err != nil {
		godotenv.Load(".env")
	}
	config.ConnectDB()

	fmt.Println("=== SEEDER ANGGOTA ORGANISASI ORMawa ===")
	fmt.Println("Dengan jabatan dan hak akses sesuai!")

	passwordHash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	hashedPassword := string(passwordHash)

	// 1. Buat/update Ormawa (BEM FT)
	ormawa := models.Ormawa{
		Nama:       "BEM Fakultas Teknik",
		Singkatan:  "BEM FT",
		Kategori:   "BEM",
		Status:     "Aktif",
	}

	// Cek apakah sudah ada
	var existingOrmawa models.Ormawa
	if err := config.DB.Where("singkatan = ?", "BEM FT").First(&existingOrmawa).Error; err == nil {
		ormawa = existingOrmawa
		fmt.Printf("Ormawa BEM FT sudah ada (ID: %d)\n", ormawa.ID)
	} else {
		config.DB.Create(&ormawa)
		fmt.Printf("Ormawa BEM FT dibuat (ID: %d)\n", ormawa.ID)
	}

	// 2. Buat Roles dengan Permissions di OrmawaRole
	fmt.Println("\n--- Membuat Roles dengan Hak Akses ---")

	rolesData := []struct {
		Nama        string
		Deskripsi   string
		Permissions []string
	}{
		{
			Nama:      "Ketua Umum",
			Deskripsi: "Akses penuh ke seluruh sistem Ormawa",
			Permissions: []string{"*"}, // Full access
		},
		{
			Nama:      "Wakil Ketua",
			Deskripsi: "Akses luas untuk membantu Ketua",
			Permissions: []string{
				"view_dashboard", "view_notifications",
				"view_members", "create_members", "edit_members",
				"view_staff", "manage_staff", "view_structure", "manage_structure",
				"view_proposal", "create_proposal", "edit_proposal",
				"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc",
				"view_calendar", "create_calendar", "edit_calendar",
				"view_attendance", "submit_attendance", "edit_attendance",
				"view_finance", "create_finance",
				"view_aspirations", "respond_aspirations",
				"view_announcements", "create_announcements", "edit_announcements",
				"view_settings",
			},
		},
		{
			Nama:      "Sekretaris",
			Deskripsi: "Mengelola proposal, LPJ, kalender, absensi, dan pengumuman",
			Permissions: []string{
				"view_dashboard", "view_notifications",
				"view_members", "create_members", "edit_members",
				"view_structure",
				"view_proposal", "create_proposal", "edit_proposal",
				"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc",
				"view_calendar", "create_calendar", "edit_calendar",
				"view_attendance", "submit_attendance",
				"view_announcements", "create_announcements", "edit_announcements",
			},
		},
		{
			Nama:      "Bendahara",
			Deskripsi: "Mengelola keuangan dan LPJ organisasi",
			Permissions: []string{
				"view_dashboard", "view_notifications",
				"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc",
				"view_finance", "create_finance", "delete_finance",
			},
		},
		{
			Nama:      "Kepala Divisi",
			Deskripsi: "Memimpin divisi dengan akses terbatas",
			Permissions: []string{
				"view_dashboard", "view_notifications",
				"view_members",
				"view_structure",
				"view_proposal", "create_proposal",
				"view_lpj", "create_lpj",
				"view_calendar", "create_calendar", "edit_calendar",
				"view_attendance", "submit_attendance",
				"view_announcements", "create_announcements",
			},
		},
		{
			Nama:      "Staff",
			Deskripsi: "Akses terbatas untuk anggota biasa",
			Permissions: []string{
				"view_dashboard", "view_notifications",
				"view_calendar", "view_announcements",
			},
		},
	}

	createdRoles := make(map[string]uint)
	for _, roleData := range rolesData {
		perms, _ := json.Marshal(roleData.Permissions)

		var existingRole models.OrmawaRole
		if err := config.DB.Where("ormawa_id = ? AND LOWER(nama) = LOWER(?)", ormawa.ID, roleData.Nama).First(&existingRole).Error; err == nil {
			// Update existing role
			existingRole.Permissions = datatypes.JSON(perms)
			existingRole.Deskripsi = roleData.Deskripsi
			config.DB.Save(&existingRole)
			createdRoles[roleData.Nama] = existingRole.ID
			fmt.Printf("  ✓ Role '%s' diupdate\n", roleData.Nama)
		} else {
			// Create new role
			newRole := models.OrmawaRole{
				OrmawaID:    ormawa.ID,
				Nama:        roleData.Nama,
				Deskripsi:   roleData.Deskripsi,
				Permissions: datatypes.JSON(perms),
			}
			config.DB.Create(&newRole)
			createdRoles[roleData.Nama] = newRole.ID
			fmt.Printf("  ✓ Role '%s' dibuat\n", roleData.Nama)
		}
	}

	// 3. Buat Mahasiswa dan Akun dengan Jabatan Berbeda
	fmt.Println("\n--- Membuat Anggota Organisasi ---")

	mahasiswaData := []struct {
		NIM         string
		Nama        string
		Email       string
		Semester    int
		Jabatan     string
		Divisi       string
	}{
		{NIM: "20210001", Nama: "Ahmad Wijaya Kusuma", Email: "ahmad.wijaya@student.id", Semester: 7, Jabatan: "Ketua Umum", Divisi: "Inti"},
		{NIM: "20210002", Nama: "Budi Santoso", Email: "budi.santoso@student.id", Semester: 7, Jabatan: "Wakil Ketua", Divisi: "Inti"},
		{NIM: "20220001", Nama: "Clara Putri Ayu", Email: "clara.putri@student.id", Semester: 5, Jabatan: "Sekretaris", Divisi: "Inti"},
		{NIM: "20220002", Nama: "Dewi Kartika Sari", Email: "dewi.kartika@student.id", Semester: 5, Jabatan: "Bendahara", Divisi: "Inti"},
		{NIM: "20230001", Nama: "Eko Prasetyo", Email: "eko.prasetyo@student.id", Semester: 3, Jabatan: "Kepala Divisi", Divisi: "Humas"},
		{NIM: "20230002", Nama: "Fitri Handayani", Email: "fitri.handayani@student.id", Semester: 3, Jabatan: "Staff", Divisi: "Humas"},
		{NIM: "20230003", Nama: "Gunawan Setiawan", Email: "gunawan.setiawan@student.id", Semester: 3, Jabatan: "Staff", Divisi: "Kerohanian"},
		{NIM: "20230004", Nama: "Hana Putri Lestari", Email: "hana.putri@student.id", Semester: 3, Jabatan: "Staff", Divisi: "Kerohanian"},
		{NIM: "20230005", Nama: "Ivan Pratama", Email: "ivan.pratama@student.id", Semester: 3, Jabatan: "Staff", Divisi: "Dana"},
		{NIM: "20230006", Nama: "Jasmine Audrey", Email: "jasmine.audrey@student.id", Semester: 3, Jabatan: "Staff", Divisi: "Dana"},
	}

	// Dapatkan first fakultas
	var fakultas models.Fakultas
	if err := config.DB.First(&fakultas).Error; err != nil {
		// Buat fakultas jika belum ada
		fakultas = models.Fakultas{Nama: "Fakultas Teknik", Kode: "FT"}
		config.DB.Create(&fakultas)
		fmt.Println("  ✓ Fakultas Teknik dibuat")
	} else {
		fmt.Printf("  - Fakultas '%s' sudah ada\n", fakultas.Nama)
	}

	var prodi models.ProgramStudi
	if err := config.DB.Where("fakultas_id = ?", fakultas.ID).First(&prodi).Error; err != nil {
		prodi = models.ProgramStudi{FakultasID: fakultas.ID, Nama: "Teknik Informatika", Kode: "TIF", Jenjang: "S1"}
		config.DB.Create(&prodi)
		fmt.Println("  ✓ Prodi Teknik Informatika dibuat")
	} else {
		fmt.Printf("  - Prodi '%s' sudah ada\n", prodi.Nama)
	}

	createdUsers := 0
	for _, mhsData := range mahasiswaData {
		// Cek apakah mahasiswa dengan NIM ini sudah ada
		var existingMahasiswa models.Mahasiswa
		if err := config.DB.Where("nim = ?", mhsData.NIM).First(&existingMahasiswa).Error; err == nil {
			// Mahasiswa sudah ada, cek apakah sudah terhubung ke Ormawa
			var existingAnggota models.OrmawaAnggota
			if err := config.DB.Where("mahasiswa_id = ? AND ormawa_id = ?", existingMahasiswa.ID, ormawa.ID).First(&existingAnggota).Error; err == nil {
				// Sudah terhubung, update role
				existingAnggota.Role = mhsData.Jabatan
				existingAnggota.Divisi = mhsData.Divisi
				existingAnggota.Status = "Aktif"
				config.DB.Save(&existingAnggota)
				fmt.Printf("  ~ %s (%s) - Role diupdate ke %s\n", mhsData.Nama, mhsData.NIM, mhsData.Jabatan)
			} else {
				// Belum terhubung, buat anggota
				anggota := models.OrmawaAnggota{
					OrmawaID:    ormawa.ID,
					MahasiswaID: existingMahasiswa.ID,
					Role:        mhsData.Jabatan,
					Divisi:      mhsData.Divisi,
					Status:      "Aktif",
				}
				config.DB.Create(&anggota)
				createdUsers++
				fmt.Printf("  ✓ %s (%s) - %s Divisi %s\n", mhsData.Nama, mhsData.NIM, mhsData.Jabatan, mhsData.Divisi)
			}
			continue
		}

		// Cek apakah user dengan email ini sudah ada
		var existingUser models.User
		if err := config.DB.Where("LOWER(email) = ?", mhsData.Email).First(&existingUser).Error; err == nil {
			// User sudah ada
			fmt.Printf("  - User %s sudah ada\n", mhsData.Email)
			continue
		}

		// Buat User baru
		user := models.User{
			Email:           mhsData.Email,
			Password:        hashedPassword,
			Role:            "ormawa",
			FakultasID:       &fakultas.ID,
			ProgramStudiID:  &prodi.ID,
		}
		if err := config.DB.Create(&user).Error; err != nil {
			fmt.Printf("  ✗ Gagal buat user %s: %v\n", mhsData.Email, err)
			continue
		}

		// Buat Mahasiswa
		mahasiswa := models.Mahasiswa{
			PenggunaID:      user.ID,
			NIM:             mhsData.NIM,
			Nama:            mhsData.Nama,
			FakultasID:       fakultas.ID,
			ProgramStudiID:   prodi.ID,
			SemesterSekarang: mhsData.Semester,
			StatusAkun:      "Aktif",
			StatusAkademik:  "Aktif",
			EmailKampus:     mhsData.Email,
		}
		if err := config.DB.Create(&mahasiswa).Error; err != nil {
			fmt.Printf("  ✗ Gagal buat mahasiswa %s: %v\n", mhsData.Nama, err)
			continue
		}

		// Hubungkan ke Ormawa
		anggota := models.OrmawaAnggota{
			OrmawaID:    ormawa.ID,
			MahasiswaID: mahasiswa.ID,
			Role:        mhsData.Jabatan,
			Divisi:      mhsData.Divisi,
			Status:      "Aktif",
		}
		if err := config.DB.Create(&anggota).Error; err != nil {
			fmt.Printf("  ✗ Gagal buat anggota %s: %v\n", mhsData.Nama, err)
			continue
		}

		createdUsers++
		fmt.Printf("  ✓ %s (%s) - %s Divisi %s\n", mhsData.Nama, mhsData.NIM, mhsData.Jabatan, mhsData.Divisi)
	}

	fmt.Println("\n========================================")
	fmt.Println("         AKUN ANGGOTA ORGANISASI")
	fmt.Println("========================================")
	fmt.Println("Password untuk semua akun: password123")
	fmt.Println("")

	for i, mhsData := range mahasiswaData {
		fmt.Printf("%d. %-25s | %-15s | %s\n", i+1, mhsData.Nama, mhsData.Jabatan, mhsData.Email)
	}

	fmt.Println("")
	fmt.Println("--- HAK AKSES SETIAP JABATAN ---")
	fmt.Println("")
	fmt.Println("👑 KETUA UMUM (ahmad.wijaya@student.id)")
	fmt.Println("   Akses: SEMUA (Full Access)")
	fmt.Println("")
	fmt.Println("👔 WAKIL KETUA (budi.santoso@student.id)")
	fmt.Println("   Akses: Dashboard, Anggota, Proposal, LPJ, Kalender, Absensi,")
	fmt.Println("         Keuangan, Aspirasi, Pengumuman, Settings")
	fmt.Println("   Tidak: Delete Proposal, Delete Finance")
	fmt.Println("")
	fmt.Println("📝 SEKRETARIS (clara.putri@student.id)")
	fmt.Println("   Akses: Proposal, LPJ, Kalender, Absensi, Pengumuman")
	fmt.Println("   Tidak: Keuangan, Aspirasi")
	fmt.Println("")
	fmt.Println("💰 BENDAHARA (dewi.kartika@student.id)")
	fmt.Println("   Akses: LPJ, Keuangan (Full)")
	fmt.Println("   Tidak: Proposal, Kalender, Aspirasi, Pengumuman")
	fmt.Println("")
	fmt.Println("👥 KEPALA DIVISI (eko.prasetyo@student.id)")
	fmt.Println("   Akses: View Anggota, Proposal (Create), Kalender, Pengumuman")
	fmt.Println("   Tidak: Manage Anggota, Keuangan, LPJ (Full)")
	fmt.Println("")
	fmt.Println("👤 STAFF (sisanya)")
	fmt.Println("   Akses: Dashboard, Kalender, Pengumuman (View Only)")
	fmt.Println("")
	fmt.Println("========================================")
	fmt.Printf("Total anggota dibuat: %d\n", createdUsers)
	fmt.Println("========================================")
}
