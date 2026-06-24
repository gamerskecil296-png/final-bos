package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ============================================================
// THEME CACHE
// ============================================================
type ThemeCache struct {
	mu         sync.RWMutex
	data       []byte
	lastUpdate time.Time
	ttl        time.Duration
}

var (
	themeCache     *ThemeCache
	themeCacheOnce sync.Once
)

const THEME_CACHE_TTL = 15 * time.Minute

func GetThemeCache() *ThemeCache {
	themeCacheOnce.Do(func() {
		themeCache = &ThemeCache{ttl: THEME_CACHE_TTL}
		go func() {
			if err := themeCache.refresh(); err != nil {
				fmt.Printf("[ThemeCache] Initial load failed: %v\n", err)
			}
		}()
	})
	return themeCache
}

func (tc *ThemeCache) Get() ([]byte, bool) {
	tc.mu.RLock()
	defer tc.mu.RUnlock()
	// Cache aktif hanya jika data sudah di-load SEKALI pada session ini.
	// Tidak pakai TTL untuk menghindari stale data setelah update.
	if tc.data == nil {
		return nil, false
	}
	return tc.data, true
}

func (tc *ThemeCache) GetWithRefresh() ([]byte, error) {
	if tc.data == nil {
		if err := tc.refresh(); err != nil {
			return nil, err
		}
	}
	tc.mu.RLock()
	data := tc.data
	tc.mu.RUnlock()
	return data, nil
}

func (tc *ThemeCache) Invalidate() {
	tc.mu.Lock()
	defer tc.mu.Unlock()
	tc.lastUpdate = time.Time{}
	tc.data = nil
}

func (tc *ThemeCache) refresh() error {
	tc.mu.Lock()
	defer tc.mu.Unlock()

	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			config.SeedThemeSettings(config.DB)
			if err = config.DB.First(&theme).Error; err != nil {
				return fmt.Errorf("failed to fetch theme after seeding: %w", err)
			}
		} else {
			return fmt.Errorf("failed to fetch theme: %w", err)
		}
	}

	data, err := json.Marshal(map[string]interface{}{"status": "success", "data": theme})
	if err != nil {
		return err
	}

	tc.data = data
	tc.lastUpdate = time.Now()

	return nil
}

// ============================================================
// VALIDATORS
// ============================================================
var hexColorRegex = regexp.MustCompile(`^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$`)

func isValidHex(color string) bool {
	return hexColorRegex.MatchString(strings.TrimSpace(color))
}

func validateColorInput(color string) error {
	color = strings.TrimSpace(color)
	if color == "" {
		return fmt.Errorf("color cannot be empty")
	}
	if !isValidHex(color) {
		return fmt.Errorf("invalid hex color format (expected: #RGB or #RRGGBB)")
	}
	return nil
}

// ============================================================
// FILE UPLOAD VALIDATION
// ============================================================
var allowedLogoTypes = map[string]bool{
	"image/png":  true,
	"image/jpeg": true,
	"image/webp": true,
}

var maxFileSize = int64(2 * 1024 * 1024)

func validateLogoUpload(file *multipart.FileHeader) error {
	if file.Size > maxFileSize {
		return fmt.Errorf("file too large (max: 2MB)")
	}

	contentType := file.Header.Get("Content-Type")
	if !allowedLogoTypes[contentType] {
		return fmt.Errorf("file type not allowed: %s (allowed: PNG, JPEG, WEBP)", contentType)
	}

	src, err := file.Open()
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer src.Close()

	buffer := make([]byte, 512)
	n, err := src.Read(buffer)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to read file: %w", err)
	}

	detectedType := http.DetectContentType(buffer[:n])
	if !allowedLogoTypes[detectedType] {
		return fmt.Errorf("file content does not match allowed types")
	}

	if detectedType == "image/svg+xml" || contentType == "image/svg+xml" {
		return fmt.Errorf("SVG files are blocked for security")
	}

	return nil
}

// ============================================================
// HELPERS - Color Auto-generation
// ============================================================

func getLuminance(hex string) float64 {
	rgb := regexp.MustCompile(`^#?([a-fA-F0-9]{2})([a-fA-F0-9]{2})([a-fA-F0-9]{2})$`).FindStringSubmatch(hex)
	if len(rgb) < 4 {
		return 0.5
	}

	r := float64(parseHex(rgb[1])) / 255
	g := float64(parseHex(rgb[2])) / 255
	b := float64(parseHex(rgb[3])) / 255

	if r <= 0.03928 {
		r = r / 12.92
	} else {
		r = math.Pow((r+0.055)/1.055, 2.4)
	}

	if g <= 0.03928 {
		g = g / 12.92
	} else {
		g = math.Pow((g+0.055)/1.055, 2.4)
	}

	if b <= 0.03928 {
		b = b / 12.92
	} else {
		b = math.Pow((b+0.055)/1.055, 2.4)
	}

	return 0.2126*r + 0.7152*g + 0.0722*b
}

func parseHex(s string) int {
	n := 0
	for _, c := range s {
		n *= 16
		if c >= '0' && c <= '9' {
			n += int(c - '0')
		} else if c >= 'a' && c <= 'f' {
			n += 10 + int(c-'a')
		} else if c >= 'A' && c <= 'F' {
			n += 10 + int(c-'A')
		}
	}
	return n
}

func autoTextColor(bgColor string) string {
	if getLuminance(bgColor) < 0.179 {
		return "#FFFFFF"
	}
	return "#1B1C1C"
}

func autoMutedColor(textColor string) string {
	if textColor == "#FFFFFF" {
		return "#E2E8F0"
	}
	return "#64748B"
}

// ============================================================
// CONTROLLERS
// ============================================================

func GetPublicTheme(c *fiber.Ctx) error {
	cache := GetThemeCache()

	if data, ok := cache.Get(); ok {
		c.Set("Content-Type", "application/json")
		c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
		c.Set("X-Cache-Status", "HIT")
		return c.Send(data)
	}

	data, err := cache.GetWithRefresh()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Failed to load theme configuration",
		})
	}

	c.Set("Content-Type", "application/json")
	c.Set("Cache-Control", "no-cache, no-store, must-revalidate")
	c.Set("X-Cache-Status", "MISS")
	return c.Send(data)
}

func GetTheme(c *fiber.Ctx) error {
	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			config.SeedThemeSettings(config.DB)
			if err = config.DB.First(&theme).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Failed to load theme configuration after seeding: " + err.Error(),
				})
			}
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Failed to load theme configuration: " + err.Error(),
			})
		}
	}

	return c.JSON(fiber.Map{"success": true, "data": theme})
}

func UpdateTheme(c *fiber.Ctx) error {
	var payload map[string]interface{}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "Invalid JSON payload",
		})
	}

	baseColorFields := []string{
		"color_primary", "color_secondary", "color_accent",
		"color_background", "color_surface",
		"sidebar_bg_color", "sidebar_text_color", "sidebar_text_muted_color",
		// === MOBILE-SPECIFIC COLORS ===
		"mobile_color_primary", "mobile_color_primary_container",
		"mobile_color_secondary", "mobile_color_secondary_container",
		"mobile_color_background", "mobile_color_surface",
		"mobile_color_on_surface", "mobile_color_on_surface_variant",
		"mobile_color_outline", "mobile_color_outline_variant",
		// === MOBILE GRADIENTS ===
		"mobile_gradient_start", "mobile_gradient_middle", "mobile_gradient_end",
		"mobile_gradient_secondary_start", "mobile_gradient_secondary_middle", "mobile_gradient_secondary_end",
	}

	for _, field := range baseColorFields {
		if value, ok := payload[field].(string); ok && value != "" {
			if err := validateColorInput(value); err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"success": false,
					"message": fmt.Sprintf("Invalid %s: %v", field, err),
				})
			}
		}
	}

	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			config.SeedThemeSettings(config.DB)
			if err = config.DB.First(&theme).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Theme not found and failed to seed: " + err.Error(),
				})
			}
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Theme not found: " + err.Error(),
			})
		}
	}

	allowedFields := map[string]*string{
		"color_primary":            &theme.ColorPrimary,
		"color_secondary":          &theme.ColorSecondary,
		"color_accent":             &theme.ColorAccent,
		"color_background":         &theme.ColorBackground,
		"color_surface":            &theme.ColorSurface,
		"site_name":                &theme.SiteName,
		"font_headline":            &theme.FontHeadline,
		"font_body":                &theme.FontBody,
		"button_radius":            &theme.ButtonRadius,
		"color_success":            &theme.ColorSuccess,
		"color_warning":            &theme.ColorWarning,
		"color_error":              &theme.ColorError,
		"color_info":               &theme.ColorInfo,
		"color_border":             &theme.ColorBorder,
		"color_border_muted":       &theme.ColorBorderMuted,
		"sidebar_bg_color":         &theme.SidebarBgColor,
		"sidebar_text_color":       &theme.SidebarTextColor,
		"sidebar_text_muted_color": &theme.SidebarTextMutedColor,
		// === MOBILE-SPECIFIC COLORS ===
		"mobile_color_primary":             &theme.MobileColorPrimary,
		"mobile_color_primary_container":   &theme.MobileColorPrimaryContainer,
		"mobile_color_secondary":           &theme.MobileColorSecondary,
		"mobile_color_secondary_container": &theme.MobileColorSecondaryContainer,
		"mobile_color_background":          &theme.MobileColorBackground,
		"mobile_color_surface":             &theme.MobileColorSurface,
		"mobile_color_on_surface":          &theme.MobileColorOnSurface,
		"mobile_color_on_surface_variant":  &theme.MobileColorOnSurfaceVariant,
		"mobile_color_outline":             &theme.MobileColorOutline,
		"mobile_color_outline_variant":     &theme.MobileColorOutlineVariant,
		// === MOBILE GRADIENTS ===
		"mobile_gradient_start":            &theme.MobileGradientStart,
		"mobile_gradient_middle":           &theme.MobileGradientMiddle,
		"mobile_gradient_end":              &theme.MobileGradientEnd,
		"mobile_gradient_secondary_start":  &theme.MobileGradientSecondaryStart,
		"mobile_gradient_secondary_middle": &theme.MobileGradientSecondaryMiddle,
		"mobile_gradient_secondary_end":    &theme.MobileGradientSecondaryEnd,
		// === MOBILE BRANDING ===
		"mobile_logo_url":        &theme.MobileLogoURL,
		"mobile_splash_logo_url": &theme.MobileSplashLogoURL,
	}

	for key, fieldPtr := range allowedFields {
		if value, exists := payload[key]; exists {
			if strValue, ok := value.(string); ok {
				*fieldPtr = strValue
			}
		}
	}

	if logoURL, ok := payload["logo_url"].(string); ok {
		theme.LogoURL = logoURL
	}
	if faviconURL, ok := payload["favicon_url"].(string); ok {
		theme.FaviconURL = faviconURL
	}

	// Auto-generate derived colors based on BACKGROUND (FIX)
	// Text berdasarkan background
	theme.ColorTextPrimary = autoTextColor(theme.ColorBackground)
	theme.ColorTextMuted = autoMutedColor(theme.ColorTextPrimary)

	// Heading berdasarkan background (FIX - bukan primary!)
	theme.ColorH1 = autoTextColor(theme.ColorBackground)
	theme.ColorH2 = autoTextColor(theme.ColorBackground)
	theme.ColorH3 = autoTextColor(theme.ColorBackground)
	theme.ColorH4 = autoTextColor(theme.ColorBackground)

	// Sidebar warna dinamis yang fleksibel sesuai input admin
	// theme.SidebarBgColor = theme.ColorPrimary
	// theme.SidebarTextColor = "#FFFFFF"

	// ============================================================
	// SYNC: Portal & Landing colors mengikuti legacy color_*
	// Ini memastikan landing page berubah saat admin simpan
	// ============================================================

	// PORTAL colors
	theme.PortalColorPrimary = theme.ColorPrimary
	theme.PortalColorSecondary = theme.ColorSecondary
	theme.PortalColorAccent = theme.ColorAccent
	theme.PortalColorBackground = theme.ColorBackground
	theme.PortalColorSurface = theme.ColorSurface
	theme.PortalColorTextPrimary = theme.ColorTextPrimary
	theme.PortalColorTextMuted = theme.ColorTextMuted
	theme.PortalColorH1 = theme.ColorH1
	theme.PortalColorH2 = theme.ColorH2
	theme.PortalColorH3 = theme.ColorH3
	theme.PortalColorH4 = theme.ColorH4

	// LANDING colors — primary dark untuk dark theme landing
	theme.LandingColorPrimary = theme.ColorPrimary
	theme.LandingColorSecondary = theme.ColorSecondary
	theme.LandingColorAccent = theme.ColorAccent
	// Landing bg = primary (dark) untuk dark hero sections
	theme.LandingColorBackground = theme.ColorPrimary
	theme.LandingColorSurface = theme.ColorSurface
	theme.LandingColorTextPrimary = "#FFFFFF"
	theme.LandingColorTextMuted = "#E2E8F0"
	theme.LandingColorH1 = "#FFFFFF"
	theme.LandingColorH2 = "#FFFFFF"
	theme.LandingColorH3 = "#E2E8F0"
	theme.LandingColorH4 = "#94A3B8"

	// Increment theme version untuk trigger mobile refresh
	currentVersion := theme.ThemeVersion
	if currentVersion == "" {
		theme.ThemeVersion = "2"
	} else {
		var v int
		fmt.Sscanf(currentVersion, "%d", &v)
		theme.ThemeVersion = fmt.Sprintf("%d", v+1)
	}

	if err := config.DB.Save(&theme).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to save theme",
		})
	}

	GetThemeCache().Invalidate()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Theme updated successfully",
		"data":    theme,
	})
}

func ResetTheme(c *fiber.Ctx) error {
	defaults := map[string]string{
		"color_primary":            "#0D2B55",
		"color_secondary":          "#C89B3C",
		"color_accent":             "#E8B84B",
		"color_background":         "#F9F6F0",
		"color_surface":            "#FFFFFF",
		"color_text_primary":       "#1B1C1C",
		"color_text_muted":         "#64748B",
		"color_h1":                 "#0D2B55",
		"color_h2":                 "#0D2B55",
		"color_h3":                 "#0D2B55",
		"color_h4":                 "#0D2B55",
		"sidebar_bg_color":         "#0D2B55",
		"sidebar_text_color":       "#FFFFFF",
		"sidebar_text_muted_color": "#94A3B8",
		"font_headline":            "Plus Jakarta Sans",
		"font_body":                "Inter",
		"site_name":                "Universitas Bhakti Kencana",
		"button_radius":            "0.75rem",
		"color_success":            "#16a34a",
		"color_warning":            "#d97706",
		"color_error":              "#dc2626",
		"color_info":               "#2563eb",
		"color_border":             "#E2E8F0",
		"color_border_muted":       "#F1F5F9",
	}

	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			config.SeedThemeSettings(config.DB)
			if err = config.DB.First(&theme).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Theme not found and failed to seed: " + err.Error(),
				})
			}
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Theme not found: " + err.Error(),
			})
		}
	}

	for key, value := range defaults {
		switch key {
		case "color_primary":
			theme.ColorPrimary = value
		case "color_secondary":
			theme.ColorSecondary = value
		case "color_accent":
			theme.ColorAccent = value
		case "color_background":
			theme.ColorBackground = value
		case "color_surface":
			theme.ColorSurface = value
		case "color_text_primary":
			theme.ColorTextPrimary = value
		case "color_text_muted":
			theme.ColorTextMuted = value
		case "color_h1":
			theme.ColorH1 = value
		case "color_h2":
			theme.ColorH2 = value
		case "color_h3":
			theme.ColorH3 = value
		case "color_h4":
			theme.ColorH4 = value
		case "sidebar_bg_color":
			theme.SidebarBgColor = value
		case "sidebar_text_color":
			theme.SidebarTextColor = value
		case "sidebar_text_muted_color":
			theme.SidebarTextMutedColor = value
		case "font_headline":
			theme.FontHeadline = value
		case "font_body":
			theme.FontBody = value
		case "site_name":
			theme.SiteName = value
		case "button_radius":
			theme.ButtonRadius = value
		case "color_success":
			theme.ColorSuccess = value
		case "color_warning":
			theme.ColorWarning = value
		case "color_error":
			theme.ColorError = value
		case "color_info":
			theme.ColorInfo = value
		case "color_border":
			theme.ColorBorder = value
		case "color_border_muted":
			theme.ColorBorderMuted = value
		}
	}

	if err := config.DB.Save(&theme).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to reset theme",
		})
	}

	GetThemeCache().Invalidate()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Theme reset to defaults",
		"data":    theme,
	})
}

func UploadLogo(c *fiber.Ctx) error {
	return handleUpload(c, "LogoURL")
}

func UploadFavicon(c *fiber.Ctx) error {
	return handleUpload(c, "FaviconURL")
}

func handleUpload(c *fiber.Ctx, field string) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": "No file uploaded",
		})
	}

	if err := validateLogoUpload(file); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"success": false,
			"message": err.Error(),
		})
	}

	ext := filepath.Ext(file.Filename)
	if ext == "" {
		ext = ".png"
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	uploadDir := "./uploads/branding"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to create upload directory",
		})
	}

	savePath := filepath.Join(uploadDir, filename)
	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to save file",
		})
	}

	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			config.SeedThemeSettings(config.DB)
			if err = config.DB.First(&theme).Error; err != nil {
				os.Remove(savePath)
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"success": false,
					"message": "Theme not found and failed to seed: " + err.Error(),
				})
			}
		} else {
			os.Remove(savePath)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"success": false,
				"message": "Theme not found: " + err.Error(),
			})
		}
	}

	url := fmt.Sprintf("/uploads/branding/%s", filename)
	if field == "LogoURL" {
		if theme.LogoURL != "" {
			os.Remove("." + theme.LogoURL)
		}
		theme.LogoURL = url
	} else if field == "FaviconURL" {
		if theme.FaviconURL != "" {
			os.Remove("." + theme.FaviconURL)
		}
		theme.FaviconURL = url
	}

	if err := config.DB.Save(&theme).Error; err != nil {
		os.Remove(savePath)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update database",
		})
	}

	GetThemeCache().Invalidate()

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("%s uploaded successfully", field),
		"url":     url,
	})
}
