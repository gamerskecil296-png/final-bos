package models

type ThemeSettings struct {
	BaseModel

	// === PORTAL COLORS (untuk halaman portal: /admin, /student, dll) ===
	PortalColorPrimary     string `gorm:"size:9;default:'#0D2B55'" json:"portal_color_primary"`
	PortalColorSecondary   string `gorm:"size:9;default:'#C89B3C'" json:"portal_color_secondary"`
	PortalColorAccent      string `gorm:"size:9;default:'#E8B84B'" json:"portal_color_accent"`
	PortalColorBackground  string `gorm:"size:9;default:'#F9F6F0'" json:"portal_color_background"`
	PortalColorSurface     string `gorm:"size:9;default:'#FFFFFF'" json:"portal_color_surface"`
	PortalColorTextPrimary string `gorm:"size:9;default:'#1B1C1C'" json:"portal_color_text_primary"`
	PortalColorTextMuted   string `gorm:"size:9;default:'#64748B'" json:"portal_color_text_muted"`
	PortalColorH1          string `gorm:"size:9;default:'#0D2B55'" json:"portal_color_h1"`
	PortalColorH2          string `gorm:"size:9;default:'#0D2B55'" json:"portal_color_h2"`
	PortalColorH3          string `gorm:"size:9;default:'#1E3A5F'" json:"portal_color_h3"`
	PortalColorH4          string `gorm:"size:9;default:'#475569'" json:"portal_color_h4"`

	// === LANDING COLORS (untuk halaman landing: /, /about, /services) ===
	LandingColorPrimary     string `gorm:"size:9;default:'#0D2B55'" json:"landing_color_primary"`
	LandingColorSecondary   string `gorm:"size:9;default:'#C89B3C'" json:"landing_color_secondary"`
	LandingColorAccent      string `gorm:"size:9;default:'#E8B84B'" json:"landing_color_accent"`
	LandingColorBackground  string `gorm:"size:9;default:'#0D2B55'" json:"landing_color_background"`
	LandingColorSurface     string `gorm:"size:9;default:'#1B3A5C'" json:"landing_color_surface"`
	LandingColorTextPrimary string `gorm:"size:9;default:'#FFFFFF'" json:"landing_color_text_primary"`
	LandingColorTextMuted   string `gorm:"size:9;default:'#E2E8F0'" json:"landing_color_text_muted"`
	LandingColorH1          string `gorm:"size:9;default:'#FFFFFF'" json:"landing_color_h1"`
	LandingColorH2          string `gorm:"size:9;default:'#FFFFFF'" json:"landing_color_h2"`
	LandingColorH3          string `gorm:"size:9;default:'#E2E8F0'" json:"landing_color_h3"`
	LandingColorH4          string `gorm:"size:9;default:'#94A3B8'" json:"landing_color_h4"`

	// === LEGACY COLORS (untuk backward compatibility) ===
	ColorPrimary     string `gorm:"size:9;default:'#0D2B55'" json:"color_primary"`
	ColorSecondary   string `gorm:"size:9;default:'#C89B3C'" json:"color_secondary"`
	ColorAccent      string `gorm:"size:9;default:'#E8B84B'" json:"color_accent"`
	ColorBackground  string `gorm:"size:9;default:'#F9F6F0'" json:"color_background"`
	ColorSurface     string `gorm:"size:9;default:'#FFFFFF'" json:"color_surface"`
	ColorTextPrimary string `gorm:"size:9;default:'#1B1C1C'" json:"color_text_primary"`
	ColorTextMuted   string `gorm:"size:9;default:'#64748B'" json:"color_text_muted"`
	ColorH1          string `gorm:"size:9;default:'#0D2B55'" json:"color_h1"`
	ColorH2          string `gorm:"size:9;default:'#0D2B55'" json:"color_h2"`
	ColorH3          string `gorm:"size:9;default:'#1E3A5F'" json:"color_h3"`
	ColorH4          string `gorm:"size:9;default:'#475569'" json:"color_h4"`

	// === TIPOGRAFI ===
	FontHeadline string `gorm:"size:100;default:'Plus Jakarta Sans'" json:"font_headline"`
	FontBody     string `gorm:"size:100;default:'Inter'" json:"font_body"`

	// === BRANDING / LOGO ===
	LogoURL    string `gorm:"size:500" json:"logo_url"`
	FaviconURL string `gorm:"size:500" json:"favicon_url"`
	SiteName   string `gorm:"size:200;default:'Universitas Bhakti Kencana'" json:"site_name"`

	// === KOMPONEN UI - SIDEBAR (Independent from Portal/Landing) ===
	SidebarBgColor        string `gorm:"size:9;default:'#0D2B55'" json:"sidebar_bg_color"`
	SidebarTextColor      string `gorm:"size:9;default:'#E2E8F0'" json:"sidebar_text_color"`
	SidebarTextMutedColor string `gorm:"size:9;default:'#94A3B8'" json:"sidebar_text_muted_color"`
	ButtonRadius          string `gorm:"size:20;default:'0.75rem'" json:"button_radius"`

	// === WARNA STATE (Semantic) ===
	ColorSuccess string `gorm:"size:9;default:'#16a34a'" json:"color_success"`
	ColorWarning string `gorm:"size:9;default:'#d97706'" json:"color_warning"`
	ColorError   string `gorm:"size:9;default:'#dc2626'" json:"color_error"`
	ColorInfo    string `gorm:"size:9;default:'#2563eb'" json:"color_info"`

	// === MAINTENANCE MODE ===
	MaintenanceMode    bool   `gorm:"default:false" json:"maintenance_mode"`
	MaintenanceMessage string `gorm:"size:500;default:'Sistem sedang dalam pemeliharaan. Silakan coba lagi nanti.'" json:"maintenance_message"`

	// === WARNA BORDER ===
	ColorBorder      string `gorm:"size:9;default:'#E2E8F0'" json:"color_border"`
	ColorBorderMuted string `gorm:"size:9;default:'#F1F5F9'" json:"color_border_muted"`

	// === MOBILE-SPECIFIC COLORS ===
	MobileColorPrimary            string `gorm:"size:9;default:'#002068'" json:"mobile_color_primary"`
	MobileColorPrimaryContainer   string `gorm:"size:9;default:'#003399'" json:"mobile_color_primary_container"`
	MobileColorSecondary          string `gorm:"size:9;default:'#745B00'" json:"mobile_color_secondary"`
	MobileColorSecondaryContainer string `gorm:"size:9;default:'#FDD355'" json:"mobile_color_secondary_container"`
	MobileColorBackground         string `gorm:"size:9;default:'#FBF9F8'" json:"mobile_color_background"`
	MobileColorSurface            string `gorm:"size:9;default:'#FFFFFF'" json:"mobile_color_surface"`
	MobileColorOnSurface          string `gorm:"size:9;default:'#1B1C1C'" json:"mobile_color_on_surface"`
	MobileColorOnSurfaceVariant   string `gorm:"size:9;default:'#444653'" json:"mobile_color_on_surface_variant"`
	MobileColorOutline            string `gorm:"size:9;default:'#747684'" json:"mobile_color_outline"`
	MobileColorOutlineVariant     string `gorm:"size:9;default:'#C4C5D5'" json:"mobile_color_outline_variant"`

	// Mobile Gradients (untuk AppBar & Header)
	MobileGradientStart  string `gorm:"size:9;default:'#00164E'" json:"mobile_gradient_start"`
	MobileGradientMiddle string `gorm:"size:9;default:'#002068'" json:"mobile_gradient_middle"`
	MobileGradientEnd    string `gorm:"size:9;default:'#003399'" json:"mobile_gradient_end"`

	// Mobile Secondary Gradient (untuk variant secondary)
	MobileGradientSecondaryStart  string `gorm:"size:9;default:'#745B00'" json:"mobile_gradient_secondary_start"`
	MobileGradientSecondaryMiddle string `gorm:"size:9;default:'#B48A00'" json:"mobile_gradient_secondary_middle"`
	MobileGradientSecondaryEnd    string `gorm:"size:9;default:'#FDD355'" json:"mobile_gradient_secondary_end"`

	// Mobile Branding
	MobileLogoURL       string `gorm:"size:500" json:"mobile_logo_url"`
	MobileSplashLogoURL string `gorm:"size:500" json:"mobile_splash_logo_url"`

	// Theme Version (untuk sync mobile)
	ThemeVersion string `gorm:"size:50;default:'1'" json:"theme_version"`

	// Meta
	UpdatedByID *uint `gorm:"index" json:"updated_by_id"`
}

func (ThemeSettings) TableName() string {
	return "public.theme_settings"
}
