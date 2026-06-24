package models

import (
	"gorm.io/gorm"
)

// Role represents a user role in the new RBAC system
type Role struct {
	BaseModel
	Name        string `gorm:"uniqueIndex;size:80;not null" json:"name"`
	Label       string `gorm:"size:120;not null" json:"label"`
	Description string `gorm:"type:text" json:"description"`
	IsSystem    bool   `gorm:"default:false" json:"is_system"` // System roles cannot be deleted

	Permissions []Permission `gorm:"many2many:role_permissions;" json:"permissions,omitempty"`
}

func (Role) TableName() string {
	return "public.roles"
}

// Permission represents an atomic access right
type Permission struct {
	BaseModel
	Key         string `gorm:"uniqueIndex;size:100;not null" json:"key"` // e.g. "students.view"
	Category    string `gorm:"size:50;index" json:"category"`            // e.g. "students", "faculty"
	Description string `gorm:"type:text" json:"description"`

	Roles []Role `gorm:"many2many:role_permissions;" json:"roles,omitempty"`
}

func (Permission) TableName() string {
	return "public.permissions"
}

// RolePermission is the pivot table for Role and Permission
type RolePermission struct {
	RoleID       uint `gorm:"primaryKey" json:"role_id"`
	PermissionID uint `gorm:"primaryKey" json:"permission_id"`

	Role       Role       `gorm:"foreignKey:RoleID" json:"-"`
	Permission Permission `gorm:"foreignKey:PermissionID" json:"-"`
}

func (RolePermission) TableName() string {
	return "public.role_permissions"
}

// UserRole maps a User to a Role, with optional scope constraints
type UserRole struct {
	BaseModel
	UserID uint `gorm:"index;not null" json:"user_id"`
	RoleID uint `gorm:"index;not null" json:"role_id"`

	User User `gorm:"foreignKey:UserID" json:"-"`
	Role Role `gorm:"foreignKey:RoleID" json:"role,omitempty"`

	// Scope constraints
	ScopeType string `gorm:"size:50;index" json:"scope_type"` // e.g. "faculty", "prodi", "ormawa"
	ScopeID   uint   `gorm:"index" json:"scope_id"`           // e.g. 1 (Fakultas ID 1)
}

func (UserRole) TableName() string {
	return "public.user_roles"
}

// BeforeDelete hook for Role to prevent deletion of system roles
func (r *Role) BeforeDelete(tx *gorm.DB) error {
	if r.IsSystem {
		return gorm.ErrInvalidData // Cannot delete system roles
	}
	return nil
}
