package models

import (
	"time"
)

// SmtpSetting menyimpan konfigurasi pengiriman email dan template notifikasi
type SmtpSetting struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Provider  string    `gorm:"type:varchar(50);default:'SMTP'" json:"provider"`
	MailDriver string   `gorm:"type:varchar(50);default:'smtp'" json:"mail_driver"`
	Host      string    `gorm:"type:varchar(100);default:'smtp.example.com'" json:"host"`
	Port      string    `gorm:"type:varchar(10);default:'465'" json:"port"`
	Username  string    `gorm:"type:varchar(100)" json:"username"`
	Password  string    `gorm:"type:varchar(255)" json:"password"`
	Encryption string   `gorm:"type:varchar(20);default:'TLS'" json:"encryption"`
	FromAddress string  `gorm:"type:varchar(100);default:'noreply@example.com'" json:"from_address"`
	OtpLifetime int     `gorm:"default:5" json:"otp_lifetime"` // Dalam menit

	// Template OTP
	OtpSubject string `gorm:"type:varchar(255);default:'Kode OTP Registrasi Anda'" json:"otp_subject"`
	OtpBody    string `gorm:"type:text" json:"otp_body"`

	// Template Peringatan LPJ
	LpjSubject string `gorm:"type:varchar(255);default:'Peringatan Keterlambatan LPJ'" json:"lpj_subject"`
	LpjBody    string `gorm:"type:text" json:"lpj_body"`

	// Template Pagu Disetujui
	PaguSubject string `gorm:"type:varchar(255);default:'Pagu Anggaran Disetujui'" json:"pagu_subject"`
	PaguBody    string `gorm:"type:text" json:"pagu_body"`

	UpdatedAt time.Time `json:"updated_at"`
}

func (SmtpSetting) TableName() string {
	return "public.smtp_settings"
}
