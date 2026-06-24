package services

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"

	"gorm.io/gorm"
	"sync"
	"sync/atomic"
)

type SyncProgress struct {
	IsRunning   bool   `json:"is_running"`
	IsCancelled bool   `json:"is_cancelled"`
	CurrentPage int    `json:"current_page"`
	TotalSynced int    `json:"total_synced"`
	TotalData   int    `json:"total_data"`
	StatusText  string `json:"status_text"`
	Phase       int    `json:"phase"`        // 1 = Mahasiswa, 2 = IPK
	IpkTotal    int    `json:"ipk_total"`    // Total students for IPK sync
	IpkSynced   int    `json:"ipk_synced"`
	IpkFailed   int    `json:"ipk_failed"`
	sync.Mutex  `json:"-"`
}

var GlobalSyncProgress = &SyncProgress{}

type SevimaSyncService struct {
	AppKey    string
	SecretKey string
	BaseURL   string
	Client    *http.Client
}

func NewSevimaSyncService() *SevimaSyncService {
	// Force IPv4 Dialing because Sevima only whitelists IPv4
	dialer := &net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			// Force tcp4
			return dialer.DialContext(ctx, "tcp4", addr)
		},
	}

	appKey := os.Getenv("SEVIMA_APP_KEY")
	secretKey := os.Getenv("SEVIMA_SECRET_KEY")

	var integ models.ApiIntegration
	if err := config.DB.Where("key = ?", "sevima").First(&integ).Error; err == nil {
		if integ.Endpoint != "" {
			appKey = integ.Endpoint // UI uses endpoint field for APP_KEY
		}
		if integ.ClientKey != "" {
			secretKey = integ.ClientKey
		}
	}

	return &SevimaSyncService{
		AppKey:    appKey,
		SecretKey: secretKey,
		BaseURL:   "https://api.sevimaplatform.com/siakadcloud/v1",
		Client:    &http.Client{Transport: transport, Timeout: 30 * time.Second},
	}
}

// Structs for parsing Sevima response
type SevimaMahasiswaResponse struct {
	Data []SevimaMahasiswaItem `json:"data"`
	Meta SevimaMeta            `json:"meta"`
}

type SevimaMeta struct {
	Total       int `json:"total"`
	CurrentPage int `json:"current_page"`
	PerPage     int `json:"per_page"`
	LastPage    int `json:"last_page"`
}

type SevimaMahasiswaItem struct {
	ID         string              `json:"id"`
	Attributes SevimaMahasiswaAttr `json:"attributes"`
}

type SevimaMahasiswaAttr struct {
	NIM               string `json:"nim"`
	Nama              string `json:"nama"`
	JenisKelamin      string `json:"jenis_kelamin"`
	TempatLahir       string `json:"tempat_lahir"`
	TanggalLahir      string `json:"tanggal_lahir"`
	Agama             string `json:"agama"`
	ProgramStudi      string `json:"program_studi"`
	StatusMahasiswa   string `json:"status_mahasiswa"`
	IDStatusMahasiswa string `json:"id_status_mahasiswa"`
	NIK               string `json:"nik"`
	NISN              string `json:"nisn"`
	NUPN              string `json:"nupn"`
	NPSN              string `json:"npsn"`
	NIRM              string `json:"nirm"`
	NIRL              string `json:"nirl"`
	NomorKK           string `json:"nomor_kk"`
	NomorKPS          string `json:"nomor_kps"`
	EmailKampus       string `json:"email_kampus"`
	Email             string `json:"email"`
	HP                string `json:"hp"`
	Telepon           string `json:"telepon"`
	Alamat            string `json:"alamat"`
	AlamatDomisili    string `json:"alamat_domisili"`
	Desa              string `json:"desa"`
	DesaDomisili      string `json:"desa_domisili"`
	Dusun             string `json:"dusun"`
	DusunDomisili     string `json:"dusun_domisili"`
	Kecamatan         string `json:"kecamatan"`
	KecamatanDomisili string `json:"kecamatan_domisili"`
	Kota              string `json:"kota"`
	KotaDomisili      string `json:"kota_domisili"`
	Provinsi          string `json:"provinsi"`
	ProvinsiDomisili  string `json:"provinsi_domisili"`
	KodePos           string `json:"kode_pos"`
	KodePosDomisili   string `json:"kode_pos_domisili"`
	RT                string `json:"rt"`
	RW                string `json:"rw"`
	RTDomisili        string `json:"rt_domisili"`
	RWDomisili        string `json:"rw_domisili"`
	GelarDepan        string `json:"gelar_depan"`
	GelarBelakang     string `json:"gelar_belakang"`
	StatusNikah       string `json:"status_nikah"`
	IDPeriode         string `json:"id_periode"`
	IDPeriodeTerakhir string `json:"id_periode_terakhir"`
	IDJenjang         string `json:"id_jenjang"`
	JalurPendaftaran  string `json:"jalur_pendaftaran"`
	Gelombang         string `json:"gelombang"`
	SistemKuliah      string `json:"sistem_kuliah"`
	TanggalDaftar     string `json:"tanggal_daftar"`
	NamaSekolah       string `json:"nama_sekolah"`
	NoIjazahSMA       string `json:"no_ijazah_sma"`
	NamaNegara        string `json:"nama_negara"`
	Pekerjaan         string `json:"pekerjaan"`
	KategoriUKT       string `json:"kategori_ukt"`
	IsDisabilitas     string `json:"is_disabilitas"`
	JenisTinggal      string `json:"jenis_tinggal"`
	IsTransfer        string `json:"is_transfer"`
	NIMLama           string `json:"nim_lama"`
	UniversitasAsal   string `json:"universitas_asal"`
	ProdiAsal         string `json:"program_studi_asal"`
	IPKAsal           string `json:"ipk_asal"`
	SKSAsal           string `json:"sks_asal"`

	// Relation (keluarga)
	Relation *SevimaRelation `json:"relation"`
}

type SevimaRelation struct {
	Keluarga []SevimaKeluarga `json:"keluarga"`
}

type SevimaKeluarga struct {
	Nama           *string `json:"nama"`
	StatusKeluarga string  `json:"status_keluarga"`
	Pekerjaan      *string `json:"pekerjaan"`
}

// Structs for parsing Sevima Fakultas response
type SevimaFakultasResponse struct {
	Data []SevimaFakultasItem `json:"data"`
}

type SevimaFakultasItem struct {
	ID         string             `json:"id"`
	Attributes SevimaFakultasAttr `json:"attributes"`
}

type SevimaFakultasAttr struct {
	KodeFakultas string `json:"kode_fakultas"`
	Nama         string `json:"nama"`
	NamaSingkat  string `json:"nama_singkat"`
	NamaPimpinan string `json:"nama_pimpinan"`
	Telepon      string `json:"telepon"`
	Email        string `json:"email"`
}

func (s *SevimaSyncService) SyncFakultas() (int, error) {
	if s.AppKey == "" || s.SecretKey == "" {
		return 0, fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	page := 1
	totalSynced := 0

	limit := 100
	for {
		url := fmt.Sprintf("%s/fakultas?page=%d&limit=%d", s.BaseURL, page, limit)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return totalSynced, fmt.Errorf("failed to create request: %v", err)
		}

		req.Header.Add("Content-Type", "application/json")
		req.Header.Add("Accept", "application/json")
		req.Header.Add("X-App-Key", s.AppKey)
		req.Header.Add("X-Secret-Key", s.SecretKey)

		res, err := s.Client.Do(req)
		if err != nil {
			return totalSynced, fmt.Errorf("failed to execute request: %v", err)
		}

		if res.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			return totalSynced, fmt.Errorf("api returned status %d: %s", res.StatusCode, string(body))
		}

		var apiRes SevimaFakultasResponse
		if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil {
			res.Body.Close()
			return totalSynced, fmt.Errorf("failed to decode response: %v", err)
		}
		res.Body.Close()

		if len(apiRes.Data) == 0 {
			break
		}

		for _, item := range apiRes.Data {
			attr := item.Attributes
			if attr.Nama == "" {
				continue
			}

			// Upsert Fakultas into existing model/table
			var fak models.Fakultas
			err := config.DB.Where("kode = ?", attr.KodeFakultas).First(&fak).Error
			if err == gorm.ErrRecordNotFound {
				// Coba cari berdasarkan nama kalau kodenya beda
				err = config.DB.Where("nama = ?", attr.Nama).First(&fak).Error
				if err == gorm.ErrRecordNotFound {
					fak = models.Fakultas{}
				}
			}

			fak.Nama = attr.Nama
			fak.Kode = attr.KodeFakultas
			if attr.NamaPimpinan != "" {
				fak.Dekan = attr.NamaPimpinan
			}
			if attr.Telepon != "" {
				fak.NoHP = attr.Telepon
			}
			if attr.Email != "" {
				fak.Email = attr.Email
			}

			if fak.ID == 0 {
				config.DB.Create(&fak)
			} else {
				config.DB.Save(&fak)
			}
			totalSynced++
		}

		// Usually SEVIMA returns data per page. If data length is less than limit, it means it's the last page.
		if len(apiRes.Data) < limit {
			break
		}
		page++
	}

	return totalSynced, nil
}

// Structs for parsing Sevima Program Studi response
type SevimaProdiResponse struct {
	Data []SevimaProdiItem `json:"data"`
}

type SevimaProdiItem struct {
	ID         string          `json:"id"`
	Attributes SevimaProdiAttr `json:"attributes"`
}

type SevimaProdiAttr struct {
	KodeProgramStudi string `json:"kode_program_studi"`
	NamaProgramStudi string `json:"nama_program_studi"`
	IDFakultas       string `json:"id_fakultas"`
	IDJenjang        string `json:"id_jenjang"`
	Akreditasi       string `json:"akreditasi"`
	NamaPimpinan     string `json:"nama_pimpinan"`
}

func (s *SevimaSyncService) SyncProgramStudi() (int, error) {
	if s.AppKey == "" || s.SecretKey == "" {
		return 0, fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	page := 1
	totalSynced := 0

	limit := 100
	for {
		url := fmt.Sprintf("%s/program-studi?page=%d&limit=%d", s.BaseURL, page, limit)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return totalSynced, fmt.Errorf("failed to create request: %v", err)
		}

		req.Header.Add("Content-Type", "application/json")
		req.Header.Add("Accept", "application/json")
		req.Header.Add("X-App-Key", s.AppKey)
		req.Header.Add("X-Secret-Key", s.SecretKey)

		var res *http.Response
		maxRetries := 5
		for retries := 0; retries < maxRetries; retries++ {
			res, err = s.Client.Do(req)
			if err != nil {
				return totalSynced, fmt.Errorf("failed to execute request: %v", err)
			}

			if res.StatusCode == http.StatusTooManyRequests {
				res.Body.Close()
				waitSec := 5 + (retries * 3)
				fmt.Printf("[Sync Prodi] Rate limited, waiting %ds...\n", waitSec)
				time.Sleep(time.Duration(waitSec) * time.Second)

				req, _ = http.NewRequest("GET", url, nil)
				req.Header.Add("Content-Type", "application/json")
				req.Header.Add("Accept", "application/json")
				req.Header.Add("X-App-Key", s.AppKey)
				req.Header.Add("X-Secret-Key", s.SecretKey)
				continue
			}
			break
		}

		if res.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			return totalSynced, fmt.Errorf("api returned status %d: %s", res.StatusCode, string(body))
		}

		var apiRes SevimaProdiResponse
		if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil {
			res.Body.Close()
			return totalSynced, fmt.Errorf("failed to decode response: %v", err)
		}
		res.Body.Close()

		if len(apiRes.Data) == 0 {
			break
		}

		for _, item := range apiRes.Data {
			attr := item.Attributes
			if attr.NamaProgramStudi == "" {
				continue
			}

			// Find Fakultas ID by kode
			var fakultasID uint
			var fak models.Fakultas
			if err := config.DB.Where("kode = ?", attr.IDFakultas).First(&fak).Error; err == nil {
				fakultasID = fak.ID
			} else {
				// Kalau kode gak match, coba cari by ID (angka tanpa leading zeros)
				// SEVIMA bisa kasih id_fakultas "1" tapi kode fakultas kita "00001"
				trimmed := attr.IDFakultas
				for len(trimmed) > 1 && trimmed[0] == '0' {
					trimmed = trimmed[1:]
				}
				if err := config.DB.Where("TRIM(LEADING '0' FROM kode) = ? AND nama != 'Belum Diatur'", trimmed).First(&fak).Error; err == nil {
					fakultasID = fak.ID
				} else {
					// Belum ketemu, sementara masuk "Belum Diatur"
					var defaultFak models.Fakultas
					config.DB.Where("nama = ?", "Belum Diatur").FirstOrCreate(&defaultFak, models.Fakultas{Nama: "Belum Diatur"})
					fakultasID = defaultFak.ID
				}
			}

			// Upsert Program Studi
			var prodi models.ProgramStudi
			err := config.DB.Where("kode = ?", attr.KodeProgramStudi).First(&prodi).Error
			if err == gorm.ErrRecordNotFound {
				err = config.DB.Where("nama = ?", attr.NamaProgramStudi).First(&prodi).Error
				if err == gorm.ErrRecordNotFound {
					prodi = models.ProgramStudi{}
				}
			}

			prodi.Nama = attr.NamaProgramStudi
			prodi.Kode = attr.KodeProgramStudi
			prodi.Jenjang = attr.IDJenjang
			// Map kode akreditasi SEVIMA ke teks lengkap
			switch attr.Akreditasi {
			case "U":
				prodi.Akreditasi = "Unggul"
			case "S":
				prodi.Akreditasi = "Baik Sekali"
			case "G", "B":
				prodi.Akreditasi = "Baik"
			case "A":
				prodi.Akreditasi = "Unggul"
			default:
				if attr.Akreditasi != "" {
					prodi.Akreditasi = attr.Akreditasi
				}
			}
			prodi.FakultasID = fakultasID
			if attr.NamaPimpinan != "" {
				prodi.KepalaProdi = attr.NamaPimpinan
			}

			if prodi.ID == 0 {
				config.DB.Create(&prodi)
			} else {
				config.DB.Save(&prodi)
			}
			totalSynced++
		}

		if len(apiRes.Data) < limit {
			break
		}
		page++
	}

	// === PASS 2: Fix prodi yang masih di "Belum Diatur" ===
	var belumDiatur models.Fakultas
	if err := config.DB.Where("nama = ?", "Belum Diatur").First(&belumDiatur).Error; err == nil {
		var orphanProdi []models.ProgramStudi
		config.DB.Where("fakultas_id = ?", belumDiatur.ID).Find(&orphanProdi)

		for _, orphan := range orphanProdi {
			// Potong nama di "(" untuk dapetin nama dasar
			// "S1 Farmasi (Kampus Kab Kendal)" → "S1 Farmasi"
			baseName := orphan.Nama
			for i, ch := range baseName {
				if ch == '(' {
					baseName = baseName[:i]
					break
				}
			}
			baseName = strings.TrimSpace(baseName)
			searchName := "%" + baseName + "%"

			var sibling models.ProgramStudi
			if err := config.DB.Where("nama ILIKE ? AND fakultas_id != ?", searchName, belumDiatur.ID).
				First(&sibling).Error; err == nil {
				// Ketemu sibling! Pindahkan ke fakultas yang sama
				orphan.FakultasID = sibling.FakultasID
				config.DB.Save(&orphan)
				fmt.Printf("[Sync Fix] Prodi '%s' dipindahkan ke fakultas_id=%d\n", orphan.Nama, sibling.FakultasID)
			}
		}

		// Cek kalau Belum Diatur udah kosong, hapus
		var count int64
		config.DB.Model(&models.ProgramStudi{}).Where("fakultas_id = ?", belumDiatur.ID).Count(&count)
		if count == 0 {
			config.DB.Unscoped().Delete(&belumDiatur)
			fmt.Println("[Sync Fix] Fakultas 'Belum Diatur' dihapus karena sudah kosong")
		}
	}

	return totalSynced, nil
}

func (s *SevimaSyncService) SyncMahasiswa() (int, error) {
	if s.AppKey == "" || s.SecretKey == "" {
		return 0, fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	limit := 100
	var totalSynced int32 = 0

	GlobalSyncProgress.Lock()
	GlobalSyncProgress.IsRunning = true
	GlobalSyncProgress.IsCancelled = false
	GlobalSyncProgress.CurrentPage = 0
	GlobalSyncProgress.TotalSynced = 0
	GlobalSyncProgress.TotalData = 0
	GlobalSyncProgress.Phase = 1
	GlobalSyncProgress.IpkTotal = 0
	GlobalSyncProgress.IpkSynced = 0
	GlobalSyncProgress.IpkFailed = 0
	GlobalSyncProgress.StatusText = "Memulai sinkronisasi mahasiswa..."
	GlobalSyncProgress.Unlock()

	defer func() {
		GlobalSyncProgress.Lock()
		if GlobalSyncProgress.Phase == 1 {
			GlobalSyncProgress.IsRunning = false
			if GlobalSyncProgress.IsCancelled {
				GlobalSyncProgress.StatusText = "Sinkronisasi dibatalkan."
			} else {
				GlobalSyncProgress.StatusText = "Gagal memulai fase IPK, sinkronisasi selesai."
			}
		}
		GlobalSyncProgress.Unlock()
	}()

	// Fungsi helper untuk menarik satu halaman API SEVIMA
	fetchPage := func(pageNum int) (*SevimaMahasiswaResponse, error) {
		url := fmt.Sprintf("%s/mahasiswa?page=%d&limit=%d", s.BaseURL, pageNum, limit)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}
		req.Header.Add("Content-Type", "application/json")
		req.Header.Add("Accept", "application/json")
		req.Header.Add("X-App-Key", s.AppKey)
		req.Header.Add("X-Secret-Key", s.SecretKey)

		var res *http.Response
		maxRetries := 100 // Pantang menyerah sampai gol agar tidak ada data putus
		for retries := 0; retries < maxRetries; retries++ {
			res, err = s.Client.Do(req)
			if err != nil {
				return nil, err
			}
			if res.StatusCode == http.StatusTooManyRequests {
				res.Body.Close()
				waitSec := 2 + (retries % 5) // Jeda stabil 2-6 detik agar SEVIMA bisa bernapas
				time.Sleep(time.Duration(waitSec) * time.Second)
				req, _ = http.NewRequest("GET", url, nil)
				req.Header.Add("Content-Type", "application/json")
				req.Header.Add("Accept", "application/json")
				req.Header.Add("X-App-Key", s.AppKey)
				req.Header.Add("X-Secret-Key", s.SecretKey)
				continue
			}
			break
		}

		if res.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			return nil, fmt.Errorf("api returned status %d: %s", res.StatusCode, string(body))
		}

		var apiRes SevimaMahasiswaResponse
		if err := json.NewDecoder(res.Body).Decode(&apiRes); err != nil {
			res.Body.Close()
			return nil, err
		}
		res.Body.Close()
		return &apiRes, nil
	}

	// Ambil halaman 1 secara sinkron untuk mengetahui total halaman
	firstPageRes, err := fetchPage(1)
	if err != nil {
		return 0, err
	}

	if len(firstPageRes.Data) == 0 {
		return 0, nil
	}

	lastPage := firstPageRes.Meta.LastPage
	if lastPage < 1 {
		lastPage = 1
	}

	GlobalSyncProgress.Lock()
	GlobalSyncProgress.TotalData = firstPageRes.Meta.Total
	GlobalSyncProgress.StatusText = fmt.Sprintf("Menarik data secara pararel (Total %d halaman)...", lastPage)
	GlobalSyncProgress.Unlock()

	var wg sync.WaitGroup          // Menunggu seluruh mahasiswa selesai diproses
	var pageWg sync.WaitGroup      // Menunggu seluruh halaman selesai ditarik
	
	sem := make(chan struct{}, 500)       // DB workers maxed out
	pageSem := make(chan struct{}, 5)     // API Sevima ditarik 5 halaman (titik seimbang kecepatan dan keamanan 429)

	processPageData := func(apiRes *SevimaMahasiswaResponse) {
		for _, item := range apiRes.Data {
			attr := item.Attributes
			idSevima := item.ID
			sem <- struct{}{}
			wg.Add(1)
			go func(id string, a SevimaMahasiswaAttr) {
				defer wg.Done()
				defer func() { <-sem }()
				
				GlobalSyncProgress.Lock()
				isCancelled := GlobalSyncProgress.IsCancelled
				GlobalSyncProgress.Unlock()
				if isCancelled {
					return
				}

				var err error
				if a.NIM == "" {
					err = fmt.Errorf("NIM Kosong")
				} else {
					err = s.syncSingleMahasiswa(id, a)
				}

				if err != nil {
					anomali := models.SevimaAnomali{
						IDSevima:    id,
						NIM:         a.NIM,
						Nama:        a.Nama,
						Prodi:       a.ProgramStudi,
						AlasanError: err.Error(),
					}
					config.DB.Where("id_sevima = ?", id).Assign(anomali).FirstOrCreate(&anomali)
					return
				}
				
				config.DB.Where("id_sevima = ?", id).Delete(&models.SevimaAnomali{})
				
				currentSynced := atomic.AddInt32(&totalSynced, 1)
				if currentSynced%100 == 0 {
					GlobalSyncProgress.Lock()
					GlobalSyncProgress.TotalSynced = int(currentSynced)
					GlobalSyncProgress.StatusText = fmt.Sprintf("Telah memproses %d dari %d data...", currentSynced, firstPageRes.Meta.Total)
					GlobalSyncProgress.Unlock()
				}
			}(idSevima, attr)
		}
	}

	// Eksekusi Data Halaman 1
	processPageData(firstPageRes)

	// Tarik halaman 2 hingga terakhir secara pararel
	for p := 2; p <= lastPage; p++ {
		GlobalSyncProgress.Lock()
		isCancelled := GlobalSyncProgress.IsCancelled
		GlobalSyncProgress.Unlock()

		if isCancelled {
			break
		}

		pageWg.Add(1)
		go func(pageNum int) {
			defer pageWg.Done()

			GlobalSyncProgress.Lock()
			if GlobalSyncProgress.IsCancelled {
				GlobalSyncProgress.Unlock()
				return
			}
			GlobalSyncProgress.Unlock()

			pageSem <- struct{}{}
			defer func() { <-pageSem }()

			GlobalSyncProgress.Lock()
			if GlobalSyncProgress.IsCancelled {
				GlobalSyncProgress.Unlock()
				return
			}
			GlobalSyncProgress.Unlock()

			res, err := fetchPage(pageNum)
			if err == nil && res != nil {
				processPageData(res)
			}
		}(p)
	}

	// Tunggu semua halaman ditarik
	pageWg.Wait()
	// Tunggu semua data mahasiswa selesai disimpan ke DB
	wg.Wait()

	GlobalSyncProgress.Lock()
	wasCancelled := GlobalSyncProgress.IsCancelled
	GlobalSyncProgress.TotalSynced = int(totalSynced)
	GlobalSyncProgress.StatusText = fmt.Sprintf("Berhasil memproses %d data mahasiswa", totalSynced)
	GlobalSyncProgress.Unlock()

	// Phase 2: Otomatis sync IPK dari SEVIMA setelah data mahasiswa selesai
	if !wasCancelled && totalSynced > 0 {
		GlobalSyncProgress.Lock()
		GlobalSyncProgress.Phase = 2
		GlobalSyncProgress.StatusText = "Memulai sinkronisasi IPK dari transkrip SEVIMA..."
		GlobalSyncProgress.Unlock()

		fmt.Println("[SEVIMA Sync] Phase 2: Starting IPK sync...")
		go func() {
			synced, failed, err := RunIPKSyncNow()
			if err != nil {
				fmt.Printf("[SEVIMA Sync] IPK sync error: %v\n", err)
			} else {
				fmt.Printf("[SEVIMA Sync] IPK sync done! Synced: %d, Failed: %d\n", synced, failed)
			}
		}()
	} else {
		// Jika wasCancelled, StatusText dan IsRunning sudah diurus oleh defer
	}

	return int(totalSynced), nil
}


func resolveProdiFromNIM(nim string) (uint, uint) {
	nimUpper := strings.ToUpper(nim)
	var prodiID uint
	var fakultasID uint

	reAlpha := regexp.MustCompile(`^[A-Za-z]+`)
	alpha := reAlpha.FindString(nimUpper)

	// Determine Fakultas first from prefix
	if strings.Contains(nimUpper, "FF") {
		fakultasID = 3
	} else if strings.Contains(nimUpper, "FK") || strings.HasPrefix(alpha, "NS") || strings.HasPrefix(alpha, "AK") || strings.HasPrefix(alpha, "MA") || strings.HasPrefix(alpha, "RPL") || strings.HasPrefix(nimUpper, "41801") {
		fakultasID = 4
	} else if strings.Contains(nimUpper, "FI") || strings.HasPrefix(alpha, "MB") || strings.HasPrefix(nimUpper, "CK") {
		fakultasID = 5
	} else if strings.Contains(nimUpper, "FS") {
		fakultasID = 6
	}

	if fakultasID == 3 {
		if strings.Contains(nimUpper, "FF01") || strings.Contains(nimUpper, "FF02") {
			prodiID = 71 // D3 Farmasi
		} else if strings.Contains(nimUpper, "FF03") || strings.Contains(nimUpper, "FF04") {
			prodiID = 64 // S1 Farmasi (Kampus Kab Kendal)
		} else if strings.Contains(nimUpper, "FF05") {
			prodiID = 77 // Pendidikan Profesi Apoteker
		} else {
			if strings.HasPrefix(nimUpper, "211FF01") || strings.HasPrefix(nimUpper, "251FF01") {
				prodiID = 71
			} else if strings.HasPrefix(nimUpper, "211FF02") || strings.HasPrefix(nimUpper, "251FF02") {
				prodiID = 71
			} else if strings.HasPrefix(nimUpper, "211FF03") || strings.HasPrefix(nimUpper, "211FF04") {
				prodiID = 64
			} else {
				prodiID = 67 // S1 Farmasi (General)
			}
		}
	} else if fakultasID == 4 {
		if strings.Contains(nimUpper, "FK01") {
			prodiID = 74 // D3 Keperawatan
		} else if strings.Contains(nimUpper, "FK03") || strings.Contains(nimUpper, "FK05") || strings.Contains(nimUpper, "FK07") || strings.Contains(nimUpper, "FK10") {
			prodiID = 60 // S1 Keperawatan (Tasikmalaya)
		} else if strings.Contains(nimUpper, "FK06") {
			prodiID = 81 // D3 Keperawatan Garut
		} else if strings.Contains(nimUpper, "FK04") || strings.Contains(nimUpper, "FK09") {
			prodiID = 63 // Pendidikan Profesi Ners Tasikmalaya
		} else if strings.HasPrefix(alpha, "NS") {
			prodiID = 75 // Pendidikan Profesi Ners (General)
		} else if strings.HasPrefix(alpha, "AK") {
			prodiID = 74 // D3 Keperawatan
		} else if strings.HasPrefix(alpha, "MA") {
			prodiID = 81 // D3 Keperawatan Garut (Legacy)
		} else if strings.HasPrefix(alpha, "MB") {
			prodiID = 80 // D3 Kebidanan
			fakultasID = 5 // Update to Fakultas Ilmu Kesehatan
		} else if strings.HasPrefix(alpha, "RPL") {
			prodiID = 63 // Pendidikan Profesi Ners Tasikmalaya
		} else if strings.HasPrefix(nimUpper, "41801") {
			prodiID = 81 // D3 Keperawatan Garut
		} else {
			prodiID = 60 // Default fallback S1 Keperawatan Tasikmalaya
		}
	} else if fakultasID == 5 {
		if strings.Contains(nimUpper, "FI01") || strings.Contains(nimUpper, "FI06") {
			prodiID = 61 // D3 Kebidanan Subang
		} else if strings.Contains(nimUpper, "FI03") {
			prodiID = 66 // Sarjana Terapan Keperawatan Anestesiologi
		} else if strings.Contains(nimUpper, "FI04") || strings.Contains(nimUpper, "FI05") {
			prodiID = 72 // S1 Kesehatan Masyarakat
		} else if strings.Contains(nimUpper, "FI07") {
			prodiID = 79 // D3 Kebidanan Tasikmalaya
		} else if strings.Contains(nimUpper, "FI08") {
			prodiID = 70 // D3 Kebidanan Serang
		} else if strings.Contains(nimUpper, "FI10") {
			prodiID = 78 // D3 Kebidanan Mataram
		} else if strings.Contains(nimUpper, "FI11") {
			prodiID = 57 // S1 Gizi
		} else if strings.Contains(nimUpper, "FI12") {
			prodiID = 82 // D3 Kebidanan Kendal
		} else if strings.Contains(nimUpper, "FI14") {
			prodiID = 65 // S1 Kebidanan
		} else if strings.Contains(nimUpper, "FI15") {
			prodiID = 59 // Pendidikan Profesi Bidan
		} else if strings.HasPrefix(alpha, "MB") {
			prodiID = 80 // D3 Kebidanan
		} else if strings.HasPrefix(nimUpper, "CK") {
			prodiID = 61 // D3 Kebidanan Subang (Legacy)
		} else {
			prodiID = 72 // Default fallback S1 Kesehatan Masyarakat
		}
	} else if fakultasID == 6 {
		if strings.Contains(nimUpper, "FS01") {
			prodiID = 73 // S1 Ilmu Komunikasi
		} else if strings.Contains(nimUpper, "FS02") {
			prodiID = 68 // S1 Psikologi
		} else {
			prodiID = 68 // Default S1 Psikologi
		}
	}

	return prodiID, fakultasID
}

func (s *SevimaSyncService) syncSingleMahasiswa(idSevima string, attr SevimaMahasiswaAttr) error {
	// 0. Change Detection via MD5 Hash
	attrBytes, _ := json.Marshal(attr)
	currentHash := fmt.Sprintf("%x", md5.Sum(attrBytes))

	var existingMhs models.Mahasiswa
	errExisting := config.DB.Unscoped().Where("nim = ?", attr.NIM).First(&existingMhs).Error
	if errExisting == nil && existingMhs.SevimaHash == currentHash && !existingMhs.DeletedAt.Valid {
		// Hash matches and not deleted, skip entirely
		return nil
	}

	// 1. Map Program Studi & Fakultas (Fuzzy match if possible, otherwise leave it or set ID to 0)
	var prodiID *uint
	var fakultasID *uint

	if attr.ProgramStudi != "" {
		var prodi models.ProgramStudi
		// Trim additional details like "(Kampus Kabupaten Garut)" from the prodi name just in case, but let's try direct Like first
		searchName := "%" + attr.ProgramStudi + "%"
		if err := config.DB.Where("nama ILIKE ?", searchName).First(&prodi).Error; err == nil {
			prodiID = &prodi.ID
			fakultasID = &prodi.FakultasID
		}
	}

	if prodiID == nil {
		// Use heuristics mapping based on NIM prefix & Fakultas mapping
		resolvedPid, resolvedFid := resolveProdiFromNIM(attr.NIM)
		if resolvedPid > 0 {
			prodiID = &resolvedPid
			fakultasID = &resolvedFid
		}
	}

	if prodiID == nil {
		var defaultFak models.Fakultas
		if err := config.DB.Where("nama = ?", "Belum Diatur").FirstOrCreate(&defaultFak, models.Fakultas{Nama: "Belum Diatur"}).Error; err == nil {
			var defaultProdi models.ProgramStudi
			if err := config.DB.Where("nama = ? AND fakultas_id = ?", "Belum Diatur", defaultFak.ID).FirstOrCreate(&defaultProdi, models.ProgramStudi{Nama: "Belum Diatur", FakultasID: defaultFak.ID}).Error; err == nil {
				prodiID = &defaultProdi.ID
				fakultasID = &defaultFak.ID
			}
		}
	}

	// 2. Find or create User with "Claim Account" logic
	var user models.User
	placeholderEmail := fmt.Sprintf("%s@unclaimed.siakad.local", attr.NIM)
	userEmail := placeholderEmail

	cleanedPersonalEmail := strings.TrimSpace(strings.ToLower(attr.Email))
	if cleanedPersonalEmail != "" && strings.Contains(cleanedPersonalEmail, "@") {
		// Pengecekan apakah email personal sudah terpakai oleh user lain
		var count int64
		if err := config.DB.Model(&models.User{}).Where("email = ?", cleanedPersonalEmail).Count(&count).Error; err == nil && count == 0 {
			userEmail = cleanedPersonalEmail
		}
	}

	// 3. Find or Create Mahasiswa first, to avoid heavy subquery on User table
	var mhs models.Mahasiswa
	errMhs := config.DB.Unscoped().Where("nim = ?", attr.NIM).First(&mhs).Error

	if errMhs == nil {
		// Mahasiswa exists, we can get user by ID directly
		err := config.DB.Where("id = ?", mhs.PenggunaID).First(&user).Error
		if err != nil {
			// Fallback if somehow user doesn't exist despite mhs having the ID
			err = config.DB.Where("email = ? OR email = ?", placeholderEmail, cleanedPersonalEmail).First(&user).Error
		}
	} else {
		// Mahasiswa doesn't exist yet, search user by email
		err := config.DB.Where("email = ? OR email = ?", placeholderEmail, cleanedPersonalEmail).First(&user).Error
		if err != nil && err == gorm.ErrRecordNotFound {
			// Create user
			user = models.User{
				Email:       userEmail,
				Password:    "", // Empty password, they need to claim it
				Role:        "student",
				NamaLengkap: attr.Nama,
				NoHP:        attr.HP,
			}
			if err := config.DB.Create(&user).Error; err != nil {
				if strings.Contains(err.Error(), "duplicate key") {
					// Race condition: another worker just created this user. Fetch it!
					if errFetch := config.DB.Where("email = ? OR email = ?", placeholderEmail, cleanedPersonalEmail).First(&user).Error; errFetch != nil {
						return err // Still error
					}
				} else {
					return err
				}
			}
		} else if err != nil {
			return err
		}
	}

	// Update user email if it was placeholder
	if strings.HasSuffix(user.Email, "@unclaimed.siakad.local") && cleanedPersonalEmail != "" && strings.Contains(cleanedPersonalEmail, "@") {
		var count int64
		if err := config.DB.Model(&models.User{}).Where("email = ? AND id != ?", cleanedPersonalEmail, user.ID).Count(&count).Error; err == nil && count == 0 {
			if err := config.DB.Model(&user).Update("email", cleanedPersonalEmail).Error; err == nil {
				user.Email = cleanedPersonalEmail
			}
		}
	}

	// Parse date
	var tglLahir time.Time
	if attr.TanggalLahir != "" {
		tglLahir, _ = time.Parse("2006-01-02", attr.TanggalLahir)
	}

	if errMhs == gorm.ErrRecordNotFound {
		mhs = models.Mahasiswa{
			PenggunaID: user.ID,
			NIM:        attr.NIM,
		}
	} else if errMhs != nil {
		return errMhs
	} else {
		if mhs.DeletedAt.Valid {
			// Restore soft-deleted record so it doesn't cause unique constraint errors
			mhs.DeletedAt = gorm.DeletedAt{Valid: false}
			config.DB.Unscoped().Model(&mhs).UpdateColumn("deleted_at", nil)
		}
	}

	// Update fields
	// Critical fields that always sync from SEVIMA
	mhs.Nama = attr.Nama

	// Smart field merging: only update local data if SEVIMA data is not empty
	if attr.JenisKelamin != "" {
		mhs.JenisKelamin = attr.JenisKelamin
	}
	if attr.TempatLahir != "" {
		mhs.TempatLahir = attr.TempatLahir
	}
	if !tglLahir.IsZero() {
		mhs.TanggalLahir = tglLahir
	}
	if attr.Agama != "" {
		mhs.Agama = attr.Agama
	}
	if attr.NIK != "" {
		mhs.NIK = attr.NIK
	}
	if attr.NISN != "" {
		mhs.NISN = attr.NISN
	}
	if attr.NUPN != "" {
		mhs.NUPN = attr.NUPN
	}
	if attr.NPSN != "" {
		mhs.NPSN = attr.NPSN
	}
	if attr.NIRM != "" {
		mhs.NIRM = attr.NIRM
	}
	if attr.NIRL != "" {
		mhs.NIRL = attr.NIRL
	}
	if attr.NomorKK != "" {
		mhs.NomorKK = attr.NomorKK
	}
	if attr.NomorKPS != "" {
		mhs.NomorKPS = attr.NomorKPS
	}
	if attr.EmailKampus != "" {
		mhs.EmailKampus = attr.EmailKampus
	}
	if attr.Email != "" {
		mhs.EmailPersonal = attr.Email
	}
	if attr.HP != "" {
		mhs.NoHP = attr.HP
	}
	if attr.Telepon != "" {
		mhs.Telepon = attr.Telepon
	}

	// Alamat
	if attr.Alamat != "" {
		mhs.Alamat = attr.Alamat
	}
	if attr.AlamatDomisili != "" {
		mhs.AlamatDomisili = attr.AlamatDomisili
	}
	if attr.Desa != "" {
		mhs.Desa = attr.Desa
	}
	if attr.DesaDomisili != "" {
		mhs.DesaDomisili = attr.DesaDomisili
	}
	if attr.Dusun != "" {
		mhs.Dusun = attr.Dusun
	}
	if attr.DusunDomisili != "" {
		mhs.DusunDomisili = attr.DusunDomisili
	}
	if attr.Kecamatan != "" {
		mhs.Kecamatan = attr.Kecamatan
	}
	if attr.KecamatanDomisili != "" {
		mhs.KecamatanDomisili = attr.KecamatanDomisili
	}
	if attr.Kota != "" {
		mhs.Kota = attr.Kota
	}
	if attr.KotaDomisili != "" {
		mhs.KotaDomisili = attr.KotaDomisili
	}
	if attr.Provinsi != "" {
		mhs.Provinsi = attr.Provinsi
	}
	if attr.ProvinsiDomisili != "" {
		mhs.ProvinsiDomisili = attr.ProvinsiDomisili
	}
	if attr.KodePos != "" {
		mhs.KodePos = attr.KodePos
	}
	if attr.KodePosDomisili != "" {
		mhs.KodePosDomisili = attr.KodePosDomisili
	}
	if attr.RT != "" {
		mhs.RT = attr.RT
	}
	if attr.RW != "" {
		mhs.RW = attr.RW
	}
	if attr.RTDomisili != "" {
		mhs.RTDomisili = attr.RTDomisili
	}
	if attr.RWDomisili != "" {
		mhs.RWDomisili = attr.RWDomisili
	}

	// Identitas tambahan
	if attr.GelarDepan != "" {
		mhs.GelarDepan = attr.GelarDepan
	}
	if attr.GelarBelakang != "" {
		mhs.GelarBelakang = attr.GelarBelakang
	}
	if attr.StatusNikah != "" {
		mhs.StatusPernikahan = attr.StatusNikah
	}
	if attr.NamaNegara != "" {
		mhs.Kewarganegaraan = attr.NamaNegara
	}
	if attr.IsDisabilitas != "" {
		mhs.IsDisabilitas = attr.IsDisabilitas
	}
	if attr.IDJenjang != "" {
		mhs.Jenjang = attr.IDJenjang
	}
	if attr.Pekerjaan != "" {
		mhs.Pekerjaan = attr.Pekerjaan
	}
	if attr.JenisTinggal != "" {
		mhs.JenisTinggal = attr.JenisTinggal
	}

	// Map status mahasiswa dari SEVIMA
	if attr.IDStatusMahasiswa != "" {
		switch attr.IDStatusMahasiswa {
		case "A":
			mhs.StatusAkademik = "Aktif"
		case "L", "LL":
			mhs.StatusAkademik = "Lulus"
		case "D":
			mhs.StatusAkademik = "Dikeluarkan"
		case "N":
			mhs.StatusAkademik = "Selesai Pendidikan Non Gelar"
		case "C":
			mhs.StatusAkademik = "Cuti"
		case "K":
			mhs.StatusAkademik = "Mengajukan pengunduran diri"
		case "G":
			mhs.StatusAkademik = "Sedang Double Degree"
		case "W":
			mhs.StatusAkademik = "Meninggal dunia"
		case "M":
			mhs.StatusAkademik = "Mutasi"
		case "T":
			mhs.StatusAkademik = "Transfer"
		case "P", "H":
			mhs.StatusAkademik = "Putus Studi"
		default:
			mhs.StatusAkademik = attr.IDStatusMahasiswa
		}
	} else if attr.StatusMahasiswa != "" {
		mhs.StatusAkademik = attr.StatusMahasiswa
	}
	mhs.JalurMasuk = attr.JalurPendaftaran
	mhs.Gelombang = attr.Gelombang
	mhs.SistemKuliah = attr.SistemKuliah
	if attr.NamaSekolah != "" {
		mhs.AsalSekolah = attr.NamaSekolah
	}
	if attr.NoIjazahSMA != "" {
		mhs.NoIjazahSMA = attr.NoIjazahSMA
	}
	if attr.KategoriUKT != "" {
		mhs.KategoriUKT = attr.KategoriUKT
	}

	// Transfer
	mhs.IsTransfer = attr.IsTransfer
	if attr.NIMLama != "" {
		mhs.NIMLama = attr.NIMLama
	}
	if attr.UniversitasAsal != "" {
		mhs.UniversitasAsal = attr.UniversitasAsal
	}
	if attr.ProdiAsal != "" {
		mhs.ProdiAsal = attr.ProdiAsal
	}
	if attr.IPKAsal != "" {
		mhs.IPKAsal = attr.IPKAsal
	}
	if attr.SKSAsal != "" {
		mhs.SKSAsal = attr.SKSAsal
	}

	// Tanggal Daftar
	if attr.TanggalDaftar != "" {
		if td, err := time.Parse("2006-01-02", attr.TanggalDaftar); err == nil {
			mhs.TanggalDaftar = &td
		}
	}

	// Keluarga (Ayah, Ibu, Wali) dari relation
	if attr.Relation != nil {
		for _, kel := range attr.Relation.Keluarga {
			if kel.Nama == nil {
				continue
			}
			switch kel.StatusKeluarga {
			case "Ayah":
				mhs.NamaAyah = *kel.Nama
				if kel.Pekerjaan != nil {
					mhs.PekerjaanAyah = *kel.Pekerjaan
				}
			case "Ibu":
				mhs.NamaIbuKandung = *kel.Nama
				if kel.Pekerjaan != nil {
					mhs.PekerjaanIbu = *kel.Pekerjaan
				}
			case "Wali":
				mhs.NamaWali = *kel.Nama
			}
		}
	}

	if attr.IDPeriode != "" && len(attr.IDPeriode) >= 4 {
		var thnMasuk int
		fmt.Sscanf(attr.IDPeriode[0:4], "%d", &thnMasuk)
		if thnMasuk > 0 {
			mhs.TahunMasuk = thnMasuk

			// Hitung semester berdasarkan id_periode_terakhir
			// Format: "20252" = tahun 2025, term 2 (genap)
			// Semester = (tahunTerakhir - tahunMasuk) * 2 + termTerakhir
			if attr.IDPeriodeTerakhir != "" && len(attr.IDPeriodeTerakhir) >= 5 {
				var thnTerakhir int
				fmt.Sscanf(attr.IDPeriodeTerakhir[0:4], "%d", &thnTerakhir)
				termTerakhir := 1
				if attr.IDPeriodeTerakhir[4] == '2' {
					termTerakhir = 2
				}

				semester := (thnTerakhir-thnMasuk)*2 + termTerakhir
				if semester < 1 {
					semester = 1
				}
				mhs.SemesterSekarang = semester
			} else {
				// Fallback: hitung dari waktu sekarang
				now := time.Now()
				thnNow := now.Year()
				termNow := 1
				if int(now.Month()) >= 2 && int(now.Month()) <= 7 {
					termNow = 2 // Semester Genap (Feb-Jul)
				}
				semester := (thnNow-thnMasuk)*2 + termNow
				if semester < 1 {
					semester = 1
				}
				mhs.SemesterSekarang = semester
			}
		}
	}

	if prodiID != nil {
		mhs.ProgramStudiID = *prodiID
	}
	if fakultasID != nil {
		mhs.FakultasID = *fakultasID
	}

	// Sync User's Fakultas and Prodi
	if user.ID != 0 && (prodiID != nil || fakultasID != nil) {
		config.DB.Model(&models.User{}).Where("id = ?", user.ID).Updates(map[string]interface{}{
			"fakultas_id":      fakultasID,
			"program_studi_id": prodiID,
		})
	}

	// Update sync metadata
	mhs.SevimaHash = currentHash
	nowSync := time.Now()
	mhs.LastSyncedAt = &nowSync

	// Save
	isNew := mhs.ID == 0
	var err error
	if isNew {
		err = config.DB.Create(&mhs).Error
		// Jika terjadi race condition (NIM sama dikirim 2x dari page yg berbeda di saat yg sama)
		if err != nil && strings.Contains(err.Error(), "duplicate key") {
			// Kita anggap sukses karena worker lain sudah berhasil insert
			err = nil
			config.DB.Where("nim = ?", attr.NIM).First(&mhs) // fetch ID for relationships
		}
	} else {
		err = config.DB.Save(&mhs).Error
	}
	if err != nil {
		return err
	}

	// Auto-register to PKKMB if semester 1 (Legacy)
	if mhs.SemesterSekarang == 1 {
		var pkkmb models.PkkmbHasil
		errPkkmb := config.DB.Where("mahasiswa_id = ?", mhs.ID).First(&pkkmb).Error
		if errPkkmb != nil {
			newPkkmb := models.PkkmbHasil{
				MahasiswaID:     mhs.ID,
				Nilai:           0.0,
				StatusKelulusan: "Proses",
			}
			config.DB.Create(&newPkkmb)
		}
	}

	// Auto-register to Kencana
	var activePeriod models.KencanaPeriod
	if err := config.DB.Where("status IN ('active', 'published')").Order("id desc").First(&activePeriod).Error; err == nil {
		if mhs.TahunMasuk == activePeriod.Year || mhs.SemesterSekarang == 1 {
			var kScore models.KencanaScore
			if err := config.DB.Where("period_id = ? AND student_id = ?", activePeriod.ID, mhs.ID).First(&kScore).Error; err != nil {
				kScore = models.KencanaScore{
					PeriodID:         activePeriod.ID,
					StudentID:        mhs.ID,
					GraduationStatus: "not_started",
				}
				config.DB.Create(&kScore)
			}
			
			var kHandbook models.KencanaHandbook
			if err := config.DB.Where("period_id = ? AND student_id = ?", activePeriod.ID, mhs.ID).First(&kHandbook).Error; err != nil {
				kHandbook = models.KencanaHandbook{
					PeriodID:  activePeriod.ID,
					StudentID: mhs.ID,
					Status:    "not_started",
				}
				config.DB.Create(&kHandbook)
			}
		}
	}

	return nil
}

// StartNightlyIPKSync starts a background cron job that fetches KHS to update IPK
func StartNightlyIPKSync() {
	go func() {
		for {
			now := time.Now()
			// Find the next 02:00 AM
			next := time.Date(now.Year(), now.Month(), now.Day(), 2, 0, 0, 0, now.Location())
			if now.After(next) {
				next = next.Add(24 * time.Hour)
			}
			waitDuration := next.Sub(now)
			fmt.Printf("[Nightly IPK Sync] Scheduled to run in %v\n", waitDuration)
			
			time.Sleep(waitDuration)

			fmt.Println("[Nightly IPK Sync] Starting...")
			RunIPKSyncNow()
		}
	}()
}

// RunIPKSyncNow performs the actual IPK sync - can be called manually or by nightly cron
func RunIPKSyncNow() (int, int, error) {
	defer func() {
		GlobalSyncProgress.Lock()
		if GlobalSyncProgress.Phase == 2 {
			GlobalSyncProgress.IsRunning = false
			if GlobalSyncProgress.IsCancelled {
				GlobalSyncProgress.StatusText = "Sinkronisasi IPK dibatalkan."
			} else {
				GlobalSyncProgress.StatusText = "Sinkronisasi selesai seluruhnya."
			}
		}
		GlobalSyncProgress.Unlock()
	}()

	svc := NewSevimaSyncService()
	if svc.AppKey == "" {
		return 0, 0, fmt.Errorf("SEVIMA_APP_KEY is empty")
	}

	// Fetch ALL students with NIM (not just active — alumni also have IPK)
	var nims []string
	config.DB.Table("mahasiswa.mahasiswa").
		Where("deleted_at IS NULL AND nim IS NOT NULL AND nim != ''").
		Pluck("nim", &nims)

	GlobalSyncProgress.Lock()
	if GlobalSyncProgress.Phase == 2 {
		GlobalSyncProgress.IpkTotal = len(nims)
	}
	GlobalSyncProgress.Unlock()

	fmt.Printf("[IPK Sync] Processing %d students...\n", len(nims))

	var synced int32 = 0
	var failed int32 = 0
	var processed int32 = 0

	numWorkers := 10
	jobs := make(chan string, len(nims))
	
	var wg sync.WaitGroup

	worker := func(workerID int) {
		defer wg.Done()
		for nim := range jobs {
			GlobalSyncProgress.Lock()
			isCancelled := GlobalSyncProgress.IsCancelled
			GlobalSyncProgress.Unlock()
			if isCancelled {
				continue
			}

			// Fetch Transkrip
			txUrl := fmt.Sprintf("%s/mahasiswa/%s/transkrip", svc.BaseURL, nim)
			
			var reqTx *http.Request
			var resTx *http.Response
			var err error
			
			maxRetries := 5
			for retries := 0; retries < maxRetries; retries++ {
				reqTx, err = http.NewRequest("GET", txUrl, nil)
				if err != nil {
					break
				}
				reqTx.Header.Set("X-App-Key", svc.AppKey)
				reqTx.Header.Set("X-Secret-Key", svc.SecretKey)
				reqTx.Header.Set("Content-Type", "application/json")
				reqTx.Header.Set("Accept", "application/json")
				
				resTx, err = svc.Client.Do(reqTx)
				if err != nil {
					break
				}
				
				if resTx.StatusCode == 429 {
					resTx.Body.Close()
					time.Sleep(time.Duration(2 + retries*2) * time.Second)
					continue
				}
				break
			}
			
			if err != nil || resTx == nil {
				atomic.AddInt32(&failed, 1)
			} else {
				var gradePoints float64
				var gradedSks int
				var totalSksLulus int

				if resTx.StatusCode == 200 {
					var txRes struct {
						Data []struct {
							Attributes map[string]interface{} `json:"attributes"`
						} `json:"data"`
					}
					if json.NewDecoder(resTx.Body).Decode(&txRes) == nil {
						for _, item := range txRes.Data {
							attr := item.Attributes
							sksVal := attr["sks_mata_kuliah"]
							sks := 0
							if sStr, ok := sksVal.(string); ok {
								fmt.Sscanf(sStr, "%d", &sks)
							} else if sF, ok := sksVal.(float64); ok {
								sks = int(sF)
							}

							nilaiVal := attr["nilai_angka"]
							nilai := 0.0
							if nStr, ok := nilaiVal.(string); ok {
								fmt.Sscanf(nStr, "%f", &nilai)
							} else if nF, ok := nilaiVal.(float64); ok {
								nilai = nF
							}

							isLulusVal := attr["is_lulus"]
							isLulus := false
							if ilStr, ok := isLulusVal.(string); ok {
								isLulus = ilStr == "1"
							} else if ilF, ok := isLulusVal.(float64); ok {
								isLulus = ilF == 1
							} else if ilBool, ok := isLulusVal.(bool); ok {
								isLulus = ilBool
							}

							if isLulus {
								totalSksLulus += sks
							}
							gradePoints += nilai * float64(sks)
							gradedSks += sks
						}
					}
				}
				resTx.Body.Close()

				ipk := 0.0
				if gradedSks > 0 {
					ipk = gradePoints / float64(gradedSks)
				}

				if ipk > 0 {
					config.DB.Exec(
						"UPDATE mahasiswa.mahasiswa SET ipk = ?, total_sks = ?, updated_at = NOW() WHERE nim = ?",
						ipk, totalSksLulus, nim,
					)
					atomic.AddInt32(&synced, 1)
				} else {
					atomic.AddInt32(&failed, 1)
				}
			}

			currentProcessed := atomic.AddInt32(&processed, 1)
			
			GlobalSyncProgress.Lock()
			if GlobalSyncProgress.Phase == 2 {
				GlobalSyncProgress.IpkSynced = int(atomic.LoadInt32(&synced))
				GlobalSyncProgress.IpkFailed = int(atomic.LoadInt32(&failed))
			}
			GlobalSyncProgress.Unlock()

			if currentProcessed % 100 == 0 {
				fmt.Printf("[IPK Sync] Processed %d/%d (synced: %d, failed: %d)\n", currentProcessed, len(nims), atomic.LoadInt32(&synced), atomic.LoadInt32(&failed))
			}

			// Gentle sleep to avoid hammering SEVIMA
			time.Sleep(50 * time.Millisecond)
		}
	}

	for w := 1; w <= numWorkers; w++ {
		wg.Add(1)
		go worker(w)
	}

	for _, nim := range nims {
		jobs <- nim
	}
	close(jobs)
	wg.Wait()

	fmt.Printf("[IPK Sync] Completed! Synced: %d, Failed: %d, Total: %d\n", synced, failed, len(nims))
	return int(synced), int(failed), nil
}

type SevimaPeriodeResponse struct {
	Data []SevimaPeriodeItem `json:"data"`
}

type SevimaPeriodeItem struct {
	ID         string            `json:"id"`
	Attributes SevimaPeriodeAttr `json:"attributes"`
}

type SevimaPeriodeAttr struct {
	IsAktif     string `json:"is_aktif"`
	NamaPeriode string `json:"nama_periode"` // e.g. "2025 Genap"
	TahunAjar   string `json:"tahun_ajar"`   // e.g. "2025/2026"
}

func (s *SevimaSyncService) SyncPeriode() (int, error) {
	if s.AppKey == "" || s.SecretKey == "" {
		return 0, fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	// Drop old unique index if exists (migration fix)
	config.DB.Exec("DROP INDEX IF EXISTS fakultas.idx_academic_periods_sevima_id")

	// Clean up old records that don't have a sevima_id (pre-sync data)
	config.DB.Exec("DELETE FROM fakultas.academic_periods WHERE sevima_id IS NULL OR sevima_id = ''")

	page := 1
	limit := 100
	totalSynced := 0
	var activeTahunAjaran string
	var activeSemester string

	for {
		url := fmt.Sprintf("%s/periode?page=%d&limit=%d", s.BaseURL, page, limit)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return totalSynced, fmt.Errorf("failed to create request: %v", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		req.Header.Set("X-App-Key", s.AppKey)
		req.Header.Set("X-Secret-Key", s.SecretKey)

		var res *http.Response
		maxRetries := 5
		for retries := 0; retries < maxRetries; retries++ {
			res, err = s.Client.Do(req)
			if err != nil {
				return totalSynced, fmt.Errorf("failed to fetch periode: %v", err)
			}
			if res.StatusCode == http.StatusTooManyRequests {
				res.Body.Close()
				waitSec := 5 + (retries * 3)
				fmt.Printf("[Sync Periode] Rate limited, waiting %ds...\n", waitSec)
				time.Sleep(time.Duration(waitSec) * time.Second)
				req, _ = http.NewRequest("GET", url, nil)
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Accept", "application/json")
				req.Header.Set("X-App-Key", s.AppKey)
				req.Header.Set("X-Secret-Key", s.SecretKey)
				continue
			}
			break
		}

		body, err := io.ReadAll(res.Body)
		res.Body.Close()
		if err != nil {
			return totalSynced, fmt.Errorf("failed to read response body: %v", err)
		}

		if res.StatusCode != http.StatusOK {
			return totalSynced, fmt.Errorf("api error %d: %s", res.StatusCode, string(body))
		}

		var response SevimaPeriodeResponse
		if err := json.Unmarshal(body, &response); err != nil {
			return totalSynced, fmt.Errorf("failed to parse json: %v", err)
		}

		if len(response.Data) == 0 {
			break
		}

		for _, item := range response.Data {
			attr := item.Attributes

			// Detect semester from nama_periode
			semester := "Ganjil"
			lowerNama := strings.ToLower(attr.NamaPeriode)
			if strings.Contains(lowerNama, "genap") {
				semester = "Genap"
			} else if strings.Contains(lowerNama, "pendek") || strings.Contains(lowerNama, "antara") {
				semester = "Antara"
			}

			isActive := attr.IsAktif == "1"

			// Track the active period for pengaturan_akademik
			if isActive {
				activeTahunAjaran = attr.TahunAjar
				activeSemester = semester
			}

			// Upsert into academic_periods
			var period models.AcademicPeriod
			err := config.DB.Where("sevima_id = ?", item.ID).First(&period).Error
			if err == gorm.ErrRecordNotFound {
				period = models.AcademicPeriod{
					SevimaID: item.ID,
				}
			}

			period.Name = attr.NamaPeriode
			period.AcademicYear = attr.TahunAjar
			period.Semester = semester
			period.IsActive = isActive

			if period.ID == 0 {
				config.DB.Create(&period)
			} else {
				config.DB.Save(&period)
			}
			
			// Auto-generate Kencana Period for "Ganjil"
			if semester == "Ganjil" {
				year := ""
				if len(period.AcademicYear) >= 4 {
					year = period.AcademicYear[:4]
				} else if len(period.Name) >= 4 {
					year = period.Name[:4]
				}

				if year != "" {
					var parsedYear int
					fmt.Sscanf(year, "%d", &parsedYear)
					expectedName := fmt.Sprintf("PKKMB %s", year)

					var existingKencana models.KencanaPeriod
					errK := config.DB.Where("name = ?", expectedName).First(&existingKencana).Error
					if errK != nil {
						// Create Kencana Period
						newKencana := models.KencanaPeriod{
							Name:                  expectedName,
							Year:                  parsedYear,
							Description:           fmt.Sprintf("Sinkronisasi otomatis dari periode akademik %s", period.Name),
							Status:                "draft",
							UniversityPhaseStatus: "draft",
							PassingGrade:          60,
							RemedialGrade:         50,
							PmbPeriodeId:          period.SevimaID, // Map it so we know which sevima period it belongs to
						}
						config.DB.Create(&newKencana)
					}
				}
			}

			totalSynced++
		}

		fmt.Printf("[Sync Periode] Page %d: +%d (total: %d)\n", page, len(response.Data), totalSynced)

		if len(response.Data) < limit {
			break
		}

		// time.Sleep(500 * time.Millisecond) // Whitelisted
		page++
	}

	// Also update pengaturan_akademik with the active period
	if activeTahunAjaran != "" {
		var pengaturan models.PengaturanAkademik
		err := config.DB.First(&pengaturan).Error
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				pengaturan = models.PengaturanAkademik{
					TahunAkademik: activeTahunAjaran,
					Semester:      activeSemester,
				}
				config.DB.Create(&pengaturan)
			}
		} else {
			pengaturan.TahunAkademik = activeTahunAjaran
			pengaturan.Semester = activeSemester
			config.DB.Save(&pengaturan)
		}
	}

	return totalSynced, nil
}

// ========================
// SYNC PMB (PENDAFTAR MAHASISWA BARU)
// ========================

type SevimaPendaftarResponse struct {
	Data []SevimaPendaftarItem `json:"data"`
	Meta SevimaMeta            `json:"meta"`
}

type SevimaPendaftarItem struct {
	ID         int                 `json:"id"`
	Attributes SevimaPendaftarAttr `json:"attributes"`
}

type SevimaPendaftarAttr struct {
	Kode               string `json:"kode"`
	Nama               string `json:"nama"`
	NIM                string `json:"nim"`
	NIK                string `json:"nik"`
	Email              string `json:"email"`
	NomorHP            string `json:"nomor_hp"`
	JenisKelamin       string `json:"jenis_kelamin"`
	TempatLahir        string `json:"tempat_lahir"`
	TanggalLahir       string `json:"tanggal_lahir"`
	Agama              string `json:"agama"`
	AlamatJalan        string `json:"alamat_jalan"`
	Kota               string `json:"kota"`
	NamaProvinsi       string `json:"nama_provinsi"`
	KodePos            string `json:"kode_pos"`
	JalurPendaftaran   string `json:"jalur_pendaftaran"`
	Gelombang          string `json:"gelombang"`
	SistemKuliah       string `json:"sistem_kuliah"`
	IDPeriode          string `json:"id_periode"`
	PeriodeDaftar      string `json:"periode_daftar"`
	NomorUjian         string `json:"nomor_ujian"`
	IsDaftarUlang      string `json:"is_daftar_ulang"`
	IsFinal            string `json:"is_final"`
	IsAktif            string `json:"is_aktif"`
	NamaIbu            string `json:"nama_ibu"`
	NamaPendidikanAsal string `json:"nama_pendidikan_asal"`
	UniversitasAsal    string `json:"universitas_asal"`
	ProgramStudiAsal   string `json:"program_studi_asal"`
	TanggalDaftar      string `json:"tanggal_daftar"`
	TanggalDaftarUlang string `json:"tanggal_daftar_ulang"`
	NomorKK            string `json:"nomor_kk"`
}

type SevimaProdiPendaftarResponse struct {
	Data []SevimaProdiPendaftarItem `json:"data"`
	Meta SevimaMeta                 `json:"meta"`
}

type SevimaProdiPendaftarItem struct {
	ID         int                      `json:"id"`
	Attributes SevimaProdiPendaftarAttr `json:"attributes"`
}

type SevimaProdiPendaftarAttr struct {
	IDPendaftar  int    `json:"id_pendaftar"`
	ProgramStudi string `json:"program_studi"`
}

func (s *SevimaSyncService) buildProdiMap() (map[string]string, error) {
	prodiMap := make(map[string]string)
	var mu sync.Mutex
	limit := 100

	log.Printf("[SyncPMB] Memulai penarikan data Program Studi Pendaftar secara bulk paralel (Opsi C)...")

	fetchPage := func(page int) (*SevimaProdiPendaftarResponse, error) {
		for attempt := 1; attempt <= 15; attempt++ {
			url := fmt.Sprintf("%s/program-studi-pendaftar?page=%d&limit=%d", s.BaseURL, page, limit)
			req, err := http.NewRequest("GET", url, nil)
			if err != nil {
				return nil, err
			}
			req.Header.Set("X-App-Key", s.AppKey)
			req.Header.Set("X-Secret-Key", s.SecretKey)
			req.Header.Set("Accept", "application/json")

			resp, err := s.Client.Do(req)
			if err != nil {
				return nil, err
			}

			body, _ := io.ReadAll(resp.Body)
			resp.Body.Close()

			if resp.StatusCode == 429 {
				log.Printf("[SyncPMB] Page %d got 429, backing off for %d seconds...", page, attempt*2)
				time.Sleep(time.Duration(attempt*2) * time.Second)
				continue
			}

			if resp.StatusCode != 200 {
				return nil, fmt.Errorf("HTTP %d pada program-studi-pendaftar", resp.StatusCode)
			}

			var response SevimaProdiPendaftarResponse
			if err := json.Unmarshal(body, &response); err != nil {
				return nil, err
			}
			return &response, nil
		}
		return nil, fmt.Errorf("failed to fetch page %d after multiple retries due to 429", page)
	}

	// Fetch page 1
	firstPageResp, err := fetchPage(1)
	if err != nil {
		return nil, err
	}

	for _, item := range firstPageResp.Data {
		pendaftarID := fmt.Sprintf("%d", item.Attributes.IDPendaftar)
		prodiMap[pendaftarID] = item.Attributes.ProgramStudi
	}
	log.Printf("[SyncPMB] Fetched %d prodi mappings from page 1", len(firstPageResp.Data))

	lastPage := firstPageResp.Meta.LastPage
	if lastPage <= 1 {
		log.Printf("[SyncPMB] Selesai menarik prodi map (hanya 1 halaman). Total: %d mappings", len(prodiMap))
		return prodiMap, nil
	}

	log.Printf("[SyncPMB] Menarik data secara paralel untuk halaman 2 s/d %d...", lastPage)

	// Fetch pages 2 to lastPage concurrently.
	// We use a worker pool with a capacity of 3 to limit concurrent requests.
	numWorkers := 3
	if numWorkers > lastPage-1 {
		numWorkers = lastPage - 1
	}

	pagesChan := make(chan int, lastPage-1)
	for p := 2; p <= lastPage; p++ {
		pagesChan <- p
	}
	close(pagesChan)

	var wg sync.WaitGroup
	errChan := make(chan error, lastPage-1)

	// Update sync progress status text during map building
	GlobalSyncProgress.Lock()
	GlobalSyncProgress.StatusText = fmt.Sprintf("Mempersiapkan data prodi (1/%d halaman)...", lastPage)
	GlobalSyncProgress.Unlock()

	var pagesCompleted int32 = 1 // page 1 is already completed

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for page := range pagesChan {
				resp, err := fetchPage(page)
				if err != nil {
					select {
					case errChan <- err:
					default:
					}
					return
				}

				mu.Lock()
				for _, item := range resp.Data {
					pendaftarID := fmt.Sprintf("%d", item.Attributes.IDPendaftar)
					prodiMap[pendaftarID] = item.Attributes.ProgramStudi
				}
				mu.Unlock()

				completed := atomic.AddInt32(&pagesCompleted, 1)
				GlobalSyncProgress.Lock()
				GlobalSyncProgress.StatusText = fmt.Sprintf("Mempersiapkan data prodi (%d/%d halaman)...", completed, lastPage)
				GlobalSyncProgress.Unlock()

				log.Printf("[SyncPMB] Fetched %d prodi mappings from page %d", len(resp.Data), page)
			}
		}()
	}

	wg.Wait()
	close(errChan)

	if len(errChan) > 0 {
		return nil, <-errChan
	}

	log.Printf("[SyncPMB] Selesai menarik prodi map. Total: %d mappings", len(prodiMap))
	return prodiMap, nil
}

func (s *SevimaSyncService) SyncPMB() (int, error) {
	if s.AppKey == "" || s.SecretKey == "" {
		return 0, fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	GlobalSyncProgress.Lock()
	GlobalSyncProgress.IsRunning = true
	GlobalSyncProgress.IsCancelled = false
	GlobalSyncProgress.CurrentPage = 0
	GlobalSyncProgress.TotalSynced = 0
	GlobalSyncProgress.TotalData = 0 // Will update when we know
	GlobalSyncProgress.StatusText = "Mempersiapkan data dan struktur program studi..."
	GlobalSyncProgress.Unlock()

	defer func() {
		GlobalSyncProgress.Lock()
		GlobalSyncProgress.IsRunning = false
		GlobalSyncProgress.StatusText = "Sinkronisasi PMB selesai."
		GlobalSyncProgress.Unlock()
	}()

	// Clean up old seeded data (no sevima_id)
	config.DB.Exec("DELETE FROM public.pendaftaran_mahasiswa_baru WHERE sevima_id IS NULL OR sevima_id = ''")

	// Pre-fetch program studi mapping (Smart Bulk - Opsi C)
	prodiMap, err := s.buildProdiMap()
	if err != nil {
		log.Printf("[SyncPMB] WARNING: Gagal menarik program-studi-pendaftar: %v", err)
		if prodiMap == nil {
			prodiMap = make(map[string]string) // fallback to empty map
		}
	}

	var totalSynced int32 = 0
	var totalSkipped int32 = 0
	limit := 100

	GlobalSyncProgress.Lock()
	GlobalSyncProgress.StatusText = "Memulai sinkronisasi PMB paralel..."
	GlobalSyncProgress.Unlock()

	// Helper to fetch and process a single page
	fetchAndProcessPage := func(pageNum int) (int, int, error) {
		var resp *http.Response
		var err error
		url := fmt.Sprintf("%s/pendaftar?page=%d&limit=%d", s.BaseURL, pageNum, limit)
		
		for attempt := 1; attempt <= 15; attempt++ {
			req, errReq := http.NewRequest("GET", url, nil)
			if errReq != nil {
				return 0, 0, errReq
			}
			req.Header.Set("X-App-Key", s.AppKey)
			req.Header.Set("X-Secret-Key", s.SecretKey)
			req.Header.Set("Accept", "application/json")

			resp, err = s.Client.Do(req)
			if err != nil {
				time.Sleep(time.Duration(attempt) * time.Second)
				continue
			}

			if resp.StatusCode == 429 {
				resp.Body.Close()
				time.Sleep(time.Duration(attempt*2) * time.Second)
				continue
			}

			if resp.StatusCode != 200 {
				resp.Body.Close()
				return 0, 0, fmt.Errorf("HTTP %d on page %d", resp.StatusCode, pageNum)
			}
			break
		}

		if err != nil || resp == nil || resp.StatusCode != 200 {
			return 0, 0, fmt.Errorf("failed to fetch page %d after retries", pageNum)
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var response SevimaPendaftarResponse
		if err := json.Unmarshal(body, &response); err != nil {
			return 0, 0, fmt.Errorf("failed to parse page %d: %w", pageNum, err)
		}

		if len(response.Data) == 0 {
			return 0, 0, nil
		}

		if pageNum == 1 {
			GlobalSyncProgress.Lock()
			GlobalSyncProgress.TotalData = response.Meta.Total
			GlobalSyncProgress.Unlock()
		}

		var syncedInPage int32 = 0
		var skippedInPage int32 = 0

		for _, item := range response.Data {
			attr := item.Attributes

			sevimaID := fmt.Sprintf("%d", item.ID)

			if attr.Kode == "" {
				skippedInPage++
				
				anomali := models.SevimaPMBAnomali{
					IDSevima:    sevimaID,
					NomorDaftar: "",
					Nama:        attr.Nama,
					Prodi:       prodiMap[sevimaID],
					AlasanError: "Nomor Daftar (Kode) kosong dari SEVIMA",
				}
				config.DB.Where("id_sevima = ?", sevimaID).Assign(anomali).FirstOrCreate(&anomali)
				continue
			}

			var existing models.PendaftaranMahasiswaBaru
			err := config.DB.Where("sevima_id = ?", sevimaID).First(&existing).Error

			record := existing
			record.SevimaID = sevimaID
			record.NomorDaftar = attr.Kode
			record.NamaLengkap = attr.Nama
			record.NIM = attr.NIM
			record.NIK = attr.NIK
			record.Email = attr.Email
			record.NoHP = attr.NomorHP
			record.JenisKelamin = attr.JenisKelamin
			record.TempatLahir = attr.TempatLahir
			record.TanggalLahir = attr.TanggalLahir
			record.Agama = attr.Agama
			record.Alamat = attr.AlamatJalan
			record.Kota = attr.Kota
			record.Provinsi = attr.NamaProvinsi
			record.KodePos = attr.KodePos
			record.Jalur = attr.JalurPendaftaran
			record.SistemKuliah = attr.SistemKuliah
			record.IDPeriode = attr.IDPeriode
			record.PeriodeDaftar = attr.PeriodeDaftar
			record.NomorUjian = attr.NomorUjian
			record.IsDaftarUlang = attr.IsDaftarUlang == "1"
			record.IsFinal = attr.IsFinal == "1"
			record.NamaIbu = attr.NamaIbu
			record.UniversitasAsal = attr.UniversitasAsal
			record.ProdiAsal = attr.ProgramStudiAsal
			if attr.NamaPendidikanAsal != "" {
				record.AsalSekolah = attr.NamaPendidikanAsal
			}

			if prodiName, ok := prodiMap[sevimaID]; ok && prodiName != "" {
				record.PilihanProdi = prodiName
			} else if attr.ProgramStudiAsal != "" {
				record.PilihanProdi = attr.ProgramStudiAsal
			}

			record.Status = "Verified"

			if attr.TanggalDaftar != "" {
				for _, layout := range []string{
					"2006-01-02T15:04:05.000-07:00",
					"2006-01-02T15:04:05.000+07:00",
					"2006-01-02 15:04:05",
					"2006-01-02",
				} {
					if td, err := time.Parse(layout, attr.TanggalDaftar); err == nil {
						record.TanggalDaftar = &td
						break
					}
				}
			}

			if attr.TanggalDaftarUlang != "" {
				for _, layout := range []string{
					"2006-01-02T15:04:05.000-07:00",
					"2006-01-02T15:04:05.000+07:00",
					"2006-01-02 15:04:05",
					"2006-01-02",
				} {
					if tdu, err := time.Parse(layout, attr.TanggalDaftarUlang); err == nil {
						record.TanggalDaftarUlang = &tdu
						break
					}
				}
			}

			var saveErr error
			if err != nil {
				if dbErr := config.DB.Create(&record).Error; dbErr == nil {
					syncedInPage++
				} else {
					saveErr = dbErr
					skippedInPage++
				}
			} else {
				if dbErr := config.DB.Save(&record).Error; dbErr == nil {
					syncedInPage++
				} else {
					saveErr = dbErr
					skippedInPage++
				}
			}

			if saveErr != nil {
				anomali := models.SevimaPMBAnomali{
					IDSevima:    sevimaID,
					NomorDaftar: attr.Kode,
					Nama:        attr.Nama,
					Prodi:       record.PilihanProdi,
					AlasanError: fmt.Sprintf("Gagal menyimpan database: %v", saveErr),
				}
				config.DB.Where("id_sevima = ?", sevimaID).Assign(anomali).FirstOrCreate(&anomali)
			} else {
				config.DB.Where("id_sevima = ?", sevimaID).Delete(&models.SevimaPMBAnomali{})
			}
		}

		currentSynced := atomic.AddInt32(&totalSynced, syncedInPage)
		atomic.AddInt32(&totalSkipped, skippedInPage)

		GlobalSyncProgress.Lock()
		GlobalSyncProgress.TotalSynced = int(currentSynced)
		GlobalSyncProgress.StatusText = fmt.Sprintf("Memproses %d data pendaftar dari total %d...", currentSynced, response.Meta.Total)
		GlobalSyncProgress.Unlock()

		return response.Meta.LastPage, response.Meta.Total, nil
	}

	// Fetch page 1 synchronously to get total pages
	lastPage, totalItems, err := fetchAndProcessPage(1)
	if err != nil {
		return 0, fmt.Errorf("failed to fetch initial page: %w", err)
	}

	if lastPage > 1 {
		numWorkers := 3 // Reduced from 10 to prevent severe rate limiting from SEVIMA
		if numWorkers > lastPage-1 {
			numWorkers = lastPage - 1
		}

		pagesChan := make(chan int, lastPage-1)
		for p := 2; p <= lastPage; p++ {
			pagesChan <- p
		}
		close(pagesChan)

		var wg sync.WaitGroup
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for p := range pagesChan {
					GlobalSyncProgress.Lock()
					if GlobalSyncProgress.IsCancelled {
						GlobalSyncProgress.Unlock()
						return
					}
					GlobalSyncProgress.Unlock()

					// Add infinite retry for page if it fails due to rate limits
					maxRetriesPage := 15
					for r := 1; r <= maxRetriesPage; r++ {
						_, _, errPage := fetchAndProcessPage(p)
						if errPage == nil {
							break
						}
						log.Printf("[SyncPMB] Page %d failed on attempt %d: %v. Retrying...", p, r, errPage)
						time.Sleep(time.Duration(r * 2) * time.Second)
					}
				}
			}()
		}
		wg.Wait()
	}

	log.Printf("[SyncPMB] COMPLETE! Total synced: %d, Total skipped: %d out of %d", totalSynced, totalSkipped, totalItems)
	return int(totalSynced), nil
}

// SyncPMBById fetches a specific PMB record by ID and updates it
func (s *SevimaSyncService) SyncPMBById(idSevima string) error {
	limit := 1
	url := fmt.Sprintf("%s/pendaftar?limit=%d&filter={\"id_pendaftar\":\"%s\"}", s.BaseURL, limit, idSevima)
	
	req, errReq := http.NewRequest("GET", url, nil)
	if errReq != nil {
		return errReq
	}
	req.Header.Set("X-App-Key", s.AppKey)
	req.Header.Set("X-Secret-Key", s.SecretKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP %d from SEVIMA", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var response SevimaPendaftarResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return fmt.Errorf("gagal parsing response: %w", err)
	}

	if len(response.Data) == 0 {
		return fmt.Errorf("data pendaftar dengan ID %s tidak ditemukan di SEVIMA", idSevima)
	}

	item := response.Data[0]
	attr := item.Attributes

	if attr.Kode == "" {
		return fmt.Errorf("Nomor Daftar (Kode) kosong dari SEVIMA")
	}

	var existing models.PendaftaranMahasiswaBaru
	err = config.DB.Where("sevima_id = ?", idSevima).First(&existing).Error

	record := existing
	record.SevimaID = idSevima
	record.NomorDaftar = attr.Kode
	record.NamaLengkap = attr.Nama
	record.NIM = attr.NIM
	record.NIK = attr.NIK
	record.Email = attr.Email
	record.NoHP = attr.NomorHP
	record.JenisKelamin = attr.JenisKelamin
	record.TempatLahir = attr.TempatLahir
	record.TanggalLahir = attr.TanggalLahir
	record.Agama = attr.Agama
	record.Alamat = attr.AlamatJalan
	record.Kota = attr.Kota
	record.Provinsi = attr.NamaProvinsi
	record.KodePos = attr.KodePos
	record.Jalur = attr.JalurPendaftaran
	record.SistemKuliah = attr.SistemKuliah
	record.IDPeriode = attr.IDPeriode
	record.PeriodeDaftar = attr.PeriodeDaftar
	record.NomorUjian = attr.NomorUjian
	record.IsDaftarUlang = attr.IsDaftarUlang == "1"
	record.IsFinal = attr.IsFinal == "1"
	record.NamaIbu = attr.NamaIbu
	record.UniversitasAsal = attr.UniversitasAsal
	record.ProdiAsal = attr.ProgramStudiAsal
	if attr.NamaPendidikanAsal != "" {
		record.AsalSekolah = attr.NamaPendidikanAsal
	}

	// For single sync, we can just use ProgramStudiAsal as fallback or fetch prodi separately
	record.PilihanProdi = attr.ProgramStudiAsal
	record.Status = "Verified"

	if attr.TanggalDaftar != "" {
		if td, err := time.Parse("2006-01-02 15:04:05", attr.TanggalDaftar); err == nil {
			record.TanggalDaftar = &td
		}
	}

	if attr.TanggalDaftarUlang != "" {
		if tdu, err := time.Parse("2006-01-02 15:04:05", attr.TanggalDaftarUlang); err == nil {
			record.TanggalDaftarUlang = &tdu
		}
	}

	if err != nil {
		if dbErr := config.DB.Create(&record).Error; dbErr != nil {
			return dbErr
		}
	} else {
		if dbErr := config.DB.Save(&record).Error; dbErr != nil {
			return dbErr
		}
	}

	// Remove from anomali if success
	config.DB.Where("id_sevima = ?", idSevima).Delete(&models.SevimaPMBAnomali{})

	return nil
}

// SyncPMBToKencana pulls PMB records that have NIM and converts them to Mahasiswa & PKKMB participants
func (s *SevimaSyncService) SyncPMBToKencana() (int, error) {
	var pmbList []models.PendaftaranMahasiswaBaru
	// Cari PMB yang NIM-nya tidak kosong
	if err := config.DB.Where("nim IS NOT NULL AND nim != ''").Find(&pmbList).Error; err != nil {
		return 0, err
	}

	var count int32 = 0
	workerCount := 20
	pmbChan := make(chan models.PendaftaranMahasiswaBaru, len(pmbList))
	for _, pmb := range pmbList {
		pmbChan <- pmb
	}
	close(pmbChan)

	var wg sync.WaitGroup
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for pmb := range pmbChan {
				idSevimaStr := fmt.Sprintf("PMB_%d", pmb.ID)
				mhsAttr := SevimaMahasiswaAttr{
					NIM:               pmb.NIM,
					Nama:              pmb.NamaLengkap,
					JenisKelamin:      pmb.JenisKelamin,
					TempatLahir:       pmb.TempatLahir,
					TanggalLahir:      pmb.TanggalLahir,
					Agama:             pmb.Agama,
					NIK:               pmb.NIK,
					Email:             pmb.Email,
					HP:                pmb.NoHP,
					Alamat:            pmb.Alamat,
					Kota:              pmb.Kota,
					Provinsi:          pmb.Provinsi,
					KodePos:           pmb.KodePos,
					JalurPendaftaran:  pmb.Jalur,
					Gelombang:         pmb.Gelombang,
					SistemKuliah:      pmb.SistemKuliah,
					IDPeriode:         pmb.IDPeriode,
					ProgramStudi:      pmb.PilihanProdi,
					StatusMahasiswa:   "Aktif",
					IDStatusMahasiswa: "A",
				}

				if err := s.syncSingleMahasiswa(idSevimaStr, mhsAttr); err != nil {
					log.Printf("[SyncPMBToKencana] Warning: Failed auto-generating Mahasiswa/PKKMB for %s: %v", pmb.NIM, err)
				} else {
					atomic.AddInt32(&count, 1)
				}
			}
		}()
	}

	wg.Wait()
	return int(count), nil
}

// SyncMahasiswaById fetches a single mahasiswa from SEVIMA and syncs it to the local DB
func (s *SevimaSyncService) SyncMahasiswaById(idSevima string) error {
	if s.AppKey == "" || s.SecretKey == "" {
		return fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	url := fmt.Sprintf("%s/mahasiswa/%s", s.BaseURL, idSevima)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Add("X-App-Key", s.AppKey)
	req.Header.Add("X-Secret-Key", s.SecretKey)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %v", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read response: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(body))
	}

	var response struct {
		Data SevimaMahasiswaAttr `json:"data"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return fmt.Errorf("failed to parse JSON: %v", err)
	}

	attr := response.Data
	if attr.NIM == "" {
		if err := json.Unmarshal(body, &attr); err != nil {
			return fmt.Errorf("failed to parse JSON: %v", err)
		}
	}

	if attr.NIM == "" {
		return fmt.Errorf("API returned empty NIM, data mungkin tidak valid atau format respon berbeda")
	}

	return s.syncSingleMahasiswa(idSevima, attr)
}
