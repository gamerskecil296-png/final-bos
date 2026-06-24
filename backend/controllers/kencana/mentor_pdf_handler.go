package kencana

import (
	"fmt"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"siakad-backend/config"
	"siakad-backend/models"
)

// DownloadGroupPDF generates a PDF report for a mentor's group
func DownloadGroupPDF(c *fiber.Ctx) error {
	mentor, err := currentMentor(c)
	if err != nil {
		return err
	}

	groupID := c.Params("id")
	var group models.KencanaGroup
	if err := config.DB.Preload("Mentor").First(&group, groupID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kelompok tidak ditemukan"})
	}

	if group.MentorID == nil || *group.MentorID != mentor.ID {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": "Anda tidak memiliki akses ke kelompok ini"})
	}

	// Fetch all students in the group
	var members []models.KencanaGroupMember
	if err := config.DB.Preload("Student.ProgramStudi").Where("group_id = ? AND status = 'active'", group.ID).Find(&members).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat anggota kelompok"})
	}

	// Fetch scores for the group
	studentIDs := []uint{}
	for _, m := range members {
		studentIDs = append(studentIDs, m.StudentID)
	}

	scoreMap := map[uint]models.KencanaScore{}
	itemsMap := map[uint][]models.KencanaScoreItem{}

	if len(studentIDs) > 0 {
		var scores []models.KencanaScore
		config.DB.Where("period_id = ? AND student_id IN ?", group.PeriodID, studentIDs).Find(&scores)
		for _, sc := range scores {
			scoreMap[sc.StudentID] = sc
		}

		var items []models.KencanaScoreItem
		config.DB.Where("period_id = ? AND student_id IN ?", group.PeriodID, studentIDs).Find(&items)
		for _, it := range items {
			itemsMap[it.StudentID] = append(itemsMap[it.StudentID], it)
		}
	}

	var rows []PDFRowData
	for _, m := range members {
		var hadirCount int64
		config.DB.Model(&models.KencanaAttendance{}).Where("student_id = ? AND period_id = ? AND status = 'present'", m.StudentID, group.PeriodID).Count(&hadirCount)

		rows = append(rows, PDFRowData{
			Student:         m.Student,
			Score:           scoreMap[m.StudentID],
			Items:           itemsMap[m.StudentID],
			AttendanceCount: hadirCount,
		})
	}

	fasilitatorName := mentor.Name
	if fasilitatorName == "" {
		fasilitatorName = mentor.Email
	}

	savePath, err := GenerateKencanaPDFHelper(group.Name, fasilitatorName, "Admin Kencana", rows)
	if err != nil {
		fmt.Printf("PDF Error: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	return c.Download(savePath, filepath.Base(savePath))
}
