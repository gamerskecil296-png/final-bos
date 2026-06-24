package main

import (
	"fmt"
	"log"
	"siakad-backend/config"
	"siakad-backend/models"
)

func main() {
	config.ConnectDB()

	// 1. Get faculty_admin role
	var role models.Role
	if err := config.DB.Preload("Permissions").Where("name = ?", "faculty_admin").First(&role).Error; err != nil {
		log.Fatal("Role not found:", err)
	}

	// 2. Ensure faculty_ormawa.view exists
	var permView models.Permission
	if err := config.DB.Where("key = ?", "faculty_ormawa.view").First(&permView).Error; err != nil {
		permView = models.Permission{
			Key:         "faculty_ormawa.view",
			Description: "Melihat daftar ORMAWA Fakultas",
		}
		config.DB.Create(&permView)
	}

	// 3. Get or find faculty_ormawa.manage (to remove it)
	var permManage models.Permission
	config.DB.Where("key = ?", "faculty_ormawa.manage").First(&permManage)

	// 4. Update the role's permissions
	hasView := false
	var newPerms []models.Permission
	for _, p := range role.Permissions {
		if p.Key == "faculty_ormawa.manage" || p.Key == "kencana.ormawa.manage" {
			fmt.Printf("Removing permission: %s\n", p.Key)
			continue // Skip adding it
		}
		if p.Key == "faculty_ormawa.view" {
			hasView = true
		}
		newPerms = append(newPerms, p)
	}

	if !hasView {
		fmt.Printf("Adding permission: faculty_ormawa.view\n")
		newPerms = append(newPerms, permView)
	}

	if err := config.DB.Model(&role).Association("Permissions").Replace(newPerms); err != nil {
		log.Fatal("Failed to update role permissions:", err)
	}

	fmt.Println("Role updated successfully!")
	
	// Update RBAC table as well (legacy system)
	var rbacRole models.RBACRole
	if err := config.DB.Where("key = ?", "faculty_admin").First(&rbacRole).Error; err == nil {
		// Just rewrite the legacy json if needed, but the modern table `user_roles`/`role_permissions` is updated above.
		fmt.Println("RBAC legacy role found, but skipping manual JSON patch for now as modern takes precedence.")
	}
}
