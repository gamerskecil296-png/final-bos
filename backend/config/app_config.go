package config

import (
	"os"
)

func GetJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "siakad-dev-secret-change-me"
	}
	return []byte(secret)
}

func GetAppPort() string {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8000"
	}
	return port
}

func GetAppHost() string {
	// Kosongkan jika ingin listen di semua interface (0.0.0.0)
	// Atau isi dengan IP tertentu (misal: 192.168.18.65)
	return "0.0.0.0"
}
