package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Documentation represents a dynamic CMS page for the documentation section
type Documentation struct {
	ID          uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	MenuID      string         `gorm:"type:varchar(100);uniqueIndex;not null" json:"menu_id"` // Matches the activeDocTab id, e.g., 'sa_dashboard'
	Title       string         `gorm:"type:varchar(255);not null" json:"title"`
	Subtitle    string         `gorm:"type:varchar(500)" json:"subtitle"`
	ContentHTML string         `gorm:"type:text" json:"content_html"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}
