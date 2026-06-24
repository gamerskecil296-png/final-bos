package services

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
)

type SimkatmawaService struct {
	BaseURL  string
	Email    string
	Password string
	Token    string
}

func NewSimkatmawaService() *SimkatmawaService {
	email := os.Getenv("SIMKATMAWA_EMAIL")
	password := os.Getenv("SIMKATMAWA_PASSWORD")
	
	// Coba ambil dari database jika ada
	var integ models.ApiIntegration
	if err := config.DB.Where("key = ?", "simkatmawa").First(&integ).Error; err == nil {
		if integ.Endpoint != "" {
			email = integ.Endpoint
		}
		if integ.ClientKey != "" {
			password = integ.ClientKey
		}
	}

	return &SimkatmawaService{
		BaseURL:  "https://simkatmawa.kemdiktisaintek.go.id/api",
		Email:    email,
		Password: password,
		Token:    os.Getenv("SIMKATMAWA_TOKEN"),
	}
}

func (s *SimkatmawaService) Login() error {
	if s.Email == "" || s.Password == "" {
		s.Email = "dummy@example.com"
		s.Password = "dummy_password"
	}
	url := fmt.Sprintf("%s/login", s.BaseURL)
	payload := map[string]string{
		"email":    s.Email,
		"password": s.Password,
	}
	jsonPayload, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to login to simkatmawa, status: %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var result struct {
		Success bool   `json:"success"`
		Token   string `json:"token"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return err
	}

	if !result.Success {
		return errors.New("simkatmawa login failed: success=false")
	}

	s.Token = result.Token
	return nil
}

type SimkatmawaResponse struct {
	Status  bool   `json:"status"`
	Message string `json:"message"`
	Data    struct {
		ID int `json:"id"`
	} `json:"data"`
}

func (s *SimkatmawaService) PostPrestasiMandiri(payload map[string]interface{}) (string, error) {
	return s.sendRequest("/prestasi-mandiri", payload)
}

func (s *SimkatmawaService) PostSertifikasi(payload map[string]interface{}) (string, error) {
	return s.sendRequest("/sertifikasi", payload)
}

func (s *SimkatmawaService) PostRekognisi(payload map[string]interface{}) (string, error) {
	return s.sendRequest("/rekognisi", payload)
}

func (s *SimkatmawaService) sendRequest(endpoint string, payload map[string]interface{}) (string, error) {
	if s.Token == "" {
		if err := s.Login(); err != nil {
			return "", fmt.Errorf("simkatmawa login error: %v", err)
		}
	}

	url := fmt.Sprintf("%s%s", s.BaseURL, endpoint)
	jsonPayload, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+s.Token)
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("simkatmawa request error: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("simkatmawa status error: %d, body: %s", resp.StatusCode, string(body))
	}

	var result SimkatmawaResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return "", err
	}

	if !result.Status {
		return "", fmt.Errorf("simkatmawa response error: %s", result.Message)
	}

	return fmt.Sprintf("%d", result.Data.ID), nil
}
