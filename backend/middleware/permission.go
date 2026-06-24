package middleware

import (
	"encoding/json"
	"log"
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// legacyPermissionMap maps legacy view_/edit_/create_/delete_ format to one or more domain.action formats.
var legacyPermissionMap = map[string][]string{}

// loadRolePermissions fetches the permission list for a given role from the rbac_roles table or specific scope.
func loadRolePermissions(c *fiber.Ctx, role string) []string {
	roleLower := strings.ToLower(role)

	// 1. Prodi Admin specific permissions
	if roleLower == "prodi_admin" {
		var fid uint
		if f, ok := c.Locals("fakultas_id").(uint); ok {
			fid = f
		}
		var oas string
		if o, ok := c.Locals("ormawa_assign").(string); ok {
			oas = o
		}

		if fid != 0 && oas != "" {
			var prodiRole models.FakultasProdiRole
			if err := config.DB.Where("fakultas_id = ? AND LOWER(nama) = LOWER(?)", fid, strings.ToLower(oas)).First(&prodiRole).Error; err == nil {
				var customPerms []string
				if err := json.Unmarshal(prodiRole.Permissions, &customPerms); err == nil && len(customPerms) > 0 {
					return customPerms
				}
			}
		}
		// Fallback default permissions for prodi_admin
		return []string{"view_dashboard", "view_mahasiswa"}
	}

	// 2. Ormawa specific permissions
	if roleLower == "ormawa" || roleLower == "ormawa_admin" {
		var sid uint
		if s, ok := c.Locals("student_id").(uint); ok {
			sid = s
		}

		if sid != 0 {
			var ormawaID uint
			if oid, ok := c.Locals("ormawa_id").(uint); ok && oid != 0 {
				ormawaID = oid
			} else if oidFloat, ok := c.Locals("ormawa_id").(float64); ok && oidFloat > 0 {
				ormawaID = uint(oidFloat)
			}

			var membership models.OrmawaAnggota
			query := config.DB.Where("mahasiswa_id = ? AND LOWER(status) = 'aktif'", sid)
			if ormawaID != 0 {
				query = query.Where("ormawa_id = ?", ormawaID)
			}
			if err := query.First(&membership).Error; err == nil {
				roleToLookup := membership.Role
				if strings.ToLower(roleToLookup) == "ketua/admin" {
					roleToLookup = "ketua"
				}
				var ormawaRole models.OrmawaRole
				if err := config.DB.Where("ormawa_id = ? AND LOWER(nama) = LOWER(?)", membership.OrmawaID, roleToLookup).First(&ormawaRole).Error; err == nil {
					var customPerms []string
					if err := json.Unmarshal(ormawaRole.Permissions, &customPerms); err == nil && len(customPerms) > 0 {
						return customPerms
					}
				}

				// Hardcoded fallbacks
				mRoleLower := strings.ToLower(membership.Role)
				if mRoleLower == "ketua" || mRoleLower == "ketua umum" || (strings.Contains(mRoleLower, "ketua") && !strings.Contains(mRoleLower, "wakil")) || strings.Contains(mRoleLower, "presiden") {
					return []string{"*"}
				}
				if mRoleLower == "wakil ketua" {
					return []string{
						"ormawa.core.view", "ormawa.notifications.view", "ormawa.notifications.manage",
						"ormawa.members.view", "ormawa.members.create", "ormawa.members.update", "ormawa.members.delete",
						"ormawa.structure.view", "ormawa.structure.manage",
						"ormawa.proposals.view", "ormawa.proposals.create", "ormawa.proposals.update", "ormawa.proposals.delete",
						"ormawa.lpj.view", "ormawa.lpj.create", "ormawa.lpj.update", "ormawa.lpj.delete",
						"ormawa.events.view", "ormawa.events.create", "ormawa.events.update", "ormawa.events.delete",
						"ormawa.attendance.view", "ormawa.attendance.manage",
						"ormawa.finance.view", "ormawa.finance.create",
						"ormawa.aspirations.view", "ormawa.aspirations.update",
						"ormawa.announcements.view", "ormawa.announcements.create", "ormawa.announcements.update", "ormawa.announcements.delete",
						"ormawa.settings.view",
					}
				}
				if mRoleLower == "sekretaris" {
					return []string{
						"ormawa.core.view", "ormawa.notifications.view",
						"ormawa.members.view", "ormawa.members.create", "ormawa.members.update", "ormawa.members.delete",
						"ormawa.structure.view", "ormawa.structure.manage",
						"ormawa.proposals.view", "ormawa.proposals.create", "ormawa.proposals.update", "ormawa.proposals.delete",
						"ormawa.lpj.view", "ormawa.lpj.create", "ormawa.lpj.update",
						"ormawa.events.view", "ormawa.events.create", "ormawa.events.update", "ormawa.events.delete",
						"ormawa.attendance.view", "ormawa.attendance.manage",
						"ormawa.announcements.view", "ormawa.announcements.create", "ormawa.announcements.update", "ormawa.announcements.delete",
					}
				}
				if mRoleLower == "bendahara" {
					return []string{
						"ormawa.core.view", "ormawa.notifications.view",
						"ormawa.members.view", "ormawa.structure.view",
						"ormawa.lpj.view", "ormawa.lpj.create", "ormawa.lpj.update",
						"ormawa.finance.view", "ormawa.finance.create", "ormawa.finance.delete",
					}
				}
				if mRoleLower == "kepala divisi" || mRoleLower == "kadiv" {
					return []string{
						"ormawa.core.view", "ormawa.notifications.view",
						"ormawa.members.view", "ormawa.structure.view",
						"ormawa.proposals.view", "ormawa.proposals.create", "ormawa.proposals.update",
						"ormawa.lpj.view", "ormawa.lpj.create", "ormawa.lpj.update",
						"ormawa.events.view", "ormawa.events.create", "ormawa.events.update", "ormawa.events.delete",
						"ormawa.attendance.view", "ormawa.attendance.manage",
						"ormawa.announcements.view", "ormawa.announcements.create", "ormawa.announcements.update",
					}
				}

				return []string{
					"ormawa.core.view", "ormawa.notifications.view",
					"ormawa.events.view", "ormawa.announcements.view",
				}
			}
		}
	}

	var rbacRole models.RBACRole
	if err := config.DB.Where("LOWER(key) = ?", roleLower).First(&rbacRole).Error; err == nil {
		var permissions []string
		if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
			return permissions
		}
	}
	// For prodi_admin, also try the psychologist alias
	if role == "psikolog" {
		if err := config.DB.Where("key = ?", "psychologist").First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				return permissions
			}
		}
	} else if role == "mahasiswa" {
		// Mahasiswa uses "mahasiswa" as the key in the database
		if err := config.DB.Where("key = ?", "mahasiswa").First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				return permissions
			}
		}
	} else if role == "admin_fakultas" || role == "faculty_admin" {
		var rbacRole models.RBACRole
		if err := config.DB.Where("key = ?", "faculty_admin").First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				return permissions
			}
		}
	}
	return nil
}

// userHasPermission checks if the user's role permissions include the required key.
// It checks both the raw permission string and the resolved legacy formats.
func userHasPermission(permissions []string, required string) bool {
	for _, p := range permissions {
		if p == "*" || p == required {
			return true
		}
		// Check if a legacy permission maps to the required key
		if mappedKeys, ok := legacyPermissionMap[p]; ok {
			for _, mk := range mappedKeys {
				if mk == required {
					return true
				}
			}
		}
	}
	// Special fallback: if asking for dashboard, allow if they have any portal-specific permission
	if required == "faculty.dashboard.view" {
		for _, p := range permissions {
			if strings.HasPrefix(p, "faculty.") || strings.HasPrefix(p, "faculty_") || strings.HasPrefix(p, "program_studi.") || strings.HasPrefix(p, "kencana.faculty") ||
				p == "students.view" || p == "dosen.view" || p == "achievement.view" || p == "scholarship.view" || p == "akademik.view" || p == "aspiration.view" || p == "prodi_users.view" {
				return true
			}
		}
	}

	return false
}

// RequirePermission returns a middleware that checks if the authenticated user has
// the specified permission (e.g. "achievement.delete", "students.view").
// Super Admin always passes.
func RequirePermission(permKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Akses ditolak. Token tidak valid.",
			})
		}

		// Super Admin always passes
		if IsSuperAdmin(role) {
			return c.Next()
		}

		// Mahasiswa is a default role, bypass specific permission checks for student actions
		userRoles := strings.Split(strings.ToLower(role), ",")
		for _, r := range userRoles {
			r = strings.TrimSpace(r)
			if r == "mahasiswa" && (strings.HasPrefix(permKey, "student.") || permKey == "student_kencana_view") {
				return c.Next()
			}
		}

		// Load permissions from locals (injected by JWT middleware)
		permissions, ok := c.Locals("permissions").([]string)
		if !ok || len(permissions) == 0 {
			// Fallback: try loading from DB if not in JWT
			permissions = loadRolePermissions(c, role)
			if permissions == nil {
				log.Printf("[PermCheck] No permissions found for role: %s, required: %s", role, permKey)
				return c.Status(403).JSON(fiber.Map{
					"status":  "error",
					"message": "Akses ditolak. Role tidak memiliki izin yang diperlukan.",
				})
			}
		}

		if userHasPermission(permissions, permKey) {
			return c.Next()
		}

		log.Printf("[PermCheck] Access denied for role: %s, required permission: %s", role, permKey)
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.",
		})
	}
}

// RequireAnyPermission returns a middleware that checks if the authenticated user has
// AT LEAST ONE of the specified permissions.
func RequireAnyPermission(permKeys ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role, ok := c.Locals("role").(string)
		if !ok {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Akses ditolak. Token tidak valid.",
			})
		}

		if IsSuperAdmin(role) {
			return c.Next()
		}

		// Mahasiswa is a default role, bypass specific permission checks for student actions
		userRoles := strings.Split(strings.ToLower(role), ",")
		for _, r := range userRoles {
			r = strings.TrimSpace(r)
			if r == "mahasiswa" {
				for _, permKey := range permKeys {
					if strings.HasPrefix(permKey, "student.") || permKey == "student_kencana_view" {
						return c.Next()
					}
				}
			}
		}

		permissions, ok := c.Locals("permissions").([]string)
		if !ok || len(permissions) == 0 {
			permissions = loadRolePermissions(c, role)
		}

		for _, key := range permKeys {
			if userHasPermission(permissions, key) {
				return c.Next()
			}
		}

		log.Printf("[PermCheck] Access denied for role: %s, required any of: %v", role, permKeys)
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.",
		})
	}
}

// HasPermission is a helper to check if a specific role has a permission, avoiding the fiber context
func HasPermission(role string, permissions []string, required string) bool {
	if IsSuperAdmin(role) {
		return true
	}
	return userHasPermission(permissions, required)
}

// IsSuperAdmin checks if a role string represents a super admin
func IsSuperAdmin(role string) bool {
	r := strings.TrimSpace(strings.ToLower(role))
	return r == "super_admin" || r == "superadmin" || r == "super admin"
}

// HasAnyRole checks if the provided role is in the list of allowed roles.
// It is kept for backward compatibility during the transition to RBAC.
func HasAnyRole(userRole string, allowedRoles ...string) bool {
	if IsSuperAdmin(userRole) {
		return true
	}
	userRole = strings.TrimSpace(strings.ToLower(userRole))
	for _, allowed := range allowedRoles {
		if userRole == strings.TrimSpace(strings.ToLower(allowed)) {
			return true
		}
	}
	return false
}
