package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// ========================
// BASE
// ========================

type BaseModel struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// ========================
// USER
// ========================

type User struct {
	BaseModel
	Email          string `gorm:"column:email;uniqueIndex;not null" json:"email"`
	Password       string `gorm:"column:password" json:"-"`
	Role           string `gorm:"column:role;index" json:"role"`
	NamaLengkap    string `gorm:"column:nama_lengkap" json:"nama_lengkap"`
	NoHP           string `gorm:"column:no_hp" json:"no_hp"`
	AvatarURL      string `gorm:"column:avatar_url" json:"avatar_url"`
	FakultasID     *uint  `gorm:"column:fakultas_id;index" json:"fakultas_id"`
	ProgramStudiID *uint  `gorm:"column:program_studi_id;index" json:"program_studi_id"`
	OrmawaID       *uint  `gorm:"column:ormawa_id;index" json:"ormawa_id"`
	OrmawaAssign   string `gorm:"column:ormawa_assign;size:100" json:"ormawa_assign"`

	ResetOTP          string     `gorm:"column:reset_otp;size:6" json:"-"`
	ResetOTPExpiresAt *time.Time `gorm:"column:reset_otp_expires_at" json:"-"`
	ResetToken        string     `gorm:"column:reset_token;index" json:"-"`

	Dosen *Dosen `gorm:"foreignKey:PenggunaID" json:"dosen,omitempty"`
}

func (User) TableName() string {
	return "public.users"
}

type RBACRole struct {
	BaseModel
	Key         string         `gorm:"uniqueIndex;size:80;not null" json:"key"`
	Label       string         `gorm:"size:120;not null" json:"label"`
	Description string         `gorm:"type:text" json:"description"`
	Permissions datatypes.JSON `gorm:"type:jsonb" json:"permissions"`
	IsSystem    bool           `gorm:"default:false" json:"is_system"`
	Status      string         `gorm:"size:40;default:'active';index" json:"status"`
}

func (RBACRole) TableName() string { return "public.rbac_roles" }

// ========================
// MASTER DATA
// ========================

type Fakultas struct {
	BaseModel
	Nama  string
	Kode  string `gorm:"uniqueIndex"`
	Dekan string
	Email string
	NoHP  string

	ProgramStudi []ProgramStudi `gorm:"foreignKey:FakultasID"`
	Dosen        []Dosen        `gorm:"foreignKey:FakultasID"`
	Mahasiswa    []Mahasiswa    `gorm:"foreignKey:FakultasID"`
	Proposals    []Proposal     `gorm:"foreignKey:FakultasID"`
}

func (Fakultas) TableName() string {
	return "fakultas.fakultas"
}

type ProgramStudi struct {
	BaseModel
	FakultasID uint     `gorm:"index"`
	Fakultas   Fakultas `gorm:"foreignKey:FakultasID"`

	Nama             string
	Kode             string `gorm:"uniqueIndex:idx_prodi_kode,where:deleted_at IS NULL"`
	Jenjang          string
	Akreditasi       string
	CurrentMahasiswa int64 `json:"CurrentMahasiswa" gorm:"-"`
	KepalaProdi      string

	Dosen     []Dosen     `gorm:"foreignKey:ProgramStudiID"`
	Mahasiswa []Mahasiswa `gorm:"foreignKey:ProgramStudiID"`
}

func (ProgramStudi) TableName() string {
	return "fakultas.program_studi"
}

type Dosen struct {
	BaseModel
	PenggunaID uint  `json:"pengguna_id"`
	Pengguna   *User `gorm:"foreignKey:PenggunaID" json:"pengguna,omitempty"`

	NIDN           string `gorm:"uniqueIndex:idx_dosen_nidn_partial,where:n_id_n != ''"`
	Nama           string
	FakultasID     uint `gorm:"index"`
	ProgramStudiID uint `gorm:"index"`

	Fakultas     Fakultas
	ProgramStudi ProgramStudi

	Jabatan string
	IsDPA   bool
	Email   string
	NoHP    string
	Alamat  string

	// Additional Sevima Fields
	NIK               string
	NIP               string
	JenisKelamin      string
	TempatLahir       string
	TanggalLahir      string
	Agama             string
	StatusAktif       string
	StatusKepegawaian string

	MahasiswaBimbingan []Mahasiswa `gorm:"foreignKey:DosenPAID;references:ID"`
	Konseling          []Konseling
}

func (Dosen) TableName() string {
	return "fakultas.dosen"
}

type Mahasiswa struct {
	BaseModel
	PenggunaID uint `gorm:"column:pengguna_id;index;not null"`
	Pengguna   User `gorm:"foreignKey:PenggunaID;references:ID"`

	NIM  string `gorm:"column:nim;uniqueIndex"`
	Nama string `gorm:"column:nama_mahasiswa;index"`

	FakultasID     uint  `gorm:"column:fakultas_id;index"`
	ProgramStudiID uint  `gorm:"column:prodi_id;index"`
	DosenPAID      *uint `gorm:"column:dosen_pa_id;index"`

	Fakultas     Fakultas     `gorm:"foreignKey:FakultasID"`
	ProgramStudi ProgramStudi `gorm:"foreignKey:ProgramStudiID"`
	DosenPA      *Dosen       `gorm:"foreignKey:DosenPAID"`

	SemesterSekarang int    `gorm:"column:current_semester"`
	StatusAkun       string `gorm:"column:status_akun"`
	StatusAkademik   string `gorm:"column:status_akademik"`

	IPK         float64 `gorm:"column:ipk"`
	TotalSKS    int     `gorm:"column:total_sks"`
	CreditLimit int     `gorm:"column:credit_limit"`
	TahunMasuk  int     `gorm:"column:tahun_masuk"`
	JalurMasuk  string  `gorm:"column:jalur_masuk"`

	// Identitas Nasional
	NIK              string    `gorm:"column:nik"`
	NISN             string    `gorm:"column:nisn"`
	NUPN             string    `gorm:"column:nupn"`
	NPSN             string    `gorm:"column:npsn"`
	NIRM             string    `gorm:"column:nirm"`
	NIRL             string    `gorm:"column:nirl"`
	NomorKK          string    `gorm:"column:nomor_kk"`
	NomorKPS         string    `gorm:"column:nomor_kps"`
	TempatLahir      string    `gorm:"column:tempat_lahir"`
	TanggalLahir     time.Time `gorm:"column:tanggal_lahir"`
	JenisKelamin     string    `gorm:"column:jenis_kelamin"`
	Agama            string    `gorm:"column:agama"`
	Kewarganegaraan  string    `gorm:"column:kewarganegaraan"`
	StatusPernikahan string    `gorm:"column:status_pernikahan"`
	IsDisabilitas    string    `gorm:"column:is_disabilitas"`
	JenisTinggal     string    `gorm:"column:jenis_tinggal"`

	GelarDepan    string `gorm:"column:gelar_depan"`
	GelarBelakang string `gorm:"column:gelar_belakang"`
	Jenjang       string `gorm:"column:jenjang"`

	EmailKampus       string `gorm:"column:email_kampus"`
	EmailPersonal     string `gorm:"column:email_personal"`
	NoHP              string `gorm:"column:no_hp"`
	Telepon           string `gorm:"column:telepon"`
	Alamat            string `gorm:"column:alamat"`
	AlamatDomisili    string `gorm:"column:alamat_domisili"`
	Desa              string `gorm:"column:desa"`
	DesaDomisili      string `gorm:"column:desa_domisili"`
	Dusun             string `gorm:"column:dusun"`
	DusunDomisili     string `gorm:"column:dusun_domisili"`
	Kecamatan         string `gorm:"column:kecamatan"`
	KecamatanDomisili string `gorm:"column:kecamatan_domisili"`
	Kota              string `gorm:"column:kota"`
	KotaDomisili      string `gorm:"column:kota_domisili"`
	Provinsi          string `gorm:"column:provinsi"`
	ProvinsiDomisili  string `gorm:"column:provinsi_domisili"`
	KodePos           string `gorm:"column:kode_pos"`
	KodePosDomisili   string `gorm:"column:kode_pos_domisili"`
	RT                string `gorm:"column:rt"`
	RW                string `gorm:"column:rw"`
	RTDomisili        string `gorm:"column:rt_domisili"`
	RWDomisili        string `gorm:"column:rw_domisili"`

	NamaAyah        string `gorm:"column:nama_ayah"`
	NamaIbuKandung  string `gorm:"column:nama_ibu_kandung"`
	NamaWali        string `gorm:"column:nama_wali"`
	PekerjaanAyah   string `gorm:"column:pekerjaan_ayah"`
	PekerjaanIbu    string `gorm:"column:pekerjaan_ibu"`
	PenghasilanOrtu int    `gorm:"column:penghasilan_ortu"`
	Pekerjaan       string `gorm:"column:pekerjaan"`

	AsalSekolah   string     `gorm:"column:asal_sekolah"`
	NoIjazahSMA   string     `gorm:"column:no_ijazah_sma"`
	Gelombang     string     `gorm:"column:gelombang"`
	SistemKuliah  string     `gorm:"column:sistem_kuliah"`
	TanggalDaftar *time.Time `gorm:"column:tanggal_daftar"`
	KategoriUKT   string     `gorm:"column:kategori_ukt"`
	GolonganDarah string     `gorm:"column:golongan_darah"`
	FotoURL       string     `gorm:"column:foto_url"`
	KontakDarurat string     `gorm:"column:kontak_darurat"`

	// Transfer
	IsTransfer      string `gorm:"column:is_transfer"`
	NIMLama         string `gorm:"column:nim_lama"`
	UniversitasAsal string `gorm:"column:universitas_asal"`
	ProdiAsal       string `gorm:"column:prodi_asal"`
	IPKAsal         string  `gorm:"column:ipk_asal"`
	IpkTerakhir     float64 `gorm:"column:ipk_terakhir"`
	SKSAsal         string  `gorm:"column:sks_asal"`

	SevimaHash    string     `gorm:"column:sevima_hash"`
	LastSyncedAt  *time.Time `gorm:"column:last_synced_at"`

	Prestasi          []Prestasi            `gorm:"foreignKey:MahasiswaID"`
	Beasiswa          []BeasiswaPendaftaran `gorm:"foreignKey:MahasiswaID"`
	Aspirasi          []Aspirasi            `gorm:"foreignKey:MahasiswaID"`
	Konseling         []Konseling           `gorm:"foreignKey:MahasiswaID"`
	Kesehatan         []Kesehatan           `gorm:"foreignKey:MahasiswaID"`

	RiwayatOrganisasi []RiwayatOrganisasi   `gorm:"foreignKey:MahasiswaID"`
	PengajuanSurat    []PengajuanSurat      `gorm:"foreignKey:MahasiswaID"`
	PkkmbProgress     []PkkmbProgress       `gorm:"foreignKey:MahasiswaID"`
	PkkmbHasil        *PkkmbHasil           `gorm:"foreignKey:MahasiswaID"`
	PkkmbBanding      *PkkmbBanding         `gorm:"foreignKey:MahasiswaID"`
	PkkmbSertifikat   *PkkmbSertifikat      `gorm:"foreignKey:MahasiswaID"`
}

type SevimaAnomali struct {
	BaseModel
	IDSevima    string `gorm:"column:id_sevima;uniqueIndex;not null" json:"id_sevima"`
	NIM         string `gorm:"column:nim" json:"nim"`
	Nama        string `gorm:"column:nama" json:"nama"`
	Prodi       string `gorm:"column:prodi" json:"prodi"`
	AlasanError string `gorm:"column:alasan_error" json:"alasan_error"`
}

func (SevimaAnomali) TableName() string {
	return "mahasiswa.sevima_anomali"
}

type SevimaPMBAnomali struct {
	BaseModel
	IDSevima    string `gorm:"column:id_sevima;uniqueIndex;not null" json:"id_sevima"`
	NomorDaftar string `gorm:"column:nomor_daftar" json:"nomor_daftar"`
	Nama        string `gorm:"column:nama" json:"nama"`
	Prodi       string `gorm:"column:prodi" json:"prodi"`
	AlasanError string `gorm:"column:alasan_error" json:"alasan_error"`
}

func (SevimaPMBAnomali) TableName() string {
	return "public.sevima_pmb_anomali"
}

func (Mahasiswa) TableName() string {
	return "mahasiswa.mahasiswa"
}

// ========================
// AKADEMIK
// ========================

type AcademicPeriod struct {
	BaseModel
	SevimaID     string `gorm:"column:sevima_id;index" json:"sevima_id"`
	Name         string `gorm:"column:nama_periode" json:"Name"`
	Semester     string `gorm:"column:semester" json:"Semester"`
	AcademicYear string `gorm:"column:tahun_ajaran" json:"AcademicYear"`
	IsActive     bool   `gorm:"column:is_aktif" json:"IsActive"`
	IsKRSOpen    bool   `gorm:"column:krs_buka" json:"IsKRSOpen"`
}

func (AcademicPeriod) TableName() string {
	return "fakultas.academic_periods"
}

type PengaturanAkademik struct {
	BaseModel
	TahunAkademik string
	Semester      string
	IsKRSOpen     bool
	IsNilaiOpen   bool
	IsMBKMOpen    bool
}

func (PengaturanAkademik) TableName() string {
	return "fakultas.pengaturan_akademik"
}

type ProgramMBKM struct {
	BaseModel
	NamaProgram        string
	Jenis              string
	Mitra              string
	Deskripsi          string
	SKSKonversiDefault int
	Periode            string
}

func (ProgramMBKM) TableName() string {
	return "fakultas.program_mbkm"
}

// ========================
// LAYANAN
// ========================

type Prestasi struct {
	BaseModel
	MahasiswaID uint      `json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa `json:"mahasiswa,omitempty"`

	NamaKegiatan string `json:"nama_kegiatan"`
	Kategori     string `json:"kategori"`
	Tingkat      string `json:"tingkat"`
	Peringkat    string `json:"peringkat"`
	Status       string `json:"status"`
	Poin         int    `json:"poin"`
	BuktiURL     string `json:"bukti_url"`

	// New fields to support "Pengajuan Dana" & more detailed achievements
	Tipe               string    `json:"tipe" gorm:"size:50;default:'Laporan Prestasi'"`
	Penyelenggara      string    `json:"penyelenggara" gorm:"size:255"`
	Tanggal            time.Time `json:"tanggal" gorm:"type:timestamptz"`
	DanaDiajukan       float64   `json:"dana_diajukan" gorm:"type:decimal(15,2);default:0"`
	DanaDisetujui      float64   `json:"dana_disetujui" gorm:"type:decimal(15,2);default:0"`
	CatatanVerifikator string    `json:"catatan_verifikator" gorm:"type:text"`

	// Simkatmawa Integration Fields
	Cabang             string `json:"cabang" gorm:"size:255"`
	JumlahUnitPeserta  int    `json:"jumlah_unit_peserta" gorm:"default:1"`
	KelompokPrestasi   string `json:"kelompok_prestasi" gorm:"size:50;default:'individu'"` // individu / kelompok
	Bentuk             string `json:"bentuk" gorm:"size:50;default:'luring/hibrida'"`      // luring/hibrida / daring
	UrlPeserta         string `json:"url_peserta" gorm:"size:255"`
	UrlSertifikat      string `json:"url_sertifikat" gorm:"size:255"` // Specific URL for certificate
	UrlFotoUpp         string `json:"url_foto_upp" gorm:"size:255"`
	UrlDokumenUndangan string `json:"url_dokumen_undangan" gorm:"size:255"`
	Keterangan         string `json:"keterangan" gorm:"type:text"`
	JenisRekognisi     string `json:"jenis_rekognisi" gorm:"size:100"` // KHUSUS REKOGNISI (SERKOM, dll)
	SimkatmawaId       string `json:"simkatmawa_id" gorm:"size:100"`
	SimkatmawaStatus   string `json:"simkatmawa_status" gorm:"size:50;default:'Belum Dikirim'"` // Belum Dikirim / Sukses / Gagal

	// Relations for Simkatmawa
	AnggotaMahasiswa []PrestasiMahasiswa `gorm:"foreignKey:PrestasiID" json:"anggota_mahasiswa,omitempty"`
	PembimbingDosen  []PrestasiDosen     `gorm:"foreignKey:PrestasiID" json:"pembimbing_dosen,omitempty"`

	RiwayatOrganisasiID *uint              `json:"riwayat_organisasi_id,omitempty"`
	RiwayatOrganisasi   *RiwayatOrganisasi `gorm:"foreignKey:RiwayatOrganisasiID" json:"riwayat_organisasi,omitempty"`
}

func (Prestasi) TableName() string {
	return "mahasiswa.prestasi"
}

type PrestasiMahasiswa struct {
	BaseModel
	PrestasiID  uint      `gorm:"index" json:"prestasi_id"`
	MahasiswaID uint      `gorm:"index" json:"mahasiswa_id"`
	Prestasi    Prestasi  `json:"-"`
	Mahasiswa   Mahasiswa `json:"mahasiswa,omitempty"`
	Peran       string    `json:"peran" gorm:"size:100;default:'Anggota'"` // Ketua / Anggota
}

func (PrestasiMahasiswa) TableName() string {
	return "mahasiswa.prestasi_mahasiswa"
}

type PrestasiDosen struct {
	BaseModel
	PrestasiID    uint     `gorm:"index" json:"prestasi_id"`
	DosenID       *uint    `gorm:"index" json:"dosen_id"`
	Prestasi      Prestasi `json:"-"`
	Dosen         Dosen    `json:"dosen,omitempty"`
	NamaDosen     string   `json:"nama_dosen" gorm:"size:255"`
	Nidn          string   `json:"nidn" gorm:"size:100"`
	Peran         string   `json:"peran" gorm:"size:100;default:'Pembimbing'"`
	SuratTugasURL string   `json:"surat_tugas_url" gorm:"size:255"`
}

func (PrestasiDosen) TableName() string {
	return "mahasiswa.prestasi_dosen"
}

type Beasiswa struct {
	BaseModel
	Nama           string    `json:"nama"`
	Penyelenggara  string    `json:"penyelenggara"`
	Deskripsi      string    `json:"deskripsi"`
	Persyaratan    string    `json:"persyaratan" gorm:"type:text"`
	Deadline       time.Time `json:"deadline"`
	Kuota          int       `json:"kuota"`
	IPKMin         float64   `json:"ipk_min"`
	Kategori       string    `json:"kategori"`
	NilaiBantuan   float64   `json:"nilai_bantuan"`
	Anggaran       float64   `json:"anggaran"`
	FileKtm        string    `json:"file_ktm" gorm:"type:varchar(20);default:'wajib'"`
	FileTranskrip  string    `json:"file_transkrip" gorm:"type:varchar(20);default:'wajib'"`
	FileSertifikat string    `json:"file_sertifikat" gorm:"type:varchar(20);default:'opsional'"`
	CustomFields   string    `json:"custom_fields" gorm:"type:text"`

	Pendaftaran []BeasiswaPendaftaran `json:"pendaftaran,omitempty"`
}

func (Beasiswa) TableName() string {
	return "mahasiswa.beasiswa"
}

type BeasiswaPendaftaran struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	BeasiswaID  uint `gorm:"index"`

	Mahasiswa Mahasiswa
	Beasiswa  Beasiswa

	Status        string
	Catatan       string
	BuktiURL      string
	Motivasi      string `json:"motivasi"`
	KtmKtpURL     string `json:"ktm_ktp_url"`
	SertifikatURL string `json:"sertifikat_url"`
	TranskripURL  string `json:"transkrip_url"`
	CustomAnswers string `json:"custom_answers" gorm:"type:text"`
}

func (BeasiswaPendaftaran) TableName() string {
	return "mahasiswa.beasiswa_pendaftaran"
}

type Aspirasi struct {
	BaseModel
	MahasiswaID uint      `gorm:"index" json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa `json:"mahasiswa,omitempty"`

	Judul       string     `json:"judul"`
	Isi         string     `json:"isi"`
	Kategori    string     `json:"kategori"`
	Tujuan      string     `json:"tujuan"`
	Status      string     `json:"status"`
	Prioritas   string     `json:"prioritas"` // LOW, MEDIUM, HIGH, CRITICAL
	Deadline    *time.Time `json:"deadline,omitempty"`
	IsAnonim    bool       `json:"is_anonim"`
	Respon      string     `json:"respon"`
	LampiranURL string     `json:"lampiran_url"`
}

func (Aspirasi) TableName() string {
	return "mahasiswa.aspirasi"
}

type Konseling struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	DosenID     uint `gorm:"index"`

	Mahasiswa Mahasiswa
	Dosen     Dosen

	Tanggal time.Time
	Topik   string
	Status  string
	Catatan string
}

func (Konseling) TableName() string {
	return "mahasiswa.konseling"
}

type PengajuanSurat struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	Mahasiswa   Mahasiswa

	Jenis      string
	NomorSurat string
	Status     string
	FileURL    string
	Catatan    string
}

func (PengajuanSurat) TableName() string {
	return "mahasiswa.pengajuan_surat"
}

type Kesehatan struct {
	BaseModel
	MahasiswaID uint      `gorm:"index" json:"mahasiswa_id"`
	Mahasiswa   Mahasiswa `json:"mahasiswa,omitempty"`

	Tanggal          time.Time `json:"tanggal"`
	JenisPemeriksaan string    `json:"jenis_pemeriksaan"` // misal: Screening Tahunan, Cek Rutin
	Hasil            string    `json:"hasil"`             // Sehat, Pantauan, Perlu Perhatian
	Catatan          string    `json:"catatan"`
	FileURL          string    `json:"file_url"`
	NomorSurat       string    `json:"nomor_surat"` // Untuk Export PDF Hasil Medis

	// Detail Medis (Completeness like Health Screening)
	TinggiBadan     float64 `json:"tinggi_badan"`
	BeratBadan      float64 `json:"berat_badan"`
	Sistole         int     `json:"sistole"`
	Diastole        int     `json:"diastole"`
	GulaDarah       int     `json:"gula_darah"`
	ButaWarna       string  `json:"buta_warna"` // Normal, Parsial, Total
	RiwayatPenyakit string  `json:"riwayat_penyakit"`
	StatusKesehatan string  `json:"status_kesehatan"` // prima, stabil, kritis
	GolonganDarah   string  `json:"golongan_darah"`   // A, B, AB, O
	Sumber          string  `gorm:"size:255;default:'mandiri'" json:"sumber"`
	DiperiksaOleh   string  `gorm:"size:255" json:"diperiksa_oleh"`

	// BARU (v1.3): Modul Tenaga Kesehatan
	SuhuTubuh         float64 `json:"suhu_tubuh"`
	DenyutNadi        int     `json:"denyut_nadi"`
	RespirationRate   int     `json:"respiration_rate"` // RR: x/menit
	SpO2              int     `json:"spo2"`
	SkalaNyeri        int     `json:"skala_nyeri"` // 0-10
	AlergiObat        string  `json:"alergi_obat"`
	KondisiPsikologis string  `json:"kondisi_psikologis"` // Normal / Cemas / Stres / Perlu Rujukan Psikolog
	KonsumsiObat      string  `json:"konsumsi_obat"`

	TindakanDiberikan string `json:"tindakan_diberikan"` // e.g. "Istirahat, Obat P3K"
	ObatDiberikan     string `json:"obat_diberikan"`     // e.g. "Paracetamol 500mg"
	Rekomendasi       string `json:"rekomendasi"`

	TenagaKesID *uint            `gorm:"index" json:"tenaga_kes_id,omitempty"`
	TenagaKes   *TenagaKesehatan `gorm:"foreignKey:TenagaKesID" json:"tenaga_kes,omitempty"`

	EventID   *uint `gorm:"index" json:"event_id,omitempty"`
	BookingID *uint `gorm:"index" json:"booking_id,omitempty"`
}

func (Kesehatan) TableName() string {
	return "mahasiswa.kesehatan"
}

type LogAktivitas struct {
	BaseModel
	UserID    uint `gorm:"index"`
	User      User `gorm:"foreignKey:UserID"`
	Aktivitas string
	Deskripsi string
	IPAddress string
}

func (LogAktivitas) TableName() string {
	return "mahasiswa.log_aktivitas"
}

type RiwayatOrganisasi struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	OrmawaID    uint `gorm:"index"`

	Mahasiswa Mahasiswa
	Ormawa    Ormawa

	NamaOrganisasi    string
	Tipe              string
	Jabatan           string
	PeriodeMulai      int
	PeriodeSelesai    *int
	DeskripsiKegiatan string
	Apresiasi         string
	StatusVerifikasi  string `gorm:"default:'Menunggu'"`

	// Fields from nidan for compatibility
	Periode string
	Status  string

	Prestasi []Prestasi `gorm:"foreignKey:RiwayatOrganisasiID"`
}

func (RiwayatOrganisasi) TableName() string {
	return "mahasiswa.riwayat_organisasis"
}

type Notifikasi struct {
	BaseModel
	UserID uint `gorm:"index"`
	User   User

	Judul     string
	Deskripsi string
	Tipe      string
	IsRead    bool
}

func (Notifikasi) TableName() string {
	return "mahasiswa.notifikasi"
}

// ========================
// ORMAWA
// ========================

// KategoriOrmawa adalah master data kategori ormawa yang dapat dikonfigurasi oleh Super Admin.
// Flag TerafiliasiFakultas menentukan alur proposal (melalui Fakultas atau langsung ke Universitas).
type KategoriOrmawa struct {
	BaseModel
	Nama                string `gorm:"uniqueIndex;size:80;not null" json:"nama"`
	Deskripsi           string `gorm:"type:text" json:"deskripsi"`
	TerafiliasiFakultas bool   `gorm:"default:false" json:"terafiliasi_fakultas"`
	WajibProdi          bool   `gorm:"default:false" json:"wajib_prodi"` // jika true, prodi wajib diisi
	IsSystem            bool   `gorm:"default:false" json:"is_system"`   // built-in, tidak bisa dihapus
	Urutan              int    `gorm:"default:0" json:"urutan"`
}

func (KategoriOrmawa) TableName() string {
	return "ormawa.kategori_ormawa"
}

type Ormawa struct {
	BaseModel
	Nama       string
	Singkatan  string `gorm:"size:20"`
	Deskripsi  string
	FakultasID *uint     `gorm:"index" json:"fakultas_id"`
	Fakultas   *Fakultas `json:"fakultas,omitempty"`

	ProgramStudiID *uint         `gorm:"index" json:"program_studi_id,omitempty"`
	ProgramStudi   *ProgramStudi `gorm:"foreignKey:ProgramStudiID" json:"program_studi,omitempty"`

	// Open Recruitment fields
	OpenRecruitment         bool       `gorm:"default:false" json:"open_recruitment"`
	RecruitmentRequirements string     `json:"recruitment_requirements"`
	RecruitmentStart        *time.Time `json:"recruitment_start,omitempty"`
	RecruitmentEnd          *time.Time `json:"recruitment_end,omitempty"`
	MinIPK                  float64    `gorm:"default:0" json:"min_ipk"`

	// LPJ deadline setting
	TenggatLPJHari int `gorm:"default:14" json:"tenggat_lpj_hari"`

	// Faculty Admin fields
	Status        string `gorm:"default:'Aktif'"`
	Kategori      string `gorm:"default:'Himpunan'"` // legacy free-text, dipertahankan untuk backward compat
	JumlahAnggota int    `json:"JumlahAnggota"`
	Poin          int    `gorm:"default:0" json:"poin"`

	// Relasi ke KategoriOrmawa (master data kategori dinamis)
	KategoriOrmawaID *uint           `gorm:"index" json:"kategori_ormawa_id,omitempty"`
	KategoriDetail   *KategoriOrmawa `gorm:"foreignKey:KategoriOrmawaID" json:"kategori_detail,omitempty"`

	Visi      string
	Misi      string
	LogoURL   string
	Email     string
	Phone     string
	Instagram string
	Website   string
	Rekening  string `gorm:"size:255" json:"rekening"`

	Anggota    []OrmawaAnggota     `gorm:"foreignKey:OrmawaID"`
	Kegiatan   []OrmawaKegiatan    `gorm:"foreignKey:OrmawaID"`
	Mutasi     []OrmawaMutasiSaldo `gorm:"foreignKey:OrmawaID"`
	Proposals  []Proposal          `gorm:"foreignKey:OrmawaID"`
	Pengumuman []OrmawaPengumuman  `gorm:"foreignKey:OrmawaID"`
	Divisi     []OrmawaDivisi      `gorm:"foreignKey:OrmawaID"`
	Aspirasi   []OrmawaAspirasi    `gorm:"foreignKey:OrmawaID"`
	Notifikasi []OrmawaNotifikasi  `gorm:"foreignKey:OrmawaID" json:"notifikasi,omitempty"`
}

func (Ormawa) TableName() string {
	return "ormawa.ormawa"
}

type OrmawaAnggota struct {
	BaseModel
	OrmawaID    uint `gorm:"index"`
	MahasiswaID uint `gorm:"index"`

	Ormawa    Ormawa
	Mahasiswa Mahasiswa

	Role             string
	Divisi           string
	DivisiPilihanDua string  `json:"divisi_pilihan_dua"`
	IPK              float64 `json:"ipk"`
	Alasan           string  `json:"alasan"`
	CVURL            string  `json:"cv_url"`
	CustomAnswers    string  `gorm:"type:text" json:"custom_answers"`
	Status           string
	ParentID         *uint
	JoinedAt         time.Time

	// Review tracking fields
	RejectionReason string     `json:"rejection_reason"`
	ReviewedBy      *uint      `json:"reviewed_by"`
	ReviewedAt      *time.Time `json:"reviewed_at"`
}

func (OrmawaAnggota) TableName() string {
	return "ormawa.ormawa_anggota"
}

type OrmawaRecruitmentField struct {
	BaseModel
	OrmawaID uint   `gorm:"index" json:"ormawa_id"`
	Label    string `json:"label"`
	Type     string `json:"type"`    // "text", "paragraph", "select", "checkbox", "file"
	Options  string `json:"options"` // Comma-separated list of options
	Required bool   `json:"required"`
	Order    int    `gorm:"default:0" json:"order"`
}

func (OrmawaRecruitmentField) TableName() string {
	return "ormawa.ormawa_recruitment_field"
}

type OrmawaDivisi struct {
	BaseModel
	OrmawaID uint `gorm:"index"`
	Ormawa   Ormawa

	Nama      string
	Deskripsi string
}

func (OrmawaDivisi) TableName() string {
	return "ormawa.ormawa_divisi"
}

type OrmawaRole struct {
	BaseModel
	OrmawaID    uint `gorm:"index" json:"ormawa_id"`
	Nama        string
	Deskripsi   string
	Permissions datatypes.JSON
}

func (OrmawaRole) TableName() string {
	return "ormawa.ormawa_role"
}

type OrmawaKegiatan struct {
	BaseModel
	OrmawaID uint `gorm:"index"`
	Ormawa   Ormawa

	Judul          string
	Deskripsi      string
	TanggalMulai   time.Time
	TanggalSelesai time.Time
	Lokasi         string
	Status         string

	LandasanKegiatan      string  `json:"landasan_kegiatan"`
	BentukKegiatan        string  `json:"bentuk_kegiatan"`
	Mitra                 string  `json:"mitra"`
	LatarBelakang         string  `json:"latar_belakang"`
	TujuanKegiatan        string  `json:"tujuan_kegiatan"`
	JadwalPelaksanaan     string  `json:"jadwal_pelaksanaan"`
	SasaranKegiatan       string  `json:"sasaran_kegiatan"`
	IndikatorKeberhasilan string  `json:"indikator_keberhasilan"`
	SumberDana            string  `json:"sumber_dana"`
	EstimasiDana          float64 `json:"estimasi_dana"`
	PJKegiatan            string  `json:"pj_kegiatan"`

	Kehadiran []OrmawaKehadiran `gorm:"foreignKey:KegiatanID"`
}

func (OrmawaKegiatan) TableName() string {
	return "ormawa.ormawa_kegiatan"
}

type OrmawaKehadiran struct {
	BaseModel
	KegiatanID  uint `gorm:"index"`
	MahasiswaID uint `gorm:"index"`

	Kegiatan  OrmawaKegiatan `gorm:"foreignKey:KegiatanID"`
	Mahasiswa Mahasiswa

	Status     string
	WaktuHadir time.Time
}

func (OrmawaKehadiran) TableName() string {
	return "ormawa.ormawa_kehadiran"
}

type OrmawaPengumuman struct {
	BaseModel
	OrmawaID uint `gorm:"index"`
	Ormawa   Ormawa

	Judul          string
	Isi            string
	Target         string
	TanggalMulai   time.Time
	TanggalSelesai time.Time
}

func (OrmawaPengumuman) TableName() string {
	return "ormawa.ormawa_pengumuman"
}

type OrmawaMutasiSaldo struct {
	BaseModel
	OrmawaID   uint  `gorm:"index"`
	ProposalID *uint `gorm:"index"`

	Ormawa   Ormawa
	Proposal *Proposal

	Tipe      string
	Nominal   float64
	Kategori  string
	Deskripsi string
	Tanggal   time.Time
	Sumber    string `gorm:"size:30;default:'organisasi'" json:"sumber"`
}

func (OrmawaMutasiSaldo) TableName() string {
	return "ormawa.ormawa_mutasi_saldo"
}

// ========================
// PROPOSAL
// ========================

type Proposal struct {
	BaseModel
	OrmawaID    uint  `gorm:"index"`
	MahasiswaID uint  `gorm:"index"`
	FakultasID  *uint `gorm:"index" json:"FakultasID"` // NULL = ORMAWA tingkat universitas (BEM-U, UKM, MPM)

	Ormawa    Ormawa    `gorm:"foreignKey:OrmawaID"`
	Mahasiswa Mahasiswa `gorm:"foreignKey:MahasiswaID"`
	Fakultas  *Fakultas `gorm:"foreignKey:FakultasID" json:"Fakultas,omitempty"`

	Judul           string
	TanggalKegiatan time.Time
	Anggaran        float64
	Jenis           string
	Status          string
	Catatan         string
	FileURL         string `json:"file_url"`

	LandasanKegiatan      string `json:"landasan_kegiatan"`
	Deskripsi             string `json:"deskripsi"`
	BentukKegiatan        string `json:"bentuk_kegiatan"`
	Mitra                 string `json:"mitra"`
	LatarBelakang         string `json:"latar_belakang"`
	TujuanKegiatan        string `json:"tujuan_kegiatan"`
	JadwalPelaksanaan     string `json:"jadwal_pelaksanaan"`
	SasaranKegiatan       string `json:"sasaran_kegiatan"`
	IndikatorKeberhasilan string `json:"indikator_keberhasilan"`
	SumberDana            string `json:"sumber_dana"`
	PJKegiatan            string `json:"pj_kegiatan"`

	ApprovedDosenID    *uint      `gorm:"index"`
	ApprovedFakultasID *uint      `gorm:"index"`
	TenggatLPJ         *time.Time `json:"tenggat_lpj"`

	Riwayat []ProposalRiwayat           `gorm:"foreignKey:ProposalID"`
	LPJ     []LaporanPertanggungjawaban `gorm:"foreignKey:ProposalID"`
}

func (Proposal) TableName() string {
	return "ormawa.proposal"
}

type ProposalRiwayat struct {
	BaseModel
	ProposalID uint `gorm:"index"`
	Proposal   Proposal

	Status    string
	Catatan   string
	CreatedBy uint
}

func (ProposalRiwayat) TableName() string {
	return "ormawa.proposal_riwayat"
}

type LaporanPertanggungjawaban struct {
	BaseModel
	ProposalID uint `gorm:"index"`
	Proposal   Proposal

	RealisasiAnggaran float64
	Status            string
	Catatan           string
	FileURL           string
}

func (LaporanPertanggungjawaban) TableName() string {
	return "ormawa.laporan_pertanggungjawaban"
}

// ========================
// PKKMB
// ========================

// ========================
// KENCANA (PKKMB)
// ========================

type PkkmbTahap struct {
	BaseModel
	Label          string    `json:"label"`
	Status         string    `json:"status"` // akan_datang, berlangsung, selesai
	TanggalMulai   time.Time `json:"tanggal_mulai"`
	TanggalSelesai time.Time `json:"tanggal_selesai"`
	Order          int       `json:"order"`

	Materis []PkkmbMateri `gorm:"foreignKey:TahapID" json:"materis,omitempty"`
}

func (PkkmbTahap) TableName() string {
	return "mahasiswa.pkkmb_tahap"
}

type PkkmbMateri struct {
	BaseModel
	TahapID   uint   `gorm:"index" json:"tahap_id"`
	Judul     string `json:"judul"`
	Tipe      string `json:"tipe"` // PDF, VIDEO
	FileURL   string `json:"file_url"`
	Deskripsi string `json:"deskripsi"`
	Order     int    `json:"order"`

	Quiz *PkkmbQuiz `gorm:"foreignKey:MateriID" json:"kuis,omitempty"`
}

func (PkkmbMateri) TableName() string {
	return "mahasiswa.pkkmb_materi"
}

type PkkmbKegiatan struct {
	BaseModel
	Judul     string
	Deskripsi string
	Tanggal   time.Time
	Lokasi    string
}

func (PkkmbKegiatan) TableName() string {
	return "mahasiswa.pkkmb_kegiatan"
}

type PkkmbProgress struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	KegiatanID  uint `gorm:"index"`

	Mahasiswa Mahasiswa
	Kegiatan  PkkmbKegiatan

	Status string
}

func (PkkmbProgress) TableName() string {
	return "mahasiswa.pkkmb_progress"
}

type PkkmbHasil struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	Mahasiswa   Mahasiswa

	Nilai           float64
	StatusKelulusan string
}

func (PkkmbHasil) TableName() string {
	return "mahasiswa.pkkmb_hasil"
}

type PkkmbBanding struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	Mahasiswa   Mahasiswa

	Alasan string
	Status string
}

func (PkkmbBanding) TableName() string {
	return "mahasiswa.pkkmb_banding"
}

type PkkmbSertifikat struct {
	BaseModel
	MahasiswaID uint `gorm:"index"`
	Mahasiswa   Mahasiswa

	FileURL       string
	TanggalTerbit time.Time
}

func (PkkmbSertifikat) TableName() string {
	return "mahasiswa.pkkmb_sertifikat"
}

// ========================
// KONTEN
// ========================

type Berita struct {
	BaseModel
	Judul           string
	Slug            string `gorm:"uniqueIndex" json:"slug"`
	Isi             string
	GambarURL       string
	MetaDescription string `gorm:"type:text" json:"meta_description"`
	FocusKeyword    string `gorm:"size:255" json:"focus_keyword"`

	PenulisID uint `gorm:"index"`
	Penulis   User

	Status         string
	Kategori       string
	TanggalPublish time.Time

	TargetAudience     string `gorm:"size:50;default:'semua'" json:"target_audience"`
	TargetFakultasID   *uint  `gorm:"index" json:"target_fakultas_id"`
	TargetOrmawaID     *uint  `gorm:"index" json:"target_ormawa_id"`
	TargetMahasiswaIDs string `gorm:"type:text" json:"target_mahasiswa_ids"`
	TargetOrmawaIDs    string `gorm:"type:text" json:"target_ormawa_ids"`
	Notified           bool   `gorm:"default:false" json:"notified"`
}

func (Berita) TableName() string {
	return "fakultas.berita"
}

type OrmawaAspirasi struct {
	BaseModel
	OrmawaID    uint `gorm:"index"`
	MahasiswaID uint `gorm:"index"`

	Ormawa    Ormawa
	Mahasiswa Mahasiswa

	Kategori  string
	Judul     string
	Isi       string
	Status    string `gorm:"default:'pending'"` // pending, ditanggapi, diabaikan
	Tanggapan string
}

func (OrmawaAspirasi) TableName() string {
	return "ormawa.ormawa_aspirasi"
}

type OrmawaNotifikasi struct {
	BaseModel
	OrmawaID uint `gorm:"index"`
	Ormawa   Ormawa
	Tipe     string // approval, proposal, finance, event
	Judul    string
	Pesan    string
	IsRead   bool `gorm:"default:false"`
}

func (OrmawaNotifikasi) TableName() string {
	return "ormawa.ormawa_notifikasi"
}

// ========================
// PMB (PENDAFTARAN MAHASISWA BARU)
// ========================

type PendaftaranMahasiswaBaru struct {
	ID                 uint       `gorm:"primaryKey;column:id" json:"id"`
	SevimaID           string     `gorm:"column:sevima_id;index" json:"sevimaId"`
	NomorDaftar        string     `gorm:"column:nomor_daftar;uniqueIndex;size:50" json:"nomorDaftar"`
	NamaLengkap        string     `gorm:"column:nama_lengkap;size:150;not null" json:"namaLengkap"`
	NIM                string     `gorm:"column:nim;index;size:30" json:"nim"`
	NIK                string     `gorm:"column:nik;size:30" json:"nik"`
	Email              string     `gorm:"column:email;size:100" json:"email"`
	NoHP               string     `gorm:"column:no_hp;size:20" json:"noHP"`
	JenisKelamin       string     `gorm:"column:jenis_kelamin;size:20" json:"jenisKelamin"`
	TempatLahir        string     `gorm:"column:tempat_lahir;size:100" json:"tempatLahir"`
	TanggalLahir       string     `gorm:"column:tanggal_lahir;size:20" json:"tanggalLahir"`
	Agama              string     `gorm:"column:agama;size:30" json:"agama"`
	Alamat             string     `gorm:"column:alamat" json:"alamat"`
	Kota               string     `gorm:"column:kota;size:100" json:"kota"`
	Provinsi           string     `gorm:"column:provinsi;size:100" json:"provinsi"`
	KodePos            string     `gorm:"column:kode_pos;size:10" json:"kodePos"`
	PilihanProdi       string     `gorm:"column:pilihan_prodi;size:100" json:"pilihanProdi"`
	Jalur              string     `gorm:"column:jalur;size:100" json:"jalur"`
	Gelombang          string     `gorm:"column:gelombang;size:50" json:"gelombang"`
	SistemKuliah       string     `gorm:"column:sistem_kuliah;size:50" json:"sistemKuliah"`
	IDPeriode          string     `gorm:"column:id_periode;size:10" json:"idPeriode"`
	PeriodeDaftar      string     `gorm:"column:periode_daftar;size:100" json:"periodeDaftar"`
	NomorUjian         string     `gorm:"column:nomor_ujian;size:30" json:"nomorUjian"`
	Status             string     `gorm:"column:status;size:30;default:'Verified'" json:"status"`
	IsDaftarUlang      bool       `gorm:"column:is_daftar_ulang" json:"isDaftarUlang"`
	IsFinal            bool       `gorm:"column:is_final" json:"isFinal"`
	NilaiRapor         float64    `gorm:"column:nilai_rapor" json:"nilaiRapor"`
	AsalSekolah        string     `gorm:"column:asal_sekolah;size:200" json:"asalSekolah"`
	UniversitasAsal    string     `gorm:"column:universitas_asal;size:200" json:"universitasAsal"`
	ProdiAsal          string     `gorm:"column:prodi_asal;size:200" json:"prodiAsal"`
	NamaIbu            string     `gorm:"column:nama_ibu;size:150" json:"namaIbu"`
	TanggalDaftar      *time.Time `gorm:"column:tanggal_daftar" json:"tanggalDaftar"`
	TanggalDaftarUlang *time.Time `gorm:"column:tanggal_daftar_ulang" json:"tanggalDaftarUlang"`
	CreatedAt          time.Time  `gorm:"column:dibuat_pada;autoCreateTime" json:"createdAt"`
	UpdatedAt          time.Time  `gorm:"column:diupdate_pada;autoUpdateTime" json:"updatedAt"`
}

func (PendaftaranMahasiswaBaru) TableName() string {
	return "public.pendaftaran_mahasiswa_baru"
}

type OrmawaPoinHistory struct {
	BaseModel
	OrmawaID  uint      `gorm:"index" json:"ormawa_id"`
	Ormawa    *Ormawa   `gorm:"foreignKey:OrmawaID" json:"ormawa,omitempty"`
	Poin      int       `json:"poin"`
	Tipe      string    `gorm:"size:50" json:"tipe"` // "tambah", "kurang"
	Deskripsi string    `gorm:"type:text" json:"deskripsi"`
	Tanggal   time.Time `json:"tanggal"`
}

func (OrmawaPoinHistory) TableName() string {
	return "ormawa.ormawa_poin_history"
}

// ========================
// RBAC PRODI (Managed by Faculty Admin)
// ========================

type FakultasProdiRole struct {
	BaseModel
	FakultasID  uint           `gorm:"index" json:"fakultas_id"`
	Nama        string         `gorm:"size:120" json:"nama"`
	Deskripsi   string         `gorm:"type:text" json:"deskripsi"`
	Permissions datatypes.JSON `gorm:"type:jsonb" json:"permissions"`
}

func (FakultasProdiRole) TableName() string { return "fakultas.fakultas_prodi_role" }
