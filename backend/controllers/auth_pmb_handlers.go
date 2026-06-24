package controllers

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"

	"siakad-backend/config"
	"siakad-backend/models"
)

type PMBVerifyRequest struct {
	NomorDaftar string `json:"nomor_daftar"`
	NamaLengkap string `json:"nama_lengkap"`
}

type PMBSetPasswordRequest struct {
	NomorDaftar string `json:"nomor_daftar"`
	Email       string `json:"email"`
	Password    string `json:"password"`
}

func VerifyPMB(c *fiber.Ctx) error {
	var body PMBVerifyRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Payload tidak valid",
		})
	}

	nomorDaftar := strings.TrimSpace(body.NomorDaftar)
	namaLengkap := strings.TrimSpace(body.NamaLengkap)

	if nomorDaftar == "" || namaLengkap == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Nomor Daftar dan Nama Lengkap wajib diisi",
		})
	}

	var pmb models.PendaftaranMahasiswaBaru
	if err := config.DB.Where("nomor_daftar = ?", nomorDaftar).First(&pmb).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "Data pendaftaran tidak ditemukan",
		})
	}

	// Simple case-insensitive prefix match for name (handling typos)
	if !strings.HasPrefix(strings.ToLower(pmb.NamaLengkap), strings.ToLower(namaLengkap)) &&
		!strings.HasPrefix(strings.ToLower(namaLengkap), strings.ToLower(pmb.NamaLengkap)) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Nama lengkap tidak sesuai dengan nomor daftar",
		})
	}

	// Wait, check if email is present
	if pmb.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Email tidak terdaftar pada data PMB Anda. Hubungi bagian PMB/Akademik.",
		})
	}

	// Cek apakah sudah pernah set password di tabel users (by email or nim)
	var existingUser models.User
	query := config.DB.Where("LOWER(email) = ?", strings.ToLower(pmb.Email))
	if pmb.NIM != "" {
		var mhs models.Mahasiswa
		if err := config.DB.Where("nim = ?", pmb.NIM).First(&mhs).Error; err == nil && mhs.PenggunaID != 0 {
			query = query.Or("id = ?", mhs.PenggunaID)
		}
	}

	if err := query.First(&existingUser).Error; err == nil {
		if existingUser.Password != "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "Akun Anda sudah aktif. Silakan langsung login.",
			})
		}
	}

	// Mask email for privacy (e.g. bu*****@gmail.com)
	parts := strings.Split(pmb.Email, "@")
	maskedEmail := pmb.Email
	if len(parts) == 2 && len(parts[0]) > 2 {
		domain := parts[1]
		name := parts[0]
		maskedEmail = name[:2] + strings.Repeat("*", len(name)-2) + "@" + domain
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"email":        pmb.Email,
			"masked_email": maskedEmail,
			"nama_lengkap": pmb.NamaLengkap,
		},
	})
}

func SetPasswordPMB(c *fiber.Ctx) error {
	var body PMBSetPasswordRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Payload tidak valid",
		})
	}

	nomorDaftar := strings.TrimSpace(body.NomorDaftar)
	email := strings.TrimSpace(body.Email)
	password := strings.TrimSpace(body.Password)

	if nomorDaftar == "" || email == "" || password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Nomor Daftar, Email, dan Password wajib diisi",
		})
	}

	var pmb models.PendaftaranMahasiswaBaru
	if err := config.DB.Where("nomor_daftar = ?", nomorDaftar).First(&pmb).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "Data pendaftaran tidak ditemukan",
		})
	}

	if strings.ToLower(pmb.Email) != strings.ToLower(email) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Email tidak cocok",
		})
	}

	// Cek user existing sekali lagi
	var existingUser models.User
	userExists := false
	if err := config.DB.Where("LOWER(email) = ?", strings.ToLower(email)).First(&existingUser).Error; err == nil {
		if existingUser.Password != "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"status":  "error",
				"message": "Akun dengan email ini sudah ada dan aktif. Silakan langsung login.",
			})
		}
		userExists = true
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal mengamankan password",
		})
	}

	tx := config.DB.Begin()

	// 1. Buat User baru atau Update User Lama
	var newUser models.User
	if userExists {
		existingUser.Password = string(hashedPassword)
		existingUser.Role = "mahasiswa" // pastikan rolenya mahasiswa
		existingUser.NamaLengkap = pmb.NamaLengkap
		existingUser.NoHP = pmb.NoHP
		
		if err := tx.Save(&existingUser).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Gagal mengaktifkan akun: " + err.Error(),
			})
		}
		newUser = existingUser // reference for linking
	} else {
		newUser = models.User{
			Email:       strings.ToLower(email),
			Password:    string(hashedPassword),
			Role:        "mahasiswa",
			NamaLengkap: pmb.NamaLengkap,
			NoHP:        pmb.NoHP,
		}

		if err := tx.Create(&newUser).Error; err != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Gagal membuat akun: " + err.Error(),
			})
		}
	}

	// 2. Cek apakah di tabel Mahasiswa sudah ada data
	// Jika belum ada dan NIM sudah ada di PMB, kita bisa buatkan skeleton di tabel Mahasiswa
	var mhs models.Mahasiswa
	if pmb.NIM != "" {
		if err := tx.Where("nim = ?", pmb.NIM).First(&mhs).Error; err != nil {
			// Create dummy mahasiswa
			mhs = models.Mahasiswa{
				PenggunaID:       newUser.ID,
				NIM:              pmb.NIM,
				Nama:             pmb.NamaLengkap,
				NIK:              pmb.NIK,
				EmailPersonal:    pmb.Email,
				NoHP:             pmb.NoHP,
				JenisKelamin:     pmb.JenisKelamin,
				TempatLahir:      pmb.TempatLahir,
				Agama:            pmb.Agama,
				Alamat:           pmb.Alamat,
				Kota:             pmb.Kota,
				Provinsi:         pmb.Provinsi,
				KodePos:          pmb.KodePos,
				StatusAkun:       "Aktif",
				StatusAkademik:   "Aktif",
				SemesterSekarang: 1,
				JalurMasuk:       pmb.Jalur,
			}
			if err := tx.Create(&mhs).Error; err != nil {
				// Ignore if fails (maybe handled by full sync later)
				fmt.Println("Warning: failed to create Mahasiswa skeleton:", err)
			}
		} else {
			// Update if already exists but no user linked
			if mhs.PenggunaID == 0 {
				mhs.PenggunaID = newUser.ID
				tx.Save(&mhs)
			}
		}
	}

	tx.Commit()

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Akun berhasil diaktifkan. Silakan login menggunakan Email dan Password yang baru dibuat.",
	})
}
