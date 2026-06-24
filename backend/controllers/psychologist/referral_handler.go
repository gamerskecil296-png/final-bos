package psychologist

import (
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
)

// kirimNotifPsikolog mengirim notifikasi ke tabel psikolog.notifications
func kirimNotifPsikolog(psikologID, userID uint, tipe, judul, deskripsi string) {
	if psikologID == 0 || userID == 0 {
		log.Printf("[Notif] Psikolog notif skipped: psikologID=%d userID=%d", psikologID, userID)
		return
	}
	notif := models.PsikologNotification{
		PsikologID: psikologID,
		UserID:     userID,
		Tipe:       tipe,
		Judul:      judul,
		Deskripsi:  deskripsi,
		IsRead:     false,
	}
	if err := config.DB.Create(&notif).Error; err != nil {
		log.Printf("[Notif] Gagal simpan notif psikolog: %v", err)
	}
}

// GetReferrals — list semua referral milik psikolog
func GetReferrals(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var referrals []models.PsikologReferral
	if err := config.DB.
		Preload("Mahasiswa").
		Preload("Booking").
		Where("psikolog_id = ?", psikolog.ID).
		Order("created_at desc").
		Find(&referrals).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(referrals))
	for _, r := range referrals {
		items = append(items, fiber.Map{
			"id":                r.ID,
			"mahasiswa_id":      r.MahasiswaID,
			"mahasiswa_name":    r.Mahasiswa.Nama,
			"tipe":              r.Tipe,
			"alasan":            r.Alasan,
			"status":            r.Status,
			"approval_status":   r.ApprovalStatus,
			"approval_note":     r.ApprovalNote,
			"pihak_tujuan":      r.PihakTujuan,
			"email_tujuan":      r.EmailTujuan,
			"tanggal_dibuat":    r.TanggalDibuat,
			"tanggal_dikirim":   r.TanggalDikirim,
			"tanggal_diterima":  r.TanggalDiterima,
			"surat_rujukan_url": r.SuratRujiukanURL,
		})
	}
	return jsonOK(c, items)
}

// CreateReferral — psikolog buat referral baru
func CreateReferral(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var body struct {
		MahasiswaID uint   `json:"mahasiswa_id"`
		BookingID   *uint  `json:"booking_id"`
		Tipe        string `json:"tipe"` // "Medis" atau "Akademik"
		Alasan      string `json:"alasan"`
		PihakTujuan string `json:"pihak_tujuan"`
		EmailTujuan string `json:"email_tujuan"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid: "+err.Error())
	}

	// Validasi mahasiswa_id
	if body.MahasiswaID == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "mahasiswa_id harus diisi dan valid")
	}

	// Validasi tipe
	if body.Tipe != "Medis" && body.Tipe != "Akademik" {
		return fiber.NewError(fiber.StatusBadRequest, "Tipe harus 'Medis' atau 'Akademik'")
	}

	// Validasi alasan
	if body.Alasan == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Alasan tidak boleh kosong")
	}

	// Validasi pihak tujuan
	if body.PihakTujuan == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Pihak tujuan tidak boleh kosong")
	}

	// Validasi email tujuan
	if body.EmailTujuan == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Email tujuan tidak boleh kosong")
	}

	// Validasi mahasiswa
	var mahasiswa models.Mahasiswa
	if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").Where("id = ?", body.MahasiswaID).First(&mahasiswa).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Mahasiswa tidak ditemukan")
	}

	// Handle file upload
	filePendukungURL := ""
	file, err := c.FormFile("file_pendukung")
	if err == nil && file != nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".pdf" {
			return fiber.NewError(fiber.StatusBadRequest, "File harus PDF")
		}
		if file.Size > 2*1024*1024 {
			return fiber.NewError(fiber.StatusBadRequest, "Ukuran file maksimal 2MB")
		}

		dir := "./uploads/referrals"
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("gagal membuat direktori upload: %w", err)
		}

		fileName := fmt.Sprintf("%d_%s.pdf", time.Now().UnixMilli(), uuid.New().String()[:8])
		savePath := filepath.Join(dir, fileName)

		src, err := file.Open()
		if err != nil {
			return err
		}
		defer src.Close()

		dst, err := os.Create(savePath)
		if err != nil {
			return err
		}
		defer dst.Close()
		if _, err := io.Copy(dst, src); err != nil {
			return err
		}

		filePendukungURL = "/uploads/referrals/" + fileName
	}

	// Buat objek referral dulu untuk dilempar ke generator PDF
	referral := models.PsikologReferral{
		PsikologID:       psikolog.ID,
		Psikolog:         psikolog,
		MahasiswaID:      body.MahasiswaID,
		Mahasiswa:        mahasiswa,
		BookingID:        body.BookingID,
		Tipe:             body.Tipe,
		Alasan:           body.Alasan,
		FilePendukungURL: filePendukungURL,
		Status:           "menunggu_approval",
		ApprovalStatus:   "menunggu_approval",
		PihakTujuan:      body.PihakTujuan,
		EmailTujuan:      body.EmailTujuan,
		TanggalDibuat:    time.Now(),
		NomorSurat:       utils.GenerateDocumentNumber("Rujukan Psikolog"),
	}

	// Generate surat rujukan
	suratRujiukanURL := generateReferralLetter(referral)
	referral.SuratRujiukanURL = suratRujiukanURL

	if err := config.DB.Create(&referral).Error; err != nil {
		return err
	}

	// Capture variables sebelum goroutine untuk menghindari race condition
	mhsID := body.MahasiswaID
	mhsNama := mahasiswa.Nama
	psikNama := psikolog.Nama
	tipeRef := body.Tipe

	go func() {
		// Notifikasi ke mahasiswa
		_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
			MahasiswaID: mhsID,
			Type:        "referral",
			Title:       "Surat Rujukan Dibuat 📋",
			Content: fmt.Sprintf(
				"Psikolog %s telah membuat surat rujukan tipe %s untuk Anda. Rujukan sedang menunggu persetujuan administrator sebelum dapat dikirimkan.",
				psikNama,
				tipeRef,
			),
			Link: "/student/counseling?tab=referrals",
		})

		// Notifikasi ke semua SuperAdmin
		var adminUsers []models.User
		if err := config.DB.Where("role = ?", "super_admin").Find(&adminUsers).Error; err == nil {
			for _, admin := range adminUsers {
				_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
					UserID: admin.ID,
					Type:   "referral",
					Title:  "Referral Baru Perlu Persetujuan 🔔",
					Content: fmt.Sprintf(
						"Psikolog %s mengajukan surat rujukan tipe %s untuk mahasiswa %s. Harap tinjau dan berikan persetujuan di portal admin.",
						psikNama,
						tipeRef,
						mhsNama,
					),
					Link: "",
				})
			}
		}
	}()

	return jsonOK(c, fiber.Map{
		"id":                referral.ID,
		"status":            referral.Status,
		"surat_rujukan_url": referral.SuratRujiukanURL,
		"tanggal_dibuat":    referral.TanggalDibuat,
	})
}

// SendReferral — psikolog kirim referral ke pihak tujuan
func SendReferral(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	referralID := c.Params("id")
	var referral models.PsikologReferral
	if err := config.DB.Where("id = ? AND psikolog_id = ?", referralID, psikolog.ID).First(&referral).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Referral tidak ditemukan")
	}

	// Cek approval status dulu
	if referral.ApprovalStatus != "disetujui" {
		switch referral.ApprovalStatus {
		case "ditolak":
			return fiber.NewError(fiber.StatusForbidden, "Referral ini telah ditolak oleh administrator: "+referral.ApprovalNote)
		default:
			return fiber.NewError(fiber.StatusForbidden, "Referral belum mendapat persetujuan dari Super Admin. Harap tunggu konfirmasi.")
		}
	}

	if referral.Status != "menunggu_approval" && referral.Status != "Pending" {
		return fiber.NewError(fiber.StatusBadRequest, "Referral sudah dikirim sebelumnya")
	}

	// Update status
	now := time.Now().UTC()
	if err := config.DB.Model(&referral).Updates(map[string]any{
		"status":          "Sent",
		"tanggal_dikirim": now,
	}).Error; err != nil {
		return err
	}

	// TODO: Send email to pihak_tujuan dengan surat rujukan

	return jsonOK(c, fiber.Map{
		"id":              referral.ID,
		"status":          "Sent",
		"tanggal_dikirim": now,
	})
}

// ConfirmReferralReceived — pihak tujuan confirm terima referral
func ConfirmReferralReceived(c *fiber.Ctx) error {
	referralID := c.Params("id")
	var referral models.PsikologReferral
	if err := config.DB.
		Preload("Psikolog").
		Preload("Mahasiswa").
		Where("id = ?", referralID).
		First(&referral).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Referral tidak ditemukan")
	}

	if referral.Status != "Sent" {
		return fiber.NewError(fiber.StatusBadRequest, "Referral belum dikirim")
	}

	now := time.Now().UTC()
	if err := config.DB.Model(&referral).Updates(map[string]any{
		"status":           "Received",
		"tanggal_diterima": now,
	}).Error; err != nil {
		return err
	}

	// Capture vars sebelum goroutine
	psikologID := referral.PsikologID
	psikologUserID := referral.Psikolog.UserID
	mhsNama := referral.Mahasiswa.Nama
	pihakTujuan := referral.PihakTujuan

	// Kirim notifikasi ke psikolog (tabel psikolog.notifications)
	go func() {
		kirimNotifPsikolog(
			psikologID,
			psikologUserID,
			"info",
			"Surat Rujukan Diterima ✅",
			fmt.Sprintf("Surat rujukan untuk %s telah diterima oleh %s.", mhsNama, pihakTujuan),
		)
	}()

	return jsonOK(c, fiber.Map{
		"id":               referral.ID,
		"status":           "Received",
		"tanggal_diterima": now,
	})
}

// DownloadReferralPDF — download surat rujukan PDF
func DownloadReferralPDF(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	referralID := c.Params("id")
	var referral models.PsikologReferral
	if err := config.DB.
		Preload("Mahasiswa").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Preload("Psikolog").
		Where("id = ? AND psikolog_id = ?", referralID, psikolog.ID).
		First(&referral).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Referral tidak ditemukan")
	}

	if referral.NomorSurat == "" || strings.HasPrefix(referral.NomorSurat, "Ref/BKU-Care") {
		referral.NomorSurat = utils.GenerateDocumentNumber("Rujukan Psikolog")
		config.DB.Model(&referral).Update("nomor_surat", referral.NomorSurat)
	}

	newPath, newFile, err := BuildReferralLetterPDF(referral)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal generate PDF: "+err.Error())
	}
	newURL := "/uploads/referrals/" + newFile
	if referral.SuratRujiukanURL != newURL {
		config.DB.Model(&referral).Update("surat_rujiukan_url", newURL)
	}
	filePath := "." + newPath

	// Set response headers
	c.Set("Content-Type", "application/pdf")
	safeNama := strings.ReplaceAll(referral.Mahasiswa.Nama, " ", "_")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Surat_Rujukan_%s_%s.pdf\"", safeNama, time.Now().Format("02-01-2006")))

	return c.SendFile(filePath)
}

// ─── Helper ───────────────────────────────────────────────────────────────────

func generateReferralLetter(referral models.PsikologReferral) string {
	// Generate actual PDF file for referral letter
	_, fileName, err := BuildReferralLetterPDF(referral)
	if err != nil {
		// Fallback to placeholder if PDF generation fails
		return fmt.Sprintf("/uploads/referrals/referral_%d_%d_%s.pdf", referral.PsikologID, referral.MahasiswaID, time.Now().Format("20060102150405"))
	}
	return "/uploads/referrals/" + fileName
}

func BuildReferralLetterPDF(referral models.PsikologReferral) (string, string, error) {
	// A4 Landscape: width 297mm, height 210mm
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(25, 45, 25) // Left 25mm, Top 45mm to leave space for Kop Rektorat header
	pdf.SetAutoPageBreak(true, 25)
	pdf.AliasNbPages("")

	// Background Kop Surat
	pdf.SetHeaderFunc(func() {
		// Draw full-page landscape letterhead image
		pdf.Image("assets/kop_rektorat_landscape.jpeg", 0, 0, 297, 210, false, "JPEG", 0, "")
	})

	pdf.AddPage()

	// Draw horizontal double line under Kop Rektorat
	pdf.SetLineWidth(0.6)
	pdf.SetDrawColor(15, 23, 42) // Slate 900
	pdf.Line(25, 41, 272, 41)
	pdf.SetLineWidth(0.2)
	pdf.Line(25, 42.5, 272, 42.5)

	pdf.SetY(48) // Give some breathing room before the title

	// ── Title ────────────────────────────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetTextColor(15, 23, 42) // Slate 900
	pdf.CellFormat(0, 6, "SURAT RUJUKAN KONSELING (REFERRAL LETTER)", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetTextColor(100, 116, 139) // Slate 500
	nomorSurat := referral.NomorSurat
	if nomorSurat == "" {
		nomorSurat = fmt.Sprintf("Ref/BKU-Care/%s/%05d", referral.TanggalDibuat.Format("2006/01"), generateStableRandom(referral.ID, 12345))
	}
	refNum := fmt.Sprintf("Nomor: %s", nomorSurat)
	pdf.CellFormat(0, 5, refNum, "", 1, "C", false, 0, "")
	pdf.Ln(5)

	// ── Student & Referral Details Grid ──────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.SetTextColor(15, 23, 42)
	pdf.Cell(0, 5, "I. IDENTITAS MAHASISWA & TUJUAN RUJUKAN")
	pdf.Ln(6)

	pdf.SetFont("Helvetica", "", 9)
	details := [][]string{
		{"Nama Mahasiswa", referral.Mahasiswa.Nama},
		{"NIM", referral.Mahasiswa.NIM},
		{"Program Studi", referral.Mahasiswa.ProgramStudi.Nama},
		{"Fakultas", referral.Mahasiswa.Fakultas.Nama},
		{"Tipe Rujukan", referral.Tipe},
		{"Pihak / Instansi Tujuan", referral.PihakTujuan},
		{"Email Tujuan", referral.EmailTujuan},
	}

	for _, d := range details {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.CellFormat(50, 5, d[0], "", 0, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.CellFormat(5, 5, ":", "", 0, "C", false, 0, "")
		pdf.CellFormat(0, 5, d[1], "", 1, "L", false, 0, "")
	}
	pdf.Ln(6)

	// ── Fetch and Render Counseling History ──────────────────────────────────
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.Cell(0, 5, "II. RIWAYAT KONSELING DI BKU CARE (COUNSELING HISTORY)")
	pdf.Ln(6)

	var sessions []models.PsikologSessionNote
	if err := config.DB.Preload("Psikolog").Where("mahasiswa_id = ?", referral.Mahasiswa.ID).Order("tanggal asc").Find(&sessions).Error; err != nil {
		// Log error if any, but continue
	}

	if len(sessions) == 0 {
		pdf.SetFont("Helvetica", "I", 9)
		pdf.SetTextColor(100, 116, 139)
		pdf.Cell(0, 5, "Tidak ada riwayat sesi konseling sebelumnya yang tercatat di sistem.")
		pdf.Ln(6)
	} else {
		if pdf.GetY()+15 > 185 {
			pdf.AddPage()
		}

		drawHeader := func() {
			pdf.SetFont("Helvetica", "B", 8.5)
			pdf.SetFillColor(241, 245, 249) // Slate 100
			pdf.SetTextColor(51, 65, 85)    // Slate 700
			pdf.CellFormat(10, 6, "No", "1", 0, "C", true, 0, "")
			pdf.CellFormat(35, 6, "Tanggal Sesi", "1", 0, "C", true, 0, "")
			pdf.CellFormat(50, 6, "Psikolog / Konselor", "1", 0, "C", true, 0, "")
			pdf.CellFormat(72, 6, "Keluhan / Kondisi Awal", "1", 0, "C", true, 0, "")
			pdf.CellFormat(80, 6, "Rekomendasi / Tindakan", "1", 1, "C", true, 0, "")
		}

		drawHeader()

		for idx, s := range sessions {
			noStr := fmt.Sprintf("%d", idx+1)
			tglStr := s.Tanggal.Format("02 Jan 2006")
			psikologNama := s.Psikolog.Nama
			if psikologNama == "" {
				psikologNama = "Psikolog BKU"
			}

			pdf.SetFont("Helvetica", "", 8.5)

			noLines := pdf.SplitLines([]byte(noStr), 10)
			tglLines := pdf.SplitLines([]byte(tglStr), 35)
			psikologLines := pdf.SplitLines([]byte(psikologNama), 50)
			keluhanLines := pdf.SplitLines([]byte(s.Keluhan), 72)
			rekomLines := pdf.SplitLines([]byte(s.Rekomendasi), 80)

			maxL := len(keluhanLines)
			if len(rekomLines) > maxL {
				maxL = len(rekomLines)
			}
			if len(psikologLines) > maxL {
				maxL = len(psikologLines)
			}
			if maxL < 1 {
				maxL = 1
			}

			lineHeight := 4.5
			padding := 2.0 // top and bottom padding

			curX := pdf.GetX()
			curY := pdf.GetY()

			// Preemptive page break check before drawing row
			if curY+lineHeight+2*padding > 185 {
				pdf.AddPage()
				drawHeader()
				pdf.SetFont("Helvetica", "", 8.5)
				curY = pdf.GetY()
			}

			// Draw top boundary line for this row
			pdf.Line(curX, curY, curX+247, curY)
			rowStartY := curY
			pdf.SetY(curY + padding)

			for i := 0; i < maxL; i++ {
				// Mid-row page break check
				if pdf.GetY()+lineHeight > 185 {
					// Draw bottom line for current page segment
					pdf.Line(curX, pdf.GetY(), curX+247, pdf.GetY())

					// Draw vertical grid lines for current page segment
					segmentH := pdf.GetY() - rowStartY
					pdf.Line(curX, rowStartY, curX, rowStartY+segmentH)
					pdf.Line(curX+10, rowStartY, curX+10, rowStartY+segmentH)
					pdf.Line(curX+45, rowStartY, curX+45, rowStartY+segmentH)
					pdf.Line(curX+95, rowStartY, curX+95, rowStartY+segmentH)
					pdf.Line(curX+167, rowStartY, curX+167, rowStartY+segmentH)
					pdf.Line(curX+247, rowStartY, curX+247, rowStartY+segmentH)

					// Trigger page break
					pdf.AddPage()
					drawHeader()
					pdf.SetFont("Helvetica", "", 8.5)

					rowStartY = pdf.GetY()
					pdf.SetY(rowStartY + padding)
					pdf.Line(curX, rowStartY, curX+247, rowStartY)
				}

				y := pdf.GetY()
				if i < len(noLines) {
					pdf.SetXY(curX, y)
					pdf.CellFormat(10, lineHeight, string(noLines[i]), "", 0, "C", false, 0, "")
				}
				if i < len(tglLines) {
					pdf.SetXY(curX+10, y)
					pdf.CellFormat(35, lineHeight, string(tglLines[i]), "", 0, "C", false, 0, "")
				}
				if i < len(psikologLines) {
					pdf.SetXY(curX+45, y)
					pdf.CellFormat(50, lineHeight, string(psikologLines[i]), "", 0, "L", false, 0, "")
				}
				if i < len(keluhanLines) {
					pdf.SetXY(curX+95, y)
					pdf.CellFormat(72, lineHeight, string(keluhanLines[i]), "", 0, "L", false, 0, "")
				}
				if i < len(rekomLines) {
					pdf.SetXY(curX+167, y)
					pdf.CellFormat(80, lineHeight, string(rekomLines[i]), "", 0, "L", false, 0, "")
				}
				pdf.Ln(lineHeight)
			}

			// Add bottom padding
			pdf.SetY(pdf.GetY() + padding)
			curY = pdf.GetY()

			// Draw final bottom line
			pdf.Line(curX, curY, curX+247, curY)

			// Draw vertical grid lines for the final segment
			segmentH := curY - rowStartY
			pdf.Line(curX, rowStartY, curX, rowStartY+segmentH)
			pdf.Line(curX+10, rowStartY, curX+10, rowStartY+segmentH)
			pdf.Line(curX+45, rowStartY, curX+45, rowStartY+segmentH)
			pdf.Line(curX+95, rowStartY, curX+95, rowStartY+segmentH)
			pdf.Line(curX+167, rowStartY, curX+167, rowStartY+segmentH)
			pdf.Line(curX+247, rowStartY, curX+247, rowStartY+segmentH)

			pdf.SetXY(curX, curY)
		}
		pdf.Ln(4)
	}
	pdf.SetTextColor(15, 23, 42)
	pdf.Ln(2)

	// ── Alasan Rujukan / Catatan ──────────────────────────────────────────────
	if pdf.GetY()+15 > 190 {
		pdf.AddPage()
	}
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.Cell(0, 5, "III. PERNYATAAN RUJUKAN & CATATAN KLINIS")
	pdf.Ln(6)

	pdf.SetFont("Helvetica", "", 9)
	pdf.MultiCell(247, 4.5, referral.Alasan, "", "L", false)
	pdf.Ln(6)

	// ── Signature Block ──────────────────────────────────────────────────────
	// Signature Block
	if pdf.GetY()+35 > 190 {
		pdf.AddPage()
	}

	sigY := pdf.GetY()
	pdf.SetFont("Helvetica", "", 9)

	// Bandung, [Date] placed on the right column
	pdf.SetXY(180, sigY)
	dateStr := fmt.Sprintf("Bandung, %s", formatIndoDate(referral.TanggalDibuat))
	pdf.Cell(0, 5, dateStr)

	pdf.SetXY(180, sigY+5)
	pdf.Cell(0, 5, "Psikolog Perujuk,")

	// Signature space
	pdf.SetXY(180, sigY+23)
	pdf.SetFont("Helvetica", "BU", 9.5) // Underlined
	pdf.Cell(0, 5, referral.Psikolog.Nama)

	pdf.SetXY(180, sigY+28)
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(0, 4, "BKU Care Center")

	pdf.SetXY(180, sigY+32)
	pdf.Cell(0, 4, fmt.Sprintf("Spesialisasi: %s", referral.Psikolog.Spesialisasi))

	// Jika rujukan sudah disetujui, tambahkan signature Kemahasiswaan di kiri
	if referral.ApprovalStatus == "disetujui" {
		adminName := "Kepala Bagian Kemahasiswaan"

		pdf.SetTextColor(15, 23, 42) // Slate 900
		pdf.SetXY(25, sigY+5)
		pdf.Cell(0, 5, "Mengetahui,")

		pdf.SetXY(25, sigY+10)
		pdf.Cell(0, 5, "Bagian Kemahasiswaan")

		// Signature space admin
		pdf.SetXY(25, sigY+23)
		pdf.SetFont("Helvetica", "BU", 9.5)
		pdf.Cell(0, 5, adminName)

		pdf.SetXY(25, sigY+28)
		pdf.SetFont("Helvetica", "", 8)
		pdf.SetTextColor(100, 116, 139)
		pdf.Cell(0, 4, "Direktorat Kemahasiswaan")
	}

	// Save file
	uploadsDir := "uploads/referrals"
	if err := os.MkdirAll(uploadsDir, 0755); err != nil {
		return "", "", err
	}

	fileName := fmt.Sprintf("referral_%d_%d_%s.pdf", referral.PsikologID, referral.MahasiswaID, time.Now().Format("20060102150405"))
	filePath := filepath.Join(uploadsDir, fileName)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return "", "", err
	}

	return "/uploads/referrals/" + fileName, fileName, nil
}
