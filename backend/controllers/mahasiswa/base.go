package mahasiswa

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
)

func logActivity(c *fiber.Ctx, aktivitas, deskripsi string) {
	userID, err := getUserID(c)
	if err != nil {
		return
	}

	ip := c.IP()

	config.DB.Create(&models.LogAktivitas{
		UserID:    userID,
		Aktivitas: aktivitas,
		Deskripsi: deskripsi,
		IPAddress: ip,
	})
}

func getUserID(c *fiber.Ctx) (uint, error) {
	role, _ := c.Locals("role").(string)
	if role == "super_admin" || role == "faculty_admin" {
		studentIDStr := c.Get("X-Student-ID")
		if studentIDStr == "" {
			studentIDStr = c.Query("student_id")
		}
		if studentIDStr == "" {
			studentIDStr = c.Query("studentId")
		}
		if studentIDStr != "" && studentIDStr != "undefined" && studentIDStr != "null" {
			var student models.Mahasiswa
			if err := config.DB.First(&student, studentIDStr).Error; err == nil {
				return student.PenggunaID, nil
			}
			return 0, fiber.NewError(fiber.StatusNotFound, "Data mahasiswa tidak ditemukan berdasarkan ID yang diberikan")
		}
		return 0, fiber.NewError(fiber.StatusBadRequest, "X-Student-ID diperlukan untuk admin")
	}

	v, ok := c.Locals("user_id").(uint)
	if !ok || v == 0 {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "User tidak terautentikasi")
	}
	return v, nil
}

func getStudent(c *fiber.Ctx) (*models.Mahasiswa, error) {
	role, _ := c.Locals("role").(string)
	if role == "super_admin" || role == "faculty_admin" {
		studentIDStr := c.Get("X-Student-ID")
		if studentIDStr == "" {
			studentIDStr = c.Query("student_id")
		}
		if studentIDStr == "" {
			studentIDStr = c.Query("studentId")
		}
		if studentIDStr != "" && studentIDStr != "undefined" && studentIDStr != "null" {
			var student models.Mahasiswa
			if err := config.DB.First(&student, studentIDStr).Error; err == nil {
				return &student, nil
			}
			return nil, fiber.NewError(fiber.StatusNotFound, "Data mahasiswa tidak ditemukan berdasarkan ID yang diberikan")
		}
		return nil, fiber.NewError(fiber.StatusBadRequest, "X-Student-ID diperlukan untuk admin")
	}

	PenggunaID, err := getUserID(c)
	if err != nil {
		return nil, err
	}

	var student models.Mahasiswa
	if err := config.DB.First(&student, "pengguna_id = ?", PenggunaID).Error; err != nil {
		// Defensive: Create dummy profile for users missing one (e.g., custom testing roles)
		var user models.User
		if errUser := config.DB.First(&user, PenggunaID).Error; errUser == nil {
			var dummyFakultas models.Fakultas
			config.DB.First(&dummyFakultas)
			var dummyProdi models.ProgramStudi
			config.DB.First(&dummyProdi)
			
			student = models.Mahasiswa{
				PenggunaID:       user.ID,
				Nama:             user.NamaLengkap,
				NIM:              fmt.Sprintf("TEST_MHS_%d", user.ID),
				FakultasID:       dummyFakultas.ID,
				ProgramStudiID:   dummyProdi.ID,
				TahunMasuk:       2024,
				SemesterSekarang: 1,
			}
			if errCreate := config.DB.Create(&student).Error; errCreate == nil {
				return &student, nil
			}
		}
		return nil, err
	}

	return &student, nil
}
