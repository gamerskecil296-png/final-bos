package models

import "gorm.io/gorm"

type ApiIntegration struct {
	gorm.Model
	Key       string `gorm:"uniqueIndex;not null" json:"key"`
	Name      string `json:"name"`
	Endpoint  string `json:"endpoint"`
	ClientKey string `json:"client_key"`
	Active    bool   `json:"active"`
}

// TableName overrides the default table name
func (ApiIntegration) TableName() string {
	return "api_integrations"
}
