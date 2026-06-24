package tenaga_kesehatan

import (
	"bytes"
	"fmt"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
	"github.com/xuri/excelize/v2"
)

// fetchExportBookings is a helper to fetch data based on date range
func fetchExportBookings(c *fiber.Ctx) ([]models.BookingKesehatan, time.Time, time.Time, error) {
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate time.Time
	var err error

	if startDateStr != "" {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			startDate = time.Now().Truncate(24 * time.Hour)
		}
	} else {
		startDate = time.Now().Truncate(24*time.Hour).AddDate(0, -1, 0) // default 1 month ago
	}

	if endDateStr != "" {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			endDate = time.Now().Truncate(24 * time.Hour)
		}
	} else {
		endDate = time.Now().Truncate(24 * time.Hour)
	}

	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return nil, startDate, endDate, err
	}

	reportType := c.Query("type")

	query := config.DB.Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").
		Preload("Jadwal").
		Joins("JOIN public.jadwal_kesehatan ON public.jadwal_kesehatan.id = public.booking_kesehatan.jadwal_id").
		Where("public.jadwal_kesehatan.tenaga_kes_id = ?", tk.ID).
		Where("public.jadwal_kesehatan.tanggal >= ? AND public.jadwal_kesehatan.tanggal <= ?", startDate, endDate)

	if reportType != "all" {
		query = query.Where("public.booking_kesehatan.jenis_pendaftaran != ? OR public.booking_kesehatan.jenis_pendaftaran IS NULL", "Offline")
	}

	var bookings []models.BookingKesehatan
	if err := query.Order("public.jadwal_kesehatan.tanggal ASC").
		Find(&bookings).Error; err != nil {
		return nil, startDate, endDate, err
	}

	return bookings, startDate, endDate, nil
}

// ExportExcel generates an Excel file containing list of patients for a specific date range
func ExportExcel(c *fiber.Ctx) error {
	bookings, _, _, err := fetchExportBookings(c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data pasien"})
	}

	f := excelize.NewFile()
	sheet := "Laporan Pasien"
	f.SetSheetName("Sheet1", sheet)

	// Headers
	headers := []string{"No", "Tanggal", "NIM", "Nama Pasien", "Program Studi", "Keluhan", "Status"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	style, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
		Fill: excelize.Fill{Type: "pattern", Color: []string{"#E0E0E0"}, Pattern: 1},
	})
	f.SetRowStyle(sheet, 1, 1, style)

	for i, b := range bookings {
		row := i + 2
		tanggal := ""
		if b.Jadwal.ID != 0 {
			tanggal = b.Jadwal.Tanggal.Format("02-01-2006")
		}
		prodi := ""
		if b.Mahasiswa.ProgramStudi.ID != 0 {
			prodi = b.Mahasiswa.ProgramStudi.Nama
		}

		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), tanggal)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), b.Mahasiswa.NIM)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), b.Mahasiswa.Nama)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), prodi)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), b.Keluhan)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), b.Status)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat file Excel"})
	}

	c.Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Set("Content-Disposition", "attachment; filename=\"Laporan_Pasien.xlsx\"")
	return c.SendStream(&buf)
}

// ExportPDF generates a PDF file containing list of patients for a specific date range
func ExportPDF(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	bookings, start, end, err := fetchExportBookings(c)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal mengambil data pasien"})
	}

	// Fetch Kesehatan details
	bookingIDs := make([]uint, 0)
	for _, b := range bookings {
		bookingIDs = append(bookingIDs, b.ID)
	}

	kesehatanMap := make(map[uint]models.Kesehatan)
	if len(bookingIDs) > 0 {
		var kesehatanList []models.Kesehatan
		config.DB.Where("booking_id IN ?", bookingIDs).Find(&kesehatanList)
		for _, k := range kesehatanList {
			if k.BookingID != nil {
				kesehatanMap[*k.BookingID] = k
			}
		}
	}

	// Calculate Stats
	total := len(bookings)
	online := 0
	offline := 0
	selesai := 0
	ditolak := 0

	for _, b := range bookings {
		if b.JenisPendaftaran == "Offline" {
			offline++
		} else {
			online++
		}
		if b.Status == "Selesai" {
			selesai++
		} else if b.Status == "Ditolak" {
			ditolak++
		}
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(10, 45, 10) // Left, Top, Right
	pdf.SetAutoPageBreak(true, 15)

	kopImage := "assets/kop_kesehatan2.jpg"
	pdf.SetHeaderFunc(func() {
		pdf.ImageOptions(kopImage, 0, 0, 210, 297, false, gofpdf.ImageOptions{ImageType: "JPEG", ReadDpi: true}, 0, "")
	})

	pdf.AddPage()

	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(190, 8, "LAPORAN REKAPITULASI PEMERIKSAAN KLINIK", "", 1, "C", false, 0, "")

	nomorSurat := utils.GenerateDocumentNumber("Laporan Rekap Pasien")
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(190, 5, fmt.Sprintf("Nomor Surat: %s", nomorSurat), "", 1, "C", false, 0, "")

	periodeStr := fmt.Sprintf("Periode: %s s.d %s", start.Format("02/01/2006"), end.Format("02/01/2006"))
	pdf.CellFormat(190, 6, periodeStr, "", 1, "C", false, 0, "")
	pdf.Ln(3)

	// Stat Box
	pdf.SetFillColor(245, 245, 245)
	pdf.Rect(10, pdf.GetY(), 190, 20, "DF")
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(12, pdf.GetY()+2)
	pdf.CellFormat(190, 5, "Ringkasan Statistik:", "", 1, "L", false, 0, "")
	pdf.SetFont("Arial", "", 8)
	pdf.SetXY(12, pdf.GetY())
	stat1 := fmt.Sprintf("Total Pasien: %d    |    Online: %d    |    Offline: %d", total, online, offline)
	stat2 := fmt.Sprintf("Status Selesai: %d  |    Status Ditolak: %d", selesai, ditolak)
	pdf.CellFormat(190, 5, stat1, "", 1, "L", false, 0, "")
	pdf.SetXY(12, pdf.GetY())
	pdf.CellFormat(190, 5, stat2, "", 1, "L", false, 0, "")
	pdf.Ln(6)

	// Table Header
	pdf.SetFont("Arial", "B", 8)
	pdf.SetFillColor(230, 230, 230)
	pdf.CellFormat(8, 8, "NO", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 8, "Tanggal", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, "Pasien (NIM/Nama)", "1", 0, "C", true, 0, "")
	pdf.CellFormat(17, 8, "Jenis", "1", 0, "C", true, 0, "")
	pdf.CellFormat(45, 8, "Keluhan", "1", 0, "C", true, 0, "")
	pdf.CellFormat(35, 8, "Hasil/Diagnosis", "1", 0, "C", true, 0, "")
	pdf.CellFormat(20, 8, "Status", "1", 1, "C", true, 0, "")

	pdf.SetFont("Arial", "", 7)

	for i, b := range bookings {
		tanggal := ""
		if b.Jadwal.ID != 0 {
			tanggal = b.Jadwal.Tanggal.Format("02/01/2006")
		}

		pasien := b.Mahasiswa.NIM + "\n" + b.Mahasiswa.Nama
		keluhan := b.Keluhan
		if keluhan == "" { keluhan = "-" }
		
		hasil := "-"
		kes, ok := kesehatanMap[b.ID]
		if ok {
			hasil = kes.Hasil
			if kes.Catatan != "" {
				hasil += "\n" + kes.Catatan
			}
		}

		pasienLines := pdf.SplitText(pasien, 43)
		keluhanLines := pdf.SplitText(keluhan, 43)
		hasilLines := pdf.SplitText(hasil, 33)
		
		maxLines := len(pasienLines)
		if len(keluhanLines) > maxLines { maxLines = len(keluhanLines) }
		if len(hasilLines) > maxLines { maxLines = len(hasilLines) }

		lineHt := 4.0
		rowHt := float64(maxLines) * lineHt
		if rowHt < 8.0 {
			rowHt = 8.0
		}

		x, y := pdf.GetXY()
		if y+rowHt > 275 {
			pdf.AddPage()
			x, y = pdf.GetXY()
		}
		
		// NO
		pdf.Rect(x, y, 8, rowHt, "D")
		pdf.SetXY(x, y+(rowHt-lineHt)/2)
		pdf.CellFormat(8, lineHt, fmt.Sprintf("%d", i+1), "", 0, "C", false, 0, "")

		// Tanggal
		x += 8
		pdf.Rect(x, y, 20, rowHt, "D")
		pdf.SetXY(x, y+(rowHt-lineHt)/2)
		pdf.CellFormat(20, lineHt, tanggal, "", 0, "C", false, 0, "")

		// Pasien
		x += 20
		pdf.Rect(x, y, 45, rowHt, "D")
		pasienY := y + (rowHt - (float64(len(pasienLines)) * lineHt)) / 2
		for j, line := range pasienLines {
			pdf.SetXY(x+1, pasienY+(float64(j)*lineHt))
			pdf.CellFormat(43, lineHt, line, "", 0, "L", false, 0, "")
		}

		// Jenis
		x += 45
		pdf.Rect(x, y, 17, rowHt, "D")
		pdf.SetXY(x, y+(rowHt-lineHt)/2)
		pdf.CellFormat(17, lineHt, b.JenisPendaftaran, "", 0, "C", false, 0, "")

		// Keluhan
		x += 17
		pdf.Rect(x, y, 45, rowHt, "D")
		keluhanY := y + (rowHt - (float64(len(keluhanLines)) * lineHt)) / 2
		for j, line := range keluhanLines {
			pdf.SetXY(x+1, keluhanY+(float64(j)*lineHt))
			pdf.CellFormat(43, lineHt, line, "", 0, "L", false, 0, "")
		}

		// Hasil
		x += 45
		pdf.Rect(x, y, 35, rowHt, "D")
		hasilY := y + (rowHt - (float64(len(hasilLines)) * lineHt)) / 2
		for j, line := range hasilLines {
			pdf.SetXY(x+1, hasilY+(float64(j)*lineHt))
			pdf.CellFormat(33, lineHt, line, "", 0, "L", false, 0, "")
		}

		// Status
		x += 35
		pdf.Rect(x, y, 20, rowHt, "D")
		pdf.SetXY(x, y+(rowHt-lineHt)/2)
		pdf.CellFormat(20, lineHt, b.Status, "", 0, "C", false, 0, "")

		pdf.SetXY(10, y+rowHt)
	}

	// Add Signature Block
	pdf.Ln(10)
	pdf.SetFont("Arial", "", 10)
	pdf.CellFormat(130, 5, "", "", 0, "C", false, 0, "")
	pdf.CellFormat(60, 5, fmt.Sprintf("Bandung, %s", time.Now().Format("02 Jan 2006")), "", 1, "C", false, 0, "")
	pdf.CellFormat(130, 5, "", "", 0, "C", false, 0, "")
	pdf.CellFormat(60, 5, "Petugas / Tenaga Kesehatan", "", 1, "C", false, 0, "")
	pdf.Ln(20)
	pdf.CellFormat(130, 5, "", "", 0, "C", false, 0, "")
	pdf.CellFormat(60, 5, fmt.Sprintf("( %s )", tk.Nama), "", 1, "C", false, 0, "")

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal membuat laporan PDF"})
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "attachment; filename=\"Laporan_Rekap_Klinik.pdf\"")
	return c.SendStream(&buf)
}
