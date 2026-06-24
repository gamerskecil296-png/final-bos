package config

import (
	"log"
	"siakad-backend/models"

	"gorm.io/gorm"
)

// InitialSyncRBAC seeds the foundational RBAC roles and permissions.
func InitialSyncRBAC(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi RBAC (Roles & Permissions)...")

	// 1. Definisikan Permissions Master
	permissions := []models.Permission{
		// Mahasiswa & User Management
		{Key: "students.view", Category: "students", Description: "Melihat data mahasiswa"},
		{Key: "students.create", Category: "students", Description: "Menambah data mahasiswa"},
		{Key: "students.update", Category: "students", Description: "Mengubah data mahasiswa"},
		{Key: "students.delete", Category: "students", Description: "Menghapus data mahasiswa"},

		// Dosen & Akademik
		{Key: "dosen.view", Category: "akademik", Description: "Melihat data dosen"},
		{Key: "dosen.manage", Category: "akademik", Description: "Mengelola data dosen"},
		{Key: "akademik.view", Category: "akademik", Description: "Melihat pengaturan akademik"},
		{Key: "akademik.manage", Category: "akademik", Description: "Mengelola pengaturan akademik"},

		// Fakultas & Prodi
		{Key: "faculty.view", Category: "faculty", Description: "Melihat daftar fakultas"},
		{Key: "faculty.manage", Category: "faculty", Description: "Mengelola fakultas"},
		{Key: "program_studi.view", Category: "faculty", Description: "Melihat program studi"},
		{Key: "program_studi.manage", Category: "faculty", Description: "Mengelola program studi"},

		// Prestasi & Beasiswa
		{Key: "achievement.view", Category: "layanan", Description: "Melihat prestasi mahasiswa"},
		{Key: "achievement.manage", Category: "layanan", Description: "Mengelola/Verifikasi prestasi"},
		{Key: "scholarship.view", Category: "layanan", Description: "Melihat beasiswa"},
		{Key: "scholarship.manage", Category: "layanan", Description: "Mengelola beasiswa"},

		// Aspirasi
		{Key: "aspiration.view", Category: "layanan", Description: "Melihat aspirasi"},
		{Key: "aspiration.respond", Category: "layanan", Description: "Merespon aspirasi"},

		// Laporan & Audit
		{Key: "report.view", Category: "system", Description: "Melihat laporan sistem"},
		{Key: "admin.audit.view", Category: "system", Description: "Melihat audit log admin"},

		// Admin Access
		{Key: "admin.dashboard.view", Category: "system", Description: "Akses dashboard admin utama"},
		{Key: "faculty.dashboard.view", Category: "system", Description: "Akses dashboard admin fakultas"},

		// Full Access (SuperAdmin)
		{Key: "*", Category: "system", Description: "Akses penuh ke seluruh sistem"},
	}

	for _, p := range permissions {
		var existing models.Permission
		if err := db.Where("key = ?", p.Key).First(&existing).Error; err != nil {
			db.Create(&p)
		}
	}

	// 2. Definisikan Roles Master
	roles := []struct {
		Role  models.Role
		Perms []string
	}{
		{
			Role: models.Role{Name: "super_admin", Label: "Super Administrator", Description: "Hak akses penuh ke seluruh sistem", IsSystem: true},
			Perms: []string{"*"},
		},
		{
			Role: models.Role{Name: "faculty_admin", Label: "Admin Fakultas", Description: "Pengelola data tingkat Fakultas", IsSystem: true},
			Perms: []string{
				"faculty.dashboard.view", "faculty.view",
				"students.view", "students.create", "students.update", "students.delete",
				"program_studi.view", "achievement.view", "achievement.manage",
				"scholarship.view", "scholarship.manage", "aspiration.view", "aspiration.respond",
				"report.view", "admin.audit.view", "dosen.view", "dosen.manage", "akademik.view", "akademik.manage",
			},
		},
		{
			Role: models.Role{Name: "prodi_admin", Label: "Admin Prodi", Description: "Pengelola data tingkat Program Studi", IsSystem: true},
			Perms: []string{
				"faculty.dashboard.view",
				"students.view", "students.create", "students.update",
				"achievement.view", "achievement.manage", "scholarship.view",
				"aspiration.view", "report.view", "dosen.view", "akademik.view",
			},
		},
		{
			Role: models.Role{Name: "mahasiswa", Label: "Mahasiswa", Description: "Hak akses standar mahasiswa", IsSystem: true},
			Perms: []string{}, // Mahasiswa tidak butuh permission panel admin
		},
	}

	for _, rData := range roles {
		var role models.Role
		if err := db.Where("name = ?", rData.Role.Name).First(&role).Error; err != nil {
			// Role tidak ada, buat baru
			role = rData.Role
			db.Create(&role)
		}

		// Update / Sinkronisasi Permissions untuk Role tersebut
		var perms []models.Permission
		if len(rData.Perms) > 0 {
			db.Where("key IN ?", rData.Perms).Find(&perms)
			// Timpa relasi permission
			db.Model(&role).Association("Permissions").Replace(&perms)
		}
	}

	log.Println("[Initial Sync] Sinkronisasi RBAC selesai.")
	InitialSyncUserRoles(db)
}

// InitialSyncUserRoles migrates existing users from the old string-based Role to the new UserRole pivot table.
func InitialSyncUserRoles(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai migrasi User Roles lama ke UserRole baru...")
	
	// Cari semua user
	var users []models.User
	db.Find(&users)

	for _, user := range users {
		if user.Role == "" {
			continue
		}

		// Untuk mempermudah transisi, kita anggap user.Role adalah Name dari Role baru
		var role models.Role
		if err := db.Where("name = ?", user.Role).First(&role).Error; err != nil {
			// Role tidak ditemukan, lewati
			continue
		}

		// Cek apakah relasi UserRole sudah ada
		var count int64
		db.Model(&models.UserRole{}).Where("user_id = ? AND role_id = ?", user.ID, role.ID).Count(&count)
		
		if count == 0 {
			// Buat UserRole baru. Untuk sementara kita set scope kosong.
			db.Create(&models.UserRole{
				UserID: user.ID,
				RoleID: role.ID,
			})
		}
	}
	log.Println("[Initial Sync] Migrasi User Roles selesai.")
}
