package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type KencanaPeriod struct {
	BaseModel
	Name                  string     `gorm:"size:150;not null" json:"name"`
	Year                  int        `gorm:"index" json:"year"`
	Description           string     `gorm:"type:text" json:"description"`
	StartDate             *time.Time `json:"start_date"`
	EndDate               *time.Time `json:"end_date"`
	Status                string     `gorm:"size:40;default:'draft';index" json:"status"`
	UniversityPhaseStatus string     `gorm:"size:40;default:'draft';index" json:"university_phase_status"`
	CreatedBy             *uint      `gorm:"index" json:"created_by"`

	// Fitur Tambahan (Konfigurasi Tema & Dashboard)
	Theme             string  `gorm:"size:255" json:"theme"`
	BannerURL         string  `gorm:"type:text" json:"banner_url"`
	GuidebookURL      string  `gorm:"type:text" json:"guidebook_url"`
	PassingGrade      float64 `gorm:"type:decimal(5,2);default:0" json:"passing_grade"`
	RemedialGrade     float64 `gorm:"type:decimal(5,2);default:0" json:"remedial_grade"`
	CognitiveWeight   float64 `gorm:"type:decimal(5,2);default:25" json:"cognitive_weight"`
	PsychomotorWeight float64 `gorm:"type:decimal(5,2);default:35" json:"psychomotor_weight"`
	AffectiveWeight   float64 `gorm:"type:decimal(5,2);default:40" json:"affective_weight"`
	IntroVideoURL     string  `gorm:"type:text" json:"intro_video_url"`
	PmbPeriodeId      string  `gorm:"size:10;index" json:"pmb_periode_id"`
}

func (KencanaPeriod) TableName() string { return "mahasiswa.kencana_periods" }

type KencanaTimelinePhase struct {
	BaseModel
	PeriodID  uint          `gorm:"uniqueIndex:idx_kencana_timeline_phase;index;not null" json:"period_id"`
	Period    KencanaPeriod `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
	PhaseType string        `gorm:"uniqueIndex:idx_kencana_timeline_phase;size:80;index;not null" json:"phase_type"`
	StartDate *time.Time    `json:"start_date"`
	EndDate   *time.Time    `json:"end_date"`
	Status    string        `gorm:"size:40;default:'draft';index" json:"status"`
	IsActive  bool          `gorm:"default:false;index" json:"is_active"`
	UpdatedBy *uint         `gorm:"index" json:"updated_by"`
}

func (KencanaTimelinePhase) TableName() string { return "mahasiswa.kencana_timeline_phases" }

type KencanaFacultyPhase struct {
	BaseModel
	PeriodID    uint          `gorm:"uniqueIndex:idx_kencana_faculty_phase;index;not null" json:"period_id"`
	Period      KencanaPeriod `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
	FakultasID  uint          `gorm:"uniqueIndex:idx_kencana_faculty_phase;index;not null" json:"fakultas_id"`
	Fakultas    Fakultas      `gorm:"foreignKey:FakultasID" json:"fakultas,omitempty"`
	StartDate   *time.Time    `json:"start_date"`
	EndDate     *time.Time    `json:"end_date"`
	Theme       string        `gorm:"size:255" json:"theme"`
	Status      string        `gorm:"size:40;default:'not_open';index" json:"status"`
	IsPublished bool          `gorm:"default:false;index" json:"is_published"`
	StartedBy   *uint         `gorm:"index" json:"started_by"`
	CompletedBy *uint         `gorm:"index" json:"completed_by"`
}

func (KencanaFacultyPhase) TableName() string { return "mahasiswa.kencana_faculty_phases" }

type KencanaStage struct {
	BaseModel
	PeriodID    uint             `gorm:"index;not null" json:"period_id"`
	Period      KencanaPeriod    `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
	FakultasID  *uint            `gorm:"index" json:"fakultas_id"`
	Fakultas    *Fakultas        `gorm:"foreignKey:FakultasID" json:"fakultas,omitempty"`
	Name        string           `gorm:"size:150;not null" json:"name"`
	Type        string           `gorm:"size:60;index" json:"type"`
	Description string           `gorm:"type:text" json:"description"`
	StartDate   *time.Time       `json:"start_date"`
	EndDate     *time.Time       `json:"end_date"`
	OrderNumber int              `gorm:"index" json:"order_number"`
	Status      string           `gorm:"size:40;default:'locked';index" json:"status"`
	IsPublished bool             `gorm:"default:false;index" json:"is_published"`
	CreatedBy   *uint            `gorm:"index" json:"created_by"`
	Sessions    []KencanaSession `gorm:"foreignKey:StageID" json:"sessions,omitempty"`
}

func (KencanaStage) TableName() string { return "mahasiswa.kencana_stages" }

type KencanaSession struct {
	BaseModel
	StageID     uint                `gorm:"index;not null" json:"stage_id"`
	Stage       KencanaStage        `gorm:"foreignKey:StageID" json:"stage,omitempty"`
	Title       string              `gorm:"size:180;not null" json:"title"`
	Description string              `gorm:"type:text" json:"description"`
	OrderNumber int                 `gorm:"index" json:"order_number"`
	StartDate   *time.Time          `json:"start_date"`
	EndDate     *time.Time          `json:"end_date"`
	Status      string              `gorm:"size:40;default:'locked';index" json:"status"`
	IsRequired  bool                `gorm:"default:true" json:"is_required"`
	IsPublished bool                `gorm:"default:false;index" json:"is_published"`
	CreatedBy   *uint               `gorm:"index" json:"created_by"`
	QRToken     string              `gorm:"size:64;index" json:"qr_token,omitempty"`
	QRExpiresAt *time.Time          `json:"qr_expires_at,omitempty"`
	Materials   []KencanaMaterial   `gorm:"foreignKey:SessionID" json:"materials,omitempty"`
	Quizzes     []KencanaQuiz       `gorm:"foreignKey:SessionID" json:"quizzes,omitempty"`
	Assignments []KencanaAssignment `gorm:"foreignKey:SessionID" json:"assignments,omitempty"`
}

func (KencanaSession) TableName() string { return "mahasiswa.kencana_sessions" }

type KencanaMaterial struct {
	BaseModel
	SessionID        uint   `gorm:"index;not null" json:"session_id"`
	FakultasID       *uint  `gorm:"index" json:"fakultas_id"`
	Title            string `gorm:"size:180;not null" json:"title"`
	Type             string `gorm:"size:40;default:'text'" json:"type"`
	Content          string `gorm:"type:text" json:"content"`
	FileURL          string `gorm:"size:500" json:"file_url"`
	LinkURL          string `gorm:"type:text" json:"link_url"`
	OriginalFileName string `gorm:"size:255" json:"original_file_name"`
	OrderNumber      int    `gorm:"index" json:"order_number"`
	IsRequired       bool   `gorm:"default:true" json:"is_required"`
}

func (KencanaMaterial) TableName() string { return "mahasiswa.kencana_materials" }

func (m *KencanaMaterial) SetFakultasID(id *uint) { m.FakultasID = id }
func (m KencanaMaterial) GetFakultasID() *uint    { return m.FakultasID }

type KencanaMaterialProgress struct {
	BaseModel
	MaterialID  uint       `gorm:"uniqueIndex:idx_kencana_material_student" json:"material_id"`
	StudentID   uint       `gorm:"uniqueIndex:idx_kencana_material_student;index" json:"student_id"`
	Status      string     `gorm:"size:40;default:'not_started'" json:"status"`
	CompletedAt *time.Time `json:"completed_at"`
}

func (KencanaMaterialProgress) TableName() string { return "mahasiswa.kencana_material_progress" }

type KencanaQuiz struct {
	BaseModel
	SessionID       uint              `gorm:"index;not null" json:"session_id"`
	FakultasID      *uint             `gorm:"index" json:"fakultas_id"`
	Title           string            `gorm:"size:180;not null" json:"title"`
	Description     string            `gorm:"type:text" json:"description"`
	Instruction     string            `gorm:"type:text" json:"instruction"`
	DurationMinutes int               `gorm:"default:30" json:"duration_minutes"`
	OpenAt          *time.Time        `json:"open_at"`
	CloseAt         *time.Time        `json:"close_at"`
	MaxAttempts     int               `gorm:"default:1" json:"max_attempts"`
	ShowScore       bool              `gorm:"default:true" json:"show_score"`
	Status          string            `gorm:"size:40;default:'draft';index" json:"status"`
	IsRequired      bool              `gorm:"default:true" json:"is_required"`
	CreatedBy       *uint             `gorm:"index" json:"created_by"`
	Questions       []KencanaQuestion `gorm:"foreignKey:QuizID" json:"questions,omitempty"`
}

func (KencanaQuiz) TableName() string { return "mahasiswa.kencana_quizzes" }

func (q *KencanaQuiz) SetFakultasID(id *uint) { q.FakultasID = id }
func (q KencanaQuiz) GetFakultasID() *uint    { return q.FakultasID }
func (q *KencanaQuiz) SetCreatedBy(id *uint)  { q.CreatedBy = id }

type KencanaQuestion struct {
	BaseModel
	QuizID       uint                    `gorm:"index;not null" json:"quiz_id"`
	QuestionText string                  `gorm:"type:text;not null" json:"question_text"`
	QuestionType string                  `gorm:"size:50;default:'multiple_choice'" json:"question_type"`
	Score        float64                 `gorm:"default:0" json:"score"`
	OrderNumber  int                     `gorm:"index" json:"order_number"`
	Options      []KencanaQuestionOption `gorm:"foreignKey:QuestionID" json:"options,omitempty"`
}

func (KencanaQuestion) TableName() string { return "mahasiswa.kencana_questions" }

func (q *KencanaQuestion) BeforeDelete(tx *gorm.DB) error {
	return tx.Where("question_id = ?", q.ID).Delete(&KencanaQuestionOption{}).Error
}

type KencanaQuestionOption struct {
	BaseModel
	QuestionID  uint   `gorm:"index;not null" json:"question_id"`
	OptionText  string `gorm:"type:text;not null" json:"option_text"`
	IsCorrect   bool   `gorm:"default:false" json:"is_correct"`
	OrderNumber int    `gorm:"index" json:"order_number"`
}

func (KencanaQuestionOption) TableName() string { return "mahasiswa.kencana_question_options" }

type KencanaQuizAttempt struct {
	BaseModel
	QuizID        uint                `gorm:"index;not null" json:"quiz_id"`
	StudentID     uint                `gorm:"index;not null" json:"student_id"`
	StartedAt     time.Time           `json:"started_at"`
	SubmittedAt   *time.Time          `json:"submitted_at"`
	Score         float64             `json:"score"`
	Status        string              `gorm:"size:40;default:'in_progress';index" json:"status"`
	AttemptNumber int                 `gorm:"default:1" json:"attempt_number"`
	Answers       []KencanaQuizAnswer `gorm:"foreignKey:AttemptID" json:"answers,omitempty"`
}

func (KencanaQuizAttempt) TableName() string { return "mahasiswa.kencana_quiz_attempts" }

type KencanaQuizAnswer struct {
	BaseModel
	AttemptID        uint    `gorm:"index;not null" json:"attempt_id"`
	QuestionID       uint    `gorm:"index;not null" json:"question_id"`
	SelectedOptionID *uint   `gorm:"index" json:"selected_option_id"`
	AnswerText       string  `gorm:"type:text" json:"answer_text"`
	IsCorrect        bool    `json:"is_correct"`
	Score            float64 `json:"score"`
}

func (KencanaQuizAnswer) TableName() string { return "mahasiswa.kencana_quiz_answers" }

type KencanaAssignment struct {
	BaseModel
	SessionID        uint       `gorm:"index;not null" json:"session_id"`
	FakultasID       *uint      `gorm:"index" json:"fakultas_id"`
	Title            string     `gorm:"size:180;not null" json:"title"`
	Description      string     `gorm:"type:text" json:"description"`
	OpenAt           *time.Time `json:"open_at"`
	DueDate          *time.Time `json:"due_date"`
	SubmissionType   string     `gorm:"size:40;default:'text'" json:"submission_type"`
	AllowedFileTypes string     `gorm:"size:255" json:"allowed_file_types"`
	Status           string     `gorm:"size:40;default:'draft';index" json:"status"`
	IsRequired       bool       `gorm:"default:true" json:"is_required"`
	CreatedBy        *uint      `gorm:"index" json:"created_by"`
}

func (KencanaAssignment) TableName() string { return "mahasiswa.kencana_assignments" }

func (a *KencanaAssignment) SetFakultasID(id *uint) { a.FakultasID = id }
func (a KencanaAssignment) GetFakultasID() *uint    { return a.FakultasID }

type KencanaAssignmentSubmission struct {
	BaseModel
	AssignmentID uint       `gorm:"uniqueIndex:idx_kencana_assignment_student" json:"assignment_id"`
	StudentID    uint       `gorm:"uniqueIndex:idx_kencana_assignment_student;index" json:"student_id"`
	AnswerText   string     `gorm:"type:text" json:"answer_text"`
	FileURL      string     `gorm:"size:500" json:"file_url"`
	LinkURL      string     `gorm:"size:500" json:"link_url"`
	SubmittedAt  *time.Time `json:"submitted_at"`
	Score        *float64   `json:"score"`
	Feedback     string     `gorm:"type:text" json:"feedback"`
	Status       string     `gorm:"size:40;default:'not_submitted';index" json:"status"`
	GradedBy     *uint      `gorm:"index" json:"graded_by"`
	GradedAt     *time.Time `json:"graded_at"`
}

func (KencanaAssignmentSubmission) TableName() string {
	return "mahasiswa.kencana_assignment_submissions"
}

type KencanaHandbook struct {
	BaseModel
	PeriodID    uint           `gorm:"uniqueIndex:idx_kencana_handbook_period_student" json:"period_id"`
	StudentID   uint           `gorm:"uniqueIndex:idx_kencana_handbook_period_student;index" json:"student_id"`
	ContentJSON datatypes.JSON `gorm:"type:jsonb" json:"content_json"`
	Status      string         `gorm:"size:40;default:'not_started';index" json:"status"`
	SubmittedAt *time.Time     `json:"submitted_at"`
	ReviewedBy  *uint          `gorm:"index" json:"reviewed_by"`
	ReviewedAt  *time.Time     `json:"reviewed_at"`
	Feedback    string         `gorm:"type:text" json:"feedback"`
}

func (KencanaHandbook) TableName() string { return "mahasiswa.kencana_handbooks" }

type KencanaAttendance struct {
	BaseModel
	SessionID uint       `gorm:"uniqueIndex:idx_kencana_attendance_session_student" json:"session_id"`
	StudentID uint       `gorm:"uniqueIndex:idx_kencana_attendance_session_student;index" json:"student_id"`
	Status    string     `gorm:"size:40;default:'absent';index" json:"status"`
	CheckedAt *time.Time `json:"checked_at"`
	CheckedBy *uint      `gorm:"index" json:"checked_by"`
}

func (KencanaAttendance) TableName() string { return "mahasiswa.kencana_attendances" }

type KencanaCertificateSetting struct {
	BaseModel
	Theme           string `gorm:"size:255;default:'Membangun Generasi Emas'" json:"theme"`
	IssueDate       string `gorm:"size:100;default:'25 Agustus 2026'" json:"issue_date"`
	StartDate       string `gorm:"size:100;default:'25 Agustus'" json:"start_date"`
	EndDate         string `gorm:"size:100;default:'27 Agustus 2026'" json:"end_date"`
	RektorName      string `gorm:"size:255;default:'Dr. Entris Sutrisno, MH.Kes., Apt'" json:"rektor_name"`
	RektorNik       string `gorm:"size:100;default:'0123456789'" json:"rektor_nik"`
	DirekturName    string `gorm:"size:255;default:'Nama Direktur'" json:"direktur_name"`
	DirekturNik     string `gorm:"size:100;default:'0123456789'" json:"direktur_nik"`
	PresmaName      string `gorm:"size:255;default:'Nama Presma'" json:"presma_name"`
	PresmaNpm       string `gorm:"size:100;default:'201FF03068'" json:"presma_npm"`
	ReferenceNumber string `gorm:"size:100;default:'02.08.01/FRM-1/KMHS-SPMI'" json:"reference_number"`
	LogoUrl         string `gorm:"type:text" json:"logo_url"`
	LeftLogoUrl     string `gorm:"type:text" json:"left_logo_url"`
	RightLogoUrl    string `gorm:"type:text" json:"right_logo_url"`
}

func (KencanaCertificateSetting) TableName() string { return "mahasiswa.kencana_certificate_settings" }

type KencanaScore struct {
	BaseModel
	PeriodID            uint       `gorm:"uniqueIndex:idx_kencana_score_period_student_scope" json:"period_id"`
	StudentID           uint       `gorm:"uniqueIndex:idx_kencana_score_period_student_scope;index" json:"student_id"`
	ScopeType           string     `gorm:"uniqueIndex:idx_kencana_score_period_student_scope;size:40;default:'university'" json:"scope_type"`
	FakultasID          *uint      `gorm:"index" json:"fakultas_id"`
	Student             Mahasiswa  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	CognitiveAverage    float64    `json:"cognitive_average"`
	PsychomotorAverage  float64    `json:"psychomotor_average"`
	AffectiveAverage    float64    `json:"affective_average"`
	CognitiveWeighted   float64    `json:"cognitive_weighted"`
	PsychomotorWeighted float64    `json:"psychomotor_weighted"`
	AffectiveWeighted   float64    `json:"affective_weighted"`
	FinalScore          float64    `json:"final_score"`
	GraduationStatus    string     `gorm:"size:50;default:'not_started';index" json:"graduation_status"`
	Notes               string     `gorm:"type:text" json:"notes"`
	CalculatedAt        *time.Time `json:"calculated_at"`
}

func (KencanaScore) TableName() string { return "mahasiswa.kencana_scores" }

type KencanaScoreItem struct {
	BaseModel
	PeriodID   uint       `gorm:"index;not null" json:"period_id"`
	StudentID  uint       `gorm:"index;not null" json:"student_id"`
	ScopeType  string     `gorm:"size:40;default:'university';index" json:"scope_type"`
	FakultasID *uint      `gorm:"index" json:"fakultas_id"`
	Component  string     `gorm:"size:40;index" json:"component"`
	ItemName   string     `gorm:"size:180" json:"item_name"`
	Score      float64    `json:"score"`
	SourceType string     `gorm:"size:40" json:"source_type"`
	SourceID   *uint      `gorm:"index" json:"source_id"`
	AssessedBy *uint      `gorm:"index" json:"assessed_by"`
	AssessedAt *time.Time `json:"assessed_at"`
	Notes      string     `gorm:"type:text" json:"notes"`
}

func (KencanaScoreItem) TableName() string { return "mahasiswa.kencana_score_items" }

type KencanaMentor struct {
	BaseModel
	UserID       uint       `gorm:"uniqueIndex;not null" json:"user_id"`
	User         User       `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Mahasiswa    *Mahasiswa `gorm:"foreignKey:UserID;references:PenggunaID;constraint:-" json:"mahasiswa,omitempty"`
	Name         string     `gorm:"size:150;not null" json:"name"`
	Email        string     `gorm:"size:150;index" json:"email"`
	Phone        string     `gorm:"size:40" json:"phone"`
	JenisKelamin string     `gorm:"size:20" json:"jenis_kelamin"`
	ScopeType    string     `gorm:"size:40;default:'faculty';index" json:"scope_type"`
	FakultasID   *uint      `gorm:"index" json:"fakultas_id"`
	Fakultas     *Fakultas  `gorm:"foreignKey:FakultasID" json:"fakultas,omitempty"`
	Status       string     `gorm:"size:40;default:'active';index" json:"status"`
}

func (KencanaMentor) TableName() string { return "mahasiswa.kencana_mentors" }

type KencanaGroup struct {
	BaseModel
	PeriodID    uint                 `gorm:"index;not null" json:"period_id"`
	Period      KencanaPeriod        `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
	FakultasID  *uint                `gorm:"index" json:"fakultas_id"`
	Fakultas    *Fakultas            `gorm:"foreignKey:FakultasID" json:"fakultas,omitempty"`
	MentorID    *uint                `gorm:"index" json:"mentor_id"`
	Mentor      *KencanaMentor       `gorm:"foreignKey:MentorID" json:"mentor,omitempty"`
	GroupNumber int                  `gorm:"index" json:"group_number"`
	Name        string               `gorm:"size:150;not null" json:"name"`
	Code        string               `gorm:"size:80;index" json:"code"`
	Description string               `gorm:"type:text" json:"description"`
	ScopeType   string               `gorm:"size:40;default:'university';index" json:"scope_type"`
	Capacity    int                  `gorm:"default:30" json:"capacity"`
	Status      string               `gorm:"size:40;default:'active';index" json:"status"`
	CreatedBy   *uint                `gorm:"index" json:"created_by"`
	Members     []KencanaGroupMember `gorm:"foreignKey:GroupID" json:"members,omitempty"`
}

func (KencanaGroup) TableName() string { return "mahasiswa.kencana_groups" }

type KencanaGroupMember struct {
	BaseModel
	GroupID   uint         `gorm:"index;not null" json:"group_id"`
	Group     KencanaGroup `gorm:"foreignKey:GroupID" json:"group,omitempty"`
	PeriodID  uint         `gorm:"index;not null" json:"period_id"`
	StudentID uint         `gorm:"index;not null" json:"student_id"`
	Student   Mahasiswa    `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Status    string       `gorm:"size:40;default:'active';index" json:"status"`
	JoinedAt  *time.Time   `json:"joined_at"`
	AddedBy   *uint        `gorm:"index" json:"added_by"`
}

func (KencanaGroupMember) TableName() string { return "mahasiswa.kencana_group_members" }

type KencanaMentorAssignment struct {
	BaseModel
	PeriodID         uint          `gorm:"uniqueIndex:idx_kencana_active_student_mentor;index" json:"period_id"`
	MentorID         uint          `gorm:"index;not null" json:"mentor_id"`
	Mentor           KencanaMentor `gorm:"foreignKey:MentorID" json:"mentor,omitempty"`
	StudentID        uint          `gorm:"uniqueIndex:idx_kencana_active_student_mentor;index" json:"student_id"`
	AssignedBy       *uint         `gorm:"index" json:"assigned_by"`
	AssignmentSource string        `gorm:"size:40;default:'mentor_invite'" json:"assignment_source"`
	Status           string        `gorm:"uniqueIndex:idx_kencana_active_student_mentor;size:40;default:'active';index" json:"status"`
}

func (KencanaMentorAssignment) TableName() string { return "mahasiswa.kencana_mentor_assignments" }

type KencanaRemedial struct {
	BaseModel
	PeriodID  uint       `gorm:"index;not null" json:"period_id"`
	StudentID uint       `gorm:"index;not null" json:"student_id"`
	Student   Mahasiswa  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Reason    string     `gorm:"type:text" json:"reason"`
	Component string     `gorm:"size:60;index" json:"component"`
	Type      string     `gorm:"size:40;default:'universitas';index" json:"type"`
	Status    string     `gorm:"size:40;default:'open';index" json:"status"`
	OpenedAt  *time.Time `json:"opened_at"`
	ClosedAt  *time.Time `json:"closed_at"`
	CreatedBy *uint      `gorm:"index" json:"created_by"`
}

func (KencanaRemedial) TableName() string { return "mahasiswa.kencana_remedials" }

type KencanaCertificate struct {
	BaseModel
	PeriodID          uint       `gorm:"uniqueIndex:idx_kencana_certificate_period_student_scope" json:"period_id"`
	StudentID         uint       `gorm:"uniqueIndex:idx_kencana_certificate_period_student_scope;index" json:"student_id"`
	ScopeType         string     `gorm:"uniqueIndex:idx_kencana_certificate_period_student_scope;size:40;default:'university'" json:"scope_type"`
	FakultasID        *uint      `gorm:"index" json:"fakultas_id"`
	Student           Mahasiswa  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	CertificateNumber string     `gorm:"size:120;uniqueIndex" json:"certificate_number"`
	FileURL           string     `gorm:"size:500" json:"file_url"`
	IssuedAt          *time.Time `json:"issued_at"`
	Status            string     `gorm:"size:40;default:'not_available';index" json:"status"`
}

func (KencanaCertificate) TableName() string { return "mahasiswa.kencana_certificates" }

type KencanaBanding struct {
	BaseModel
	PeriodID      uint       `gorm:"index;not null" json:"period_id"`
	Period        KencanaPeriod `gorm:"foreignKey:PeriodID" json:"period,omitempty"`
	StudentID     uint       `gorm:"index;not null" json:"student_id"`
	Student       Mahasiswa  `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	Reason        string     `gorm:"type:text;not null" json:"reason"`
	Type          string     `gorm:"size:40;default:'universitas';index" json:"type"`
	Status        string     `gorm:"size:40;default:'pending';index" json:"status"` // pending, approved, rejected
	AdminResponse string     `gorm:"type:text" json:"admin_response"`
	ReviewedBy    *uint      `gorm:"index" json:"reviewed_by"`
	ReviewedAt    *time.Time `json:"reviewed_at"`
}

func (KencanaBanding) TableName() string { return "mahasiswa.kencana_bandings" }

// KencanaPengumuman — announcement targeted to students and/or mentors
type KencanaPengumuman struct {
	BaseModel
	PeriodID   uint   `gorm:"index;not null" json:"period_id"`
	Judul      string `gorm:"not null" json:"judul"`
	Isi        string `gorm:"type:text;not null" json:"isi"`
	TargetRole string `gorm:"size:40;not null;default:'mahasiswa'" json:"target_role"` // mahasiswa, mentor, both
	CreatedBy  uint   `gorm:"index" json:"created_by"`
	ScopeType  string `gorm:"size:20;default:'university'" json:"scope_type"`
	FakultasID *uint  `gorm:"index" json:"fakultas_id"`
}

func (KencanaPengumuman) TableName() string { return "mahasiswa.kencana_pengumuman" }
