package models

// OrmawaFinancialSetting menyimpan pengaturan batas anggaran/pagu untuk tiap ORMAWA per periode
type OrmawaFinancialSetting struct {
	BaseModel
	OrmawaID         uint    `gorm:"index" json:"ormawa_id"`
	Ormawa           Ormawa  `gorm:"foreignKey:OrmawaID" json:"ormawa,omitempty"`
	Periode          string  `gorm:"size:20;index" json:"periode"` // e.g., "2024" or "2024/2025"
	BudgetLimit      float64 `gorm:"type:decimal(15,2);default:0" json:"budget_limit"`
	WarningThreshold int     `gorm:"default:80" json:"warning_threshold"` // percentage 0-100
	EnforceLimit     bool    `gorm:"default:true" json:"enforce_limit"`
	IsActive         bool    `gorm:"default:true" json:"is_active"`

	AuditLogs []OrmawaFinancialAuditLog `gorm:"foreignKey:SettingID" json:"audit_logs,omitempty"`
}

func (OrmawaFinancialSetting) TableName() string {
	return "ormawa.ormawa_financial_settings"
}

// OrmawaFinancialAuditLog menyimpan riwayat perubahan pada pengaturan anggaran atau penolakan pengajuan
type OrmawaFinancialAuditLog struct {
	BaseModel
	SettingID uint                   `gorm:"index" json:"setting_id"`
	Setting   OrmawaFinancialSetting `gorm:"foreignKey:SettingID" json:"setting,omitempty"`

	Action    string `gorm:"size:50" json:"action"` // CREATE, UPDATE_BUDGET, REJECT_PROPOSAL
	OldValue  string `gorm:"type:text" json:"old_value"`
	NewValue  string `gorm:"type:text" json:"new_value"`
	ChangedBy uint   `gorm:"index" json:"changed_by"`
	User      User   `gorm:"foreignKey:ChangedBy" json:"user,omitempty"`
	Reason    string `gorm:"type:text" json:"reason"`
}

func (OrmawaFinancialAuditLog) TableName() string {
	return "ormawa.ormawa_financial_audit_logs"
}
