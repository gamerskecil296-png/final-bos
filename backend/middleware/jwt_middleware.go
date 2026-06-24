package middleware

import (
	"encoding/json"
	"log"
	"siakad-backend/config"
	"siakad-backend/models"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func AuthProtected(c *fiber.Ctx) error {
	var tokenString string
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		tokenString = c.Query("token")
		if tokenString == "" {
			return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Missing Authorization header"})
		}
	} else {
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Invalid Authorization header format"})
		}
		tokenString = parts[1]
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return config.GetJWTSecret(), nil
	})

	if err != nil || !token.Valid {
		log.Printf("invalid token: %v", err)
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Sesi tidak valid atau sudah berakhir"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Invalid token claims"})
	}

	// Set shared context from JWT claims first (may be overridden below for super_admin)
	if sub, ok := claims["sub"].(float64); ok {
		c.Locals("user_id", uint(sub))
	}
	if sid, ok := claims["sid"].(float64); ok {
		c.Locals("student_id", uint(sid))
	}
	if role, ok := claims["role"].(string); ok {
		c.Locals("role", role)
	} else {
		c.Locals("role", "")
	}

	if fid, ok := claims["fid"].(float64); ok {
		c.Locals("fakultas_id", uint(fid))
	} else {
		c.Locals("fakultas_id", uint(0))
	}

	// Set program_studi_id from JWT claim FIRST (super_admin block below may override)
	if pid, ok := claims["pid"].(float64); ok {
		c.Locals("program_studi_id", uint(pid))
	} else {
		c.Locals("program_studi_id", uint(0))
	}

	if oid, ok := claims["oid"].(float64); ok {
		c.Locals("ormawa_id", uint(oid))
	} else {
		c.Locals("ormawa_id", nil)
	}

	if oas, ok := claims["oas"].(string); ok {
		c.Locals("ormawa_assign", oas)
	} else {
		c.Locals("ormawa_assign", "")
	}

	c.Locals("nim", claims["nim"])

	// Extract new permissions array
	if perms, ok := claims["perms"].([]interface{}); ok {
		var permissions []string
		for _, p := range perms {
			if str, ok := p.(string); ok {
				permissions = append(permissions, str)
			}
		}
		c.Locals("permissions", permissions)
	} else {
		c.Locals("permissions", []string{})
	}

	// Dynamic faculty & prodi injection for Super Admin
	userRole, _ := c.Locals("role").(string)
	log.Printf("[DEBUG JWT] Path: %s, Original role: %s, Original fid: %v", c.Path(), userRole, c.Locals("fakultas_id"))
	if strings.ToLower(userRole) == "super_admin" {
		// 1. Process X-Faculty-ID / fakultasId
		headerFid := c.Get("X-Faculty-ID")
		if headerFid != "" && headerFid != "undefined" && headerFid != "null" {
			if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
				c.Locals("fakultas_id", uint(parsedFid))
				log.Printf("[DEBUG JWT] Set fakultas_id from header: %d", parsedFid)
			}
		} else {
			queryFid := c.Query("fakultasId")
			if queryFid != "" && queryFid != "undefined" && queryFid != "null" {
				if parsedFid, err := strconv.ParseUint(queryFid, 10, 32); err == nil {
					c.Locals("fakultas_id", uint(parsedFid))
					log.Printf("[DEBUG JWT] Set fakultas_id from query: %d", parsedFid)
				}
			}
		}

		// 2. Process X-Prodi-ID / prodiId
		headerPid := c.Get("X-Prodi-ID")
		if headerPid != "" && headerPid != "undefined" && headerPid != "null" && headerPid != "all" {
			if parsedPid, err := strconv.ParseUint(headerPid, 10, 32); err == nil {
				c.Locals("program_studi_id", uint(parsedPid))
				log.Printf("[DEBUG JWT] Set program_studi_id from header: %d", parsedPid)
			}
		}

		// 3. Fallback to first faculty if still 0
		var currentFid uint
		if fidLocal := c.Locals("fakultas_id"); fidLocal != nil {
			if val, ok := fidLocal.(uint); ok {
				currentFid = val
			}
		}
		if currentFid == 0 {
			// [REMOVED FOR SUPER ADMIN]
			// Allowing fid = 0 so Super Admin can view "Semua Fakultas"
			// var firstFakultas models.Fakultas
			// if err := config.DB.First(&firstFakultas).Error; err == nil {
			// 	c.Locals("fakultas_id", firstFakultas.ID)
			// 	currentFid = firstFakultas.ID
			// 	log.Printf("[DEBUG JWT] Fallback to first faculty: %d (%s)", firstFakultas.ID, firstFakultas.Nama)
			// }
		}

	}

	// Global fallback for any user accessing /api/faculty with fid == 0
	if strings.HasPrefix(c.Path(), "/api/faculty") {
		var currentFid uint
		if fidLocal := c.Locals("fakultas_id"); fidLocal != nil {
			if val, ok := fidLocal.(uint); ok {
				currentFid = val
			}
		}
		if currentFid == 0 {
			// Allowing fid = 0 so Super Admin can view "Semua Fakultas" globally
		}
	}

	log.Printf("[DEBUG JWT] Final role: %v, Final fakultas_id: %v, Final program_studi_id: %v", c.Locals("role"), c.Locals("fakultas_id"), c.Locals("program_studi_id"))

	return c.Next()
}


func MahasiswaCheck(c *fiber.Ctx) error {
	role, ok := c.Locals("role").(string)
	if !ok {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak.",
		})
	}
	userRoles := strings.Split(strings.ToLower(role), ",")
	allowed := false
	for _, rRaw := range userRoles {
		r := strings.TrimSpace(rRaw)
		if r == "mahasiswa" || r == "super_admin" {
			allowed = true
			break
		}
	}
	if !allowed {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Fitur ini hanya untuk Mahasiswa.",
		})
	}
	return c.Next()
}



func OrmawaCheck(c *fiber.Ctx) error {
	role, ok := c.Locals("role").(string)
	if !ok {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak."})
	}
	r := strings.ToLower(role)

	// Super Admin bypass — full access to all ormawa endpoints
	isSuperAdmin := IsSuperAdmin(r)
	hasOrmawaAdminAccess := isSuperAdmin

	if !isSuperAdmin && !HasAnyRole(r, "ormawa", "mahasiswa", "ormawa_admin") {
		var rbacRole models.RBACRole
		if err := config.DB.Where("LOWER(key) = ?", r).First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				for _, p := range permissions {
					if strings.HasPrefix(p, "ormawa") || p == "*" || strings.HasPrefix(p, "view_") || strings.HasPrefix(p, "manage_") {
						hasOrmawaAdminAccess = true
						break
					}
				}
			}
		}

		if !hasOrmawaAdminAccess {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Akses ditolak. Fitur ini hanya untuk pengurus Ormawa.",
			})
		}
	}

	if hasOrmawaAdminAccess {
		// Resolve ormawaId from header, query, or fallback to first ormawa
		headerOid := c.Get("X-Ormawa-ID")
		queryOid := c.Query("ormawaId")
		resolvedOid := ""

		if headerOid != "" && headerOid != "undefined" && headerOid != "null" {
			resolvedOid = headerOid
		} else if queryOid != "" && queryOid != "undefined" && queryOid != "null" {
			resolvedOid = queryOid
		}

		if resolvedOid != "" {
			c.Request().URI().QueryArgs().Set("ormawaId", resolvedOid)
			c.Locals("ormawa_id", uint(parseUint(resolvedOid)))
		} else {
			// Fallback: pick the first ormawa in the database
			var firstOrmawa models.Ormawa
			if err := config.DB.Order("id asc").First(&firstOrmawa).Error; err == nil {
				oidStr := strconv.FormatUint(uint64(firstOrmawa.ID), 10)
				c.Request().URI().QueryArgs().Set("ormawaId", oidStr)
				c.Locals("ormawa_id", firstOrmawa.ID)
			} else {
				// Prevent SQL syntax error when frontend sends "null" and DB is empty
				c.Request().URI().QueryArgs().Set("ormawaId", "0")
				c.Locals("ormawa_id", uint(0))
			}
		}
		log.Printf("[OrmawaCheck] Admin bypass — ormawa_id: %v", c.Locals("ormawa_id"))
		return c.Next()
	}

	tokenOrmawaID, hasTokenOrmawaID := c.Locals("ormawa_id").(uint)
	queryOrmawaID := c.Query("ormawaId")

	// If user is a dedicated ormawa account (has tokenOrmawaID > 0), enforce & override query param
	if hasTokenOrmawaID && tokenOrmawaID != 0 {
		c.Request().URI().QueryArgs().Set("ormawaId", strconv.FormatUint(uint64(tokenOrmawaID), 10))
		return c.Next()
	}

	// For student users who act as Ormawa admins/members
	if HasAnyRole(r, "mahasiswa", "ormawa", "ormawa_admin") && (!hasTokenOrmawaID || tokenOrmawaID == 0) {
		studentID, hasStudentID := c.Locals("student_id").(uint)
		if !hasStudentID || studentID == 0 {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Akses ditolak. Profil mahasiswa tidak ditemukan.",
			})
		}

		if queryOrmawaID == "" || queryOrmawaID == "1" || queryOrmawaID == "undefined" {
			var memberships []models.OrmawaAnggota
			err := config.DB.Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", studentID).Order("created_at asc").Limit(1).Find(&memberships).Error
			if err == nil && len(memberships) > 0 {
				c.Request().URI().QueryArgs().Set("ormawaId", strconv.FormatUint(uint64(memberships[0].OrmawaID), 10))
				queryOrmawaID = strconv.FormatUint(uint64(memberships[0].OrmawaID), 10)
			}
		}

		// Enforce ownership check for students
		if queryOrmawaID != "" && queryOrmawaID != "undefined" {
			var count int64
			config.DB.Model(&models.OrmawaAnggota{}).
				Where("mahasiswa_id = ? AND ormawa_id = ? AND LOWER(status) = 'aktif'", studentID, parseUint(queryOrmawaID)).
				Count(&count)
			if count == 0 {
				// Fallback to manual assign claim in token if DB record isn't added yet
				assignStr, _ := c.Locals("ormawa_assign").(string)
				allowed := false
				if assignStr != "" {
					for _, id := range strings.Split(assignStr, ",") {
						if strings.TrimSpace(id) == queryOrmawaID {
							allowed = true
							break
						}
					}
				}
				if !allowed {
					return c.Status(403).JSON(fiber.Map{
						"status":  "error",
						"message": "Akses ditolak. Anda tidak memiliki izin aktif untuk organisasi ini.",
					})
				}
			}

			// Set c.Locals("ormawa_id") for controllers
			c.Locals("ormawa_id", uint(parseUint(queryOrmawaID)))
		}
	}

	return c.Next()
}

func parseUint(s string) uint64 {
	v, _ := strconv.ParseUint(s, 10, 64)
	return v
}

func PsikologCheck(c *fiber.Ctx) error {
	role, ok := c.Locals("role").(string)
	if !ok {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Fitur ini hanya untuk Psikolog.",
		})
	}
	r := strings.ToLower(role)
	if HasAnyRole(r, "psikolog", "super_admin") {
		return c.Next()
	}

	permissions := loadRolePermissions(c, role)
	for _, p := range permissions {
		if p == "*" || strings.HasPrefix(p, "psychologist") {
			return c.Next()
		}
	}

	return c.Status(403).JSON(fiber.Map{
		"status":  "error",
		"message": "Akses ditolak. Fitur ini hanya untuk Psikolog.",
	})
}

func TenagaKesehatanCheck(c *fiber.Ctx) error {
	role, ok := c.Locals("role").(string)
	if !ok {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Token tidak valid.",
		})
	}
	r := strings.ToLower(role)
	if HasAnyRole(r, "tenaga_kesehatan", "tenagakes", "super_admin") {
		return c.Next()
	}

	permissions := loadRolePermissions(c, role)
	for _, p := range permissions {
		if p == "*" || strings.HasPrefix(p, "health") {
			return c.Next()
		}
	}

	return c.Status(403).JSON(fiber.Map{
		"status":  "error",
		"message": "Akses ditolak. Fitur ini hanya untuk Tenaga Kesehatan.",
	})
}

// RequireRole - middleware untuk check role tertentu
func MaintenanceCheck(c *fiber.Ctx) error {
	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		return c.Status(503).JSON(fiber.Map{
			"success": false,
			"message": "Service unavailable",
		})
	}

	if !theme.MaintenanceMode {
		return c.Next()
	}

	role, _ := c.Locals("role").(string)
	
	// Jika role belum diset (karena middleware AuthProtected belum jalan), coba parse token manual
	if role == "" {
		authHeader := c.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString := authHeader[7:]
			token, _ := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
				return config.GetJWTSecret(), nil
			})
			if token != nil && token.Valid {
				if claims, ok := token.Claims.(jwt.MapClaims); ok {
					if r, ok := claims["role"].(string); ok {
						role = r
					}
				}
			}
		}
	}

	if IsSuperAdmin(strings.ToLower(role)) {
		return c.Next()
	}

	return c.Status(503).JSON(fiber.Map{
		"success":           false,
		"message":           theme.MaintenanceMessage,
		"maintenance_mode":  true,
		"maintenance_message": theme.MaintenanceMessage,
	})
}

func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Akses ditolak. Role tidak valid.",
			})
		}
		userRoles := strings.Split(strings.ToLower(role), ",")

		for _, allowedRole := range roles {
			lowerAllowed := strings.ToLower(allowedRole)
			for _, r := range userRoles {
				if strings.TrimSpace(r) == lowerAllowed {
					return c.Next()
				}
			}
		}
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Anda tidak memiliki izin untuk fitur ini.",
		})
	}
}
