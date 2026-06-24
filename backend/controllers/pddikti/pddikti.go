package pddikti

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"siakad-backend/config"
	"siakad-backend/models"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type PddiktiMhs struct {
	ID              string `json:"id"`
	Nama            string `json:"nama"`
	Nim             string `json:"nim"`
	NamaProdi       string `json:"nama_prodi"`
	NamaPT          string `json:"nama_pt"`
	Jenjang         string `json:"jenjang,omitempty"`
	StatusSaatIni   string `json:"status_saat_ini,omitempty"`
	SemesterSaatIni int    `json:"semester_saat_ini,omitempty"`
	TanggalMasuk    string `json:"tanggal_masuk,omitempty"`
	StatusAkun      string `json:"status_akun,omitempty"`
}

type PddiktiMhsDetail struct {
	StatusSaatIni string `json:"status_saat_ini"`
	TanggalMasuk  string `json:"tanggal_masuk"`
	Jenjang       string `json:"jenjang"`
}

type PddiktiDosen struct {
	ID        string `json:"id"`
	Nama      string `json:"nama"`
	Nidn      string `json:"nidn"`
	NamaProdi string `json:"nama_prodi"`
}

type PddiktiProdi struct {
	ID      string `json:"id"`
	Nama    string `json:"nama"`
	Jenjang string `json:"jenjang"`
}

type PddiktiAllResponse struct {
	Mahasiswa []PddiktiMhs   `json:"mahasiswa"`
	Dosen     []PddiktiDosen `json:"dosen"`
	Prodi     []PddiktiProdi `json:"prodi"`
}

// PddiktiProxy handles proxying requests to the official PDDIKTI API and auto-syncing to DB
func PddiktiProxy(c *fiber.Ctx) error {
	keyword := c.Query("keyword", "Universitas Bhakti Kencana")
	searchType := c.Query("type", "all")
	sync := c.Query("sync", "true")

	role, _ := c.Locals("role").(string)
	fid, _ := c.Locals("fakultas_id").(uint)

	// Bypass the external API's 100-result limit by appending faculty-specific keywords
	// so it returns 100 results strictly for this faculty instead of the whole university.
	if role == "faculty_admin" && fid != 0 {
		var faculty models.Fakultas
		if err := config.DB.First(&faculty, fid).Error; err == nil {
			fName := strings.ToLower(faculty.Nama)
			if strings.Contains(fName, "farmasi") {
				keyword = "Bhakti Kencana Farmasi"
			} else if strings.Contains(fName, "keperawatan") {
				keyword = "Bhakti Kencana Keperawatan"
			} else if strings.Contains(fName, "kesehatan") {
				keyword = "Bhakti Kencana Kesehatan"
			} else if strings.Contains(fName, "sosial") {
				keyword = "Bhakti Kencana Sosial Psikologi Komunikasi"
			}
		}
	}

	baseURL := "https://api-pddikti.kemdiktisaintek.go.id"
	var apiPath string
	switch searchType {
	case "mhs":
		apiPath = "pencarian/mhs"
	case "dosen":
		apiPath = "pencarian/dosen"
	case "prodi":
		apiPath = "pencarian/prodi"
	default:
		apiPath = "pencarian/all"
	}

	fullURL := fmt.Sprintf("%s/%s/%s", baseURL, apiPath, url.PathEscape(keyword))

	req, _ := http.NewRequest("GET", fullURL, nil)
	req.Header.Set("Origin", "https://pddikti.kemdiktisaintek.go.id")
	req.Header.Set("Referer", "https://pddikti.kemdiktisaintek.go.id/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result PddiktiAllResponse

	// Unmarshal
	if searchType == "all" {
		var all PddiktiAllResponse
		json.Unmarshal(body, &all)
		result.Mahasiswa = all.Mahasiswa
		result.Dosen = all.Dosen
		result.Prodi = all.Prodi
	} else if searchType == "mhs" {
		json.Unmarshal(body, &result.Mahasiswa)
	} else if searchType == "dosen" {
		json.Unmarshal(body, &result.Dosen)
	} else if searchType == "prodi" {
		json.Unmarshal(body, &result.Prodi)
	}

	if searchType == "mhs" || searchType == "all" {
		filtered := make([]PddiktiMhs, 0, len(result.Mahasiswa))
		for _, m := range result.Mahasiswa {
			if isBhaktiKencanaPT(m.NamaPT) {
				filtered = append(filtered, m)
			}
		}
		result.Mahasiswa = filtered
	}

	// 6. Post-process: Filter by Faculty if not Super Admin
	if role == "faculty_admin" && fid != 0 {
		var faculty models.Fakultas
		config.DB.First(&faculty, fid)

		filterKeywords := []string{}
		fName := strings.ToLower(faculty.Nama)
		if strings.Contains(fName, "farmasi") {
			filterKeywords = []string{"farmasi", "apoteker"}
		} else if strings.Contains(fName, "keperawatan") {
			filterKeywords = []string{"keperawatan", "ners"}
		} else if strings.Contains(fName, "kesehatan") {
			filterKeywords = []string{"kebidanan", "bidan", "masyarakat", "anestesi", "gizi"}
		} else if strings.Contains(fName, "sosial") {
			filterKeywords = []string{"komunikasi", "psikologi", "sosial"}
		}

		if len(filterKeywords) > 0 {
			var filteredMhs []PddiktiMhs
			var filteredDosen []PddiktiDosen
			var filteredProdi []PddiktiProdi

			for _, m := range result.Mahasiswa {
				for _, k := range filterKeywords {
					if strings.Contains(strings.ToLower(m.NamaProdi), k) {
						filteredMhs = append(filteredMhs, m)
						break
					}
				}
			}
			for _, d := range result.Dosen {
				for _, k := range filterKeywords {
					if strings.Contains(strings.ToLower(d.NamaProdi), k) {
						filteredDosen = append(filteredDosen, d)
						break
					}
				}
			}
			for _, p := range result.Prodi {
				for _, k := range filterKeywords {
					if strings.Contains(strings.ToLower(p.Nama), k) {
						filteredProdi = append(filteredProdi, p)
						break
					}
				}
			}
			result.Mahasiswa = filteredMhs
			result.Dosen = filteredDosen
			result.Prodi = filteredProdi
		} else {
			// No matching faculty keywords — return empty to be safe
			result.Mahasiswa = []PddiktiMhs{}
			result.Dosen = []PddiktiDosen{}
			result.Prodi = []PddiktiProdi{}
		}
	}

	if searchType == "mhs" || searchType == "all" {
		enrichMahasiswaDetails(&result.Mahasiswa)
	}

	// 7. Auto-Sync with Filtered Data
	if sync == "true" {
		go performSync(fid, result.Mahasiswa, result.Dosen, result.Prodi)
	}

	// ✅ Return FILTERED result (not raw body!) to frontend
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   result,
	})
}

func performSync(fid uint, mhs []PddiktiMhs, dosen []PddiktiDosen, prodi []PddiktiProdi) {
	fmt.Printf("🔄 [PDDIKTI-SYNC] Processing sync for Faculty ID %d...\n", fid)

	// 1. Sync Prodi First (Avoid duplicates via Name)
	prodiMap := make(map[string]uint)
	for _, p := range prodi {
		var item models.ProgramStudi
		pKey := prodiMapKey(p.Nama, p.Jenjang)
		// Try to find existing first
		config.DB.Where("LOWER(nama) = LOWER(?) AND LOWER(jenjang) = LOWER(?)", p.Nama, p.Jenjang).First(&item)
		if item.ID == 0 {
			config.DB.Where("LOWER(nama) = LOWER(?)", p.Nama).First(&item)
		}

		if item.ID == 0 {
			// Generate a simple code if not exists
			kode := ""
			parts := strings.Split(p.Nama, " ")
			for _, part := range parts {
				if len(part) > 0 {
					kode += string(part[0])
				}
			}
			item = models.ProgramStudi{
				Nama: p.Nama, Jenjang: p.Jenjang, FakultasID: fid, Kode: kode + "-" + p.Jenjang,
			}
			config.DB.Create(&item)
		} else {
			updates := map[string]interface{}{}
			if strings.TrimSpace(p.Jenjang) != "" && item.Jenjang != p.Jenjang {
				updates["jenjang"] = p.Jenjang
			}
			if item.FakultasID == 0 && fid != 0 {
				updates["fakultas_id"] = fid
			} else if item.FakultasID == 0 && fid == 0 {
				if inferred := inferFacultyIDByProdiName(p.Nama); inferred != 0 {
					updates["fakultas_id"] = inferred
				}
			}
			if len(updates) > 0 {
				config.DB.Model(&item).Updates(updates)
			}
		}
		prodiMap[pKey] = item.ID
	}

	// 2. Sync Dosen (Global Check via NIDN)
	for _, d := range dosen {
		if d.Nidn == "" {
			continue
		}

		var existing models.Dosen
		config.DB.Where("n_id_n = ?", d.Nidn).First(&existing)

		if existing.ID == 0 {
			// Create Account if not exists
			email := strings.ToLower(fmt.Sprintf("%s@dosen.bku.ac.id", d.Nidn))
			var user models.User
			config.DB.Where("email = ?", email).First(&user)

			if user.ID == 0 {
				defaultPassword := os.Getenv("DEFAULT_DOSEN_PASSWORD")
				if defaultPassword == "" {
					defaultPassword = "dosen123"
				}
				hash, _ := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
				user = models.User{
					Email: email, Password: string(hash), Role: "dosen", FakultasID: &fid,
				}
				config.DB.Create(&user)
			}

			// Find appropriate Prodi ID
			// Ensure Prodi ID exists or create it
			cleanProdiName := strings.TrimSpace(d.NamaProdi)
			pid := prodiMap[prodiMapKey(cleanProdiName, "")]
			if pid == 0 {
				var p models.ProgramStudi
				if err := config.DB.Where("LOWER(nama) = LOWER(?)", cleanProdiName).First(&p).Error; err != nil {
					// Auto-create missing prodi
					p = models.ProgramStudi{Nama: cleanProdiName, FakultasID: fid, Kode: "SYNC-" + d.Nidn[:3]}
					config.DB.Create(&p)
				}
				pid = p.ID
			}

			newDosen := models.Dosen{
				Nama: d.Nama, NIDN: d.Nidn, PenggunaID: user.ID, FakultasID: fid, ProgramStudiID: pid,
			}
			config.DB.Create(&newDosen)
		}
	}

	// 3. Sync Mahasiswa (Global Check via NIM)
	for _, m := range mhs {
		if m.Nim == "" {
			continue
		}

		statusAkun, semester := parseAcademicSnapshot(m.StatusSaatIni, m.TanggalMasuk, "")
		if m.StatusAkun != "" {
			statusAkun = m.StatusAkun
		}
		if m.SemesterSaatIni > 0 {
			semester = m.SemesterSaatIni
		}

		var existing models.Mahasiswa
		config.DB.Where("nim = ?", m.Nim).First(&existing)

		cleanProdiName := strings.TrimSpace(m.NamaProdi)
		pid := prodiMap[prodiMapKey(cleanProdiName, m.Jenjang)]
		if pid == 0 {
			pid = prodiMap[prodiMapKey(cleanProdiName, "")]
		}
		targetFid := fid
		if pid == 0 {
			resolvedPID, resolvedFID := resolveOrCreateProgramStudi(cleanProdiName, m.Jenjang, fid, m.Nim)
			pid = resolvedPID
			if resolvedFID != 0 {
				targetFid = resolvedFID
			}
		} else if targetFid == 0 {
			var p models.ProgramStudi
			if err := config.DB.Select("id, fakultas_id").First(&p, pid).Error; err == nil {
				targetFid = p.FakultasID
			}
		}

		if targetFid == 0 && existing.ID != 0 {
			targetFid = existing.FakultasID
		}
		if pid == 0 && existing.ID != 0 {
			pid = existing.ProgramStudiID
		}

		if existing.ID == 0 {
			email := strings.ToLower(fmt.Sprintf("%s@student.bku.ac.id", m.Nim))
			user := ensureStudentUser(email, targetFid)
			if user.ID == 0 || pid == 0 || targetFid == 0 {
				continue
			}

			newMhs := models.Mahasiswa{
				Nama: m.Nama, NIM: m.Nim, PenggunaID: user.ID, FakultasID: targetFid,
				ProgramStudiID: pid, SemesterSekarang: semester, StatusAkun: statusAkun,
				StatusAkademik: m.StatusSaatIni,
			}
			if tahunMasuk := deriveEnrollmentYear(m.TanggalMasuk); tahunMasuk > 0 {
				newMhs.TahunMasuk = tahunMasuk
			}
			config.DB.Create(&newMhs)
		} else {
			updates := map[string]interface{}{
				"nama":              m.Nama,
				"semester_sekarang": semester,
				"status_akun":       statusAkun,
				"status_akademik":   m.StatusSaatIni,
			}
			if pid != 0 {
				updates["program_studi_id"] = pid
			}
			if targetFid != 0 {
				updates["fakultas_id"] = targetFid
			}
			if tahunMasuk := deriveEnrollmentYear(m.TanggalMasuk); tahunMasuk > 0 {
				updates["tahun_masuk"] = tahunMasuk
			}
			config.DB.Model(&existing).Updates(updates)
		}
	}

	fmt.Printf("✅ [PDDIKTI-SYNC] Sync finished for Faculty ID %d\n", fid)
}

func ensureStudentUser(email string, fid uint) models.User {
	var user models.User
	if err := config.DB.Where("email = ?", email).First(&user).Error; err == nil {
		return user
	}

	defaultPassword := os.Getenv("DEFAULT_STUDENT_PASSWORD")
	if defaultPassword == "" {
		defaultPassword = "student123"
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(defaultPassword), bcrypt.DefaultCost)
	newUser := models.User{Email: email, Password: string(hash), Role: "student"}
	if fid != 0 {
		newUser.FakultasID = &fid
	}

	if err := config.DB.Create(&newUser).Error; err != nil {
		if err2 := config.DB.Where("email = ?", email).First(&user).Error; err2 == nil {
			return user
		}
		return models.User{}
	}

	return newUser
}

func resolveOrCreateProgramStudi(prodiName, jenjang string, fallbackFid uint, key string) (uint, uint) {
	prodiName = strings.TrimSpace(prodiName)
	jenjang = strings.TrimSpace(jenjang)
	if prodiName == "" {
		return 0, 0
	}

	var existing models.ProgramStudi
	if jenjang != "" {
		if err := config.DB.Where("LOWER(nama) = LOWER(?) AND LOWER(jenjang) = LOWER(?)", prodiName, jenjang).Order("id asc").First(&existing).Error; err == nil {
			return existing.ID, existing.FakultasID
		}
	}
	if err := config.DB.Where("LOWER(nama) = LOWER(?)", prodiName).Order("id asc").First(&existing).Error; err == nil {
		return existing.ID, existing.FakultasID
	}

	targetFid := fallbackFid
	if targetFid == 0 {
		targetFid = inferFacultyIDByProdiName(prodiName)
	}
	if targetFid == 0 {
		return 0, 0
	}

	kode := "SYNC"
	if len(key) >= 3 {
		kode = "SYNC-" + key[:3]
	}

	created := models.ProgramStudi{Nama: prodiName, Jenjang: jenjang, FakultasID: targetFid, Kode: kode}
	if err := config.DB.Create(&created).Error; err != nil {
		if jenjang != "" {
			if err2 := config.DB.Where("LOWER(nama) = LOWER(?) AND LOWER(jenjang) = LOWER(?)", prodiName, jenjang).Order("id asc").First(&existing).Error; err2 == nil {
				return existing.ID, existing.FakultasID
			}
		}
		if err2 := config.DB.Where("LOWER(nama) = LOWER(?)", prodiName).Order("id asc").First(&existing).Error; err2 == nil {
			return existing.ID, existing.FakultasID
		}
		return 0, 0
	}

	return created.ID, created.FakultasID
}

func prodiMapKey(nama, jenjang string) string {
	return strings.ToLower(strings.TrimSpace(nama)) + "|" + strings.ToLower(strings.TrimSpace(jenjang))
}

func inferFacultyIDByProdiName(prodiName string) uint {
	prodiLower := strings.ToLower(prodiName)
	var faculties []models.Fakultas
	if err := config.DB.Select("id, nama").Find(&faculties).Error; err != nil {
		return 0
	}

	for _, f := range faculties {
		fname := strings.ToLower(f.Nama)
		switch {
		case strings.Contains(fname, "farmasi"):
			if strings.Contains(prodiLower, "farmasi") || strings.Contains(prodiLower, "apoteker") {
				return f.ID
			}
		case strings.Contains(fname, "keperawatan"):
			if strings.Contains(prodiLower, "keperawatan") || strings.Contains(prodiLower, "ners") {
				return f.ID
			}
		case strings.Contains(fname, "kesehatan"):
			if strings.Contains(prodiLower, "kebidanan") || strings.Contains(prodiLower, "bidan") || strings.Contains(prodiLower, "masyarakat") || strings.Contains(prodiLower, "anestesi") || strings.Contains(prodiLower, "gizi") {
				return f.ID
			}
		case strings.Contains(fname, "sosial"):
			if strings.Contains(prodiLower, "komunikasi") || strings.Contains(prodiLower, "psikologi") || strings.Contains(prodiLower, "sosial") {
				return f.ID
			}
		}
	}

	for _, f := range faculties {
		if strings.Contains(prodiLower, strings.ToLower(f.Nama)) {
			return f.ID
		}
	}

	return 0
}

func isBhaktiKencanaPT(namaPT string) bool {
	name := strings.ToLower(strings.TrimSpace(namaPT))
	if name == "" {
		return false
	}
	return strings.Contains(name, "bhakti kencana")
}

func enrichMahasiswaDetails(mhs *[]PddiktiMhs) {
	if mhs == nil || len(*mhs) == 0 {
		return
	}

	const workerLimit = 8

	client := &http.Client{Timeout: 20 * time.Second}
	sem := make(chan struct{}, workerLimit)
	var wg sync.WaitGroup

	for i := range *mhs {
		if (*mhs)[i].ID == "" {
			continue
		}

		wg.Add(1)
		sem <- struct{}{}

		go func(idx int) {
			defer wg.Done()
			defer func() { <-sem }()

			detail, err := fetchMahasiswaDetail(client, (*mhs)[idx].ID)
			if err != nil {
				return
			}

			statusAkun, semester := parseAcademicSnapshot(detail.StatusSaatIni, detail.TanggalMasuk, detail.Jenjang)
			(*mhs)[idx].StatusSaatIni = detail.StatusSaatIni
			(*mhs)[idx].TanggalMasuk = detail.TanggalMasuk
			(*mhs)[idx].Jenjang = detail.Jenjang
			(*mhs)[idx].StatusAkun = statusAkun
			(*mhs)[idx].SemesterSaatIni = semester
		}(i)
	}

	wg.Wait()
}

func fetchMahasiswaDetail(client *http.Client, id string) (PddiktiMhsDetail, error) {
	if id == "" {
		return PddiktiMhsDetail{}, fmt.Errorf("empty id")
	}

	req, err := http.NewRequest("GET", "https://api-pddikti.kemdiktisaintek.go.id/detail/mhs/"+url.PathEscape(id), nil)
	if err != nil {
		return PddiktiMhsDetail{}, err
	}
	req.Header.Set("Origin", "https://pddikti.kemdiktisaintek.go.id")
	req.Header.Set("Referer", "https://pddikti.kemdiktisaintek.go.id/")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json, text/plain, */*")

	resp, err := client.Do(req)
	if err != nil {
		return PddiktiMhsDetail{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return PddiktiMhsDetail{}, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return PddiktiMhsDetail{}, err
	}

	var detail PddiktiMhsDetail
	if err := json.Unmarshal(body, &detail); err != nil {
		return PddiktiMhsDetail{}, err
	}

	return detail, nil
}

func parseAcademicSnapshot(statusSaatIni, tanggalMasuk, jenjang string) (string, int) {
	cleanStatus := strings.TrimSpace(statusSaatIni)
	lower := strings.ToLower(cleanStatus)

	statusAkun := "Aktif"
	switch {
	case strings.Contains(lower, "lulus"):
		statusAkun = "Lulus"
	case strings.Contains(lower, "cuti"):
		statusAkun = "Cuti"
	case strings.Contains(lower, "non-aktif"), strings.Contains(lower, "mengundurkan"), strings.Contains(lower, "drop out"), strings.Contains(lower, "keluar"):
		statusAkun = "Non-Aktif"
	case cleanStatus == "":
		statusAkun = "Aktif"
	default:
		statusAkun = strings.TrimSpace(strings.Split(cleanStatus, "-")[0])
	}

	semester := 1
	enrollYear := deriveEnrollmentYear(tanggalMasuk)

	re := regexp.MustCompile(`(?i)(\d{4})\s*/\s*(\d{4})\s*(ganjil|genap)`)
	matches := re.FindStringSubmatch(cleanStatus)
	if len(matches) == 4 && enrollYear > 0 {
		yearStart, _ := strconv.Atoi(matches[1])
		termIndex := 1
		if strings.EqualFold(matches[3], "genap") {
			termIndex = 2
		}
		calc := ((yearStart - enrollYear) * 2) + termIndex
		if calc > 0 {
			semester = calc
		}
	}

	if strings.EqualFold(statusAkun, "Lulus") {
		semester = 0
	}

	if semester < 1 && !strings.EqualFold(statusAkun, "Lulus") {
		semester = 1
	}

	return statusAkun, semester
}

func deriveEnrollmentYear(tanggalMasuk string) int {
	tanggalMasuk = strings.TrimSpace(tanggalMasuk)
	if tanggalMasuk == "" {
		return 0
	}
	t, err := time.Parse("2006-01-02", tanggalMasuk)
	if err != nil {
		return 0
	}
	return t.Year()
}
