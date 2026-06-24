package routes

import (
	"github.com/gofiber/fiber/v2"
	"siakad-backend/controllers/pddikti"
)

// SetupPddiktiRoutes mendaftarkan rute untuk proxy PDDIKTI
func SetupPddiktiRoutes(group fiber.Router) {
	group.Get("/proxy", pddikti.PddiktiProxy)
}
