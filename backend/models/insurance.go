package models

import (
	"gorm.io/gorm"
	"time"
)

// PengajuanAsuransi - Model untuk pengajuan klaim asuransi mahasiswa
// Satu tabel dengan kolom jenis_provider untuk membedakan provider asuransi
type PengajuanAsuransi struct {
	BaseModel
	MahasiswaID uint      `gorm:"index;not null" json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`

	JenisProvider   string    `gorm:"size:50;not null;index" json:"jenis_provider"` // BKU_Assurance, BPJS, Asuransi_Lain
	TanggalKejadian time.Time `gorm:"not null" json:"tanggal_kejadian"`
	LokasiFaskes    string    `gorm:"size:255" json:"lokasi_faskes"` // RS atau Klinik tempat dirawat
	Deskripsi       string    `gorm:"type:text" json:"deskripsi"`    // Kronologis kejadian
	EstimasiBiaya   float64   `gorm:"default:0" json:"estimasi_biaya"`

	// Dokumen pendukung
	FileURL   string `gorm:"size:500" json:"file_url"`   // Path ke dokumen upload
	FileURL2  string `gorm:"size:500" json:"file_url_2"` // Dokumen tambahan (kwitansi, dll)
	NamaFile  string `gorm:"size:255" json:"nama_file"`
	NamaFile2 string `gorm:"size:255" json:"nama_file_2"`

	// Review status - mengikuti flow approval 2-level
	Status string `gorm:"size:30;default:'PENDING_VERIFICATION';index" json:"status"`
	// Status: PENDING_VERIFICATION | APPROVED_TK | APPROVED_FINAL | REJECTED

	CatatanReview string     `gorm:"type:text" json:"catatan_review"`
	ReviewedBy    *uint      `gorm:"index" json:"reviewed_by,omitempty"` // UserID reviewer (TK/Admin)
	ReviewedAt    *time.Time `json:"reviewed_at,omitempty"`

	// PDF Surat Pengantar (generated setelah TK approve)
	SuratPengantarURL string `gorm:"size:500" json:"surat_pengantar_url"`
}

func (PengajuanAsuransi) TableName() string {
	return "public.pengajuan_asuransi"
}

// Status constants
const (
	StatusAsuransiPending       = "PENDING_VERIFICATION"
	StatusAsuransiApprovedTK    = "APPROVED_TK"
	StatusAsuransiApprovedFinal = "APPROVED_FINAL"
	StatusAsuransiRejected      = "REJECTED"
)

// JenisProvider constants
const (
	ProviderBKUAssurance = "BKU_Assurance"
	ProviderBPJS         = "BPJS"
	ProviderAsuransiLain = "Asuransi_Lain"
)

// berita_acara_pemeriksaan - Model untuk BAP Kesehatan per event
type BeritaAcaraPemeriksaan struct {
	BaseModel
	EventID    *uint  `gorm:"index" json:"event_id,omitempty"` // FK ke pemeriksaan_massal
	TKID       *uint  `gorm:"index" json:"tk_id,omitempty"`    // FK ke tenaga_kesehatan
	NomorSurat string `gorm:"size:255" json:"nomor_surat"`

	NamaKegiatan       string    `gorm:"size:255;not null" json:"nama_kegiatan"`
	TanggalPelaksanaan time.Time `gorm:"not null" json:"tanggal_pelaksanaan"`
	WaktuMulai         string    `gorm:"size:20" json:"waktu_mulai"`
	WaktuSelesai       string    `gorm:"size:20" json:"waktu_selesai"`
	Tempat             string    `gorm:"size:255" json:"tempat"`
	JumlahPeserta      int       `gorm:"default:0" json:"jumlah_peserta"`
	JumlahDiperiksa    int       `gorm:"default:0" json:"jumlah_diperiksa"`

	Status string `gorm:"size:20;default:'DRAFT'" json:"status"` // DRAFT, FINAL

	// Data agregat statistik
	TotalLayak      int `gorm:"default:0" json:"total_layak"`
	TotalPantauan   int `gorm:"default:0" json:"total_pantauan"`
	TotalTidakLayak int `gorm:"default:0" json:"total_tidak_layak"`

	// Tanda tangan (for PDF)
	FotoKegiatan        string    `gorm:"type:text" json:"foto_kegiatan"`         // Array JSON URL Foto
	TTDKepalaDivisiNama string `gorm:"size:255" json:"ttd_kepala_divisi_nama"` // Nama
	TTDKepalaDivisiNIK  string `gorm:"size:100" json:"ttd_kepala_divisi_nik"`  // NIP/NIK
	TTDTimMedisNama     string `gorm:"size:255" json:"ttd_tim_medis_nama"`     // Nama
	TTDTimMedisNIK      string `gorm:"size:100" json:"ttd_tim_medis_nik"`      // NIP/NIK
}

func (BeritaAcaraPemeriksaan) TableName() string {
	return "public.berita_acara_pemeriksaan"
}

// BAP Status constants
const (
	BAPStatusDraft = "DRAFT"
	BAPStatusFinal = "FINAL"
)

// self_screening - Model untuk Patient Intake Stage 1 (mahasiswa input subjektif)
type SelfScreening struct {
	BaseModel
	MahasiswaID uint      `gorm:"index;not null" json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`

	BookingID *uint `gorm:"index" json:"booking_id,omitempty"` // Opsional: link ke booking kesehatan
	TKID      *uint `gorm:"index" json:"tk_id,omitempty"`      // TK yang menangani

	// Data Subjektif (diinput mahasiswa)
	KeluhanUtama string `gorm:"type:text" json:"keluhan_utama"`
	SkalaNyeri   int    `gorm:"default:0" json:"skala_nyeri"` // 0-10
	AlergiObat   string `gorm:"size:255" json:"alergi_obat"`
	KonsumsiObat string `gorm:"size:255" json:"konsumsi_obat"`

	// Status selesai pemeriksaan oleh TK
	IsCompletedTK bool       `gorm:"default:false" json:"is_completed_tk"`
	ScreenedAt    *time.Time `json:"screened_at,omitempty"`

	// Rujukan status (jika perlu)
	HasRujukan bool  `gorm:"default:false" json:"has_rujukan"`
	RujukanID  *uint `gorm:"index" json:"rujukan_id,omitempty"`
}

func (SelfScreening) TableName() string {
	return "public.self_screening"
}

// RujukanKesehatan - Model untuk surat rujukan ke faskes eksternal
type RujukanKesehatan struct {
	BaseModel
	SelfScreeningID *uint     `gorm:"index" json:"self_screening_id,omitempty"`
	KesehatanID     *uint     `gorm:"index" json:"kesehatan_id,omitempty"` // FK ke tabel kesehatan (screening TK)
	MahasiswaID     uint      `gorm:"index;not null" json:"mahasiswa_id"`
	Mahasiswa       Mahasiswa `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`
	NomorSurat      string    `gorm:"size:255" json:"nomor_surat"`

	FaskesTujuan  string `gorm:"size:255;not null" json:"faskes_tujuan"`  // RSUD, Puskesmas, Klinik UBK, dll
	AlasanRujukan string `gorm:"size:255;not null" json:"alasan_rujukan"` // Penanganan Lanjutan, Gawat Darurat, dll

	// Data medis untuk rujukan
	KeluhanUtama string  `gorm:"type:text" json:"keluhan_utama"`
	SuhuTubuh       float64 `json:"suhu_tubuh"`
	Sistole         int     `json:"sistole"`
	Diastole        int     `json:"diastole"`
	DenyutNadi      int     `json:"denyut_nadi"`
	RespirationRate int     `json:"respiration_rate"`
	SpO2            int     `json:"spo2"`
	Diagnosis    string  `gorm:"size:255" json:"diagnosis"`

	// Rekomendasi Asuransi
	RekomendasiAsuransi string `gorm:"size:50" json:"rekomendasi_asuransi"` // BPJS, BKU_Assurance, Asuransi_Lain

	// Status publish (mahasiswa baru bisa download setelah di-publish)
	IsPublished bool       `gorm:"default:false" json:"is_published"`
	PublishedAt *time.Time `json:"published_at,omitempty"`
	PublishedBy *uint      `gorm:"index" json:"published_by,omitempty"`

	ApprovalStatus  string     `gorm:"size:50;default:'pending'" json:"approval_status"` // pending, disetujui, ditolak
	ApprovalNote    string     `gorm:"type:text" json:"approval_note"`
	Status          string     `gorm:"size:50;default:'Menunggu Persetujuan'" json:"status"` // Menunggu Persetujuan, Selesai, Ditolak
	TanggalDikirim  *time.Time `json:"tanggal_dikirim,omitempty"`
	TanggalDiterima *time.Time `json:"tanggal_diterima,omitempty"`

	// PDF URL (generated)
	SuratRujukanURL string `gorm:"size:500" json:"surat_rujukan_url"`
}

func (RujukanKesehatan) TableName() string {
	return "public.rujukan_kesehatan"
}

// MigrateModels - fungsi untuk auto-migrate model baru
func MigrateModels(db *gorm.DB) {
	db.AutoMigrate(
		&PengajuanAsuransi{},
		&BeritaAcaraPemeriksaan{},
		&SelfScreening{},
		&RujukanKesehatan{},
	)
}
