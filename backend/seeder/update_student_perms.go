package main

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load("../.env")
	if err != nil {
		godotenv.Load(".env")
	}
	config.ConnectDB()

	var role models.RBACRole
	if err := config.DB.Where("key = ?", "student").First(&role).Error; err == nil {
		role.Key = "mahasiswa"
		config.DB.Save(&role)
		fmt.Println("Student role renamed to mahasiswa successfully")
	} else if err := config.DB.Where("key = ?", "mahasiswa").First(&role).Error; err == nil {
        fmt.Println("Mahasiswa role already exists")
    } else {
		fmt.Println("Student/Mahasiswa role not found")
	}
}
