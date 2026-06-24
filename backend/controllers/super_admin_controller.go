package controllers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"siakad-backend/config"
	"siakad-backend/controllers/psychologist"
	"siakad-backend/middleware"
	"siakad-backend/models"
	"siakad-backend/pkg/gamifikasi"
	"siakad-backend/pkg/notifikasi"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var rbacPermissionCatalog = []fiber.Map{
	{"module": "Sistem & Konfigurasi", "items": []string{
		"admin.full_access", "admin.dashboard.view", "admin.profile.view", "admin.profile.update",
		"rbac.roles.view", "rbac.roles.create", "rbac.roles.update", "rbac.roles.delete",
		"rbac.users.view", "rbac.users.create", "rbac.users.update", "rbac.users.delete",
		"system.docs.view", "system.docs.manage",
		"system.news.view", "system.news.manage",
		"system.landing.view", "system.landing.manage",
		"system.theme.view", "system.theme.manage", "system.theme.reset",
		"system_settings.view", "system_settings.update",
		"system.document.view", "system.document.manage",
		"system.finance.view", "system.finance.manage",
		"system.insurance.view", "system.insurance.manage",
		"system.category.view", "system.category.manage", "system.category.reset",
		"admin.audit.view",
		// Fitur sensitif: Sync & Reset
		"system.pmb.view", "system.pmb.sync_sevima", "system.pmb.generate_account",
		"system.database.reset",
	}},
	{"module": "Akademik & Fakultas", "items": []string{
		"faculty.dashboard.view",
		"students.view", "students.create", "students.update", "students.delete",
		"students.sync_sevima", "students.sync_ipk", "students.reset", "students.reset_password", "students.generate_account",
		"faculty.view", "faculty.create", "faculty.update", "faculty.delete", "faculty.sync_sevima",
		"program_studi.view", "program_studi.create", "program_studi.update", "program_studi.delete",
		"program_studi.sync_sevima", "program_studi.reset",
		"dosen.view", "dosen.create", "dosen.update", "dosen.delete", "dosen.sync_sevima",
		"akademik.view", "akademik.sync_sevima",
		"faculty_report.view", "faculty_report.generate", "faculty_report.export",
		"faculty_profile.view", "faculty_profile.update",
		"prodi_users.view", "prodi_users.create", "prodi_users.update", "prodi_users.delete",
		"faculty_settings.view", "faculty_settings.manage",
		"faculty_rbac.view", "faculty_rbac.create", "faculty_rbac.update", "faculty_rbac.delete",
	}},
	{"module": "Kemahasiswaan", "items": []string{
		"scholarship.view", "scholarship.create", "scholarship.update", "scholarship.delete",
		"achievement.view", "achievement.create", "achievement.update", "achievement.delete",
		"achievement.sync_simkatmawa",
		"aspiration.view", "aspiration.create", "aspiration.update", "aspiration.delete",
		"faculty.scholarship.view",
		"faculty.achievement.view", "faculty.achievement.update", "faculty.achievement.sync_simkatmawa",
		"faculty.aspiration.view", "faculty.aspiration.update", "faculty.aspiration.delete",
	}},
	{"module": "Ormawa", "items": []string{
		"ormawa.core.view", "ormawa.view", "ormawa.kategori.view", "ormawa.kategori.manage",
		"ormawa.structure.view", "ormawa.structure.manage",
		"ormawa.members.view", "ormawa.members.create", "ormawa.members.update", "ormawa.members.delete",
		"ormawa.events.view", "ormawa.events.create", "ormawa.events.update", "ormawa.events.delete",
		"ormawa.attendance.view", "ormawa.attendance.manage",
		"ormawa.finance.view", "ormawa.finance.create", "ormawa.finance.update", "ormawa.finance.delete",
		"ormawa.proposals.view", "ormawa.proposals.create", "ormawa.proposals.update", "ormawa.proposals.delete",
		"ormawa.lpj.view", "ormawa.lpj.create", "ormawa.lpj.update", "ormawa.lpj.delete",
		"ormawa.announcements.view", "ormawa.announcements.create", "ormawa.announcements.update", "ormawa.announcements.delete",
		"ormawa.aspirations.view", "ormawa.aspirations.create", "ormawa.aspirations.update", "ormawa.aspirations.delete",
		"ormawa.recruitment.view", "ormawa.recruitment.create", "ormawa.recruitment.update", "ormawa.recruitment.delete",
		"ormawa.notifications.view", "ormawa.notifications.manage",
		"ormawa.kencana.view", "ormawa.kencana.manage",
		"ormawa.rbac.view", "ormawa.rbac.manage",
		"ormawa.settings.view", "ormawa.settings.manage",
		"ormawa.gamifikasi.view", "ormawa.gamifikasi.manage",
		"ormawa.pagu.view", "ormawa.pagu.manage",
		"faculty_ormawa.view", "faculty_ormawa.create", "faculty_ormawa.update", "faculty_ormawa.delete",
		"faculty_proposal.view", "faculty_proposal.update",
	}},
	{"module": "Klinik & Psikologi", "items": []string{
		"psychologist.dashboard.view",
		"psychologist.patients.view", "psychologist.patients.create", "psychologist.patients.update", "psychologist.patients.delete",
		"psychologist.bookings.view", "psychologist.bookings.create", "psychologist.bookings.update", "psychologist.bookings.delete",
		"psychologist.medical_records.view", "psychologist.medical_records.create", "psychologist.medical_records.update", "psychologist.medical_records.delete",
		"psychologist.referrals.view", "psychologist.referrals.create", "psychologist.referrals.update", "psychologist.referrals.delete",
		"psychologist.schedules.view", "psychologist.schedules.create", "psychologist.schedules.update", "psychologist.schedules.delete",
		"psychologist.reports.view", "psychologist.reports.create", "psychologist.reports.update", "psychologist.reports.delete",
		"psychologist.notifications.view",
		"psychologist.settings.view", "psychologist.settings.update",
		"health.dashboard.view",
		"health.bookings.view", "health.bookings.create", "health.bookings.update", "health.bookings.delete",
		"health.schedules.view", "health.schedules.create", "health.schedules.update", "health.schedules.delete",
		"health.patients.view", "health.patients.create", "health.patients.update", "health.patients.delete",
		"health.medical_records.view", "health.medical_records.create", "health.medical_records.update", "health.medical_records.delete",
		"health.bap.view", "health.bap.create", "health.bap.update", "health.bap.delete",
		"health.reports.view", "health.reports.create", "health.reports.update", "health.reports.delete",
		"health_claims.view",
		"faculty_health.view", "faculty_health.delete",
		"faculty.counseling.view", "faculty.counseling.manage",
	}},
	{"module": "Kencana (PKKMB)", "items": []string{
		"kencana.dashboard.view",
		"kencana.announcement.view", "kencana.announcement.create", "kencana.announcement.update", "kencana.announcement.delete",
		"kencana.timeline.view", "kencana.timeline.create", "kencana.timeline.update", "kencana.timeline.delete",
		"kencana.timeline.sync_sevima",
		"kencana.pre_kencana.view", "kencana.pre_kencana.create", "kencana.pre_kencana.update", "kencana.pre_kencana.delete",
		"kencana.university.view", "kencana.university.create", "kencana.university.update", "kencana.university.delete",
		"kencana.faculty_stages.view", "kencana.faculty_stages.create", "kencana.faculty_stages.update", "kencana.faculty_stages.delete",
		"kencana.score_summary.view",
		"kencana.scores.view", "kencana.scores.create", "kencana.scores.update", "kencana.scores.delete",
		"kencana.banding.view", "kencana.banding.update",
		"kencana.remedials.view", "kencana.remedials.create", "kencana.remedials.update", "kencana.remedials.delete",
		"kencana.certificates.view", "kencana.certificates.create", "kencana.certificates.update", "kencana.certificates.delete",
		"kencana.certificates.generate",
		"kencana.participants.view", "kencana.participants.create", "kencana.participants.update", "kencana.participants.delete",
		"kencana.participants.sync_sevima", "kencana.participants.reset",
		"kencana.groups.view", "kencana.groups.create", "kencana.groups.update", "kencana.groups.delete",
		"kencana.mentors.view", "kencana.mentors.create", "kencana.mentors.update", "kencana.mentors.delete",
		"kencana.mentor.dashboard", "kencana.mentor.view", "kencana.mentor.update", "kencana.mentor.settings",
		"kencana.attendance.view", "kencana.attendance.update",
		"kencana.handbook.view", "kencana.handbook.update",
		"kencana.notifications.view", "kencana.settings.view", "kencana.settings.update",
		"kencana.faculty.dashboard", "kencana.faculty.sync_sevima",
	}},
	{"module": "Portal Mahasiswa", "items": []string{
		"student.dashboard.view", "student.profile.view", "student.profile.update",
		"student.kencana.view", "student_kencana_view", "student.kencana.manage",
		"student.achievement.view", "student.achievement.create", "student.achievement.update", "student.achievement.delete",
		"student.organizations.view", "student.organizations.create", "student.organizations.update", "student.organizations.delete",
		"student.health.view", "student.health.records.view", "student.health.records.create", "student.health.records.update", "student.health.records.delete",
		"student.health.bookings.view", "student.health.bookings.create", "student.health.bookings.update", "student.health.bookings.delete",
		"student.counseling.view", "student.counseling.create", "student.counseling.update", "student.counseling.delete",
		"student.scholarship.view", "student.scholarship.create",
		"student.aspirations.view", "student.aspirations.create", "student.aspirations.update",
		"student.insurance.view",
		"student.presensi.view",
	}},
}

var defaultRBACRoles = []models.RBACRole{
	{Key: "super_admin", Label: "Super Admin", Description: "Otoritas penuh untuk seluruh modul dan pengaturan sistem.", IsSystem: true, Status: "active", Permissions: mustJSON([]string{"*"})},
	{Key: "mahasiswa", Label: "Mahasiswa", Description: "Akses dasar mahasiswa untuk layanan akademik dan kemahasiswaan.", IsSystem: true, Status: "active", Permissions: mustJSON([]string{"student.dashboard.view", "student.profile.view", "student.profile.update", "student.kencana.view", "student_kencana_view", "student.kencana.manage", "student.achievement.view", "student.achievement.create", "student.achievement.update", "student.achievement.delete", "student.organizations.view", "student.organizations.create", "student.organizations.update", "student.organizations.delete", "student.health.view", "student.health.records.view", "student.health.records.create", "student.health.records.update", "student.health.records.delete", "student.health.bookings.view", "student.health.bookings.create", "student.health.bookings.update", "student.health.bookings.delete", "student.counseling.view", "student.counseling.create", "student.counseling.update", "student.counseling.delete", "student.scholarship.view", "student.scholarship.create", "student.aspirations.view", "student.aspirations.create", "student.aspirations.update", "student.insurance.view", "student.presensi.view"})},
}

func mustJSON(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}

func EnsureDefaultRBACRoles(db *gorm.DB) {
	var count int64
	db.Model(&models.RBACRole{}).Count(&count)
	if count > 0 {
		// Jika sudah ada role di DB, berarti sistem sudah di-seed.
		// Jangan lakukan pengecekan lagi agar role yang dihapus tidak bangkit kembali.
		return
	}

	for _, role := range defaultRBACRoles {
		var existing models.RBACRole
		if err := db.Unscoped().Where("key = ?", role.Key).First(&existing).Error; err == gorm.ErrRecordNotFound {
			db.Create(&role)
		}
	}
}

func GetUsers(c *fiber.Ctx) error {
	type UserWithContext struct {
		models.User
		FakultasNama  string `json:"fakultas_nama"`
		IdentityName  string `json:"identity_name"`
		IdentityCode  string `json:"identity_code"`
		ProdiNama     string `json:"prodi_nama"`
		OrmawaNama    string `json:"ormawa_nama"`
		FotoURL       string `json:"foto_url"`
		RoleScopeType string `json:"roleScopeType"`
	}

	var results []UserWithContext
	// Hardened SQL join with explicit quoting for PostgreSQL schema/table/column resolution
	err := config.DB.Table("public.users").
		Select(`
			"public"."users".*, 
			f.nama as fakultas_nama,
			COALESCE(m.nama_mahasiswa, d.nama, ps.nama, km.name, tk.nama, NULLIF(TRIM("public"."users".nama_lengkap), '')) as identity_name,
			COALESCE(m.nim, d.n_id_n) as identity_code,
			p.nama as prodi_nama,
			COALESCE(km.scope_type, tk.scope_type, ps.scope_type) as role_scope_type,
			COALESCE(m.foto_url, tk.foto_url, '') as foto_url,
			(SELECT orm.nama FROM ormawa.ormawa_anggota oa 
			 JOIN ormawa.ormawa orm ON orm.id = oa.ormawa_id 
			 WHERE oa.mahasiswa_id = m.id LIMIT 1) as ormawa_nama
		`).
		Joins(`LEFT JOIN "fakultas"."fakultas" f ON f.id = "public"."users".fakultas_id`).
		Joins(`LEFT JOIN "mahasiswa"."mahasiswa" m ON m.pengguna_id = "public"."users".id`).
		Joins(`LEFT JOIN "fakultas"."program_studi" p ON p.id = COALESCE(m.prodi_id, "public"."users".program_studi_id)`).
		Joins(`LEFT JOIN "fakultas"."dosen" d ON d.pengguna_id = "public"."users".id`).
		Joins(`LEFT JOIN "psikolog"."profiles" ps ON ps.user_id = "public"."users".id`).
		Joins(`LEFT JOIN "mahasiswa"."kencana_mentors" km ON km.user_id = "public"."users".id`).
		Joins(`LEFT JOIN "public"."tenaga_kesehatan" tk ON tk.user_id = "public"."users".id`).
		Where(`"public"."users".deleted_at IS NULL`).
		Order(`"public"."users".created_at desc`).
		Scan(&results).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal sinkronisasi data identitas: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   results,
	})
}

func isAllowedRBACRole(role string) bool {
	EnsureDefaultRBACRoles(config.DB)
	parts := strings.Split(role, ",")
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		var count int64
		config.DB.Model(&models.RBACRole{}).Where("key = ? AND status = ?", p, "active").Count(&count)
		if count > 0 {
			continue
		}
		switch p {
		case "super_admin", "faculty_admin", "prodi_admin", "ormawa_admin", "ormawa", "mahasiswa", "student", "psikolog", "psychologist", "PSIKOLOG", "dosen", "DOSEN", "kencana_admin", "kencana_fakultas", "kencana_mentor", "tenaga_kesehatan", "tenagakes":
			// allowed
		default:
			return false
		}
	}
	return true
}

func determineRequiredProfiles(rolesStr string) (isPsikolog, isTenakes, isOrmawa, isFakultas, isMahasiswa bool) {
	roleLower := "," + strings.ToLower(rolesStr) + ","

	isPsikolog = strings.Contains(roleLower, ",psikolog,") || strings.Contains(roleLower, ",psychologist,")
	isTenakes = strings.Contains(roleLower, ",tenaga_kesehatan,") || strings.Contains(roleLower, ",tenagakes,")
	isOrmawa = strings.Contains(roleLower, ",ormawa_admin,") || strings.Contains(roleLower, ",ormawa,") || strings.Contains(roleLower, ",pengurus_ormawa,")
	isFakultas = strings.Contains(roleLower, ",faculty_admin,") || strings.Contains(roleLower, ",prodi_admin,") || strings.Contains(roleLower, ",kencana_fakultas,") || strings.Contains(roleLower, ",kencana_mentor,") || isOrmawa
	isMahasiswa = strings.Contains(roleLower, ",mahasiswa,") || strings.Contains(roleLower, ",student,")

	roleKeys := strings.Split(rolesStr, ",")
	for _, rKey := range roleKeys {
		rKey = strings.TrimSpace(rKey)
		if rKey == "" {
			continue
		}
		var rbac models.RBACRole
		if err := config.DB.Where("key = ?", rKey).First(&rbac).Error; err == nil {
			var perms []string
			if err := json.Unmarshal(rbac.Permissions, &perms); err == nil {
				for _, p := range perms {
					if strings.HasPrefix(p, "psychologist.") {
						isPsikolog = true
					}
					if strings.HasPrefix(p, "klinik.") || strings.HasPrefix(p, "tenagakes.") || strings.HasPrefix(p, "health.") {
						isTenakes = true
					}
					if strings.HasPrefix(p, "ormawa.") {
						isOrmawa = true
					}
					if strings.HasPrefix(p, "faculty.") || strings.HasPrefix(p, "program_studi.") || strings.HasPrefix(p, "faculty_") || p == "students.view" {
						isFakultas = true
					}
				}
			}
		}
	}
	return
}

func GetRBACRoles(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	hasAccess := strings.ToLower(userRole) == "super_admin"
	if !hasAccess {
		var rbacRole models.RBACRole
		if err := config.DB.Where("key = ?", userRole).First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				for _, p := range permissions {
					if p == "*" || p == "rbac.roles.view" || p == "rbac.roles.manage" {
						hasAccess = true
						break
					}
				}
			}
		}
	}
	if !hasAccess {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Hanya role dengan izin melihat RBAC yang dapat melihat data ini"})
	}
	EnsureDefaultRBACRoles(config.DB)
	var roles []models.RBACRole
	if err := config.DB.Order("is_system desc, key asc").Find(&roles).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memuat role RBAC"})
	}
	return c.JSON(fiber.Map{"status": "success", "data": fiber.Map{"roles": roles, "catalog": rbacPermissionCatalog}})
}

func CreateRBACRole(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	hasAccess := strings.ToLower(userRole) == "super_admin"
	if !hasAccess {
		var rbacRole models.RBACRole
		if err := config.DB.Where("key = ?", userRole).First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				for _, p := range permissions {
					if p == "*" || p == "rbac.roles.manage" {
						hasAccess = true
						break
					}
				}
			}
		}
	}
	if !hasAccess {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Hanya role dengan izin kelola RBAC yang dapat membuat role"})
	}
	type reqBody struct {
		Key         string   `json:"key"`
		Label       string   `json:"label"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload role tidak valid"})
	}
	req.Key = strings.ToLower(strings.TrimSpace(req.Key))
	req.Label = strings.TrimSpace(req.Label)
	if req.Key == "" || req.Label == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Role key dan label wajib diisi"})
	}
	role := models.RBACRole{Key: req.Key, Label: req.Label, Description: req.Description, Permissions: mustJSON(req.Permissions), Status: "active", IsSystem: false}
	if err := config.DB.Create(&role).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Gagal membuat role: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Role RBAC berhasil dibuat", "data": role})
}

func UpdateRBACRole(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	hasAccess := strings.ToLower(userRole) == "super_admin"
	if !hasAccess {
		var rbacRole models.RBACRole
		if err := config.DB.Where("key = ?", userRole).First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				for _, p := range permissions {
					if p == "*" || p == "rbac.roles.manage" {
						hasAccess = true
						break
					}
				}
			}
		}
	}
	if !hasAccess {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Hanya role dengan izin kelola RBAC yang dapat mengubah role"})
	}
	type reqBody struct {
		Label       string   `json:"label"`
		Description string   `json:"description"`
		Permissions []string `json:"permissions"`
		Status      string   `json:"status"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload role tidak valid"})
	}
	var role models.RBACRole
	if err := config.DB.First(&role, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Role tidak ditemukan"})
	}
	// Proteksi: role super_admin tidak boleh dinonaktifkan
	if role.Key == "super_admin" && req.Status == "inactive" {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Role super_admin tidak dapat dinonaktifkan"})
	}
	if strings.TrimSpace(req.Label) != "" {
		role.Label = strings.TrimSpace(req.Label)
	}
	role.Description = req.Description
	role.Permissions = mustJSON(req.Permissions)
	if req.Status == "inactive" || req.Status == "active" {
		role.Status = req.Status
	}
	if err := config.DB.Save(&role).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan role"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Permission role berhasil disimpan", "data": role})
}

func DeleteRBACRole(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	hasAccess := strings.ToLower(userRole) == "super_admin"
	if !hasAccess {
		var rbacRole models.RBACRole
		if err := config.DB.Where("key = ?", userRole).First(&rbacRole).Error; err == nil {
			var permissions []string
			if err := json.Unmarshal(rbacRole.Permissions, &permissions); err == nil {
				for _, p := range permissions {
					if p == "*" || p == "rbac.roles.manage" {
						hasAccess = true
						break
					}
				}
			}
		}
	}
	if !hasAccess {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Hanya role dengan izin kelola RBAC yang dapat menghapus role"})
	}
	var role models.RBACRole
	if err := config.DB.First(&role, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Role tidak ditemukan"})
	}
	if role.Key == "super_admin" || role.Key == "student" || role.Key == "mahasiswa" {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Role Super Admin dan Mahasiswa adalah role inti sistem yang tidak dapat dihapus"})
	}
	// Cek apakah ada user yang masih menggunakan role ini
	var userCount int64
	config.DB.Model(&models.User{}).Where("role LIKE ?", "%"+role.Key+"%").Count(&userCount)
	if userCount > 0 {
		return c.Status(409).JSON(fiber.Map{
			"status":  "error",
			"message": "Role masih digunakan oleh " + fmt.Sprintf("%d", userCount) + " pengguna. Reassign terlebih dahulu sebelum menghapus.",
		})
	}
	if err := config.DB.Unscoped().Delete(&role).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus role"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Role berhasil dihapus"})
}

func normalizeRoleScope(scope string) string {
	s := strings.TrimSpace(scope)
	if s == "university" || s == "faculty" || s == "prodi" {
		return s
	}
	return "university"
}

// UpdateUserRole handles role assignment with RBAC hierarchy validation
func UpdateUserRole(c *fiber.Ctx) error {
	type UpdateRequest struct {
		UserID         uint   `json:"userId"`
		Role           string `json:"role"`
		OrmawaID       uint   `json:"ormawaId"`
		OrmawaAssign   string `json:"ormawaAssign"`
		FakultasID     uint   `json:"fakultasId"`
		ProgramStudiID uint   `json:"prodiId"`
		RoleScopeType  string `json:"roleScopeType"`
		Reason         string `json:"reason"`
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request payload"})
	}

	// 1. Validate request
	if req.UserID == 0 || req.Role == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "userId dan role wajib diisi"})
	}

	// 2. Get assigner info from JWT
	assignerID := c.Locals("user_id").(uint)
	assignerRole := c.Locals("role").(string)

	// 3. Find target user
	var targetUser models.User
	if err := config.DB.First(&targetUser, req.UserID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "User tidak ditemukan"})
	}

	// Prevent self role modification
	if assignerID == targetUser.ID {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Anda tidak bisa mengubah otorisasi diri sendiri"})
	}

	req.Role = strings.TrimSpace(req.Role)
	req.RoleScopeType = normalizeRoleScope(req.RoleScopeType)

	// 4. Validate role exists
	if !isAllowedRBACRole(req.Role) {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Role tidak valid: " + req.Role})
	}

	// ==========================================
	// ROLE HIERARCHY VALIDATION
	// ==========================================

	// 5. Super Admin validations
	if assignerRole == "super_admin" {
		// Super Admin TIDAK boleh assign role 'ormawa' (pengurus ormawa) langsung.
		// Harus di-assign oleh ormawa_admin.
		if req.Role == "ormawa" {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Super Admin tidak boleh assign role 'ormawa' langsung. Role ini harus di-assign oleh ormawa_admin.",
			})
		}
	}

	// 6. Admin Ormawa validations
	// Key DB yang benar adalah 'ormawa_admin' (bukan 'admin_ormawa')
	if assignerRole == "ormawa_admin" {
		// ormawa_admin hanya boleh assign role 'ormawa' (pengurus ormawa)
		if req.Role != "ormawa" {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Admin Ormawa hanya boleh assign role 'ormawa'",
			})
		}

		// ormawa_admin harus sertakan OrmawaID
		if req.OrmawaID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "OrmawaID wajib untuk Admin Ormawa assignment",
			})
		}

		// Verify target user adalah member di ormawa yang sama
		var mhs models.Mahasiswa
		if err := config.DB.Where("pengguna_id = ?", targetUser.ID).First(&mhs).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "Target user tidak memiliki profile mahasiswa",
			})
		}

		var membership models.OrmawaAnggota
		if err := config.DB.Where("mahasiswa_id = ? AND ormawa_id = ?", mhs.ID, req.OrmawaID).First(&membership).Error; err != nil {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Target user bukan member di ormawa ini",
			})
		}
	}

	// 7. Admin Fakultas validations
	// Key DB yang benar adalah 'faculty_admin' (bukan 'admin_fakultas')
	if assignerRole == "faculty_admin" {
		// faculty_admin hanya bisa assign prodi_admin
		allowedRoles := map[string]bool{"prodi_admin": true}
		if !allowedRoles[req.Role] {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Admin Fakultas hanya boleh assign 'prodi_admin'",
			})
		}

		// faculty_admin harus sertakan FakultasID
		if req.FakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": "FakultasID wajib untuk Admin Fakultas assignment",
			})
		}
	}

	// 8. Validate required fields berdasarkan role
	roleLower := "," + strings.ToLower(req.Role) + ","
	isPsikolog, isTenakes, isOrmawa, isFakultas, isMahasiswa := determineRequiredProfiles(req.Role)

	_ = isFakultas // unused here but useful

	if strings.Contains(roleLower, ",kencana_fakultas,") && req.FakultasID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas wajib dipilih untuk role kencana_fakultas"})
	}
	if strings.Contains(roleLower, ",kencana_mentor,") && req.RoleScopeType == "faculty" && req.FakultasID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas wajib dipilih untuk Mentor Kencana scope fakultas"})
	}

	if (isPsikolog || isTenakes) && req.RoleScopeType == "faculty" && req.FakultasID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas wajib dipilih untuk scope Fakultas"})
	}
	if (isPsikolog || isTenakes) && req.RoleScopeType == "prodi" && req.ProgramStudiID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program Studi wajib dipilih untuk scope Prodi"})
	}

	// 9. Check role conflict
	newRoles := strings.Split(req.Role, ",")

	if hasRoleConflict(newRoles) {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Kombinasi role tidak valid",
		})
	}

	// 10. Execute role assignment
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		var fakultasPtr *uint
		if req.FakultasID != 0 {
			fakultasPtr = &req.FakultasID
		}

		var ormawaPtr *uint
		if req.OrmawaID != 0 {
			ormawaPtr = &req.OrmawaID
		}

		var prodiPtr *uint
		if req.ProgramStudiID != 0 {
			prodiPtr = &req.ProgramStudiID
		}

		// Join new roles properly without duplicates
		uniqueRoles := make(map[string]bool)
		var finalRoles []string
		for _, r := range newRoles {
			r = strings.TrimSpace(r)
			if r != "" && !uniqueRoles[r] {
				uniqueRoles[r] = true
				finalRoles = append(finalRoles, r)
			}
		}
		finalRoleStr := strings.Join(finalRoles, ",")

		// Update user role via raw SQL to bypass any GORM association issues
		if err := tx.Exec("UPDATE public.users SET role = ?, ormawa_assign = ?, ormawa_id = ?, fakultas_id = ?, program_studi_id = ?, updated_at = ? WHERE id = ?", finalRoleStr, req.OrmawaAssign, ormawaPtr, fakultasPtr, prodiPtr, time.Now(), targetUser.ID).Error; err != nil {
			return err
		}

		// Handle Kencana Mentor
		if strings.Contains(roleLower, ",kencana_mentor,") {
			mentor := models.KencanaMentor{
				UserID:    targetUser.ID,
				Name:      strings.Split(targetUser.Email, "@")[0],
				Email:     targetUser.Email,
				ScopeType: req.RoleScopeType,
				Status:    "active",
			}
			if fakultasPtr != nil {
				mentor.FakultasID = fakultasPtr
			}

			var existing models.KencanaMentor
			if err := tx.Where("user_id = ?", targetUser.ID).First(&existing).Error; err == nil {
				existing.ScopeType = req.RoleScopeType
				existing.FakultasID = fakultasPtr
				existing.Status = "active"
				if err := tx.Save(&existing).Error; err != nil {
					return err
				}
			} else if err == gorm.ErrRecordNotFound {
				if err := tx.Create(&mentor).Error; err != nil {
					return err
				}
			}
		}

		// Handle Ormawa roles
		if isMahasiswa || isOrmawa {
			var mhs models.Mahasiswa
			err := tx.Where("pengguna_id = ?", targetUser.ID).First(&mhs).Error
			if err == gorm.ErrRecordNotFound {
				nim := strings.Split(targetUser.Email, "@")[0]

				isOrmawaOnly := isOrmawa && !isMahasiswa
				noFakultas := req.FakultasID == 0

				if isOrmawaOnly && noFakultas {
					// Insert without fakultas_id and program_studi_id columns entirely
					var result struct{ ID uint }
					err := tx.Raw(`
						INSERT INTO mahasiswa.mahasiswa 
							(pengguna_id, nama, nim, status_akun, status_akademik, semester_sekarang, tahun_masuk, created_at, updated_at)
						VALUES (?, ?, ?, 'Aktif', 'Aktif', 1, ?, NOW(), NOW())
						RETURNING id`,
						targetUser.ID, strings.Split(targetUser.Email, "@")[0], nim, time.Now().Year(),
					).Scan(&result).Error
					if err != nil {
						return fmt.Errorf("failed to create mahasiswa profile: %w", err)
					}
					mhs.ID = result.ID
				} else {
					mhs = models.Mahasiswa{
						PenggunaID:       targetUser.ID,
						Nama:             strings.Split(targetUser.Email, "@")[0],
						NIM:              nim,
						StatusAkun:       "Aktif",
						StatusAkademik:   "Aktif",
						SemesterSekarang: 1,
						TahunMasuk:       time.Now().Year(),
					}
					if req.FakultasID != 0 {
						mhs.FakultasID = req.FakultasID
					}
					if req.ProgramStudiID != 0 {
						mhs.ProgramStudiID = req.ProgramStudiID
					}
					if err := tx.Create(&mhs).Error; err != nil {
						return err
					}
				}
			} else if err != nil {
				return err
			}

			// Link to Ormawa
			if req.OrmawaID != 0 && isOrmawa {
				var exists bool
				tx.Raw("SELECT EXISTS(SELECT 1 FROM ormawa.ormawa_anggota WHERE mahasiswa_id = ? AND ormawa_id = ?)", mhs.ID, req.OrmawaID).Scan(&exists)
				if !exists {
					if err := tx.Exec(
						"INSERT INTO ormawa.ormawa_anggota (mahasiswa_id, ormawa_id, role, status, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
						mhs.ID, req.OrmawaID, "Ketua/Admin", "aktif", time.Now(), time.Now(), time.Now(),
					).Error; err != nil {
						return fmt.Errorf("failed to link user to ormawa: %w", err)
					}
				}
			}
		}

		// Handle Psikolog
		if isPsikolog {
			var psikolog models.Psikolog
			err := tx.Where("user_id = ?", targetUser.ID).First(&psikolog).Error
			if err == nil {
				psikolog.ScopeType = req.RoleScopeType
				psikolog.FakultasID = nil
				psikolog.ProgramStudiID = nil
				if req.RoleScopeType == "faculty" || req.RoleScopeType == "prodi" {
					if req.FakultasID != 0 {
						psikolog.FakultasID = &req.FakultasID
					}
				}
				if req.RoleScopeType == "prodi" {
					if req.ProgramStudiID != 0 {
						psikolog.ProgramStudiID = &req.ProgramStudiID
					}
				}
				if err := tx.Save(&psikolog).Error; err != nil {
					return fmt.Errorf("failed to update psikolog profile: %w", err)
				}
			} else if err == gorm.ErrRecordNotFound {
				psikolog = models.Psikolog{
					UserID:       targetUser.ID,
					Nama:         strings.Split(targetUser.Email, "@")[0],
					Email:        targetUser.Email,
					Spesialisasi: "Umum",
					IsAktif:      true,
					ScopeType:    req.RoleScopeType,
				}
				if req.RoleScopeType == "faculty" || req.RoleScopeType == "prodi" {
					if req.FakultasID != 0 {
						psikolog.FakultasID = &req.FakultasID
					}
				}
				if req.RoleScopeType == "prodi" {
					if req.ProgramStudiID != 0 {
						psikolog.ProgramStudiID = &req.ProgramStudiID
					}
				}
				if err := tx.Create(&psikolog).Error; err != nil {
					return fmt.Errorf("failed to create psikolog profile: %w", err)
				}
			}
		}

		// Handle Tenaga Kesehatan
		if isTenakes {
			var tk models.TenagaKesehatan
			err := tx.Where("user_id = ?", targetUser.ID).First(&tk).Error
			if err == nil {
				tk.ScopeType = req.RoleScopeType
				tk.FakultasID = nil
				tk.ProgramStudiID = nil
				if req.RoleScopeType == "faculty" || req.RoleScopeType == "prodi" {
					if req.FakultasID != 0 {
						tk.FakultasID = &req.FakultasID
					}
				}
				if req.RoleScopeType == "prodi" {
					if req.ProgramStudiID != 0 {
						tk.ProgramStudiID = &req.ProgramStudiID
					}
				}
				if err := tx.Save(&tk).Error; err != nil {
					return fmt.Errorf("failed to update tenaga kesehatan profile: %w", err)
				}
			} else if err == gorm.ErrRecordNotFound {
				tk = models.TenagaKesehatan{
					UserID:       targetUser.ID,
					Nama:         strings.Split(targetUser.Email, "@")[0],
					Email:        targetUser.Email,
					NoHP:         "-",
					Spesialisasi: "Pemeriksaan Umum",
					FotoURL:      "",
					Lokasi:       "Klinik Kampus",
					IsAktif:      true,
					ScopeType:    req.RoleScopeType,
				}
				if req.RoleScopeType == "faculty" || req.RoleScopeType == "prodi" {
					if req.FakultasID != 0 {
						tk.FakultasID = &req.FakultasID
					}
				}
				if req.RoleScopeType == "prodi" {
					if req.ProgramStudiID != 0 {
						tk.ProgramStudiID = &req.ProgramStudiID
					}
				}
				if err := tx.Create(&tk).Error; err != nil {
					return fmt.Errorf("failed to create tenaga kesehatan profile: %w", err)
				}
			}
		}

		// Log audit trail
		audit := models.LogAktivitas{
			UserID:    assignerID,
			Aktivitas: "ROLE_ASSIGNMENT",
			Deskripsi: fmt.Sprintf("Assign role %s to user %s (%d)", req.Role, targetUser.Email, req.UserID),
			IPAddress: c.IP(),
		}
		// Gunakan config.DB agar error tidak merusak scope tx utama jika tidak fatal
		if err := config.DB.Create(&audit).Error; err != nil {
			fmt.Printf("Warning: Failed to create audit log: %v\n", err)
		}

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Role assignment failed: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Role %s berhasil di-assign ke %s", req.Role, targetUser.Email),
		"data": fiber.Map{
			"user_id":  req.UserID,
			"email":    targetUser.Email,
			"new_role": req.Role,
		},
	})
}

// hasRoleConflict mengecek kombinasi role yang tidak valid
func hasRoleConflict(roles []string) bool {
	roleMap := make(map[string]bool)
	for _, r := range roles {
		roleMap[strings.ToLower(strings.TrimSpace(r))] = true
	}

	// Define invalid combinations
	// PENTING: Gunakan key yang sama dengan database (rbac_roles.key)
	invalidCombinations := [][]string{
		{"super_admin", "mahasiswa"},
		{"super_admin", "student"},
		{"super_admin", "dosen"},
		{"super_admin", "psikolog"},
		{"super_admin", "psychologist"},
		{"super_admin", "tenaga_kesehatan"},
		{"student", "dosen"},
		{"student", "psikolog"},
		{"student", "psychologist"},
		{"student", "tenaga_kesehatan"},
		{"student", "faculty_admin"},
		{"student", "prodi_admin"},
		{"student", "kencana_admin"},
		{"student", "kencana_fakultas"},
		{"dosen", "psikolog"},
		{"dosen", "psychologist"},
		{"dosen", "tenaga_kesehatan"},
		// ormawa_admin dan faculty_admin tidak boleh digabung
		{"ormawa_admin", "faculty_admin"},
		// ormawa_admin tidak boleh punya prodi_admin sekaligus
		{"ormawa_admin", "prodi_admin"},
		// faculty_admin tidak boleh menjadi pengurus ormawa biasa
		{"faculty_admin", "ormawa"},
	}

	for _, combo := range invalidCombinations {
		hasFirst := roleMap[combo[0]]
		hasSecond := roleMap[combo[1]]
		if hasFirst && hasSecond {
			return true
		}
	}

	return false
}

// GetAuditLogs returns all historical actions performed in the system
func GetAuditLogs(c *fiber.Ctx) error {
	var logs []models.LogAktivitas
	result := config.DB.Preload("User").Order("created_at desc").Limit(100).Find(&logs)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Database error retrieving logs"})
	}
	return c.JSON(fiber.Map{"status": "success", "data": logs})
}

// ExportAuditLogsCSV generates a CSV file of audit logs and serves it
func ExportAuditLogsCSV(c *fiber.Ctx) error {
	var logs []models.LogAktivitas
	if err := config.DB.Preload("User").Order("created_at desc").Limit(1000).Find(&logs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil log aktivitas"})
	}

	fileName := fmt.Sprintf("export_audit_%d.csv", time.Now().UnixNano())
	tmpPath := filepath.Join(os.TempDir(), fileName)

	file, err := os.Create(tmpPath)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuat file temporary"})
	}
	defer file.Close()
	defer os.Remove(tmpPath)

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write Headers
	writer.Write([]string{"Timestamp (UTC)", "Operator Name", "Operator Email", "IP Address", "Aktivitas", "Deskripsi"})

	// Write Data
	for _, logAct := range logs {
		opName := "System"
		opEmail := "System"
		if logAct.User.ID != 0 {
			opName = logAct.User.NamaLengkap
			if opName == "" {
				opName = logAct.User.Email
			}
			opEmail = logAct.User.Email
		}
		writer.Write([]string{
			logAct.CreatedAt.Format(time.RFC3339),
			opName,
			opEmail,
			logAct.IPAddress,
			logAct.Aktivitas,
			logAct.Deskripsi,
		})
	}
	writer.Flush()
	file.Close() // Explicit close to ensure flushing before fiber SendFile reads it

	c.Set("Content-Type", "text/csv")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="audit_log_forensik_%d.csv"`, time.Now().Unix()))
	return c.SendFile(tmpPath)
}

func CreateUser(c *fiber.Ctx) error {
	type CreateRequest struct {
		Email          string `json:"Email"`
		Password       string `json:"Password"`
		Role           string `json:"Role"`
		Nama           string `json:"Nama"`
		FakultasID     uint   `json:"FakultasID"`
		ProgramStudiID uint   `json:"ProgramStudiID"`
		OrmawaID       uint   `json:"OrmawaID"`
		OrmawaAssign   string `json:"OrmawaAssign"`
		RoleScopeType  string `json:"RoleScopeType"`
		Phone          string `json:"Phone"`
	}

	var req CreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	if req.Email == "" || req.Password == "" || req.Role == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Email, Password dan Role wajib diisi"})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Role = strings.TrimSpace(req.Role)
	req.Nama = strings.TrimSpace(req.Nama)
	req.RoleScopeType = normalizeRoleScope(req.RoleScopeType)

	if !isAllowedRBACRole(req.Role) {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Role tidak valid"})
	}

	userRole, ok := c.Locals("role").(string)
	if !ok {
		userRole = ""
	}
	permissions, ok := c.Locals("permissions").([]string)
	if !ok {
		permissions = []string{}
	}

	roleLowerStr := "," + strings.ToLower(req.Role) + ","
	
	if !middleware.HasPermission(userRole, permissions, "rbac.users.create") {
		if strings.Contains(roleLowerStr, ",psikolog,") {
			if !middleware.HasPermission(userRole, permissions, "psychologist.core.create") {
				return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak. Anda tidak memiliki izin untuk membuat Psikolog."})
			}
		} else if strings.Contains(roleLowerStr, ",tenagakes,") {
			if !middleware.HasPermission(userRole, permissions, "health.core.create") {
				return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak. Anda tidak memiliki izin untuk membuat Tenaga Kesehatan."})
			}
		} else {
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak. Anda tidak memiliki izin untuk membuat User."})
		}
	}

	newRoles := strings.Split(req.Role, ",")
	if hasRoleConflict(newRoles) {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Kombinasi role tidak valid (hirarki dilanggar)",
		})
	}

	roleLower := "," + strings.ToLower(req.Role) + ","
	isPsikolog, isTenakes, isOrmawa, isFakultas, isMahasiswa := determineRequiredProfiles(req.Role)

	requiresFakultas := isFakultas || isMahasiswa
	if strings.Contains(roleLower, ",kencana_mentor,") && req.RoleScopeType == "faculty" {
		requiresFakultas = true
	}

	if requiresFakultas && req.FakultasID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas wajib dipilih"})
	}

	if (isPsikolog || isTenakes) && req.RoleScopeType == "faculty" && req.FakultasID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas wajib dipilih untuk scope Fakultas"})
	}
	if (isPsikolog || isTenakes) && req.RoleScopeType == "prodi" && req.ProgramStudiID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program Studi wajib dipilih untuk scope Prodi"})
	}

	if isOrmawa && req.ProgramStudiID != 0 {
		var prodi models.ProgramStudi
		if err := config.DB.First(&prodi, req.ProgramStudiID).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program studi tidak valid"})
		}
		if req.FakultasID != 0 && prodi.FakultasID != req.FakultasID {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program studi tidak sesuai fakultas"})
		}
	}

	if isMahasiswa {
		if req.ProgramStudiID == 0 {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program studi wajib dipilih untuk mahasiswa"})
		}
	}

	if strings.Contains(roleLower, ",prodi_admin,") {
		if req.ProgramStudiID == 0 {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program studi wajib dipilih untuk Admin Prodi"})
		}
	}

	// 1. Hash Password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengamankan password"})
	}

	// 2. Begin Transaction
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Create User
		user := models.User{
			Email:        req.Email,
			Password:     string(hashedPassword),
			Role:         req.Role,
			OrmawaAssign: req.OrmawaAssign,
			NamaLengkap:  req.Nama, // Simpan nama lengkap ke public.users
		}

		// Set FakultasID for Admin/Faculty roles
		if req.FakultasID != 0 {
			user.FakultasID = &req.FakultasID
		}

		// Set OrmawaID if provided
		if req.OrmawaID != 0 {
			user.OrmawaID = &req.OrmawaID
		}

		if req.ProgramStudiID != 0 {
			user.ProgramStudiID = &req.ProgramStudiID
		}

		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// 2. Create Identity Link (Mahasiswa/Dosen/etc)
		if isMahasiswa || isOrmawa {
			nim := strings.Split(req.Email, "@")[0] // Fallback NIM from email

			// For ormawa users without a faculty, we must use raw SQL to avoid inserting
			// FakultasID=0 which would violate the FK constraint (zero is not a valid faculty ID)
			isOrmawaOnly := isOrmawa && !isMahasiswa
			noFakultas := req.FakultasID == 0

			var mhsID uint
			if isOrmawaOnly && noFakultas {
				// Insert without fakultas_id and program_studi_id columns entirely
				var result struct{ ID uint }
				err := tx.Raw(`
					INSERT INTO mahasiswa.mahasiswa 
						(pengguna_id, nama, nim, status_akun, status_akademik, semester_sekarang, tahun_masuk, created_at, updated_at)
					VALUES (?, ?, ?, 'Aktif', 'Aktif', 1, ?, NOW(), NOW())
					RETURNING id`,
					user.ID, req.Nama, nim, time.Now().Year(),
				).Scan(&result).Error
				if err != nil {
					return fmt.Errorf("gagal membuat profil mahasiswa: %w", err)
				}
				mhsID = result.ID
			} else {
				// Normal creation with FakultasID / ProgramStudiID
				mhs := models.Mahasiswa{
					PenggunaID:       user.ID,
					Nama:             req.Nama,
					NIM:              nim,
					FakultasID:       req.FakultasID,
					ProgramStudiID:   req.ProgramStudiID,
					StatusAkun:       "Aktif",
					StatusAkademik:   "Aktif",
					SemesterSekarang: 1,
					TahunMasuk:       time.Now().Year(),
				}
				if err := tx.Create(&mhs).Error; err != nil {
					return err
				}
				mhsID = mhs.ID
			}

			// Assign to Ormawa if provided
			if isOrmawa && req.OrmawaID != 0 {
				tx.Exec("INSERT INTO ormawa.ormawa_anggota (mahasiswa_id, ormawa_id, role, status, joined_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
					mhsID, req.OrmawaID, "Ketua/Admin", "aktif", time.Now(), time.Now(), time.Now())
			}
		}

		if strings.Contains(roleLower, ",dosen,") {
			nidn := strings.Split(req.Email, "@")[0]
			dosen := models.Dosen{
				PenggunaID:     user.ID,
				Nama:           req.Nama,
				NIDN:           nidn,
				FakultasID:     req.FakultasID,
				ProgramStudiID: req.ProgramStudiID,
			}
			if err := tx.Create(&dosen).Error; err != nil {
				return err
			}
		}

		if isPsikolog {
			psikolog := models.Psikolog{
				UserID:       user.ID,
				Nama:         req.Nama,
				Email:        req.Email,
				Spesialisasi: "Umum", // Default spesialisasi
				IsAktif:      true,
				ScopeType:    req.RoleScopeType,
			}
			if req.RoleScopeType == "faculty" || req.RoleScopeType == "prodi" {
				if req.FakultasID != 0 {
					psikolog.FakultasID = &req.FakultasID
				}
			}
			if req.RoleScopeType == "prodi" {
				if req.ProgramStudiID != 0 {
					psikolog.ProgramStudiID = &req.ProgramStudiID
				}
			}
			if err := tx.Create(&psikolog).Error; err != nil {
				return err
			}
		}

		if isTenakes {
			tk := models.TenagaKesehatan{
				UserID:       user.ID,
				Nama:         req.Nama,
				Email:        req.Email,
				NoHP:         "-",
				Spesialisasi: "Pemeriksaan Umum",
				FotoURL:      "",
				Lokasi:       "Klinik Kampus",
				IsAktif:      true,
				ScopeType:    req.RoleScopeType,
			}
			if req.RoleScopeType == "faculty" || req.RoleScopeType == "prodi" {
				if req.FakultasID != 0 {
					tk.FakultasID = &req.FakultasID
				}
			}
			if req.RoleScopeType == "prodi" {
				if req.ProgramStudiID != 0 {
					tk.ProgramStudiID = &req.ProgramStudiID
				}
			}
			if err := tx.Create(&tk).Error; err != nil {
				return err
			}
		}

		if strings.Contains(roleLower, ",kencana_mentor,") {
			mentor := models.KencanaMentor{
				UserID:    user.ID,
				Name:      req.Nama,
				Email:     req.Email,
				Status:    "active",
				ScopeType: req.RoleScopeType,
			}
			if req.RoleScopeType == "faculty" && req.FakultasID != 0 {
				mentor.FakultasID = &req.FakultasID
			}
			if err := tx.Create(&mentor).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate key") {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Email/NIM/NIDN sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal registrasi akun: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Akun berhasil diregistrasi dengan identitas terhubung"})
}

func DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")

	// Cari user yang akan dihapus
	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "User tidak ditemukan"})
	}

	// Proteksi: akun super_admin tidak boleh dihapus langsung
	if strings.Contains(user.Role, "super_admin") {
		// Pastikan masih ada super_admin aktif lainnya
		var count int64
		config.DB.Model(&models.User{}).Where("role LIKE ? AND id != ? AND deleted_at IS NULL", "%super_admin%", user.ID).Count(&count)
		if count == 0 {
			return c.Status(403).JSON(fiber.Map{
				"status":  "error",
				"message": "Tidak dapat menghapus satu-satunya akun Super Admin yang tersisa",
			})
		}
	}

	if err := config.DB.Unscoped().Delete(&models.User{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to delete user"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "User deleted"})
}

// UpdateUser allows updating nama_lengkap and no_hp of an existing user,
// and propagates the name change to linked profile tables.
func UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")

	type UpdateRequest struct {
		NamaLengkap string `json:"nama_lengkap"`
		NoHP        string `json:"no_hp"`
	}
	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	req.NamaLengkap = strings.TrimSpace(req.NamaLengkap)
	if req.NamaLengkap == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Nama lengkap tidak boleh kosong"})
	}

	var user models.User
	if err := config.DB.First(&user, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "User tidak ditemukan"})
	}

	// Proteksi: super_admin hanya bisa diupdate oleh super_admin sendiri (sudah dijamin middleware)
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update public.users
		updates := map[string]interface{}{"nama_lengkap": req.NamaLengkap}
		if req.NoHP != "" {
			updates["no_hp"] = strings.TrimSpace(req.NoHP)
		}
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			return err
		}

		// 2. Propagate ke tabel profil yang relevan
		roleLower := strings.ToLower(user.Role)
		isPsikolog, isTenakes, isOrmawa, _, isMahasiswa := determineRequiredProfiles(user.Role)

		if isMahasiswa || isOrmawa {
			tx.Exec(`UPDATE mahasiswa.mahasiswa SET nama = ?, updated_at = NOW() WHERE pengguna_id = ?`, req.NamaLengkap, user.ID)
		}
		if strings.Contains(roleLower, "dosen") {
			tx.Exec(`UPDATE fakultas.dosen SET nama = ?, updated_at = NOW() WHERE pengguna_id = ?`, req.NamaLengkap, user.ID)
		}
		if isPsikolog {
			tx.Exec(`UPDATE psikolog.profiles SET nama = ?, updated_at = NOW() WHERE user_id = ?`, req.NamaLengkap, user.ID)
		}
		if strings.Contains(roleLower, "kencana_mentor") {
			tx.Exec(`UPDATE mahasiswa.kencana_mentors SET name = ?, updated_at = NOW() WHERE user_id = ?`, req.NamaLengkap, user.ID)
		}
		if isTenakes {
			tx.Exec(`UPDATE public.tenaga_kesehatan SET nama = ?, updated_at = NOW() WHERE user_id = ?`, req.NamaLengkap, user.ID)
		}

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan perubahan: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Identitas berhasil diperbarui"})
}

// GetDashboardStats returns high-level metrics for University oversight with optional filters
func GetDashboardStats(c *fiber.Ctx) error {
	periodID := c.QueryInt("period_id", 0)
	if periodID == 0 {
		headerPeriodId := c.Get("X-Academic-Period-ID")
		if headerPeriodId != "" && headerPeriodId != "undefined" && headerPeriodId != "null" && headerPeriodId != "all" {
			if parsedPid, err := strconv.ParseUint(headerPeriodId, 10, 32); err == nil {
				periodID = int(parsedPid)
			}
		}
	}
	tahunMasuk := c.QueryInt("tahun_masuk", 0)
	fakultasID := c.QueryInt("fakultas_id", 0)
	if fakultasID == 0 {
		headerFid := c.Get("X-Faculty-ID")
		if headerFid != "" && headerFid != "undefined" && headerFid != "null" && headerFid != "all" {
			if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
				fakultasID = int(parsedFid)
			}
		}
	}
	prodiID := c.QueryInt("program_studi_id", 0)
	if prodiID == 0 {
		headerPid := c.Get("X-Prodi-ID")
		if headerPid != "" && headerPid != "undefined" && headerPid != "null" && headerPid != "all" {
			if parsedPid, err := strconv.ParseUint(headerPid, 10, 32); err == nil {
				prodiID = int(parsedPid)
			}
		}
	}
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var filterStartYear, filterEndYear int
	var hasDateFilter bool
	var filterStartDate, filterEndDate time.Time

	if startDateStr != "" && endDateStr != "" {
		sDate, err1 := time.Parse("2006-01-02", startDateStr)
		eDate, err2 := time.Parse("2006-01-02", endDateStr)
		if err1 == nil && err2 == nil {
			hasDateFilter = true
			filterStartDate = sDate
			filterEndDate = time.Date(eDate.Year(), eDate.Month(), eDate.Day(), 23, 59, 59, 999999999, eDate.Location())
			filterStartYear = sDate.Year()
			filterEndYear = eDate.Year()
		}
	}

	// If period_id is provided, resolve the academic year for student filtering
	var periodYear int // Separate from tahunMasuk — period uses <=, angkatan uses =
	if periodID > 0 {
		var selectedPeriod models.AcademicPeriod
		if err := config.DB.First(&selectedPeriod, periodID).Error; err == nil {
			// AcademicYear format: "2025/2026"
			// Show students who were active during this period (tahun_masuk <= year)
			fmt.Sscanf(selectedPeriod.AcademicYear, "%d", &periodYear)
		}
	}

	// Base queries
	dbMhs := config.DB.Model(&models.Mahasiswa{})
	dbAsp := config.DB.Model(&models.Aspirasi{})
	dbProp := config.DB.Model(&models.Proposal{})
	dbAnggota := config.DB.Model(&models.OrmawaAnggota{})

	// Joins and Filters
	needMhsJoin := (tahunMasuk > 0) || (periodYear > 0) || (fakultasID > 0) || (prodiID > 0) || hasDateFilter

	if needMhsJoin {
		dbAsp = dbAsp.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.aspirasi.mahasiswa_id")
		dbProp = dbProp.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = ormawa.proposal.mahasiswa_id")
		dbAnggota = dbAnggota.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = ormawa.ormawa_anggota.mahasiswa_id")
	}

	if hasDateFilter {
		dbMhs = dbMhs.Where("mahasiswa.mahasiswa.tahun_masuk BETWEEN ? AND ?", filterStartYear, filterEndYear)
		dbAsp = dbAsp.Where("mahasiswa.aspirasi.created_at BETWEEN ? AND ?", filterStartDate, filterEndDate)
		dbProp = dbProp.Where("ormawa.proposal.created_at BETWEEN ? AND ?", filterStartDate, filterEndDate)
		dbAnggota = dbAnggota.Where("mahasiswa.mahasiswa.tahun_masuk BETWEEN ? AND ?", filterStartYear, filterEndYear)
	} else if tahunMasuk > 0 {
		// Exact angkatan filter
		dbMhs = dbMhs.Where("mahasiswa.mahasiswa.tahun_masuk = ?", tahunMasuk)
		dbAsp = dbAsp.Where("mahasiswa.mahasiswa.tahun_masuk = ?", tahunMasuk)
		dbProp = dbProp.Where("mahasiswa.mahasiswa.tahun_masuk = ?", tahunMasuk)
		dbAnggota = dbAnggota.Where("mahasiswa.mahasiswa.tahun_masuk = ?", tahunMasuk)
	} else if periodYear > 0 {
		// Period filter — show students active during this period
		dbMhs = dbMhs.Where("mahasiswa.mahasiswa.tahun_masuk <= ?", periodYear)
		dbAsp = dbAsp.Where("mahasiswa.mahasiswa.tahun_masuk <= ?", periodYear)
		dbProp = dbProp.Where("mahasiswa.mahasiswa.tahun_masuk <= ?", periodYear)
		dbAnggota = dbAnggota.Where("mahasiswa.mahasiswa.tahun_masuk <= ?", periodYear)
	}

	if fakultasID > 0 {
		dbMhs = dbMhs.Where("mahasiswa.mahasiswa.fakultas_id = ?", fakultasID)
		dbAsp = dbAsp.Where("mahasiswa.mahasiswa.fakultas_id = ?", fakultasID)
		dbProp = dbProp.Where("ormawa.proposal.fakultas_id = ?", fakultasID)
		dbAnggota = dbAnggota.Where("mahasiswa.mahasiswa.fakultas_id = ?", fakultasID)
	}

	if prodiID > 0 {
		dbMhs = dbMhs.Where("mahasiswa.mahasiswa.prodi_id = ?", prodiID)
		dbAsp = dbAsp.Where("mahasiswa.mahasiswa.prodi_id = ?", prodiID)
		dbProp = dbProp.Where("mahasiswa.mahasiswa.prodi_id = ?", prodiID)
		dbAnggota = dbAnggota.Where("mahasiswa.mahasiswa.prodi_id = ?", prodiID)
	}

	var totalMhs int64
	var aspirasiAktif int64
	var slaOverdue int64
	var resolvedToday int64
	var antreanProposal int64
	var totalAnggotaOrmawa int64
	var totalBerita int64
	var beritaDraft int64
	var beritaPublished int64
	var avgIpk float64

	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	// 1. Combine Mahasiswa Total & Avg IPK
	var mhsStats struct {
		Total  int64
		AvgIpk float64
	}
	dbMhs.Session(&gorm.Session{}).Select(`
		COUNT(mahasiswa.mahasiswa.id) as total,
		COALESCE(AVG(NULLIF(mahasiswa.mahasiswa.ipk_terakhir, 0)), 0) as avg_ipk
	`).Scan(&mhsStats)
	totalMhs = mhsStats.Total
	avgIpk = mhsStats.AvgIpk

	// 2. Combine Aspirasi Queries
	var aspStats struct {
		Aktif         int64
		Overdue       int64
		ResolvedToday int64
	}
	dbAsp.Session(&gorm.Session{}).Select(`
		SUM(CASE WHEN mahasiswa.aspirasi.status != 'Selesai' THEN 1 ELSE 0 END) as aktif,
		SUM(CASE WHEN mahasiswa.aspirasi.status != 'Selesai' AND mahasiswa.aspirasi.deadline < ? THEN 1 ELSE 0 END) as overdue,
		SUM(CASE WHEN mahasiswa.aspirasi.status = 'Selesai' AND mahasiswa.aspirasi.updated_at >= ? THEN 1 ELSE 0 END) as resolved_today
	`, now, todayStart).Scan(&aspStats)
	aspirasiAktif = aspStats.Aktif
	slaOverdue = aspStats.Overdue
	resolvedToday = aspStats.ResolvedToday

	// 3. Keep Proposal Count (already single query)
	dbProp.Session(&gorm.Session{}).
		Joins("JOIN ormawa.ormawa o ON o.id = ormawa.proposal.ormawa_id").
		Where("(ormawa.proposal.status = ?) OR (ormawa.proposal.status = ? AND o.fakultas_id IS NULL)", "disetujui_fakultas", "diajukan").
		Count(&antreanProposal)

	// 4. Keep Anggota Count
	dbAnggota.Session(&gorm.Session{}).Count(&totalAnggotaOrmawa)

	// 5. Combine Berita Queries
	dbBerita := config.DB.Model(&models.Berita{})
	if hasDateFilter {
		dbBerita = dbBerita.Where("fakultas.berita.tanggal_publish BETWEEN ? AND ?", filterStartDate, filterEndDate)
	}
	dbBerita.Session(&gorm.Session{}).Count(&totalBerita)

	var beritaStats struct {
		Draft     int64
		Published int64
	}
	config.DB.Model(&models.Berita{}).Select(`
		SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft,
		SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) as published
	`).Scan(&beritaStats)
	beritaDraft = beritaStats.Draft
	beritaPublished = beritaStats.Published

	// Fetch dynamic list of available Tahun Masuk for the filter dropdown
	var tahunMasukList []int
	config.DB.Model(&models.Mahasiswa{}).Distinct("tahun_masuk").Order("tahun_masuk desc").Pluck("tahun_masuk", &tahunMasukList)

	// Fetch all Academic Periods
	var periods []models.AcademicPeriod
	config.DB.Order("sevima_id desc").Find(&periods)

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"total_mahasiswa":      totalMhs,
			"aspirasi_aktif":       aspirasiAktif,
			"sla_overdue":          slaOverdue,
			"resolved_today":       resolvedToday,
			"antrean_proposal":     antreanProposal,
			"total_anggota_ormawa": totalAnggotaOrmawa,
			"total_berita":         totalBerita,
			"avg_ipk":              avgIpk,
			"berita_draft":         beritaDraft,
			"berita_published":     beritaPublished,
			"tahun_masuk_list":     tahunMasukList,
			"periods":              periods,
		},
	})
}

// GetGlobalProposals returns proposals waiting for university approval.
// Logika dinamis:
//   - Proposal dari Ormawa dengan kategori.TerafiliasiFakultas=true WAJIB lewat Fakultas dulu (status disetujui_fakultas)
//   - Proposal dari Ormawa dengan kategori.TerafiliasiFakultas=false bypass Fakultas (status diajukan langsung ke univ)
//   - Backward compat: jika KategoriOrmawaID NULL, fallback ke cek FakultasID IS NULL
func GetGlobalProposals(c *fiber.Ctx) error {
	var proposals []models.Proposal
	result := config.DB.
		Preload("Ormawa").Preload("Ormawa.Fakultas").Preload("Ormawa.KategoriDetail").Preload("Fakultas").
		Joins("JOIN ormawa.ormawa o ON o.id = ormawa.proposal.ormawa_id").
		Joins("LEFT JOIN ormawa.kategori_ormawa kat ON kat.id = o.kategori_ormawa_id").
		Where(`(
			ormawa.proposal.status = 'disetujui_fakultas'
		) OR (
			ormawa.proposal.status = 'diajukan'
			AND (
				(kat.id IS NOT NULL AND kat.terafiliasi_fakultas = false)
				OR (kat.id IS NULL AND o.fakultas_id IS NULL)
			)
		)`).
		Order("ormawa.proposal.created_at desc").Find(&proposals)
	if result.Error != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": result.Error.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": proposals})
}

// ApproveProposalUniv final approval by university with financial integration
func ApproveProposalUniv(c *fiber.Ctx) error {
	id := c.Params("id")
	var proposal models.Proposal

	// Preload Ormawa (beserta KategoriDetail) untuk routing dinamis dan notifikasi
	if err := config.DB.Preload("Ormawa").Preload("Ormawa.KategoriDetail").First(&proposal, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Proposal not found"})
	}

	// Status guard dinamis berdasarkan KategoriOrmawa.TerafiliasiFakultas:
	// - TerafiliasiFakultas=true (misal Himpunan): WAJIB lewat Fakultas, status harus disetujui_fakultas
	// - TerafiliasiFakultas=false (misal BEM/UKM): bypass Fakultas, bisa approve dari status diajukan
	// - Backward compat: jika KategoriDetail null, fallback ke cek FakultasID
	isUnivLevel := false
	if proposal.Ormawa.KategoriDetail != nil {
		// Menggunakan flag kategori dinamis
		isUnivLevel = !proposal.Ormawa.KategoriDetail.TerafiliasiFakultas
	} else {
		// Fallback legacy: organisasi univ level jika FakultasID null
		isUnivLevel = proposal.Ormawa.FakultasID == nil
	}

	validStatuses := map[string]bool{
		"disetujui_fakultas": true,
	}
	if isUnivLevel {
		validStatuses["diajukan"] = true
	}
	if !validStatuses[proposal.Status] {
		if isUnivLevel {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Proposal harus berstatus 'diajukan' atau 'disetujui_fakultas' untuk bisa disetujui"})
		}
		kategoriNama := "Himpunan"
		if proposal.Ormawa.KategoriDetail != nil {
			kategoriNama = proposal.Ormawa.KategoriDetail.Nama
		}
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Proposal " + kategoriNama + " harus disetujui Fakultas terlebih dahulu"})
	}

	var body struct {
		TenggatHari int `json:"tenggat_hari"`
	}
	c.BodyParser(&body)

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Update status to final
		if err := tx.Model(&proposal).Update("status", "disetujui_univ").Error; err != nil {
			return err
		}

		// Award points to Ormawa: +20
		if err := gamifikasi.AwardOrmawaPoints(tx, proposal.OrmawaID, "proposal_disetujui", 20, "tambah", fmt.Sprintf("Proposal disetujui Universitas: %s", proposal.Judul)); err != nil {
			return err
		}

		// 2. Create financial mutation (Disbursement)
		mutation := models.OrmawaMutasiSaldo{
			OrmawaID:   proposal.OrmawaID,
			Tipe:       "pemasukan",
			Nominal:    proposal.Anggaran, // Now using Anggaran field from proposal
			Kategori:   "Pencairan Proposal",
			Deskripsi:  fmt.Sprintf("Pencairan dana Universitas untuk kegiatan: %s", proposal.Judul),
			Sumber:     "kampus",
			ProposalID: &proposal.ID,
			Tanggal:    time.Now(),
		}
		if err := tx.Create(&mutation).Error; err != nil {
			return err
		}

		// 3. Create Notification for Ormawa
		tx.Create(&models.OrmawaNotifikasi{
			OrmawaID: proposal.OrmawaID,
			Tipe:     "proposal",
			Judul:    "Dana Disyahkan Universitas",
			Pesan:    fmt.Sprintf("Proposal '%s' telah disetujui Universitas. Anggaran %v telah dicairkan ke kas organisasi.", proposal.Judul, proposal.Anggaran),
		})

		// 4. Set LPJ deadline (from SA input, fallback to ormawa setting, default 14)
		tenggatHari := 14
		if body.TenggatHari > 0 {
			tenggatHari = body.TenggatHari
		} else if proposal.Ormawa.TenggatLPJHari > 0 {
			tenggatHari = proposal.Ormawa.TenggatLPJHari
		}
		tenggat := time.Now().Add(time.Duration(tenggatHari) * 24 * time.Hour)
		if err := tx.Model(&proposal).Update("tenggat_lpj", tenggat).Error; err != nil {
			return err
		}

		// 5. Ensure draft LPJ exists
		var lpjCount int64
		if err := tx.Model(&models.LaporanPertanggungjawaban{}).Where("proposal_id = ?", proposal.ID).Count(&lpjCount).Error; err == nil && lpjCount == 0 {
			lpj := models.LaporanPertanggungjawaban{
				ProposalID:        proposal.ID,
				RealisasiAnggaran: 0,
				Status:            "draft",
				Catatan:           "LPJ otomatis di-draft setelah proposal disetujui Universitas.",
			}
			if err := tx.Create(&lpj).Error; err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memproses pengesahan & pencairan: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Proposal has been officially approved & funds disbursed"})
}

// RejectProposalUniv rejection with note and notification
func RejectProposalUniv(c *fiber.Ctx) error {
	id := c.Params("id")
	type RejectReq struct {
		Catatan string `json:"catatan"`
		Status  string `json:"status"` // Optional: "revisi" or "ditolak"
	}
	var req RejectReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Body request tidak valid"})
	}

	targetStatus := "ditolak"
	if req.Status == "revisi" {
		targetStatus = "revisi"
	}

	var proposal models.Proposal
	if err := config.DB.First(&proposal, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Proposal not found"})
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Update status and note
		updates := map[string]interface{}{
			"status":  targetStatus,
			"catatan": req.Catatan,
		}

		if err := tx.Model(&proposal).Updates(updates).Error; err != nil {
			return err
		}

		// Create Notification for Ormawa
		actionWord := "Ditolak"
		if targetStatus == "revisi" {
			actionWord = "Dikembalikan untuk Revisi"
		}

		tx.Create(&models.OrmawaNotifikasi{
			OrmawaID: proposal.OrmawaID,
			Tipe:     "proposal",
			Judul:    fmt.Sprintf("Proposal %s Univ", actionWord),
			Pesan:    fmt.Sprintf("Proposal '%s' %s dari Universitas dengan catatan: %s", proposal.Judul, strings.ToLower(actionWord), req.Catatan),
		})

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memproses penolakan: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Proposal has been sent back for revision"})
}

// GetAllFakultas master data
func GetAllFakultas(c *fiber.Ctx) error {
	var faks []models.Fakultas
	query := config.DB.Preload("ProgramStudi")

	if err := query.Find(&faks).Error; err != nil {
		fmt.Printf("[ERROR] GetAllFakultas: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil data Fakultas: " + err.Error()})
	}

	type FacultyWithCount struct {
		models.Fakultas
		JumlahProdi int `json:"jumlah_prodi"`
	}

	result := []FacultyWithCount{}
	for _, f := range faks {
		result = append(result, FacultyWithCount{
			Fakultas:    f,
			JumlahProdi: len(f.ProgramStudi),
		})
	}

	return c.JSON(fiber.Map{"status": "success", "data": result})
}

func CreateFakultas(c *fiber.Ctx) error {
	var fak models.Fakultas
	if err := c.BodyParser(&fak); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	if err := config.DB.Create(&fak).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": fak})
}

func UpdateFakultas(c *fiber.Ctx) error {
	id := c.Params("id")
	var fak models.Fakultas
	if err := config.DB.First(&fak, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Fakultas not found"})
	}
	var req struct {
		Nama string `json:"nama"`
		Kode string `json:"kode"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request body"})
	}
	if req.Nama != "" {
		fak.Nama = req.Nama
	}
	if req.Kode != "" {
		fak.Kode = req.Kode
	}
	config.DB.Save(&fak)
	return c.JSON(fiber.Map{"status": "success", "data": fak})
}

func DeleteFakultas(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.Fakultas{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Fakultas deleted"})
}

// ResetFakultas clears all data from the fakultas table
func ResetFakultas(c *fiber.Ctx) error {
	if err := config.DB.Exec("TRUNCATE TABLE fakultas.fakultas CASCADE").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengosongkan data fakultas: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Semua data fakultas berhasil dikosongkan (botak)"})
}

func GetAllOrmawa(c *fiber.Ctx) error {
	var baseOrgs []models.Ormawa
	if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").Order("nama asc").Find(&baseOrgs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	type OrmawWithCount struct {
		models.Ormawa
		JumlahAnggota int64 `json:"jumlah_anggota"`
	}
	var orgs []OrmawWithCount
	for _, o := range baseOrgs {
		var count int64
		config.DB.Model(&models.OrmawaAnggota{}).Where("ormawa_id = ?", o.ID).Count(&count)
		orgs = append(orgs, OrmawWithCount{o, count})
	}

	return c.JSON(fiber.Map{"status": "success", "data": orgs})
}

func GetAllStudents(c *fiber.Ctx) error {
	var mhs []models.Mahasiswa
	query := config.DB.Preload("Fakultas").Preload("ProgramStudi").Preload("Pengguna")

	headerPeriodId := c.Get("X-Academic-Period-ID")
	if headerPeriodId != "" && headerPeriodId != "undefined" && headerPeriodId != "null" && headerPeriodId != "all" {
		if parsedPeriodId, err := strconv.ParseUint(headerPeriodId, 10, 32); err == nil {
			var selectedPeriod models.AcademicPeriod
			if err := config.DB.First(&selectedPeriod, parsedPeriodId).Error; err == nil {
				// AcademicYear format: "2025/2026"
				// Show students who were ACTIVE during this period:
				// tahun_masuk <= first year of academic year (they enrolled at or before this period)
				var year int
				fmt.Sscanf(selectedPeriod.AcademicYear, "%d", &year)
				if year > 0 {
					query = query.Where("tahun_masuk <= ?", year)
				}
			}
		}
	}

	headerFid := c.Get("X-Faculty-ID")
	if headerFid == "" || headerFid == "undefined" || headerFid == "null" {
		headerFid = c.Query("fakultasId")
	}
	if headerFid != "" && headerFid != "undefined" && headerFid != "null" && headerFid != "all" {
		if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
			query = query.Where("fakultas_id = ?", parsedFid)
		}
	}

	headerPid := c.Get("X-Prodi-ID")
	if headerPid == "" || headerPid == "undefined" || headerPid == "null" {
		headerPid = c.Query("prodiId")
	}
	if headerPid != "" && headerPid != "undefined" && headerPid != "null" && headerPid != "all" {
		if parsedPid, err := strconv.ParseUint(headerPid, 10, 32); err == nil {
			query = query.Where("prodi_id = ?", parsedPid)
		}
	}

	statusAkun := c.Query("statusAkun")
	if statusAkun != "" && statusAkun != "undefined" && statusAkun != "null" && statusAkun != "all" {
		query = query.Where("status_akademik = ?", statusAkun)
	}

	// Search filter
	search := c.Query("search")
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("nama_mahasiswa ILIKE ? OR nim ILIKE ?", searchPattern, searchPattern)
	}

	// Count total data before pagination
	var totalData int64
	query.Model(&models.Mahasiswa{}).Count(&totalData)

	// Pagination
	page, _ := strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if limit < 1 {
		limit = 50
	}
	if limit > 1000 {
		limit = 1000 // max limit
	}
	offset := (page - 1) * limit

	query.Order("nama_mahasiswa asc").Limit(limit).Offset(offset).Find(&mhs)
	for i := range mhs {
		if mhs[i].Nama == "" && mhs[i].Pengguna.NamaLengkap != "" {
			mhs[i].Nama = mhs[i].Pengguna.NamaLengkap
		}
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   mhs,
		"pagination": fiber.Map{
			"total": totalData,
			"page":  page,
			"limit": limit,
		},
	})
}

func GetAllPsychologists(c *fiber.Ctx) error {
	var psychologists []models.Psikolog
	config.DB.Order("nama asc").Find(&psychologists)
	return c.JSON(fiber.Map{"status": "success", "data": psychologists})
}

func UpdatePsychologist(c *fiber.Ctx) error {
	id := c.Params("id")
	var psikolog models.Psikolog
	if err := config.DB.First(&psikolog, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Psikolog not found"})
	}
	if err := c.BodyParser(&psikolog); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	config.DB.Save(&psikolog)
	return c.JSON(fiber.Map{"status": "success", "data": psikolog})
}

func DeletePsychologist(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.Psikolog{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Psikolog deleted"})
}

func GetPsychologistSchedulesAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	log.Printf("[SCHEDULE-ADMIN] GetPsychologistSchedulesAdmin called for ID: %s", id)

	var psikolog models.Psikolog
	if err := config.DB.First(&psikolog, id).Error; err != nil {
		log.Printf("[SCHEDULE-ADMIN] Psikolog not found for ID: %s", id)
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Psikolog not found"})
	}

	days := []string{"Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"}
	var slots []models.PsikologScheduleSlot
	if err := config.DB.Where("psikolog_id = ?", psikolog.ID).Order("id asc").Find(&slots).Error; err != nil {
		log.Printf("[SCHEDULE-ADMIN] Failed to fetch slots: %v", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	log.Printf("[SCHEDULE-ADMIN] Found %d slots for psikolog_id=%d", len(slots), psikolog.ID)

	grouped := make([]fiber.Map, 0, len(days))
	for _, day := range days {
		daySlots := []fiber.Map{}
		enabled := false
		for _, slot := range slots {
			if slot.Hari == day {
				if slot.IsAktif != nil && *slot.IsAktif {
					enabled = true
				}
				daySlots = append(daySlots, fiber.Map{
					"id":           slot.ID,
					"kategori":     firstNonEmptyLocal(slot.Kategori, "Personal"),
					"start":        slot.JamMulai,
					"end":          slot.JamSelesai,
					"lokasi":       slot.Lokasi,
					"kuota":        slot.Kuota,
					"is_available": slot.IsAktif != nil && *slot.IsAktif,
				})
			}
		}
		grouped = append(grouped, fiber.Map{"day": day, "enabled": enabled, "slots": daySlots})
	}
	return c.JSON(fiber.Map{"status": "success", "data": grouped})
}

func SavePsychologistSchedulesAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	log.Printf("[SCHEDULE-ADMIN] SavePsychologistSchedulesAdmin called for ID: %s", id)

	var psikolog models.Psikolog
	if err := config.DB.First(&psikolog, id).Error; err != nil {
		log.Printf("[SCHEDULE-ADMIN] Psikolog not found for ID: %s", id)
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Psikolog not found"})
	}

	// Parse the raw body for debugging
	rawBody := string(c.Body())
	log.Printf("[SCHEDULE-ADMIN] Raw body (first 500 chars): %.500s", rawBody)

	var body []struct {
		Day     string `json:"day"`
		Enabled bool   `json:"enabled"`
		Slots   []struct {
			Kategori    string `json:"kategori"`
			Start       string `json:"start"`
			End         string `json:"end"`
			Lokasi      string `json:"lokasi"`
			Kuota       int    `json:"kuota"`
			IsAvailable *bool  `json:"is_available"`
		} `json:"slots"`
	}
	if err := c.BodyParser(&body); err != nil {
		log.Printf("[SCHEDULE-ADMIN] BodyParser error: %v", err)
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload jadwal tidak valid: " + err.Error()})
	}

	log.Printf("[SCHEDULE-ADMIN] Parsed %d days from body", len(body))
	for _, d := range body {
		log.Printf("[SCHEDULE-ADMIN]   Day=%s Enabled=%v Slots=%d", d.Day, d.Enabled, len(d.Slots))
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// HARD DELETE old slots (Unscoped to bypass soft-delete)
		if err := tx.Unscoped().Where("psikolog_id = ?", psikolog.ID).Delete(&models.PsikologScheduleSlot{}).Error; err != nil {
			log.Printf("[SCHEDULE-ADMIN] Failed to delete old slots: %v", err)
			return err
		}
		log.Printf("[SCHEDULE-ADMIN] Old slots deleted for psikolog_id=%d", psikolog.ID)

		for _, day := range body {
			for _, slot := range day.Slots {
				kuota := slot.Kuota
				if kuota <= 0 {
					kuota = 1
				}
				kategori := normalizeScheduleCategoryLocal(slot.Kategori)

				// is_aktif: if slot-level is_available was sent, use it; otherwise fall back to day.Enabled
				isAktif := day.Enabled
				if slot.IsAvailable != nil {
					isAktif = *slot.IsAvailable
				}

				isAktifVal := isAktif
				record := models.PsikologScheduleSlot{
					PsikologID: psikolog.ID,
					Hari:       day.Day,
					Kategori:   kategori,
					JamMulai:   slot.Start,
					JamSelesai: slot.End,
					Lokasi:     slot.Lokasi,
					Kuota:      kuota,
					IsAktif:    &isAktifVal,
				}
				if err := tx.Create(&record).Error; err != nil {
					log.Printf("[SCHEDULE-ADMIN] Failed to create slot for %s: %v", day.Day, err)
					return err
				}
			}
		}
		log.Printf("[SCHEDULE-ADMIN] All new slots created successfully")
		return nil
	})
	if err != nil {
		log.Printf("[SCHEDULE-ADMIN] Transaction error: %v", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	// Re-fetch and return updated data
	days := []string{"Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"}
	var slots []models.PsikologScheduleSlot
	if err := config.DB.Where("psikolog_id = ?", psikolog.ID).Order("id asc").Find(&slots).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	log.Printf("[SCHEDULE-ADMIN] Re-fetched %d slots after save", len(slots))

	grouped := make([]fiber.Map, 0, len(days))
	for _, day := range days {
		daySlots := []fiber.Map{}
		enabled := false
		for _, slot := range slots {
			if slot.Hari == day {
				if slot.IsAktif != nil && *slot.IsAktif {
					enabled = true
				}
				daySlots = append(daySlots, fiber.Map{
					"id":           slot.ID,
					"kategori":     firstNonEmptyLocal(slot.Kategori, "Personal"),
					"start":        slot.JamMulai,
					"end":          slot.JamSelesai,
					"lokasi":       slot.Lokasi,
					"kuota":        slot.Kuota,
					"is_available": slot.IsAktif != nil && *slot.IsAktif,
				})
			}
		}
		grouped = append(grouped, fiber.Map{"day": day, "enabled": enabled, "slots": daySlots})
	}
	log.Printf("[SCHEDULE-ADMIN] Returning %d grouped days", len(grouped))
	return c.JSON(fiber.Map{"status": "success", "data": grouped})
}

func firstNonEmptyLocal(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func normalizeScheduleCategoryLocal(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "akademik":
		return "Akademik"
	case "karir":
		return "Karir"
	case "personal":
		return "Personal"
	default:
		return "Personal"
	}
}

func GetGlobalAspirations(c *fiber.Ctx) error {
	var asps []models.Aspirasi
	config.DB.Preload("Mahasiswa.Fakultas").Order("created_at desc").Find(&asps)
	return c.JSON(fiber.Map{"status": "success", "data": asps})
}

func UpdateAspirationStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var payload struct {
		Status string `json:"status"`
		Respon string `json:"respon"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request body"})
	}

	var asp models.Aspirasi
	if err := config.DB.First(&asp, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Aspiration not found"})
	}

	asp.Status = payload.Status
	asp.Respon = payload.Respon

	if err := config.DB.Save(&asp).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Status aspirasi berhasil diperbarui",
		"data":    asp,
	})
}

// Additional CRUD for Mahasiswa
func CreateStudent(c *fiber.Ctx) error {
	var req struct {
		models.Mahasiswa
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	mhs := req.Mahasiswa

	email := mhs.EmailKampus
	if email == "" {
		email = fmt.Sprintf("%s@bku.ac.id", mhs.NIM)
	}

	// Check if student already exists (including soft-deleted)
	var existingMhs models.Mahasiswa
	errExisting := config.DB.Unscoped().Where("nim = ?", mhs.NIM).First(&existingMhs).Error
	if errExisting == nil {
		// Student exists! We will restore and update them
		err := config.DB.Transaction(func(tx *gorm.DB) error {
			// Restore/Update user
			var user models.User
			errUser := tx.Unscoped().Where("id = ?", existingMhs.PenggunaID).First(&user).Error
			if errUser == nil {
				user.DeletedAt = gorm.DeletedAt{}
				user.Email = email
				if req.Password != "" {
					hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
					if err == nil {
						user.Password = string(hashedPassword)
					}
				}
				if err := tx.Save(&user).Error; err != nil {
					return err
				}
			}

			// Restore/Update student
			existingMhs.DeletedAt = gorm.DeletedAt{}
			existingMhs.Nama = mhs.Nama
			existingMhs.EmailKampus = email
			existingMhs.FakultasID = mhs.FakultasID
			existingMhs.ProgramStudiID = mhs.ProgramStudiID
			existingMhs.SemesterSekarang = mhs.SemesterSekarang
			existingMhs.StatusAkun = "Aktif"
			existingMhs.TahunMasuk = mhs.TahunMasuk

			if err := tx.Save(&existingMhs).Error; err != nil {
				return err
			}

			return nil
		})

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memulihkan data mahasiswa: " + err.Error()})
		}

		return c.JSON(fiber.Map{"status": "success", "data": existingMhs, "message": "Data mahasiswa berhasil dipulihkan dan diperbarui"})
	}

	// Check if Email already exists in User table
	var countUser int64
	config.DB.Model(&models.User{}).Where("email = ?", email).Count(&countUser)
	if countUser > 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Email sudah terdaftar untuk pengguna lain"})
	}

	// Check if NIM already exists in Mahasiswa table
	if mhs.NIM != "" {
		var countMhs int64
		config.DB.Model(&models.Mahasiswa{}).Where("nim = ?", mhs.NIM).Count(&countMhs)
		if countMhs > 0 {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "NIM sudah terdaftar untuk mahasiswa lain"})
		}
	}

	// 1. Create User automatically
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		defaultPassword := req.Password
		if defaultPassword == "" {
			defaultPassword = "password123"
			if mhs.NIM != "" {
				defaultPassword = "pass" + mhs.NIM
			}
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
		if err != nil {
			fmt.Printf("[DEBUG] Password hashing failed: %v\n", err)
			return err
		}

		user := models.User{
			Email:    email,
			Password: string(hashedPassword),
			Role:     "mahasiswa",
		}
		// 1. Create User first
		if err := tx.Create(&user).Error; err != nil {
			fmt.Printf("[DEBUG] User creation failed: %v\n", err)
			return err
		}

		// DOUBLE CHECK: Pastikan ID user tidak nol
		if user.ID == 0 {
			return fmt.Errorf("failed to retrieve new User ID after insertion")
		}

		fmt.Printf("[DEBUG] User created with ID: %d\n", user.ID)

		// 2. Prepare Mahasiswa data
		mhs.PenggunaID = user.ID
		mhs.Pengguna = user // Beritahu GORM ini user-nya
		mhs.StatusAkun = "Aktif"

		// 3. Create Mahasiswa
		if err := tx.Omit("Pengguna").Create(&mhs).Error; err != nil {
			fmt.Printf("[DEBUG] Mahasiswa creation failed: %v\n", err)
			return err
		}

		// Otomatis daftarkan ke PKKMB jika semester 1 atau maba
		if mhs.SemesterSekarang == 1 {
			pkkmb := models.PkkmbHasil{
				MahasiswaID:     mhs.ID,
				Nilai:           0.0,
				StatusKelulusan: "Proses",
			}
			if err := tx.Create(&pkkmb).Error; err != nil {
				fmt.Printf("[DEBUG] PKKMB creation failed: %v\n", err)
				return err
			}
		}
		return nil
	})

	if err != nil {
		fmt.Printf("Error CreateStudent: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal simpan: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "data": mhs, "message": "Mahasiswa berhasil dibuat"})
}

func UpdateStudent(c *fiber.Ctx) error {
	id := c.Params("id")
	var mhs models.Mahasiswa
	if err := config.DB.First(&mhs, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan"})
	}

	var req struct {
		models.Mahasiswa
		Password string `json:"password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	email := req.EmailKampus
	if email == "" {
		email = fmt.Sprintf("%s@bku.ac.id", req.NIM)
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Update user info
		if mhs.PenggunaID != 0 {
			var user models.User
			if err := tx.First(&user, mhs.PenggunaID).Error; err == nil {
				user.Email = email
				if req.Password != "" {
					hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
					if err == nil {
						user.Password = string(hashedPassword)
					}
				}
				if err := tx.Save(&user).Error; err != nil {
					return err
				}
			}
		}

		// Update student info
		mhs.NIM = req.NIM
		mhs.Nama = req.Nama
		mhs.EmailKampus = email
		mhs.FakultasID = req.FakultasID
		mhs.ProgramStudiID = req.ProgramStudiID
		mhs.SemesterSekarang = req.SemesterSekarang
		mhs.StatusAkun = req.StatusAkun
		mhs.TahunMasuk = req.TahunMasuk
		mhs.Alamat = req.Alamat

		if err := tx.Save(&mhs).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui data mahasiswa: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "data": mhs, "message": "Data mahasiswa berhasil diperbarui"})
}

func DeleteStudent(c *fiber.Ctx) error {
	id := c.Params("id")
	var mhs models.Mahasiswa
	if err := config.DB.First(&mhs, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan"})
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Soft delete Mahasiswa
		if err := tx.Unscoped().Delete(&models.Mahasiswa{}, id).Error; err != nil {
			return err
		}

		// 2. Soft delete User if exists
		if mhs.PenggunaID != 0 {
			if err := tx.Unscoped().Delete(&models.User{}, mhs.PenggunaID).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus mahasiswa: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Mahasiswa deleted successfully"})
}

// ResetStudents clears all students and their associated users
func ResetStudents(c *fiber.Ctx) error {
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// TRUNCATE CASCADE will remove all mahasiswa and their related records
		if err := tx.Exec("TRUNCATE TABLE mahasiswa.mahasiswa CASCADE").Error; err != nil {
			return err
		}
		if err := tx.Exec("TRUNCATE TABLE mahasiswa.sevima_anomali").Error; err != nil {
			return err
		}

		// Remove dependent user data before deleting the users
		if err := tx.Exec("DELETE FROM mahasiswa.log_aktivitas WHERE user_id IN (SELECT id FROM public.users WHERE role IN ('student', 'mahasiswa'))").Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM mahasiswa.notifikasi WHERE user_id IN (SELECT id FROM public.users WHERE role IN ('student', 'mahasiswa'))").Error; err != nil {
			return err
		}

		// Also remove all users with role 'student' or 'mahasiswa'
		if err := tx.Unscoped().Where("role IN ?", []string{"student", "mahasiswa"}).Delete(&models.User{}).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset data mahasiswa: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Semua data mahasiswa berhasil dikosongkan (botak)"})
}

func GetAllAcademicPeriods(c *fiber.Ctx) error {
	var periods []models.AcademicPeriod
	if err := config.DB.Order("sevima_id desc").Find(&periods).Error; err != nil {
		fmt.Printf("[ERROR] GetAllAcademicPeriods: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil data Periode Akademik: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": periods})
}

func GetAllProgramStudi(c *fiber.Ctx) error {
	var prodis []models.ProgramStudi
	query := config.DB.Preload("Fakultas")

	headerFid := c.Get("X-Faculty-ID")
	if headerFid == "" || headerFid == "undefined" || headerFid == "null" {
		headerFid = c.Query("fakultasId")
	}
	if headerFid != "" && headerFid != "undefined" && headerFid != "null" && headerFid != "all" {
		if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
			query = query.Where("fakultas_id = ?", parsedFid)
		}
	}

	if err := query.Find(&prodis).Error; err != nil {
		fmt.Printf("[ERROR] GetAllProgramStudi: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil data Prodi: " + err.Error()})
	}

	// Hitung jumlah mahasiswa untuk setiap prodi
	for i := range prodis {
		var count int64
		config.DB.Model(&models.Mahasiswa{}).Where("prodi_id = ?", prodis[i].ID).Count(&count)
		prodis[i].CurrentMahasiswa = count
	}

	return c.JSON(fiber.Map{"status": "success", "data": prodis})
}

func CreateProgramStudi(c *fiber.Ctx) error {
	var prodi models.ProgramStudi
	if err := c.BodyParser(&prodi); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Gagal memproses body request: " + err.Error()})
	}

	// Validasi field wajib
	if prodi.FakultasID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "FakultasID wajib diisi"})
	}
	if prodi.Nama == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Nama Program Studi wajib diisi"})
	}
	if prodi.Kode == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Kode Program Studi wajib diisi"})
	}

	if err := config.DB.Create(&prodi).Error; err != nil {
		fmt.Printf("[ERROR] CreateProgramStudi: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan Prodi: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": prodi})
}

func UpdateProgramStudi(c *fiber.Ctx) error {
	id := c.Params("id")
	var prodi models.ProgramStudi
	if err := config.DB.First(&prodi, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Program Studi not found"})
	}
	c.BodyParser(&prodi)
	config.DB.Save(&prodi)
	return c.JSON(fiber.Map{"status": "success", "data": prodi})
}

func DeleteProgramStudi(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.ProgramStudi{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Program Studi deleted"})
}

// Scholarship Handlers
func GetAllScholarships(c *fiber.Ctx) error {
	var list []models.Beasiswa
	config.DB.Find(&list)

	// Manual mapping to PascalCase for Frontend compatibility without changing the model
	var mappedList []map[string]interface{}
	for _, b := range list {
		m := map[string]interface{}{
			"ID":             b.ID,
			"Nama":           b.Nama,
			"Penyelenggara":  b.Penyelenggara,
			"Deskripsi":      b.Deskripsi,
			"Persyaratan":    b.Persyaratan,
			"Deadline":       b.Deadline,
			"Kuota":          b.Kuota,
			"IPKMin":         b.IPKMin,
			"Anggaran":       b.Anggaran, // Capitalized for Frontend
			"Kategori":       b.Kategori,
			"NilaiBantuan":   b.NilaiBantuan,
			"FileKtm":        b.FileKtm,
			"FileTranskrip":  b.FileTranskrip,
			"FileSertifikat": b.FileSertifikat,
			"CustomFields":   b.CustomFields,
			"CreatedAt":      b.CreatedAt,
		}
		mappedList = append(mappedList, m)
	}

	return c.JSON(fiber.Map{"status": "success", "data": mappedList})
}

func CreateScholarship(c *fiber.Ctx) error {
	var payload struct {
		Nama           string  `json:"Nama"`
		Penyelenggara  string  `json:"Penyelenggara"`
		Deskripsi      string  `json:"Deskripsi"`
		Persyaratan    string  `json:"Persyaratan"`
		Deadline       string  `json:"Deadline"`
		Kuota          int     `json:"Kuota"`
		IPKMin         float64 `json:"IPKMin"`
		Anggaran       float64 `json:"Anggaran"`
		Kategori       string  `json:"Kategori"`
		FileKtm        string  `json:"FileKtm"`
		FileTranskrip  string  `json:"FileTranskrip"`
		FileSertifikat string  `json:"FileSertifikat"`
		CustomFields   string  `json:"CustomFields"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	dead, _ := time.Parse(time.RFC3339, payload.Deadline)

	kategori := payload.Kategori
	if kategori == "" {
		kategori = "Internal"
	}

	nilaiBantuan := float64(0)
	if payload.Kuota > 0 {
		nilaiBantuan = payload.Anggaran / float64(payload.Kuota)
	}

	// Default fallbacks if empty
	fileKtm := payload.FileKtm
	if fileKtm == "" {
		fileKtm = "wajib"
	}
	fileTranskrip := payload.FileTranskrip
	if fileTranskrip == "" {
		fileTranskrip = "wajib"
	}
	fileSertifikat := payload.FileSertifikat
	if fileSertifikat == "" {
		fileSertifikat = "opsional"
	}

	beasiswa := models.Beasiswa{
		Nama:           payload.Nama,
		Penyelenggara:  payload.Penyelenggara,
		Deskripsi:      payload.Deskripsi,
		Persyaratan:    payload.Persyaratan,
		Deadline:       dead,
		Kuota:          payload.Kuota,
		IPKMin:         payload.IPKMin,
		Anggaran:       payload.Anggaran,
		Kategori:       kategori,
		NilaiBantuan:   nilaiBantuan,
		FileKtm:        fileKtm,
		FileTranskrip:  fileTranskrip,
		FileSertifikat: fileSertifikat,
		CustomFields:   payload.CustomFields,
	}

	if err := config.DB.Create(&beasiswa).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Beasiswa created"})
}

func UpdateScholarship(c *fiber.Ctx) error {
	id := c.Params("id")
	var payload struct {
		Nama           string  `json:"Nama"`
		Penyelenggara  string  `json:"Penyelenggara"`
		Deskripsi      string  `json:"Deskripsi"`
		Persyaratan    string  `json:"Persyaratan"`
		Deadline       string  `json:"Deadline"`
		Kuota          int     `json:"Kuota"`
		IPKMin         float64 `json:"IPKMin"`
		Anggaran       float64 `json:"Anggaran"`
		Kategori       string  `json:"Kategori"`
		FileKtm        string  `json:"FileKtm"`
		FileTranskrip  string  `json:"FileTranskrip"`
		FileSertifikat string  `json:"FileSertifikat"`
		CustomFields   string  `json:"CustomFields"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	dead, _ := time.Parse(time.RFC3339, payload.Deadline)

	var beasiswa models.Beasiswa
	if err := config.DB.First(&beasiswa, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Beasiswa not found"})
	}

	nilaiBantuan := float64(0)
	if payload.Kuota > 0 {
		nilaiBantuan = payload.Anggaran / float64(payload.Kuota)
	}

	beasiswa.Nama = payload.Nama
	beasiswa.Penyelenggara = payload.Penyelenggara
	beasiswa.Deskripsi = payload.Deskripsi
	beasiswa.Persyaratan = payload.Persyaratan
	beasiswa.Deadline = dead
	beasiswa.Kuota = payload.Kuota
	beasiswa.IPKMin = payload.IPKMin
	beasiswa.Anggaran = payload.Anggaran
	beasiswa.NilaiBantuan = nilaiBantuan
	if payload.Kategori != "" {
		beasiswa.Kategori = payload.Kategori
	}
	if payload.FileKtm != "" {
		beasiswa.FileKtm = payload.FileKtm
	}
	if payload.FileTranskrip != "" {
		beasiswa.FileTranskrip = payload.FileTranskrip
	}
	if payload.FileSertifikat != "" {
		beasiswa.FileSertifikat = payload.FileSertifikat
	}
	beasiswa.CustomFields = payload.CustomFields

	if err := config.DB.Save(&beasiswa).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Beasiswa updated"})
}

func DeleteScholarship(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.Beasiswa{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

// Counseling Handlers
func GetAllCounseling(c *fiber.Ctx) error {
	var list []models.Konseling
	if err := config.DB.Preload("Mahasiswa").Preload("Dosen").Find(&list).Error; err != nil {
		fmt.Printf("Database Error (GetAllCounseling): %v\n", err)
		return c.Status(500).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal mengambil data: " + err.Error(),
		})
	}
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func CreateCounseling(c *fiber.Ctx) error {
	var data models.Konseling
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request"})
	}
	// Omit associations to prevent GORM from trying to insert them again
	if err := config.DB.Omit("Mahasiswa", "Dosen").Create(&data).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": data})
}

func UpdateCounseling(c *fiber.Ctx) error {
	id := c.Params("id")
	var data models.Konseling
	if err := config.DB.First(&data, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Not found"})
	}
	c.BodyParser(&data)
	if err := config.DB.Omit("Mahasiswa", "Dosen").Save(&data).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": data})
}

func DeleteCounseling(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.Konseling{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

// Jadwal Konseling Handlers (Master Data)
func GetAllCounselingJadwal(c *fiber.Ctx) error {
	var list []models.JadwalKonseling
	if err := config.DB.Order("tanggal desc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func CreateCounselingJadwal(c *fiber.Ctx) error {
	var data models.JadwalKonseling
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request"})
	}
	data.SisaKuota = data.Kuota
	if err := config.DB.Create(&data).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": data})
}

func UpdateCounselingJadwal(c *fiber.Ctx) error {
	id := c.Params("id")
	var data models.JadwalKonseling
	if err := config.DB.First(&data, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Not found"})
	}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request"})
	}
	if err := config.DB.Save(&data).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": data})
}

func DeleteCounselingJadwal(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.JadwalKonseling{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Deleted"})
}

func CreateOrmawa(c *fiber.Ctx) error {
	var payload struct {
		Nama             string `json:"Nama"`
		Singkatan        string `json:"Singkatan"`
		Deskripsi        string `json:"Deskripsi"`
		Visi             string `json:"Visi"`
		Misi             string `json:"Misi"`
		Email            string `json:"Email"`
		Phone            string `json:"Phone"`
		KategoriOrmawaID string `json:"KategoriOrmawaID"`
		FakultasID       string `json:"FakultasID"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid payload"})
	}

	var katID *uint
	if payload.KategoriOrmawaID != "" {
		if id, err := strconv.ParseUint(payload.KategoriOrmawaID, 10, 32); err == nil {
			val := uint(id)
			katID = &val
		}
	}

	var fakID *uint
	if payload.FakultasID != "" {
		if id, err := strconv.ParseUint(payload.FakultasID, 10, 32); err == nil {
			val := uint(id)
			fakID = &val
		}
	}

	err := config.DB.Exec("INSERT INTO ormawa.ormawa (nama, singkatan, deskripsi, visi, misi, email, phone, kategori_ormawa_id, fakultas_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		payload.Nama, payload.Singkatan, payload.Deskripsi, payload.Visi, payload.Misi, payload.Email, payload.Phone, katID, fakID, time.Now(), time.Now()).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Ormawa created successfully"})
}

func UpdateOrmawa(c *fiber.Ctx) error {
	id := c.Params("id")
	var payload struct {
		Nama             string `json:"Nama"`
		Singkatan        string `json:"Singkatan"`
		Deskripsi        string `json:"Deskripsi"`
		Visi             string `json:"Visi"`
		Misi             string `json:"Misi"`
		Email            string `json:"Email"`
		Phone            string `json:"Phone"`
		KategoriOrmawaID string `json:"KategoriOrmawaID"`
		FakultasID       string `json:"FakultasID"`
		TenggatLPJHari   int    `json:"tenggat_lpj_hari"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid payload"})
	}

	var katID *uint
	if payload.KategoriOrmawaID != "" {
		if parsedID, err := strconv.ParseUint(payload.KategoriOrmawaID, 10, 32); err == nil {
			val := uint(parsedID)
			katID = &val
		}
	}

	var fakID *uint
	if payload.FakultasID != "" {
		if parsedID, err := strconv.ParseUint(payload.FakultasID, 10, 32); err == nil {
			val := uint(parsedID)
			fakID = &val
		}
	}

	tenggat := payload.TenggatLPJHari
	if tenggat <= 0 {
		tenggat = 14
	}

	err := config.DB.Exec("UPDATE ormawa.ormawa SET nama = ?, singkatan = ?, deskripsi = ?, visi = ?, misi = ?, email = ?, phone = ?, kategori_ormawa_id = ?, fakultas_id = ?, tenggat_lpj_hari = ?, updated_at = ? WHERE id = ?",
		payload.Nama, payload.Singkatan, payload.Deskripsi, payload.Visi, payload.Misi, payload.Email, payload.Phone, katID, fakID, tenggat, time.Now(), id).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Ormawa updated successfully"})
}

func DeleteOrmawa(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.Ormawa{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Ormawa deleted"})
}

// News Handlers
func GetAllNews(c *fiber.Ctx) error {
	var list []models.Berita
	config.DB.Order("tanggal_publish desc").Find(&list)
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func broadcastNewsNotifications(db *gorm.DB, b *models.Berita) {
	if b.Status != "Published" || b.Notified {
		return
	}

	var targetUserIDs []uint

	switch b.TargetAudience {
	case "fakultas":
		if b.TargetFakultasID != nil && *b.TargetFakultasID > 0 {
			// Get faculty admins
			var adminIDs []uint
			db.Model(&models.User{}).Where("role = ? AND fakultas_id = ?", "faculty_admin", *b.TargetFakultasID).Pluck("id", &adminIDs)
			targetUserIDs = append(targetUserIDs, adminIDs...)

			// Get students
			var studentUserIDs []uint
			db.Table("mahasiswa.mahasiswa").Where("fakultas_id = ?", *b.TargetFakultasID).Pluck("pengguna_id", &studentUserIDs)
			targetUserIDs = append(targetUserIDs, studentUserIDs...)
		}

	case "ormawa":
		var ormawaIDs []uint
		if b.TargetOrmawaIDs != "" {
			parts := strings.Split(b.TargetOrmawaIDs, ",")
			for _, p := range parts {
				p = strings.TrimSpace(p)
				var id uint
				if _, err := fmt.Sscanf(p, "%d", &id); err == nil && id > 0 {
					ormawaIDs = append(ormawaIDs, id)
				}
			}
		} else if b.TargetOrmawaID != nil && *b.TargetOrmawaID > 0 {
			ormawaIDs = []uint{*b.TargetOrmawaID}
		}

		for _, oID := range ormawaIDs {
			// 1. Get ormawa admins (users with ormawa_id directly set)
			var adminIDs []uint
			db.Model(&models.User{}).Where("ormawa_id = ?", oID).Pluck("id", &adminIDs)
			targetUserIDs = append(targetUserIDs, adminIDs...)

			// 2. Get ormawa members from ormawa.ormawa_anggota -> mahasiswa -> pengguna_id
			var memberUserIDs []uint
			db.Table("ormawa.ormawa_anggota").
				Select("mahasiswa.pengguna_id").
				Joins("join mahasiswa.mahasiswa on mahasiswa.id = ormawa_anggota.mahasiswa_id").
				Where("ormawa_anggota.ormawa_id = ? AND ormawa_anggota.deleted_at IS NULL", oID).
				Pluck("pengguna_id", &memberUserIDs)
			targetUserIDs = append(targetUserIDs, memberUserIDs...)

			// 3. Create a record in OrmawaNotifikasi so it shows up inside the specific Ormawa portal notification list
			db.Create(&models.OrmawaNotifikasi{
				OrmawaID: oID,
				Tipe:     "sistem",
				Judul:    b.Judul,
				Pesan:    b.Isi,
				IsRead:   false,
			})
		}

	case "mahasiswa", "student":
		if b.TargetMahasiswaIDs != "" {
			parts := strings.Split(b.TargetMahasiswaIDs, ",")
			var mhsIDs []uint
			for _, p := range parts {
				p = strings.TrimSpace(p)
				var id uint
				if _, err := fmt.Sscanf(p, "%d", &id); err == nil && id > 0 {
					mhsIDs = append(mhsIDs, id)
				}
			}
			if len(mhsIDs) > 0 {
				var studentUserIDs []uint
				db.Table("mahasiswa.mahasiswa").Where("id IN ?", mhsIDs).Pluck("pengguna_id", &studentUserIDs)
				targetUserIDs = append(targetUserIDs, studentUserIDs...)
			}
		} else if b.TargetFakultasID != nil && *b.TargetFakultasID > 0 {
			// Get students in specific faculty
			var studentUserIDs []uint
			db.Table("mahasiswa.mahasiswa").Where("fakultas_id = ?", *b.TargetFakultasID).Pluck("pengguna_id", &studentUserIDs)
			targetUserIDs = append(targetUserIDs, studentUserIDs...)
		} else {
			// Get all students
			var studentUserIDs []uint
			db.Table("mahasiswa.mahasiswa").Pluck("pengguna_id", &studentUserIDs)
			targetUserIDs = append(targetUserIDs, studentUserIDs...)
		}

	default: // "semua" or empty
		// Get all users
		db.Model(&models.User{}).Pluck("id", &targetUserIDs)
	}

	// Remove duplicates (just in case)
	uniqueIDs := make(map[uint]bool)
	var finalIDs []uint
	for _, id := range targetUserIDs {
		if id > 0 && !uniqueIDs[id] {
			uniqueIDs[id] = true
			finalIDs = append(finalIDs, id)
		}
	}

	if len(finalIDs) > 0 {
		notifications := make([]models.Notifikasi, len(finalIDs))
		for i, uID := range finalIDs {
			notifications[i] = models.Notifikasi{
				UserID:    uID,
				Tipe:      "sistem",
				Judul:     b.Judul,
				Deskripsi: b.Isi,
				IsRead:    false,
			}
		}
		// Bulk insert notifications in batches of 100 to optimize performance
		db.CreateInBatches(notifications, 100)
	}

	// Update notified status to prevent resending
	db.Model(b).Update("notified", true)
}

func CreateNews(c *fiber.Ctx) error {
	var b models.Berita
	if err := c.BodyParser(&b); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Author identity required"})
	}

	b.PenulisID = userID
	b.TanggalPublish = time.Now()

	if err := config.DB.Create(&b).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan berita: " + err.Error()})
	}

	// Broadcast notifications if published
	if b.Status == "Published" {
		broadcastNewsNotifications(config.DB, &b)
	}

	return c.JSON(fiber.Map{"status": "success", "data": b})
}

func UpdateNews(c *fiber.Ctx) error {
	id := c.Params("id")
	var b models.Berita
	if err := config.DB.First(&b, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Berita tidak ditemukan"})
	}
	if err := c.BodyParser(&b); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	config.DB.Save(&b)

	// Broadcast notifications if published and not yet notified
	if b.Status == "Published" && !b.Notified {
		broadcastNewsNotifications(config.DB, &b)
	}

	return c.JSON(fiber.Map{"status": "success", "data": b})
}

func DeleteNews(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.Berita{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Berita dihapus"})
}

// GetAdminProfile returns the profile of the currently logged-in admin
func GetAdminProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"status": "error", "message": "Unauthorized access"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Admin not found"})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   user,
	})
}

// UpdateAdminProfile updates basic security info for admin
func UpdateAdminProfile(c *fiber.Ctx) error {
	userID := c.Locals("user_id")
	if userID == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"status": "error", "message": "Unauthorized access"})
	}

	type UpdateReq struct {
		Email       string `json:"Email"`
		OldPassword string `json:"OldPassword"`
		NewPassword string `json:"NewPassword"`
	}
	var req UpdateReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request body"})
	}

	var user models.User
	if err := config.DB.First(&user, userID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Admin not found"})
	}

	// Update Email
	if req.Email != "" {
		user.Email = req.Email
	}

	// Update Password if requested
	if req.OldPassword != "" && req.NewPassword != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Incorrect current password"})
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to hash new password"})
		}
		user.Password = string(hashed)
	}

	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to update profile"})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Admin profile updated successfully",
		"data":    user,
	})
}

// GetAcademicSettings returns the global academic configuration
func GetAcademicSettings(c *fiber.Ctx) error {
	var settings models.PengaturanAkademik
	// Try to find the first/active settings
	if err := config.DB.First(&settings).Error; err != nil {
		// If not found, create a default one
		settings = models.PengaturanAkademik{
			TahunAkademik: "2024 / 2025",
			Semester:      "Ganjil",
			IsKRSOpen:     false,
			IsNilaiOpen:   false,
			IsMBKMOpen:    false,
		}
		config.DB.Create(&settings)
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   settings,
	})
}

// UpdateAcademicSettings updates the global academic configuration
func UpdateAcademicSettings(c *fiber.Ctx) error {
	var payload models.PengaturanAkademik
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request body"})
	}

	var settings models.PengaturanAkademik
	if err := config.DB.First(&settings).Error; err != nil {
		// If not found, create a new one
		if err := config.DB.Create(&payload).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
		}
		settings = payload
	} else {
		// Update existing
		config.DB.Model(&settings).Updates(payload)
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Konfigurasi akademik berhasil diperbarui",
		"data":    settings,
	})
}

// GetAllScholarshipApplications returns all scholarship applications
func GetAllScholarshipApplications(c *fiber.Ctx) error {
	var applications []models.BeasiswaPendaftaran
	err := config.DB.Preload("Mahasiswa").Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Pengguna").Preload("Beasiswa").Order("created_at desc").Find(&applications).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "data": applications})
}

// UpdateScholarshipApplicationStatus updates the status of a scholarship application
func UpdateScholarshipApplicationStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var payload struct {
		Status  string `json:"status"`
		Catatan string `json:"catatan"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request body"})
	}

	log.Printf("[UpdateStatus] ID: %s, Parsed Status: %s, Parsed Catatan: %s\n", id, payload.Status, payload.Catatan)

	var application models.BeasiswaPendaftaran
	if err := config.DB.Preload("Beasiswa").First(&application, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Application not found"})
	}

	// Use FOR UPDATE to prevent TOCTOU race: lock the student's existing accepted application
	if payload.Status == "Diterima" {
		var accepted models.BeasiswaPendaftaran
		if err := config.DB.
			Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("mahasiswa_id = ? AND status = ? AND id != ?", application.MahasiswaID, "Diterima", application.ID).
			First(&accepted).Error; err == nil {
			return c.Status(409).JSON(fiber.Map{
				"status":  "error",
				"message": fmt.Sprintf("Mahasiswa ini sudah menerima beasiswa lain (%s)", accepted.Beasiswa.Nama),
			})
		}
	}

	application.Status = payload.Status
	application.Catatan = payload.Catatan

	if err := config.DB.Model(&application).Updates(map[string]interface{}{
		"status":  payload.Status,
		"catatan": payload.Catatan,
	}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	// Trigger Notification to student
	_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
		MahasiswaID: application.MahasiswaID,
		Type:        "beasiswa",
		Title:       "Status Beasiswa Diperbarui",
		Content:     "Status pendaftaran beasiswa '" + application.Beasiswa.Nama + "' Anda telah diperbarui menjadi: " + payload.Status + ".",
		Link:        "/student/scholarship",
	})

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Status pendaftaran beasiswa berhasil diperbarui",
		"data":    application,
	})
}

// UpdateBulkScholarshipApplicationStatus updates status of multiple scholarship applications
func UpdateBulkScholarshipApplicationStatus(c *fiber.Ctx) error {
	var payload struct {
		IDs     []uint `json:"ids"`
		Status  string `json:"status"`
		Catatan string `json:"catatan"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request body"})
	}

	if len(payload.IDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "No IDs provided"})
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		for _, id := range payload.IDs {
			var application models.BeasiswaPendaftaran
			if err := tx.Preload("Beasiswa").Preload("Mahasiswa").First(&application, id).Error; err != nil {
				return fmt.Errorf("pendaftaran ID %d tidak ditemukan", id)
			}

			if payload.Status == "Diterima" {
				var accepted models.BeasiswaPendaftaran
				if err := tx.
					Clauses(clause.Locking{Strength: "UPDATE"}).
					Where("mahasiswa_id = ? AND status = ? AND id != ?", application.MahasiswaID, "Diterima", application.ID).
					First(&accepted).Error; err == nil {
					var beasiswa models.Beasiswa
					tx.First(&beasiswa, accepted.BeasiswaID)
					return fmt.Errorf("mahasiswa %s sudah menerima beasiswa lain (%s)", application.Mahasiswa.Nama, beasiswa.Nama)
				}
			}

			if err := tx.Model(&application).Updates(map[string]interface{}{
				"status":  payload.Status,
				"catatan": payload.Catatan,
			}).Error; err != nil {
				return err
			}

			// Trigger Notification to student
			_ = notifikasi.Kirim(tx, notifikasi.KirimParams{
				MahasiswaID: application.MahasiswaID,
				Type:        "beasiswa",
				Title:       "Status Beasiswa Diperbarui",
				Content:     "Status pendaftaran beasiswa '" + application.Beasiswa.Nama + "' Anda telah diperbarui menjadi: " + payload.Status + ".",
				Link:        "/student/scholarship",
			})
		}
		return nil
	})

	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Berhasil memperbarui %d pendaftaran beasiswa", len(payload.IDs)),
	})
}

// GetPsychologistBookingsAdmin returns all bookings in the psychologist module for superadmin review
func GetPsychologistBookingsAdmin(c *fiber.Ctx) error {
	var bookings []models.PsikologBooking
	err := config.DB.
		Preload("Psikolog").
		Preload("Mahasiswa").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Order("tanggal desc, jam_mulai desc").
		Find(&bookings).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": bookings})
}

// GetPsychologistMedicalRecordsAdmin returns all medical records (session notes) in the psychologist module
func GetPsychologistMedicalRecordsAdmin(c *fiber.Ctx) error {
	var records []models.PsikologSessionNote
	err := config.DB.
		Preload("Psikolog").
		Preload("Mahasiswa").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Preload("Booking").
		Order("tanggal desc").
		Find(&records).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": records})
}

// GetPsychologistReferralsAdmin returns all referrals (tindak lanjut) in the psychologist module
func GetPsychologistReferralsAdmin(c *fiber.Ctx) error {
	var referrals []models.PsikologReferral
	err := config.DB.
		Preload("Psikolog").
		Preload("Mahasiswa").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Preload("Booking").
		Order("tanggal_dibuat desc").
		Find(&referrals).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": referrals})
}

// ApprovePsychologistReferral allows SuperAdmin to approve or reject a referral request
func ApprovePsychologistReferral(c *fiber.Ctx) error {
	id := c.Params("id")

	var referral models.PsikologReferral
	if err := config.DB.
		Preload("Psikolog").
		Preload("Psikolog.User").
		Preload("Mahasiswa").
		Where("id = ?", id).
		First(&referral).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Referral tidak ditemukan"})
	}

	var body struct {
		Action  string `json:"action"`  // "approve" atau "reject"
		Catatan string `json:"catatan"` // alasan penolakan (opsional)
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	if body.Action != "approve" && body.Action != "reject" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Action harus 'approve' atau 'reject'"})
	}

	var newApprovalStatus string
	var newStatus string
	var notifTitle, notifContent string

	if body.Action == "approve" {
		newApprovalStatus = "disetujui"
		newStatus = "Selesai"
		notifTitle = "Referral Disetujui ✅"
		notifContent = fmt.Sprintf(
			"Surat rujukan untuk mahasiswa %s (tipe: %s) telah disetujui oleh administrator dan final.",
			referral.Mahasiswa.Nama,
			referral.Tipe,
		)
	} else {
		newApprovalStatus = "ditolak"
		newStatus = "Ditolak"
		catatan := body.Catatan
		if catatan == "" {
			catatan = "Tidak ada alasan yang diberikan"
		}
		notifTitle = "Referral Ditolak ❌"
		notifContent = fmt.Sprintf(
			"Surat rujukan untuk mahasiswa %s (tipe: %s) ditolak oleh administrator. Alasan: %s",
			referral.Mahasiswa.Nama,
			referral.Tipe,
			catatan,
		)
	}

	updates := map[string]any{
		"approval_status": newApprovalStatus,
		"approval_note":   body.Catatan,
		"status":          newStatus,
	}

	if newStatus == "Selesai" {
		updates["tanggal_dikirim"] = time.Now()
		updates["tanggal_diterima"] = time.Now()
		// Hapus PDF lama agar di-generate ulang dengan tanda tangan ganda saat di-download berikutnya
		updates["surat_rujiukan_url"] = ""
	}

	if err := config.DB.Model(&referral).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	// Jika disetujui, langsung generate ulang PDF-nya agar frontend bisa segera download
	if newApprovalStatus == "disetujui" {
		// Reload referral with updated status to pass to generator
		if err := config.DB.Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Fakultas").Preload("Psikolog").First(&referral, id).Error; err == nil {
			fullUrl, _, pdfErr := psychologist.BuildReferralLetterPDF(referral)
			if pdfErr == nil && fullUrl != "" {
				config.DB.Model(&referral).Update("surat_rujiukan_url", fullUrl)
			} else {
				log.Println("Gagal generate PDF referral:", pdfErr)
			}
		} else {
			log.Println("Gagal reload referral untuk PDF:", err)
		}
	}

	// Kirim notifikasi ke psikolog dan mahasiswa yang bersangkutan
	mahasiswaID := referral.MahasiswaID
	mahasiswaNama := referral.Mahasiswa.Nama
	psikologID := referral.PsikologID
	psikologUserID := referral.Psikolog.UserID
	psikologNama := referral.Psikolog.Nama
	referralTipe := referral.Tipe
	approvalAction := body.Action
	catatanPenolakan := body.Catatan // capture sebelum goroutine

	go func() {
		// 1. Notifikasi ke psikolog via tabel psikolog.notifications (agar muncul di portal psikolog)
		_ = notifikasi.KirimPsikolog(config.DB, psikologID, psikologUserID, "referral", notifTitle, notifContent)

		// 2. Notifikasi ke mahasiswa yang bersangkutan
		var mhsNotifTitle, mhsNotifContent string
		if approvalAction == "approve" {
			mhsNotifTitle = "Surat Rujukan Anda Disetujui ✅"
			mhsNotifContent = fmt.Sprintf(
				"Surat rujukan tipe %s yang dibuat oleh Psikolog %s untuk Anda telah disetujui oleh administrator. Rujukan akan segera dikirimkan ke pihak tujuan.",
				referralTipe,
				psikologNama,
			)
		} else {
			catatan := catatanPenolakan
			if catatan == "" {
				catatan = "Tidak ada alasan yang diberikan"
			}
			mhsNotifTitle = "Surat Rujukan Anda Ditolak ❌"
			mhsNotifContent = fmt.Sprintf(
				"Surat rujukan tipe %s yang dibuat oleh Psikolog %s untuk Anda telah ditolak oleh administrator. Alasan: %s. Silakan hubungi psikolog Anda untuk informasi lebih lanjut.",
				referralTipe,
				psikologNama,
				catatan,
			)
		}

		if mahasiswaID > 0 {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				MahasiswaID: mahasiswaID,
				Type:        "referral",
				Title:       mhsNotifTitle,
				Content:     mhsNotifContent,
				Link:        "/student/counseling?tab=referrals",
			})
		}

		log.Printf("[Referral] Action=%s, Mahasiswa=%s, Psikolog=%s", approvalAction, mahasiswaNama, psikologNama)
	}()

	return c.JSON(fiber.Map{
		"status":          "success",
		"message":         fmt.Sprintf("Referral berhasil %s", map[string]string{"approve": "disetujui", "reject": "ditolak"}[body.Action]),
		"approval_status": newApprovalStatus,
	})
}

// GetAllTenagaKesehatan returns all registered health workers (Tenaga Kesehatan) profiles
func GetAllTenagaKesehatan(c *fiber.Ctx) error {
	var list []models.TenagaKesehatan
	if err := config.DB.Preload("User").Order("nama asc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

// UpdateTenagaKesehatan updates a health worker profile
func UpdateTenagaKesehatan(c *fiber.Ctx) error {
	id := c.Params("id")
	var tk models.TenagaKesehatan
	if err := config.DB.First(&tk, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Tenaga Kesehatan not found"})
	}

	type UpdateReq struct {
		Nama         string `json:"nama"`
		Email        string `json:"email"`
		NoHP         string `json:"no_hp"`
		Spesialisasi string `json:"spesialisasi"`
		FotoURL      string `json:"foto_url"`
		Lokasi       string `json:"lokasi"`
		IsAktif      *bool  `json:"is_aktif"`
	}
	var req UpdateReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	if req.Nama != "" {
		tk.Nama = req.Nama
	}
	if req.Email != "" {
		tk.Email = req.Email
	}
	if req.NoHP != "" {
		tk.NoHP = req.NoHP
	}
	if req.Spesialisasi != "" {
		tk.Spesialisasi = req.Spesialisasi
	}
	if req.FotoURL != "" {
		tk.FotoURL = req.FotoURL
	}
	if req.Lokasi != "" {
		tk.Lokasi = req.Lokasi
	}
	if req.IsAktif != nil {
		tk.IsAktif = *req.IsAktif
	}

	if err := config.DB.Save(&tk).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": tk})
}

// DeleteTenagaKesehatan deletes a health worker profile
func DeleteTenagaKesehatan(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.TenagaKesehatan{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Tenaga Kesehatan deleted"})
}

// GetTenagaKesehatanSchedulesAdmin returns all schedules for a specific health worker
func GetTenagaKesehatanSchedulesAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	var slots []models.JadwalKesehatan
	if err := config.DB.Where("tenaga_kes_id = ?", id).Order("tanggal desc, jam_mulai asc").Find(&slots).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": slots})
}

// CreateTenagaKesehatanScheduleAdmin creates a new schedule slot for a health worker
func CreateTenagaKesehatanScheduleAdmin(c *fiber.Ctx) error {
	tkID := c.Params("id")
	var body struct {
		Tanggal     string `json:"tanggal"`
		JamMulai    string `json:"jam_mulai"`
		JamSelesai  string `json:"jam_selesai"`
		Kuota       int    `json:"kuota"`
		Lokasi      string `json:"lokasi"`
		TipeLayanan string `json:"tipe_layanan"`
		Catatan     string `json:"catatan"`
		IsRepeat    bool   `json:"is_repeat"`
		RepeatDays  string `json:"repeat_days"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	parsedDate, err := time.Parse("2006-01-02", body.Tanggal)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format tanggal harus YYYY-MM-DD"})
	}

	kuota := body.Kuota
	if kuota <= 0 {
		kuota = 1
	}

	var tk models.TenagaKesehatan
	if err := config.DB.First(&tk, tkID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Tenaga Kesehatan not found"})
	}

	schedule := models.JadwalKesehatan{
		TenagaKesID: tk.ID,
		Tanggal:     parsedDate,
		JamMulai:    body.JamMulai,
		JamSelesai:  body.JamSelesai,
		Kuota:       kuota,
		Lokasi:      body.Lokasi,
		TipeLayanan: body.TipeLayanan,
		Catatan:     body.Catatan,
		IsRepeat:    body.IsRepeat,
		RepeatDays:  body.RepeatDays,
	}

	if err := config.DB.Create(&schedule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "data": schedule})
}

// UpdateTenagaKesehatanScheduleAdmin updates a schedule slot by ID
func UpdateTenagaKesehatanScheduleAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	var schedule models.JadwalKesehatan
	if err := config.DB.First(&schedule, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Jadwal tidak ditemukan"})
	}

	var body struct {
		Tanggal     string `json:"tanggal"`
		JamMulai    string `json:"jam_mulai"`
		JamSelesai  string `json:"jam_selesai"`
		Kuota       int    `json:"kuota"`
		Lokasi      string `json:"lokasi"`
		TipeLayanan string `json:"tipe_layanan"`
		Catatan     string `json:"catatan"`
		IsRepeat    bool   `json:"is_repeat"`
		RepeatDays  string `json:"repeat_days"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	updates := map[string]any{}
	if body.Tanggal != "" {
		if t, err := time.Parse("2006-01-02", body.Tanggal); err == nil {
			updates["tanggal"] = t
		}
	}
	if body.JamMulai != "" {
		updates["jam_mulai"] = body.JamMulai
	}
	if body.JamSelesai != "" {
		updates["jam_selesai"] = body.JamSelesai
	}
	if body.Kuota > 0 {
		updates["kuota"] = body.Kuota
	}
	if body.Lokasi != "" {
		updates["lokasi"] = body.Lokasi
	}
	if body.TipeLayanan != "" {
		updates["tipe_layanan"] = body.TipeLayanan
	}
	updates["catatan"] = body.Catatan
	updates["is_repeat"] = body.IsRepeat
	updates["repeat_days"] = body.RepeatDays

	if err := config.DB.Model(&schedule).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	config.DB.First(&schedule, id)
	return c.JSON(fiber.Map{"status": "success", "data": schedule})
}

// DeleteTenagaKesehatanScheduleAdmin deletes a schedule slot
func DeleteTenagaKesehatanScheduleAdmin(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.JadwalKesehatan{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Jadwal berhasil dihapus"})
}

// GetTenagaKesehatanBookingsAdmin returns all bookings in the health worker module for superadmin review
func GetTenagaKesehatanBookingsAdmin(c *fiber.Ctx) error {
	var bookings []models.BookingKesehatan
	err := config.DB.
		Preload("Jadwal").
		Preload("Jadwal.TenagaKes").
		Preload("Mahasiswa").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Order("created_at desc").
		Find(&bookings).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": bookings})
}

// GetTenagaKesehatanMedicalRecordsAdmin returns all medical records (session notes) in the health worker module
func GetTenagaKesehatanMedicalRecordsAdmin(c *fiber.Ctx) error {
	var records []models.Kesehatan
	err := config.DB.
		Preload("Mahasiswa").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Preload("TenagaKes").
		Order("tanggal desc").
		Find(&records).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": records})
}

// GetTenagaKesehatanReferralsAdmin returns all medical referrals
func GetTenagaKesehatanReferralsAdmin(c *fiber.Ctx) error {
	var referrals []models.RujukanKesehatan
	err := config.DB.
		Preload("Mahasiswa").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Order("created_at desc").
		Find(&referrals).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": referrals})
}

// ApproveTenagaKesehatanReferral allows SuperAdmin to approve or reject a medical referral
func ApproveTenagaKesehatanReferral(c *fiber.Ctx) error {
	id := c.Params("id")

	var referral models.RujukanKesehatan
	if err := config.DB.
		Preload("Mahasiswa").
		Preload("Mahasiswa.ProgramStudi").
		Where("id = ?", id).
		First(&referral).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Referral tidak ditemukan"})
	}

	var body struct {
		Action  string `json:"action"`  // "approve" atau "reject"
		Catatan string `json:"catatan"` // alasan penolakan (opsional)
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	if body.Action != "approve" && body.Action != "reject" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Action harus 'approve' atau 'reject'"})
	}

	var newApprovalStatus string
	var newStatus string
	var notifTitle, notifContent string

	if body.Action == "approve" {
		newApprovalStatus = "disetujui"
		newStatus = "Selesai"
		notifTitle = "Referral Medis Disetujui ✅"
		notifContent = fmt.Sprintf(
			"Surat rujukan medis Anda ke %s telah disetujui oleh administrator dan siap diunduh.",
			referral.FaskesTujuan,
		)
	} else {
		newApprovalStatus = "ditolak"
		newStatus = "Ditolak"
		catatan := body.Catatan
		if catatan == "" {
			catatan = "Tidak ada alasan yang diberikan"
		}
		notifTitle = "Referral Medis Ditolak ❌"
		notifContent = fmt.Sprintf(
			"Surat rujukan medis Anda ke %s ditolak oleh administrator. Alasan: %s",
			referral.FaskesTujuan,
			catatan,
		)
	}

	now := time.Now().UTC()
	updates := map[string]any{
		"approval_status": newApprovalStatus,
		"approval_note":   body.Catatan,
		"status":          newStatus,
	}

	if newStatus == "Selesai" {
		updates["tanggal_dikirim"] = now
		updates["tanggal_diterima"] = now
		updates["is_published"] = true
		// Clear URL to trigger generation with double signature
		updates["surat_rujukan_url"] = ""
	}

	if err := config.DB.Model(&referral).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	// If approved, regenerate PDF with the double signatures (Tenaga Kes + Kemahasiswaan)
	if newApprovalStatus == "disetujui" {
		if err := config.DB.Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").First(&referral, id).Error; err == nil {
			var screening models.Kesehatan
			if referral.SelfScreeningID != nil {
				config.DB.Preload("TenagaKes").First(&screening, *referral.SelfScreeningID)
			}
			fullUrl, _, pdfErr := BuildMedisReferralLetterPDF(referral, screening)
			if pdfErr == nil && fullUrl != "" {
				config.DB.Model(&referral).Update("surat_rujukan_url", fullUrl)
			} else {
				log.Println("Gagal generate PDF medis referral:", pdfErr)
			}
		}
	}

	mahasiswaID := referral.MahasiswaID
	approvalAction := body.Action

	go func() {
		if mahasiswaID > 0 {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				MahasiswaID: mahasiswaID,
				Type:        "referral_medis",
				Title:       notifTitle,
				Content:     notifContent,
				Link:        "/student/health",
			})
		}

		// Notify Tenaga Kesehatan
		var screening models.Kesehatan
		if referral.SelfScreeningID != nil {
			if err := config.DB.Preload("TenagaKes").First(&screening, *referral.SelfScreeningID).Error; err == nil {
				if screening.TenagaKes != nil && screening.TenagaKes.UserID > 0 {
					tkNotifTitle := fmt.Sprintf("Rujukan Medis %s", map[string]string{"approve": "Disetujui ✅", "reject": "Ditolak ❌"}[approvalAction])
					tkNotifContent := fmt.Sprintf("Surat rujukan medis untuk mahasiswa %s telah %s oleh administrator.", referral.Mahasiswa.Nama, map[string]string{"approve": "disetujui", "reject": "ditolak"}[approvalAction])
					_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
						UserID:  screening.TenagaKes.UserID,
						Type:    "referral_medis",
						Title:   tkNotifTitle,
						Content: tkNotifContent,
						Link:    "/tenagakes/referrals",
					})
				}
			}
		}

		log.Printf("[Referral Medis] Action=%s, MahasiswaID=%d", approvalAction, mahasiswaID)
	}()

	return c.JSON(fiber.Map{
		"status":          "success",
		"message":         fmt.Sprintf("Referral berhasil %s", map[string]string{"approve": "disetujui", "reject": "ditolak"}[body.Action]),
		"approval_status": newApprovalStatus,
	})
}

// GetOrmawaLeaderboard returns all Ormawa ranked by points descending
func GetOrmawaLeaderboard(c *fiber.Ctx) error {
	var list []models.Ormawa
	if err := config.DB.Order("poin desc, nama asc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	type LeaderboardItem struct {
		ID        uint   `json:"id"`
		Nama      string `json:"nama"`
		Singkatan string `json:"singkatan"`
		Poin      int    `json:"poin"`
		Peringkat int    `json:"peringkat"`
	}

	var result []LeaderboardItem
	for idx, item := range list {
		result = append(result, LeaderboardItem{
			ID:        item.ID,
			Nama:      item.Nama,
			Singkatan: item.Singkatan,
			Poin:      item.Poin,
			Peringkat: idx + 1,
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}

// GetGlobalOrmawaPoinHistory returns global point histories
func GetGlobalOrmawaPoinHistory(c *fiber.Ctx) error {
	var history []models.OrmawaPoinHistory
	if err := config.DB.Preload("Ormawa").Order("created_at desc").Limit(50).Find(&history).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   history,
	})
}

// GetOrmawaGamifikasiRules returns all point-awarding rules
func GetOrmawaGamifikasiRules(c *fiber.Ctx) error {
	var rules []models.OrmawaGamifikasiRule
	if err := config.DB.Order("id asc").Find(&rules).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   rules,
	})
}

// UpdateOrmawaGamifikasiRule updates a point rule
func UpdateOrmawaGamifikasiRule(c *fiber.Ctx) error {
	id := c.Params("id")
	var rule models.OrmawaGamifikasiRule
	if err := config.DB.First(&rule, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Aturan tidak ditemukan"})
	}

	type UpdatePayload struct {
		Poin      int    `json:"poin"`
		Label     string `json:"label"`
		Deskripsi string `json:"deskripsi"`
	}

	var payload UpdatePayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	rule.Poin = payload.Poin
	if payload.Label != "" {
		rule.Label = payload.Label
	}
	if payload.Deskripsi != "" {
		rule.Deskripsi = payload.Deskripsi
	}

	if err := config.DB.Save(&rule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Aturan gamifikasi berhasil diperbarui",
		"data":    rule,
	})
}

// CreateOrmawaGamifikasiRule creates a new point rule
func CreateOrmawaGamifikasiRule(c *fiber.Ctx) error {
	type CreatePayload struct {
		Key       string `json:"key"`
		Label     string `json:"label"`
		Deskripsi string `json:"deskripsi"`
		Poin      int    `json:"poin"`
	}

	var payload CreatePayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	if payload.Key == "" || payload.Label == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Key dan Label wajib diisi"})
	}

	rule := models.OrmawaGamifikasiRule{
		Key:       payload.Key,
		Label:     payload.Label,
		Deskripsi: payload.Deskripsi,
		Poin:      payload.Poin,
	}

	if err := config.DB.Create(&rule).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Aturan gamifikasi berhasil ditambahkan",
		"data":    rule,
	})
}

// DeleteOrmawaGamifikasiRule deletes a point rule
func DeleteOrmawaGamifikasiRule(c *fiber.Ctx) error {
	id := c.Params("id")

	if err := config.DB.Unscoped().Delete(&models.OrmawaGamifikasiRule{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Aturan gamifikasi berhasil dihapus",
	})
}

// GetGlobalLPJs returns all LPJs for Super Admin review
func GetGlobalLPJs(c *fiber.Ctx) error {
	var list []models.LaporanPertanggungjawaban
	if err := config.DB.Preload("Proposal.Ormawa").Order("created_at desc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	type LPJListItem struct {
		ID                uint    `json:"id"`
		ProposalID        uint    `json:"proposalId"`
		OrmawaName        string  `json:"ormawaName"`
		OrmawaSingkatan   string  `json:"ormawaSingkatan"`
		Title             string  `json:"title"`
		Date              string  `json:"date"`
		Status            string  `json:"status"`
		Catatan           string  `json:"catatan"`
		RealisasiAnggaran float64 `json:"realisasiAnggaran"`
		TotalAnggaran     float64 `json:"totalAnggaran"`
		FileURL           string  `json:"fileUrl"`
		CreatedAt         string  `json:"createdAt"`
	}

	var result []LPJListItem
	for _, item := range list {
		dateStr := ""
		if !item.CreatedAt.IsZero() {
			dateStr = item.CreatedAt.Format("2006-01-02")
		}

		ormawaName := item.Proposal.Ormawa.Nama
		ormawaSingkatan := item.Proposal.Ormawa.Singkatan
		proposalTitle := item.Proposal.Judul
		totalAnggaran := item.Proposal.Anggaran

		result = append(result, LPJListItem{
			ID:                item.ID,
			ProposalID:        item.ProposalID,
			OrmawaName:        ormawaName,
			OrmawaSingkatan:   ormawaSingkatan,
			Title:             proposalTitle,
			Date:              dateStr,
			Status:            item.Status,
			Catatan:           item.Catatan,
			RealisasiAnggaran: item.RealisasiAnggaran,
			TotalAnggaran:     totalAnggaran,
			FileURL:           item.FileURL,
			CreatedAt:         item.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}

// ReviewLPJ approves or issues a warning for an LPJ, adjusting Ormawa points accordingly
func ReviewLPJ(c *fiber.Ctx) error {
	id := c.Params("id")
	var lpj models.LaporanPertanggungjawaban
	if err := config.DB.Preload("Proposal").First(&lpj, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "LPJ tidak ditemukan"})
	}

	type ReviewPayload struct {
		Action  string `json:"action"` // "approve" or "warn"
		Catatan string `json:"catatan"`
	}

	var payload ReviewPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	txErr := config.DB.Transaction(func(tx *gorm.DB) error {
		if payload.Action == "approve" {
			lpj.Status = "disetujui"
			if payload.Catatan != "" {
				lpj.Catatan = payload.Catatan
			}

			// Update proposal status
			if err := tx.Model(&models.Proposal{}).Where("id = ?", lpj.ProposalID).Update("status", "selesai").Error; err != nil {
				return err
			}

			// Create cash mutation
			if err := tx.Create(&models.OrmawaMutasiSaldo{
				OrmawaID:   lpj.Proposal.OrmawaID,
				Tipe:       "keluar",
				Nominal:    lpj.RealisasiAnggaran,
				Kategori:   "Kegiatan Selesai",
				Deskripsi:  "Realisasi Dana LPJ: " + lpj.Proposal.Judul,
				Tanggal:    time.Now(),
				ProposalID: &lpj.ProposalID,
				Sumber:     "kampus",
			}).Error; err != nil {
				return err
			}

			// Award points
			if err := gamifikasi.AwardOrmawaPoints(tx, lpj.Proposal.OrmawaID, "lpj_disetujui", 100, "tambah", fmt.Sprintf("LPJ disetujui: %s", lpj.Proposal.Judul)); err != nil {
				return err
			}

		} else if payload.Action == "warn" {
			lpj.Status = "Warning Sent"
			if payload.Catatan != "" {
				lpj.Catatan = payload.Catatan
			}

			// Deduct points
			if err := gamifikasi.AwardOrmawaPoints(tx, lpj.Proposal.OrmawaID, "lpj_terlambat", -50, "kurang", fmt.Sprintf("Peringatan LPJ terlambat/tidak lengkap: %s", lpj.Proposal.Judul)); err != nil {
				return err
			}
		} else {
			return fmt.Errorf("action tidak valid")
		}

		if err := tx.Save(&lpj).Error; err != nil {
			return err
		}

		// Create notification
		if err := tx.Create(&models.OrmawaNotifikasi{
			OrmawaID: lpj.Proposal.OrmawaID,
			Tipe:     "lpj",
			Judul:    "Status LPJ Diperbarui",
			Pesan:    fmt.Sprintf("LPJ '%s' telah ditinjau: status berubah menjadi '%s'.", lpj.Proposal.Judul, lpj.Status),
		}).Error; err != nil {
			return err
		}

		return nil
	})

	if txErr != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": txErr.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "LPJ berhasil ditinjau & poin ormawa diperbarui",
		"data":    lpj,
	})
}

// ========================
// DOSEN (LECTURER) CRUD
// ========================

func GetAllLecturers(c *fiber.Ctx) error {
	var lecturers []models.Dosen
	query := config.DB.Preload("Pengguna").Preload("Fakultas").Preload("ProgramStudi")

	headerFid := c.Get("X-Faculty-ID")
	if headerFid == "" || headerFid == "undefined" || headerFid == "null" {
		headerFid = c.Query("fakultasId")
	}
	if headerFid != "" && headerFid != "undefined" && headerFid != "null" && headerFid != "all" {
		if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
			query = query.Where("fakultas_id = ?", parsedFid)
		}
	}

	headerPid := c.Get("X-Prodi-ID")
	if headerPid == "" || headerPid == "undefined" || headerPid == "null" {
		headerPid = c.Query("prodiId")
	}
	if headerPid != "" && headerPid != "undefined" && headerPid != "null" && headerPid != "all" {
		if parsedPid, err := strconv.ParseUint(headerPid, 10, 32); err == nil {
			query = query.Where("program_studi_id = ?", parsedPid)
		}
	}

	if err := query.Find(&lecturers).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memuat data dosen: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": lecturers})
}

func CreateLecturer(c *fiber.Ctx) error {
	var payload struct {
		NIDN           string `json:"NIDN"`
		Nama           string `json:"Nama"`
		Email          string `json:"Email"`
		Jabatan        string `json:"Jabatan"`
		FakultasID     uint   `json:"FakultasID"`
		ProgramStudiID uint   `json:"ProgramStudiID"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	tx := config.DB.Begin()

	var user models.User
	err := tx.Where("email = ?", payload.Email).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengamankan password"})
		}
		user = models.User{
			Email:          payload.Email,
			Password:       string(hashedPassword),
			Role:           "dosen",
			FakultasID:     &payload.FakultasID,
			ProgramStudiID: &payload.ProgramStudiID,
		}
		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuat akun dosen: " + err.Error()})
		}
	} else if err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Database error: " + err.Error()})
	}

	dosen := models.Dosen{
		PenggunaID:     user.ID,
		NIDN:           payload.NIDN,
		Nama:           payload.Nama,
		FakultasID:     payload.FakultasID,
		ProgramStudiID: payload.ProgramStudiID,
		Jabatan:        payload.Jabatan,
		Email:          payload.Email,
	}

	if err := tx.Create(&dosen).Error; err != nil {
		tx.Rollback()
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "NIDN sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan data dosen: " + err.Error()})
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Dosen berhasil didaftarkan", "data": dosen})
}

func UpdateLecturer(c *fiber.Ctx) error {
	id := c.Params("id")
	var dosen models.Dosen
	if err := config.DB.Preload("Pengguna").First(&dosen, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Dosen tidak ditemukan"})
	}

	var payload struct {
		NIDN           string `json:"NIDN"`
		Nama           string `json:"Nama"`
		Email          string `json:"Email"`
		Jabatan        string `json:"Jabatan"`
		FakultasID     uint   `json:"FakultasID"`
		ProgramStudiID uint   `json:"ProgramStudiID"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	tx := config.DB.Begin()

	dosen.NIDN = payload.NIDN
	dosen.Nama = payload.Nama
	dosen.FakultasID = payload.FakultasID
	dosen.ProgramStudiID = payload.ProgramStudiID
	dosen.Jabatan = payload.Jabatan
	dosen.Email = payload.Email

	if err := tx.Save(&dosen).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui data dosen: " + err.Error()})
	}

	if dosen.PenggunaID != 0 && payload.Email != "" {
		if err := tx.Exec("UPDATE public.users SET email = ?, fakultas_id = ?, program_studi_id = ? WHERE id = ?", payload.Email, payload.FakultasID, payload.ProgramStudiID, dosen.PenggunaID).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui akun terkait: " + err.Error()})
		}
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Data dosen diperbarui", "data": dosen})
}

func DeleteLecturer(c *fiber.Ctx) error {
	id := c.Params("id")
	var dosen models.Dosen
	if err := config.DB.First(&dosen, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Dosen tidak ditemukan"})
	}

	tx := config.DB.Begin()
	penggunaID := dosen.PenggunaID

	if err := tx.Unscoped().Delete(&dosen).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus profil dosen: " + err.Error()})
	}

	if penggunaID != 0 {
		if err := tx.Exec("DELETE FROM public.users WHERE id = ?", penggunaID).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus akun dosen: " + err.Error()})
		}
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Data dosen dihapus"})
}

// ResetDatabase performs a factory reset on the database, preserving only super admin users
func ResetDatabase(c *fiber.Ctx) error {
	// Secondary verification: ensure only super_admin can perform reset
	role, ok := c.Locals("role").(string)
	if !ok || !strings.Contains(","+strings.ToLower(role)+",", ",super_admin,") {
		return c.Status(403).JSON(fiber.Map{
			"status":  "error",
			"message": "Akses ditolak. Hanya Super Admin yang dapat mereset database.",
		})
	}

	var payload struct {
		Confirmation string `json:"confirmation"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	if payload.Confirmation != "RESET" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Konfirmasi tidak valid"})
	}

	log.Println("[WARNING] Factory Reset Initiated by Super Admin")

	tx := config.DB.Begin()

	queries := []string{
		"TRUNCATE TABLE mahasiswa.mahasiswa CASCADE",
		"TRUNCATE TABLE ormawa.ormawa CASCADE",
		"TRUNCATE TABLE fakultas.fakultas CASCADE",
		"TRUNCATE TABLE fakultas.program_studi CASCADE",
		"TRUNCATE TABLE fakultas.dosen CASCADE",
		"TRUNCATE TABLE psikolog.profiles CASCADE",
		"TRUNCATE TABLE public.tenaga_kesehatan CASCADE",
		"TRUNCATE TABLE ormawa.kategori_ormawa CASCADE",
		"TRUNCATE TABLE fakultas.academic_periods CASCADE",
		"TRUNCATE TABLE fakultas.pengaturan_akademik CASCADE",
		"TRUNCATE TABLE fakultas.program_mbkm CASCADE",
		"TRUNCATE TABLE mahasiswa.notifikasi CASCADE",
		"TRUNCATE TABLE mahasiswa.log_aktivitas CASCADE",
		"TRUNCATE TABLE ormawa.proposal CASCADE",
		"DELETE FROM public.users WHERE role NOT IN ('super_admin', 'Super Admin')",
	}

	for _, query := range queries {
		if err := tx.Exec(query).Error; err != nil {
			tx.Rollback()
			log.Printf("[ERROR] Factory Reset failed at query: %s. Error: %v\n", query, err)
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset database: " + err.Error()})
		}
	}

	tx.Commit()

	log.Println("[SUCCESS] Factory Reset Completed")
	return c.JSON(fiber.Map{"status": "success", "message": "Database berhasil di-reset ke pengaturan awal"})
}

// ========================
// PMB (Penerimaan Mahasiswa Baru)
// ========================

func GetAllPMB(c *fiber.Ctx) error {
	var records []models.PendaftaranMahasiswaBaru
	query := config.DB.Order("id DESC")

	// Search
	search := c.Query("search")
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("nama_lengkap ILIKE ? OR nim ILIKE ? OR nomor_daftar ILIKE ? OR email ILIKE ? OR no_hp ILIKE ?", like, like, like, like, like)
	}

	// Filter by jalur
	jalur := c.Query("jalur")
	if jalur != "" && jalur != "all" {
		query = query.Where("jalur = ?", jalur)
	}

	// Filter by periode (sekarang sebagai Tahun, misal: "2024")
	periode := c.Query("periode")
	if periode != "" && periode != "all" {
		query = query.Where("id_periode LIKE ?", periode+"%")
	}

	query.Find(&records)
	return c.JSON(fiber.Map{"status": "success", "data": records})
}

func GetPMBStats(c *fiber.Ctx) error {
	var total int64
	config.DB.Model(&models.PendaftaranMahasiswaBaru{}).Count(&total)

	var laki int64
	config.DB.Model(&models.PendaftaranMahasiswaBaru{}).Where("jenis_kelamin = ?", "L").Count(&laki)

	var perempuan int64
	config.DB.Model(&models.PendaftaranMahasiswaBaru{}).Where("jenis_kelamin = ?", "P").Count(&perempuan)

	// Count by jalur
	type JalurCount struct {
		Jalur string `json:"jalur"`
		Count int64  `json:"count"`
	}
	var jalurCounts []JalurCount
	config.DB.Model(&models.PendaftaranMahasiswaBaru{}).
		Select("jalur, count(*) as count").
		Group("jalur").
		Order("count desc").
		Find(&jalurCounts)

	// Count by periode
	type PeriodeCount struct {
		PeriodeDaftar string `json:"periode_daftar"`
		Count         int64  `json:"count"`
	}
	var periodeCounts []PeriodeCount
	config.DB.Model(&models.PendaftaranMahasiswaBaru{}).
		Select("periode_daftar, count(*) as count").
		Group("periode_daftar").
		Order("count desc").
		Limit(10).
		Find(&periodeCounts)

	var anomali int64
	config.DB.Model(&models.SevimaPMBAnomali{}).Count(&anomali)

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"total":      total,
			"laki":       laki,
			"perempuan":  perempuan,
			"by_jalur":   jalurCounts,
			"by_periode": periodeCounts,
			"anomali":    anomali,
		},
	})
}

// ResetStudentsData hard resets all student data and accounts
func ResetStudentsData(c *fiber.Ctx) error {
	tx := config.DB.Begin()

	// 1. Truncate mahasiswa and cascade delete related data
	if err := tx.Exec("TRUNCATE TABLE mahasiswa.mahasiswa CASCADE").Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset tabel mahasiswa"})
	}
	if err := tx.Exec("TRUNCATE TABLE mahasiswa.sevima_anomali").Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset anomali mahasiswa"})
	}

	// Remove dependent user data before deleting the users
	if err := tx.Exec("DELETE FROM mahasiswa.log_aktivitas WHERE user_id IN (SELECT id FROM public.users WHERE role IN ('student', 'mahasiswa'))").Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membersihkan log aktivitas"})
	}
	if err := tx.Exec("DELETE FROM mahasiswa.notifikasi WHERE user_id IN (SELECT id FROM public.users WHERE role IN ('student', 'mahasiswa'))").Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membersihkan notifikasi"})
	}

	// 2. Delete user accounts for students
	if err := tx.Exec("DELETE FROM public.users WHERE role IN ('student', 'mahasiswa')").Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus akun mahasiswa"})
	}

	// 3. Truncate PMB just to be completely clean
	tx.Exec("TRUNCATE TABLE public.pendaftaran_mahasiswa_baru CASCADE")

	tx.Commit()

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Seluruh data mahasiswa berhasil direset!",
	})
}

// ResetPMBData hard resets PMB data
func ResetPMBData(c *fiber.Ctx) error {
	if err := config.DB.Exec("TRUNCATE TABLE public.pendaftaran_mahasiswa_baru CASCADE").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset tabel PMB: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Data PMB berhasil direset total!"})
}

// ResetFakultasData hard resets Fakultas data
func ResetFakultasData(c *fiber.Ctx) error {
	if err := config.DB.Exec("TRUNCATE TABLE fakultas.fakultas CASCADE").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset tabel fakultas: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Data Fakultas berhasil direset total!"})
}

// ResetProdiData hard resets Program Studi data
func ResetProdiData(c *fiber.Ctx) error {
	if err := config.DB.Exec("TRUNCATE TABLE fakultas.program_studi CASCADE").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset tabel prodi: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Data Program Studi berhasil direset total!"})
}

// ResetLecturersData hard resets Lecturer data
func ResetLecturersData(c *fiber.Ctx) error {
	tx := config.DB.Begin()

	if err := tx.Exec("TRUNCATE TABLE fakultas.dosen CASCADE").Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mereset tabel dosen: " + err.Error()})
	}

	// Delete user accounts for lecturers
	if err := tx.Exec("DELETE FROM public.users WHERE role = 'dosen'").Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus akun pengguna dosen: " + err.Error()})
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Data Dosen berhasil direset total!"})
}
