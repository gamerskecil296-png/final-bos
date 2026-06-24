package kencana

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func generateQRToken() (string, time.Time) {
	b := make([]byte, 16)
	rand.Read(b)
	token := hex.EncodeToString(b)
	expiresAt := time.Now().Add(1 * time.Hour)
	return token, expiresAt
}

const (
	statusPassed          = "passed"
	statusConditionalPass = "conditional_pass"
	statusNotEligible     = "not_eligible"
	statusRemedial        = "remedial"
	statusInProgress      = "in_progress"
	statusNotStarted      = "not_started"
)

func logActivity(c *fiber.Ctx, aktivitas, deskripsi string) {
	uid, err := userID(c)
	if err != nil {
		return
	}
	config.DB.Create(&models.LogAktivitas{
		UserID:    uid,
		Aktivitas: aktivitas,
		Deskripsi: deskripsi,
		IPAddress: c.IP(),
	})
}

func userID(c *fiber.Ctx) (uint, error) {
	v, ok := c.Locals("user_id").(uint)
	if !ok || v == 0 {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "User tidak terautentikasi")
	}
	return v, nil
}

func currentStudent(c *fiber.Ctx) (*models.Mahasiswa, error) {
	uid, err := userID(c)
	if err != nil {
		return nil, err
	}
	var student models.Mahasiswa
	if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").First(&student, "pengguna_id = ?", uid).Error; err != nil {
		return nil, fiber.NewError(fiber.StatusNotFound, "Mahasiswa tidak ditemukan")
	}
	return &student, nil
}

func activePeriod(db *gorm.DB) (*models.KencanaPeriod, error) {
	var period models.KencanaPeriod
	// 1. Cari yang active atau published terlebih dahulu
	err := db.Where("status IN ?", []string{"active", "published"}).Order("start_date desc nulls last, created_at desc").First(&period).Error
	if err == nil {
		return &period, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}
	// 2. Jika tidak ada, pakai periode terbaru yang ada di database (meskipun draft)
	err = db.Order("created_at desc").First(&period).Error
	if err == nil {
		return &period, nil
	}
	return nil, err
}

func isStudentEligibleForPeriod(db *gorm.DB, period *models.KencanaPeriod, student *models.Mahasiswa) bool {
	if student.TahunMasuk == period.Year {
		return true
	}
	var count int64
	db.Model(&models.KencanaGroupMember{}).Where("period_id = ? AND student_id = ? AND status = 'active'", period.ID, student.ID).Count(&count)
	if count > 0 {
		return true
	}
	var mentorCount int64
	db.Model(&models.KencanaMentorAssignment{}).Where("period_id = ? AND student_id = ? AND status = 'active'", period.ID, student.ID).Count(&mentorCount)
	if mentorCount > 0 {
		return true
	}
	return false
}

func ensureDemoPeriod(db *gorm.DB, student *models.Mahasiswa) (*models.KencanaPeriod, error) {
	var period *models.KencanaPeriod
	err := db.Transaction(func(tx *gorm.DB) error {
		var existing models.KencanaPeriod
		// Lock-check inside transaction to prevent race condition
		err := tx.Set("gorm:query_option", "FOR UPDATE").
			Where("status IN ?", []string{"active", "published"}).
			Order("start_date desc nulls last, created_at desc").
			First(&existing).Error
		if err != gorm.ErrRecordNotFound {
			period = &existing
			return err
		}
		now := time.Now().UTC()
		start := now.AddDate(0, 0, -3)
		end := now.AddDate(0, 1, 0)
		period = &models.KencanaPeriod{
			Name:                  "Kencana " + time.Now().Format("2006"),
			Year:                  now.Year(),
			Description:           "Periode orientasi dan pembinaan mahasiswa baru.",
			StartDate:             &start,
			EndDate:               &end,
			Status:                "active",
			UniversityPhaseStatus: "active",
		}
		if err := tx.Create(period).Error; err != nil {
			return err
		}
		return seedDemoKencana(tx, period, student)
	})
	if err == nil && period != nil {
		if !isStudentEligibleForPeriod(db, period, student) {
			return nil, fmt.Errorf("Anda bukan peserta Kencana pada periode ini")
		}
	}
	return period, err
}

func seedDemoKencana(tx *gorm.DB, period *models.KencanaPeriod, student *models.Mahasiswa) error {
	now := time.Now().UTC()
	stageDefs := []struct {
		name          string
		typ           string
		desc          string
		day           int
		facultyScoped bool
	}{
		{"Pra-Kencana", "pra_kencana", "Persiapan awal, pengenalan aturan, dan pembekalan dasar.", -3, false},
		{"Kencana / Orientasi Utama", "kencana_universitas", "Orientasi utama universitas dan budaya akademik.", -1, false},
		{"Kencana Fakultas", "kencana_fakultas", "Pengenalan fakultas, program studi, dan komunitas akademik.", 2, true},
		{"Pasca Kencana", "pasca_kencana", "Refleksi, penugasan akhir, dan finalisasi handbook.", 5, false},
	}

	for i, def := range stageDefs {
		start := now.AddDate(0, 0, def.day)
		end := start.AddDate(0, 0, 2)
		status := "locked"
		if now.Before(start) {
			status = "not_open"
		} else if now.After(end) {
			status = "completed"
		} else {
			status = "active"
		}
		var fakultasID *uint
		if def.facultyScoped {
			fakultasID = &student.FakultasID
		}
		stage := models.KencanaStage{
			PeriodID: period.ID, FakultasID: fakultasID, Name: def.name, Type: def.typ,
			Description: def.desc, StartDate: &start, EndDate: &end, OrderNumber: i + 1,
			Status: status, IsPublished: true,
		}
		if err := tx.Create(&stage).Error; err != nil {
			return err
		}

		for s := 1; s <= 2; s++ {
			sessionStart := start.Add(time.Duration(s-1) * 24 * time.Hour)
			sessionEnd := sessionStart.Add(23 * time.Hour)
			session := models.KencanaSession{
				StageID: stage.ID, Title: fmt.Sprintf("%s - Sesi %d", def.name, s),
				Description: "Ikuti materi, quiz, dan tugas pada sesi ini sesuai jadwal yang dipublikasikan.",
				OrderNumber: s, StartDate: &sessionStart, EndDate: &sessionEnd, Status: status,
				IsRequired: true, IsPublished: true,
			}
			if err := tx.Create(&session).Error; err != nil {
				return err
			}

			material := models.KencanaMaterial{
				SessionID: session.ID, Title: "Materi " + session.Title, Type: "text",
				Content:     "Pelajari panduan Kencana pada sesi ini. Materi dapat berupa teks, file, link, atau video sesuai unggahan admin.",
				OrderNumber: 1, IsRequired: true,
			}
			if err := tx.Create(&material).Error; err != nil {
				return err
			}

			quizOpen := sessionStart
			quizClose := sessionEnd
			quiz := models.KencanaQuiz{
				SessionID: session.ID, Title: "Quiz " + session.Title,
				Description:     "Quiz pilihan ganda untuk mengukur pemahaman materi.",
				Instruction:     "Pilih satu jawaban paling tepat. Submit sebelum timer berakhir.",
				DurationMinutes: 20, OpenAt: &quizOpen, CloseAt: &quizClose, MaxAttempts: 2,
				ShowScore: true, Status: "published", IsRequired: true,
			}
			if err := tx.Create(&quiz).Error; err != nil {
				return err
			}
			questions := []models.KencanaQuestion{
				{QuizID: quiz.ID, QuestionText: "Apa tujuan utama mengikuti Kencana?", QuestionType: "multiple_choice", Score: 50, OrderNumber: 1},
				{QuizID: quiz.ID, QuestionText: "Komponen apa yang menjadi syarat wajib kelulusan penuh?", QuestionType: "multiple_choice", Score: 50, OrderNumber: 2},
			}
			for qi := range questions {
				if err := tx.Create(&questions[qi]).Error; err != nil {
					return err
				}
				options := []models.KencanaQuestionOption{
					{QuestionID: questions[qi].ID, OptionText: "Memahami budaya akademik dan menyelesaikan pembinaan", IsCorrect: qi == 0, OrderNumber: 1},
					{QuestionID: questions[qi].ID, OptionText: "Kehadiran 100% dan handbook disetujui", IsCorrect: qi == 1, OrderNumber: 2},
					{QuestionID: questions[qi].ID, OptionText: "Hanya mengunduh sertifikat", IsCorrect: false, OrderNumber: 3},
					{QuestionID: questions[qi].ID, OptionText: "Tidak ada kewajiban", IsCorrect: false, OrderNumber: 4},
				}
				if err := tx.Create(&options).Error; err != nil {
					return err
				}
			}

			assignment := models.KencanaAssignment{
				SessionID: session.ID, Title: "Tugas Refleksi " + session.Title,
				Description: "Tuliskan refleksi singkat setelah mengikuti sesi.", DueDate: &sessionEnd,
				SubmissionType: "text", Status: "published", IsRequired: true,
			}
			if err := tx.Create(&assignment).Error; err != nil {
				return err
			}
		}
	}
	return nil
}

func studentVisibleStages(db *gorm.DB, periodID uint, student *models.Mahasiswa) *gorm.DB {
	return db.Where(`mahasiswa.kencana_stages.period_id = ?
			AND mahasiswa.kencana_stages.is_published = ?
			AND (
				mahasiswa.kencana_stages.fakultas_id IS NULL
				OR mahasiswa.kencana_stages.fakultas_id = ?
			)`, periodID, true, student.FakultasID)
}

func average(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, v := range values {
		sum += v
	}
	return sum / float64(len(values))
}

func roundScore(v float64) float64 { return math.Round(v*100) / 100 }

func calculateAndStoreScore(db *gorm.DB, periodID, studentID uint) (*models.KencanaScore, []string, error) {
	scoreUniv, blockersUniv, errUniv := calculateAndStoreScoreForScope(db, periodID, studentID, "university", nil, true)
	
	var student models.Mahasiswa
	db.First(&student, studentID)
	var fakultasID *uint = nil
	if student.FakultasID != 0 {
		fakultasID = &student.FakultasID
	}
	calculateAndStoreScoreForScope(db, periodID, studentID, "fakultas", fakultasID, true)
	
	return scoreUniv, blockersUniv, errUniv
}

func calculateScoreReadOnly(db *gorm.DB, periodID, studentID uint) (*models.KencanaScore, []string, error) {
	scoreUniv, blockersUniv, errUniv := calculateAndStoreScoreForScope(db, periodID, studentID, "university", nil, false)
	return scoreUniv, blockersUniv, errUniv
}

func calculateAndStoreScoreForScope(db *gorm.DB, periodID, studentID uint, scopeType string, fakultasID *uint, autoFinalize bool) (*models.KencanaScore, []string, error) {

	var items []models.KencanaScoreItem
	qItems := db.Where("period_id = ? AND student_id = ? AND scope_type = ?", periodID, studentID, scopeType)
	if scopeType == "fakultas" && fakultasID != nil && *fakultasID != 0 {
		qItems = qItems.Where("fakultas_id = ?", fakultasID)
	}
	if err := qItems.Find(&items).Error; err != nil {
		return nil, nil, err
	}

	var period models.KencanaPeriod
	if err := db.First(&period, periodID).Error; err != nil {
		period = models.KencanaPeriod{CognitiveWeight: 25, PsychomotorWeight: 35, AffectiveWeight: 40}
	}
	cw := period.CognitiveWeight / 100
	pw := period.PsychomotorWeight / 100
	aw := period.AffectiveWeight / 100

	components := map[string][]float64{"cognitive": {}, "psychomotor": {}, "affective": {}}
	for _, item := range items {
		components[strings.ToLower(item.Component)] = append(components[strings.ToLower(item.Component)], item.Score)
	}
	// Calculate Expected Counts
	var sessions []models.KencanaSession
	qSessions := db.Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_stages.period_id = ?", periodID).
		Where("mahasiswa.kencana_sessions.status != ?", "draft").
		Preload("Quizzes", "status != ?", "draft").
		Preload("Assignments", "status != ?", "draft")

	if scopeType == "university" {
		qSessions = qSessions.Where("mahasiswa.kencana_stages.type IN ?", []string{"kencana_universitas", "pra_kencana"})
	} else if scopeType == "fakultas" {
		qSessions = qSessions.Where("mahasiswa.kencana_stages.type = ?", "kencana_fakultas")
		if fakultasID != nil && *fakultasID != 0 {
			qSessions = qSessions.Where("mahasiswa.kencana_stages.fakultas_id = ?", fakultasID)
		}
	}
	qSessions.Find(&sessions)

	expectedCognitive := 0
	if scopeType == "university" {
		expectedCognitive = 1 // Handbook is Univ only
	}
	for _, s := range sessions {
		expectedCognitive += len(s.Quizzes) + len(s.Assignments)
	}
	var expectedPsychomotor int
	{
		var cnt int64
		db.Model(&models.KencanaScoreItem{}).
			Where("period_id = ? AND component = ?", periodID, "psychomotor").
			Select("COUNT(DISTINCT item_name)").Scan(&cnt)
		expectedPsychomotor = int(cnt)
		if expectedPsychomotor == 0 {
			expectedPsychomotor = 7
		}
	}
	var expectedAffective int
	{
		var cnt int64
		db.Model(&models.KencanaScoreItem{}).
			Where("period_id = ? AND component = ?", periodID, "affective").
			Select("COUNT(DISTINCT item_name)").Scan(&cnt)
		expectedAffective = int(cnt)
		if expectedAffective == 0 {
			expectedAffective = 5
		}
	}

	sum := func(vals []float64) float64 {
		s := 0.0
		for _, v := range vals {
			s += v
		}
		return s
	}

	cog := 0.0
	if expectedCognitive > 0 {
		cog = roundScore(sum(components["cognitive"]) / float64(expectedCognitive))
	}
	psy := 0.0
	if expectedPsychomotor > 0 {
		psy = roundScore(sum(components["psychomotor"]) / float64(expectedPsychomotor))
	}
	aff := 0.0
	if expectedAffective > 0 {
		aff = roundScore(sum(components["affective"]) / float64(expectedAffective))
	}

	gradedCognitive := len(components["cognitive"])
	gradedPsychomotor := len(components["psychomotor"])
	gradedAffective := len(components["affective"])

	isComplete := true
	if gradedCognitive < expectedCognitive || gradedPsychomotor < expectedPsychomotor || gradedAffective < expectedAffective {
		isComplete = false
	}
	// Force complete if period is no longer active
	if period.Status == "closed" {
		isComplete = true
	}

	final := roundScore(cog*cw + psy*pw + aff*aw)
	now := time.Now().UTC()
	status, blockers := graduationStatus(db, periodID, studentID, final, items, isComplete)
	score := models.KencanaScore{
		PeriodID: periodID, StudentID: studentID, ScopeType: scopeType, FakultasID: fakultasID,
		CognitiveAverage: cog, PsychomotorAverage: psy, AffectiveAverage: aff,
		CognitiveWeighted: roundScore(cog * cw), PsychomotorWeighted: roundScore(psy * pw), AffectiveWeighted: roundScore(aff * aw),
		FinalScore: final, GraduationStatus: status, Notes: strings.Join(blockers, "; "), CalculatedAt: &now,
	}
	var existing models.KencanaScore
	qScore := db.Where("period_id = ? AND student_id = ? AND scope_type = ?", periodID, studentID, scopeType)
	if scopeType == "fakultas" && fakultasID != nil && *fakultasID != 0 {
		qScore = qScore.Where("fakultas_id = ?", fakultasID)
	}
	err := qScore.First(&existing).Error
	if err == nil {
		score.ID = existing.ID
		score.CreatedAt = existing.CreatedAt
		if err := db.Save(&score).Error; err != nil {
			return nil, nil, err
		}
	} else if err == gorm.ErrRecordNotFound {
		if err := db.Create(&score).Error; err != nil {
			return nil, nil, err
		}
	} else {
		return nil, nil, err
	}

	if autoFinalize {
		if status == statusNotEligible || status == statusConditionalPass || status == statusRemedial {
			var remedial models.KencanaRemedial
			if err := db.Where("period_id = ? AND student_id = ? AND status IN ?", periodID, studentID, []string{"open", "in_progress"}).First(&remedial).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					db.Create(&models.KencanaRemedial{
						PeriodID:  periodID,
						StudentID: studentID,
						Reason:    fmt.Sprintf("[%s] %s", strings.ToUpper(scopeType), strings.Join(blockers, "; ")),
						Status:    "open",
						OpenedAt:  &now,
					})
				}
			} else {
				remedial.Reason = strings.Join(blockers, "; ")
				db.Save(&remedial)
			}
		} else if status == statusPassed {
			var remedial models.KencanaRemedial
			if err := db.Where("period_id = ? AND student_id = ? AND status IN ?", periodID, studentID, []string{"open", "in_progress"}).First(&remedial).Error; err == nil {
				remedial.Status = "completed"
				remedial.ClosedAt = &now
				remedial.Reason = "Lulus otomatis setelah perbaikan nilai"
				db.Save(&remedial)
			}
			var cert models.KencanaCertificate
			if err := db.Where("period_id = ? AND student_id = ? AND scope_type = ?", periodID, studentID, scopeType).First(&cert).Error; err != nil {
				if err == gorm.ErrRecordNotFound {
					db.Create(&models.KencanaCertificate{
						PeriodID:          periodID,
						StudentID:         studentID,
						ScopeType:         scopeType,
						CertificateNumber: fmt.Sprintf("KNC-%s-%d-%d", scopeType, periodID, studentID),
						Status:            "not_available",
					})
				}
			}
		}
	}

	return &score, blockers, nil
}

func graduationStatus(db *gorm.DB, periodID, studentID uint, finalScore float64, items []models.KencanaScoreItem, isComplete bool) (string, []string) {
	blockers := []string{}

	var period models.KencanaPeriod
	db.First(&period, periodID)
	passingGrade := period.PassingGrade
	if passingGrade == 0 {
		passingGrade = 75 // Fallback
	}
	remedialGrade := period.RemedialGrade
	if remedialGrade == 0 {
		remedialGrade = 50 // Fallback
	}

	// Check overrides
	var kehadiranOverride bool
	var handbookOverride bool

	for _, item := range items {
		comp := strings.ToLower(item.Component)
		if comp == "requirements" {
			if strings.ToLower(item.ItemName) == "keluar" && item.Score > 0 {
				return "dropped_out", []string{"Mahasiswa berstatus Keluar (Manual Override)"}
			}
			if strings.ToLower(item.ItemName) == "kehadiran" && item.Score > 0 {
				kehadiranOverride = true
			}
		}
		if (comp == "cognitive" || comp == "requirements" || comp == "cognitive_static") && strings.ToLower(item.ItemName) == "handbook" && item.Score > 0 {
			handbookOverride = true
		}
	}

	if !kehadiranOverride {
		attendance := attendanceSummary(db, periodID, studentID)
		if attendance.RequiredSessions > 0 && attendance.Percentage < 100 {
			blockers = append(blockers, "Kehadiran belum 100%")
		}
	}

	if !handbookOverride {
		var handbook models.KencanaHandbook
		if err := db.Where("period_id = ? AND student_id = ?", periodID, studentID).First(&handbook).Error; err != nil || handbook.Status != "approved" {
			blockers = append(blockers, "Handbook belum disetujui")
		}
	}

	if !isComplete {
		blockers = append(blockers, "Penilaian belum lengkap (Mentor belum menginput semua nilai)")
		return statusInProgress, blockers
	}

	if finalScore < passingGrade {
		blockers = append(blockers, fmt.Sprintf("Nilai akhir masih di bawah %.0f", passingGrade))
	}

	// Jika tidak ada blocker dan nilai cukup → LULUS (remedial lama akan ditutup oleh caller)
	if len(blockers) == 0 && finalScore >= passingGrade {
		return statusPassed, blockers
	}

	if finalScore >= remedialGrade && finalScore < passingGrade {
		return statusConditionalPass, blockers
	}
	if finalScore > 0 && finalScore < passingGrade {
		return statusNotEligible, blockers
	}
	if finalScore == 0 {
		return statusInProgress, blockers
	}
	return statusNotEligible, blockers
}

type attendanceInfo struct {
	RequiredSessions int     `json:"required_sessions"`
	AttendedSessions int     `json:"attended_sessions"`
	Percentage       float64 `json:"percentage"`
	Status           string  `json:"status"`
}

func attendanceSummary(db *gorm.DB, periodID, studentID uint) attendanceInfo {
	var sessionIDs []uint
	db.Model(&models.KencanaSession{}).
		Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_stages.period_id = ? AND mahasiswa.kencana_sessions.is_required = ? AND mahasiswa.kencana_sessions.status = ?", periodID, true, "active").
		Pluck("mahasiswa.kencana_sessions.id", &sessionIDs)
	info := attendanceInfo{RequiredSessions: len(sessionIDs), Status: "Belum Lengkap"}
	if len(sessionIDs) == 0 {
		info.Status = "Lengkap"
		info.Percentage = 100
		return info
	}
	var attended int64
	db.Model(&models.KencanaAttendance{}).Where("student_id = ? AND session_id IN ? AND status IN ?", studentID, sessionIDs, []string{"present", "permission"}).Count(&attended)
	info.AttendedSessions = int(attended)
	info.Percentage = roundScore(float64(attended) / float64(len(sessionIDs)) * 100)
	if info.Percentage >= 100 {
		info.Status = "Lengkap"
	} else {
		info.Status = "Belum Lengkap"
	}
	return info
}

func activeMentorForStudent(periodID uint, studentID uint, scopeType string) fiber.Map {
	var assignment models.KencanaMentorAssignment
	qAss := config.DB.Preload("Mentor").Preload("Mentor.Fakultas").
		Joins("JOIN mahasiswa.kencana_mentors ON mahasiswa.kencana_mentors.id = mahasiswa.kencana_mentor_assignments.mentor_id")
	if scopeType != "" {
		qAss = qAss.Where("mahasiswa.kencana_mentors.scope_type = ?", scopeType)
	}
	if err := qAss.First(&assignment, "mahasiswa.kencana_mentor_assignments.period_id = ? AND mahasiswa.kencana_mentor_assignments.student_id = ? AND mahasiswa.kencana_mentor_assignments.status = ?", periodID, studentID, "active").Error; err == nil {
		mentor := assignment.Mentor
		return fiber.Map{"id": mentor.ID, "name": mentor.Name, "email": mentor.Email, "phone": mentor.Phone, "scope_type": mentor.ScopeType, "fakultas": mentor.Fakultas}
	}

	var groupMember models.KencanaGroupMember
	qGroup := config.DB.Preload("Group").Preload("Group.Mentor").Preload("Group.Mentor.Fakultas").
		Joins("JOIN mahasiswa.kencana_groups ON mahasiswa.kencana_groups.id = mahasiswa.kencana_group_members.group_id")
	if scopeType != "" {
		qGroup = qGroup.Where("mahasiswa.kencana_groups.scope_type = ?", scopeType)
	}
	if err := qGroup.First(&groupMember, "mahasiswa.kencana_group_members.period_id = ? AND mahasiswa.kencana_group_members.student_id = ? AND mahasiswa.kencana_group_members.status = ?", periodID, studentID, "active").Error; err == nil && groupMember.Group.Mentor != nil {
		mentor := *groupMember.Group.Mentor
		return fiber.Map{"id": mentor.ID, "name": mentor.Name, "email": mentor.Email, "phone": mentor.Phone, "scope_type": mentor.ScopeType, "fakultas": mentor.Fakultas}
	}

	return nil
}

func fetchStudentCertificates(db *gorm.DB, periodID, studentID uint) fiber.Map {
	var certs []models.KencanaCertificate
	db.Where("period_id = ? AND student_id = ? AND status = 'published'", periodID, studentID).Find(&certs)
	
	result := fiber.Map{}
	for _, cert := range certs {
		result[cert.ScopeType] = cert
	}
	return result
}

