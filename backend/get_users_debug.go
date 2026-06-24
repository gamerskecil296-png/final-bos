package main

import (
	"fmt"

	"siakad-backend/config"
	"siakad-backend/models"
)

func main() {
	config.ConnectDB()
	var users []models.User
	// Get top 5 most recently updated users
	config.DB.Order("updated_at desc").Limit(5).Find(&users)
	for _, u := range users {
		fmt.Printf("ID: %d | Email: %s | Role: %s | FakID: %v | ProdiID: %v\n", u.ID, u.Email, u.Role, u.FakultasID, u.ProgramStudiID)
	}
}
