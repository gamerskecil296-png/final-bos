package ormawa

import (
	"encoding/json"
	"fmt"
	"os"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/gamifikasi"
	"strconv"
	"time"

	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// --- DASHBOARD ---

func GetOrmawaProfile(c *fiber.Ctx) error {
	ormawaId := c.Locals("ormawa_id")
	ormawaAssign := c.Locals("ormawa_assign").(string)

	if ormawaId == nil || ormawaId == uint(0) {
		if ormawaAssign != "" {
			return c.JSON(fiber.Map{
				"status": "success",
				"data": models.Ormawa{
					Nama:     ormawaAssign,
					Status:   "Aktif",
					Kategori: "Manual Assign",
				},
			})
		}
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized: Ormawa context missing"})
	}

	var ormawa models.Ormawa
	if err := config.DB.First(&ormawa, ormawaId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Organisasi tidak ditemukan"})
	}

	return c.JSON(fiber.Map{"status": "success", "data": ormawa})
}

func GetOrmawaStats(c *fiber.Ctx) error {
	// ormawaId is already injected into query by middleware (from X-Ormawa-ID header)
	ormawaId := c.Query("ormawaId")
	if ormawaId == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "ormawaId is required"})
	}

	var totalProposal int64
	var totalMember int64
	var totalEvents int64
	var totalAnnouncements int64

	// Stats Counts — always filtered by selected ormawa (including when SuperAdmin picks via dropdown)
	config.DB.Model(&models.Proposal{}).Where("ormawa_id = ?", ormawaId).Count(&totalProposal)
	config.DB.Model(&models.OrmawaAnggota{}).Where("ormawa_id = ?", ormawaId).Count(&totalMember)
	config.DB.Model(&models.OrmawaKegiatan{}).Where("ormawa_id = ?", ormawaId).Count(&totalEvents)
	config.DB.Model(&models.OrmawaPengumuman{}).Where("ormawa_id = ?", ormawaId).Count(&totalAnnouncements)

	// Kas Calculation
	var masuk float64
	var keluar float64
	config.DB.Model(&models.OrmawaMutasiSaldo{}).Where("ormawa_id = ? AND tipe = ?", ormawaId, "pemasukan").Select("COALESCE(SUM(nominal), 0)").Scan(&masuk)
	config.DB.Model(&models.OrmawaMutasiSaldo{}).Where("ormawa_id = ? AND tipe = ?", ormawaId, "pengeluaran").Select("COALESCE(SUM(nominal), 0)").Scan(&keluar)
	totalKas := masuk - keluar

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"totalProposals":     totalProposal,
			"totalMembers":       totalMember,
			"totalEvents":        totalEvents,
			"totalAnnouncements": totalAnnouncements,
			"totalKas":           totalKas,
		},
	})
}

// --- PROPOSALS ---

func GetProposals(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	var proposals []models.Proposal
	query := config.DB.Preload("Ormawa")

	if ormawaId != "" {
		query = query.Where("ormawa_id = ?", ormawaId)
	}
	query.Order("created_at desc").Find(&proposals)
	return c.JSON(fiber.Map{"status": "success", "data": proposals})
}

func GetProposalHistory(c *fiber.Ctx) error {
	id := c.Params("id")
	var history []models.ProposalRiwayat
	config.DB.Where("proposal_id = ?", id).Order("created_at asc").Find(&history)
	return c.JSON(fiber.Map{"status": "success", "data": history})
}

func CreateProposal(c *fiber.Ctx) error {
	var req struct {
		Judul           string    `json:"Judul"`
		TanggalKegiatan time.Time `json:"TanggalKegiatan"`
		Anggaran        float64   `json:"Anggaran"`
		OrmawaID        uint      `json:"OrmawaID"`
		MahasiswaID     uint      `json:"MahasiswaID"`
		FileURL         string    `json:"FileURL"`
		FileUrlAlias    string    `json:"file_url"`

		LandasanKegiatan      string `json:"LandasanKegiatan"`
		Deskripsi             string `json:"Deskripsi"`
		BentukKegiatan        string `json:"BentukKegiatan"`
		Mitra                 string `json:"Mitra"`
		LatarBelakang         string `json:"LatarBelakang"`
		TujuanKegiatan        string `json:"TujuanKegiatan"`
		JadwalPelaksanaan     string `json:"JadwalPelaksanaan"`
		SasaranKegiatan       string `json:"SasaranKegiatan"`
		IndikatorKeberhasilan string `json:"IndikatorKeberhasilan"`
		SumberDana            string `json:"SumberDana"`
		PJKegiatan            string `json:"PJKegiatan"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid: " + err.Error()})
	}

	payload := models.Proposal{
		Judul:                 req.Judul,
		TanggalKegiatan:       req.TanggalKegiatan,
		Anggaran:              req.Anggaran,
		OrmawaID:              req.OrmawaID,
		MahasiswaID:           req.MahasiswaID,
		FileURL:               req.FileURL,
		LandasanKegiatan:      req.LandasanKegiatan,
		Deskripsi:             req.Deskripsi,
		BentukKegiatan:        req.BentukKegiatan,
		Mitra:                 req.Mitra,
		LatarBelakang:         req.LatarBelakang,
		TujuanKegiatan:        req.TujuanKegiatan,
		JadwalPelaksanaan:     req.JadwalPelaksanaan,
		SasaranKegiatan:       req.SasaranKegiatan,
		IndikatorKeberhasilan: req.IndikatorKeberhasilan,
		SumberDana:            req.SumberDana,
		PJKegiatan:            req.PJKegiatan,
		Status:                "diajukan",
	}

	if req.FileUrlAlias != "" && payload.FileURL == "" {
		payload.FileURL = req.FileUrlAlias
	}

	// Force OrmawaID from token/query context if present
	if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		payload.OrmawaID = tokenOrmawaID
	}

	// Basic Validation
	if payload.Judul == "" || payload.OrmawaID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Judul dan Organisasi wajib diisi"})
	}
	if payload.Anggaran <= 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Anggaran harus lebih besar dari 0"})
	}

	// Kas balance check
	if strings.Contains(strings.ToLower(payload.SumberDana), "kas") || strings.Contains(strings.ToLower(payload.SumberDana), "organisasi") {
		var masuk float64
		var keluar float64
		config.DB.Model(&models.OrmawaMutasiSaldo{}).Where("ormawa_id = ? AND LOWER(tipe) = ?", payload.OrmawaID, "pemasukan").Select("COALESCE(SUM(nominal), 0)").Scan(&masuk)
		config.DB.Model(&models.OrmawaMutasiSaldo{}).Where("ormawa_id = ? AND LOWER(tipe) = ?", payload.OrmawaID, "pengeluaran").Select("COALESCE(SUM(nominal), 0)").Scan(&keluar)
		totalKas := masuk - keluar

		if payload.Anggaran > totalKas {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": fmt.Sprintf("Saldo Kas Organisasi tidak mencukupi (Tersedia: Rp %.0f, Dibutuhkan: Rp %.0f)", totalKas, payload.Anggaran),
			})
		}
	}

	// Blokir jika ada LPJ yang belum selesai (Mandatory Workflow)
	var unfinishedLpjCount int64
	config.DB.Model(&models.Proposal{}).
		Joins("LEFT JOIN ormawa.laporan_pertanggungjawaban lpj ON lpj.proposal_id = ormawa.proposal.id").
		Where("ormawa.proposal.ormawa_id = ?", payload.OrmawaID).
		Where("ormawa.proposal.status = ?", "disetujui_univ").
		Where("ormawa.proposal.tanggal_kegiatan < ?", time.Now()).
		Where("(lpj.id IS NULL OR lpj.status != ?)", "disetujui").
		Count(&unfinishedLpjCount)

	if unfinishedLpjCount > 0 {
		return c.Status(403).JSON(fiber.Map{
			"status":  "blocked",
			"message": "Pengajuan diblokir! Selesaikan LPJ kegiatan sebelumnya terlebih dahulu.",
		})
	}

	// Validasi Anggaran / Pagu (Financial Settings) — sync with GetFinancialSettings & GetBudgetStatus
	periode := fmt.Sprintf("%d", time.Now().Year())
	var setting models.OrmawaFinancialSetting
	if err := config.DB.Where("ormawa_id = ? AND periode = ?", payload.OrmawaID, periode).First(&setting).Error; err == nil {
		if setting.IsActive && setting.EnforceLimit {
			if payload.SumberDana == "Dana Kemahasiswaan Universitas" || payload.SumberDana == "Dana Kemahasiswaan Fakultas" {
				var approvedBudget float64
				config.DB.Model(&models.Proposal{}).
					Where("ormawa_id = ?", payload.OrmawaID).
					Where("status IN ?", []string{"disetujui_fakultas", "disetujui_univ", "selesai", "disetujui"}).
					Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
					Select("COALESCE(SUM(anggaran), 0)").
					Scan(&approvedBudget)

				var pendingBudget float64
				config.DB.Model(&models.Proposal{}).
					Where("ormawa_id = ?", payload.OrmawaID).
					Where("status = ?", "diajukan").
					Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
					Select("COALESCE(SUM(anggaran), 0)").
					Scan(&pendingBudget)

			totalCommitted := approvedBudget + pendingBudget
			remainingBudget := setting.BudgetLimit - totalCommitted
			if remainingBudget < 0 {
				remainingBudget = 0
			}

				if payload.Anggaran > remainingBudget {
					return c.Status(400).JSON(fiber.Map{
						"status":  "error",
						"message": fmt.Sprintf("Anggaran melebihi sisa pagu. Sisa pagu Anda: Rp %.0f (Terpakai: Rp %.0f, Menunggu: Rp %.0f)", remainingBudget, approvedBudget, pendingBudget),
					})
				}
			}
		}
	}

	// Create Proposal
	// Synchronize FakultasID with Ormawa's FakultasID
	// If Ormawa has FakultasID = NULL (university-level like BEM-U, UKM, MPM),
	// the proposal also gets FakultasID = NULL and goes DIRECTLY to Universitas queue.
	var ormawa models.Ormawa
	isUnivLevel := false
	if err := config.DB.First(&ormawa, payload.OrmawaID).Error; err == nil {
		if ormawa.FakultasID != nil {
			payload.FakultasID = ormawa.FakultasID // Faculty-affiliated ORMAWA
		} else {
			payload.FakultasID = nil // University-level ORMAWA → skip faculty step
			isUnivLevel = true
		}
	}

	// FIX: Get valid Mahasiswa if missing to prevent FK violations
	if payload.MahasiswaID == 0 {
		var mhs models.Mahasiswa
		if err := config.DB.Order("id asc").First(&mhs).Error; err == nil {
			payload.MahasiswaID = mhs.ID
		}
	}

	// For university-level ORMAWA: proposal status starts as "diajukan" but goes directly
	// to super_admin queue (GetGlobalProposals will show these too)
	// For faculty-affiliated ORMAWA: goes through faculty first → then univ
	if isUnivLevel {
		// Status stays "diajukan" → super admin sees it directly
		// We also set a sentinel: approved_fakultas_id stays nil
	}

	if err := config.DB.Create(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal menyimpan proposal: " + err.Error(),
			"debug_info": fiber.Map{
				"MahasiswaID": payload.MahasiswaID,
				"FakultasID":  payload.FakultasID,
				"OrmawaID":    payload.OrmawaID,
			},
		})
	}

	// Log History
	config.DB.Create(&models.ProposalRiwayat{
		ProposalID: payload.ID,
		Status:     "diajukan",
		Catatan:    "Proposal baru dibuat oleh sistem",
	})

	// Auto-create draft LPJ
	config.DB.Create(&models.LaporanPertanggungjawaban{
		ProposalID:        payload.ID,
		RealisasiAnggaran: 0,
		Status:            "draft",
		Catatan:           "LPJ otomatis di-draft setelah proposal diajukan.",
	})

	// Buat notifikasi ormawa
	config.DB.Create(&models.OrmawaNotifikasi{
		OrmawaID: payload.OrmawaID,
		Tipe:     "proposal",
		Judul:    "Proposal Baru Diajukan",
		Pesan:    fmt.Sprintf("Proposal '%s' telah diajukan dengan anggaran Rp %.0f.", payload.Judul, payload.Anggaran),
	})

	return c.Status(201).JSON(fiber.Map{"status": "success", "data": payload})
}

func UpdateProposal(c *fiber.Ctx) error {
	id := c.Params("id")
	role, _ := c.Locals("role").(string)
	isOrmawaAdmin := role == "ormawa_admin" || role == "ormawa"
	isFacultyAdmin := role == "fakultas_admin" || role == "dosen"

	var proposal models.Proposal
	if err := config.DB.First(&proposal, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Proposal tidak ditemukan"})
	}

	var payload struct {
		Status       string  `json:"Status"`
		Catatan      string  `json:"Catatan"`
		UserId       uint    `json:"UserId"`
		Anggaran     float64 `json:"Anggaran"`
		Judul        string  `json:"Judul"`
		FileURL      string  `json:"FileURL"`
		FileUrlAlias string  `json:"file_url"`

		LandasanKegiatan      string `json:"LandasanKegiatan"`
		Deskripsi             string `json:"Deskripsi"`
		BentukKegiatan        string `json:"BentukKegiatan"`
		Mitra                 string `json:"Mitra"`
		LatarBelakang         string `json:"LatarBelakang"`
		TujuanKegiatan        string `json:"TujuanKegiatan"`
		JadwalPelaksanaan     string `json:"JadwalPelaksanaan"`
		SasaranKegiatan       string `json:"SasaranKegiatan"`
		IndikatorKeberhasilan string `json:"IndikatorKeberhasilan"`
		SumberDana            string `json:"SumberDana"`
		PJKegiatan            string `json:"PJKegiatan"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	if payload.FileUrlAlias != "" && payload.FileURL == "" {
		payload.FileURL = payload.FileUrlAlias
	}

	// Budget re-validation when anggaran changes
	if payload.Anggaran > 0 && payload.Anggaran != proposal.Anggaran {
		sumberDana := proposal.SumberDana
		if payload.SumberDana != "" {
			sumberDana = payload.SumberDana
		}
		if sumberDana == "Dana Kemahasiswaan Universitas" || sumberDana == "Dana Kemahasiswaan Fakultas" {
			if allowed, _, _, msg := checkBudgetEnforceLimit(proposal.OrmawaID, proposal.ID, payload.Anggaran); !allowed {
				return c.Status(400).JSON(fiber.Map{"status": "error", "message": msg})
			}
		}
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Status transition guards
		if isOrmawaAdmin {
			if proposal.Status != "diajukan" {
				// Force reset to diajukan if edited after being approved/revisi
				payload.Status = "diajukan"
				payload.Catatan = "Proposal diperbarui oleh Ormawa, dikembalikan untuk persetujuan ulang."
			} else {
				// Prevent them from explicitly changing status if it's already diajukan
				payload.Status = proposal.Status
			}

			// Kas balance check
			sumberDana := proposal.SumberDana
			if payload.SumberDana != "" {
				sumberDana = payload.SumberDana
			}
			anggaran := proposal.Anggaran
			if payload.Anggaran > 0 {
				anggaran = payload.Anggaran
			}

			if strings.Contains(strings.ToLower(sumberDana), "kas") || strings.Contains(strings.ToLower(sumberDana), "organisasi") {
				var masuk float64
				var keluar float64
				tx.Model(&models.OrmawaMutasiSaldo{}).Where("ormawa_id = ? AND LOWER(tipe) = ?", proposal.OrmawaID, "pemasukan").Select("COALESCE(SUM(nominal), 0)").Scan(&masuk)
				tx.Model(&models.OrmawaMutasiSaldo{}).Where("ormawa_id = ? AND LOWER(tipe) = ?", proposal.OrmawaID, "pengeluaran").Select("COALESCE(SUM(nominal), 0)").Scan(&keluar)
				totalKas := masuk - keluar

				if anggaran > totalKas {
					return fmt.Errorf("saldo Kas Organisasi tidak mencukupi (Tersedia: Rp %.0f, Dibutuhkan: Rp %.0f)", totalKas, anggaran)
				}
			}
		} else {
			if payload.Status != "" && payload.Status != proposal.Status {
				// Faculty admin: only allowed transitions from "diajukan"
				if isFacultyAdmin {
					if proposal.Status != "diajukan" {
						return fmt.Errorf("proposal sudah diproses oleh fakultas, tidak bisa diubah lagi")
					}
					if payload.Status != "disetujui_fakultas" && payload.Status != "revisi" {
						return fmt.Errorf("status '%s' tidak diizinkan untuk fakultas", payload.Status)
					}
				}
				// super_admin can do any transition
			}
		}

		if payload.Status != "" || payload.Catatan != "" {
			history := models.ProposalRiwayat{
				ProposalID: proposal.ID,
				Status:     payload.Status,
				Catatan:    payload.Catatan,
			}
			if err := tx.Create(&history).Error; err != nil {
				return err
			}
		}

		// Mapping logic for Faculty Admin
		if payload.Status == "disetujui" {
			payload.Status = "disetujui_fakultas"
		}

		updates := make(map[string]interface{})
		if payload.Status != "" {
			updates["status"] = payload.Status
		}
		if payload.Judul != "" {
			updates["judul"] = payload.Judul
		}
		if payload.Anggaran > 0 {
			updates["anggaran"] = payload.Anggaran
		}
		if payload.FileURL != "" {
			updates["file_url"] = payload.FileURL
		}
		if payload.LandasanKegiatan != "" {
			updates["landasan_kegiatan"] = payload.LandasanKegiatan
		}
		if payload.Deskripsi != "" {
			updates["deskripsi"] = payload.Deskripsi
		}
		if payload.BentukKegiatan != "" {
			updates["bentuk_kegiatan"] = payload.BentukKegiatan
		}
		if payload.Mitra != "" {
			updates["mitra"] = payload.Mitra
		}
		if payload.LatarBelakang != "" {
			updates["latar_belakang"] = payload.LatarBelakang
		}
		if payload.TujuanKegiatan != "" {
			updates["tujuan_kegiatan"] = payload.TujuanKegiatan
		}
		if payload.JadwalPelaksanaan != "" {
			updates["jadwal_pelaksanaan"] = payload.JadwalPelaksanaan
		}
		if payload.SasaranKegiatan != "" {
			updates["sasaran_kegiatan"] = payload.SasaranKegiatan
		}
		if payload.IndikatorKeberhasilan != "" {
			updates["indikator_keberhasilan"] = payload.IndikatorKeberhasilan
		}
		if payload.SumberDana != "" {
			updates["sumber_dana"] = payload.SumberDana
		}
		if payload.PJKegiatan != "" {
			updates["pj_kegiatan"] = payload.PJKegiatan
		}

		if len(updates) > 0 {
			if err := tx.Model(&proposal).Updates(updates).Error; err != nil {
				return err
			}
		}

		if payload.Status != "" {
			// Notifikasi ormawa
			pesan := fmt.Sprintf("Status proposal '%s' berubah menjadi '%s'.", proposal.Judul, payload.Status)
			if payload.Status == "disetujui_fakultas" {
				pesan = fmt.Sprintf("Proposal '%s' telah disetujui Fakultas dan sedang menunggu pengesahan Universitas.", proposal.Judul)
			} else if payload.Status == "revisi" {
				pesan = fmt.Sprintf("Proposal '%s' dikembalikan oleh Fakultas: %s", proposal.Judul, payload.Catatan)
			}

			tx.Create(&models.OrmawaNotifikasi{
				OrmawaID: proposal.OrmawaID,
				Tipe:     "proposal",
				Judul:    "Update Status Proposal",
				Pesan:    pesan,
			})
		}

		return nil
	})

	if err != nil {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Proposal updated & integrated"})
}

func DeleteProposal(c *fiber.Ctx) error {
	id := c.Params("id")
	var proposal models.Proposal
	if err := config.DB.First(&proposal, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Proposal tidak ditemukan"})
	}

	status := strings.ToLower(strings.TrimSpace(proposal.Status))
	if status == "disetujui_fakultas" || status == "disetujui_univ" || status == "selesai" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Proposal yang sudah disetujui oleh Fakultas/Universitas tidak dapat dihapus"})
	}

	config.DB.Unscoped().Delete(&proposal)
	config.DB.Where("proposal_id = ?", id).Delete(&models.ProposalRiwayat{})
	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

func ResubmitProposal(c *fiber.Ctx) error {
	id := c.Params("id")

	var proposal models.Proposal
	if err := config.DB.First(&proposal, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Proposal tidak ditemukan"})
	}

	if strings.ToLower(strings.TrimSpace(proposal.Status)) != "revisi" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Hanya proposal dengan status Revisi yang bisa diajukan ulang"})
	}

	// Budget re-validation: resubmit mengubah status revisi → diajukan (masuk pending_budget)
	if proposal.SumberDana == "Dana Kemahasiswaan Universitas" || proposal.SumberDana == "Dana Kemahasiswaan Fakultas" {
		if allowed, _, _, msg := checkBudgetEnforceLimit(proposal.OrmawaID, 0, proposal.Anggaran); !allowed {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": msg})
		}
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&proposal).Update("status", "diajukan").Error; err != nil {
			return err
		}

		tx.Create(&models.ProposalRiwayat{
			ProposalID: proposal.ID,
			Status:     "diajukan",
			Catatan:    "Proposal diajukan ulang setelah revisi",
		})

		tx.Create(&models.OrmawaNotifikasi{
			OrmawaID: proposal.OrmawaID,
			Tipe:     "proposal",
			Judul:    "Proposal Diajukan Ulang",
			Pesan:    fmt.Sprintf("Proposal '%s' telah diajukan ulang setelah revisi dan masuk ke antrian Fakultas.", proposal.Judul),
		})

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Proposal berhasil diajukan ulang"})
}

// --- SETTINGS ---

func GetOrmawaSettings(c *fiber.Ctx) error {
	id := c.Params("id")
	var ormawa models.Ormawa
	if err := config.DB.First(&ormawa, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Organisasi tidak ditemukan"})
	}
	return c.JSON(fiber.Map{"status": "success", "data": ormawa})
}

func UpdateMember(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.OrmawaAnggota
	if err := config.DB.Preload("Mahasiswa").First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Anggota tidak ditemukan"})
	}

	ormawaIdVal := c.Locals("ormawa_id")
	if ormawaIdVal == nil {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized: Ormawa context missing"})
	}
	ormawaId := ormawaIdVal.(uint)

	if member.OrmawaID != ormawaId {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak. Anda tidak berhak mengubah anggota organisasi ini."})
	}

	// Get reviewer info
	userIdVal := c.Locals("user_id")
	var reviewerUser models.User
	if userIdVal != nil {
		if uid, ok := userIdVal.(uint); ok {
			config.DB.First(&reviewerUser, uid)
		}
	}

	// Payload with rejection reason support
	var payload struct {
		Role            string `json:"Role"`
		Divisi          string `json:"Divisi"`
		EmailKampus     string `json:"EmailKampus"`
		NoHP            string `json:"NoHP"`
		Status          string `json:"Status"`
		RejectionReason string `json:"rejection_reason"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	oldStatus := member.Status
	now := time.Now().UTC()

	// Update data anggota
	if payload.Role != "" {
		member.Role = payload.Role
	}
	if payload.Divisi != "" {
		member.Divisi = payload.Divisi
	}
	if payload.Status != "" {
		member.Status = payload.Status
	} else {
		member.Status = "aktif"
	}

	// Set review tracking
	member.ReviewedBy = &reviewerUser.ID
	member.ReviewedAt = &now
	if member.Status == "tidak_aktif" || member.Status == "ditolak" {
		member.RejectionReason = payload.RejectionReason
	}

	config.DB.Save(&member)

	// Sinkronisasi RiwayatOrganisasi
	year := time.Now().Year()
	periodeStr := fmt.Sprintf("%d/%d", year, year+1)

	if member.Status == "aktif" {
		var riwayat models.RiwayatOrganisasi
		errSync := config.DB.Where("mahasiswa_id = ? AND ormawa_id = ? AND periode = ?", member.MahasiswaID, member.OrmawaID, periodeStr).First(&riwayat).Error
		if errSync != nil {
			var ormawa models.Ormawa
			config.DB.First(&ormawa, member.OrmawaID)

			newRiwayat := models.RiwayatOrganisasi{
				MahasiswaID:       member.MahasiswaID,
				OrmawaID:          member.OrmawaID,
				NamaOrganisasi:    ormawa.Nama,
				Tipe:              ormawa.Kategori,
				Jabatan:           member.Role,
				PeriodeMulai:      year,
				PeriodeSelesai:    &[]int{year + 1}[0],
				Periode:           periodeStr,
				Status:            "Aktif",
				DeskripsiKegiatan: "Aktif sebagai anggota pengurus organisasi mahasiswa.",
				StatusVerifikasi:  "Terverifikasi",
			}
			config.DB.Create(&newRiwayat)
		} else {
			riwayat.Jabatan = member.Role
			riwayat.Status = "Aktif"
			config.DB.Save(&riwayat)
		}
	} else if oldStatus == "aktif" && (member.Status == "ditolak" || member.Status == "tidak_aktif") {
		config.DB.Model(&models.RiwayatOrganisasi{}).
			Where("mahasiswa_id = ? AND ormawa_id = ? AND periode = ?", member.MahasiswaID, member.OrmawaID, periodeStr).
			Updates(map[string]interface{}{
				"status": "Tidak Aktif",
			})
	}

	// Send notification to student
	notifDeskripsi := ""
	if member.Status == "aktif" {
		notifDeskripsi = "Selamat! Pendaftaran Anda di Ormawa telah diterima."
	} else {
		notifDeskripsi = "Pendaftaran Anda di Ormawa ditolak."
		if payload.RejectionReason != "" {
			notifDeskripsi += fmt.Sprintf(" Alasan: %s", payload.RejectionReason)
		}
	}
	var notifUser models.User
	config.DB.First(&notifUser, member.Mahasiswa.PenggunaID)
	if notifUser.ID != 0 {
		config.DB.Create(&models.Notifikasi{
			UserID:    notifUser.ID,
			Judul:     "Status Pendaftaran Ormawa",
			Deskripsi: notifDeskripsi,
			Tipe:      "ormawa",
		})
	}

	// Update data mahasiswa (Sinkronisasi Kontak)
	if member.MahasiswaID != 0 {
		mhsUpdates := map[string]interface{}{}
		if payload.EmailKampus != "" {
			mhsUpdates["email_kampus"] = payload.EmailKampus
		}
		if payload.NoHP != "" {
			mhsUpdates["no_hp"] = payload.NoHP
		}
		if len(mhsUpdates) > 0 {
			config.DB.Model(&models.Mahasiswa{}).Where("id = ?", member.MahasiswaID).Updates(mhsUpdates)
		}
	}

	config.DB.Preload("Mahasiswa").First(&member, member.ID)

	// Sync user.Role to make sure ormawa role is properly configured
	syncUserOrmawaRole(member.MahasiswaID)

	return c.JSON(fiber.Map{"status": "success", "data": member})
}

func UpdateOrmawaSettings(c *fiber.Ctx) error {
	id := c.Params("id")
	var ormawa models.Ormawa
	if err := config.DB.First(&ormawa, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Organisasi tidak ditemukan"})
	}

	if err := c.BodyParser(&ormawa); err != nil {
		return c.Status(422).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	if err := config.DB.Save(&ormawa).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan perubahan"})
	}

	return c.JSON(fiber.Map{"status": "success", "data": ormawa})
}

// --- FINANCE ---

func GetCashMutations(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	var mutasi []models.OrmawaMutasiSaldo
	query := config.DB.Preload("Ormawa")

	if ormawaId != "" {
		query = query.Where("ormawa_id = ?", ormawaId)
	} else if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		query = query.Where("ormawa_id = ?", tokenOrmawaID)
	}
	query.Order("tanggal desc").Find(&mutasi)
	return c.JSON(fiber.Map{"status": "success", "data": mutasi})
}

func CreateCashMutation(c *fiber.Ctx) error {
	var mutation models.OrmawaMutasiSaldo
	if err := c.BodyParser(&mutation); err != nil {
		return c.Status(422).JSON(fiber.Map{"status": "error", "message": "Input tidak valid"})
	}

	// Force OrmawaID from token/query context if present
	if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		mutation.OrmawaID = tokenOrmawaID
	}

	// Saldo validation: cek cukup tidak untuk pengeluaran
	if strings.ToLower(mutation.Tipe) == "pengeluaran" {
		var prevBalance float64
		tx := config.DB.Model(&models.OrmawaMutasiSaldo{}).
			Select("COALESCE(SUM(CASE WHEN LOWER(tipe) = 'pemasukan' THEN nominal ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN LOWER(tipe) = 'pengeluaran' THEN nominal ELSE 0 END), 0)")
		if mutation.OrmawaID != 0 {
			tx = tx.Where("ormawa_id = ?", mutation.OrmawaID)
		}
		tx.Scan(&prevBalance)
		if prevBalance < mutation.Nominal {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": fmt.Sprintf("Saldo tidak mencukupi! Saldo saat ini: Rp %.0f, pengeluaran: Rp %.0f", prevBalance, mutation.Nominal),
			})
		}
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if mutation.Tanggal.IsZero() {
			mutation.Tanggal = time.Now()
		}
		if err := tx.Create(&mutation).Error; err != nil {
			return err
		}
		// Buat notifikasi ormawa
		tx.Create(&models.OrmawaNotifikasi{
			OrmawaID: mutation.OrmawaID,
			Tipe:     "keuangan",
			Judul:    "Transaksi Kas Baru",
			Pesan:    fmt.Sprintf("Transaksi kas baru dicatat: %s sebesar Rp %.0f (%s).", mutation.Kategori, mutation.Nominal, mutation.Tipe),
		})
		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mencatat mutasi kas: " + err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"status": "success", "data": mutation})
}

func DeleteCashMutation(c *fiber.Ctx) error {
	id := c.Params("id")
	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	result := config.DB.Where("id = ? AND ormawa_id = ?", id, tokenOrmawaID).Delete(&models.OrmawaMutasiSaldo{})
	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mutasi kas tidak ditemukan"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Mutasi kas berhasil dihapus"})
}

// --- EVENTS ---

func GetEvents(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	var events []models.OrmawaKegiatan
	query := config.DB.Preload("Ormawa")

	if ormawaId != "" {
		query = query.Where("ormawa_id = ?", ormawaId)
	} else if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		query = query.Where("ormawa_id = ?", tokenOrmawaID)
	}
	query.Find(&events)
	return c.JSON(fiber.Map{"status": "success", "data": events})
}

func CreateEvent(c *fiber.Ctx) error {
	var payload models.OrmawaKegiatan
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	// Force OrmawaID from token/query context if present
	if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		payload.OrmawaID = tokenOrmawaID
	}

	// Validasi Rentang Tanggal
	if !payload.TanggalSelesai.IsZero() && payload.TanggalSelesai.Before(payload.TanggalMulai) {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Tanggal selesai tidak boleh mendahului tanggal mulai"})
	}

	if err := config.DB.Create(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan kegiatan"})
	}
	// Buat notifikasi ormawa
	config.DB.Create(&models.OrmawaNotifikasi{
		OrmawaID: payload.OrmawaID,
		Tipe:     "kegiatan",
		Judul:    "Agenda Baru Ditambahkan",
		Pesan:    fmt.Sprintf("Kegiatan baru '%s' telah dijadwalkan pada %s.", payload.Judul, payload.TanggalMulai.Format("02 Jan 2006")),
	})
	return c.JSON(fiber.Map{"status": "success", "data": payload})
}

func UpdateEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)

	var event models.OrmawaKegiatan
	if err := config.DB.Where("id = ? AND ormawa_id = ?", id, tokenOrmawaID).First(&event).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kegiatan tidak ditemukan"})
	}

	oldStatus := event.Status

	if err := c.BodyParser(&event); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}
	event.OrmawaID = tokenOrmawaID

	// Validasi Rentang Tanggal pada Update
	if !event.TanggalSelesai.IsZero() && event.TanggalSelesai.Before(event.TanggalMulai) {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Tanggal selesai tidak boleh mendahului tanggal mulai"})
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&event).Error; err != nil {
			return err
		}
		if (strings.ToLower(event.Status) == "selesai" || event.Status == "Selesai") && strings.ToLower(oldStatus) != "selesai" {
			if err := gamifikasi.AwardOrmawaPoints(tx, event.OrmawaID, "kegiatan_selesai", 50, "tambah", fmt.Sprintf("Kegiatan selesai dilaksanakan: %s", event.Judul)); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "data": event})
}

func DeleteEvent(c *fiber.Ctx) error {
	id := c.Params("id")
	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	result := config.DB.Where("id = ? AND ormawa_id = ?", id, tokenOrmawaID).Delete(&models.OrmawaKegiatan{})
	if result.RowsAffected == 0 {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kegiatan tidak ditemukan"})
	}
	return c.JSON(fiber.Map{"status": "success"})
}

// --- ATTENDANCE ---

func GetAttendance(c *fiber.Ctx) error {
	eventId := c.Params("eventId")

	var kegiatan models.OrmawaKegiatan
	if err := config.DB.First(&kegiatan, eventId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kegiatan tidak ditemukan"})
	}

	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	if tokenOrmawaID != 0 && kegiatan.OrmawaID != tokenOrmawaID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
	}

	// 1. Fetch all active members of this ormawa
	var members []models.OrmawaAnggota
	config.DB.Preload("Mahasiswa").Where("ormawa_id = ? AND LOWER(status) = 'aktif'", kegiatan.OrmawaID).Find(&members)

	// 2. Fetch all existing attendance records
	var attendance []models.OrmawaKehadiran
	config.DB.Preload("Mahasiswa").Where("kegiatan_id = ?", eventId).Find(&attendance)

	// 3. Map existing attendance by MahasiswaID
	attMap := make(map[uint]models.OrmawaKehadiran)
	for _, a := range attendance {
		attMap[a.MahasiswaID] = a
	}

	// 4. Merge: for each active member, check if they have attendance. If not, create virtual
	var result []models.OrmawaKehadiran
	for _, m := range members {
		if m.Mahasiswa.ID == 0 {
			continue // skip if student record is invalid
		}
		if att, exists := attMap[m.MahasiswaID]; exists {
			result = append(result, att)
		} else {
			result = append(result, models.OrmawaKehadiran{
				KegiatanID:  kegiatan.ID,
				MahasiswaID: m.MahasiswaID,
				Mahasiswa:   m.Mahasiswa,
				Status:      "belum_absen",
			})
		}
	}

	return c.JSON(fiber.Map{"status": "success", "data": result})
}

func SubmitAttendance(c *fiber.Ctx) error {
	var data struct {
		KegiatanID  uint   `json:"KegiatanID"`
		MahasiswaID uint   `json:"MahasiswaID"`
		Status      string `json:"Status"`
	}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Input tidak valid"})
	}

	if data.KegiatanID == 0 || data.MahasiswaID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "KegiatanID dan MahasiswaID wajib diisi"})
	}

	var kegiatan models.OrmawaKegiatan
	if err := config.DB.First(&kegiatan, data.KegiatanID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kegiatan tidak ditemukan"})
	}

	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	if tokenOrmawaID != 0 && kegiatan.OrmawaID != tokenOrmawaID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
	}

	// Expiration check only for self-presensi (student scanning for themselves)
	studentID, _ := c.Locals("student_id").(uint)
	role, _ := c.Locals("role").(string)
	isSelfPresensi := (strings.ToLower(role) == "mahasiswa" || strings.ToLower(role) == "student") && studentID == data.MahasiswaID

	if isSelfPresensi {
		if kegiatan.Status == "selesai" || kegiatan.Status == "dibatalkan" {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Presensi gagal: Kegiatan ini sudah selesai atau dibatalkan."})
		}

		if !kegiatan.TanggalSelesai.IsZero() && time.Now().After(kegiatan.TanggalSelesai) {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Presensi gagal: Sesi kegiatan ini sudah berakhir (Expired)."})
		}

		if kegiatan.TanggalSelesai.IsZero() && !kegiatan.TanggalMulai.IsZero() && time.Now().After(kegiatan.TanggalMulai.Add(24*time.Hour)) {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Presensi gagal: Batas waktu presensi kegiatan ini sudah berakhir."})
		}
	}

	var existing models.OrmawaKehadiran
	err := config.DB.Where("kegiatan_id = ? AND mahasiswa_id = ?", data.KegiatanID, data.MahasiswaID).First(&existing).Error

	if err == nil {
		existing.Status = data.Status
		existing.WaktuHadir = time.Now()
		config.DB.Save(&existing)
		return c.JSON(fiber.Map{"status": "success", "message": "Absensi diperbarui", "data": existing})
	}

	payload := models.OrmawaKehadiran{
		KegiatanID:  data.KegiatanID,
		MahasiswaID: data.MahasiswaID,
		Status:      data.Status,
		WaktuHadir:  time.Now(),
	}
	if err := config.DB.Create(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mencatat absensi"})
	}

	return c.Status(201).JSON(fiber.Map{"status": "success", "data": payload})
}

// --- ANNOUNCEMENTS ---

func GetAnnouncements(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	var list []models.OrmawaPengumuman
	query := config.DB.Preload("Ormawa")

	if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		query = query.Where("ormawa_id = ?", tokenOrmawaID)
	} else if ormawaId != "" {
		query = query.Where("ormawa_id = ?", ormawaId)
	}
	query.Order("created_at desc").Find(&list)
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func CreateAnnouncement(c *fiber.Ctx) error {
	var payload models.OrmawaPengumuman
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	// Force OrmawaID from token/query context if present
	if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		payload.OrmawaID = tokenOrmawaID
	}

	// Default to now if zero
	if payload.TanggalMulai.IsZero() {
		payload.TanggalMulai = time.Now()
	}

	if err := config.DB.Create(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan pengumuman: " + err.Error()})
	}

	createdAt := payload.TanggalMulai

	// Buat notifikasi ormawa
	notifOrmawa := models.OrmawaNotifikasi{
		OrmawaID: payload.OrmawaID,
		Tipe:     "pengumuman",
		Judul:    "Pengumuman Baru",
		Pesan:    fmt.Sprintf("Pengumuman baru dirilis: '%s'.", payload.Judul),
	}
	notifOrmawa.CreatedAt = createdAt
	config.DB.Create(&notifOrmawa)

	// Buat notifikasi untuk anggota ormawa
	var anggota []models.OrmawaAnggota
	config.DB.Preload("Mahasiswa").Where("ormawa_id = ?", payload.OrmawaID).Find(&anggota)
	for _, a := range anggota {
		if a.Mahasiswa.PenggunaID != 0 {
			notifMember := models.Notifikasi{
				UserID:    a.Mahasiswa.PenggunaID,
				Tipe:      "pengumuman_ormawa",
				Judul:     "Pengumuman Ormawa",
				Deskripsi: fmt.Sprintf("Ada pengumuman baru: '%s'", payload.Judul),
			}
			notifMember.CreatedAt = createdAt
			config.DB.Create(&notifMember)
		}
	}

	return c.JSON(fiber.Map{"status": "success", "data": payload})
}

func UpdateAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	var item models.OrmawaPengumuman
	if err := config.DB.First(&item, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Not found"})
	}
	c.BodyParser(&item)
	config.DB.Save(&item)
	return c.JSON(fiber.Map{"status": "success", "data": item})
}

func DeleteAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.OrmawaPengumuman{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

// --- ROLES ---

func seedDefaultOrmawaRoles(db *gorm.DB, ormawaId uint) error {
	defaultRoles := []struct {
		Nama      string
		Deskripsi string
		Hak       []string
	}{
		{
			Nama:      "Ketua",
			Deskripsi: "Akses penuh ke seluruh fitur dan pengaturan organisasi.",
			Hak: []string{
				"view_dashboard", "view_notifications",
				"view_members", "create_members", "edit_members", "delete_members",
				"view_staff", "manage_staff", "view_structure", "manage_structure",
				"view_proposal", "create_proposal", "edit_proposal", "delete_proposal",
				"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc", "delete_lpj",
				"view_calendar", "create_calendar", "edit_calendar", "delete_calendar",
				"view_attendance", "submit_attendance", "edit_attendance",
				"view_finance", "create_finance", "delete_finance",
				"view_aspirations", "respond_aspirations",
				"view_announcements", "create_announcements", "edit_announcements", "delete_announcements",
				"view_rbac", "manage_rbac", "view_settings", "manage_settings",
			},
		},
		{
			Nama:      "Wakil Ketua",
			Deskripsi: "Membantu dan mewakili Ketua dalam mengelola organisasi, memiliki akses hampir setara kecuali pengaturan RBAC dan sistem.",
			Hak: []string{
				"view_dashboard", "view_notifications",
				"view_members", "create_members", "edit_members",
				"view_staff", "manage_staff", "view_structure", "manage_structure",
				"view_proposal", "create_proposal", "edit_proposal", "delete_proposal",
				"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc", "delete_lpj",
				"view_calendar", "create_calendar", "edit_calendar", "delete_calendar",
				"view_attendance", "submit_attendance", "edit_attendance",
				"view_finance", "create_finance",
				"view_aspirations", "respond_aspirations",
				"view_announcements", "create_announcements", "edit_announcements", "delete_announcements",
				"view_settings",
			},
		},
		{
			Nama:      "Sekretaris",
			Deskripsi: "Mengelola persuratan, proposal, laporan pertanggungjawaban (LPJ), agenda kalender, dan data keanggotaan.",
			Hak: []string{
				"view_dashboard", "view_notifications",
				"view_members", "create_members", "edit_members",
				"view_staff", "manage_staff", "view_structure",
				"view_proposal", "create_proposal", "edit_proposal", "delete_proposal",
				"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc",
				"view_calendar", "create_calendar", "edit_calendar", "delete_calendar",
				"view_attendance", "submit_attendance", "edit_attendance",
				"view_announcements", "create_announcements", "edit_announcements", "delete_announcements",
			},
		},
		{
			Nama:      "Bendahara",
			Deskripsi: "Mengelola anggaran keuangan, mencatat buku kas, dan menyusun laporan pertanggungjawaban (LPJ) keuangan.",
			Hak: []string{
				"view_dashboard", "view_notifications",
				"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc",
				"view_finance", "create_finance", "delete_finance",
			},
		},
		{
			Nama:      "Staff",
			Deskripsi: "Melihat dashboard, notifikasi, dan kalender kegiatan organisasi.",
			Hak: []string{
				"view_dashboard", "view_notifications",
				"view_calendar", "view_announcements",
			},
		},
		{
			Nama:      "Kepala Divisi",
			Deskripsi: "Mengelola agenda kegiatan, melakukan absensi kepengurusan, dan menyusun draf pengajuan proposal/LPJ divisi.",
			Hak: []string{
				"view_dashboard", "view_notifications",
				"view_members",
				"view_staff", "view_structure",
				"view_proposal", "create_proposal", "edit_proposal",
				"view_lpj", "create_lpj", "upload_lpj_doc",
				"view_calendar", "create_calendar", "edit_calendar", "delete_calendar",
				"view_attendance", "submit_attendance",
				"view_announcements", "create_announcements", "edit_announcements",
			},
		},
	}

	for _, dr := range defaultRoles {
		perms, _ := json.Marshal(dr.Hak)
		role := models.OrmawaRole{
			OrmawaID:    ormawaId,
			Nama:        dr.Nama,
			Deskripsi:   dr.Deskripsi,
			Permissions: datatypes.JSON(perms),
		}
		if err := db.Create(&role).Error; err != nil {
			return err
		}
	}
	return nil
}

func GetOrmawaRoles(c *fiber.Ctx) error {
	ormawaIdStr := c.Query("ormawaId")
	var roles []models.OrmawaRole

	if ormawaIdStr != "" {
		ormawaIdVal, err := strconv.Atoi(ormawaIdStr)
		if err == nil && ormawaIdVal > 0 {
			ormawaId := uint(ormawaIdVal)
			var count int64
			config.DB.Model(&models.OrmawaRole{}).Where("ormawa_id = ?", ormawaId).Count(&count)
			if count == 0 {
				_ = seedDefaultOrmawaRoles(config.DB, ormawaId)
			}
		}
	}

	query := config.DB.Model(&models.OrmawaRole{})
	if ormawaIdStr != "" {
		query = query.Where("ormawa_id = ?", ormawaIdStr)
	}
	query.Find(&roles)
	return c.JSON(fiber.Map{"status": "success", "data": roles})
}

func CreateOrmawaRole(c *fiber.Ctx) error {
	var data struct {
		OrmawaID  uint     `json:"OrmawaID"`
		Nama      string   `json:"Nama"`
		Deskripsi string   `json:"Deskripsi"`
		Hak       []string `json:"Hak"`
	}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		data.OrmawaID = tokenOrmawaID
	} else if data.OrmawaID == 0 {
		if localId := c.Locals("ormawa_id"); localId != nil {
			if uid, ok := localId.(uint); ok {
				data.OrmawaID = uid
			}
		}
	}

	if data.OrmawaID == 0 {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Ormawa ID tidak ditemukan dalam konteks login. Silakan periksa kembali profil/anggota ormawa Anda.",
		})
	}

	perms, _ := json.Marshal(data.Hak)
	role := models.OrmawaRole{
		OrmawaID:    data.OrmawaID,
		Nama:        data.Nama,
		Deskripsi:   data.Deskripsi,
		Permissions: datatypes.JSON(perms),
	}
	if err := config.DB.Create(&role).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan ke database: " + err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"status": "success", "data": role})
}

func UpdateOrmawaRole(c *fiber.Ctx) error {
	id := c.Params("id")
	var role models.OrmawaRole
	if err := config.DB.First(&role, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Role tidak ditemukan"})
	}

	var data struct {
		OrmawaID  uint     `json:"OrmawaID"`
		Nama      string   `json:"Nama"`
		Deskripsi string   `json:"Deskripsi"`
		Hak       []string `json:"Hak"`
	}
	c.BodyParser(&data)

	if tokenOrmawaID, ok := c.Locals("ormawa_id").(uint); ok && tokenOrmawaID != 0 {
		data.OrmawaID = tokenOrmawaID
	}

	perms, _ := json.Marshal(data.Hak)
	if data.OrmawaID != 0 {
		role.OrmawaID = data.OrmawaID
	}
	if role.OrmawaID == 0 {
		if localId := c.Locals("ormawa_id"); localId != nil {
			if uid, ok := localId.(uint); ok {
				role.OrmawaID = uid
			}
		}
	}
	if role.OrmawaID == 0 {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Ormawa ID tidak ditemukan dalam konteks login. Silakan periksa kembali profil/anggota ormawa Anda.",
		})
	}

	role.Nama = data.Nama
	role.Deskripsi = data.Deskripsi
	role.Permissions = datatypes.JSON(perms)

	if err := config.DB.Save(&role).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui role: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": role})
}

func DeleteOrmawaRole(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.OrmawaRole{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

// --- MEMBERS ---

func GetMembers(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	periode := c.Query("periode") // "aktif" or specific like "2023/2024"
	role, _ := c.Locals("role").(string)
	isSuperAdmin := strings.ToLower(role) == "super_admin"

	// Write to debug log file
	logFile, err := os.OpenFile("backend_debug.log", os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err == nil {
		defer logFile.Close()
		fmt.Fprintf(logFile, "[GetMembers] URI: %s, ormawaId: %s, periode: %s, role: %s, isSuperAdmin: %t, X-Ormawa-ID: %s\n",
			c.OriginalURL(), ormawaId, periode, role, isSuperAdmin, c.Get("X-Ormawa-ID"))
	}

	if ormawaId == "" || ormawaId == "null" || ormawaId == "undefined" {
		if !isSuperAdmin {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "ormawaId is required"})
		}
		ormawaId = "" // Reset to empty if super admin wants all
	} else {
		// Verify ormawaId is numeric
		if _, err := strconv.Atoi(ormawaId); err != nil {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid ormawaId format"})
		}
	}

	type UnifiedMember struct {
		ID               uint                   `json:"ID"`
		MahasiswaID      uint                   `json:"MahasiswaID"`
		Role             string                 `json:"Role"`
		Divisi           string                 `json:"Divisi"`
		DivisiPilihanDua string                 `json:"divisi_pilihan_dua"`
		IPK              float64                `json:"ipk"`
		Alasan           string                 `json:"alasan"`
		CVURL            string                 `json:"cv_url"`
		CustomAnswers    map[string]interface{} `json:"custom_answers"`
		Status           string                 `json:"Status"`
		Periode          string                 `json:"Periode"`
		Mahasiswa        models.Mahasiswa       `json:"Mahasiswa"`
		Ormawa           models.Ormawa          `json:"Ormawa"`
		CreatedAt        time.Time              `json:"CreatedAt"`
		RejectionReason  string                 `json:"rejection_reason"`
		ReviewedBy       *uint                  `json:"reviewed_by"`
		ReviewedAt       *time.Time             `json:"reviewed_at"`
	}

	var result []UnifiedMember

	// Get all available past periods
	var availablePeriods []string
	periodQuery := config.DB.Model(&models.RiwayatOrganisasi{})
	if ormawaId != "" {
		periodQuery = periodQuery.Where("ormawa_id = ?", ormawaId)
	}
	periodQuery.
		Where("periode IS NOT NULL AND periode != ''").
		Order("periode desc").
		Distinct().
		Pluck("periode", &availablePeriods)

	if periode == "" || periode == "aktif" {
		var members []models.OrmawaAnggota
		mQuery := config.DB.Model(&models.OrmawaAnggota{}).Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").Preload("Ormawa")
		if ormawaId != "" {
			mQuery = mQuery.Where("ormawa_id = ?", ormawaId)
		}

		// Pagination
		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "50"))
		if page < 1 {
			page = 1
		}
		if limit < 1 {
			limit = 50
		}
		if limit > 200 {
			limit = 200
		}
		offset := (page - 1) * limit

		// Sort
		sortBy := c.Query("sort_by", "created_at")
		sortOrder := c.Query("sort_order", "desc")
		if sortOrder != "asc" && sortOrder != "desc" {
			sortOrder = "desc"
		}
		allowedSorts := map[string]bool{"created_at": true, "ipk": true, "status": true, "divisi": true}
		if !allowedSorts[sortBy] {
			sortBy = "created_at"
		}

		var totalCount int64
		mQuery.Count(&totalCount)
		mQuery.Order("ormawa_anggota." + sortBy + " " + sortOrder).Offset(offset).Limit(limit).Find(&members)

		for _, m := range members {
			year := m.JoinedAt.Year()
			if year < 2000 {
				year = time.Now().Year()
			}
			pStr := fmt.Sprintf("%d/%d", year, year+1)

			var ca map[string]interface{}
			if m.CustomAnswers != "" {
				json.Unmarshal([]byte(m.CustomAnswers), &ca)
			}

			result = append(result, UnifiedMember{
				ID:               m.ID,
				MahasiswaID:      m.MahasiswaID,
				Role:             m.Role,
				Divisi:           m.Divisi,
				DivisiPilihanDua: m.DivisiPilihanDua,
				IPK:              m.IPK,
				Alasan:           m.Alasan,
				CVURL:            m.CVURL,
				CustomAnswers:    ca,
				Status:           m.Status,
				Periode:          pStr,
				Mahasiswa:        m.Mahasiswa,
				Ormawa:           m.Ormawa,
				CreatedAt:        m.CreatedAt,
				RejectionReason:  m.RejectionReason,
				ReviewedBy:       m.ReviewedBy,
				ReviewedAt:       m.ReviewedAt,
			})
		}

		return c.JSON(fiber.Map{
			"status":  "success",
			"data":    result,
			"periods": availablePeriods,
			"pagination": fiber.Map{
				"page":        page,
				"limit":       limit,
				"total":       totalCount,
				"total_pages": (totalCount + int64(limit) - 1) / int64(limit),
			},
		})
	} else {
		var history []models.RiwayatOrganisasi
		hQuery := config.DB.Preload("Mahasiswa").Preload("Ormawa")
		if ormawaId != "" {
			hQuery = hQuery.Where("ormawa_id = ? AND periode = ?", ormawaId, periode)
		} else if isSuperAdmin {
			hQuery = hQuery.Where("periode = ?", periode)
		}
		hQuery.Find(&history)

		for _, h := range history {
			result = append(result, UnifiedMember{
				ID:          h.ID,
				MahasiswaID: h.MahasiswaID,
				Role:        h.Jabatan,
				Divisi:      "",
				Status:      h.Status,
				Periode:     h.Periode,
				Mahasiswa:   h.Mahasiswa,
				Ormawa:      h.Ormawa,
				CreatedAt:   h.CreatedAt,
			})
		}
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"data":    result,
		"periods": availablePeriods,
	})
}

func RegenerateMembers(c *fiber.Ctx) error {
	ormawaIdVal := c.Locals("ormawa_id")
	if ormawaIdVal == nil {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized"})
	}
	ormawaId := ormawaIdVal.(uint)

	var ormawa models.Ormawa
	if err := config.DB.First(&ormawa, ormawaId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Organisasi tidak ditemukan"})
	}

	var members []models.OrmawaAnggota
	config.DB.Preload("Mahasiswa").Where("ormawa_id = ? AND LOWER(status) = 'aktif'", ormawaId).Find(&members)

	if len(members) == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Tidak ada anggota aktif untuk diregenerasi"})
	}

	year := time.Now().Year()
	periodeStr := fmt.Sprintf("%d/%d", year-1, year)

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		for _, m := range members {
			existingRiwayat := config.DB.Where("mahasiswa_id = ? AND ormawa_id = ? AND periode = ?", m.MahasiswaID, ormawaId, periodeStr).First(&models.RiwayatOrganisasi{}).Error
			if existingRiwayat != nil {
				riwayat := models.RiwayatOrganisasi{
					MahasiswaID:       m.MahasiswaID,
					OrmawaID:          ormawaId,
					NamaOrganisasi:    ormawa.Nama,
					Tipe:              ormawa.Kategori,
					Jabatan:           m.Role,
					PeriodeMulai:      year - 1,
					PeriodeSelesai:    &[]int{year}[0],
					Periode:           periodeStr,
					Status:            "Selesai",
					DeskripsiKegiatan: "Anggota pengurus ormawa periode " + periodeStr,
					StatusVerifikasi:  "Terverifikasi",
				}
				if err := tx.Create(&riwayat).Error; err != nil {
					return err
				}
			}
		}

		if err := tx.Model(&models.OrmawaAnggota{}).Where("ormawa_id = ? AND LOWER(status) = 'aktif'", ormawaId).Update("status", "tidak_aktif").Error; err != nil {
			return err
		}

		tx.Create(&models.OrmawaNotifikasi{
			OrmawaID: ormawaId,
			Tipe:     "anggota",
			Judul:    "Regenerasi Kepengurusan",
			Pesan:    fmt.Sprintf("Periode %s telah diarsipkan. Semua anggota aktif dinonaktifkan. Silakan daftarkan anggota baru.", periodeStr),
		})

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal regenerasi: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": fmt.Sprintf("Regenerasi berhasil. %d anggota diarsipkan ke periode %s.", len(members), periodeStr)})
}

func CreateMember(c *fiber.Ctx) error {
	var payload struct {
		MahasiswaID      uint   `json:"MahasiswaID"`
		OrmawaID         uint   `json:"OrmawaID"`
		Role             string `json:"Role"`
		Divisi           string `json:"Divisi"`
		DivisiPilihanDua string `json:"DivisiPilihanDua"`
		EmailKampus      string `json:"EmailKampus"`
		NoHP             string `json:"NoHP"`
		Status           string `json:"Status"` // "aktif" or "pending"
		Alasan           string `json:"Alasan"`
		CVURL            string `json:"CVURL"`
		CustomAnswers    string `json:"CustomAnswers"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	ormawaIdVal := c.Locals("ormawa_id")
	if ormawaIdVal == nil {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized: Ormawa context missing"})
	}
	ormawaId := ormawaIdVal.(uint)

	// Enforce OrmawaID scope from the request credentials
	payload.OrmawaID = ormawaId

	var ormawa models.Ormawa
	if err := config.DB.First(&ormawa, payload.OrmawaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Ormawa tidak ditemukan"})
	}

	var mhs models.Mahasiswa
	if err := config.DB.Select("fakultas_id").First(&mhs, payload.MahasiswaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan"})
	}

	if ormawa.FakultasID != nil && mhs.FakultasID != *ormawa.FakultasID {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Mahasiswa harus berasal dari fakultas yang sama dengan organisasi.",
		})
	}

	status := "aktif"
	if payload.Status == "pending" {
		status = "pending"
	}

	member := models.OrmawaAnggota{
		MahasiswaID:      payload.MahasiswaID,
		OrmawaID:         payload.OrmawaID,
		Role:             payload.Role,
		Divisi:           payload.Divisi,
		DivisiPilihanDua: payload.DivisiPilihanDua,
		Alasan:           payload.Alasan,
		CVURL:            payload.CVURL,
		CustomAnswers:    payload.CustomAnswers,
		IPK:              mhs.IPK,
		Status:           status,
		JoinedAt:         time.Now(),
	}

	if err := config.DB.Create(&member).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menambah anggota"})
	}

	if status == "aktif" {
		// Sinkronisasi RiwayatOrganisasi Portfolio
		year := time.Now().Year()
		periodeStr := fmt.Sprintf("%d/%d", year, year+1)

		var riwayat models.RiwayatOrganisasi
		errSync := config.DB.Where("mahasiswa_id = ? AND ormawa_id = ? AND periode = ?", payload.MahasiswaID, payload.OrmawaID, periodeStr).First(&riwayat).Error
		if errSync != nil {
			newRiwayat := models.RiwayatOrganisasi{
				MahasiswaID:       payload.MahasiswaID,
				OrmawaID:          payload.OrmawaID,
				NamaOrganisasi:    ormawa.Nama,
				Tipe:              ormawa.Kategori,
				Jabatan:           payload.Role,
				PeriodeMulai:      year,
				PeriodeSelesai:    &[]int{year + 1}[0],
				Periode:           periodeStr,
				Status:            "Aktif",
				DeskripsiKegiatan: "Aktif sebagai anggota pengurus organisasi mahasiswa.",
				StatusVerifikasi:  "Terverifikasi",
			}
			config.DB.Create(&newRiwayat)
		} else {
			riwayat.Jabatan = payload.Role
			riwayat.Status = "Aktif"
			config.DB.Save(&riwayat)
		}

		// Sinkronisasi Kontak Mahasiswa
		mhsUpdates := map[string]interface{}{}
		if payload.EmailKampus != "" {
			mhsUpdates["email_kampus"] = payload.EmailKampus
		}
		if payload.NoHP != "" {
			mhsUpdates["no_hp"] = payload.NoHP
		}
		if len(mhsUpdates) > 0 {
			config.DB.Model(&models.Mahasiswa{}).Where("id = ?", member.MahasiswaID).Updates(mhsUpdates)
		}

		config.DB.Preload("Mahasiswa").First(&member, member.ID)

		// Buat notifikasi ormawa
		config.DB.Create(&models.OrmawaNotifikasi{
			OrmawaID: member.OrmawaID,
			Tipe:     "anggota",
			Judul:    "Anggota Baru Bergabung",
			Pesan:    fmt.Sprintf("Mahasiswa %s telah bergabung dengan organisasi sebagai %s.", member.Mahasiswa.Nama, member.Role),
		})

		// Synchronize user.Role to include "ormawa"
		syncUserOrmawaRole(member.MahasiswaID)
	} else {
		config.DB.Preload("Mahasiswa").First(&member, member.ID)

		// Buat notifikasi ormawa untuk pendaftaran baru
		config.DB.Create(&models.OrmawaNotifikasi{
			OrmawaID: member.OrmawaID,
			Tipe:     "anggota",
			Judul:    "Pendaftaran Manual Ditambahkan",
			Pesan:    fmt.Sprintf("Pendaftaran manual untuk mahasiswa %s berhasil diajukan.", member.Mahasiswa.Nama),
		})
	}

	return c.JSON(fiber.Map{"status": "success", "data": member})
}

func DeleteMember(c *fiber.Ctx) error {
	id := c.Params("id")
	var member models.OrmawaAnggota
	if err := config.DB.First(&member, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Anggota tidak ditemukan"})
	}

	ormawaIdVal := c.Locals("ormawa_id")
	if ormawaIdVal == nil {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized: Ormawa context missing"})
	}
	ormawaId := ormawaIdVal.(uint)

	if member.OrmawaID != ormawaId {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak. Anda tidak berhak menghapus anggota organisasi ini."})
	}

	year := time.Now().Year()
	periodeStr := fmt.Sprintf("%d/%d", year, year+1)
	config.DB.Model(&models.RiwayatOrganisasi{}).
		Where("mahasiswa_id = ? AND ormawa_id = ? AND periode = ?", member.MahasiswaID, member.OrmawaID, periodeStr).
		Update("status", "Demisioner")

	config.DB.Unscoped().Delete(&member)

	// Sync user.Role to remove "ormawa" if no active membership is left
	syncUserOrmawaRole(member.MahasiswaID)

	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

// --- NOTIFICATIONS ---

func GetOrmawaNotifications(c *fiber.Ctx) error {
	ctxOrmawaId, ok := c.Locals("ormawa_id").(uint)
	role, _ := c.Locals("role").(string)
	isSuperAdmin := strings.ToLower(role) == "super_admin"

	var targetOrmawaId uint
	if ok && ctxOrmawaId > 0 {
		targetOrmawaId = ctxOrmawaId
	} else {
		if qId := c.Query("ormawaId"); qId != "" {
			var parsed uint
			if _, err := fmt.Sscanf(qId, "%d", &parsed); err == nil {
				targetOrmawaId = parsed
			}
		}
	}

	if targetOrmawaId == 0 && !isSuperAdmin {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "ormawaId required"})
	}

	var list []models.OrmawaNotifikasi
	query := config.DB.Model(&models.OrmawaNotifikasi{}).Preload("Ormawa")
	if targetOrmawaId > 0 {
		query = query.Where("ormawa_id = ?", targetOrmawaId)
	}
	query.Order("created_at desc").Find(&list)
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func MarkNotificationRead(c *fiber.Ctx) error {
	id := c.Params("id")
	ctxOrmawaId, ok := c.Locals("ormawa_id").(uint)

	query := config.DB.Model(&models.OrmawaNotifikasi{}).Where("id = ?", id)
	if ok && ctxOrmawaId > 0 {
		query = query.Where("ormawa_id = ?", ctxOrmawaId)
	}

	if err := query.Update("is_read", true).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Read"})
}

func MarkAllNotificationsRead(c *fiber.Ctx) error {
	ctxOrmawaId, ok := c.Locals("ormawa_id").(uint)
	var targetOrmawaId uint
	if ok && ctxOrmawaId > 0 {
		targetOrmawaId = ctxOrmawaId
	} else {
		if qId := c.Query("ormawaId"); qId != "" {
			var parsed uint
			if _, err := fmt.Sscanf(qId, "%d", &parsed); err == nil {
				targetOrmawaId = parsed
			}
		}
	}

	if targetOrmawaId == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "ormawaId required"})
	}

	config.DB.Model(&models.OrmawaNotifikasi{}).Where("ormawa_id = ?", targetOrmawaId).Update("is_read", true)
	return c.JSON(fiber.Map{"status": "success"})
}

func DeleteNotification(c *fiber.Ctx) error {
	id := c.Params("id")
	ctxOrmawaId, ok := c.Locals("ormawa_id").(uint)

	query := config.DB.Where("id = ?", id)
	if ok && ctxOrmawaId > 0 {
		query = query.Where("ormawa_id = ?", ctxOrmawaId)
	}

	if err := query.Delete(&models.OrmawaNotifikasi{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success"})
}

// --- DIVISIONS ---

func GetDivisions(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	var list []models.OrmawaDivisi
	query := config.DB.Model(&models.OrmawaDivisi{})

	if ormawaId != "" {
		query = query.Where("ormawa_id = ?", ormawaId)
	}
	query.Find(&list)
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func CreateDivision(c *fiber.Ctx) error {
	var payload models.OrmawaDivisi
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	if payload.Nama == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Nama divisi wajib diisi"})
	}

	if err := config.DB.Create(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan divisi baru"})
	}

	return c.JSON(fiber.Map{"status": "success", "data": payload})
}

func DeleteDivision(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.OrmawaDivisi{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

// --- LPJ ---

func GetLPJs(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	var list []models.LaporanPertanggungjawaban
	query := config.DB.Preload("Proposal").Preload("Proposal.Ormawa").
		Joins("JOIN ormawa.proposal p ON p.id = ormawa.laporan_pertanggungjawaban.proposal_id AND p.deleted_at IS NULL")

	if ormawaId != "" {
		query = query.Where("p.ormawa_id = ?", ormawaId)
	} else if tokenOrmawaID != 0 {
		query = query.Where("p.ormawa_id = ?", tokenOrmawaID)
	}
	query.Order("ormawa.laporan_pertanggungjawaban.created_at desc").Find(&list)

	data := make([]fiber.Map, 0, len(list))
	for _, item := range list {
		data = append(data, fiber.Map{
			"ID":                item.ID,
			"ProposalID":        item.ProposalID,
			"Judul":             item.Proposal.Judul,
			"Status":            item.Status,
			"Catatan":           item.Catatan,
			"RealisasiAnggaran": item.RealisasiAnggaran,
			"TotalAnggaran":     item.Proposal.Anggaran,
			"FileURL":           item.FileURL,
			"TenggatLPJ":        item.Proposal.TenggatLPJ,
			"Proposal":          item.Proposal,
			"CreatedAt":         item.CreatedAt,
			"UpdatedAt":         item.UpdatedAt,
		})
	}

	return c.JSON(fiber.Map{"status": "success", "data": data})
}

func CreateLPJ(c *fiber.Ctx) error {
	var payload struct {
		ProposalID        uint    `json:"ProposalID"`
		RealisasiAnggaran float64 `json:"RealisasiAnggaran"`
		TotalAnggaran     float64 `json:"TotalAnggaran"`
		Catatan           string  `json:"Catatan"`
		Status            string  `json:"Status"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	if payload.ProposalID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Proposal wajib dipilih"})
	}

	var proposal models.Proposal
	if err := config.DB.First(&proposal, payload.ProposalID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Proposal tidak ditemukan"})
	}

	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	if tokenOrmawaID != 0 && proposal.OrmawaID != tokenOrmawaID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
	}

	// Auto-penalty if past LPJ deadline
	var isLate bool
	if proposal.TenggatLPJ != nil && time.Now().After(*proposal.TenggatLPJ) {
		isLate = true
	}

	if payload.TotalAnggaran > 0 {
		if err := config.DB.Model(&proposal).Update("anggaran", payload.TotalAnggaran).Error; err == nil {
			proposal.Anggaran = payload.TotalAnggaran
		}
	}

	var existing models.LaporanPertanggungjawaban
	if err := config.DB.Where("proposal_id = ?", payload.ProposalID).First(&existing).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "LPJ already exists for this proposal"})
	}

	status := payload.Status
	if status == "" {
		status = "draft"
	}

	lpj := models.LaporanPertanggungjawaban{
		ProposalID:        payload.ProposalID,
		RealisasiAnggaran: payload.RealisasiAnggaran,
		Catatan:           payload.Catatan,
		Status:            status,
	}

	if err := config.DB.Create(&lpj).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan LPJ: " + err.Error()})
	}

	if err := config.DB.Preload("Proposal").First(&lpj, lpj.ID).Error; err != nil {
		return c.JSON(fiber.Map{"status": "success", "data": lpj})
	}

	// Auto-penalty if late
	if isLate {
		gamifikasi.AwardOrmawaPoints(config.DB, proposal.OrmawaID, "lpj_terlambat", -50, "kurang",
			fmt.Sprintf("LPJ proposal '%s' diajukan setelah tenggat waktu.", proposal.Judul))
		config.DB.Create(&models.OrmawaNotifikasi{
			OrmawaID: lpj.Proposal.OrmawaID,
			Tipe:     "lpj",
			Judul:    "LPJ Terlambat — Poin Dikurangi",
			Pesan:    fmt.Sprintf("LPJ untuk '%s' diajukan setelah tenggat %s. Poin ormawa dikurangi -50.", proposal.Judul, proposal.TenggatLPJ.Format("2 Jan 2006")),
		})
	}

	// Buat notifikasi ormawa
	config.DB.Create(&models.OrmawaNotifikasi{
		OrmawaID: lpj.Proposal.OrmawaID,
		Tipe:     "lpj",
		Judul:    "LPJ Baru Diajukan",
		Pesan:    fmt.Sprintf("Laporan Pertanggungjawaban untuk proposal '%s' telah diajukan.", lpj.Proposal.Judul),
	})

	return c.JSON(fiber.Map{"status": "success", "data": fiber.Map{
		"ID":                lpj.ID,
		"ProposalID":        lpj.ProposalID,
		"Judul":             lpj.Proposal.Judul,
		"Status":            lpj.Status,
		"Catatan":           lpj.Catatan,
		"RealisasiAnggaran": lpj.RealisasiAnggaran,
		"TotalAnggaran":     lpj.Proposal.Anggaran,
		"FileURL":           lpj.FileURL,
		"Proposal":          lpj.Proposal,
		"CreatedAt":         lpj.CreatedAt,
		"UpdatedAt":         lpj.UpdatedAt,
	}})
}

func UpdateLPJ(c *fiber.Ctx) error {
	id := c.Params("id")
	var lpj models.LaporanPertanggungjawaban
	if err := config.DB.Preload("Proposal").First(&lpj, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Not Found"})
	}

	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	if tokenOrmawaID != 0 && lpj.Proposal.OrmawaID != tokenOrmawaID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
	}

	var payload struct {
		Status            string  `json:"Status"`
		Catatan           string  `json:"Catatan"`
		RealisasiAnggaran float64 `json:"RealisasiAnggaran"`
		TotalAnggaran     float64 `json:"TotalAnggaran"`
	}
	c.BodyParser(&payload)

	oldStatus := lpj.Status

	if payload.Status != "" {
		lpj.Status = payload.Status
	}
	if payload.Catatan != "" {
		lpj.Catatan = payload.Catatan
	}
	if payload.RealisasiAnggaran > 0 {
		lpj.RealisasiAnggaran = payload.RealisasiAnggaran
	}

	config.DB.Save(&lpj)

	if payload.TotalAnggaran > 0 {
		config.DB.Model(&models.Proposal{}).Where("id = ?", lpj.ProposalID).Update("anggaran", payload.TotalAnggaran)
		lpj.Proposal.Anggaran = payload.TotalAnggaran
	}

	if lpj.Status == "disetujui" && oldStatus != "disetujui" {
		config.DB.Model(&models.Proposal{}).Where("id = ?", lpj.ProposalID).Update("status", "selesai")

		// Auto-penalty if approved but was late
		if lpj.Proposal.TenggatLPJ != nil && time.Now().After(*lpj.Proposal.TenggatLPJ) {
			gamifikasi.AwardOrmawaPoints(config.DB, lpj.Proposal.OrmawaID, "lpj_terlambat", -50, "kurang",
				fmt.Sprintf("LPJ proposal '%s' disetujui setelah tenggat waktu.", lpj.Proposal.Judul))
			config.DB.Create(&models.OrmawaNotifikasi{
				OrmawaID: lpj.Proposal.OrmawaID,
				Tipe:     "lpj",
				Judul:    "LPJ Disetujui Tapi Terlambat",
				Pesan:    fmt.Sprintf("LPJ '%s' disetujui tapi melewati tenggat %s. Poin dikurangi -50.", lpj.Proposal.Judul, lpj.Proposal.TenggatLPJ.Format("2 Jan 2006")),
			})
		}

		sumberLower := strings.ToLower(lpj.Proposal.SumberDana)
		if strings.Contains(sumberLower, "kas") || strings.Contains(sumberLower, "mandiri") || strings.Contains(sumberLower, "organisasi") {
			// Memotong kas karena menggunakan kas organisasi
			config.DB.Create(&models.OrmawaMutasiSaldo{
				OrmawaID:   lpj.Proposal.OrmawaID,
				Tipe:       "pengeluaran",
				Nominal:    lpj.RealisasiAnggaran,
				Kategori:   "Kegiatan Selesai",
				Deskripsi:  "Realisasi Dana LPJ: " + lpj.Proposal.Judul,
				Tanggal:    time.Now(),
				ProposalID: &lpj.ProposalID,
				Sumber:     "organisasi",
			})
		} else {
			// Menambah kas karena pencairan dari kampus/fakultas
			config.DB.Create(&models.OrmawaMutasiSaldo{
				OrmawaID:   lpj.Proposal.OrmawaID,
				Tipe:       "pemasukan",
				Nominal:    lpj.RealisasiAnggaran,
				Kategori:   "Pencairan Dana",
				Deskripsi:  "Pencairan Pagu LPJ: " + lpj.Proposal.Judul,
				Tanggal:    time.Now(),
				ProposalID: &lpj.ProposalID,
				Sumber:     "kampus",
			})
		}
	}

	if payload.Status != "" && payload.Status != oldStatus {
		config.DB.Create(&models.OrmawaNotifikasi{
			OrmawaID: lpj.Proposal.OrmawaID,
			Tipe:     "lpj",
			Judul:    "Status LPJ Berubah",
			Pesan:    fmt.Sprintf("Status LPJ '%s' berubah menjadi '%s'.", lpj.Proposal.Judul, lpj.Status),
		})
	}

	return c.JSON(fiber.Map{"status": "success", "data": lpj})
}

func UploadLPJDocument(c *fiber.Ctx) error {
	lpjId := c.Params("id")
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "No file uploaded"})
	}

	os.MkdirAll("./uploads", 0755)
	filename := fmt.Sprintf("LPJ_%d_%s", time.Now().Unix(), file.Filename)
	filePath := "./uploads/" + filename
	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to save file"})
	}

	var lpj models.LaporanPertanggungjawaban
	if err := config.DB.Preload("Proposal").First(&lpj, lpjId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "LPJ not found"})
	}

	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)
	if tokenOrmawaID != 0 && lpj.Proposal.OrmawaID != tokenOrmawaID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
	}

	lpj.FileURL = "/uploads/" + filename
	config.DB.Save(&lpj)

	return c.JSON(fiber.Map{"status": "success", "data": lpj})
}

func DeleteLPJ(c *fiber.Ctx) error {
	id := c.Params("id")
	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)

	var lpj models.LaporanPertanggungjawaban
	if err := config.DB.Preload("Proposal").First(&lpj, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "LPJ tidak ditemukan"})
	}
	if tokenOrmawaID != 0 && lpj.Proposal.OrmawaID != tokenOrmawaID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
	}

	if err := config.DB.Unscoped().Delete(&lpj).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus LPJ"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "LPJ berhasil dihapus"})
}

func DeleteLPJDocument(c *fiber.Ctx) error {
	id := c.Params("docId")
	tokenOrmawaID, _ := c.Locals("ormawa_id").(uint)

	var lpj models.LaporanPertanggungjawaban
	if err := config.DB.Preload("Proposal").First(&lpj, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "LPJ not found"})
	}
	if tokenOrmawaID != 0 && lpj.Proposal.OrmawaID != tokenOrmawaID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
	}

	config.DB.Model(&models.LaporanPertanggungjawaban{}).Where("id = ?", id).Update("file_url", "")
	return c.JSON(fiber.Map{"status": "success", "message": "Dokumen dihapus"})
}

// --- ASPIRATIONS ---

func GetAspirations(c *fiber.Ctx) error {
	ormawaId := c.Query("ormawaId")
	var list []models.OrmawaAspirasi
	query := config.DB.Preload("Mahasiswa").Preload("Ormawa")

	if ormawaId != "" {
		query = query.Where("ormawa_id = ?", ormawaId)
	}
	query.Order("created_at desc").Find(&list)
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func CreateAspiration(c *fiber.Ctx) error {
	var payload models.OrmawaAspirasi
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	if err := config.DB.Create(&payload).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan aspirasi"})
	}
	// Buat notifikasi ormawa
	config.DB.Create(&models.OrmawaNotifikasi{
		OrmawaID: payload.OrmawaID,
		Tipe:     "aspirasi",
		Judul:    "Aspirasi Baru Masuk",
		Pesan:    fmt.Sprintf("Aspirasi baru diterima dari mahasiswa: '%s'.", payload.Judul),
	})
	return c.Status(201).JSON(fiber.Map{"status": "success", "data": payload})
}

func UpdateAspiration(c *fiber.Ctx) error {
	id := c.Params("id")
	var aspiration models.OrmawaAspirasi
	if err := config.DB.First(&aspiration, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Aspirasi tidak ditemukan"})
	}

	oldStatus := aspiration.Status

	var payload struct {
		Status    string `json:"Status"`
		Tanggapan string `json:"Tanggapan"`
	}
	c.BodyParser(&payload)

	if payload.Status != "" {
		aspiration.Status = payload.Status
	}
	if payload.Tanggapan != "" {
		aspiration.Tanggapan = payload.Tanggapan
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&aspiration).Error; err != nil {
			return err
		}
		if (strings.ToLower(aspiration.Status) == "selesai" || aspiration.Status == "Selesai") && strings.ToLower(oldStatus) != "selesai" {
			if err := gamifikasi.AwardOrmawaPoints(tx, aspiration.OrmawaID, "aspirasi_selesai", 10, "tambah", fmt.Sprintf("Menyelesaikan aspirasi mahasiswa: %s", aspiration.Judul)); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	// Buat notifikasi ormawa
	config.DB.Create(&models.OrmawaNotifikasi{
		OrmawaID: aspiration.OrmawaID,
		Tipe:     "aspirasi",
		Judul:    "Aspirasi Ditanggapi",
		Pesan:    fmt.Sprintf("Aspirasi dengan judul '%s' telah ditanggapi oleh pengurus.", aspiration.Judul),
	})

	return c.JSON(fiber.Map{"status": "success", "data": aspiration})
}

// --- GENERIC UPLOAD ---

func UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "No file uploaded"})
	}
	filename := fmt.Sprintf("%d_%s", time.Now().Unix(), file.Filename)
	os.MkdirAll("./uploads", 0755)
	if err := c.SaveFile(file, "./uploads/"+filename); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to save file"})
	}
	return c.JSON(fiber.Map{"status": "success", "url": "/uploads/" + filename})
}

func GetStudentsLookup(c *fiber.Ctx) error {
	ormawaIdVal := c.Locals("ormawa_id")
	if ormawaIdVal == nil {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized: Ormawa context missing"})
	}
	ormawaId := ormawaIdVal.(uint)

	var ormawa models.Ormawa
	if err := config.DB.Select("fakultas_id").First(&ormawa, ormawaId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Ormawa tidak ditemukan"})
	}

	search := c.Query("search")
	var students []models.Mahasiswa
	query := config.DB.Select("id, nama_mahasiswa, nim, email_kampus, no_hp")

	if ormawa.FakultasID != nil {
		query = query.Where("fakultas_id = ?", ormawa.FakultasID)
	}

	if search != "" {
		searchTerm := "%" + search + "%"
		query = query.Where("nama_mahasiswa ILIKE ? OR nim ILIKE ?", searchTerm, searchTerm)
	}

	if err := query.Limit(50).Find(&students).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memuat data mahasiswa"})
	}
	return c.JSON(fiber.Map{"status": "success", "data": students})
}

// GetOrmawaGamifikasi returns rank, points, and point history of active Ormawa
func GetOrmawaGamifikasi(c *fiber.Ctx) error {
	ormawaId := c.Locals("ormawa_id")
	if ormawaId == nil || ormawaId == uint(0) {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized: Ormawa context missing"})
	}

	var ormawa models.Ormawa
	if err := config.DB.First(&ormawa, ormawaId).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Ormawa tidak ditemukan"})
	}

	var rank int64
	config.DB.Model(&models.Ormawa{}).Where("poin > ?", ormawa.Poin).Count(&rank)
	rank = rank + 1

	var totalOrmawa int64
	config.DB.Model(&models.Ormawa{}).Count(&totalOrmawa)

	var history []models.OrmawaPoinHistory
	config.DB.Where("ormawa_id = ?", ormawa.ID).Order("created_at desc").Find(&history)

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"ormawa_id":    ormawa.ID,
			"ormawa_nama":  ormawa.Nama,
			"singkatan":    ormawa.Singkatan,
			"poin":         ormawa.Poin,
			"peringkat":    rank,
			"total_ormawa": totalOrmawa,
			"riwayat":      history,
		},
	})
}

func syncUserOrmawaRole(studentID uint) {
	var student models.Mahasiswa
	if err := config.DB.First(&student, studentID).Error; err != nil || student.PenggunaID == 0 {
		return
	}

	var user models.User
	if err := config.DB.First(&user, student.PenggunaID).Error; err != nil {
		return
	}

	// Check if this student has any active Ormawa memberships
	var activeMemberships []models.OrmawaAnggota
	config.DB.Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", studentID).Find(&activeMemberships)
	count := len(activeMemberships)

	roles := strings.Split(user.Role, ",")
	hasOrmawa := false
	var newRoles []string
	for _, r := range roles {
		rClean := strings.TrimSpace(r)
		if rClean == "" {
			continue
		}
		if rClean == "ormawa" {
			hasOrmawa = true
			if count > 0 {
				newRoles = append(newRoles, rClean)
			}
		} else {
			newRoles = append(newRoles, rClean)
		}
	}

	if count > 0 && !hasOrmawa {
		newRoles = append(newRoles, "ormawa")
	}

	newRoleStr := strings.Join(newRoles, ",")

	var ormawaIDPtr *uint
	if count > 0 {
		val := activeMemberships[0].OrmawaID
		ormawaIDPtr = &val
	}

	// Update public.users table directly via raw SQL to bypass cache/model-tracking issues
	if err := config.DB.Exec("UPDATE public.users SET role = ?, ormawa_id = ?, updated_at = ? WHERE id = ?", newRoleStr, ormawaIDPtr, time.Now(), user.ID).Error; err != nil {
		fmt.Printf("[syncUserOrmawaRole] Failed to update user role/ormawa_id for student %d: %v\n", studentID, err)
	} else {
		fmt.Printf("[syncUserOrmawaRole] Successfully synced user %d role to %s and ormawa_id to %v\n", user.ID, newRoleStr, ormawaIDPtr)
	}
}

// ==========================================
// ROLE ASSIGNMENT (Admin Ormawa only)
// ==========================================

// AssignPengurusRole memungkinkan admin ormawa assign role "pengurus_ormawa" ke mahasiswa
func AssignPengurusRole(c *fiber.Ctx) error {
	type AssignRequest struct {
		MemberID uint   `json:"memberId"`
		Reason   string `json:"reason"`
	}

	var req AssignRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	// 1. Validate request
	if req.MemberID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "memberId wajib diisi"})
	}

	// 2. Get assigner info (admin ormawa)
	assignerID := c.Locals("user_id").(uint)
	assignerRole := c.Locals("role").(string)
	ormawaID := c.Locals("ormawa_id")

	// 3. Validate assigner adalah admin_ormawa
	if assignerRole != "admin_ormawa" {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Hanya admin_ormawa yang dapat assign role pengurus_ormawa",
		})
	}

	if ormawaID == nil || ormawaID == uint(0) {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Ormawa context missing"})
	}

	ormawaIDValue := ormawaID.(uint)

	// 4. Get member (OrmawaAnggota)
	var member models.OrmawaAnggota
	if err := config.DB.
		Preload("Mahasiswa").
		Preload("Mahasiswa.Pengguna").
		Where("id = ? AND ormawa_id = ?", req.MemberID, ormawaIDValue).
		First(&member).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Member tidak ditemukan di organisasi ini"})
	}

	if member.MahasiswaID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Member tidak memiliki profile mahasiswa"})
	}

	// 5. Get user account untuk member
	if member.Mahasiswa.Pengguna.ID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Member tidak memiliki akun pengguna"})
	}

	targetUser := member.Mahasiswa.Pengguna
	targetUserID := targetUser.ID

	// 6. Check if user sudah punya role pengurus_ormawa
	existingRoles := strings.Split(targetUser.Role, ",")
	for _, r := range existingRoles {
		if strings.ToLower(strings.TrimSpace(r)) == "pengurus_ormawa" {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Member sudah memiliki role pengurus_ormawa",
			})
		}
	}

	// 7. Check role conflict
	newRoles := append(existingRoles, "pengurus_ormawa")
	if hasRoleConflict(newRoles) {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Kombinasi role tidak valid - member memiliki role yang conflict dengan pengurus_ormawa",
		})
	}

	// 8. Assign role (update User.Role)
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Build new role string
		var newRole string
		if targetUser.Role == "" || targetUser.Role == "mahasiswa" {
			newRole = "mahasiswa,pengurus_ormawa"
		} else {
			newRole = targetUser.Role + ",pengurus_ormawa"
		}

		// Update user role
		if err := tx.Exec(
			"UPDATE public.users SET role = ?, updated_at = ? WHERE id = ?",
			newRole,
			time.Now(),
			targetUserID,
		).Error; err != nil {
			return err
		}

		// Log audit trail
		audit := models.LogAktivitas{
			UserID:    assignerID,
			Aktivitas: "ROLE_ASSIGNMENT",
			Deskripsi: fmt.Sprintf("Admin Ormawa %d assign role 'pengurus_ormawa' to member %s (%d) - Reason: %s", assignerID, targetUser.Email, targetUserID, req.Reason),
			IPAddress: c.IP(),
		}
		if err := tx.Create(&audit).Error; err != nil {
			// Log error but don't fail transaction
			fmt.Printf("Warning: Failed to create audit log: %v\n", err)
		}

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal assign role: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Role 'pengurus_ormawa' berhasil di-assign ke %s", targetUser.Email),
		"data": fiber.Map{
			"member_id": req.MemberID,
			"user_id":   targetUserID,
			"email":     targetUser.Email,
			"new_role":  "mahasiswa,pengurus_ormawa",
		},
	})
}

// RevokePengurusRole memungkinkan admin ormawa revoke role "pengurus_ormawa"
func RevokePengurusRole(c *fiber.Ctx) error {
	type RevokeRequest struct {
		MemberID uint   `json:"memberId"`
		Reason   string `json:"reason"`
	}

	var req RevokeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	// 1. Validate assigner
	assignerID := c.Locals("user_id").(uint)
	assignerRole := c.Locals("role").(string)
	ormawaID := c.Locals("ormawa_id")

	if assignerRole != "admin_ormawa" {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Hanya admin_ormawa yang dapat revoke role",
		})
	}

	if ormawaID == nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Ormawa context missing"})
	}

	ormawaIDValue := ormawaID.(uint)

	// 2. Get member
	var member models.OrmawaAnggota
	if err := config.DB.
		Preload("Mahasiswa").
		Preload("Mahasiswa.Pengguna").
		Where("id = ? AND ormawa_id = ?", req.MemberID, ormawaIDValue).
		First(&member).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Member tidak ditemukan"})
	}

	targetUser := member.Mahasiswa.Pengguna

	// 3. Check if user has pengurus_ormawa role
	roles := strings.Split(targetUser.Role, ",")
	hasPengurusRole := false
	var newRoles []string
	for _, r := range roles {
		trimmed := strings.TrimSpace(r)
		if strings.ToLower(trimmed) != "pengurus_ormawa" {
			newRoles = append(newRoles, trimmed)
		} else {
			hasPengurusRole = true
		}
	}

	if !hasPengurusRole {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Member tidak memiliki role pengurus_ormawa",
		})
	}

	// 4. Update role (remove pengurus_ormawa)
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		newRole := strings.Join(newRoles, ",")
		if newRole == "" {
			newRole = "mahasiswa"
		}

		if err := tx.Exec(
			"UPDATE public.users SET role = ?, updated_at = ? WHERE id = ?",
			newRole,
			time.Now(),
			targetUser.ID,
		).Error; err != nil {
			return err
		}

		// Log audit
		audit := models.LogAktivitas{
			UserID:    assignerID,
			Aktivitas: "ROLE_REVOCATION",
			Deskripsi: fmt.Sprintf("Admin Ormawa %d revoke role 'pengurus_ormawa' from member %s (%d) - Reason: %s", assignerID, targetUser.Email, targetUser.ID, req.Reason),
			IPAddress: c.IP(),
		}
		if err := tx.Create(&audit).Error; err != nil {
			fmt.Printf("Warning: Failed to create audit log: %v\n", err)
		}

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal revoke role: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Role 'pengurus_ormawa' berhasil di-revoke dari %s", targetUser.Email),
		"data": fiber.Map{
			"member_id": req.MemberID,
			"email":     targetUser.Email,
			"new_role":  strings.Join(newRoles, ","),
		},
	})
}

// hasRoleConflict mengecek kombinasi role yang tidak valid
func hasRoleConflict(roles []string) bool {
	roleMap := make(map[string]bool)
	for _, r := range roles {
		roleMap[strings.ToLower(strings.TrimSpace(r))] = true
	}

	// Define invalid combinations
	invalidCombinations := [][]string{
		{"super_admin", "mahasiswa"},
		{"super_admin", "dosen"},
		{"admin_ormawa", "admin_fakultas"},
		{"admin_ormawa", "admin_prodi"},
		{"admin_fakultas", "pengurus_ormawa"},
	}

	for _, combo := range invalidCombinations {
		hasFirst := roleMap[combo[0]]
		hasSecond := roleMap[combo[1]]
		if hasFirst && hasSecond {
			return true
		}
	}

	return false
}

// ---------------------------------------------------------------------------
// Recruitment Fields CRUD
// ---------------------------------------------------------------------------

// GetRecruitmentFields returns all dynamic form fields for this Ormawa
func GetRecruitmentFields(c *fiber.Ctx) error {
	ormawaID, ok := c.Locals("ormawa_id").(uint)
	if !ok || ormawaID == 0 {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Tidak terautentikasi sebagai Ormawa"})
	}

	var fields []models.OrmawaRecruitmentField
	config.DB.Where("ormawa_id = ?", ormawaID).Order("\"order\" asc").Find(&fields)
	return c.JSON(fiber.Map{"success": true, "data": fields})
}

// SaveRecruitmentFields replaces all recruitment fields for this Ormawa
func SaveRecruitmentFields(c *fiber.Ctx) error {
	ormawaID, ok := c.Locals("ormawa_id").(uint)
	if !ok || ormawaID == 0 {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Tidak terautentikasi sebagai Ormawa"})
	}

	var body []models.OrmawaRecruitmentField
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data tidak valid"})
	}

	tx := config.DB.Begin()
	// Hard delete existing
	if err := tx.Unscoped().Where("ormawa_id = ?", ormawaID).Delete(&models.OrmawaRecruitmentField{}).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus field lama"})
	}

	// Bulk insert new fields
	for i := range body {
		body[i].ID = 0
		body[i].OrmawaID = ormawaID
		body[i].Order = i
		if err := tx.Create(&body[i]).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan field"})
		}
	}

	tx.Commit()
	return c.JSON(fiber.Map{"success": true, "message": "Form rekrutmen berhasil disimpan", "data": body})
}

// DeleteRecruitmentField removes a single field by ID
func DeleteRecruitmentField(c *fiber.Ctx) error {
	ormawaID, ok := c.Locals("ormawa_id").(uint)
	if !ok || ormawaID == 0 {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Tidak terautentikasi sebagai Ormawa"})
	}

	fieldID := c.Params("id")
	var field models.OrmawaRecruitmentField
	if err := config.DB.Where("id = ? AND ormawa_id = ?", fieldID, ormawaID).First(&field).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Field tidak ditemukan"})
	}

	config.DB.Unscoped().Delete(&field)
	return c.JSON(fiber.Map{"success": true, "message": "Field berhasil dihapus"})
}

// ExportRecruitmentApplicants exports applicants as CSV
func ExportRecruitmentApplicants(c *fiber.Ctx) error {
	ormawaID, ok := c.Locals("ormawa_id").(uint)
	if !ok || ormawaID == 0 {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Tidak terautentikasi sebagai Ormawa"})
	}

	// Optional status filter
	statusFilter := c.Query("status", "")

	// Build query
	query := config.DB.Preload("Mahasiswa.ProgramStudi").Where("ormawa_id = ?", ormawaID)
	if statusFilter != "" {
		query = query.Where("LOWER(status) = ?", strings.ToLower(statusFilter))
	}
	var members []models.OrmawaAnggota
	query.Order("created_at desc").Find(&members)

	var fields []models.OrmawaRecruitmentField
	config.DB.Where("ormawa_id = ?", ormawaID).Order("\"order\" asc").Find(&fields)

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=rekrutmen_anggota.csv")

	// BOM for Excel
	c.Write([]byte{0xEF, 0xBB, 0xBF})

	// Build dynamic CSV header from recruitment fields
	fixedHeaders := []string{"Nama", "NIM", "Program Studi", "IPK", "Divisi Pilihan 1", "Divisi Pilihan 2", "Alasan", "Status", "Tanggal Daftar", "Alasan Ditolak"}
	var allHeaders []string
	allHeaders = append(allHeaders, fixedHeaders...)
	fieldLabels := make([]string, len(fields))
	fieldIDMap := make(map[string]int) // field ID (as string) → column index
	for i, f := range fields {
		label := f.Label
		if label == "" {
			label = fmt.Sprintf("Pertanyaan %d", i+1)
		}
		fieldLabels[i] = escapeCSV(label)
		allHeaders = append(allHeaders, fieldLabels[i])
		fieldIDMap[fmt.Sprintf("%d", f.ID)] = i
	}

	csvHeader := strings.Join(allHeaders, ",") + "\n"
	if _, err := c.Write([]byte(csvHeader)); err != nil {
		return err
	}

	for _, m := range members {
		nama := escapeCSV(m.Mahasiswa.Nama)
		nim := escapeCSV(m.Mahasiswa.NIM)
		prodi := ""
		if m.Mahasiswa.ProgramStudiID > 0 {
			prodi = escapeCSV(m.Mahasiswa.ProgramStudi.Nama)
		}
		ipk := fmt.Sprintf("%.2f", m.IPK)
		div1 := escapeCSV(m.Divisi)
		div2 := escapeCSV(m.DivisiPilihanDua)
		alasan := escapeCSV(m.Alasan)
		status := m.Status
		tgl := m.CreatedAt.Format("2006-01-02")
		alasanTolak := escapeCSV(m.RejectionReason)

		row := []string{nama, nim, prodi, ipk, div1, div2, alasan, status, tgl, alasanTolak}

		// Parse CustomAnswers and map to field columns
		answerValues := make([]string, len(fields))
		if m.CustomAnswers != "" && m.CustomAnswers != "{}" {
			var answers map[string]interface{}
			if err := json.Unmarshal([]byte(m.CustomAnswers), &answers); err == nil {
				for fieldID, val := range answers {
					if idx, ok := fieldIDMap[fieldID]; ok {
						strVal := fmt.Sprintf("%v", val)
						answerValues[idx] = escapeCSV(strVal)
					}
				}
			}
		}
		row = append(row, answerValues...)

		line := strings.Join(row, ",") + "\n"
		if _, err := c.Write([]byte(line)); err != nil {
			return err
		}
	}

	return nil
}

func escapeCSV(s string) string {
	if s == "" {
		return ""
	}
	needsQuoting := strings.ContainsAny(s, ",\"\n\r")
	if needsQuoting {
		s = strings.ReplaceAll(s, "\"", "\"\"")
		s = "\"" + s + "\""
	}
	return s
}

// checkBudgetEnforceLimit validates anggaran against remaining budget for an ORMAWA.
// Returns: (allowed, remainingBudget, pendingBudget, errorMessage)
// excludeProposalID > 0 excludes that proposal's anggaran from committed calculation.
func checkBudgetEnforceLimit(ormawaID uint, excludeProposalID uint, newAnggaran float64) (bool, float64, float64, string) {
	periode := fmt.Sprintf("%d", time.Now().Year())

	var setting models.OrmawaFinancialSetting
	if err := config.DB.Where("ormawa_id = ? AND periode = ?", ormawaID, periode).First(&setting).Error; err != nil {
		return true, 0, 0, "" // no setting = no limit
	}
	if !setting.IsActive || !setting.EnforceLimit {
		return true, 0, 0, "" // not enforced
	}

	var approvedBudget float64
	config.DB.Model(&models.Proposal{}).
		Where("ormawa_id = ?", ormawaID).
		Where("status IN ?", []string{"disetujui_fakultas", "disetujui_univ", "selesai", "disetujui"}).
		Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
		Select("COALESCE(SUM(anggaran), 0)").
		Scan(&approvedBudget)

	var pendingBudget float64
	config.DB.Model(&models.Proposal{}).
		Where("ormawa_id = ?", ormawaID).
		Where("status = ?", "diajukan").
		Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
		Select("COALESCE(SUM(anggaran), 0)").
		Scan(&pendingBudget)

	if excludeProposalID > 0 {
		var excluded models.Proposal
		if err := config.DB.First(&excluded, excludeProposalID).Error; err == nil {
			status := strings.ToLower(strings.TrimSpace(excluded.Status))
			if status == "diajukan" {
				pendingBudget -= excluded.Anggaran
				if pendingBudget < 0 {
					pendingBudget = 0
				}
			} else if status == "disetujui_fakultas" || status == "disetujui_univ" || status == "selesai" || status == "disetujui" {
				approvedBudget -= excluded.Anggaran
				if approvedBudget < 0 {
					approvedBudget = 0
				}
			}
		}
	}

	totalCommitted := approvedBudget + pendingBudget
	remainingBudget := setting.BudgetLimit - totalCommitted
	if remainingBudget < 0 {
		remainingBudget = 0
	}

	if newAnggaran > remainingBudget {
		return false, remainingBudget, pendingBudget,
			fmt.Sprintf("Anggaran melebihi sisa pagu. Sisa pagu Anda: Rp %.0f (Terpakai: Rp %.0f, Menunggu: Rp %.0f)", remainingBudget, approvedBudget, pendingBudget)
	}
	return true, remainingBudget, pendingBudget, ""
}
