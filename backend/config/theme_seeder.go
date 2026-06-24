package config

import (
	"fmt"
	"log"
	"math"
	"siakad-backend/models"
	"strings"

	"gorm.io/gorm"
)

func SeedThemeSettings(db *gorm.DB) {
	var count int64
	db.Model(&models.ThemeSettings{}).Count(&count)

	if count == 0 {
		log.Println("[Theme Seeder] Menyemai pengaturan tema default...")
		theme := models.ThemeSettings{
			// === PORTAL COLORS (Light theme untuk portal pages) ===
			PortalColorPrimary:     "#0D2B55",
			PortalColorSecondary:   "#C89B3C",
			PortalColorAccent:      "#E8B84B",
			PortalColorBackground:  "#F9F6F0",
			PortalColorSurface:     "#FFFFFF",
			PortalColorTextPrimary: "#1B1C1C",
			PortalColorTextMuted:   "#64748B",
			PortalColorH1:          "#0D2B55",
			PortalColorH2:          "#0D2B55",
			PortalColorH3:          "#1E3A5F",
			PortalColorH4:          "#475569",

			// === LANDING COLORS (Dark theme untuk landing pages) ===
			LandingColorPrimary:     "#0D2B55",
			LandingColorSecondary:   "#C89B3C",
			LandingColorAccent:      "#E8B84B",
			LandingColorBackground:  "#0D2B55",
			LandingColorSurface:     "#1B3A5C",
			LandingColorTextPrimary: "#FFFFFF",
			LandingColorTextMuted:   "#E2E8F0",
			LandingColorH1:          "#FFFFFF",
			LandingColorH2:          "#FFFFFF",
			LandingColorH3:          "#E2E8F0",
			LandingColorH4:          "#94A3B8",

			// === LEGACY (backward compatibility) ===
			ColorPrimary:     "#0D2B55",
			ColorSecondary:   "#C89B3C",
			ColorAccent:      "#E8B84B",
			ColorBackground:  "#F9F6F0",
			ColorSurface:     "#FFFFFF",
			ColorTextPrimary: "#1B1C1C",
			ColorTextMuted:   "#64748B",
			ColorH1:          "#0D2B55",
			ColorH2:          "#0D2B55",
			ColorH3:          "#1E3A5F",
			ColorH4:          "#475569",

			// === FONTS ===
			FontHeadline: "Plus Jakarta Sans",
			FontBody:     "Inter",

			// === BRANDING ===
			SiteName: "Universitas Bhakti Kencana",

			// === SIDEBAR (Independent) ===
			SidebarBgColor:        "#0D2B55",
			SidebarTextColor:      "#E2E8F0",
			SidebarTextMutedColor: "#94A3B8",

			// === BUTTON ===
			ButtonRadius: "0.75rem",

			// === STATE COLORS ===
			ColorSuccess: "#16a34a",
			ColorWarning: "#d97706",
			ColorError:   "#dc2626",
			ColorInfo:    "#2563eb",

			// === BORDER ===
			ColorBorder:      "#E2E8F0",
			ColorBorderMuted: "#F1F5F9",

			// === MOBILE-SPECIFIC COLORS ===
			MobileColorPrimary:            "#002068",
			MobileColorPrimaryContainer:   "#003399",
			MobileColorSecondary:          "#745B00",
			MobileColorSecondaryContainer: "#FDD355",
			MobileColorBackground:         "#FBF9F8",
			MobileColorSurface:            "#FFFFFF",
			MobileColorOnSurface:          "#1B1C1C",
			MobileColorOnSurfaceVariant:   "#444653",
			MobileColorOutline:            "#747684",
			MobileColorOutlineVariant:     "#C4C5D5",

			// === MOBILE GRADIENTS ===
			MobileGradientStart:  "#00164E",
			MobileGradientMiddle: "#002068",
			MobileGradientEnd:    "#003399",

			MobileGradientSecondaryStart:  "#745B00",
			MobileGradientSecondaryMiddle: "#B48A00",
			MobileGradientSecondaryEnd:    "#FDD355",
			// === MAINTENANCE MODE ===
			MaintenanceMode:    false,
			MaintenanceMessage: "Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.",

			// === THEME VERSION ===
			ThemeVersion: "1",
		}
		if err := db.Create(&theme).Error; err != nil {
			log.Println("[Theme Seeder] Error:", err)
		} else {
			log.Println("[Theme Seeder] Selesai menyemai tema default.")
		}
	} else {
		// Jika database sudah ada tema, mari kita pastikan warna teks dasar dan heading dihitung dengan benar.
		// Hal ini memperbaiki bug sebelumnya di mana warna teks terdeteksi sebagai putih (#FFFFFF) di latar belakang terang.
		var theme models.ThemeSettings
		if err := db.First(&theme).Error; err == nil {
			parseHexLocal := func(s string) int {
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

			getLuminanceLocal := func(hex string) float64 {
				hex = strings.ReplaceAll(hex, "#", "")
				if len(hex) == 3 {
					hex = string([]byte{hex[0], hex[0], hex[1], hex[1], hex[2], hex[2]})
				}
				if len(hex) != 6 {
					return 0.5
				}
				r := float64(parseHexLocal(hex[0:2])) / 255.0
				g := float64(parseHexLocal(hex[2:4])) / 255.0
				b := float64(parseHexLocal(hex[4:6])) / 255.0

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

			autoTextColorLocal := func(bgColor string) string {
				if getLuminanceLocal(bgColor) < 0.179 {
					return "#FFFFFF"
				}
				return "#1B1C1C"
			}

			autoMutedColorLocal := func(textColor string) string {
				if textColor == "#FFFFFF" {
					return "#E2E8F0"
				}
				return "#64748B"
			}

			correctText := autoTextColorLocal(theme.ColorBackground)
			correctMuted := autoMutedColorLocal(correctText)

			if theme.ColorTextPrimary != correctText || theme.ColorH1 != correctText {
				log.Println("[Theme Seeder] Memperbaiki kontras warna teks yang tidak sinkron di database...")
				theme.ColorTextPrimary = correctText
				theme.ColorTextMuted = correctMuted
				theme.ColorH1 = correctText
				theme.ColorH2 = correctText
				theme.ColorH3 = correctText
				theme.ColorH4 = correctText

				// Sync portal colors
				theme.PortalColorTextPrimary = correctText
				theme.PortalColorTextMuted = correctMuted
				theme.PortalColorH1 = correctText
				theme.PortalColorH2 = correctText
				theme.PortalColorH3 = correctText
				theme.PortalColorH4 = correctText

				db.Save(&theme)
				log.Println("[Theme Seeder] Sukses memperbaiki kontras warna teks.")
			}
		}
	}
}

// AddColumnSidebarMutedColor - Add sidebar_text_muted_color column if not exists
func AddColumnSidebarMutedColor(db *gorm.DB) {
	// Check if column exists
	var count int64
	db.Raw(`
		SELECT COUNT(*) FROM information_schema.columns
		WHERE table_schema = 'public'
		AND table_name = 'theme_settings'
		AND column_name = 'sidebar_text_muted_color'
	`).Scan(&count)

	if count == 0 {
		log.Println("[Theme Migration] Adding sidebar_text_muted_color column...")
		db.Exec(`
			ALTER TABLE public.theme_settings
			ADD COLUMN sidebar_text_muted_color VARCHAR(9) DEFAULT '#94A3B8'
		`)
		log.Println("[Theme Migration] Column added successfully.")
	}
}

// MigrateMobileThemeColumns - Add mobile-specific theme columns if not exists
func MigrateMobileThemeColumns(db *gorm.DB) {
	mobileColumns := []struct {
		name       string
		colType    string
		defaultVal string
	}{
		{"mobile_color_primary", "VARCHAR(9)", "'#002068'"},
		{"mobile_color_primary_container", "VARCHAR(9)", "'#003399'"},
		{"mobile_color_secondary", "VARCHAR(9)", "'#745B00'"},
		{"mobile_color_secondary_container", "VARCHAR(9)", "'#FDD355'"},
		{"mobile_color_background", "VARCHAR(9)", "'#FBF9F8'"},
		{"mobile_color_surface", "VARCHAR(9)", "'#FFFFFF'"},
		{"mobile_color_on_surface", "VARCHAR(9)", "'#1B1C1C'"},
		{"mobile_color_on_surface_variant", "VARCHAR(9)", "'#444653'"},
		{"mobile_color_outline", "VARCHAR(9)", "'#747684'"},
		{"mobile_color_outline_variant", "VARCHAR(9)", "'#C4C5D5'"},
		{"mobile_gradient_start", "VARCHAR(9)", "'#00164E'"},
		{"mobile_gradient_middle", "VARCHAR(9)", "'#002068'"},
		{"mobile_gradient_end", "VARCHAR(9)", "'#003399'"},
		{"mobile_gradient_secondary_start", "VARCHAR(9)", "'#745B00'"},
		{"mobile_gradient_secondary_middle", "VARCHAR(9)", "'#B48A00'"},
		{"mobile_gradient_secondary_end", "VARCHAR(9)", "'#FDD355'"},
		{"mobile_logo_url", "VARCHAR(500)", "''"},
		{"mobile_splash_logo_url", "VARCHAR(500)", "''"},
	}

	for _, col := range mobileColumns {
		var count int64
		db.Raw(`
			SELECT COUNT(*) FROM information_schema.columns
			WHERE table_schema = 'public'
			AND table_name = 'theme_settings'
			AND column_name = ?
		`, col.name).Scan(&count)

		if count == 0 {
			log.Printf("[Theme Migration] Adding column: %s\n", col.name)
			db.Exec(fmt.Sprintf(`
				ALTER TABLE public.theme_settings
				ADD COLUMN %s %s DEFAULT %s
			`, col.name, col.colType, col.defaultVal))
			log.Printf("[Theme Migration] Column %s added successfully.\n", col.name)
		}
	}
}
