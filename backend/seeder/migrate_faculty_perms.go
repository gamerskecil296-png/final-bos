package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"siakad-backend/config"
	"siakad-backend/models"
)

func main() {
	config.ConnectDB()

	var roles []models.RBACRole
	if err := config.DB.Find(&roles).Error; err != nil {
		log.Fatalf("Gagal mengambil roles: %v", err)
	}

	// Faculty capabilities analysis:
	//   Prestasi: View + Update (verifikasi). No create, no delete (controller returns 403).
	//   Beasiswa: View only (program list + pendaftar list). No CUD on programs. No verifikasi/delete pendaftar (controller returns 403).
	//   Aspirasi: View + Update (tanggapi) + Delete (arsipkan). No create.

	// Permissions that should NOT exist on faculty roles
	invalidFacultyPerms := map[string]bool{
		// Old un-prefixed permissions (should be faculty.* now)
		"achievement.view":   true,
		"achievement.create": true,
		"achievement.update": true,
		"achievement.delete": true,
		"scholarship.view":   true,
		"scholarship.create": true,
		"scholarship.update": true,
		"scholarship.delete": true,
		"aspiration.view":    true,
		"aspiration.create":  true,
		"aspiration.update":  true,
		"aspiration.delete":  true,
		// Faculty-prefixed permissions that don't match actual capabilities
		"faculty.achievement.create": true, // Faculty can't create prestasi
		"faculty.achievement.delete": true, // Faculty can't delete prestasi (returns 403)
		"faculty.scholarship.create": true, // Faculty can't create beasiswa programs
		"faculty.scholarship.update": true, // Faculty can't update beasiswa programs
		"faculty.scholarship.delete": true, // Faculty can't delete beasiswa programs
		"faculty.aspiration.create":  true, // Faculty can't create aspirasi
	}

	// Valid faculty permissions for these features
	validFacultyPerms := map[string]bool{
		"faculty.achievement.view":   true,
		"faculty.achievement.update": true,
		"faculty.scholarship.view":   true,
		"faculty.aspiration.view":    true,
		"faculty.aspiration.update":  true,
		"faculty.aspiration.delete":  true,
	}

	// Mapping from old to new (for those that have a valid equivalent)
	oldToNew := map[string]string{
		"achievement.view":   "faculty.achievement.view",
		"achievement.update": "faculty.achievement.update",
		"scholarship.view":   "faculty.scholarship.view",
		"aspiration.view":    "faculty.aspiration.view",
		"aspiration.update":  "faculty.aspiration.update",
		"aspiration.delete":  "faculty.aspiration.delete",
	}

	for _, role := range roles {
		if role.Key == "super_admin" {
			continue
		}

		var perms []string
		if err := json.Unmarshal(role.Permissions, &perms); err != nil {
			log.Printf("Gagal parse permissions untuk role %s: %v", role.Key, err)
			continue
		}

		isFacultyRole := role.Key == "faculty_admin" || role.Key == "prodi_admin" || strings.Contains(role.Key, "fakultas")
		if !isFacultyRole {
			continue
		}

		changed := false
		seen := make(map[string]bool)
		var newPerms []string

		for _, p := range perms {
			if invalidFacultyPerms[p] {
				// Check if there's a valid replacement
				if newPerm, ok := oldToNew[p]; ok {
					if !seen[newPerm] {
						newPerms = append(newPerms, newPerm)
						seen[newPerm] = true
					}
				}
				// Otherwise just drop it
				changed = true
				continue
			}

			// Keep valid permissions
			if !seen[p] {
				newPerms = append(newPerms, p)
				seen[p] = true
			}
		}

		// Ensure all valid faculty permissions exist
		for vp := range validFacultyPerms {
			if !seen[vp] {
				newPerms = append(newPerms, vp)
				seen[vp] = true
				changed = true
			}
		}

		if changed {
			newPermsBytes, _ := json.Marshal(newPerms)
			role.Permissions = newPermsBytes
			if err := config.DB.Save(&role).Error; err != nil {
				log.Printf("Gagal menyimpan role %s: %v", role.Key, err)
			} else {
				fmt.Printf("✅ Role %s updated\n", role.Key)
				fmt.Printf("   Permissions: %s\n", string(newPermsBytes))
			}
		} else {
			fmt.Printf("⏭️  Role %s already correct\n", role.Key)
		}
	}
	fmt.Println("\nSelesai migrasi permission faculty.")
}
