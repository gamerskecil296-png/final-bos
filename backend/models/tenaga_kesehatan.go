package models

import (
	"time"
)

type TenagaKesehatan struct {
	BaseModel
	UserID uint `gorm:"uniqueIndex" json:"user_id"`
	User   User `gorm:"foreignKey:UserID" json:"user,omitempty"`

	Nama         string `json:"nama"`
	Email        string `json:"email"`
	NoHP         string `json:"no_hp"`
	Spesialisasi string `json:"spesialisasi"`
	FotoURL      string `json:"foto_url"`
	Lokasi       string `json:"lokasi"`
	IsAktif      bool   `gorm:"default:true" json:"is_aktif"`

	ScopeType      string `gorm:"default:'university'" json:"scope_type"`
	FakultasID     *uint  `json:"fakultas_id"`
	ProgramStudiID *uint  `json:"program_studi_id"`
}

func (TenagaKesehatan) TableName() string {
	return "public.tenaga_kesehatan"
}

type JadwalKesehatan struct {
	BaseModel
	TenagaKesID uint            `gorm:"index" json:"tenaga_kes_id"`
	TenagaKes   TenagaKesehatan `gorm:"foreignKey:TenagaKesID" json:"tenaga_kes,omitempty"`

	Tanggal     time.Time `json:"tanggal"`
	JamMulai    string    `json:"jam_mulai"`
	JamSelesai  string    `json:"jam_selesai"`
	Kuota       int       `json:"kuota"`
	Lokasi      string    `json:"lokasi"`
	TipeLayanan string    `json:"tipe_layanan"` // Pemeriksaan Umum / Konsultasi Gizi / Screening Khusus / Lainnya
	EventID     *uint     `gorm:"index" json:"event_id,omitempty"`
	Catatan     string    `json:"catatan"`
	IsRepeat    bool      `gorm:"default:false" json:"is_repeat"`
	RepeatDays  string    `json:"repeat_days"` // e.g. "Monday,Wednesday"
}

func (JadwalKesehatan) TableName() string {
	return "public.jadwal_kesehatan"
}

type BookingKesehatan struct {
	BaseModel
	JadwalID    uint            `gorm:"index" json:"jadwal_id"`
	Jadwal      JadwalKesehatan `gorm:"foreignKey:JadwalID" json:"jadwal,omitempty"`
	MahasiswaID uint            `gorm:"index" json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa       `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`

	Keluhan          string `json:"keluhan"`
	Status           string `gorm:"index;default:'Menunggu Konfirmasi'" json:"status"` // Menunggu Konfirmasi / Dikonfirmasi / Ditolak / Selesai
	AlasanPenolakan  string `json:"alasan_penolakan"`
	JenisPendaftaran string `gorm:"default:'Online'" json:"jenis_pendaftaran"` // Online / Offline
}

func (BookingKesehatan) TableName() string {
	return "public.booking_kesehatan"
}

type PemeriksaanMassal struct {
	BaseModel
	NamaEvent      string            `json:"nama_event"`
	TanggalMulai   time.Time         `json:"tanggal_mulai"`
	TanggalSelesai time.Time         `json:"tanggal_selesai"`
	Lokasi         string            `json:"lokasi"`
	TargetPeserta  int               `json:"target_peserta"`
	StatusEvent    string            `gorm:"default:'Akan Datang'" json:"status_event"` // Akan Datang / Berlangsung / Selesai
	Petugas        []TenagaKesehatan `gorm:"many2many:public.pemeriksaan_massal_petugas" json:"petugas"`
}

func (PemeriksaanMassal) TableName() string {
	return "public.pemeriksaan_massal"
}
