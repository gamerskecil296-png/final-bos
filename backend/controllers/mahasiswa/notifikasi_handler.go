package mahasiswa

import (
	"siakad-backend/config"
	"siakad-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
)

// getActualUserID returns the true authenticated user ID without impersonation logic
func getActualUserID(c *fiber.Ctx) (uint, error) {
	v, ok := c.Locals("user_id").(uint)
	if !ok || v == 0 {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "User tidak terautentikasi")
	}
	return v, nil
}

// GetNotifications returns a list of notifications for the current student
func GetNotifications(c *fiber.Ctx) error {
	UserID, err := getActualUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	// Filters
	tipe := c.Query("tipe")
	waktu := c.Query("waktu")   // hari_ini, minggu_ini, bulan_ini
	status := c.Query("status") // unread, read

	query := config.DB.Model(&models.Notifikasi{}).Where("user_id = ? AND created_at <= ?", UserID, time.Now())

	if tipe != "" && tipe != "Semua" {
		query = query.Where("tipe = ?", tipe)
	}

	if status == "unread" {
		query = query.Where("is_read = ?", false)
	} else if status == "read" {
		query = query.Where("is_read = ?", true)
	}

	now := time.Now().UTC()
	switch waktu {
	case "hari_ini":
		startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
		query = query.Where("created_at >= ?", startOfDay)
	case "minggu_ini":
		startOfWeek := now.AddDate(0, 0, -int(now.Weekday()))
		query = query.Where("created_at >= ?", startOfWeek)
	case "bulan_ini":
		startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		query = query.Where("created_at >= ?", startOfMonth)
	}

	var notifs []models.Notifikasi
	err = query.Order("created_at DESC").Find(&notifs).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil notifikasi"})
	}

	return c.JSON(fiber.Map{"success": true, "data": notifs})
}

// GetUnreadCount returns the number of unread notifications
func GetUnreadCount(c *fiber.Ctx) error {
	UserID, err := getActualUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	var count int64
	err = config.DB.Model(&models.Notifikasi{}).
		Where("user_id = ? AND is_read = ? AND created_at <= ?", UserID, false, time.Now()).
		Count(&count).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghitung notifikasi"})
	}

	return c.JSON(fiber.Map{"success": true, "count": count})
}

// MarkAsRead marks a single notification as read
func MarkAsRead(c *fiber.Ctx) error {
	UserID, err := getActualUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}
	id := c.Params("id")

	err = config.DB.Model(&models.Notifikasi{}).
		Where("id = ? AND user_id = ?", id, UserID).
		Update("is_read", true).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui notifikasi"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Notifikasi ditandai telah dibaca"})
}

// MarkAllAsRead marks all notifications as read for the current user
func MarkAllAsRead(c *fiber.Ctx) error {
	UserID, err := getActualUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	err = config.DB.Model(&models.Notifikasi{}).
		Where("user_id = ? AND is_read = ?", UserID, false).
		Update("is_read", true).Error

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui semua notifikasi"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Semua notifikasi ditandai telah dibaca"})
}

// DeleteNotification deletes a single notification
func DeleteNotification(c *fiber.Ctx) error {
	UserID, err := getActualUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}
	id := c.Params("id")

	err = config.DB.Where("id = ? AND user_id = ?", id, UserID).Delete(&models.Notifikasi{}).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus notifikasi"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Notifikasi berhasil dihapus"})
}

// DeleteBulk deletes multiple notifications
func DeleteBulk(c *fiber.Ctx) error {
	UserID, err := getActualUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	var req struct {
		IDs []string `json:"ids"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Data tidak valid"})
	}

	err = config.DB.Where("id IN ? AND user_id = ?", req.IDs, UserID).Delete(&models.Notifikasi{}).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus beberapa notifikasi"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Notifikasi terpilih berhasil dihapus"})
}

// DeleteRead deletes all read notifications
func DeleteRead(c *fiber.Ctx) error {
	UserID, err := getActualUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	err = config.DB.Where("user_id = ? AND is_read = ?", UserID, true).Delete(&models.Notifikasi{}).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus notifikasi"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Semua notifikasi yang sudah dibaca berhasil dihapus"})
}
