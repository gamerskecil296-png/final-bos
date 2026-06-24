package kencana

import (
	"siakad-backend/config"
	"siakad-backend/models"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func GetDashboardStats(c *fiber.Ctx) error {
	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		if period, err := activePeriod(config.DB); err == nil {
			periodID = period.ID
		}
	}

	var pmbPeriodeId string
	var targetTahunMasuk int
	if periodID != 0 {
		var p models.KencanaPeriod
		if err := config.DB.First(&p, periodID).Error; err == nil {
			pmbPeriodeId = p.PmbPeriodeId
			targetTahunMasuk = p.Year
		}
	}
	if targetTahunMasuk == 0 {
		targetTahunMasuk = time.Now().Year()
	}

	role, scopedFakultasID := kencanaAdminScope(c)
	scopeType := "university"
	if role == "kencana_fakultas" {
		scopeType = "fakultas"
	}

	type StatsResponse struct {
		TotalParticipants int         `json:"total_participants"`
		Males             int         `json:"males"`
		Females           int         `json:"females"`
		FacultyBreakdown  []fiber.Map `json:"faculty_breakdown"`
		ProdiBreakdown    []fiber.Map `json:"prodi_breakdown"`
		CityBreakdown     []fiber.Map `json:"city_breakdown"`
		JalurBreakdown    []fiber.Map `json:"jalur_breakdown"`
		PassedCount       int         `json:"passed_count"`
		RemedialCount     int         `json:"remedial_count"`
		InProgressCount   int         `json:"in_progress_count"`
		AvgScore          float64     `json:"avg_score"`
		AvgCog            float64     `json:"avg_cog"`
		AvgPsy            float64     `json:"avg_psy"`
		AvgAff            float64     `json:"avg_aff"`
	}

	stats := StatsResponse{
		FacultyBreakdown: []fiber.Map{},
		ProdiBreakdown:   []fiber.Map{},
		CityBreakdown:    []fiber.Map{},
		JalurBreakdown:   []fiber.Map{},
	}

	var studentIDs []uint

	// Load Prodis to Map
	var prodiList []models.ProgramStudi
	config.DB.Preload("Fakultas").Find(&prodiList)
	prodiFakultasMap := make(map[string]string)
	prodiIDMap := make(map[uint]string)
	for _, p := range prodiList {
		prodiFakultasMap[p.Nama] = p.Fakultas.Nama
		prodiIDMap[p.ID] = p.Nama
	}

	facultyMap := make(map[string]int)
	prodiMap := make(map[string]int)
	cityMap := make(map[string]int)
	jalurMap := make(map[string]int)

	if pmbPeriodeId != "" {
		type pmbLight struct {
			ID           uint
			JenisKelamin string
			Jalur        string
			Kota         string
			PilihanProdi string
		}
		var pmbs []pmbLight
		q := config.DB.Table("public.pendaftaran_mahasiswa_baru").Select("id, jenis_kelamin, jalur, kota, pilihan_prodi").Where("id_periode = ?", pmbPeriodeId)

		if role == "kencana_fakultas" {
			var prodiNames []string
			config.DB.Model(&models.ProgramStudi{}).Where("fakultas_id = ?", scopedFakultasID).Pluck("nama", &prodiNames)
			if len(prodiNames) > 0 {
				q = q.Where("pilihan_prodi IN ?", prodiNames)
			} else {
				q = q.Where("1 = 0")
			}
		}

		q.Find(&pmbs)
		stats.TotalParticipants = len(pmbs)

		for _, p := range pmbs {
			studentIDs = append(studentIDs, p.ID)

			jk := strings.ToLower(p.JenisKelamin)
			if strings.HasPrefix(jk, "l") {
				stats.Males++
			} else if strings.HasPrefix(jk, "p") {
				stats.Females++
			}

			kota := p.Kota
			if kota == "" {
				kota = "Tidak Diketahui"
			}
			cityMap[kota]++

			jalur := p.Jalur
			if jalur == "" {
				jalur = "Lainnya"
			}
			jalurMap[jalur]++

			prodiName := p.PilihanProdi
			if prodiName == "" {
				prodiName = "Lainnya"
			}
			fname := prodiFakultasMap[prodiName]
			if fname == "" {
				fname = "Tanpa Fakultas"
			}

			fullName := strings.TrimSpace(strings.Replace(fname, "Fakultas", "", 1)) + " - " + strings.TrimSpace(strings.Replace(strings.Replace(strings.Replace(strings.Replace(prodiName, "S1 ", "", 1), "D3 ", "", 1), "S2 ", "", 1), "S3 ", "", 1))
			prodiMap[fullName]++
			facultyMap[strings.TrimSpace(strings.Replace(fname, "Fakultas", "", 1))]++
		}
	} else {
		// fallback
		type mhsLight struct {
			ID             uint
			JenisKelamin   string
			JalurMasuk     string
			AlamatDomisili string
			ProgramStudiID *uint
			FakultasID     *uint
		}
		var mhs []mhsLight
		q := config.DB.Table("mahasiswa.mahasiswa").Select("id, jenis_kelamin, jalur_masuk, alamat_domisili, program_studi_id, fakultas_id").Where("deleted_at IS NULL")

		if periodID != 0 {
			q = q.Where("tahun_masuk = ? OR id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE period_id = ?)", targetTahunMasuk, periodID)
		} else {
			q = q.Where("tahun_masuk = ?", targetTahunMasuk)
		}

		if role == "kencana_fakultas" {
			q = q.Where("fakultas_id = ?", scopedFakultasID)
		}

		q.Find(&mhs)

		stats.TotalParticipants = len(mhs)
		for _, m := range mhs {
			studentIDs = append(studentIDs, m.ID)

			jk := strings.ToLower(m.JenisKelamin)
			if strings.HasPrefix(jk, "l") {
				stats.Males++
			} else if strings.HasPrefix(jk, "p") {
				stats.Females++
			}

			kota := "Tidak Diketahui"
			if m.AlamatDomisili != "" {
				kota = "Lainnya"
			}
			cityMap[kota]++

			jalur := m.JalurMasuk
			if jalur == "" {
				jalur = "Lainnya"
			}
			jalurMap[jalur]++

			prodiName := "Lainnya"
			if m.ProgramStudiID != nil {
				prodiName = prodiIDMap[*m.ProgramStudiID]
			}
			fname := prodiFakultasMap[prodiName]
			if fname == "" {
				fname = "Tanpa Fakultas"
			}

			fullName := strings.TrimSpace(strings.Replace(fname, "Fakultas", "", 1)) + " - " + strings.TrimSpace(strings.Replace(strings.Replace(strings.Replace(strings.Replace(prodiName, "S1 ", "", 1), "D3 ", "", 1), "S2 ", "", 1), "S3 ", "", 1))
			prodiMap[fullName]++
			facultyMap[strings.TrimSpace(strings.Replace(fname, "Fakultas", "", 1))]++
		}
	}

	// Calculate Scores
	type scoreLight struct {
		FinalScore         float64
		CognitiveAverage   float64
		PsychomotorAverage float64
		AffectiveAverage   float64
		GraduationStatus   string
	}
	var scores []scoreLight

	if len(studentIDs) > 0 {
		// Chunk studentIDs to avoid param limits just in case
		chunkSize := 5000
		for i := 0; i < len(studentIDs); i += chunkSize {
			end := i + chunkSize
			if end > len(studentIDs) {
				end = len(studentIDs)
			}
			var chunkScores []scoreLight
			config.DB.Table("mahasiswa.kencana_scores").Select("final_score, cognitive_average, psychomotor_average, affective_average, graduation_status").
				Where("period_id = ? AND scope_type = ? AND student_id IN ?", periodID, scopeType, studentIDs[i:end]).Find(&chunkScores)
			scores = append(scores, chunkScores...)
		}
	}

	var scoreSum float64
	var cogSum float64
	var psySum float64
	var affSum float64
	var scoreCount int

	for _, s := range scores {
		st := strings.ToLower(s.GraduationStatus)
		if st == "passed" {
			stats.PassedCount++
		} else if st == "remedial" {
			stats.RemedialCount++
		}

		if s.FinalScore > 0 {
			scoreSum += s.FinalScore
			cogSum += s.CognitiveAverage
			psySum += s.PsychomotorAverage
			affSum += s.AffectiveAverage
			scoreCount++
		}
	}

	stats.InProgressCount = stats.TotalParticipants - (stats.PassedCount + stats.RemedialCount)
	if stats.InProgressCount < 0 {
		stats.InProgressCount = 0
	}

	if scoreCount > 0 {
		stats.AvgScore = scoreSum / float64(scoreCount)
		stats.AvgCog = cogSum / float64(scoreCount)
		stats.AvgPsy = psySum / float64(scoreCount)
		stats.AvgAff = affSum / float64(scoreCount)
	}

	// Sort Breakdown Maps into Slices
	type kv struct {
		Name  string
		Count int
	}

	toSlice := func(m map[string]int) []kv {
		var arr []kv
		for k, v := range m {
			arr = append(arr, kv{k, v})
		}
		sort.Slice(arr, func(i, j int) bool {
			return arr[i].Count > arr[j].Count
		})
		return arr
	}

	for _, v := range toSlice(facultyMap) {
		stats.FacultyBreakdown = append(stats.FacultyBreakdown, fiber.Map{"name": v.Name, "jumlah": v.Count})
	}
	for _, v := range toSlice(prodiMap) {
		stats.ProdiBreakdown = append(stats.ProdiBreakdown, fiber.Map{"name": v.Name, "jumlah": v.Count})
	}

	sortedCities := toSlice(cityMap)
	cityCount := 0
	for _, v := range sortedCities {
		if cityCount >= 5 {
			break
		}
		if v.Name == "Tidak Diketahui" {
			continue
		}
		stats.CityBreakdown = append(stats.CityBreakdown, fiber.Map{"name": v.Name, "jumlah": v.Count})
		cityCount++
	}

	for _, v := range toSlice(jalurMap) {
		stats.JalurBreakdown = append(stats.JalurBreakdown, fiber.Map{"name": v.Name, "jumlah": v.Count})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    stats,
	})
}
