package kencana

import (
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetFacultyComplianceMonitoring returns per-faculty compliance metrics
// for the active kencana period.
func GetFacultyComplianceMonitoring(c *fiber.Ctx) error {
	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		if p, err := activePeriod(config.DB); err == nil {
			periodID = p.ID
		}
	}
	if periodID == 0 {
		return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"faculties": []fiber.Map{}, "summary": fiber.Map{}}})
	}

	var period models.KencanaPeriod
	if err := config.DB.First(&period, periodID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
	}

	// Load all faculties
	var faculties []models.Fakultas
	config.DB.Order("nama asc").Find(&faculties)

	// Load faculty phases for this period
	var fPhases []models.KencanaFacultyPhase
	config.DB.Where("period_id = ?", periodID).Find(&fPhases)
	phaseMap := make(map[uint]models.KencanaFacultyPhase)
	for _, fp := range fPhases {
		phaseMap[fp.FakultasID] = fp
	}

	// Load stages per faculty
	var stages []models.KencanaStage
	config.DB.Where("period_id = ? AND fakultas_id IS NOT NULL", periodID).Find(&stages)
	stageCountMap := make(map[uint]int)
	stageIDs := make(map[uint][]uint)
	for _, s := range stages {
		if s.FakultasID != nil {
			stageCountMap[*s.FakultasID]++
			stageIDs[*s.FakultasID] = append(stageIDs[*s.FakultasID], s.ID)
		}
	}

	// Load sessions per faculty stage
	var sessions []models.KencanaSession
	config.DB.Where("stage_id IN (?)", config.DB.Model(&models.KencanaStage{}).Select("id").Where("period_id = ? AND fakultas_id IS NOT NULL", periodID)).Find(&sessions)
	sessionStageMap := make(map[uint]uint) // sessionID -> stageID
	for _, s := range sessions {
		sessionStageMap[s.ID] = s.StageID
	}

	// Map stageID -> fakultasID
	stageFakultasMap := make(map[uint]uint)
	for _, s := range stages {
		if s.FakultasID != nil {
			stageFakultasMap[s.ID] = *s.FakultasID
		}
	}

	sessionCountMap := make(map[uint]int)
	for _, s := range sessions {
		if fid, ok := stageFakultasMap[s.StageID]; ok {
			sessionCountMap[fid]++
		}
	}

	// Load materials count per faculty
	type countResult struct {
		FakultasID uint
		Count      int
	}
	var materialCounts []countResult
	config.DB.Table("mahasiswa.kencana_materials").
		Select("fakultas_id, COUNT(*) as count").
		Where("fakultas_id IS NOT NULL").
		Where("session_id IN (?)", config.DB.Model(&models.KencanaSession{}).Select("id").Where("stage_id IN (?)", config.DB.Model(&models.KencanaStage{}).Select("id").Where("period_id = ? AND fakultas_id IS NOT NULL", periodID))).
		Group("fakultas_id").Find(&materialCounts)
	materialCountMap := make(map[uint]int)
	for _, mc := range materialCounts {
		materialCountMap[mc.FakultasID] = mc.Count
	}

	// Load assignment count per faculty
	var assignmentCounts []countResult
	config.DB.Table("mahasiswa.kencana_assignments").
		Select("fakultas_id, COUNT(*) as count").
		Where("fakultas_id IS NOT NULL").
		Where("session_id IN (?)", config.DB.Model(&models.KencanaSession{}).Select("id").Where("stage_id IN (?)", config.DB.Model(&models.KencanaStage{}).Select("id").Where("period_id = ? AND fakultas_id IS NOT NULL", periodID))).
		Group("fakultas_id").Find(&assignmentCounts)
	assignmentCountMap := make(map[uint]int)
	for _, ac := range assignmentCounts {
		assignmentCountMap[ac.FakultasID] = ac.Count
	}

	// Load groups per faculty
	var groups []models.KencanaGroup
	config.DB.Where("period_id = ? AND fakultas_id IS NOT NULL AND scope_type = 'faculty'", periodID).Find(&groups)
	groupCountMap := make(map[uint]int)
	groupWithMentorMap := make(map[uint]int)
	groupIDsByFakultas := make(map[uint][]uint)
	for _, g := range groups {
		if g.FakultasID != nil {
			groupCountMap[*g.FakultasID]++
			if g.MentorID != nil && *g.MentorID != 0 {
				groupWithMentorMap[*g.FakultasID]++
			}
			groupIDsByFakultas[*g.FakultasID] = append(groupIDsByFakultas[*g.FakultasID], g.ID)
		}
	}

	// Load group member counts per faculty
	type memberCount struct {
		FakultasID uint
		Count      int
	}
	groupMemberCountMap := make(map[uint]int)
	for fid, gids := range groupIDsByFakultas {
		if len(gids) > 0 {
			var cnt int64
			config.DB.Model(&models.KencanaGroupMember{}).Where("group_id IN ? AND status = 'active'", gids).Count(&cnt)
			groupMemberCountMap[fid] = int(cnt)
		}
	}

	// Load total students per faculty for this period's year
	type studentCount struct {
		FakultasID uint
		Count      int64
	}
	totalStudentMap := make(map[uint]int)

	if period.PmbPeriodeId != "" {
		// Use PMB data
		var prodiList []models.ProgramStudi
		config.DB.Preload("Fakultas").Find(&prodiList)
		prodiToFakultasMap := make(map[string]uint)
		for _, p := range prodiList {
			prodiToFakultasMap[p.Nama] = p.FakultasID
		}

		type pmbLight struct {
			PilihanProdi string
		}
		var pmbs []pmbLight
		config.DB.Table("public.pendaftaran_mahasiswa_baru").Select("pilihan_prodi").Where("id_periode = ?", period.PmbPeriodeId).Find(&pmbs)
		for _, p := range pmbs {
			if fid, ok := prodiToFakultasMap[p.PilihanProdi]; ok {
				totalStudentMap[fid]++
			}
		}
	} else {
		// Fallback to mahasiswa table
		type fakCount struct {
			FakultasID uint
			Cnt        int64
		}
		var fakCounts []fakCount
		config.DB.Table("mahasiswa.mahasiswa").
			Select("fakultas_id, COUNT(*) as cnt").
			Where("tahun_masuk = ? AND deleted_at IS NULL", period.Year).
			Group("fakultas_id").Find(&fakCounts)
		for _, fc := range fakCounts {
			totalStudentMap[fc.FakultasID] = int(fc.Cnt)
		}
	}

	// Load mentor count per faculty
	var mentors []models.KencanaMentor
	config.DB.Where("fakultas_id IS NOT NULL AND status = 'active'").Find(&mentors)
	mentorCountMap := make(map[uint]int)
	for _, m := range mentors {
		if m.FakultasID != nil {
			mentorCountMap[*m.FakultasID]++
		}
	}

	// Load scores per faculty (faculty scope)
	type scoreAgg struct {
		FakultasID       uint
		Total            int
		GradedCount      int
		PassedCount      int
		RemedialCount    int
		AvgFinalScore    float64
	}
	scoreMap := make(map[uint]scoreAgg)
	var scores []models.KencanaScore
	config.DB.Where("period_id = ? AND scope_type = 'faculty' AND fakultas_id IS NOT NULL", periodID).Find(&scores)
	for _, s := range scores {
		if s.FakultasID == nil {
			continue
		}
		fid := *s.FakultasID
		agg := scoreMap[fid]
		agg.FakultasID = fid
		agg.Total++
		st := strings.ToLower(s.GraduationStatus)
		if st == "passed" {
			agg.PassedCount++
			agg.GradedCount++
		} else if st == "remedial" {
			agg.RemedialCount++
			agg.GradedCount++
		} else if s.FinalScore > 0 {
			agg.GradedCount++
		}
		agg.AvgFinalScore += s.FinalScore
		scoreMap[fid] = agg
	}

	// Load banding counts per faculty
	type bandingAgg struct {
		Total    int
		Pending  int
		Approved int
		Rejected int
	}
	bandingMap := make(map[uint]bandingAgg)
	var bandings []models.KencanaBanding
	config.DB.Where("period_id = ?", periodID).Preload("Student").Find(&bandings)
	for _, b := range bandings {
		fid := b.Student.FakultasID
		if fid == 0 {
			continue
		}
		agg := bandingMap[fid]
		agg.Total++
		switch strings.ToLower(b.Status) {
		case "pending":
			agg.Pending++
		case "approved":
			agg.Approved++
		case "rejected":
			agg.Rejected++
		}
		bandingMap[fid] = agg
	}

	// Build per-faculty results
	now := time.Now()
	results := []fiber.Map{}

	var totalCompliant, totalPartial, totalBehind int

	for _, fak := range faculties {
		phase := phaseMap[fak.ID]
		totalStudents := totalStudentMap[fak.ID]
		stageCount := stageCountMap[fak.ID]
		sessCount := sessionCountMap[fak.ID]
		matCount := materialCountMap[fak.ID]
		asgCount := assignmentCountMap[fak.ID]
		grpCount := groupCountMap[fak.ID]
		grpWithMentor := groupWithMentorMap[fak.ID]
		membersPlotted := groupMemberCountMap[fak.ID]
		mntCount := mentorCountMap[fak.ID]
		sAgg := scoreMap[fak.ID]
		bAgg := bandingMap[fak.ID]

		// Calculate compliance scores
		// 1. Scheduling compliance (has stages, sessions, materials, assignments)
		schedScore := 0
		schedMax := 4
		if stageCount > 0 {
			schedScore++
		}
		if sessCount > 0 {
			schedScore++
		}
		if matCount > 0 {
			schedScore++
		}
		if asgCount > 0 {
			schedScore++
		}
		schedPct := 0
		if schedMax > 0 {
			schedPct = (schedScore * 100) / schedMax
		}

		// 2. Plotting compliance
		plottingPct := 0
		if totalStudents > 0 {
			plottingPct = (membersPlotted * 100) / totalStudents
			if plottingPct > 100 {
				plottingPct = 100
			}
		}

		// 3. Grading progress
		gradingPct := 0
		if totalStudents > 0 && sAgg.Total > 0 {
			gradingPct = (sAgg.GradedCount * 100) / sAgg.Total
		} else if totalStudents > 0 && sAgg.Total == 0 {
			gradingPct = 0
		}

		avgScore := 0.0
		if sAgg.Total > 0 {
			avgScore = sAgg.AvgFinalScore / float64(sAgg.Total)
		}

		// Determine overall status
		overallPct := 0
		if schedMax > 0 {
			overallPct = (schedPct + plottingPct + gradingPct) / 3
		}

		status := "behind"
		if overallPct >= 75 {
			status = "compliant"
			totalCompliant++
		} else if overallPct >= 40 {
			status = "partial"
			totalPartial++
		} else {
			totalBehind++
		}

		// Is deadline overdue?
		isOverdue := false
		if phase.EndDate != nil && now.After(*phase.EndDate) && phase.Status != "completed" {
			isOverdue = true
		}

		results = append(results, fiber.Map{
			"fakultas_id":   fak.ID,
			"fakultas_nama": fak.Nama,
			"phase_status":  phase.Status,
			"start_date":    phase.StartDate,
			"end_date":      phase.EndDate,
			"is_overdue":    isOverdue,

			// Scheduling
			"stage_count":      stageCount,
			"session_count":    sessCount,
			"material_count":   matCount,
			"assignment_count": asgCount,
			"scheduling_pct":   schedPct,

			// Plotting
			"total_students":     totalStudents,
			"members_plotted":    membersPlotted,
			"group_count":        grpCount,
			"groups_with_mentor": grpWithMentor,
			"mentor_count":       mntCount,
			"plotting_pct":       plottingPct,

			// Grading
			"graded_count":  sAgg.GradedCount,
			"passed_count":  sAgg.PassedCount,
			"remedial_count": sAgg.RemedialCount,
			"grading_pct":   gradingPct,
			"avg_score":     avgScore,

			// Banding
			"banding_total":    bAgg.Total,
			"banding_pending":  bAgg.Pending,
			"banding_approved": bAgg.Approved,
			"banding_rejected": bAgg.Rejected,

			// Overall
			"overall_pct":    overallPct,
			"overall_status": status,
		})
	}

	summary := fiber.Map{
		"total_faculties":     len(faculties),
		"compliant_count":    totalCompliant,
		"partial_count":      totalPartial,
		"behind_count":       totalBehind,
		"period_name":        period.Name,
		"period_id":          period.ID,
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"faculties": results,
			"summary":   summary,
		},
	})
}
