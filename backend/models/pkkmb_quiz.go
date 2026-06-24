package models

import "time"

type PkkmbQuiz struct {
	BaseModel
	MateriID  uint   `gorm:"index" json:"materi_id"`
	Judul     string `json:"judul"`
	Deskripsi string `json:"deskripsi"`
	Durasi    int    `json:"durasi"` // minutes
	IsActive  bool   `json:"is_active" gorm:"default:true"`
	Bobot     int    `json:"bobot_persen" gorm:"default:10"`

	Questions []PkkmbQuizQuestion `gorm:"foreignKey:QuizID" json:"questions,omitempty"`
}

func (PkkmbQuiz) TableName() string {
	return "mahasiswa.pkkmb_quiz"
}

type PkkmbQuizQuestion struct {
	BaseModel
	QuizID     uint   `gorm:"index" json:"quiz_id"`
	Pertanyaan string `json:"pertanyaan"`
	Tipe       string `json:"tipe" gorm:"default:'multiple_choice'"`
	Point      int    `json:"point" gorm:"default:10"`

	Options []PkkmbQuizOption `gorm:"foreignKey:QuestionID" json:"options,omitempty"`
}

func (PkkmbQuizQuestion) TableName() string {
	return "mahasiswa.pkkmb_quiz_question"
}

type PkkmbQuizOption struct {
	BaseModel
	QuestionID uint   `gorm:"index" json:"question_id"`
	Opsi       string `json:"opsi"`
	IsBenar    bool   `json:"is_benar" gorm:"default:false"`
}

func (PkkmbQuizOption) TableName() string {
	return "mahasiswa.pkkmb_quiz_option"
}

type PkkmbQuizAttempt struct {
	BaseModel
	MahasiswaID  uint       `gorm:"index" json:"mahasiswa_id"`
	QuizID       uint       `gorm:"index" json:"quiz_id"`
	Nilai        float64    `json:"nilai"`
	Status       string     `json:"status"` // Selesai, Belum Selesai
	WaktuMulai   time.Time  `json:"waktu_mulai"`
	WaktuSelesai *time.Time `json:"waktu_selesai"`

	Mahasiswa Mahasiswa `gorm:"foreignKey:MahasiswaID" json:"mahasiswa,omitempty"`
	Quiz      PkkmbQuiz `gorm:"foreignKey:QuizID" json:"quiz,omitempty"`
}

func (PkkmbQuizAttempt) TableName() string {
	return "mahasiswa.pkkmb_quiz_attempt"
}
