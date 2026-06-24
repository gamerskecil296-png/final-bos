package config

import (
	"fmt"
	"log"
	"siakad-backend/models"

	"gorm.io/gorm"
)

func migrateModels(db *gorm.DB) error {
	// ========================
	// CREATE SCHEMA
	// ========================
	schemas := []string{"public", "fakultas", "mahasiswa", "ormawa", "psikolog"}
	for _, s := range schemas {
		if err := db.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s;", s)).Error; err != nil {
			return err
		}
	}

	// ========================
	// RUN SQL MIGRATIONS (for schema sync)
	// ========================
	runSQLMigrations(db)

	// ========================
	// PUBLIC (GLOBAL / AUTH / MASTER)
	// ========================
	if err := db.AutoMigrate(
		&models.User{},
		&models.Role{},
		&models.Permission{},
		&models.RolePermission{},
		&models.UserRole{},
		&models.RBACRole{},
		&models.ThemeSettings{},
		&models.TenagaKesehatan{},
		&models.JadwalKesehatan{},
		&models.BookingKesehatan{},
		&models.PemeriksaanMassal{},
		&models.PengajuanAsuransi{},
		&models.BeritaAcaraPemeriksaan{},
		&models.SelfScreening{},
		&models.RujukanKesehatan{},
		&models.ThemeSettings{},
		&models.LandingSetting{},
		&models.DocumentSetting{},
		&models.ApiIntegration{},
		&models.SmtpSetting{},
		&models.Documentation{},
	); err != nil {
		return err
	}

	// ========================
	// FAKULTAS
	// ========================
	if err := db.AutoMigrate(
		&models.Fakultas{},
		&models.ProgramStudi{},
		&models.Dosen{},
		&models.FakultasProdiRole{},
	); err != nil {
		return err
	}

	if err := db.AutoMigrate(
		&models.AcademicPeriod{},
		&models.PengaturanAkademik{},
		&models.ProgramMBKM{},
		&models.Berita{},
	); err != nil {
		return err
	}

	// ========================
	// MAHASISWA
	// ========================
	// Use RunMigrations instead of AutoMigrate to handle existing tables safely
	runMahasiswaMigrations(db)

	if err := db.AutoMigrate(&models.SevimaAnomali{}, &models.SevimaPMBAnomali{}); err != nil {
		return err
	}

	if err := db.AutoMigrate(
		&models.Prestasi{},
		&models.PrestasiMahasiswa{},
		&models.PrestasiDosen{},
		&models.Beasiswa{},
		&models.BeasiswaPendaftaran{},
		&models.Aspirasi{},
		&models.JadwalKonseling{},
		&models.Konseling{},
		&models.PengajuanSurat{},
		&models.Kesehatan{},
		&models.LogAktivitas{},
		&models.RiwayatOrganisasi{},
		&models.Notifikasi{},
		&models.PendaftaranMahasiswaBaru{},
	); err != nil {
		return err
	}

	// ========================
	// PSIKOLOG
	// ========================
	if err := db.AutoMigrate(
		&models.Psikolog{},
		&models.PsikologScheduleSlot{},
		&models.PsikologBooking{},
		&models.PsikologSessionNote{},
		&models.PsikologAssessment{},
		&models.PsikologNotification{},
		&models.PsikologReferral{},
	); err != nil {
		return err
	}

	// ========================
	// ORMAWA
	// ========================
	if err := db.AutoMigrate(
		&models.KategoriOrmawa{},
		&models.Proposal{},
		&models.ProposalRiwayat{},
		&models.Ormawa{},
		&models.OrmawaAnggota{},
		&models.OrmawaDivisi{},
		&models.OrmawaRole{},
		&models.OrmawaKegiatan{},
		&models.OrmawaKehadiran{},
		&models.OrmawaPengumuman{},
		&models.OrmawaMutasiSaldo{},
		&models.OrmawaAspirasi{},
		&models.OrmawaNotifikasi{},
		&models.LaporanPertanggungjawaban{},
		&models.OrmawaPoinHistory{},
		&models.OrmawaGamifikasiRule{},
		&models.OrmawaRecruitmentField{},
		&models.OrmawaFinancialSetting{},
		&models.OrmawaFinancialAuditLog{},
	); err != nil {
		return err
	}

	// ========================
	// PKKMB (MASUK MAHASISWA)
	// ========================
	if err := db.AutoMigrate(
		&models.PkkmbTahap{},
		&models.PkkmbMateri{},
		&models.PkkmbKegiatan{},
		&models.PkkmbProgress{},
		&models.PkkmbHasil{},
		&models.PkkmbBanding{},
		&models.PkkmbSertifikat{},
		&models.PkkmbQuiz{},
		&models.PkkmbQuizQuestion{},
		&models.PkkmbQuizOption{},
		&models.PkkmbQuizAttempt{},
	); err != nil {
		return err
	}

	// ========================
	// KENCANA ORIENTASI MAHASISWA
	// ========================
	if err := db.AutoMigrate(
		&models.KencanaPeriod{},
		&models.KencanaTimelinePhase{},
		&models.KencanaFacultyPhase{},
		&models.KencanaStage{},
		&models.KencanaSession{},
		&models.KencanaMaterial{},
		&models.KencanaMaterialProgress{},
		&models.KencanaQuiz{},
		&models.KencanaQuestion{},
		&models.KencanaQuestionOption{},
		&models.KencanaQuizAttempt{},
		&models.KencanaQuizAnswer{},
		&models.KencanaAssignment{},
		&models.KencanaAssignmentSubmission{},
		&models.KencanaHandbook{},
		&models.KencanaAttendance{},
		&models.KencanaScore{},
		&models.KencanaScoreItem{},
		&models.KencanaMentor{},
		&models.KencanaGroup{},
		&models.KencanaGroupMember{},
		&models.KencanaMentorAssignment{},
		&models.KencanaRemedial{},
		&models.KencanaCertificate{},
		&models.KencanaBanding{},
		&models.KencanaCertificateSetting{},
		&models.KencanaPengumuman{},
	); err != nil {
		return err
	}

	// Backfill ScopeType to prevent NULLs breaking unique index
	db.Exec("UPDATE mahasiswa.kencana_scores SET scope_type = 'university' WHERE scope_type IS NULL OR scope_type = ''")
	db.Exec("UPDATE mahasiswa.kencana_score_items SET scope_type = 'university' WHERE scope_type IS NULL OR scope_type = ''")
	db.Exec("UPDATE mahasiswa.kencana_certificates SET scope_type = 'university' WHERE scope_type IS NULL OR scope_type = ''")

	InitialSyncKencanaSettings(db)

	return nil
}

// runSQLMigrations executes raw SQL migration files
func runSQLMigrations(db *gorm.DB) {
	// Create migrations tracking table if not exists
	db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`)

	migrations := []struct {
		name  string
		sql   string
	}{
		// Column name fixes for mahasiswa.mahasiswa
		{"mahasiswa_extended_columns", `
			DO $$
			BEGIN
				-- Add extended columns if not exists
				ALTER TABLE mahasiswa.mahasiswa
					ADD COLUMN IF NOT EXISTS fakultas_id INTEGER REFERENCES fakultas.fakultas(id) ON DELETE SET NULL,
					ADD COLUMN IF NOT EXISTS nik VARCHAR(20),
					ADD COLUMN IF NOT EXISTS nisn VARCHAR(20),
					ADD COLUMN IF NOT EXISTS nupn VARCHAR(20),
					ADD COLUMN IF NOT EXISTS npsn VARCHAR(20),
					ADD COLUMN IF NOT EXISTS nirm VARCHAR(20),
					ADD COLUMN IF NOT EXISTS nirl VARCHAR(20),
					ADD COLUMN IF NOT EXISTS nomor_kk VARCHAR(20),
					ADD COLUMN IF NOT EXISTS nomor_kps VARCHAR(20),
					ADD COLUMN IF NOT EXISTS kewarganegaraan VARCHAR(50),
					ADD COLUMN IF NOT EXISTS status_pernikahan VARCHAR(20),
					ADD COLUMN IF NOT EXISTS is_disabilitas VARCHAR(10) DEFAULT 'Tidak',
					ADD COLUMN IF NOT EXISTS jenis_tinggal VARCHAR(50),
					ADD COLUMN IF NOT EXISTS gelar_depan VARCHAR(20),
					ADD COLUMN IF NOT EXISTS gelar_belakang VARCHAR(20),
					ADD COLUMN IF NOT EXISTS jenjang VARCHAR(10),
					ADD COLUMN IF NOT EXISTS email_kampus VARCHAR(100),
					ADD COLUMN IF NOT EXISTS telepon VARCHAR(20),
					ADD COLUMN IF NOT EXISTS alamat_domisili TEXT,
					ADD COLUMN IF NOT EXISTS desa VARCHAR(100),
					ADD COLUMN IF NOT EXISTS desa_domisili VARCHAR(100),
					ADD COLUMN IF NOT EXISTS dusun VARCHAR(100),
					ADD COLUMN IF NOT EXISTS dusun_domisili VARCHAR(100),
					ADD COLUMN IF NOT EXISTS kecamatan VARCHAR(100),
					ADD COLUMN IF NOT EXISTS kecamatan_domisili VARCHAR(100),
					ADD COLUMN IF NOT EXISTS provinsi VARCHAR(100),
					ADD COLUMN IF NOT EXISTS provinsi_domisili VARCHAR(100),
					ADD COLUMN IF NOT EXISTS kode_pos_domisili VARCHAR(10),
					ADD COLUMN IF NOT EXISTS rt VARCHAR(5),
					ADD COLUMN IF NOT EXISTS rw VARCHAR(5),
					ADD COLUMN IF NOT EXISTS rt_domisili VARCHAR(5),
					ADD COLUMN IF NOT EXISTS rw_domisili VARCHAR(5),
					ADD COLUMN IF NOT EXISTS nama_ayah VARCHAR(150),
					ADD COLUMN IF NOT EXISTS nama_ibu_kandung VARCHAR(150),
					ADD COLUMN IF NOT EXISTS nama_wali VARCHAR(150),
					ADD COLUMN IF NOT EXISTS pekerjaan_ayah VARCHAR(100),
					ADD COLUMN IF NOT EXISTS pekerjaan_ibu VARCHAR(100),
					ADD COLUMN IF NOT EXISTS penghasilan_ortu INTEGER DEFAULT 0,
					ADD COLUMN IF NOT EXISTS pekerjaan VARCHAR(100),
					ADD COLUMN IF NOT EXISTS asal_sekolah VARCHAR(200),
					ADD COLUMN IF NOT EXISTS no_ijazah_sma VARCHAR(50),
					ADD COLUMN IF NOT EXISTS gelombang VARCHAR(20),
					ADD COLUMN IF NOT EXISTS sistem_kuliah VARCHAR(50),
					ADD COLUMN IF NOT EXISTS tanggal_daftar TIMESTAMP,
					ADD COLUMN IF NOT EXISTS kategori_ukt VARCHAR(50),
					ADD COLUMN IF NOT EXISTS kontak_darurat VARCHAR(100),
					ADD COLUMN IF NOT EXISTS is_transfer VARCHAR(10) DEFAULT 'Tidak',
					ADD COLUMN IF NOT EXISTS nim_lama VARCHAR(20),
					ADD COLUMN IF NOT EXISTS universitas_asal VARCHAR(200),
					ADD COLUMN IF NOT EXISTS prodi_asal VARCHAR(200),
					ADD COLUMN IF NOT EXISTS ipk_asal VARCHAR(10),
					ADD COLUMN IF NOT EXISTS sks_asal VARCHAR(10),
					ADD COLUMN IF NOT EXISTS status_akademik VARCHAR(50) DEFAULT 'Aktif',
					ADD COLUMN IF NOT EXISTS jalur_masuk VARCHAR(50);
			END $$;
		`},
		{"mahasiswa_fk_backfill", `
			-- Backfill fakultas_id dari relasi prodi (program_studi ada di schema fakultas)
			UPDATE mahasiswa.mahasiswa m
			SET fakultas_id = p.fakultas_id
			FROM fakultas.program_studi p
			WHERE m.prodi_id = p.id
			  AND m.fakultas_id IS NULL;
		`},
		{"mahasiswa_indexes", `
			CREATE INDEX IF NOT EXISTS idx_mahasiswa_nik ON mahasiswa.mahasiswa(nik);
			CREATE INDEX IF NOT EXISTS idx_mahasiswa_nisn ON mahasiswa.mahasiswa(nisn);
			CREATE INDEX IF NOT EXISTS idx_mahasiswa_email_kampus ON mahasiswa.mahasiswa(email_kampus);
			CREATE INDEX IF NOT EXISTS idx_mahasiswa_status_akademik ON mahasiswa.mahasiswa(status_akademik);
			CREATE INDEX IF NOT EXISTS idx_mahasiswa_fk ON mahasiswa.mahasiswa(fakultas_id);
		`},
	}

	for _, m := range migrations {
		var exists bool
		db.Raw("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = ?)", m.name).Scan(&exists)
		if !exists {
			log.Printf("[Migration] Running: %s\n", m.name)
			db.Exec(m.sql)
			db.Exec("INSERT INTO schema_migrations (version) VALUES (?)", m.name)
		}
	}
}

// runMahasiswaMigrations handles mahasiswa table migration safely
func runMahasiswaMigrations(db *gorm.DB) {
	// Check if table exists
	var tableExists bool
	db.Raw(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables
			WHERE table_schema = 'mahasiswa'
			AND table_name = 'mahasiswa'
		)
	`).Scan(&tableExists)

	if tableExists {
		log.Println("[Migration] Table mahasiswa.mahasiswa exists, skipping AutoMigrate")
		// Run column sync instead
		runSQLMigrations(db)
	} else {
		log.Println("[Migration] Creating mahasiswa.mahasiswa via AutoMigrate")
		if err := db.AutoMigrate(&models.Mahasiswa{}); err != nil {
			log.Printf("[Migration] Error creating mahasiswa: %v", err)
		}
	}
}

// ========================
// SYNC DATA (OPTIONAL)
// ========================

func InitialSyncFakultas(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi data ke fakultas...")

	var count int64
	db.Table("fakultas.fakultas").Count(&count)
	if count == 0 {
		log.Println("[Initial Sync] Tabel fakultas kosong. Melakukan seeding data awal...")
		seeds := []models.Fakultas{
			{Nama: "School of Computing", Kode: "SOC", Email: "soc@bku.ac.id"},
			{Nama: "School of Nursing", Kode: "SON", Email: "son@bku.ac.id"},
			{Nama: "School of Pharmacy", Kode: "SOP", Email: "sop@bku.ac.id"},
		}
		for _, s := range seeds {
			db.Create(&s)
		}
		log.Println("[Initial Sync] Seeding selesai.")
	}

	var admissionCount int64
	db.Model(&models.PendaftaranMahasiswaBaru{}).Count(&admissionCount)
	if admissionCount == 0 {
		log.Println("[Initial Sync] Tabel pendaftaran_mahasiswa_baru kosong. Melakukan seeding 100 data calon mahasiswa baru...")
		firstNames := []string{
			"Aditya", "Bagas", "Cahyo", "Dimas", "Erlangga", "Fahri", "Galih", "Hafiz", "Ihsan", "Jatmiko",
			"Kresna", "Lutfi", "Mahendra", "Naufal", "Okta", "Prabowo", "Raditya", "Satria", "Tegar", "Utomo",
			"Wahyu", "Yuda", "Zaki", "Alya", "Bunga", "Clara", "Dina", "Elsa", "Farida", "Gisela",
			"Hana", "Intan", "Jasmine", "Keyla", "Lia", "Mutiara", "Nadia", "Olga", "Putri", "Rania",
			"Salsa", "Tiara", "Ulya", "Vina", "Winda", "Yasmine", "Zahra", "Aldo", "Bimo", "Daffa",
		}
		lastNames := []string{
			"Saputra", "Pratama", "Wibowo", "Setiawan", "Hidayat", "Nugraha", "Kurnia", "Lestari", "Putri",
			"Utami", "Rahmawati", "Wijaya", "Kusuma", "Anggraini", "Fitriani", "Indriani", "Permata", "Sari",
			"Ramadhan", "Gunawan", "Susanto", "Budiman", "Hartono", "Siregar", "Nasution", "Pramono",
		}
		jalurList := []string{"SNBP", "SNBT", "Mandiri"}

		randIndex := 0
		for i := 1; i <= 100; i++ {
			fn := firstNames[randIndex%len(firstNames)]
			ln := lastNames[(randIndex+7)%len(lastNames)]
			fullName := fn + " " + ln
			emailName := fmt.Sprintf("%s.%s%d@gmail.com", fn, ln, i)

			prodi := "Farmasi S1"
			if i%3 == 0 {
				prodi = "Farmasi D3"
			}

			jalur := jalurList[randIndex%len(jalurList)]

			status := "Verified"
			if i%5 == 0 {
				status = "Pending"
			} else if i%13 == 0 {
				status = "Rejected"
			}

			db.Create(&models.PendaftaranMahasiswaBaru{
				NomorDaftar:  fmt.Sprintf("PMB-2024-%03d", i),
				NamaLengkap:  fullName,
				Email:        emailName,
				PilihanProdi: prodi,
				Jalur:        jalur,
				Status:       status,
				NoHP:         fmt.Sprintf("08123456%03d", i),
				NilaiRapor:   80.0 + float64(i%15),
			})

			randIndex += 13
		}
		log.Println("[Initial Sync] Seeding 100 data pendaftaran_mahasiswa_baru selesai.")
	}

	log.Println("[Initial Sync] Sinkronisasi data selesai.")
}

func InitialSyncGamifikasiRules(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi aturan gamifikasi...")

	defaultRules := []models.OrmawaGamifikasiRule{
		{Key: "proposal_disetujui", Label: "Proposal Disetujui", Poin: 20, Deskripsi: "Poin diberikan ketika proposal kegiatan disetujui oleh universitas"},
		{Key: "kegiatan_selesai", Label: "Kegiatan Selesai", Poin: 50, Deskripsi: "Poin diberikan ketika kegiatan selesai diselenggarakan dan dilaporkan"},
		{Key: "aspirasi_selesai", Label: "Aspirasi Diselesaikan", Poin: 10, Deskripsi: "Poin diberikan ketika aspirasi mahasiswa berhasil ditangani oleh Ormawa"},
		{Key: "prestasi_terverifikasi", Label: "Prestasi Ormawa Terverifikasi", Poin: 100, Deskripsi: "Poin diberikan ketika prestasi organisasi kemahasiswaan berhasil diverifikasi"},
		{Key: "lpj_disetujui", Label: "LPJ Disetujui", Poin: 100, Deskripsi: "Poin diberikan ketika Laporan Pertanggungjawaban (LPJ) keuangan & proker disetujui"},
		{Key: "lpj_terlambat", Label: "Peringatan Kepatuhan LPJ", Poin: -50, Deskripsi: "Poin dikurangi ketika LPJ terlambat diajukan atau dikirim surat peringatan"},
	}

	for _, rule := range defaultRules {
		var existing models.OrmawaGamifikasiRule
		if err := db.Where("key = ?", rule.Key).First(&existing).Error; err != nil {
			db.Create(&rule)
			log.Printf("[Initial Sync] Seed rule: %s (%d Pts)\n", rule.Key, rule.Poin)
		}
	}
	log.Println("[Initial Sync] Sinkronisasi aturan gamifikasi selesai.")
}

// InitialSyncKategoriOrmawa seeds the default KategoriOrmawa master data.
// Called once on server startup. IsSystem = true means the category cannot be deleted.
func InitialSyncKategoriOrmawa(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi Kategori Ormawa...")

	defaults := []models.KategoriOrmawa{
		{
			Nama:                "BEM",
			Deskripsi:           "Badan Eksekutif Mahasiswa — tingkat universitas, proposal langsung ke Universitas",
			TerafiliasiFakultas: false,
			WajibProdi:          false,
			IsSystem:            true,
			Urutan:              1,
		},
		{
			Nama:                "Himpunan",
			Deskripsi:           "Himpunan Mahasiswa — terafiliasi dengan Fakultas, proposal WAJIB lewat Fakultas dahulu",
			TerafiliasiFakultas: true,
			WajibProdi:          true,
			IsSystem:            true,
			Urutan:              2,
		},
		{
			Nama:                "UKM",
			Deskripsi:           "Unit Kegiatan Mahasiswa — tingkat universitas, proposal langsung ke Universitas",
			TerafiliasiFakultas: false,
			WajibProdi:          false,
			IsSystem:            true,
			Urutan:              3,
		},
		{
			Nama:                "MPM",
			Deskripsi:           "Majelis Permusyawaratan Mahasiswa — tingkat universitas",
			TerafiliasiFakultas: false,
			WajibProdi:          false,
			IsSystem:            true,
			Urutan:              4,
		},
		{
			Nama:                "Komunitas",
			Deskripsi:           "Komunitas mahasiswa — bebas afiliasi",
			TerafiliasiFakultas: false,
			WajibProdi:          false,
			IsSystem:            false,
			Urutan:              5,
		},
		{
			Nama:                "Lainnya",
			Deskripsi:           "Kategori umum untuk organisasi yang tidak termasuk kategori di atas",
			TerafiliasiFakultas: false,
			WajibProdi:          false,
			IsSystem:            false,
			Urutan:              6,
		},
	}

	for _, kat := range defaults {
		var existing models.KategoriOrmawa
		if err := db.Where("nama = ?", kat.Nama).First(&existing).Error; err != nil {
			db.Create(&kat)
			log.Printf("[Initial Sync] Seed KategoriOrmawa: %s (TerafiliasiFakultas=%v)\n", kat.Nama, kat.TerafiliasiFakultas)
		}
	}
	log.Println("[Initial Sync] Sinkronisasi Kategori Ormawa selesai.")
}

func InitialSyncLandingSettings(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi Landing Settings...")
	var count int64
	db.Model(&models.LandingSetting{}).Count(&count)
	if count == 0 {
		db.Create(&models.LandingSetting{})
		log.Println("[Initial Sync] Seed Landing Settings berhasil.")
	} else {
		log.Println("[Initial Sync] Landing Settings sudah ada.")
	}
}

func InitialSyncDocumentSettings(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi Document Settings...")

	defaults := []models.DocumentSetting{
		{
			Modul:       "Medis",
			JenisSurat:  "Rujukan Medis",
			FormatNomor: "{{nomor}}/RUJ-MEDIS/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Medis",
			JenisSurat:  "BAP Kesehatan",
			FormatNomor: "{{nomor}}/BAP-KES/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Medis",
			JenisSurat:  "Hasil Medis",
			FormatNomor: "{{nomor}}/HASIL-MEDIS/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Psikolog",
			JenisSurat:  "Rujukan Psikolog",
			FormatNomor: "{{nomor}}/RUJ-PSIKOLOG/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Psikolog",
			JenisSurat:  "Hasil Konseling",
			FormatNomor: "{{nomor}}/HASIL-KONS/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Psikolog",
			JenisSurat:  "Rekap Sesi Konseling",
			FormatNomor: "{{nomor}}/REKAP-KONS/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Asuransi",
			JenisSurat:  "Klaim Asuransi Kesehatan",
			FormatNomor: "{{nomor}}/KLAIM-ASURANSI/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Ormawa",
			JenisSurat:  "Persetujuan Proposal",
			FormatNomor: "{{nomor}}/PROPOSAL-ORMAWA/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Kencana",
			JenisSurat:  "Sertifikat Kencana",
			FormatNomor: "{{nomor}}/SERTIF-KENCANA/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Keuangan",
			JenisSurat:  "Laporan Anggaran ORMAWA",
			FormatNomor: "{{nomor}}/LAP-ORMAWA/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Keuangan",
			JenisSurat:  "Laporan Realisasi Beasiswa",
			FormatNomor: "{{nomor}}/BEASISWA/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
		{
			Modul:       "Keuangan",
			JenisSurat:  "Laporan Pagu Anggaran ORMAWA",
			FormatNomor: "{{nomor}}/PAGU-ORMAWA/{{bulan_romawi}}/{{tahun}}",
			LastNumber:  0,
			ResetPeriod: "Tahunan",
		},
	}

	// Cleanup dormant/fake settings from DB
	db.Where("jenis_surat IN ?", []string{"Persetujuan LPJ", "Keterangan Mahasiswa Aktif", "Transkrip Prestasi"}).Delete(&models.DocumentSetting{})
	for _, doc := range defaults {
		var existing models.DocumentSetting
		if err := db.Where("jenis_surat = ?", doc.JenisSurat).First(&existing).Error; err != nil {
			db.Create(&doc)
			log.Printf("[Initial Sync] Seed DocumentSetting: %s\n", doc.JenisSurat)
		}
	}
	log.Println("[Initial Sync] Sinkronisasi Document Settings selesai.")
}

func InitialSyncSmtpSettings(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi SMTP Settings...")
	var count int64
	db.Model(&models.SmtpSetting{}).Count(&count)
	if count == 0 {
		db.Create(&models.SmtpSetting{
			ID:          1,
			Provider:    "SMTP",
			MailDriver:  "smtp",
			Host:        "smtp.bku.ac.id",
			Port:        "465",
			Username:    "noreply@bku.ac.id",
			Password:    "password",
			Encryption:  "TLS",
			FromAddress: "noreply@bku.ac.id",
			OtpLifetime: 5,
			OtpSubject:  "Kode OTP Registrasi Anda",
			OtpBody:     "<p>Halo {{NAMA}},</p><p>Kode OTP Anda adalah: <b>{{OTP}}</b></p><p>Berlaku selama {{LIFETIME}} menit.</p>",
			LpjSubject:  "Peringatan Keterlambatan LPJ",
			LpjBody:     "<p>Ormawa {{ORMAWA}}, kegiatan {{KEGIATAN}} Anda belum mengumpulkan LPJ.</p><p>Pinalti: {{XP_PENALTY}} XP.</p>",
			PaguSubject: "Pagu Anggaran Disetujui",
			PaguBody:    "<p>Ormawa {{ORMAWA}}, pagu anggaran untuk {{KEGIATAN}} sebesar {{ANGGARAN}} telah disetujui.</p>",
		})
		log.Println("[Initial Sync] Seed SMTP Settings berhasil.")
	} else {
		log.Println("[Initial Sync] SMTP Settings sudah ada.")
	}
}

func InitialSyncKencanaSettings(db *gorm.DB) {
	log.Println("[Initial Sync] Memulai sinkronisasi Kencana Certificate Settings...")
	var count int64
	db.Model(&models.KencanaCertificateSetting{}).Count(&count)
	if count == 0 {
		db.Create(&models.KencanaCertificateSetting{
			Theme:           "Membangun Generasi Emas",
			IssueDate:       "25 Agustus 2026",
			StartDate:       "25 Agustus",
			EndDate:         "27 Agustus 2026",
			RektorName:      "Dr. Entris Sutrisno, MH.Kes., Apt",
			RektorNik:       "0123456789",
			DirekturName:    "Nama Direktur",
			DirekturNik:     "0123456789",
			PresmaName:      "Nama Presma",
			PresmaNpm:       "201FF03068",
			ReferenceNumber: "02.08.01/FRM-1/KMHS-SPMI",
			LogoUrl:         "",
		})
		log.Println("[Initial Sync] Seed Kencana Certificate Settings berhasil.")
	} else {
		log.Println("[Initial Sync] Kencana Certificate Settings sudah ada.")
	}
}
