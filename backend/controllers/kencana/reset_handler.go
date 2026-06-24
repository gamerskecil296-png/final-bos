package kencana

import (
	"fmt"
	"siakad-backend/config"

	"github.com/gofiber/fiber/v2"
)

// ResetKencanaData — DEV ONLY: Truncates all Kencana transactional data.
// Keeps: users, mahasiswa, fakultas, program_studi (master data).
// Deletes: periods, stages, sessions, quizzes, scores, groups, mentors, etc.
func ResetKencanaData(c *fiber.Ctx) error {
	// Order matters: delete child tables first to avoid FK violations.
	tables := []string{
		"mahasiswa.kencana_quiz_answers",
		"mahasiswa.kencana_quiz_attempts",
		"mahasiswa.kencana_question_options",
		"mahasiswa.kencana_questions",
		"mahasiswa.kencana_quizzes",
		"mahasiswa.kencana_assignment_submissions",
		"mahasiswa.kencana_assignments",
		"mahasiswa.kencana_material_progress",
		"mahasiswa.kencana_materials",
		"mahasiswa.kencana_attendances",
		"mahasiswa.kencana_handbooks",
		"mahasiswa.kencana_score_items",
		"mahasiswa.kencana_scores",
		"mahasiswa.kencana_certificates",
		"mahasiswa.kencana_certificate_settings",
		"mahasiswa.kencana_remedials",
		"mahasiswa.kencana_bandings",
		"mahasiswa.kencana_pengumuman",
		"mahasiswa.kencana_mentor_assignments",
		"mahasiswa.kencana_group_members",
		"mahasiswa.kencana_groups",
		"mahasiswa.kencana_mentors",
		"mahasiswa.kencana_sessions",
		"mahasiswa.kencana_stages",
		"mahasiswa.kencana_faculty_phases",
		"mahasiswa.kencana_timeline_phases",
		"mahasiswa.kencana_periods",
	}

	var errors []string
	for _, table := range tables {
		sql := fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table)
		if err := config.DB.Exec(sql).Error; err != nil {
			errors = append(errors, fmt.Sprintf("%s: %s", table, err.Error()))
		}
	}

	if len(errors) > 0 {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Beberapa tabel gagal direset",
			"errors":  errors,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Seluruh data Kencana berhasil direset. Anda bisa memulai ulang dari Pra-Kencana.",
	})
}
