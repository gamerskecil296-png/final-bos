package kencana

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/jung-kurt/gofpdf"
	"siakad-backend/models"
)

type PDFRowData struct {
	Student         models.Mahasiswa
	Score           models.KencanaScore
	Items           []models.KencanaScoreItem
	AttendanceCount int64
}

func GenerateKencanaPDFHelper(groupName, fasilitatorName, evaluatorName string, rows []PDFRowData) (string, error) {
	pdf := gofpdf.New("L", "mm", "Legal", "")
	pdf.AddPage()

	templatePath := "./uploads/kencana/templates/kop_landscape.png"
	if _, err := os.Stat(templatePath); err == nil {
		pdf.ImageOptions(templatePath, 0, 0, 355.6, 0, false, gofpdf.ImageOptions{ReadDpi: true}, 0, "")
	}

	pdf.SetFont("Arial", "", 9)
	pdf.SetY(40)

	pdf.CellFormat(40, 5, "Nama Kelompok", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(100, 5, groupName, "", 1, "L", false, 0, "")

	pdf.CellFormat(40, 5, "Jumlah Mahasiswa", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(100, 5, fmt.Sprintf("%d", len(rows)), "", 1, "L", false, 0, "")

	pdf.CellFormat(40, 5, "Nama Ketua", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(100, 5, "-", "", 1, "L", false, 0, "")

	pdf.CellFormat(40, 5, "No.Hp/Wa Ketua", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(100, 5, "-", "", 1, "L", false, 0, "")

	if fasilitatorName == "" {
		fasilitatorName = "-"
	}
	pdf.CellFormat(40, 5, "Nama Fasilitator", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(100, 5, fasilitatorName, "", 1, "L", false, 0, "")

	if evaluatorName == "" {
		evaluatorName = "Admin Kencana"
	}
	pdf.CellFormat(40, 5, "Nama Evaluator", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(100, 5, evaluatorName, "", 1, "L", false, 0, "")

	pdf.Ln(5)

	pdf.SetFont("Arial", "B", 5)
	startX := 5.0
	startY := pdf.GetY()

	colWidths := []float64{
		6, 35, 20, 11, 11,
		11, 11, 12,
		11, 11, 11, 11, 12, 12, 11, 12,
		11, 11, 11, 11, 11, 12,
		12, 12, 12,
		12, 15,
	}

	h := 4.0
	pdf.SetXY(startX, startY)

	drawCell := func(w, h float64, text string) {
		x := pdf.GetX()
		y := pdf.GetY()
		lines := strings.Split(text, "\n")
		pdf.Rect(x, y, w, h, "D")
		lineHeight := 2.5
		textStartY := y + (h-float64(len(lines))*lineHeight)/2
		for _, line := range lines {
			pdf.SetXY(x, textStartY)
			pdf.CellFormat(w, lineHeight, line, "", 0, "C", false, 0, "")
			textStartY += lineHeight
		}
		pdf.SetXY(x+w, y)
	}

	drawCell(colWidths[0], h*4, "No.")
	drawCell(colWidths[1], h*4, "Nama")
	drawCell(colWidths[2], h*4, "Prodi")
	drawCell(colWidths[3], h*4, "Kehadiran\n(100%)")
	drawCell(colWidths[4], h*4, "Handbook")

	wKog := colWidths[5] + colWidths[6] + colWidths[7]
	drawCell(wKog, h, "KOGNITIF")

	wPsi := 0.0
	for i := 8; i <= 15; i++ {
		wPsi += colWidths[i]
	}
	drawCell(wPsi, h*2, "PSIKOMOTOR")

	wAfe := 0.0
	for i := 16; i <= 21; i++ {
		wAfe += colWidths[i]
	}
	drawCell(wAfe, h*2, "AFEKTIF")

	wKomp := colWidths[22] + colWidths[23] + colWidths[24]
	drawCell(wKomp, h*2, "NILAI KOMPONEN")

	drawCell(colWidths[25], h*4, "Nilai\nAkhir")
	drawCell(colWidths[26], h*4, "Keterangan")

	pdf.SetXY(startX+colWidths[0]+colWidths[1]+colWidths[2]+colWidths[3]+colWidths[4], startY+h)
	wPraKencana := colWidths[5] + colWidths[6]
	drawCell(wPraKencana, h, "Pra Kencana - Kencana")
	drawCell(colWidths[7], h*3, "Rata-rata\nKognitif")

	pdf.SetXY(startX+colWidths[0]+colWidths[1]+colWidths[2]+colWidths[3]+colWidths[4], startY+h*2)
	drawCell(colWidths[5], h*2, "Post Test\nDay 1")
	drawCell(colWidths[6], h*2, "Post Test\nDay 2")
	pdf.SetX(pdf.GetX() + colWidths[7])

	drawCell(colWidths[8], h*2, "Taat\nPeraturan")
	drawCell(colWidths[9], h*2, "Twibon")
	drawCell(colWidths[10], h*2, "Vidio\nAnalog")
	drawCell(colWidths[11], h*2, "Atribut")
	drawCell(colWidths[12], h*2, "Kreativitas\nIndividu")
	drawCell(colWidths[13], h*2, "Kreativitas\nKelompok")
	drawCell(colWidths[14], h*2, "Fasilitas\nUBK")
	drawCell(colWidths[15], h*2, "Rata-rata\nPsikomotor")

	drawCell(colWidths[16], h*2, "Etika")
	drawCell(colWidths[17], h*2, "Empati")
	drawCell(colWidths[18], h*2, "Tanggung\nJawab")
	drawCell(colWidths[19], h*2, "Disiplin")
	drawCell(colWidths[20], h*2, "Adil")
	drawCell(colWidths[21], h*2, "Rata-rata\nAfektif")

	drawCell(colWidths[22], h*2, "Kognitif\n(25%)")
	drawCell(colWidths[23], h*2, "Psikomotor\n(35%)")
	drawCell(colWidths[24], h*2, "Afektif\n(40%)")

	pdf.SetXY(startX, startY+h*4)

	pdf.SetFont("Arial", "", 6)

	for i, row := range rows {
		if pdf.GetY() > 190 {
			pdf.AddPage()
			if _, err := os.Stat(templatePath); err == nil {
				pdf.ImageOptions(templatePath, 0, 0, 355.6, 215.9, false, gofpdf.ImageOptions{ReadDpi: true}, 0, "")
			}
			pdf.SetY(40)
			pdf.SetXY(startX, 40)
		}

		sc := row.Score
		items := row.Items

		findItemScore := func(comp, keyPart string) string {
			for _, it := range items {
				if strings.ToLower(it.Component) == comp && strings.Contains(strings.ToLower(it.ItemName), strings.ToLower(keyPart)) {
					return fmt.Sprintf("%.0f", it.Score)
				}
			}
			return "0"
		}

		findQuizScore := func(index int) string {
			var qIdx int
			for _, it := range items {
				if strings.ToLower(it.Component) == "cognitive" && strings.Contains(strings.ToLower(it.ItemName), "quiz") {
					if qIdx == index {
						return fmt.Sprintf("%.0f", it.Score)
					}
					qIdx++
				}
			}
			return "0"
		}

		rowH := 6.0
		pdf.SetX(startX)
		drawCell(colWidths[0], rowH, fmt.Sprintf("%d", i+1))

		nama := row.Student.Nama
		if len(nama) > 25 {
			nama = nama[:25] + ".."
		}
		drawCell(colWidths[1], rowH, nama)

		prodi := row.Student.ProgramStudi.Nama
		if len(prodi) > 15 {
			prodi = prodi[:15] + ".."
		}
		drawCell(colWidths[2], rowH, prodi)

		drawCell(colWidths[3], rowH, fmt.Sprintf("%d", row.AttendanceCount))

		drawCell(colWidths[4], rowH, findItemScore("cognitive", "handbook"))

		drawCell(colWidths[5], rowH, findQuizScore(0))
		drawCell(colWidths[6], rowH, findQuizScore(1))
		drawCell(colWidths[7], rowH, fmt.Sprintf("%.1f", sc.CognitiveAverage))

		drawCell(colWidths[8], rowH, findItemScore("psychomotor", "taat"))
		drawCell(colWidths[9], rowH, findItemScore("psychomotor", "twibon"))
		drawCell(colWidths[10], rowH, findItemScore("psychomotor", "video"))
		drawCell(colWidths[11], rowH, findItemScore("psychomotor", "atribut"))
		drawCell(colWidths[12], rowH, findItemScore("psychomotor", "kreativitas individu"))
		drawCell(colWidths[13], rowH, findItemScore("psychomotor", "kreativitas kelompok"))
		drawCell(colWidths[14], rowH, findItemScore("psychomotor", "memelihara"))
		drawCell(colWidths[15], rowH, fmt.Sprintf("%.1f", sc.PsychomotorAverage))

		drawCell(colWidths[16], rowH, findItemScore("affective", "etika"))
		drawCell(colWidths[17], rowH, findItemScore("affective", "empati"))
		drawCell(colWidths[18], rowH, findItemScore("affective", "tanggung jawab"))
		drawCell(colWidths[19], rowH, findItemScore("affective", "disiplin"))
		drawCell(colWidths[20], rowH, findItemScore("affective", "adil"))
		drawCell(colWidths[21], rowH, fmt.Sprintf("%.1f", sc.AffectiveAverage))

		drawCell(colWidths[22], rowH, fmt.Sprintf("%.1f", sc.CognitiveWeighted))
		drawCell(colWidths[23], rowH, fmt.Sprintf("%.1f", sc.PsychomotorWeighted))
		drawCell(colWidths[24], rowH, fmt.Sprintf("%.1f", sc.AffectiveWeighted))

		drawCell(colWidths[25], rowH, fmt.Sprintf("%.1f", sc.FinalScore))
		
		statusStr := sc.GraduationStatus
		if statusStr == "" {
			statusStr = "belum_lengkap"
		}
		drawCell(colWidths[26], rowH, strings.ReplaceAll(statusStr, "_", " "))

		pdf.Ln(rowH)
	}

	sanitizedGroup := strings.ReplaceAll(groupName, "/", "_")
	sanitizedGroup = strings.ReplaceAll(sanitizedGroup, " ", "_")
	safeFileName := fmt.Sprintf("Rekap_%s.pdf", sanitizedGroup)
	savePath := filepath.Join(os.TempDir(), safeFileName)
	if err := pdf.OutputFileAndClose(savePath); err != nil {
		return "", fmt.Errorf("Gagal generate PDF: " + err.Error())
	}

	return savePath, nil
}
