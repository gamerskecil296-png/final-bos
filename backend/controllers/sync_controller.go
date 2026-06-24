package controllers

import (
	"fmt"
	"net/http"
	"time"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/services"

	"github.com/gofiber/fiber/v2"
)

func SyncSevimaMahasiswa(c *fiber.Ctx) error {
	// Jalankan sinkronisasi di background (goroutine)
	// Karena data mahasiswa ribuan, ini mencegah timeout pada HTTP request.
	go func() {
		svc := services.NewSevimaSyncService()
		_, err := svc.SyncMahasiswa()
		if err != nil {
			fmt.Printf("[Background Sync] Error syncing mahasiswa: %v\n", err)
		} else {
			fmt.Println("[Background Sync] Sinkronisasi Mahasiswa Selesai!")
		}
	}()

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Sinkronisasi Mahasiswa sedang berjalan di latar belakang. Proses ini butuh waktu beberapa menit.",
	})
}

// GetSyncProgress mengembalikan status progres sinkronisasi SEVIMA saat ini
func GetSyncProgress(c *fiber.Ctx) error {
	services.GlobalSyncProgress.Lock()
	defer services.GlobalSyncProgress.Unlock()

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"is_running":   services.GlobalSyncProgress.IsRunning,
			"current_page": services.GlobalSyncProgress.CurrentPage,
			"total_synced": services.GlobalSyncProgress.TotalSynced,
			"total_data":   services.GlobalSyncProgress.TotalData,
			"status_text":  services.GlobalSyncProgress.StatusText,
			"phase":        services.GlobalSyncProgress.Phase,
			"ipk_total":    services.GlobalSyncProgress.IpkTotal,
			"ipk_synced":   services.GlobalSyncProgress.IpkSynced,
			"ipk_failed":   services.GlobalSyncProgress.IpkFailed,
		},
	})
}

func GetSevimaAnomali(c *fiber.Ctx) error {
	var anomalies []models.SevimaAnomali
	if err := config.DB.Find(&anomalies).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   anomalies,
	})
}

func DeleteSevimaAnomali(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Where("id_sevima = ?", id).Delete(&models.SevimaAnomali{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus data anomali"})
	}
	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Data anomali berhasil dihapus",
	})
}

func SyncSingleSevimaAnomali(c *fiber.Ctx) error {
	idSevima := c.Params("id")
	svc := services.NewSevimaSyncService()
	
	// Coba panggil method sync single yang akan kita buat
	err := svc.SyncMahasiswaById(idSevima)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Mahasiswa berhasil ditarik dan diperbarui",
	})
}

func GetSevimaPMBAnomali(c *fiber.Ctx) error {
	var anomalies []models.SevimaPMBAnomali
	if err := config.DB.Find(&anomalies).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   anomalies,
	})
}

func DeleteSevimaPMBAnomali(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Where("id_sevima = ?", id).Delete(&models.SevimaPMBAnomali{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Gagal menghapus data anomali PMB"})
	}
	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Data anomali PMB berhasil dihapus",
	})
}

func SyncSingleSevimaPMBAnomali(c *fiber.Ctx) error {
	idSevima := c.Params("id")
	svc := services.NewSevimaSyncService()
	
	// Single sync for PMB can simply trigger full sync or a targeted sync.
	// Since PMB doesn't have a specific `SyncPMBById` yet, we can just return a message
	// Or we can add `SyncPMBById` if needed. Let's add a placeholder for now.
	err := svc.SyncPMBById(idSevima)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Data PMB berhasil ditarik dan diperbarui",
	})
}

// CancelSyncSevima membatalkan proses sinkronisasi yang sedang berjalan
func CancelSyncSevima(c *fiber.Ctx) error {
	services.GlobalSyncProgress.Lock()
	if services.GlobalSyncProgress.IsRunning {
		services.GlobalSyncProgress.IsCancelled = true
		services.GlobalSyncProgress.StatusText = "Membatalkan sinkronisasi..."
	}
	services.GlobalSyncProgress.Unlock()
	return c.JSON(fiber.Map{"status": "success", "message": "Permintaan pembatalan dikirim."})
}

func SyncSevimaFakultas(c *fiber.Ctx) error {
	svc := services.NewSevimaSyncService()
	total, err := svc.SyncFakultas()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Sinkronisasi Fakultas berhasil",
		"total":   total,
	})
}

func SyncSevimaProgramStudi(c *fiber.Ctx) error {
	svc := services.NewSevimaSyncService()
	total, err := svc.SyncProgramStudi()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Sinkronisasi Program Studi berhasil",
		"total":   total,
	})
}

func SyncSevimaPeriode(c *fiber.Ctx) error {
	svc := services.NewSevimaSyncService()
	total, err := svc.SyncPeriode()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Berhasil menyinkronisasi %d periode akademik dari SEVIMA", total),
		"total":   total,
	})
}

func SyncSevimaPMB(c *fiber.Ctx) error {
	svc := services.NewSevimaSyncService()
	
	go func() {
		total, err := svc.SyncPMB()
		if err != nil {
			fmt.Printf("[Sync PMB] Error: %v\n", err)
		} else {
			fmt.Printf("[Sync PMB] Success! %d records synced.\n", total)
		}
	}()

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Sinkronisasi PMB sedang berjalan di latar belakang. Proses ini butuh waktu beberapa menit. Silakan muat ulang halaman nanti.",
	})
}

func SyncSevimaDosen(c *fiber.Ctx) error {
	svc := services.NewSevimaSyncService()
	total, err := svc.SyncDosen()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Berhasil menyinkronisasi %d data dosen dari SEVIMA", total),
		"total":   total,
	})
}

// SyncKencanaPMB handles pulling PMB data that has NIM into Kencana and Mahasiswa
func SyncKencanaPMB(c *fiber.Ctx) error {
	svc := services.NewSevimaSyncService()

	total, err := svc.SyncPMBToKencana()
	if err != nil {
		fmt.Printf("[Sync Kencana PMB] Error: %v\n", err)
		return c.JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal menyinkronisasi data maba: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Sinkronisasi selesai! %d data maba berhasil diproses secara realtime.", total),
		"total":   total,
	})
}

// CheckSevimaHealth pings SEVIMA to check if it is online
func CheckSevimaHealth(c *fiber.Ctx) error {
	svc := services.NewSevimaSyncService()
	url := fmt.Sprintf("%s/mahasiswa?page=1&limit=1", svc.BaseURL)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return c.JSON(fiber.Map{"status": "offline"})
	}

	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	req.Header.Add("X-App-Key", svc.AppKey)
	req.Header.Add("X-Secret-Key", svc.SecretKey)

	// Short timeout for health check
	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return c.JSON(fiber.Map{"status": "offline"})
	}
	defer res.Body.Close()

	if res.StatusCode >= 500 {
		return c.JSON(fiber.Map{"status": "offline"})
	}

	return c.JSON(fiber.Map{"status": "online"})
}

// SyncIPKFromSevima triggers a manual IPK sync from Sevima transkrip for all students
func SyncIPKFromSevima(c *fiber.Ctx) error {
	go func() {
		synced, failed, err := services.RunIPKSyncNow()
		if err != nil {
			fmt.Printf("[Manual IPK Sync] Error: %v\n", err)
		} else {
			fmt.Printf("[Manual IPK Sync] Done! Synced: %d, Failed: %d\n", synced, failed)
		}
	}()

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Sinkronisasi IPK dari Sevima sedang berjalan di latar belakang. Proses ini membutuhkan waktu sekitar 3-5 menit untuk 16.000+ mahasiswa.",
	})
}
