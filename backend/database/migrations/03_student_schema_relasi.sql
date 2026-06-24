-- ============================================================
-- SIAKAD STUDENT DOMAIN SCHEMA (PostgreSQL)
-- Versi: 1.0.0
-- Catatan:
-- - Fokus untuk domain Mahasiswa (student) dan relasi lintas modul.
-- - Disusun mengikuti model aktif di backend/models/models.go.
-- - Menggunakan IF NOT EXISTS agar aman dieksekusi berulang.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- MASTER IDENTITY
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role_id BIGINT,
  is_active BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);

CREATE TABLE IF NOT EXISTS faculties (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  dean_name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS majors (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  faculty_id BIGINT,
  degree_level VARCHAR(255),
  CONSTRAINT fk_majors_faculty_id FOREIGN KEY (faculty_id) REFERENCES faculties(id)
);

CREATE INDEX IF NOT EXISTS idx_majors_faculty_id ON majors(faculty_id);

CREATE TABLE IF NOT EXISTS lecturers (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  nidn VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  faculty_id BIGINT,
  is_dpa BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_lecturers_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_lecturers_faculty_id FOREIGN KEY (faculty_id) REFERENCES faculties(id)
);

CREATE INDEX IF NOT EXISTS idx_lecturers_user_id ON lecturers(user_id);
CREATE INDEX IF NOT EXISTS idx_lecturers_faculty_id ON lecturers(faculty_id);

CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  nim VARCHAR(255) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  prodi_id BIGINT,
  dpa_lecturer_id BIGINT,
  current_semester BIGINT DEFAULT 1,
  status VARCHAR(255) DEFAULT 'aktif',
  angkatan SMALLINT,
  foto_url TEXT,
  email VARCHAR(255),
  phone VARCHAR(255),
  birth_place VARCHAR(255),
  birth_date TIMESTAMPTZ,
  gender VARCHAR(255),
  religion VARCHAR(255),
  address TEXT,
  city VARCHAR(255),
  zip_code VARCHAR(255),
  golongan_darah VARCHAR(255),
  CONSTRAINT fk_students_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_students_prodi_id FOREIGN KEY (prodi_id) REFERENCES majors(id),
  CONSTRAINT fk_students_dpa_lecturer_id FOREIGN KEY (dpa_lecturer_id) REFERENCES lecturers(id)
);

CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_prodi_id ON students(prodi_id);
CREATE INDEX IF NOT EXISTS idx_students_dpa_lecturer_id ON students(dpa_lecturer_id);

-- ============================================================
-- AKADEMIK & KRS
-- ============================================================

CREATE TABLE IF NOT EXISTS periode_akademiks (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  semester VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  krs_open BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS mata_kuliahs (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  sks BIGINT NOT NULL,
  semester BIGINT,
  prodi_id BIGINT,
  CONSTRAINT fk_mata_kuliahs_prodi_id FOREIGN KEY (prodi_id) REFERENCES majors(id)
);

CREATE INDEX IF NOT EXISTS idx_mata_kuliahs_prodi_id ON mata_kuliahs(prodi_id);

CREATE TABLE IF NOT EXISTS mata_kuliah_prasyarats (
  id BIGSERIAL PRIMARY KEY,
  mata_kuliah_id BIGINT,
  prasyarat_id BIGINT,
  CONSTRAINT fk_mata_kuliah_prasyarats_mata_kuliah_id FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliahs(id),
  CONSTRAINT fk_mata_kuliah_prasyarats_prasyarat_id FOREIGN KEY (prasyarat_id) REFERENCES mata_kuliahs(id)
);

CREATE INDEX IF NOT EXISTS idx_mata_kuliah_prasyarats_mata_kuliah_id ON mata_kuliah_prasyarats(mata_kuliah_id);
CREATE INDEX IF NOT EXISTS idx_mata_kuliah_prasyarats_prasyarat_id ON mata_kuliah_prasyarats(prasyarat_id);

CREATE TABLE IF NOT EXISTS jadwal_kuliahs (
  id BIGSERIAL PRIMARY KEY,
  mata_kuliah_id BIGINT,
  lecturer_id BIGINT,
  periode_id BIGINT,
  hari BIGINT,
  jam_mulai VARCHAR(255) NOT NULL,
  jam_selesai VARCHAR(255) NOT NULL,
  ruang VARCHAR(255) NOT NULL,
  kuota BIGINT NOT NULL DEFAULT 40,
  tahun_akademik VARCHAR(255),
  CONSTRAINT fk_jadwal_kuliahs_mata_kuliah_id FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliahs(id),
  CONSTRAINT fk_jadwal_kuliahs_lecturer_id FOREIGN KEY (lecturer_id) REFERENCES lecturers(id),
  CONSTRAINT fk_jadwal_kuliahs_periode_id FOREIGN KEY (periode_id) REFERENCES periode_akademiks(id)
);

CREATE INDEX IF NOT EXISTS idx_jadwal_kuliahs_mata_kuliah_id ON jadwal_kuliahs(mata_kuliah_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_kuliahs_lecturer_id ON jadwal_kuliahs(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_jadwal_kuliahs_periode_id ON jadwal_kuliahs(periode_id);

CREATE TABLE IF NOT EXISTS khs (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  mata_kuliah_id BIGINT,
  periode_id BIGINT,
  nilai_huruf VARCHAR(255),
  bobot DOUBLE PRECISION,
  CONSTRAINT fk_khs_student_id FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_khs_mata_kuliah_id FOREIGN KEY (mata_kuliah_id) REFERENCES mata_kuliahs(id),
  CONSTRAINT fk_khs_periode_id FOREIGN KEY (periode_id) REFERENCES periode_akademiks(id)
);

CREATE INDEX IF NOT EXISTS idx_khs_student_id ON khs(student_id);
CREATE INDEX IF NOT EXISTS idx_khs_mata_kuliah_id ON khs(mata_kuliah_id);
CREATE INDEX IF NOT EXISTS idx_khs_periode_id ON khs(periode_id);

CREATE TABLE IF NOT EXISTS krs_headers (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  periode_id BIGINT,
  status VARCHAR(255) DEFAULT 'draft',
  total_sks BIGINT DEFAULT 0,
  catatan_wali TEXT,
  submitted_at TIMESTAMPTZ,
  CONSTRAINT fk_krs_headers_student_id FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_krs_headers_periode_id FOREIGN KEY (periode_id) REFERENCES periode_akademiks(id)
);

CREATE INDEX IF NOT EXISTS idx_krs_headers_student_id ON krs_headers(student_id);
CREATE INDEX IF NOT EXISTS idx_krs_headers_periode_id ON krs_headers(periode_id);

CREATE TABLE IF NOT EXISTS krs_details (
  id BIGSERIAL PRIMARY KEY,
  krs_header_id BIGINT,
  jadwal_kuliah_id BIGINT,
  CONSTRAINT fk_krs_details_krs_header_id FOREIGN KEY (krs_header_id) REFERENCES krs_headers(id) ON DELETE CASCADE,
  CONSTRAINT fk_krs_details_jadwal_kuliah_id FOREIGN KEY (jadwal_kuliah_id) REFERENCES jadwal_kuliahs(id)
);

CREATE INDEX IF NOT EXISTS idx_krs_details_krs_header_id ON krs_details(krs_header_id);
CREATE INDEX IF NOT EXISTS idx_krs_details_jadwal_kuliah_id ON krs_details(jadwal_kuliah_id);

-- ============================================================
-- KENCANA
-- ============================================================

CREATE TABLE IF NOT EXISTS kencana_tahaps (
  id BIGSERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  label VARCHAR(255) NOT NULL,
  urutan BIGINT,
  tanggal_mulai TIMESTAMPTZ,
  tanggal_selesai TIMESTAMPTZ,
  status VARCHAR(255) DEFAULT 'akan_datang',
  is_aktif BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS kencana_materis (
  id BIGSERIAL PRIMARY KEY,
  tahap_id BIGINT,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  file_url TEXT,
  tipe VARCHAR(255),
  urutan BIGINT,
  is_aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_kencana_materis_tahap_id FOREIGN KEY (tahap_id) REFERENCES kencana_tahaps(id)
);

CREATE INDEX IF NOT EXISTS idx_kencana_materis_tahap_id ON kencana_materis(tahap_id);

CREATE TABLE IF NOT EXISTS kencana_kuis (
  id BIGSERIAL PRIMARY KEY,
  kencana_materi_id BIGINT,
  judul VARCHAR(255),
  passing_grade BIGINT DEFAULT 75,
  bobot_persen DOUBLE PRECISION DEFAULT 0,
  durasi_menit BIGINT,
  is_aktif BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_kencana_kuis_kencana_materi_id FOREIGN KEY (kencana_materi_id) REFERENCES kencana_materis(id)
);

CREATE INDEX IF NOT EXISTS idx_kencana_kuis_kencana_materi_id ON kencana_kuis(kencana_materi_id);

CREATE TABLE IF NOT EXISTS kuis_soals (
  id BIGSERIAL PRIMARY KEY,
  kencana_kuis_id BIGINT,
  pertanyaan TEXT,
  opsi_a VARCHAR(255),
  opsi_b VARCHAR(255),
  opsi_c VARCHAR(255),
  opsi_d VARCHAR(255),
  kunci_jawaban VARCHAR(255),
  urutan BIGINT,
  CONSTRAINT fk_kuis_soals_kencana_kuis_id FOREIGN KEY (kencana_kuis_id) REFERENCES kencana_kuis(id)
);

CREATE INDEX IF NOT EXISTS idx_kuis_soals_kencana_kuis_id ON kuis_soals(kencana_kuis_id);

CREATE TABLE IF NOT EXISTS kencana_hasil_kuis (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  kencana_kuis_id BIGINT,
  nilai DOUBLE PRECISION,
  jumlah_benar BIGINT,
  total_soal BIGINT,
  lulus BOOLEAN,
  attempt_ke BIGINT,
  dikerjakan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_kencana_hasil_kuis_student_id FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_kencana_hasil_kuis_kencana_kuis_id FOREIGN KEY (kencana_kuis_id) REFERENCES kencana_kuis(id)
);

CREATE INDEX IF NOT EXISTS idx_kencana_hasil_kuis_student_id ON kencana_hasil_kuis(student_id);
CREATE INDEX IF NOT EXISTS idx_kencana_hasil_kuis_kencana_kuis_id ON kencana_hasil_kuis(kencana_kuis_id);

CREATE TABLE IF NOT EXISTS kencana_progresses (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT UNIQUE,
  nilai_kumulatif DOUBLE PRECISION DEFAULT 0,
  status_keseluruhan VARCHAR(255) DEFAULT 'belum_mulai',
  last_updated TIMESTAMPTZ,
  CONSTRAINT fk_kencana_progresses_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS kencana_bandings (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  kuis_id BIGINT,
  alasan TEXT,
  bukti_url TEXT,
  status VARCHAR(255) DEFAULT 'menunggu',
  catatan_admin TEXT,
  diproses_oleh BIGINT,
  diproses_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_kencana_bandings_student_id FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_kencana_bandings_kuis_id FOREIGN KEY (kuis_id) REFERENCES kencana_kuis(id)
);

CREATE INDEX IF NOT EXISTS idx_kencana_bandings_student_id ON kencana_bandings(student_id);
CREATE INDEX IF NOT EXISTS idx_kencana_bandings_kuis_id ON kencana_bandings(kuis_id);

CREATE TABLE IF NOT EXISTS kencana_sertifikats (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  nomor_sertifikat VARCHAR(255) UNIQUE,
  file_url TEXT,
  diterbitkan_at TIMESTAMPTZ,
  CONSTRAINT fk_kencana_sertifikats_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_kencana_sertifikats_student_id ON kencana_sertifikats(student_id);

-- ============================================================
-- ACHIEVEMENT, SCHOLARSHIP
-- ============================================================

CREATE TABLE IF NOT EXISTS achievements (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  nama_lomba VARCHAR(255) NOT NULL,
  kategori VARCHAR(255),
  penyelenggara VARCHAR(255),
  tingkat VARCHAR(255),
  tanggal TIMESTAMPTZ,
  peringkat VARCHAR(255),
  sertifikat_url TEXT,
  status VARCHAR(255),
  catatan_verifikator TEXT,
  verified_by BIGINT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_achievements_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_achievements_student_id ON achievements(student_id);

CREATE TABLE IF NOT EXISTS beasiswas (
  id BIGSERIAL PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  penyelenggara VARCHAR(255),
  kategori VARCHAR(255),
  deskripsi TEXT,
  persyaratan TEXT,
  nilai_bantuan DOUBLE PRECISION,
  kuota BIGINT,
  sisa_kuota BIGINT,
  deadline TIMESTAMPTZ,
  syarat_ipk_min DOUBLE PRECISION,
  is_berbasis_ekonomi BOOLEAN,
  is_aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pengajuan_beasiswas (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  beasiswa_id BIGINT,
  nomor_referensi VARCHAR(255) UNIQUE,
  motivasi TEXT,
  prestasi TEXT,
  status VARCHAR(255) DEFAULT 'dikirim',
  catatan_admin TEXT,
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  CONSTRAINT fk_pengajuan_beasiswas_student_id FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_pengajuan_beasiswas_beasiswa_id FOREIGN KEY (beasiswa_id) REFERENCES beasiswas(id)
);

CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswas_student_id ON pengajuan_beasiswas(student_id);
CREATE INDEX IF NOT EXISTS idx_pengajuan_beasiswas_beasiswa_id ON pengajuan_beasiswas(beasiswa_id);

CREATE TABLE IF NOT EXISTS pengajuan_berkas (
  id BIGSERIAL PRIMARY KEY,
  pengajuan_id BIGINT,
  tipe_berkas VARCHAR(255),
  file_url TEXT,
  uploaded_at TIMESTAMPTZ,
  CONSTRAINT fk_pengajuan_berkas_pengajuan_id FOREIGN KEY (pengajuan_id) REFERENCES pengajuan_beasiswas(id)
);

CREATE INDEX IF NOT EXISTS idx_pengajuan_berkas_pengajuan_id ON pengajuan_berkas(pengajuan_id);

CREATE TABLE IF NOT EXISTS pengajuan_pipeline_logs (
  id BIGSERIAL PRIMARY KEY,
  pengajuan_id BIGINT,
  tahap VARCHAR(255),
  catatan_admin TEXT,
  diubah_oleh BIGINT,
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_pengajuan_pipeline_logs_pengajuan_id FOREIGN KEY (pengajuan_id) REFERENCES pengajuan_beasiswas(id)
);

CREATE INDEX IF NOT EXISTS idx_pengajuan_pipeline_logs_pengajuan_id ON pengajuan_pipeline_logs(pengajuan_id);

-- ============================================================
-- COUNSELING, HEALTH
-- ============================================================

CREATE TABLE IF NOT EXISTS jadwal_konselings (
  id BIGSERIAL PRIMARY KEY,
  tipe VARCHAR(255),
  nama_konselor VARCHAR(255),
  tanggal TIMESTAMPTZ,
  jam_mulai VARCHAR(255),
  jam_selesai VARCHAR(255),
  kuota BIGINT,
  sisa_kuota BIGINT,
  lokasi VARCHAR(255),
  is_aktif BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS booking_konselings (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  jadwal_id BIGINT,
  keluhan_awal TEXT,
  status VARCHAR(255),
  catatan_konselor TEXT,
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_booking_konselings_student_id FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_booking_konselings_jadwal_id FOREIGN KEY (jadwal_id) REFERENCES jadwal_konselings(id)
);

CREATE INDEX IF NOT EXISTS idx_booking_konselings_student_id ON booking_konselings(student_id);
CREATE INDEX IF NOT EXISTS idx_booking_konselings_jadwal_id ON booking_konselings(jadwal_id);

CREATE TABLE IF NOT EXISTS hasil_kesehatans (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  tanggal_periksa TIMESTAMPTZ,
  tinggi_badan DOUBLE PRECISION,
  berat_badan DOUBLE PRECISION,
  bmi DOUBLE PRECISION,
  tekanan_darah_sistolik BIGINT,
  tekanan_darah_diastolik BIGINT,
  golongan_darah VARCHAR(255),
  keluhan TEXT,
  catatan_medis TEXT,
  status_kesehatan VARCHAR(255),
  sumber VARCHAR(255),
  petugas_id BIGINT,
  diperiksa_oleh VARCHAR(255),
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_hasil_kesehatans_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_hasil_kesehatans_student_id ON hasil_kesehatans(student_id);

-- ============================================================
-- STUDENT VOICE
-- ============================================================

CREATE TABLE IF NOT EXISTS tiket_aspirasis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_tiket VARCHAR(255) NOT NULL UNIQUE,
  student_id BIGINT,
  fakultas_id BIGINT,
  kategori VARCHAR(255),
  judul VARCHAR(150) NOT NULL,
  isi TEXT NOT NULL,
  lampiran_url VARCHAR(500),
  is_anonim BOOLEAN DEFAULT FALSE,
  level_saat_ini VARCHAR(255) DEFAULT 'fakultas',
  status VARCHAR(255) DEFAULT 'menunggu',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  CONSTRAINT fk_tiket_aspirasis_student_id FOREIGN KEY (student_id) REFERENCES students(id),
  CONSTRAINT fk_tiket_aspirasis_fakultas_id FOREIGN KEY (fakultas_id) REFERENCES faculties(id)
);

CREATE INDEX IF NOT EXISTS idx_tiket_aspirasis_student_id ON tiket_aspirasis(student_id);
CREATE INDEX IF NOT EXISTS idx_tiket_aspirasis_fakultas_id ON tiket_aspirasis(fakultas_id);

CREATE TABLE IF NOT EXISTS tiket_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiket_id UUID NOT NULL,
  tipe_event VARCHAR(255),
  level VARCHAR(255),
  isi_respons TEXT,
  dilakukan_oleh BIGINT,
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_tiket_timeline_events_tiket_id FOREIGN KEY (tiket_id) REFERENCES tiket_aspirasis(id)
);

CREATE INDEX IF NOT EXISTS idx_tiket_timeline_events_tiket_id ON tiket_timeline_events(tiket_id);

-- ============================================================
-- ORGANISASI MAHASISWA (RIWAYAT)
-- ============================================================

CREATE TABLE IF NOT EXISTS riwayat_organisasis (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT,
  nama_organisasi VARCHAR(255),
  tipe VARCHAR(255),
  jabatan VARCHAR(255),
  periode_mulai BIGINT,
  periode_selesai BIGINT,
  deskripsi_kegiatan TEXT,
  status_verifikasi VARCHAR(255),
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_riwayat_organisasis_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_riwayat_organisasis_student_id ON riwayat_organisasis(student_id);

-- ============================================================
-- DASHBOARD / GENERAL / PROFILE / NOTIFIKASI
-- ============================================================

CREATE TABLE IF NOT EXISTS kegiatan_kampuses (
  id BIGSERIAL PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  tanggal_mulai TIMESTAMPTZ NOT NULL,
  tanggal_selesai TIMESTAMPTZ,
  kategori VARCHAR(255),
  is_aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  created_by BIGINT
);

CREATE TABLE IF NOT EXISTS aktivitas_logs (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  tipe VARCHAR(255) NOT NULL,
  deskripsi VARCHAR(255) NOT NULL,
  link VARCHAR(255),
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_aktivitas_logs_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_aktivitas_logs_student_id ON aktivitas_logs(student_id);

CREATE TABLE IF NOT EXISTS pengumumans (
  id BIGSERIAL PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  isi_singkat TEXT,
  isi_lengkap TEXT,
  kategori VARCHAR(255),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_aktif BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by BIGINT
);

CREATE TABLE IF NOT EXISTS login_histories (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  ip_address VARCHAR(255),
  user_agent VARCHAR(255),
  location VARCHAR(255),
  status VARCHAR(255),
  created_at TIMESTAMPTZ,
  CONSTRAINT fk_login_histories_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_login_histories_student_id ON login_histories(student_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  email_achievement BOOLEAN DEFAULT TRUE,
  email_beasiswa BOOLEAN DEFAULT TRUE,
  email_counseling BOOLEAN DEFAULT TRUE,
  email_voice BOOLEAN DEFAULT TRUE,
  email_kencana BOOLEAN DEFAULT TRUE,
  email_news BOOLEAN DEFAULT TRUE,
  CONSTRAINT fk_notification_preferences_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_preferences_student_id ON notification_preferences(student_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id BIGINT NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  link VARCHAR(300),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_notifications_student_id FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(student_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);
