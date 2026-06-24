package tenaga_kesehatan

import (
	"bytes"
	"fmt"
	"strconv"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
)

// CreateManualBooking handles walk-in patient registrations by Tenaga Kesehatan
func CreateManualBooking(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var body struct {
		MahasiswaID uint   `json:"mahasiswa_id"`
		Keluhan     string `json:"keluhan"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	if body.MahasiswaID == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Mahasiswa ID wajib diisi")
	}

	// Verify Mahasiswa exists
	var mhs models.Mahasiswa
	if err := config.DB.First(&mhs, body.MahasiswaID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Data mahasiswa tidak ditemukan")
	}

	// Find or Create a schedule for today
	today := time.Now().Truncate(24 * time.Hour)
	var jadwal models.JadwalKesehatan
	if err := config.DB.Where("tenaga_kes_id = ? AND tanggal = ?", tk.ID, today).First(&jadwal).Error; err != nil {
		// Create a walk-in schedule automatically
		jadwal = models.JadwalKesehatan{
			TenagaKesID: tk.ID,
			Tanggal:     today,
			JamMulai:    "08:00",
			JamSelesai:  "17:00",
			Kuota:       999,
			Lokasi:      "Klinik",
			TipeLayanan: "Pemeriksaan Umum",
		}
		if err := config.DB.Create(&jadwal).Error; err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat jadwal pendaftaran manual")
		}
	}

	// Create booking
	booking := models.BookingKesehatan{
		JadwalID:         jadwal.ID,
		MahasiswaID:      mhs.ID,
		Keluhan:          body.Keluhan,
		Status:           "Menunggu", // Direct queue
		JenisPendaftaran: "Offline",
	}

	if err := config.DB.Create(&booking).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mendaftarkan pasien secara manual")
	}

	logActivity(c, tk.UserID, "Registrasi Pasien Walk-in", fmt.Sprintf("Mendaftarkan %s untuk antrean medis", mhs.Nama))

	return jsonOK(c, fiber.Map{
		"message": "Berhasil mendaftarkan pasien secara manual",
		"booking": booking,
	})
}

// ExportRegistrationFormPDF generates a blank template for offline manual registration
func ExportRegistrationFormPDF(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	rowsStr := c.Query("rows", "20")
	rows, err := strconv.Atoi(rowsStr)
	if err != nil || rows <= 0 {
		rows = 20
	}

	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate time.Time

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			startDate = time.Now().Truncate(24 * time.Hour)
		}
	} else {
		startDate = time.Now().Truncate(24 * time.Hour)
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			endDate = time.Now().Truncate(24 * time.Hour)
		}
	} else {
		endDate = time.Now().Truncate(24 * time.Hour)
	}

	var existingBookings []models.BookingKesehatan
	config.DB.Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").
		Preload("Jadwal").Preload("Jadwal.TenagaKes").
		Joins("JOIN public.jadwal_kesehatan ON public.jadwal_kesehatan.id = public.booking_kesehatan.jadwal_id").
		Where("public.jadwal_kesehatan.tanggal >= ? AND public.jadwal_kesehatan.tanggal <= ?", startDate, endDate).
		Where("public.booking_kesehatan.jenis_pendaftaran = ?", "Offline").
		Order("public.jadwal_kesehatan.tanggal ASC").
		Find(&existingBookings)

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 45, 15)
	pdf.SetAutoPageBreak(true, 15)

	// Add Header
	kopImage := "assets/kop_kesehatan2.jpg"
	pdf.SetHeaderFunc(func() {
		// Draw kop surat (Full A4 background)
		pdf.ImageOptions(kopImage, 0, 0, 210, 297, false, gofpdf.ImageOptions{ImageType: "JPEG", ReadDpi: true}, 0, "")
	})

	pdf.AddPage()

	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(180, 8, "FORM PENDAFTARAN LAYANAN KESEHATAN", "", 1, "C", false, 0, "")

	nomorSurat := utils.GenerateDocumentNumber("Pendaftaran Medis")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(180, 5, fmt.Sprintf("Nomor Surat: %s", nomorSurat), "", 1, "C", false, 0, "")
	pdf.Ln(5)

	// Table Header
	pdf.SetFont("Arial", "B", 10)
	pdf.SetFillColor(230, 230, 230)
	pdf.CellFormat(10, 10, "NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 10, "Tanggal", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 10, "Nama", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 10, "Prodi", "1", 0, "C", true, 0, "")
	pdf.CellFormat(35, 10, "Keluhan", "1", 0, "C", true, 0, "")
	pdf.CellFormat(25, 10, "Petugas", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 10, "TTD", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 9)
	currentRow := 1

	// Print existing manual bookings
	for _, b := range existingBookings {
		nama := " " + b.Mahasiswa.Nama
		prodi := ""
		if b.Mahasiswa.ProgramStudi.ID != 0 {
			prodi = " " + b.Mahasiswa.ProgramStudi.Nama
		}
		keluhan := " " + b.Keluhan
		petugas := ""
		if b.Jadwal.TenagaKes.ID != 0 {
			petugas = " " + b.Jadwal.TenagaKes.Nama
		}

		namaLines := pdf.SplitText(nama, 43)
		prodiLines := pdf.SplitText(prodi, 28)
		keluhanLines := pdf.SplitText(keluhan, 33)
		petugasLines := pdf.SplitText(petugas, 23)

		maxLines := len(namaLines)
		if len(prodiLines) > maxLines {
			maxLines = len(prodiLines)
		}
		if len(keluhanLines) > maxLines {
			maxLines = len(keluhanLines)
		}
		if len(petugasLines) > maxLines {
			maxLines = len(petugasLines)
		}

		lineHt := 5.0
		rowHt := float64(maxLines) * lineHt
		if rowHt < 10.0 {
			rowHt = 10.0
		}

		x, y := pdf.GetXY()
		if y+rowHt > 275 {
			pdf.AddPage()
			x, y = pdf.GetXY()
		}

		// NO
		pdf.Rect(x, y, 10, rowHt, "D")
		pdf.SetXY(x, y+(rowHt-lineHt)/2)
		pdf.CellFormat(10, lineHt, strconv.Itoa(currentRow), "", 0, "C", false, 0, "")

		// Tanggal
		x += 10
		pdf.Rect(x, y, 25, rowHt, "D")
		pdf.SetXY(x, y+(rowHt-lineHt)/2)
		pdf.CellFormat(25, lineHt, b.Jadwal.Tanggal.Format("02/01/2006"), "", 0, "C", false, 0, "")

		// Nama
		x += 25
		pdf.Rect(x, y, 45, rowHt, "D")
		namaYOffset := y + (rowHt-(float64(len(namaLines))*lineHt))/2
		for i, line := range namaLines {
			pdf.SetXY(x, namaYOffset+float64(i)*lineHt)
			pdf.CellFormat(45, lineHt, line, "", 0, "L", false, 0, "")
		}

		// Prodi
		x += 45
		pdf.Rect(x, y, 30, rowHt, "D")
		prodiYOffset := y + (rowHt-(float64(len(prodiLines))*lineHt))/2
		for i, line := range prodiLines {
			pdf.SetXY(x, prodiYOffset+float64(i)*lineHt)
			pdf.CellFormat(30, lineHt, line, "", 0, "L", false, 0, "")
		}

		// Keluhan
		x += 30
		pdf.Rect(x, y, 35, rowHt, "D")
		keluhanYOffset := y + (rowHt-(float64(len(keluhanLines))*lineHt))/2
		for i, line := range keluhanLines {
			pdf.SetXY(x, keluhanYOffset+float64(i)*lineHt)
			pdf.CellFormat(35, lineHt, line, "", 0, "L", false, 0, "")
		}

		// Petugas
		x += 35
		pdf.Rect(x, y, 25, rowHt, "D")
		petugasYOffset := y + (rowHt-(float64(len(petugasLines))*lineHt))/2
		for i, line := range petugasLines {
			pdf.SetXY(x, petugasYOffset+float64(i)*lineHt)
			pdf.CellFormat(25, lineHt, line, "", 0, "L", false, 0, "")
		}

		// TTD
		x += 25
		pdf.Rect(x, y, 20, rowHt, "D")

		pdf.SetXY(15, y+rowHt)
		currentRow++
	}

	// Empty Rows loop removed as per request
	// Add Signature Block
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(120, 5, "", "", 0, "C", false, 0, "")
	pdf.CellFormat(60, 5, fmt.Sprintf("%s", time.Now().Format("02 Jan 2006")), "", 1, "C", false, 0, "")
	pdf.CellFormat(120, 5, "", "", 0, "C", false, 0, "")
	pdf.CellFormat(60, 5, "Petugas / Tenaga Kesehatan", "", 1, "C", false, 0, "")
	pdf.Ln(20)
	pdf.CellFormat(120, 5, "", "", 0, "C", false, 0, "")
	pdf.CellFormat(60, 5, fmt.Sprintf("( %s )", tk.Nama), "", 1, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat PDF Form"})
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Form_Pendaftaran_Manual_%d_Baris.pdf\"", rows))
	return c.SendStream(&buf)
}
