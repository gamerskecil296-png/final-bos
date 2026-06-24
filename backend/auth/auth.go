package auth

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type loginRequest struct {
	Identifier string `json:"identifier"`
	Email      string `json:"email"`
	NIM        string `json:"nim"`
	Password   string `json:"password"`
}

type userResponse struct {
	ID             uint     `json:"id"`
	Email          string   `json:"email"`
	Role           string   `json:"role"`
	RoleDisplay    string   `json:"role_display,omitempty"`
	OrmawaName     string   `json:"ormawa_name,omitempty"`
	NIM            string   `json:"nim,omitempty"`
	Nama           string   `json:"nama,omitempty"`
	FakultasID     *uint    `json:"fakultas_id,omitempty"`
	ProgramStudiID *uint    `json:"program_studi_id,omitempty"`
	OrmawaID       *uint    `json:"ormawa_id,omitempty"`
	Permissions    []string `json:"permissions,omitempty"`
}

type roleMeta struct {
	Label       string `json:"label"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Color       string `json:"color"`
}

func getRoleMeta(role string) roleMeta {
	switch role {
	case "super_admin":
		return roleMeta{"Super Admin", "Kelola seluruh sistem akademik", "shield", "#6366F1"}
	case "faculty_admin":
		return roleMeta{"Admin Fakultas", "Kelola data akademik dan mahasiswa", "building-2", "#0EA5E9"}
	case "psikolog":
		return roleMeta{"Psikolog", "Konseling dan asesmen psikologi mahasiswa", "brain", "#8B5CF6"}
	case "tenaga_kesehatan":
		return roleMeta{"Tenaga Kesehatan", "Layanan kesehatan dan pemeriksaan mahasiswa", "heart-pulse", "#10B981"}
	case "ormawa", "ormawa_admin":
		return roleMeta{"Ormawa", "Kelola organisasi mahasiswa", "users", "#F59E0B"}
	case "dosen":
		return roleMeta{"Dosen", "Portal dosen pengajar", "graduation-cap", "#EC4899"}
	case "mahasiswa", "student":
		return roleMeta{"Mahasiswa", "Portal layanan mahasiswa", "book-open", "#3B82F6"}
	case "kencana_admin":
		return roleMeta{"Admin Kencana", "Kelola program PKKMB Kencana", "sparkles", "#F97316"}
	case "kencana_mentor":
		return roleMeta{"Mentor Kencana", "Bimbingan peserta PKKMB", "hand-helping", "#14B8A6"}
	default:
		label := strings.ReplaceAll(role, "_", " ")
		words := strings.Fields(label)
		for i, w := range words {
			if len(w) > 0 {
				words[i] = strings.ToUpper(w[:1]) + w[1:]
			}
		}
		return roleMeta{strings.Join(words, " "), "Akses portal " + role, "user", "#6B7280"}
	}
}

func jwtSecret() []byte {
	return config.GetJWTSecret()
}

func createToken(userID uint, studentID uint, nim string, role string, facultyID *uint, programStudiID *uint, ormawaID *uint, ormawaAssign string, permissions []string) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   userID,
		"sid":   studentID,
		"nim":   nim,
		"role":  role,
		"fid":   facultyID,
		"pid":   programStudiID,
		"oid":   ormawaID,
		"oas":   ormawaAssign,
		"perms": permissions,
		"iat":   now.Unix(),
		"exp":   now.Add(24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

func createTempToken(userID uint) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub": userID,
		"typ": "role_select",
		"iat": now.Unix(),
		"exp": now.Add(5 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

func createRefreshToken(userID uint, studentID uint, nim string, role string, facultyID *uint, programStudiID *uint, ormawaID *uint, ormawaAssign string, permissions []string) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":   userID,
		"sid":   studentID,
		"nim":   nim,
		"role":  role,
		"fid":   facultyID,
		"pid":   programStudiID,
		"oid":   ormawaID,
		"oas":   ormawaAssign,
		"perms": permissions,
		"typ":   "refresh",
		"iat":   now.Unix(),
		"exp":   now.Add(7 * 24 * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret())
}

func setRefreshTokenCookie(c *fiber.Ctx, tokenString string) {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    tokenString,
		Expires:  time.Now().Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   false, // Set true in production if using HTTPS
		SameSite: "Lax",
		Path:     "/",
	})
}

func parseBearerToken(c *fiber.Ctx) (jwt.MapClaims, error) {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return nil, errors.New("missing authorization header")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, errors.New("invalid authorization format")
	}

	token, err := jwt.Parse(parts[1], func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid or expired token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("invalid token claims")
	}

	return claims, nil
}

func getUserPermissions(user models.User, roleName string, studentID uint) []string {
	var permissions []string

	// If the role is related to Ormawa
	if roleName == "ormawa" || roleName == "ormawa_admin" {
		if studentID != 0 {
			var membership models.OrmawaAnggota
			// Find active membership for the student (case-insensitive status check)
			if err := config.DB.Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", studentID).First(&membership).Error; err == nil {
				roleToLookup := membership.Role
				if strings.ToLower(roleToLookup) == "ketua/admin" {
					roleToLookup = "ketua"
				}
				var ormawaRole models.OrmawaRole
				// Find custom role in that Ormawa case-insensitively
				if err := config.DB.Where("ormawa_id = ? AND LOWER(nama) = LOWER(?)", membership.OrmawaID, roleToLookup).First(&ormawaRole).Error; err == nil {
					var customPerms []string
					if err := json.Unmarshal(ormawaRole.Permissions, &customPerms); err == nil && len(customPerms) > 0 {
						return customPerms
					}
				}

				// Fallback if no custom role is defined in the database:
				roleLower := strings.ToLower(membership.Role)
				if roleLower == "ketua" || roleLower == "ketua umum" || (strings.Contains(roleLower, "ketua") && !strings.Contains(roleLower, "wakil")) || strings.Contains(roleLower, "presiden") {
					return []string{"*"}
				}

				if roleLower == "wakil ketua" {
					return []string{
						"view_dashboard", "view_notifications",
						"view_members", "create_members", "edit_members",
						"view_staff", "manage_staff", "view_structure", "manage_structure",
						"view_proposal", "create_proposal", "edit_proposal", "delete_proposal",
						"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc", "delete_lpj",
						"view_calendar", "create_calendar", "edit_calendar", "delete_calendar",
						"view_attendance", "submit_attendance", "edit_attendance",
						"view_finance", "create_finance",
						"view_aspirations", "respond_aspirations",
						"view_announcements", "create_announcements", "edit_announcements", "delete_announcements",
						"view_settings",
					}
				}

				if roleLower == "sekretaris" {
					return []string{
						"view_dashboard", "view_notifications",
						"view_members", "create_members", "edit_members", "delete_members",
						"view_staff", "manage_staff", "view_structure", "manage_structure",
						"view_proposal", "create_proposal", "edit_proposal", "delete_proposal",
						"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc",
						"view_calendar", "create_calendar", "edit_calendar", "delete_calendar",
						"view_attendance", "submit_attendance", "edit_attendance",
						"view_announcements", "create_announcements", "edit_announcements", "delete_announcements",
					}
				}

				if roleLower == "bendahara" {
					return []string{
						"view_dashboard", "view_notifications",
						"view_members", "view_structure",
						"view_lpj", "create_lpj", "edit_lpj", "upload_lpj_doc",
						"view_finance", "create_finance", "delete_finance",
					}
				}

				if roleLower == "kepala divisi" || roleLower == "kadiv" {
					return []string{
						"view_dashboard", "view_notifications",
						"view_members",
						"view_staff", "view_structure",
						"view_proposal", "create_proposal", "edit_proposal",
						"view_lpj", "create_lpj", "upload_lpj_doc",
						"view_calendar", "create_calendar", "edit_calendar", "delete_calendar",
						"view_attendance", "submit_attendance",
						"view_announcements", "create_announcements", "edit_announcements",
					}
				}

				// Standard fallback for Staff/Anggota or any other role
				return []string{
					"view_dashboard", "view_notifications",
					"view_calendar", "view_announcements",
				}
			}
		} else {
			// If they don't have a student profile but are an ormawa role,
			// let it fall back to standard RBAC below.
		}
	}

	// If the role is related to Prodi Admin
	if roleName == "prodi_admin" {
		var prodiRole models.FakultasProdiRole
		if user.FakultasID != nil && user.OrmawaAssign != "" {
			if err := config.DB.Where("fakultas_id = ? AND LOWER(nama) = LOWER(?)", *user.FakultasID, strings.ToLower(user.OrmawaAssign)).First(&prodiRole).Error; err == nil {
				var customPerms []string
				if err := json.Unmarshal(prodiRole.Permissions, &customPerms); err == nil && len(customPerms) > 0 {
					return customPerms
				}
			}
		}
		// Fallback default permissions for prodi_admin
		return []string{"view_dashboard", "view_mahasiswa"}
	}

	// Load from old RBAC logic (which is updated by RoleManagement UI)
	var rbacRole models.RBACRole
	if err := config.DB.Where("key = ?", roleName).First(&rbacRole).Error; err == nil {
		var rbacPerms []string
		if err := json.Unmarshal(rbacRole.Permissions, &rbacPerms); err == nil {
			permissions = append(permissions, rbacPerms...)
		}
	} else if roleName == "psikolog" {
		// Psikolog alias fallback: try "psychologist" key
		if err := config.DB.Where("key = ?", "psychologist").First(&rbacRole).Error; err == nil {
			var rbacPerms []string
			if err := json.Unmarshal(rbacRole.Permissions, &rbacPerms); err == nil {
				permissions = append(permissions, rbacPerms...)
			}
		}
	} else if roleName == "admin_fakultas" || roleName == "faculty_admin" {
		if err := config.DB.Where("key = ?", "faculty_admin").First(&rbacRole).Error; err == nil {
			var rbacPerms []string
			if err := json.Unmarshal(rbacRole.Permissions, &rbacPerms); err == nil {
				permissions = append(permissions, rbacPerms...)
			}
		}
	}

	// Check new RBAC tables for role permissions and merge
	var userRoles []models.UserRole
	if err := config.DB.Preload("Role.Permissions").Where("user_id = ?", user.ID).Find(&userRoles).Error; err == nil {
		for _, ur := range userRoles {
			if ur.Role.Name == roleName {
				for _, p := range ur.Role.Permissions {
					if p.Key != "" {
						permissions = append(permissions, p.Key)
					}
				}
				break
			}
		}
	}

	// Deduplicate permissions
	permMap := make(map[string]bool)
	var uniquePerms []string
	for _, p := range permissions {
		if !permMap[p] {
			permMap[p] = true
			uniquePerms = append(uniquePerms, p)
		}
	}
	permissions = uniquePerms
	return permissions
}

func Login(c *fiber.Ctx) error {
	var body loginRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request payload",
		})
	}

	identifier := strings.TrimSpace(body.Identifier)
	if identifier == "" {
		identifier = strings.TrimSpace(body.Email)
	}
	if identifier == "" {
		identifier = strings.TrimSpace(body.NIM)
	}
	password := strings.TrimSpace(body.Password)
	if identifier == "" || password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Identifier and password are required",
		})
	}

	var user models.User
	var roleName string
	var nim string

	// 1. Try to find student by NIM first
	var student models.Mahasiswa
	err := config.DB.Preload("Pengguna").Preload("ProgramStudi").Preload("Fakultas").Where("nim = ?", identifier).First(&student).Error
	if err == nil {
		user = student.Pengguna
		roleName = student.Pengguna.Role
	} else {
		// 2. Try to find user by Email
		if err := config.DB.Where("LOWER(email) = ?", strings.ToLower(identifier)).First(&user).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "Email/NIM atau password salah",
			})
		}
		roleName = user.Role
		// Always try to load student profile if they have one linked
		_ = config.DB.Preload("ProgramStudi").Preload("Fakultas").Where("pengguna_id = ?", user.ID).First(&student).Error
	}

	if student.ID != 0 {
		nim = student.NIM
	}

	// Password check
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Email/NIM atau password salah",
		})
	}

	// Multi-role check: if user.Role contains commas, require role selection
	allRolesRaw := strings.Split(roleName, ",")
	var allRoles []string
	hasOrmawa := false
	for _, r := range allRolesRaw {
		rClean := strings.TrimSpace(r)
		if rClean != "" {
			allRoles = append(allRoles, rClean)
			if rClean == "ormawa" {
				hasOrmawa = true
			}
		}
	}

	// Dynamically check if this user is a student with an active Ormawa membership
	if student.ID != 0 && !hasOrmawa {
		var membershipCount int64
		config.DB.Model(&models.OrmawaAnggota{}).Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", student.ID).Count(&membershipCount)
		if membershipCount > 0 {
			allRoles = append(allRoles, "ormawa")
		}
	}
	if len(allRoles) > 1 {
		tempToken, err := createTempToken(user.ID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Gagal membuat token sementara",
			})
		}

		roleOptions := []fiber.Map{}
		for _, r := range allRoles {
			meta := getRoleMeta(r)

			// Custom meta for dynamic Ormawa roles
			if r == "ormawa" && student.ID != 0 {
				var membership models.OrmawaAnggota
				if err := config.DB.Preload("Ormawa").Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", student.ID).First(&membership).Error; err == nil {
					meta.Label = fmt.Sprintf("Ormawa (%s)", membership.Role)
					if membership.Ormawa.Nama != "" {
						meta.Description = fmt.Sprintf("Akses sebagai %s di %s", membership.Role, membership.Ormawa.Nama)
					} else {
						meta.Description = fmt.Sprintf("Akses sebagai %s organisasi mahasiswa", membership.Role)
					}
				}
			}

			roleOptions = append(roleOptions, fiber.Map{
				"role":        r,
				"label":       meta.Label,
				"description": meta.Description,
				"icon":        meta.Icon,
				"color":       meta.Color,
			})
		}

		// Try to get display name from linked profiles
		var displayName string
		var psi models.Psikolog
		if err := config.DB.Where("user_id = ?", user.ID).First(&psi).Error; err == nil {
			displayName = psi.Nama
		}
		if displayName == "" {
			var tk models.TenagaKesehatan
			if err := config.DB.Where("user_id = ?", user.ID).First(&tk).Error; err == nil {
				displayName = tk.Nama
			}
		}

		return c.JSON(fiber.Map{
			"success": true,
			"status":  "success",
			"data": fiber.Map{
				"requires_role_selection": true,
				"temp_token":              tempToken,
				"roles":                   roleOptions,
				"user": fiber.Map{
					"id":    user.ID,
					"email": user.Email,
					"nama":  displayName,
				},
			},
		})
	}

	var displayName string
	if student.ID != 0 {
		displayName = student.Nama
	} else {
		if user.FakultasID != nil && *user.FakultasID != 0 {
			var fak models.Fakultas
			if err := config.DB.First(&fak, *user.FakultasID).Error; err == nil {
				displayName = "Admin " + fak.Nama
			}
		}
		if displayName == "" {
			var psi models.Psikolog
			if err := config.DB.Where("user_id = ?", user.ID).First(&psi).Error; err == nil {
				displayName = psi.Nama
			}
		}
		if displayName == "" {
			var tk models.TenagaKesehatan
			if err := config.DB.Where("user_id = ?", user.ID).First(&tk).Error; err == nil {
				displayName = tk.Nama
			}
		}
	}

	permissions := getUserPermissions(user, roleName, student.ID)

	token, err := createToken(user.ID, student.ID, nim, roleName, user.FakultasID, user.ProgramStudiID, user.OrmawaID, user.OrmawaAssign, permissions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to create access token",
		})
	}

	if rt, err := createRefreshToken(user.ID, student.ID, nim, roleName, user.FakultasID, user.ProgramStudiID, user.OrmawaID, user.OrmawaAssign, permissions); err == nil {
		setRefreshTokenCookie(c, rt)
	}

	config.DB.Create(&models.LogAktivitas{
		UserID:    user.ID,
		Aktivitas: "LOGIN",
		Deskripsi: "User berhasil login",
		IPAddress: c.IP(),
	})

	return c.JSON(fiber.Map{
		"success": true,
		"status":  "success",
		"data": fiber.Map{
			"token":        token,
			"access_token": token,
			"mahasiswa":    student, // although for admin it might be empty
			"user": userResponse{
				ID:             user.ID,
				Email:          user.Email,
				Role:           roleName,
				NIM:            student.NIM,
				Nama:           displayName,
				FakultasID:     user.FakultasID,
				ProgramStudiID: user.ProgramStudiID,
				OrmawaID:       user.OrmawaID,
				Permissions:    permissions,
			},
		},
	})
}

func LoginSelectRole(c *fiber.Ctx) error {
	var body struct {
		TempToken    string `json:"temp_token"`
		SelectedRole string `json:"selected_role"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request payload",
		})
	}

	if body.TempToken == "" || body.SelectedRole == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Token dan role harus diisi",
		})
	}

	// Parse and validate temp token
	token, err := jwt.Parse(body.TempToken, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Token sementara tidak valid atau sudah kadaluarsa. Silakan login ulang.",
		})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Token tidak valid",
		})
	}

	// Verify token type
	if typ, ok := claims["typ"].(string); !ok || typ != "role_select" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Token tidak valid untuk pemilihan role",
		})
	}

	userID := uint(claims["sub"].(float64))

	// Get user from DB
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "User tidak ditemukan",
		})
	}

	// Validate selected role is in user's comma-separated roles
	userRoles := strings.Split(user.Role, ",")
	validRole := false
	for _, r := range userRoles {
		if strings.TrimSpace(r) == body.SelectedRole {
			validRole = true
			break
		}
	}
	if !validRole && body.SelectedRole == "ormawa" {
		var student models.Mahasiswa
		_ = config.DB.Where("pengguna_id = ?", user.ID).First(&student).Error
		if student.ID != 0 {
			var membershipCount int64
			config.DB.Model(&models.OrmawaAnggota{}).Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", student.ID).Count(&membershipCount)
			if membershipCount > 0 {
				validRole = true
			}
		}
	}
	if !validRole {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"status":  "error",
			"message": "Role tidak tersedia untuk akun ini",
		})
	}

	selectedRole := body.SelectedRole

	var student models.Mahasiswa
	var nim string

	// Always load student profile if it exists, to ensure student ID and NIM claims are present in JWT token
	_ = config.DB.Preload("ProgramStudi").Preload("Fakultas").Where("pengguna_id = ?", user.ID).First(&student).Error
	if student.ID != 0 {
		nim = student.NIM
	}

	permissions := getUserPermissions(user, selectedRole, student.ID)

	accessToken, err := createToken(user.ID, student.ID, nim, selectedRole, user.FakultasID, user.ProgramStudiID, user.OrmawaID, user.OrmawaAssign, permissions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal membuat token akses",
		})
	}

	if rt, err := createRefreshToken(user.ID, student.ID, nim, selectedRole, user.FakultasID, user.ProgramStudiID, user.OrmawaID, user.OrmawaAssign, permissions); err == nil {
		setRefreshTokenCookie(c, rt)
	}

	// Get display name
	var displayName string
	if student.ID != 0 {
		displayName = student.Nama
	} else {
		if user.FakultasID != nil && *user.FakultasID != 0 {
			var fak models.Fakultas
			if err := config.DB.First(&fak, *user.FakultasID).Error; err == nil {
				displayName = "Admin " + fak.Nama
			}
		}
		if displayName == "" {
			var psi models.Psikolog
			if err := config.DB.Where("user_id = ?", user.ID).First(&psi).Error; err == nil {
				displayName = psi.Nama
			}
		}
		if displayName == "" {
			var tk models.TenagaKesehatan
			if err := config.DB.Where("user_id = ?", user.ID).First(&tk).Error; err == nil {
				displayName = tk.Nama
			}
		}
	}

	var roleDisplay string
	var ormawaName string
	if (selectedRole == "ormawa" || selectedRole == "ormawa_admin") && student.ID != 0 {
		var membership models.OrmawaAnggota
		if err := config.DB.Preload("Ormawa").Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", student.ID).First(&membership).Error; err == nil {
			roleDisplay = membership.Role
			ormawaName = membership.Ormawa.Nama
		}
	}

	config.DB.Create(&models.LogAktivitas{
		UserID:    user.ID,
		Aktivitas: "LOGIN",
		Deskripsi: fmt.Sprintf("User berhasil login (Role: %s)", selectedRole),
		IPAddress: c.IP(),
	})

	return c.JSON(fiber.Map{
		"success": true,
		"status":  "success",
		"data": fiber.Map{
			"token":        accessToken,
			"access_token": accessToken,
			"mahasiswa":    student,
			"user": userResponse{
				ID:             user.ID,
				Email:          user.Email,
				Role:           selectedRole,
				RoleDisplay:    roleDisplay,
				OrmawaName:     ormawaName,
				NIM:            student.NIM,
				Nama:           displayName,
				FakultasID:     user.FakultasID,
				ProgramStudiID: user.ProgramStudiID,
				OrmawaID:       user.OrmawaID,
				Permissions:    permissions,
			},
		},
	})
}

func Me(c *fiber.Ctx) error {
	claims, err := parseBearerToken(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	uidValue, ok := claims["sub"].(float64)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid token payload",
		})
	}

	var user models.User
	if err := config.DB.First(&user, uint(uidValue)).Error; err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"status":  "error",
			"message": "User not found",
		})
	}

	var student models.Mahasiswa
	_ = config.DB.Where("pengguna_id = ?", user.ID).First(&student).Error
	if student.ID != 0 {
		var membership models.OrmawaAnggota
		if err := config.DB.Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", student.ID).First(&membership).Error; err == nil {
			user.OrmawaID = &membership.OrmawaID
		}
	}

	roleVal, ok := claims["role"].(string)
	if !ok || roleVal == "" {
		roleVal = user.Role
	}

	// Validate if the claimed role is still in the user's DB roles
	validRole := false
	userRoles := strings.Split(user.Role, ",")
	for _, r := range userRoles {
		if strings.TrimSpace(r) == roleVal {
			validRole = true
			break
		}
	}

	// If the user's role was changed in the DB and their token role is no longer valid, fallback to the first valid role
	if !validRole && len(userRoles) > 0 {
		roleVal = strings.TrimSpace(userRoles[0])
	}

	permissions := getUserPermissions(user, roleVal, student.ID)

	var roleDisplay string
	var ormawaName string
	if (roleVal == "ormawa" || roleVal == "ormawa_admin") && student.ID != 0 {
		var membership models.OrmawaAnggota
		if err := config.DB.Preload("Ormawa").Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", student.ID).First(&membership).Error; err == nil {
			roleDisplay = membership.Role
			ormawaName = membership.Ormawa.Nama
		}
	}

	var displayName string
	if student.ID != 0 {
		displayName = student.Nama
	} else {
		if user.FakultasID != nil && *user.FakultasID != 0 {
			var fak models.Fakultas
			if err := config.DB.First(&fak, *user.FakultasID).Error; err == nil {
				displayName = "Admin " + fak.Nama
			}
		}
		if displayName == "" {
			var psi models.Psikolog
			if err := config.DB.Where("user_id = ?", user.ID).First(&psi).Error; err == nil {
				displayName = psi.Nama
			}
		}
		if displayName == "" {
			var tk models.TenagaKesehatan
			if err := config.DB.Where("user_id = ?", user.ID).First(&tk).Error; err == nil {
				displayName = tk.Nama
			}
		}
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"user": userResponse{
				ID:             user.ID,
				Email:          user.Email,
				Role:           roleVal,
				RoleDisplay:    roleDisplay,
				OrmawaName:     ormawaName,
				NIM:            student.NIM,
				Nama:           displayName,
				FakultasID:     user.FakultasID,
				ProgramStudiID: user.ProgramStudiID,
				OrmawaID:       user.OrmawaID,
				Permissions:    permissions,
			},
		},
	})
}

func RefreshToken(c *fiber.Ctx) error {
	tokenString := c.Cookies("refresh_token")
	if tokenString == "" {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Refresh token tidak ditemukan"})
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret(), nil
	})

	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Refresh token tidak valid"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "refresh" {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Refresh token invalid type"})
	}

	var fid *uint
	if f, ok := claims["fid"].(float64); ok {
		val := uint(f)
		fid = &val
	}

	var oid *uint
	if o, ok := claims["oid"].(float64); ok {
		val := uint(o)
		oid = &val
	}

	var pid *uint
	if p, ok := claims["pid"].(float64); ok {
		val := uint(p)
		pid = &val
	}

	var oas string
	if as, ok := claims["oas"].(string); ok {
		oas = as
	}

	// Get the user to check if their role has changed
	userID := uint(claims["sub"].(float64))
	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "User tidak ditemukan"})
	}

	currentRole := claims["role"].(string)
	validRole := false
	userRoles := strings.Split(user.Role, ",")
	for _, r := range userRoles {
		if strings.TrimSpace(r) == currentRole {
			validRole = true
			break
		}
	}
	if !validRole && len(userRoles) > 0 {
		currentRole = strings.TrimSpace(userRoles[0])
	}

	// Get permissions based on the active role
	permissions := getUserPermissions(user, currentRole, uint(claims["sid"].(float64)))

	newAT, err := createToken(userID, uint(claims["sid"].(float64)), claims["nim"].(string), currentRole, fid, pid, oid, oas, permissions)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal generate token baru"})
	}

	// Also generate a new refresh token to keep it updated with the correct role
	newRT, _ := createRefreshToken(userID, uint(claims["sid"].(float64)), claims["nim"].(string), currentRole, fid, pid, oid, oas, permissions)
	if newRT != "" {
		setRefreshTokenCookie(c, newRT)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Token berhasil diperbarui",
		"data": fiber.Map{
			"access_token": newAT,
			"expires_in":   900,
		},
	})
}

func Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Berhasil logout",
	})
}

func ChangePassword(c *fiber.Ctx) error {
	UserID := c.Locals("user_id")

	type ChangePasswordRequest struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request payload"})
	}

	var user models.User
	if err := config.DB.First(&user, UserID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "User tidak ditemukan"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Password lama salah"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengenkripsi password baru"})
	}

	user.Password = string(hash)
	config.DB.Save(&user)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Password berhasil diubah",
	})
}


// UpdateEmail allows authenticated student to update their email
func UpdateEmail(c *fiber.Ctx) error {
	UserID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	type UpdateEmailRequest struct {
		Email        string `json:"email"`
		ConfirmEmail string `json:"confirm_email"`
		Password     string `json:"password"`
	}

	var req UpdateEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data tidak valid"})
	}

	// Normalize
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.ConfirmEmail = strings.TrimSpace(strings.ToLower(req.ConfirmEmail))
	req.Password = strings.TrimSpace(req.Password)

	// Validation
	if req.Email == "" || req.ConfirmEmail == "" || req.Password == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Email baru, konfirmasi email, dan password wajib diisi"})
	}

	if req.Email != req.ConfirmEmail {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Email dan konfirmasi email tidak cocok"})
	}

	// Validate email format
	if !isValidEmail(req.Email) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format email tidak valid"})
	}

	// Get current user
	var user models.User
	if err := config.DB.First(&user, UserID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "User tidak ditemukan"})
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Password salah"})
	}

	// Check if new email is same as current
	if strings.ToLower(user.Email) == req.Email {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Email baru sama dengan email saat ini"})
	}

	// Check if email is already taken by another user
	var existingUser models.User
	if err := config.DB.Where("LOWER(email) = ? AND id != ?", req.Email, UserID).First(&existingUser).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Email sudah digunakan oleh akun lain"})
	}

	// Update email in users table
	oldEmail := user.Email
	user.Email = req.Email
	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui email"})
	}

	// Sync to mahasiswa table (EmailKampus)
	var student models.Mahasiswa
	if err := config.DB.Where("pengguna_id = ?", UserID).First(&student).Error; err == nil {
		student.EmailKampus = req.Email
		student.EmailPersonal = req.Email
		config.DB.Save(&student)
	}

	// Log activity
	log.Printf("[AUTH] Email updated for user %d: %s -> %s", UserID, oldEmail, req.Email)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Email berhasil diperbarui",
		"data": fiber.Map{
			"email":     req.Email,
			"old_email": oldEmail,
		},
	})
}

func isValidEmail(email string) bool {
	if email == "" {
		return false
	}
	parts := strings.Split(email, "@")
	if len(parts) != 2 {
		return false
	}
	if len(parts[0]) < 1 || len(parts[1]) < 3 {
		return false
	}
	if !strings.Contains(parts[1], ".") {
		return false
	}
	return true
}

func Protected() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, err := parseBearerToken(c)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"status":  "error",
				"message": "Sesi berakhir atau tidak valid. Silakan login kembali.",
			})
		}

		c.Locals("user_id", uint(claims["sub"].(float64)))
		c.Locals("role", claims["role"].(string))
		if sid, ok := claims["sid"].(float64); ok {
			c.Locals("student_id", uint(sid))
		}
		if fid, ok := claims["fid"].(float64); ok {
			c.Locals("fakultas_id", uint(fid))
		}
		if oid, ok := claims["oid"].(float64); ok {
			c.Locals("ormawa_id", uint(oid))
		}

		return c.Next()
	}
}

func EnsureBootstrapData() error {
	fmt.Println("🚀 [SEEDER] Starting clean bootstrap process...")

	// Sync all Postgres serial sequences to prevent duplicate key constraint violations
	if err := SyncPostgresSequences(config.DB); err != nil {
		log.Printf("[SEEDER-WARN] Failed to sync database sequences: %v", err)
	}

	// Ensure Super Admin
	superAdminUser, err := ensureUser("superadmin@bku.ac.id", "superadmin123", "super_admin", nil, nil)
	if err != nil {
		return err
	}

	var logAct models.LogAktivitas
	if err := config.DB.Where("user_id = ? AND aktivitas = ?", superAdminUser.ID, "SEEDER_BOOTSTRAP").First(&logAct).Error; err != nil {
		logAct = models.LogAktivitas{UserID: superAdminUser.ID, Aktivitas: "SEEDER_BOOTSTRAP", Deskripsi: "Seeder default untuk superadmin", IPAddress: "127.0.0.1"}
		config.DB.Create(&logAct)
	}

	// Ensure Tenaga Kesehatan (Medis)
	medisUser, err := ensureUser("medis@bku.ac.id", "medis123", "tenaga_kesehatan", nil, nil)
	if err != nil {
		return err
	}

	var tk models.TenagaKesehatan
	if err := config.DB.Where("user_id = ?", medisUser.ID).First(&tk).Error; err != nil {
		tk = models.TenagaKesehatan{
			UserID:       medisUser.ID,
			Nama:         "Dr. Medis Dummy",
			Email:        "medis@bku.ac.id",
			Spesialisasi: "Dokter Umum",
			NoHP:         "081234567890",
		}
		config.DB.Create(&tk)
	}

	fmt.Println("✅ [SEEDER] Bootstrap completed successfully.")
	fmt.Println("   super_admin   : superadmin@bku.ac.id / superadmin123")
	fmt.Println("   medis         : medis@bku.ac.id / medis123")

	return nil
}

func ensureUser(email, plainPassword, role string, fakultasID *uint, ormawaID *uint) (models.User, error) {
	var user models.User
	if err := config.DB.Where("LOWER(email) = ?", strings.ToLower(email)).First(&user).Error; err == nil {
		updates := map[string]interface{}{}
		if role != "" && user.Role != role {
			updates["role"] = role
		}
		if fakultasID != nil {
			updates["fakultas_id"] = *fakultasID
		}
		if ormawaID != nil {
			updates["ormawa_id"] = *ormawaID
		}

		// DO NOT reset password — respect user's ChangePassword

		if len(updates) > 0 {
			if err := config.DB.Model(&user).Updates(updates).Error; err != nil {
				return models.User{}, err
			}
			_ = config.DB.First(&user, user.ID).Error
		}
		return user, nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), bcrypt.DefaultCost)
	if err != nil {
		return models.User{}, err
	}

	user = models.User{
		Email:    strings.ToLower(email),
		Password: string(hash),
		Role:     role,
	}
	if fakultasID != nil {
		user.FakultasID = fakultasID
	}
	if ormawaID != nil {
		user.OrmawaID = ormawaID
	}

	if err := config.DB.Create(&user).Error; err != nil {
		return models.User{}, err
	}

	return user, nil
}

// SyncPostgresSequences resets/synchronizes the serial/bigserial primary key sequences
// of critical Postgres tables in our database schema to their current MAX(id).
// This prevents "duplicate key value violates unique constraint" errors when inserting rows.
func SyncPostgresSequences(db *gorm.DB) error {
	tables := []string{
		"mahasiswa.beasiswa",
		"mahasiswa.beasiswa_pendaftaran",
		"mahasiswa.mahasiswa",
		"mahasiswa.prestasi",
		"mahasiswa.aspirasi",
		"mahasiswa.konseling",
		"mahasiswa.pengajuan_surat",
		"mahasiswa.kesehatan",
		"mahasiswa.log_aktivitas",
		"mahasiswa.riwayat_organisasis",
		"mahasiswa.notifikasi",
		"ormawa.ormawa",
		"ormawa.ormawa_anggota",
		"ormawa.ormawa_divisi",
		"ormawa.ormawa_role",
		"ormawa.ormawa_kegiatan",
		"ormawa.ormawa_kehadiran",
		"ormawa.ormawa_pengumuman",
		"ormawa.ormawa_mutasi_saldo",
		"ormawa.ormawa_aspirasi",
		"ormawa.ormawa_notifikasi",
		"ormawa.proposal",
		"ormawa.proposal_riwayat",
		"ormawa.laporan_pertanggungjawaban",
		"public.users",
		"public.rbac_roles",
		"fakultas.fakultas",
		"fakultas.program_studi",
		"fakultas.dosen",
		"fakultas.academic_periods",
		"fakultas.pengaturan_akademik",
		"fakultas.program_mbkm",
		"fakultas.berita",
	}

	for _, table := range tables {
		query := fmt.Sprintf("SELECT setval(pg_get_serial_sequence('%s', 'id'), COALESCE(MAX(id), 1)) FROM %s;", table, table)
		if err := db.Exec(query).Error; err != nil {
			// Some tables might use UUID/different PK column and lack serial seq, this is expected
			log.Printf("[DB-SEQ] Info: Skipping/Failed sequence sync for %s (non-serial or custom PK): %v", table, err)
		} else {
			log.Printf("[DB-SEQ] Synced serial sequence for %s", table)
		}
	}
	return nil
}
