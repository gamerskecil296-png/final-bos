//go:build ignore

package main

import (
	"log"


	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	godotenv.Load()
	dsn := "host=localhost user=postgres password=nidan29april dbname=studenthub port=5432 sslmode=disable TimeZone=Asia/Jakarta"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	schemas := []string{"public", "mahasiswa", "fakultas", "ormawa", "psikolog"}
	for _, schema := range schemas {
		log.Printf("Dropping schema %s CASCADE...", schema)
		err := db.Exec("DROP SCHEMA IF EXISTS " + schema + " CASCADE").Error
		if err != nil {
			log.Printf("Error dropping schema %s: %v", schema, err)
		}
		
		log.Printf("Creating schema %s...", schema)
		err = db.Exec("CREATE SCHEMA " + schema).Error
		if err != nil {
			log.Printf("Error creating schema %s: %v", schema, err)
		}
	}
	
	log.Println("==========================================================")
	log.Println("✅ Database berhasil dibersihkan total (Reset All Schemas).")
	log.Println("Silakan restart server (go run main.go) agar tabel otomatis terbuat ulang (AutoMigrate) dan akun Super Admin bawaan dibuat.")
	log.Println("==========================================================")
}
