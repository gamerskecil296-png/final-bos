package kencana

import (
	"encoding/json"
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func GetDashboard(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode Kencana"})
	}

	calculateAndStoreScore(config.DB, period.ID, student.ID)

	var scoreUniv models.KencanaScore
	config.DB.Where("period_id = ? AND student_id = ? AND scope_type = ?", period.ID, student.ID, "university").First(&scoreUniv)
	
	var scoreFakultas models.KencanaScore
	if student.FakultasID != 0 {
		config.DB.Where("period_id = ? AND student_id = ? AND scope_type = ?", period.ID, student.ID, "fakultas").First(&scoreFakultas)
	}

	_, blockersUniv, _ := calculateAndStoreScoreForScope(config.DB, period.ID, student.ID, "university", nil, false)

	progress := progressSummary(period.ID, student)
	activeStage := fiber.Map{}
	var stage models.KencanaStage
	if err := studentVisibleStages(config.DB, period.ID, student).Where("status = ?", "active").Order("order_number asc").First(&stage).Error; err == nil {
		activeStage = fiber.Map{"id": stage.ID, "name": stage.Name, "type": stage.Type}
	}

	scopeType := "university"
	if stage.ID != 0 && stage.Type == "kencana_fakultas" {
		scopeType = "faculty"
	}

	lastActivity := findLastActivity(period.ID, student)
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"period":                fiber.Map{"id": period.ID, "name": period.Name, "year": period.Year, "description": period.Description, "start_date": period.StartDate, "end_date": period.EndDate},
		"status":                scoreUniv.GraduationStatus, // Legacy
		"progress_total":        progress,
		"active_stage":          activeStage,
		"temporary_final_score": scoreUniv.FinalScore, // Legacy
		"graduation_status":     scoreUniv.GraduationStatus, // Legacy
		"needs_remedial":        scoreUniv.GraduationStatus == statusRemedial || scoreUniv.GraduationStatus == statusConditionalPass,
		"scores":                fiber.Map{"cognitive": scoreUniv.CognitiveAverage, "psychomotor": scoreUniv.PsychomotorAverage, "affective": scoreUniv.AffectiveAverage}, // Legacy
		
		// New Scoped Fields
		"score_univ":            scoreUniv,
		"score_fakultas":        scoreFakultas,
		"status_univ":           scoreUniv.GraduationStatus,
		"status_fakultas":       scoreFakultas.GraduationStatus,
		
		"certificates":          fetchStudentCertificates(config.DB, period.ID, student.ID),

		"last_activity":         lastActivity,
		"blockers":              blockersUniv,
		"notifications":         importantNotifications(period.ID, student.ID, blockersUniv),
		"mentor":                activeMentorForStudent(period.ID, student.ID, scopeType),
		"weights":               fiber.Map{"cognitive": period.CognitiveWeight, "psychomotor": period.PsychomotorWeight, "affective": period.AffectiveWeight},
	}})
}

func GetMentorInvitations(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Periode Kencana tidak tersedia"})
	}
	var invitations []models.KencanaMentorAssignment
	if err := config.DB.Preload("Mentor").Preload("Mentor.Fakultas").Where("period_id = ? AND student_id = ? AND status IN ?", period.ID, student.ID, []string{"pending", "active", "rejected"}).Order("created_at desc").Find(&invitations).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat undangan"})
	}

	var groupInvitations []models.KencanaGroupMember
	if err := config.DB.Preload("Group").Preload("Group.Mentor").Preload("Group.Members").Preload("Group.Members.Student").Where("period_id = ? AND student_id = ? AND status IN ?", period.ID, student.ID, []string{"pending", "active", "rejected"}).Order("created_at desc").Find(&groupInvitations).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat undangan kelompok"})
	}

	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"period":            period,
		"invitations":       invitations,
		"group_invitations": groupInvitations,
		"active_mentor":     activeMentorForStudent(period.ID, student.ID, ""),
	}})
}

func RespondMentorInvitation(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	type reqBody struct {
		Action string `json:"action"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || (req.Action != "accept" && req.Action != "reject") {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Aksi undangan tidak valid"})
	}
	var invitation models.KencanaMentorAssignment
	if err := config.DB.First(&invitation, "id = ? AND student_id = ? AND status = ?", c.Params("id"), student.ID, "pending").Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Undangan tidak ditemukan"})
	}
	newStatus := "rejected"
	if req.Action == "accept" {
		var activeCount int64
		config.DB.Model(&models.KencanaMentorAssignment{}).Where("period_id = ? AND student_id = ? AND status = ?", invitation.PeriodID, student.ID, "active").Count(&activeCount)
		if activeCount > 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Mahasiswa sudah memiliki Dewan Pembimbing aktif"})
		}
		newStatus = "active"
	}
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		invitation.Status = newStatus
		if err := tx.Save(&invitation).Error; err != nil {
			return err
		}
		if newStatus == "active" {
			return tx.Model(&models.KencanaMentorAssignment{}).
				Where("period_id = ? AND student_id = ? AND id <> ? AND status = ?", invitation.PeriodID, student.ID, invitation.ID, "pending").
				Update("status", "rejected").Error
		}
		return nil
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui undangan"})
	}

	logActivity(c, "kencana", fmt.Sprintf("%s undangan DP", map[string]string{"accept": "Menerima", "reject": "Menolak"}[req.Action]))

	return c.JSON(fiber.Map{"success": true, "message": "Undangan berhasil diperbarui", "data": invitation})
}

func RespondGroupInvitation(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	type reqBody struct {
		Action string `json:"action"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || (req.Action != "accept" && req.Action != "reject") {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Aksi undangan tidak valid"})
	}
	var invitation models.KencanaGroupMember
	if err := config.DB.Preload("Group").First(&invitation, "id = ? AND student_id = ? AND status = ?", c.Params("id"), student.ID, "pending").Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Undangan kelompok tidak ditemukan"})
	}
	newStatus := "rejected"
	if req.Action == "accept" {
		var activeCount int64
		config.DB.Model(&models.KencanaGroupMember{}).
			Joins("JOIN mahasiswa.kencana_groups ON mahasiswa.kencana_groups.id = mahasiswa.kencana_group_members.group_id").
			Where("mahasiswa.kencana_group_members.period_id = ? AND mahasiswa.kencana_group_members.student_id = ? AND mahasiswa.kencana_group_members.status = ? AND mahasiswa.kencana_groups.scope_type = ?", invitation.PeriodID, student.ID, "active", invitation.Group.ScopeType).
			Count(&activeCount)
		if activeCount > 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Mahasiswa sudah bergabung dengan kelompok lain di ruang lingkup ini pada periode aktif"})
		}
		newStatus = "active"
	}
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		invitation.Status = newStatus
		if err := tx.Save(&invitation).Error; err != nil {
			return err
		}
		if newStatus == "active" {
			return tx.Model(&models.KencanaGroupMember{}).
				Where("period_id = ? AND student_id = ? AND id <> ? AND status = ? AND group_id IN (SELECT id FROM mahasiswa.kencana_groups WHERE scope_type = ?)", invitation.PeriodID, student.ID, invitation.ID, "pending", invitation.Group.ScopeType).
				Update("status", "rejected").Error
		}
		return nil
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui undangan kelompok"})
	}

	logActivity(c, "kencana", fmt.Sprintf("%s undangan kelompok", map[string]string{"accept": "Menerima", "reject": "Menolak"}[req.Action]))

	return c.JSON(fiber.Map{"success": true, "message": "Undangan kelompok berhasil diperbarui", "data": invitation})
}

func GetTimeline(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode Kencana"})
	}

	var stages []models.KencanaStage
	if err := studentVisibleStages(config.DB, period.ID, student).
		Preload("Sessions", func(db *gorm.DB) *gorm.DB { return db.Order("order_number asc") }).
		Order("order_number asc").Find(&stages).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat timeline Kencana"})
	}

	// Fetch timeline phases from Admin
	var timelinePhases []models.KencanaTimelinePhase
	config.DB.Where("period_id = ?", period.ID).Find(&timelinePhases)

	var facultyPhase models.KencanaFacultyPhase
	config.DB.Where("period_id = ? AND fakultas_id = ?", period.ID, student.FakultasID).First(&facultyPhase)

	data := make([]fiber.Map, 0, len(stages))
	for _, s := range stages {
		payload := stagePayload(s, student.ID, student.FakultasID)

		phaseType := s.Type

		if phaseType == "kencana_fakultas" && facultyPhase.ID != 0 {
			if facultyPhase.StartDate != nil {
				payload["start_date"] = facultyPhase.StartDate
			}
			if facultyPhase.EndDate != nil {
				payload["end_date"] = facultyPhase.EndDate
			}
			payload["status"] = facultyPhase.Status
			payload["name"] = "Kencana Fakultas"
		} else {
			for _, tp := range timelinePhases {
				if tp.PhaseType == phaseType {
					if tp.StartDate != nil {
						payload["start_date"] = tp.StartDate
					}
					if tp.EndDate != nil {
						payload["end_date"] = tp.EndDate
					}
					payload["status"] = tp.Status
					break
				}
			}
		}

		// Fix naming to match what user wants
		if phaseType == "kencana_universitas" {
			payload["name"] = "Kencana University"
		} else if phaseType == "pra_kencana" {
			payload["name"] = "Pra-Kencana"
		} else if phaseType == "pasca_kencana" {
			payload["name"] = "Pasca-Kencana"
		}

		data = append(data, payload)
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"period": period, "stages": data}})
}

func GetStage(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	if _, err := ensureDemoPeriod(config.DB, student); err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	stageID, err := c.ParamsInt("stageId")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Stage tidak valid"})
	}

	var stage models.KencanaStage
	if err := config.DB.Preload("Sessions", func(db *gorm.DB) *gorm.DB { return db.Order("order_number asc") }).
		First(&stage, "id = ? AND is_published = ? AND (fakultas_id IS NULL OR fakultas_id = ?)", stageID, true, student.FakultasID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Tahap tidak ditemukan atau terkunci"})
	}

	sessions := make([]fiber.Map, 0, len(stage.Sessions))
	for _, session := range stage.Sessions {
		sessions = append(sessions, sessionSummaryPayload(session, student.ID, student.FakultasID))
	}

	payload := stagePayload(stage, student.ID, student.FakultasID)

	// Sync dates with Admin KencanaTimelinePhase
	var timelinePhase models.KencanaTimelinePhase
	phaseType := stage.Type
	if phaseType == "kencana_universitas" {
		phaseType = "kencana_universitas"
	}

	if phaseType == "kencana_fakultas" {
		var facultyPhase models.KencanaFacultyPhase
		if err := config.DB.Where("period_id = ? AND fakultas_id = ?", stage.PeriodID, student.FakultasID).First(&facultyPhase).Error; err == nil {
			if facultyPhase.StartDate != nil {
				payload["start_date"] = facultyPhase.StartDate
			}
			if facultyPhase.EndDate != nil {
				payload["end_date"] = facultyPhase.EndDate
			}
			payload["status"] = facultyPhase.Status
			payload["name"] = "Kencana Fakultas"
		}
	} else {
		if err := config.DB.Where("period_id = ? AND phase_type = ?", stage.PeriodID, phaseType).First(&timelinePhase).Error; err == nil {
			if timelinePhase.StartDate != nil {
				payload["start_date"] = timelinePhase.StartDate
			}
			if timelinePhase.EndDate != nil {
				payload["end_date"] = timelinePhase.EndDate
			}
			payload["status"] = timelinePhase.Status
		}
	}

	if phaseType == "kencana_universitas" {
		payload["name"] = "Kencana University"
	} else if phaseType == "pra_kencana" {
		payload["name"] = "Pra-Kencana"
	} else if phaseType == "pasca_kencana" {
		payload["name"] = "Pasca-Kencana"
	}

	scopeType := "university"
	if stage.Type == "kencana_fakultas" {
		scopeType = "faculty"
	}

	mentorData := activeMentorForStudent(stage.PeriodID, student.ID, scopeType)
	if mentorData != nil {
		payload["mentor"] = mentorData
	}

	var activeGroupMember models.KencanaGroupMember
	if err := config.DB.Preload("Group").
		Joins("JOIN mahasiswa.kencana_groups ON mahasiswa.kencana_groups.id = mahasiswa.kencana_group_members.group_id").
		First(&activeGroupMember, "mahasiswa.kencana_group_members.period_id = ? AND mahasiswa.kencana_group_members.student_id = ? AND mahasiswa.kencana_group_members.status = ? AND mahasiswa.kencana_groups.scope_type = ?", stage.PeriodID, student.ID, "active", scopeType).Error; err == nil {
		payload["group"] = fiber.Map{
			"id":     activeGroupMember.Group.ID,
			"number": activeGroupMember.Group.GroupNumber,
			"name":   activeGroupMember.Group.Name,
			"code":   activeGroupMember.Group.Code,
		}
	}

	payload["sessions"] = sessions
	return c.JSON(fiber.Map{"success": true, "data": payload})
}

func GetSession(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	if _, err := ensureDemoPeriod(config.DB, student); err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	sessionID, err := c.ParamsInt("sessionId")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Sesi tidak valid"})
	}

	var session models.KencanaSession
	if err := config.DB.Preload("Materials", func(db *gorm.DB) *gorm.DB {
		return db.Where("fakultas_id = ? OR fakultas_id IS NULL", student.FakultasID).Order("order_number asc")
	}).
		Preload("Quizzes", func(db *gorm.DB) *gorm.DB {
			return db.Where("fakultas_id = ? OR fakultas_id IS NULL", student.FakultasID).Order("created_at asc")
		}).
		Preload("Assignments", func(db *gorm.DB) *gorm.DB {
			return db.Where("fakultas_id = ? OR fakultas_id IS NULL", student.FakultasID).Order("created_at asc")
		}).
		Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where(`mahasiswa.kencana_sessions.id = ?
			AND (mahasiswa.kencana_sessions.is_published = ? OR mahasiswa.kencana_sessions.status IN ?)
			AND (mahasiswa.kencana_stages.is_published = ? OR mahasiswa.kencana_stages.status IN ?)
			AND (mahasiswa.kencana_stages.fakultas_id IS NULL OR mahasiswa.kencana_stages.fakultas_id = ?)`,
			sessionID,
			true, []string{"active", "published", "in_progress"},
			true, []string{"active", "published", "in_progress"},
			student.FakultasID,
		).
		First(&session).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sesi tidak ditemukan atau terkunci"})
	}

	return c.JSON(fiber.Map{"success": true, "data": sessionDetailPayload(session, student.ID)})
}

func CompleteMaterial(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	if _, err := ensureDemoPeriod(config.DB, student); err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	materialID, err := c.ParamsInt("materialId")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Materi tidak valid"})
	}
	now := time.Now().UTC()
	progress := models.KencanaMaterialProgress{MaterialID: uint(materialID), StudentID: student.ID, Status: "completed", CompletedAt: &now}
	var existing models.KencanaMaterialProgress
	err = config.DB.Where("material_id = ? AND student_id = ?", materialID, student.ID).First(&existing).Error
	if err == nil {
		existing.Status = "completed"
		existing.CompletedAt = &now
		if err := config.DB.Save(&existing).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan progress materi"})
		}
	} else if err == gorm.ErrRecordNotFound {
		if err := config.DB.Create(&progress).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan progress materi"})
		}
	} else {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan progress materi"})
	}

	logActivity(c, "kencana", fmt.Sprintf("Menyelesaikan materi #%d", materialID))

	return c.JSON(fiber.Map{"success": true, "message": "Materi ditandai selesai", "data": progress})
}

func GetQuiz(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	quiz, err := quizForStudent(c.Params("quizId"), student)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	var stageType string
	config.DB.Table("mahasiswa.kencana_stages").
		Select("mahasiswa.kencana_stages.type").
		Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.stage_id = mahasiswa.kencana_stages.id").
		Where("mahasiswa.kencana_sessions.id = ?", quiz.SessionID).
		Scan(&stageType)

	scopeType := "university"
	if stageType == "kencana_fakultas" {
		scopeType = "faculty"
	}

	now := time.Now().UTC()
	canStart, lockReason := quizAccess(quiz, now)
	if canStart && stageType != "pra_kencana" && stageType != "pasca_kencana" && activeMentorForStudent(period.ID, student.ID, scopeType) == nil {
		canStart = false
		lockReason = "Anda belum memiliki Dewan Pembimbing (DP) aktif"
	}
	var attempts int64
	var lastAttempt models.KencanaQuizAttempt
	config.DB.Where("quiz_id = ? AND student_id = ?", quiz.ID, student.ID).Order("created_at desc").First(&lastAttempt)
	config.DB.Model(&models.KencanaQuizAttempt{}).Where("quiz_id = ? AND student_id = ?", quiz.ID, student.ID).Count(&attempts)
	if quiz.MaxAttempts > 0 && int(attempts) >= quiz.MaxAttempts {
		canStart = false
		lockReason = "Batas percobaan quiz sudah habis"
	}

	questions := make([]fiber.Map, 0, len(quiz.Questions))
	for _, q := range quiz.Questions {
		options := make([]fiber.Map, 0, len(q.Options))
		for _, o := range q.Options {
			options = append(options, fiber.Map{"id": o.ID, "option_text": o.OptionText, "order_number": o.OrderNumber})
		}
		questions = append(questions, fiber.Map{"id": q.ID, "question_text": q.QuestionText, "question_type": q.QuestionType, "score": q.Score, "order_number": q.OrderNumber, "options": options})
	}

	resData := fiber.Map{
		"id": quiz.ID, "title": quiz.Title, "description": quiz.Description, "instruction": quiz.Instruction,
		"duration_minutes": quiz.DurationMinutes, "open_at": quiz.OpenAt, "close_at": quiz.CloseAt,
		"max_attempts": quiz.MaxAttempts, "attempts_used": attempts, "show_score": quiz.ShowScore, "status": quiz.Status,
		"can_start": canStart, "lock_reason": lockReason, "questions": questions,
	}

	if lastAttempt.ID > 0 && lastAttempt.Status == "submitted" {
		// Calculate correct count
		var correctCount int64
		config.DB.Model(&models.KencanaQuizAnswer{}).Joins("JOIN mahasiswa.kencana_question_options ON mahasiswa.kencana_question_options.id = mahasiswa.kencana_quiz_answers.selected_option_id").Where("attempt_id = ? AND is_correct = true", lastAttempt.ID).Count(&correctCount)
		
		resData["last_attempt"] = fiber.Map{
			"score": lastAttempt.Score,
			"passed": lastAttempt.Score >= 75,
			"correct_count": correctCount,
			"total_questions": len(quiz.Questions),
		}
	}

	return c.JSON(fiber.Map{"success": true, "data": resData})
}

func StartQuiz(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	quiz, err := quizForStudent(c.Params("quizId"), student)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	var stageType string
	config.DB.Table("mahasiswa.kencana_stages").
		Select("mahasiswa.kencana_stages.type").
		Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.stage_id = mahasiswa.kencana_stages.id").
		Where("mahasiswa.kencana_sessions.id = ?", quiz.SessionID).
		Scan(&stageType)

	scopeType := "university"
	if stageType == "kencana_fakultas" {
		scopeType = "faculty"
	}

	if stageType != "pra_kencana" && stageType != "pasca_kencana" && activeMentorForStudent(period.ID, student.ID, scopeType) == nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Anda belum memiliki Dewan Pembimbing (DP) aktif"})
	}

	if ok, reason := quizAccess(quiz, time.Now()); !ok {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": reason})
	}

	var attempts int64
	config.DB.Model(&models.KencanaQuizAttempt{}).Where("quiz_id = ? AND student_id = ?", quiz.ID, student.ID).Count(&attempts)
	if quiz.MaxAttempts > 0 && int(attempts) >= quiz.MaxAttempts {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Batas percobaan quiz sudah habis"})
	}
	attempt := models.KencanaQuizAttempt{QuizID: quiz.ID, StudentID: student.ID, StartedAt: time.Now(), Status: "in_progress", AttemptNumber: int(attempts) + 1}
	if err := config.DB.Create(&attempt).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memulai quiz"})
	}

	logActivity(c, "kencana", fmt.Sprintf("Memulai quiz: %s", quiz.Title))

	return c.JSON(fiber.Map{"success": true, "data": attempt})
}

func SaveQuizAnswer(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	if _, err := ensureDemoPeriod(config.DB, student); err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	attempt, err := attemptForStudent(c.Params("attemptId"), student.ID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	if attempt.Status != "in_progress" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Attempt sudah selesai"})
	}

	type reqBody struct {
		QuestionID       uint   `json:"question_id"`
		SelectedOptionID *uint  `json:"selected_option_id"`
		AnswerText       string `json:"answer_text"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || req.QuestionID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Jawaban tidak valid"})
	}
	answer := models.KencanaQuizAnswer{AttemptID: attempt.ID, QuestionID: req.QuestionID, SelectedOptionID: req.SelectedOptionID, AnswerText: req.AnswerText}
	var existing models.KencanaQuizAnswer
	err = config.DB.Where("attempt_id = ? AND question_id = ?", attempt.ID, req.QuestionID).First(&existing).Error
	if err == nil {
		existing.SelectedOptionID = req.SelectedOptionID
		existing.AnswerText = req.AnswerText
		answer = existing
		err = config.DB.Save(&answer).Error
	} else {
		err = config.DB.Create(&answer).Error
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan jawaban"})
	}
	return c.JSON(fiber.Map{"success": true, "data": answer})
}

func SubmitQuizAttempt(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	if _, err := ensureDemoPeriod(config.DB, student); err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	attempt, err := attemptForStudent(c.Params("attemptId"), student.ID)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	if attempt.Status != "in_progress" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Attempt sudah selesai"})
	}

	type reqBody struct {
		Answers []struct {
			QuestionID       uint   `json:"question_id"`
			SelectedOptionID *uint  `json:"selected_option_id"`
			AnswerText       string `json:"answer_text"`
		} `json:"answers"`
	}
	var req reqBody
	_ = c.BodyParser(&req)
	if len(req.Answers) > 0 {
		for _, item := range req.Answers {
			if item.QuestionID == 0 {
				continue
			}
			ans := models.KencanaQuizAnswer{AttemptID: attempt.ID, QuestionID: item.QuestionID, SelectedOptionID: item.SelectedOptionID, AnswerText: item.AnswerText}
			var existing models.KencanaQuizAnswer
			if err := config.DB.Where("attempt_id = ? AND question_id = ?", attempt.ID, item.QuestionID).First(&existing).Error; err == nil {
				existing.SelectedOptionID = item.SelectedOptionID
				existing.AnswerText = item.AnswerText
				config.DB.Save(&existing)
			} else {
				config.DB.Create(&ans)
			}
		}
	}

	score, correct, total, err := gradeAttempt(config.DB, &attempt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghitung nilai quiz"})
	}
	now := time.Now().UTC()
	attempt.Score = score
	attempt.SubmittedAt = &now
	attempt.Status = "submitted"
	if err := config.DB.Save(&attempt).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal submit quiz"})
	}

	period, _ := ensureDemoPeriod(config.DB, student)
	upsertScoreItem(config.DB, period.ID, student.ID, "cognitive", fmt.Sprintf("Quiz #%d", attempt.QuizID), score, "quiz", &attempt.QuizID, nil)
	ks, blockers, _ := calculateAndStoreScore(config.DB, period.ID, student.ID)

	logActivity(c, "kencana", fmt.Sprintf("Submit quiz (nilai: %.0f, lulus: %v)", score, score >= 75))

	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"attempt_id": attempt.ID, "score": score, "nilai": score, "passed": score >= 75, "lulus": score >= 75,
		"correct_count": correct, "jumlah_benar": correct, "total_questions": total, "total_soal": total,
		"final_score": ks.FinalScore, "nilai_kumulatif_terbaru": ks.FinalScore, "graduation_status": ks.GraduationStatus,
		"eligible_certificate": ks.GraduationStatus == statusPassed, "eligible_sertifikat": ks.GraduationStatus == statusPassed, "blockers": blockers,
	}})
}

func GetAssignment(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	assignmentID, err := c.ParamsInt("assignmentId")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tugas tidak valid"})
	}
	var assignment models.KencanaAssignment
	if err := config.DB.Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.id = mahasiswa.kencana_assignments.session_id").
		Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_assignments.id = ? AND (mahasiswa.kencana_stages.fakultas_id IS NULL OR mahasiswa.kencana_stages.fakultas_id = ?)", assignmentID, student.FakultasID).
		First(&assignment).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Tugas tidak ditemukan"})
	}

	var stageType string
	config.DB.Table("mahasiswa.kencana_stages").
		Select("mahasiswa.kencana_stages.type").
		Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.stage_id = mahasiswa.kencana_stages.id").
		Where("mahasiswa.kencana_sessions.id = ?", assignment.SessionID).
		Scan(&stageType)

	scopeType := "university"
	if stageType == "kencana_fakultas" {
		scopeType = "faculty"
	}

	canSubmit := true
	lockReason := ""
	if stageType != "pra_kencana" && stageType != "pasca_kencana" && activeMentorForStudent(period.ID, student.ID, scopeType) == nil {
		canSubmit = false
		lockReason = "Anda belum memiliki Dewan Pembimbing (DP) aktif"
	}

	var submission models.KencanaAssignmentSubmission
	config.DB.Where("assignment_id = ? AND student_id = ?", assignment.ID, student.ID).First(&submission)
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"assignment":  assignment,
		"submission":  submission,
		"can_submit":  canSubmit,
		"lock_reason": lockReason,
	}})
}

func SubmitAssignment(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	assignmentID, err := c.ParamsInt("assignmentId")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tugas tidak valid"})
	}

	var assignment models.KencanaAssignment
	if err := config.DB.First(&assignment, assignmentID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Tugas tidak ditemukan"})
	}

	var stageType string
	config.DB.Table("mahasiswa.kencana_stages").
		Select("mahasiswa.kencana_stages.type").
		Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.stage_id = mahasiswa.kencana_stages.id").
		Where("mahasiswa.kencana_sessions.id = ?", assignment.SessionID).
		Scan(&stageType)

	scopeType := "university"
	if stageType == "kencana_fakultas" {
		scopeType = "faculty"
	}

	if stageType != "pra_kencana" && stageType != "pasca_kencana" && activeMentorForStudent(period.ID, student.ID, scopeType) == nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Anda belum memiliki Dewan Pembimbing (DP) aktif"})
	}
	type reqBody struct {
		AnswerText string `json:"answer_text"`
		FileURL    string `json:"file_url"`
		LinkURL    string `json:"link_url"`
		Checklist  bool   `json:"checklist"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload tugas tidak valid"})
	}
	now := time.Now().UTC()
	status := "submitted"
	if assignment.DueDate != nil && now.After(*assignment.DueDate) {
		status = "late"
	}
	submission := models.KencanaAssignmentSubmission{AssignmentID: uint(assignmentID), StudentID: student.ID, AnswerText: req.AnswerText, FileURL: req.FileURL, LinkURL: req.LinkURL, SubmittedAt: &now, Status: status}
	var existing models.KencanaAssignmentSubmission
	err = config.DB.Where("assignment_id = ? AND student_id = ?", assignmentID, student.ID).First(&existing).Error
	if err == nil {
		existing.AnswerText = req.AnswerText
		existing.FileURL = req.FileURL
		existing.LinkURL = req.LinkURL
		existing.SubmittedAt = &now
		existing.Status = status
		submission = existing
		err = config.DB.Save(&submission).Error
	} else {
		err = config.DB.Create(&submission).Error
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengumpulkan tugas"})
	}

	logActivity(c, "kencana", fmt.Sprintf("Mengumpulkan tugas #%d", assignmentID))

	return c.JSON(fiber.Map{"success": true, "message": "Tugas berhasil dikumpulkan", "data": submission})
}

func GetHandbook(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}
	var handbook models.KencanaHandbook
	if err := config.DB.Where("period_id = ? AND student_id = ?", period.ID, student.ID).First(&handbook).Error; err == gorm.ErrRecordNotFound {
		handbook = models.KencanaHandbook{PeriodID: period.ID, StudentID: student.ID, Status: "not_started", ContentJSON: []byte(`{}`)}
	}
	return c.JSON(fiber.Map{"success": true, "data": handbook})
}

func SaveHandbookDraft(c *fiber.Ctx) error { return saveHandbook(c, "draft") }
func SubmitHandbook(c *fiber.Ctx) error    { return saveHandbook(c, "submitted") }

func GetAttendance(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}
	info := attendanceSummary(config.DB, period.ID, student.ID)

	var sessions []models.KencanaSession
	config.DB.Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_stages.period_id = ? AND mahasiswa.kencana_sessions.is_required = ? AND mahasiswa.kencana_sessions.status = ?", period.ID, true, "active").
		Order("mahasiswa.kencana_sessions.start_date asc").
		Find(&sessions)

	var attendances []models.KencanaAttendance
	config.DB.Where("student_id = ?", student.ID).Find(&attendances)
	attMap := make(map[uint]models.KencanaAttendance)
	for _, att := range attendances {
		attMap[att.SessionID] = att
	}

	type detailItem struct {
		SessionID uint       `json:"session_id"`
		Title     string     `json:"title"`
		StartDate *time.Time `json:"start_date"`
		Status    string     `json:"status"`
		CheckedAt *time.Time `json:"checked_at"`
	}
	details := []detailItem{}
	for _, s := range sessions {
		status := "absent"
		var checkedAt *time.Time
		if att, ok := attMap[s.ID]; ok {
			status = att.Status
			checkedAt = att.CheckedAt
		}
		details = append(details, detailItem{
			SessionID: s.ID,
			Title:     s.Title,
			StartDate: s.StartDate,
			Status:    status,
			CheckedAt: checkedAt,
		})
	}

	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"summary": info,
		"details": details,
	}})
}

func GetScore(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}
	score, blockers, err := calculateScoreReadOnly(config.DB, period.ID, student.ID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghitung nilai"})
	}
	var items []models.KencanaScoreItem
	config.DB.Where("period_id = ? AND student_id = ?", period.ID, student.ID).Order("component asc, created_at desc").Find(&items)
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"score": score, "items": items, "blockers": blockers}})
}

func GetRemedial(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}
	var remedials []models.KencanaRemedial
	config.DB.Where("period_id = ? AND student_id = ?", period.ID, student.ID).Order("created_at desc").Find(&remedials)
	_, blockers, _ := calculateScoreReadOnly(config.DB, period.ID, student.ID)
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"remedials": remedials, "reasons": blockers}})
}

func GetCertificate(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}
	score, blockers, _ := calculateScoreReadOnly(config.DB, period.ID, student.ID)
	var cert models.KencanaCertificate
	config.DB.Where("period_id = ? AND student_id = ?", period.ID, student.ID).First(&cert)
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"certificate": cert, "eligible": score.GraduationStatus == statusPassed, "status": cert.Status, "locked_reasons": blockers}})
}

func progressSummary(periodID uint, student *models.Mahasiswa) float64 {
	var totalRequired int64
	config.DB.Model(&models.KencanaMaterial{}).
		Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.id = mahasiswa.kencana_materials.session_id").
		Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_stages.period_id = ? AND mahasiswa.kencana_materials.is_required = ? AND (mahasiswa.kencana_stages.fakultas_id IS NULL OR mahasiswa.kencana_stages.fakultas_id = ?)", periodID, true, student.FakultasID).
		Count(&totalRequired)
	if totalRequired == 0 {
		return 0
	}
	var completed int64
	config.DB.Model(&models.KencanaMaterialProgress{}).
		Joins("JOIN mahasiswa.kencana_materials ON mahasiswa.kencana_materials.id = mahasiswa.kencana_material_progress.material_id").
		Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.id = mahasiswa.kencana_materials.session_id").
		Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_stages.period_id = ? AND mahasiswa.kencana_material_progress.student_id = ? AND mahasiswa.kencana_material_progress.status = ? AND (mahasiswa.kencana_stages.fakultas_id IS NULL OR mahasiswa.kencana_stages.fakultas_id = ?)", periodID, student.ID, "completed", student.FakultasID).
		Count(&completed)
	if completed > totalRequired {
		completed = totalRequired
	}
	return roundScore(float64(completed) / float64(totalRequired) * 100)
}

func findLastActivity(periodID uint, student *models.Mahasiswa) fiber.Map {
	var session models.KencanaSession
	if err := config.DB.Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_stages.period_id = ? AND mahasiswa.kencana_sessions.status = ? AND (mahasiswa.kencana_stages.fakultas_id IS NULL OR mahasiswa.kencana_stages.fakultas_id = ?)", periodID, "active", student.FakultasID).
		Order("mahasiswa.kencana_stages.order_number asc, mahasiswa.kencana_sessions.order_number asc").First(&session).Error; err == nil {
		return fiber.Map{"type": "session", "id": session.ID, "title": session.Title}
	}
	return fiber.Map{}
}

func importantNotifications(periodID, studentID uint, blockers []string) []fiber.Map {
	notifs := []fiber.Map{}
	for _, b := range blockers {
		notifs = append(notifs, fiber.Map{"title": "Syarat Kencana", "message": b})
	}
	var remedialCount int64
	config.DB.Model(&models.KencanaRemedial{}).Where("period_id = ? AND student_id = ? AND status IN ?", periodID, studentID, []string{"open", "in_progress"}).Count(&remedialCount)
	if remedialCount > 0 {
		notifs = append(notifs, fiber.Map{"title": "Remedial dibuka", "message": "Ada komponen Kencana yang perlu kamu perbaiki."})
	}
	return notifs
}

func stagePayload(stage models.KencanaStage, studentID uint, fakultasID uint) fiber.Map {
	sessionsCount := len(stage.Sessions)
	var sessionIDs []uint
	for _, s := range stage.Sessions {
		sessionIDs = append(sessionIDs, s.ID)
	}
	var quizCount, assignmentCount int64
	if len(sessionIDs) > 0 {
		config.DB.Model(&models.KencanaQuiz{}).Where("session_id IN ? AND (fakultas_id = ? OR fakultas_id IS NULL)", sessionIDs, fakultasID).Count(&quizCount)
		config.DB.Model(&models.KencanaAssignment{}).Where("session_id IN ? AND (fakultas_id = ? OR fakultas_id IS NULL)", sessionIDs, fakultasID).Count(&assignmentCount)
	}
	return fiber.Map{"id": stage.ID, "name": stage.Name, "type": stage.Type, "description": stage.Description, "start_date": stage.StartDate, "end_date": stage.EndDate, "status": stage.Status, "progress": 0, "session_count": sessionsCount, "quiz_count": quizCount, "assignment_count": assignmentCount, "order_number": stage.OrderNumber}
}

func sessionSummaryPayload(session models.KencanaSession, studentID uint, fakultasID uint) fiber.Map {
	var materialCount, quizCount, assignmentCount int64
	config.DB.Model(&models.KencanaMaterial{}).Where("session_id = ? AND (fakultas_id = ? OR fakultas_id IS NULL)", session.ID, fakultasID).Count(&materialCount)
	config.DB.Model(&models.KencanaQuiz{}).Where("session_id = ? AND (fakultas_id = ? OR fakultas_id IS NULL)", session.ID, fakultasID).Count(&quizCount)
	config.DB.Model(&models.KencanaAssignment{}).Where("session_id = ? AND (fakultas_id = ? OR fakultas_id IS NULL)", session.ID, fakultasID).Count(&assignmentCount)
	return fiber.Map{"id": session.ID, "title": session.Title, "description": session.Description, "start_date": session.StartDate, "end_date": session.EndDate, "deadline": session.EndDate, "status": session.Status, "progress": 0, "material_count": materialCount, "quiz_count": quizCount, "assignment_count": assignmentCount, "order_number": session.OrderNumber}
}

func sessionDetailPayload(session models.KencanaSession, studentID uint) fiber.Map {
	materials := []fiber.Map{}
	if len(session.Materials) > 0 {
		var materialIDs []uint
		materialMap := make(map[uint]models.KencanaMaterial, len(session.Materials))
		for _, m := range session.Materials {
			materialIDs = append(materialIDs, m.ID)
			materialMap[m.ID] = m
		}
		var progresses []models.KencanaMaterialProgress
		config.DB.Where("material_id IN ? AND student_id = ?", materialIDs, studentID).Find(&progresses)
		progByMaterial := make(map[uint]string, len(progresses))
		for _, p := range progresses {
			progByMaterial[p.MaterialID] = p.Status
		}
		for _, id := range materialIDs {
			m := materialMap[id]
			status := progByMaterial[id]
			if status == "" {
				status = "not_started"
			}
			materials = append(materials, fiber.Map{"id": m.ID, "title": m.Title, "type": m.Type, "content": m.Content, "file_url": m.FileURL, "order_number": m.OrderNumber, "status": status})
		}
	}
	quizzes := []fiber.Map{}
	if len(session.Quizzes) > 0 {
		var quizIDs []uint
		quizMap := make(map[uint]models.KencanaQuiz, len(session.Quizzes))
		for _, q := range session.Quizzes {
			quizIDs = append(quizIDs, q.ID)
			quizMap[q.ID] = q
		}
		type attemptCount struct {
			QuizID uint
			Count  int64
		}
		var counts []attemptCount
		config.DB.Model(&models.KencanaQuizAttempt{}).
			Select("quiz_id, COUNT(*) as count").
			Where("quiz_id IN ? AND student_id = ?", quizIDs, studentID).
			Group("quiz_id").Scan(&counts)
		countByQuiz := make(map[uint]int64, len(counts))
		for _, c := range counts {
			countByQuiz[c.QuizID] = c.Count
		}
		for _, id := range quizIDs {
			q := quizMap[id]
			quizzes = append(quizzes, fiber.Map{"id": q.ID, "title": q.Title, "description": q.Description, "duration_minutes": q.DurationMinutes, "open_at": q.OpenAt, "close_at": q.CloseAt, "attempts_used": countByQuiz[id], "max_attempts": q.MaxAttempts, "status": q.Status})
		}
	}
	assignments := []fiber.Map{}
	if len(session.Assignments) > 0 {
		var assignmentIDs []uint
		assignmentMap := make(map[uint]models.KencanaAssignment, len(session.Assignments))
		for _, a := range session.Assignments {
			assignmentIDs = append(assignmentIDs, a.ID)
			assignmentMap[a.ID] = a
		}
		var submissions []models.KencanaAssignmentSubmission
		config.DB.Where("assignment_id IN ? AND student_id = ?", assignmentIDs, studentID).Find(&submissions)
		subByAssignment := make(map[uint]models.KencanaAssignmentSubmission, len(submissions))
		for _, sub := range submissions {
			subByAssignment[sub.AssignmentID] = sub
		}
		for _, id := range assignmentIDs {
			a := assignmentMap[id]
			sub := subByAssignment[id]
			assignments = append(assignments, fiber.Map{"id": a.ID, "title": a.Title, "description": a.Description, "open_at": a.OpenAt, "due_date": a.DueDate, "submission_type": a.SubmissionType, "status": a.Status, "submission_status": sub.Status, "score": sub.Score, "feedback": sub.Feedback})
		}
	}
	return fiber.Map{"id": session.ID, "title": session.Title, "description": session.Description, "start_date": session.StartDate, "end_date": session.EndDate, "status": session.Status, "materials": materials, "quizzes": quizzes, "assignments": assignments}
}

func quizForStudent(rawID string, student *models.Mahasiswa) (*models.KencanaQuiz, error) {
	var quiz models.KencanaQuiz
	err := config.DB.Preload("Questions", func(db *gorm.DB) *gorm.DB { return db.Order("order_number asc") }).
		Preload("Questions.Options", func(db *gorm.DB) *gorm.DB { return db.Order("order_number asc") }).
		Joins("JOIN mahasiswa.kencana_sessions ON mahasiswa.kencana_sessions.id = mahasiswa.kencana_quizzes.session_id").
		Joins("JOIN mahasiswa.kencana_stages ON mahasiswa.kencana_stages.id = mahasiswa.kencana_sessions.stage_id").
		Where("mahasiswa.kencana_quizzes.id = ? AND (mahasiswa.kencana_stages.fakultas_id IS NULL OR mahasiswa.kencana_stages.fakultas_id = ?)", rawID, student.FakultasID).
		First(&quiz).Error
	if err != nil {
		return nil, fmt.Errorf("Quiz tidak ditemukan atau tidak tersedia")
	}
	return &quiz, nil
}

func quizAccess(quiz *models.KencanaQuiz, now time.Time) (bool, string) {
	if quiz.Status != "published" && quiz.Status != "active" {
		return false, "Quiz belum dipublish"
	}
	if quiz.OpenAt != nil && now.Before(*quiz.OpenAt) {
		return false, "Quiz belum dibuka"
	}
	if quiz.CloseAt != nil && now.After(*quiz.CloseAt) {
		return false, "Quiz sudah ditutup"
	}
	return true, ""
}

func attemptForStudent(rawID string, studentID uint) (models.KencanaQuizAttempt, error) {
	var attempt models.KencanaQuizAttempt
	if err := config.DB.First(&attempt, "id = ? AND student_id = ?", rawID, studentID).Error; err != nil {
		return attempt, fmt.Errorf("Attempt tidak ditemukan")
	}
	return attempt, nil
}

func gradeAttempt(db *gorm.DB, attempt *models.KencanaQuizAttempt) (float64, int, int, error) {
	var quiz models.KencanaQuiz
	if err := db.Preload("Questions.Options").First(&quiz, attempt.QuizID).Error; err != nil {
		return 0, 0, 0, err
	}
	var answers []models.KencanaQuizAnswer
	db.Where("attempt_id = ?", attempt.ID).Find(&answers)
	answerMap := map[uint]models.KencanaQuizAnswer{}
	for _, a := range answers {
		answerMap[a.QuestionID] = a
	}
	totalScore, earned := 0.0, 0.0
	correct := 0
	for _, q := range quiz.Questions {
		totalScore += q.Score
		ans := answerMap[q.ID]
		isCorrect := false
		if ans.SelectedOptionID != nil {
			for _, opt := range q.Options {
				if opt.ID == *ans.SelectedOptionID && opt.IsCorrect {
					isCorrect = true
					break
				}
			}
		}
		if isCorrect {
			correct++
			earned += q.Score
		}
		ans.IsCorrect = isCorrect
		if isCorrect {
			ans.Score = q.Score
		} else {
			ans.Score = 0
		}
		if ans.ID != 0 {
			db.Save(&ans)
		}
	}
	if totalScore == 0 {
		return 0, correct, len(quiz.Questions), nil
	}
	return roundScore(earned / totalScore * 100), correct, len(quiz.Questions), nil
}

func upsertScoreItem(db *gorm.DB, periodID, studentID uint, component, itemName string, score float64, sourceType string, sourceID *uint, assessedBy *uint) {
	now := time.Now().UTC()
	item := models.KencanaScoreItem{PeriodID: periodID, StudentID: studentID, Component: component, ItemName: itemName, Score: score, SourceType: sourceType, SourceID: sourceID, AssessedBy: assessedBy, AssessedAt: &now}
	var existing models.KencanaScoreItem
	err := db.Where("period_id = ? AND student_id = ? AND component = ? AND source_type = ? AND source_id = ?", periodID, studentID, component, sourceType, sourceID).First(&existing).Error
	if err == nil {
		existing.Score = score
		existing.ItemName = itemName
		existing.AssessedAt = &now
		db.Save(&existing)
		return
	}
	db.Create(&item)
}

func saveHandbook(c *fiber.Ctx, status string) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}
	if status == "submitted" && activeMentorForStudent(period.ID, student.ID, "university") == nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Anda belum memiliki Dewan Pembimbing (DP) tingkat Universitas aktif"})
	}
	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload handbook tidak valid"})
	}
	bytes, _ := json.Marshal(body)
	now := time.Now().UTC()
	handbook := models.KencanaHandbook{PeriodID: period.ID, StudentID: student.ID, ContentJSON: bytes, Status: status}
	if status == "submitted" {
		handbook.SubmittedAt = &now
	}
	var existing models.KencanaHandbook
	err = config.DB.Where("period_id = ? AND student_id = ?", period.ID, student.ID).First(&existing).Error
	if err == nil {
		existing.ContentJSON = bytes
		existing.Status = status
		if status == "submitted" {
			existing.SubmittedAt = &now
		}
		handbook = existing
		err = config.DB.Save(&handbook).Error
	} else {
		err = config.DB.Create(&handbook).Error
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan handbook"})
	}

	logActivity(c, "kencana", fmt.Sprintf("Menyimpan handbook (%s)", status))

	return c.JSON(fiber.Map{"success": true, "data": handbook})
}

// GetBanding returns student's banding/appeal list
func GetBanding(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}

	var list []models.KencanaBanding
	if err := config.DB.Where("period_id = ? AND student_id = ?", period.ID, student.ID).Order("created_at desc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data banding"})
	}

	return c.JSON(fiber.Map{"success": true, "data": list})
}

// SubmitBanding handles graduation appeal submission
func SubmitBanding(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}
	period, err := ensureDemoPeriod(config.DB, student)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}

	type BandingReq struct {
		Reason string `json:"reason"`
		Type   string `json:"type"`
	}
	var req BandingReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload banding tidak valid"})
	}
	if req.Reason == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Alasan banding wajib diisi"})
	}
	if req.Type != "universitas" && req.Type != "fakultas" {
		req.Type = "universitas" // fallback
	}

	banding := models.KencanaBanding{
		PeriodID:  period.ID,
		StudentID: student.ID,
		Reason:    req.Reason,
		Type:      req.Type,
		Status:    "pending",
	}

	if err := config.DB.Create(&banding).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengajukan banding"})
	}

	notifikasi.Kirim(config.DB, notifikasi.KirimParams{
		UserID:  student.PenggunaID,
		Type:    "info",
		Title:   "Banding Kencana",
		Content: "Pengajuan banding kelulusan Kencana kamu telah diterima dan sedang diproses.",
	})

	logActivity(c, "kencana", "Mengajukan banding Kencana")
	return c.JSON(fiber.Map{"success": true, "message": "Banding berhasil diajukan"})
}

func StudentSubmitAttendance(c *fiber.Ctx) error {
	student, err := currentStudent(c)
	if err != nil {
		return err
	}

	var req struct {
		QRCode string `json:"qr_code"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Data tidak valid"})
	}

	if req.QRCode == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kode QR wajib diisi"})
	}

	// Decode JWT token from QR
	sessionID, mentorID, err := ValidateQRToken(req.QRCode)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kode QR tidak valid atau sudah kedaluwarsa"})
	}

	var session models.KencanaSession
	if err := config.DB.Preload("Stage").First(&session, sessionID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sesi tidak ditemukan"})
	}

	scopeType := "university"
	if session.Stage.Type == "kencana_fakultas" {
		scopeType = "faculty"
	}

	// Isolasi Data: Pastikan mahasiswa terdaftar di bimbingan (Kelompok atau 1-on-1) mentor ini pada scope yang sesuai
	var isAuthorized bool

	var mentorGroup models.KencanaGroup
	if err := config.DB.Where("mentor_id = ? AND scope_type = ? AND status = ?", mentorID, scopeType, "active").First(&mentorGroup).Error; err == nil {
		var membership models.KencanaGroupMember
		if err := config.DB.Where("group_id = ? AND student_id = ? AND status = ?", mentorGroup.ID, student.ID, "active").First(&membership).Error; err == nil {
			isAuthorized = true
		}
	}

	if !isAuthorized {
		var assignment models.KencanaMentorAssignment
		if err := config.DB.Joins("JOIN mahasiswa.kencana_mentors ON mahasiswa.kencana_mentors.id = mahasiswa.kencana_mentor_assignments.mentor_id").
			First(&assignment, "mahasiswa.kencana_mentor_assignments.mentor_id = ? AND mahasiswa.kencana_mentor_assignments.student_id = ? AND mahasiswa.kencana_mentor_assignments.status = ? AND mahasiswa.kencana_mentors.scope_type = ?", mentorID, student.ID, "active", scopeType).Error; err == nil {
			isAuthorized = true
		}
	}

	if !isAuthorized {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": "Anda tidak terdaftar sebagai bimbingan aktif dari pembimbing ini pada lingkup ini"})
	}

	// Cek apakah presensi sudah ada
	var existing models.KencanaAttendance
	if err := config.DB.Where("session_id = ? AND student_id = ?", sessionID, student.ID).First(&existing).Error; err == nil {
		if existing.Status == "present" {
			return c.JSON(fiber.Map{"success": true, "message": "Anda sudah melakukan presensi sebelumnya."})
		}
		now := time.Now().UTC()
		existing.Status = "present"
		existing.CheckedAt = &now
		existing.CheckedBy = &mentorID
		config.DB.Save(&existing)
	} else {
		now := time.Now().UTC()
		newAtt := models.KencanaAttendance{
			SessionID: sessionID,
			StudentID: student.ID,
			Status:    "present",
			CheckedAt: &now,
			CheckedBy: &mentorID,
		}
		config.DB.Create(&newAtt)
	}

	logActivity(c, "kencana", "Melakukan presensi sesi Kencana")
	return c.JSON(fiber.Map{"success": true, "message": "Presensi berhasil dicatat."})
}
