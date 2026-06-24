package main

import (
	"encoding/json"
	"fmt"

	"siakad-backend/config"
	"siakad-backend/models"
)

func main() {
	config.ConnectDB()

	type UserWithContext struct {
		models.User
		FakultasNama  string `json:"fakultas_nama"`
		IdentityName  string `json:"identity_name"`
		IdentityCode  string `json:"identity_code"`
		ProdiNama     string `json:"prodi_nama"`
		RoleScopeType string `json:"role_scope_type"`
		FotoUrl       string `json:"foto_url"`
		OrmawaNama    string `json:"ormawa_nama"`
	}
	var results []UserWithContext
	err := config.DB.Table("public.users").
		Select(`
			"public"."users".*, 
			f.nama as fakultas_nama,
			COALESCE(m.nama_mahasiswa, d.nama, ps.nama, km.name, tk.nama, NULLIF(TRIM("public"."users".nama_lengkap), '')) as identity_name,
			COALESCE(m.nim, d.n_id_n) as identity_code,
			p.nama as prodi_nama,
			COALESCE(km.scope_type, tk.scope_type, ps.scope_type) as role_scope_type,
			COALESCE(m.foto_url, tk.foto_url, '') as foto_url,
			(SELECT orm.nama FROM ormawa.ormawa_anggota oa 
			 JOIN ormawa.ormawa orm ON orm.id = oa.ormawa_id 
			 WHERE oa.mahasiswa_id = m.id LIMIT 1) as ormawa_nama
		`).
		Joins(`LEFT JOIN "fakultas"."fakultas" f ON f.id = "public"."users".fakultas_id`).
		Joins(`LEFT JOIN "mahasiswa"."mahasiswa" m ON m.pengguna_id = "public"."users".id`).
		Joins(`LEFT JOIN "fakultas"."program_studi" p ON p.id = COALESCE(m.prodi_id, "public"."users".program_studi_id)`).
		Joins(`LEFT JOIN "fakultas"."dosen" d ON d.pengguna_id = "public"."users".id`).
		Joins(`LEFT JOIN "psikolog"."profiles" ps ON ps.user_id = "public"."users".id`).
		Joins(`LEFT JOIN "mahasiswa"."kencana_mentors" km ON km.user_id = "public"."users".id`).
		Joins(`LEFT JOIN "public"."tenaga_kesehatan" tk ON tk.user_id = "public"."users".id`).
		Where(`"public"."users".deleted_at IS NULL AND "public"."users".email IN ('maha@gmail.com', 'dan@gmail.com', 'testing@gmail.com')`).
		Order(`"public"."users".created_at desc`).
		Scan(&results).Error

	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	b, _ := json.MarshalIndent(results, "", "  ")
	fmt.Println(string(b))
}
