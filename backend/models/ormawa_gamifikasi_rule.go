package models

type OrmawaGamifikasiRule struct {
	BaseModel
	Key       string `gorm:"uniqueIndex;size:100;not null" json:"key"`
	Label     string `gorm:"size:255;not null" json:"label"`
	Poin      int    `gorm:"default:0" json:"poin"`
	Deskripsi string `gorm:"type:text" json:"deskripsi"`
}

func (OrmawaGamifikasiRule) TableName() string {
	return "ormawa.ormawa_gamifikasi_rules"
}
