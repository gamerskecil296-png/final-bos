package models

type DocumentSetting struct {
	BaseModel
	Modul       string `gorm:"size:100;index" json:"modul"`             // "Psikolog", "Medis"
	JenisSurat  string `gorm:"size:255;uniqueIndex" json:"jenis_surat"` // "Rujukan Medis", "BAP Kesehatan", "Rujukan Psikolog", "Hasil Konseling"
	FormatNomor string `gorm:"type:text" json:"format_nomor"`           // e.g. "{{nomor}}/RUJ-MEDIS/{{bulan_romawi}}/{{tahun}}"
	LastNumber  int    `gorm:"default:0" json:"last_number"`
	LastUpdate  string `gorm:"size:20" json:"last_update"`                    // format "2006" or "2006-01" to know when to reset
	ResetPeriod string `gorm:"size:50;default:'Tahunan'" json:"reset_period"` // "Tahunan", "Bulanan", "Tidak Pernah"
}

func (DocumentSetting) TableName() string {
	return "public.document_settings"
}
