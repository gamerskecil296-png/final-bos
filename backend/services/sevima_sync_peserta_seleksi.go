package services

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
)

type SevimaPesertaSeleksiResponse struct {
	Data []SevimaPesertaSeleksiItem `json:"data"`
}

type SevimaPesertaSeleksiItem struct {
	ID         string                     `json:"id"`
	Attributes SevimaPesertaSeleksiAttr `json:"attributes"`
}

type SevimaPesertaSeleksiAttr struct {
	KodePendaftar  string `json:"kode_pendaftar"`
	IsLolosSeleksi string `json:"is_lolos_seleksi"`
}

// SyncPesertaSeleksiPMB syncs the selection status from Sevima
func (s *SevimaSyncService) SyncPesertaSeleksiPMB() (int, error) {
	if s.AppKey == "" || s.SecretKey == "" {
		return 0, fmt.Errorf("SEVIMA_APP_KEY or SEVIMA_SECRET_KEY is empty")
	}

	page := 1
	limit := 100
	totalSynced := 0

	for {
		url := fmt.Sprintf("%s/peserta-seleksi-pmb?page=%d&limit=%d", s.BaseURL, page, limit)
		log.Printf("[SyncPesertaSeleksi] Fetching page %d...", page)

		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return totalSynced, fmt.Errorf("failed to create request: %w", err)
		}
		req.Header.Set("X-App-Key", s.AppKey)
		req.Header.Set("X-Secret-Key", s.SecretKey)
		req.Header.Set("Accept", "application/json")

		resp, err := s.Client.Do(req)
		if err != nil {
			return totalSynced, fmt.Errorf("failed to fetch page %d: %w", page, err)
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode == 429 {
			log.Printf("[SyncPesertaSeleksi] Rate limited, waiting 2s...")
			time.Sleep(2 * time.Second)
			continue
		}

		if resp.StatusCode != 200 {
			return totalSynced, fmt.Errorf("HTTP %d on page %d", resp.StatusCode, page)
		}

		var response SevimaPesertaSeleksiResponse
		if err := json.Unmarshal(body, &response); err != nil {
			return totalSynced, fmt.Errorf("failed to parse page %d: %w", page, err)
		}

		if len(response.Data) == 0 {
			break
		}

		for _, item := range response.Data {
			attr := item.Attributes
			if attr.KodePendaftar != "" && attr.IsLolosSeleksi == "1" {
				res := config.DB.Model(&models.PendaftaranMahasiswaBaru{}).
					Where("nomor_daftar = ?", attr.KodePendaftar).
					Update("status", "Lolos Seleksi")
				if res.RowsAffected > 0 {
					totalSynced++
				}
			}
		}

		if len(response.Data) < limit {
			break
		}
		page++
		time.Sleep(300 * time.Millisecond) // Rate limit protection
	}

	log.Printf("[SyncPesertaSeleksi] COMPLETE! Total status updated: %d", totalSynced)
	return totalSynced, nil
}
