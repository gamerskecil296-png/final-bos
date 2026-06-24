package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"siakad-backend/config"
	"siakad-backend/models"

	"gorm.io/gorm"
)

// Structs for parsing Sevima Dosen response
type SevimaDosenResponse struct {
	Data []SevimaDosenItem `json:"data"`
}

type SevimaDosenItem struct {
	ID         int             `json:"id"`
	Attributes SevimaDosenAttr `json:"attributes"`
}

type SevimaDosenAttr struct {
	NIDN             string `json:"nidn"`
	Nama             string `json:"nama"`
	Email            string `json:"email"`
	EmailKampus      string `json:"email_kampus"`
	Jabatan          string `json:"jabatan_fungsional"`
	StatusAktif      string `json:"status_aktif"`
	GelarDepan       string `json:"gelar_depan"`
	GelarBelakang    string `json:"gelar_belakang"`
	NomorHP          string `json:"nomor_hp"`
	Alamat           string `json:"alamat_domisili"`
	ProgramStudiNama string `json:"home_base"`
	
	NIK               string `json:"nik"`
	NIP               string `json:"nip"`
	JenisKelamin      string `json:"jenis_kelamin"`
	TempatLahir       string `json:"tempat_lahir"`
	TanggalLahir      string `json:"tanggal_lahir"`
	Agama             string `json:"agama"`
	StatusKepegawaian string `json:"status_kepegawaian"`
}

func (s *SevimaSyncService) SyncDosen() (int, error) {
	if s.AppKey == "" || s.SecretKey == "" {
		return 0, fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	page := 1
	totalSynced := 0
	limit := 100

	for {
		url := fmt.Sprintf("%s/dosen?page=%d&limit=%d", s.BaseURL, page, limit)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return totalSynced, err
		}

		req.Header.Add("X-App-Key", s.AppKey)
		req.Header.Add("X-Secret-Key", s.SecretKey)
		req.Header.Add("Accept", "application/json")

		res, err := s.Client.Do(req)
		if err != nil {
			return totalSynced, err
		}

		if res.StatusCode != 200 {
			body, _ := io.ReadAll(res.Body)
			res.Body.Close()
			return totalSynced, fmt.Errorf("SEVIMA API Error (Dosen): %s", string(body))
		}

		var sevimaResp SevimaDosenResponse
		decodeErr := json.NewDecoder(res.Body).Decode(&sevimaResp)
		res.Body.Close()
		if decodeErr != nil {
			return totalSynced, decodeErr
		}

		if len(sevimaResp.Data) == 0 {
			break // No more data
		}

		// Save to DB
		for _, item := range sevimaResp.Data {
			attr := item.Attributes
			if attr.NIDN == "" && attr.Nama == "" {
				continue
			}

			// Format Nama with gelar
			namaLengkap := attr.Nama
			if attr.GelarDepan != "" {
				namaLengkap = attr.GelarDepan + " " + namaLengkap
			}
			if attr.GelarBelakang != "" {
				namaLengkap = namaLengkap + ", " + attr.GelarBelakang
			}

			// Resolve Prodi
			var prodiID uint = 0
			var fakultasID uint = 0
			if attr.ProgramStudiNama != "" {
				var prodi models.ProgramStudi
				if err := config.DB.Where("nama ILIKE ?", "%"+attr.ProgramStudiNama+"%").First(&prodi).Error; err == nil {
					prodiID = prodi.ID
					fakultasID = prodi.FakultasID
				}
			}

			// Map Jabatan
			jabatan := "Lektor"
			jFung := strings.ToLower(attr.Jabatan)
			if strings.Contains(jFung, "profesor") {
				jabatan = "Profesor"
			} else if strings.Contains(jFung, "asisten") {
				jabatan = "Asisten"
			} else if strings.Contains(jFung, "kepala") {
				jabatan = "Lektor Kepala"
			}

			email := attr.EmailKampus
			if email == "" {
				email = attr.Email
			}

			var existingDosen models.Dosen
			var err error
			
			if attr.NIDN != "" {
				err = config.DB.Where("n_id_n = ?", attr.NIDN).First(&existingDosen).Error
			} else {
				// If no NIDN, try to match by Nama
				err = config.DB.Where("nama = ?", attr.Nama).First(&existingDosen).Error
			}

			if err == gorm.ErrRecordNotFound {
				// Create User first
				emailUser := email
				if emailUser == "" && attr.NIDN != "" {
					emailUser = attr.NIDN + "@bku.ac.id"
				}
				if emailUser == "" || emailUser == "@bku.ac.id" {
				    emailUser = strings.ReplaceAll(strings.ToLower(attr.Nama), " ", ".") + "@bku.ac.id"
				}

				// Check if user email already exists
				var existingUser models.User
				config.DB.Where("email = ?", emailUser).First(&existingUser)
				
				var userID uint
				if existingUser.ID != 0 {
					userID = existingUser.ID
				} else {
					hashedPassword := "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy" // bcrypt of "bku123!"
					
					var fID, pID *uint
					if fakultasID != 0 { fID = &fakultasID }
					if prodiID != 0 { pID = &prodiID }

					newUser := models.User{
						NamaLengkap:    namaLengkap,
						Email:          emailUser,
						Password:       hashedPassword,
						Role:           "dosen",
						FakultasID:     fID,
						ProgramStudiID: pID,
					}
					if err := config.DB.Create(&newUser).Error; err == nil {
						userID = newUser.ID
					}
				}

				// Create Dosen
				newDosen := models.Dosen{
					NIDN:              attr.NIDN,
					Nama:              namaLengkap,
					Email:             email,
					NoHP:              attr.NomorHP,
					Alamat:            attr.Alamat,
					Jabatan:           jabatan,
					ProgramStudiID:    prodiID,
					FakultasID:        fakultasID,
					PenggunaID:        userID,
					NIK:               attr.NIK,
					NIP:               attr.NIP,
					JenisKelamin:      attr.JenisKelamin,
					TempatLahir:       attr.TempatLahir,
					TanggalLahir:      attr.TanggalLahir,
					Agama:             attr.Agama,
					StatusAktif:       attr.StatusAktif,
					StatusKepegawaian: attr.StatusKepegawaian,
				}
				if err := config.DB.Create(&newDosen).Error; err == nil {
					totalSynced++
				}
			} else if err == nil {
				// Update Dosen
				existingDosen.Nama = namaLengkap
				existingDosen.Email = email
				existingDosen.NoHP = attr.NomorHP
				existingDosen.Alamat = attr.Alamat
				existingDosen.Jabatan = jabatan
				existingDosen.NIK = attr.NIK
				existingDosen.NIP = attr.NIP
				existingDosen.JenisKelamin = attr.JenisKelamin
				existingDosen.TempatLahir = attr.TempatLahir
				existingDosen.TanggalLahir = attr.TanggalLahir
				existingDosen.Agama = attr.Agama
				existingDosen.StatusAktif = attr.StatusAktif
				existingDosen.StatusKepegawaian = attr.StatusKepegawaian
				if prodiID != 0 {
					existingDosen.ProgramStudiID = prodiID
					existingDosen.FakultasID = fakultasID
					
					// Update associated User's Fakultas and Prodi
					if existingDosen.PenggunaID != 0 {
						var fID, pID *uint
						if fakultasID != 0 { fID = &fakultasID }
						if prodiID != 0 { pID = &prodiID }
						config.DB.Model(&models.User{}).Where("id = ?", existingDosen.PenggunaID).Updates(map[string]interface{}{
							"fakultas_id":      fID,
							"program_studi_id": pID,
						})
					}
				}
				if err := config.DB.Save(&existingDosen).Error; err == nil {
					totalSynced++
				}
			}
		}

		page++
	}

	return totalSynced, nil
}
