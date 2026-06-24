package models

import (
	"time"

	"gorm.io/datatypes"
)

type Psikolog struct {
	BaseModel
	UserID uint `gorm:"uniqueIndex" json:"user_id"`
	User   User `gorm:"foreignKey:UserID" json:"user,omitempty"`

	Nama         string `json:"nama"`
	Email        string `json:"email"`
	NoHP         string `json:"no_hp"`
	Spesialisasi string `json:"spesialisasi"`
	Bio          string `json:"bio"`
	FotoURL      string `json:"foto_url"`
	Lokasi       string `json:"lokasi"`
	Bahasa       string `json:"bahasa"`
	Tarif        int    `json:"tarif"`
	IsAktif      bool   `gorm:"default:true" json:"is_aktif"`

	ScopeType      string `gorm:"default:'university'" json:"scope_type"`
	FakultasID     *uint  `json:"fakultas_id"`
	ProgramStudiID *uint  `json:"program_studi_id"`
}

func (Psikolog) TableName() string {
	return "psikolog.profiles"
}

type PsikologScheduleSlot struct {
	BaseModel
	PsikologID uint     `gorm:"index" json:"psikolog_id"`
	Psikolog   Psikolog `gorm:"foreignKey:PsikologID" json:"psikolog,omitempty"`

	Hari       string `gorm:"index" json:"hari"`
	Kategori   string `gorm:"index" json:"kategori"`
	JamMulai   string `json:"jam_mulai"`
	JamSelesai string `json:"jam_selesai"`
	Lokasi     string `json:"lokasi"`
	Kuota      int    `json:"kuota"`
	IsAktif    *bool  `gorm:"default:true" json:"is_aktif"`
}

func (PsikologScheduleSlot) TableName() string {
	return "psikolog.schedule_slots"
}

type PsikologBooking struct {
	BaseModel
	PsikologID  uint      `gorm:"index" json:"psikolog_id"`
	Psikolog    Psikolog  `gorm:"foreignKey:PsikologID" json:"psikolog,omitempty"`
	MahasiswaID uint      `gorm:"index" json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`

	Tanggal      time.Time `gorm:"index" json:"tanggal"`
	JamMulai     string    `json:"jam_mulai"`
	JamSelesai   string    `json:"jam_selesai"`
	Topik        string    `json:"topik"`
	Keluhan      string    `json:"keluhan"`
	Status       string    `gorm:"index" json:"status"`
	CatatanAdmin string    `json:"catatan_admin"`
	Mode         string    `gorm:"default:'Tatap Muka'" json:"mode"` // "Tatap Muka" atau "Online"
	LinkMeeting  string    `json:"link_meeting"`                     // diisi psikolog saat konfirmasi Online
}

func (PsikologBooking) TableName() string {
	return "psikolog.bookings"
}

type PsikologSessionNote struct {
	BaseModel
	PsikologID  uint             `gorm:"index" json:"psikolog_id"`
	Psikolog    Psikolog         `gorm:"foreignKey:PsikologID" json:"psikolog,omitempty"`
	MahasiswaID uint             `gorm:"index" json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa        `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`
	BookingID   *uint            `gorm:"index" json:"booking_id"`
	Booking     *PsikologBooking `gorm:"foreignKey:BookingID" json:"booking,omitempty"`

	Tanggal      time.Time `gorm:"index" json:"tanggal"`
	NomorSurat   string    `json:"nomor_surat"`
	Keluhan      string    `json:"keluhan"`
	Observasi    string    `json:"observasi"`
	Rekomendasi  string    `json:"rekomendasi"`
	Mood         string    `json:"mood"`
	JenisSesi    string    `json:"jenis_sesi"`
	StatusPasien string    `json:"status_pasien"`

	TujuanPemeriksaan    string     `json:"tujuan_pemeriksaan"`
	TanggalAsesmen       *time.Time `json:"tanggal_asesmen"`
	RiwayatKeluhan       string     `json:"riwayat_keluhan"`
	AspekKognitif        string     `json:"aspek_kognitif"`
	AspekEmosional       string     `json:"aspek_emosional"`
	AspekPerilaku        string     `json:"aspek_perilaku"`
	RekomendasiMahasiswa string     `json:"rekomendasi_mahasiswa"`
	RekomendasiProdi     string     `json:"rekomendasi_prodi"`
	RekomendasiOrangTua  string     `json:"rekomendasi_orang_tua"`
	TindakLanjutTuntas   bool       `json:"tindak_lanjut_tuntas"`
	TindakLanjutLanjutan bool       `json:"tindak_lanjut_lanjutan"`
	TindakLanjutRujuk    bool       `json:"tindak_lanjut_rujuk"`
	Kesimpulan           string     `json:"kesimpulan"`
	Siklus               int        `gorm:"default:1" json:"siklus"`
}

func (PsikologSessionNote) TableName() string {
	return "psikolog.session_notes"
}

type PsikologAssessment struct {
	BaseModel
	PsikologID  uint       `gorm:"index" json:"psikolog_id"`
	Psikolog    Psikolog   `gorm:"foreignKey:PsikologID" json:"psikolog,omitempty"`
	MahasiswaID *uint      `gorm:"index" json:"mahasiswa_id"`
	Mahasiswa   *Mahasiswa `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`

	Nama        string         `json:"nama"`
	Kategori    string         `gorm:"index" json:"kategori"`
	Deskripsi   string         `json:"deskripsi"`
	Skor        string         `json:"skor"`
	Status      string         `gorm:"index" json:"status"`
	SubmittedAt *time.Time     `json:"submitted_at"`
	Metadata    datatypes.JSON `json:"metadata"`
}

func (PsikologAssessment) TableName() string {
	return "psikolog.assessments"
}

type PsikologNotification struct {
	BaseModel
	PsikologID uint     `gorm:"index" json:"psikolog_id"`
	Psikolog   Psikolog `gorm:"foreignKey:PsikologID" json:"psikolog,omitempty"`
	UserID     uint     `gorm:"index" json:"user_id"`
	User       User     `gorm:"foreignKey:UserID" json:"user,omitempty"`

	Judul     string `json:"judul"`
	Deskripsi string `json:"deskripsi"`
	Tipe      string `gorm:"index" json:"tipe"`
	IsRead    bool   `gorm:"default:false" json:"is_read"`
}

func (PsikologNotification) TableName() string {
	return "psikolog.notifications"
}

type PsikologReferral struct {
	BaseModel
	PsikologID       uint             `gorm:"index" json:"psikolog_id"`
	Psikolog         Psikolog         `gorm:"foreignKey:PsikologID" json:"psikolog,omitempty"`
	MahasiswaID      uint             `gorm:"index" json:"mahasiswa_id"`
	Mahasiswa        Mahasiswa        `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`
	BookingID        *uint            `gorm:"index" json:"booking_id"`
	Booking          *PsikologBooking `gorm:"foreignKey:BookingID" json:"booking,omitempty"`
	Tipe             string           `json:"tipe"`
	NomorSurat       string           `json:"nomor_surat"`
	Alasan           string           `json:"alasan"`
	FilePendukungURL string           `json:"file_pendukung_url"`
	SuratRujiukanURL string           `json:"surat_rujiukan_url"`
	Status           string           `gorm:"index" json:"status"`
	// Approval by SuperAdmin
	ApprovalStatus  string     `gorm:"index;default:'menunggu_approval'" json:"approval_status"`
	ApprovalNote    string     `json:"approval_note"`
	PihakTujuan     string     `json:"pihak_tujuan"`
	EmailTujuan     string     `json:"email_tujuan"`
	TanggalDibuat   time.Time  `json:"tanggal_dibuat"`
	TanggalDikirim  *time.Time `json:"tanggal_dikirim"`
	TanggalDiterima *time.Time `json:"tanggal_diterima"`
}

func (PsikologReferral) TableName() string {
	return "psikolog.referrals"
}
