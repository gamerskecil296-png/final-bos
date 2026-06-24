// ============================================================
// PERMISSION BRIDGE - Sinkronisasi Backend & Frontend
// File: backend/utils/permission_bridge.go
// Tanggal: 2026-06-19
// Purpose: Menjembatani 2 sistem permission yang berbeda
// ============================================================

package utils

// Legacy permission keys (from fakultas_rbac.go - backend)
// Format: simple_action_format
var LegacyPermissions = []string{
	"view_dashboard",
	"view_mahasiswa", "edit_mahasiswa",
	"view_psikolog",
	"view_prodi",
	"view_pkkmb",
	"view_organisasi",
	"view_proposal",
	"view_prestasi", "edit_prestasi",
	"view_beasiswa", "edit_beasiswa",
	"view_kesehatan",
	"view_aspirasi", "edit_aspirasi",
	"view_laporan",
	"view_pengaturan",
}

// New permission keys (from usePermission.js - frontend)
// Format: resource.action_format
var NewPermissions = []string{
	// Students
	"students.view", "students.create", "students.update", "students.delete",
	"student.profile.view", "student.profile.update",

	// Dashboard
	"admin.dashboard.view", "student.dashboard.view", "faculty.dashboard.view", "kencana.faculty.dashboard",

	// Faculty & Prodi
	"faculty.view", "faculty.create", "faculty.update", "faculty.delete",
	"program_studi.view", "program_studi.create", "program_studi.update",

	// Ormawa
	"ormawa.view", "ormawa.core.view",
	"ormawa.members.view", "ormawa.members.create", "ormawa.members.update", "ormawa.members.delete",
	"ormawa.proposals.view", "ormawa.proposals.create", "ormawa.proposals.update",
	"ormawa.finance.view", "ormawa.finance.create",
	"ormawa.lpj.view", "ormawa.lpj.create",
	"ormawa.aspirations.view", "ormawa.aspirations.respond",
	"ormawa.announcements.view", "ormawa.announcements.create",
	"ormawa.events.view", "ormawa.events.create",
	"ormawa.recruitment.view", "ormawa.update",

	// Kencana / PKKMB
	"kencana.faculty.dashboard", "kencana.period.view", "kencana.stage.view",
	"kencana.student.dashboard", "kencana.student.timeline", "kencana.student.session",
	"kencana.manage", "kencana.handbook.view", "kencana.handbook.update",

	// Scholar & Achievement
	"scholarship.view", "scholarship.manage",
	"achievement.view", "achievement.create", "achievement.update",

	// Health & Psychological
	"health.view", "health.dashboard.view", "health.schedules.view", "health.schedules.manage",
	"health.bookings.view", "health.bookings.manage", "health.medical_records.view",
	"health.bap.manage",

	"psychologist.view", "psychologist.core", "psychologist.dashboard.view",
	"psychologist.schedules.view", "psychologist.schedules.create", "psychologist.schedules.update", "psychologist.schedules.delete",
	"psychologist.bookings.view", "psychologist.bookings.create", "psychologist.bookings.update", "psychologist.bookings.delete",
	"psychologist.patients.view", "psychologist.patients.create", "psychologist.patients.update", "psychologist.patients.delete",
	"psychologist.medical_records.view", "psychologist.medical_records.create", "psychologist.medical_records.update", "psychologist.medical_records.delete",
	"psychologist.referrals.view", "psychologist.referrals.create", "psychologist.referrals.update", "psychologist.referrals.delete",
	"psychologist.reports.view", "psychologist.reports.create", "psychologist.reports.update", "psychologist.reports.delete",

	// Aspirasi / Student Voice
	"aspiration.view", "voice.view", "aspiration.create", "aspiration.respond",

	// RBAC & System
	"rbac.users.view", "rbac.roles.view", "rbac.permissions.assign",
	"faculty_rbac.view", "faculty_rbac.manage", "faculty.manage",
	"system_settings.view", "system_settings.update",

	// Report & Audit
	"report.view", "admin.audit.view",

	// User Management
	"user.manage",

	// Global
	"dashboard.view",
}

// Mapping dari Legacy -> New Format
// Digunakan oleh backend untuk generate permissions baru saat auto-seed
var LegacyToNewMapping = map[string][]string{
	"view_dashboard":      {"admin.dashboard.view", "student.dashboard.view", "faculty.dashboard.view", "dashboard.view"},
	"view_mahasiswa":       {"students.view"},
	"edit_mahasiswa":       {"students.update", "students.create"},
	"view_prodi":           {"program_studi.view"},
	"view_pkkmb":           {"kencana.faculty.dashboard", "pkkmb.view"},
	"view_organisasi":      {"ormawa.view", "ormawa.core.view"},
	"view_proposal":        {"ormawa.proposals.view", "proposal.view"},
	"view_prestasi":        {"achievement.view"},
	"edit_prestasi":        {"achievement.update"},
	"view_beasiswa":        {"scholarship.view"},
	"edit_beasiswa":        {"scholarship.manage"},
	"view_kesehatan":       {"health.view", "health.dashboard.view"},
	"view_aspirasi":        {"aspiration.view", "voice.view"},
	"edit_aspirasi":        {"aspiration.respond"},
	"view_laporan":         {"report.view", "admin.audit.view"},
	"view_pengaturan":      {"admin.profile.update"},
	"view_psikolog":        {"psychologist.view", "psychologist.dashboard.view"},
}

// GetNewPermissionsFromLegacy converts legacy permissions to new format
func GetNewPermissionsFromLegacy(legacyPerms []string) []string {
	seen := make(map[string]bool)
	result := []string{}

	for _, legacy := range legacyPerms {
		// Add legacy permission itself
		if !seen[legacy] {
			seen[legacy] = true
			result = append(result, legacy)
		}

		// Add mapped new permissions
		if newPerms, ok := LegacyToNewMapping[legacy]; ok {
			for _, np := range newPerms {
				if !seen[np] {
					seen[np] = true
					result = append(result, np)
				}
			}
		}
	}

	return result
}

// GetAllStudentPermissions returns all permissions for student role
func GetAllStudentPermissions() []string {
	return []string{
		// View permissions
		"student.dashboard.view",
		"student.profile.view",
		"kencana.student.dashboard",
		"kencana.student.timeline",
		"kencana.student.session",
		"psychologist.bookings.view",
		"health.bookings.view",
		"scholarship.view",
		"achievement.view",
		"ormawa.view",
		"aspiration.view",

		// Edit permissions (limited)
		"student.profile.update",
		"achievement.create",
		"aspiration.create",
	}
}

// GetAllFacultyAdminPermissions returns all permissions for faculty admin role
func GetAllFacultyAdminPermissions() []string {
	perms := []string{
		"faculty.dashboard.view",
		"faculty.view",
		"students.view", "students.create", "students.update",
		"faculty_prodi.view",
		"kencana.faculty.dashboard",
		"ormawa.view",
		"ormawa.proposals.view",
		"achievement.view", "achievement.update",
		"scholarship.view", "scholarship.manage",
		"health.view",
		"psychologist.view",
		"aspiration.view", "aspiration.respond",
		"report.view",
		"faculty_rbac.view", "faculty_rbac.manage",
	}

	// Add all legacy permissions
	for _, lp := range LegacyPermissions {
		perms = append(perms, lp)
	}

	return perms
}

// ValidatePermission checks if a permission key is valid
func ValidatePermission(perm string) bool {
	// Check in new permissions
	for _, np := range NewPermissions {
		if np == perm {
			return true
		}
	}
	// Check in legacy permissions
	for _, lp := range LegacyPermissions {
		if lp == perm {
			return true
		}
	}
	return false
}
