package models

import "time"

type JadwalKonseling struct {
	BaseModel
	Kategori     string    `json:"kategori"`      // Akademik, Karir, Personal
	NamaKonselor string    `json:"nama_konselor"` // Nama psikiater atau pembimbing
	Tanggal      time.Time `json:"tanggal"`
	JamMulai     string    `json:"jam_mulai"`
	JamSelesai   string    `json:"jam_selesai"`
	Lokasi       string    `json:"lokasi"` // Ruangan
	Kuota        int       `json:"kuota"`
	SisaKuota    int       `json:"sisa_kuota"`
	IsAktif      bool      `json:"is_aktif" gorm:"default:true"`
}

func (JadwalKonseling) TableName() string {
	return "mahasiswa.jadwal_konseling"
}
