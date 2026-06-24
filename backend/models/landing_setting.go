package models

type LandingSetting struct {
	BaseModel

	// PMB Setting
	IsPmbOpen bool `gorm:"default:true" json:"is_pmb_open"`

	// Hero Section
	HeroBadge    string `gorm:"size:255;default:'Penerimaan Mahasiswa Baru 2026/2027 Telah Dibuka'" json:"hero_badge"`
	HeroTitle    string `gorm:"size:255;default:'Bentuk Masa Depanmu Bersama UBK'" json:"hero_title"`
	HeroSubtitle string `gorm:"type:text;default:'Universitas Bhakti Kencana hadir dengan 8 kampus tersebar di Jawa dan Lombok, siap mencetak generasi unggul, mandiri, dan berkarakter melalui 30+ program studi terakreditasi.'" json:"hero_subtitle"`

	// Stats Array JSON string (For Hero Row)
	StatsJson string `gorm:"type:text;default:'[{\"value\":\"30+\",\"label\":\"Program Studi\"},{\"value\":\"8\",\"label\":\"Kampus Tersebar\"},{\"value\":\"10.000+\",\"label\":\"Mahasiswa Aktif\"},{\"value\":\"A\",\"label\":\"Akreditasi\"}]'" json:"stats_json"`

	// Stats Section
	StatsSectionTitle    string `gorm:"size:255;default:'Fakta & Angka'" json:"stats_section_title"`
	StatsSectionSubtitle string `gorm:"size:255;default:'UBK dalam Angka'" json:"stats_section_subtitle"`
	StatsSectionDesc     string `gorm:"type:text;default:'Berbagai pencapaian dan pertumbuhan yang telah kami raih dalam perjalanan menjadi universitas terkemuka.'" json:"stats_section_desc"`
	StatsSectionItems    string `gorm:"type:text;default:'[{\"icon\":\"GraduationCap\",\"value\":\"30+\",\"label\":\"Program Studi\"},{\"icon\":\"Building2\",\"value\":\"8\",\"label\":\"Kampus Tersebar\"},{\"icon\":\"Users\",\"value\":\"10.000+\",\"label\":\"Mahasiswa Aktif\"},{\"icon\":\"Award\",\"value\":\"A\",\"label\":\"Akreditasi Institusi\"},{\"icon\":\"BookOpen\",\"value\":\"200+\",\"label\":\"Dosen Berkualitas\"},{\"icon\":\"Globe\",\"value\":\"50+\",\"label\":\"Mitra Kerja Sama\"}]'" json:"stats_section_items"`

	// Programs Section
	ProgramsTitle    string `gorm:"size:255;default:'Program Akademik'" json:"programs_title"`
	ProgramsSubtitle string `gorm:"size:255;default:'Program Studi Unggulan'" json:"programs_subtitle"`
	ProgramsDesc     string `gorm:"type:text;default:'Beragam program studi terakreditasi yang dirancang untuk menyongsong karir masa depan.'" json:"programs_desc"`
	ProgramsItems    string `gorm:"type:text;default:'[{\"faculty\":\"Fakultas Ilmu Kesehatan\",\"icon\":\"Heart\",\"color\":\"bg-[var(--theme-primary)]\",\"programs\":[\"Keperawatan (S1)\",\"Farmasi (S1)\",\"Kebidanan (D3)\"]},{\"faculty\":\"Fakultas Ilmu Sosial & Humaniora\",\"icon\":\"BookOpen\",\"color\":\"bg-[var(--theme-primary)]\",\"programs\":[\"Psikologi (S1)\",\"Ilmu Komunikasi (S1)\",\"Hukum (S1)\"]},{\"faculty\":\"Fakultas Sains & Teknologi\",\"icon\":\"Microscope\",\"color\":\"bg-[var(--theme-primary)]\",\"programs\":[\"Informatika (S1)\",\"Sistem Informasi (S1)\",\"Bioteknologi (S1)\"]},{\"faculty\":\"Fakultas Ekonomi & Bisnis\",\"icon\":\"Scale\",\"color\":\"bg-[var(--theme-primary)]\",\"programs\":[\"Manajemen (S1)\",\"Akuntansi (S1)\",\"Ekonomi Syariah (S1)\"]},{\"faculty\":\"Fakultas Pendidikan & Keguruan\",\"icon\":\"Computer\",\"color\":\"bg-[var(--theme-primary)]\",\"programs\":[\"PGSD (S1)\",\"PAUD (S1)\",\"Bimbingan Konseling (S1)\"]},{\"faculty\":\"Program Profesi\",\"icon\":\"Building2\",\"color\":\"bg-[var(--theme-primary)]\",\"programs\":[\"Profesi Ners\",\"Profesi Apoteker\",\"Profesi Psikolog\"]}]'" json:"programs_items"`

	// Locations Section
	LocationsTitle    string `gorm:"size:255;default:'Lokasi'" json:"locations_title"`
	LocationsSubtitle string `gorm:"size:255;default:'8 Kampus Tersebar'" json:"locations_subtitle"`
	LocationsDesc     string `gorm:"type:text;default:'UBK hadir di 8 kota strategis di Pulau Jawa dan Lombok untuk memudahkan akses pendidikan tinggi berkualitas.'" json:"locations_desc"`
	LocationsItems    string `gorm:"type:text;default:'[{\"name\":\"Bandung\",\"file\":\"bandung.jpg\",\"desc\":\"Kampus Pusat\"},{\"name\":\"Jakarta\",\"file\":\"jakarta.jpg\",\"desc\":\"Kampus Jakarta\"},{\"name\":\"Garut\",\"file\":\"Garut.jpg\",\"desc\":\"Kampus Garut\"},{\"name\":\"Tasikmalaya\",\"file\":\"tasik.jpg\",\"desc\":\"Kampus Tasikmalaya\"},{\"name\":\"Subang\",\"file\":\"Subang.jpg\",\"desc\":\"Kampus Subang\"},{\"name\":\"Serang\",\"file\":\"serang.jpg\",\"desc\":\"Kampus Serang\"},{\"name\":\"Kendal\",\"file\":\"kendal.jpg\",\"desc\":\"Kampus Kendal\"},{\"name\":\"Mataram\",\"file\":\"mataram.jpg\",\"desc\":\"Kampus Mataram\"}]'" json:"locations_items"`

	// Testimonials Section
	TestimonialsTitle    string `gorm:"size:255;default:'Testimoni'" json:"testimonials_title"`
	TestimonialsSubtitle string `gorm:"size:255;default:'Kata Mereka tentang UBK'" json:"testimonials_subtitle"`
	TestimonialsDesc     string `gorm:"type:text;default:'Pengalaman dari alumni dan mahasiswa yang telah merasakan langsung pendidikan di Universitas Bhakti Kencana.'" json:"testimonials_desc"`
	TestimonialsItems    string `gorm:"type:text;default:'[{\"name\":\"Aulia Rahman\",\"role\":\"Alumni Psikologi 2023\",\"image\":null,\"content\":\"Kuliah di UBK memberikan pengalaman luar biasa. Dosen-dosennya sangat mendukung dan fasilitas kampusnya lengkap. Saya bangga menjadi bagian dari Bhakti Kencana.\"},{\"name\":\"Dewi Sartika\",\"role\":\"Mahasiswi Keperawatan\",\"image\":null,\"content\":\"Program keperawatan UBK sangat berkualitas. Praktikum di rumah sakit mitra memberikan pengalaman nyata yang sangat berharga untuk persiapan karir.\"},{\"name\":\"Rizky Pratama\",\"role\":\"Alumni Informatika 2024\",\"image\":null,\"content\":\"Berkat bekal ilmu dan soft skill yang diajarkan di UBK, saya berhasil bekerja di perusahaan teknologi ternama. Kampus ini benar-benar mencetak lulusan siap kerja.\"}]'" json:"testimonials_items"`

	// News Section
	NewsTitle    string `gorm:"size:255;default:'Berita & Artikel'" json:"news_title"`
	NewsSubtitle string `gorm:"size:255;default:'Terbaru dari UBK'" json:"news_subtitle"`
	NewsDesc     string `gorm:"type:text;default:'Ikuti perkembangan terbaru tentang kegiatan, prestasi, dan pengumuman dari Universitas Bhakti Kencana.'" json:"news_desc"`
	NewsItems    string `gorm:"type:text;default:'[{\"title\":\"UBK Buka Pendaftaran Mahasiswa Baru 2026/2027\",\"category\":\"Pengumuman\",\"date\":\"13 Juni 2026\",\"excerpt\":\"Universitas Bhakti Kencana resmi membuka pendaftaran mahasiswa baru tahun akademik 2026/2027 melalui jalur prestasi dan reguler.\",\"image\":null},{\"title\":\"Tim Robotik UBK Raih Medali Emas di Kontes Robot Nasional\",\"category\":\"Prestasi\",\"date\":\"10 Juni 2026\",\"excerpt\":\"Mahasiswa Fakultas Sains dan Teknologi UBK berhasil meraih medali emas dalam Kontes Robot Nasional 2026.\",\"image\":null},{\"title\":\"Kerja Sama UBK dengan 10 Rumah Sakit Tingkatkan Mutu Praktik\",\"category\":\"Kerja Sama\",\"date\":\"5 Juni 2026\",\"excerpt\":\"Fakultas Ilmu Kesehatan UBK menjalin kerja sama dengan 10 rumah sakit untuk meningkatkan kualitas praktik mahasiswa.\",\"image\":null}]'" json:"news_items"`

	// CTA Section
	CtaTitle      string `gorm:"size:255;default:'Mulai Perjalananmu'" json:"cta_title"`
	CtaSubtitle   string `gorm:"size:255;default:'Siap Bergabung dengan UBK?'" json:"cta_subtitle"`
	CtaDesc       string `gorm:"type:text;default:'Daftar sekarang dan jadilah bagian dari 10.000+ mahasiswa yang telah memilih Universitas Bhakti Kencana sebagai tempat mengembangkan potensi diri.'" json:"cta_desc"`
	CtaButtonText string `gorm:"size:255;default:'Daftar Sekarang'" json:"cta_button_text"`
	CtaButtonLink string `gorm:"size:255;default:'/register'" json:"cta_button_link"`

	// Tentang Section
	TentangTitle    string `gorm:"size:255;default:'Tentang Universitas Bhakti Kencana'" json:"tentang_title"`
	TentangSubtitle string `gorm:"type:text;default:'Menjadi universitas unggulan dalam pengembangan ilmu pengetahuan, teknologi, dan seni yang berkarakter pada tahun 2035.'" json:"tentang_subtitle"`
	TentangVisi     string `gorm:"type:text;default:'Menjadi Universitas yang unggul dalam pengembangan ilmu pengetahuan, teknologi, dan seni yang berkarakter serta berdaya saing global pada tahun 2035.'" json:"tentang_visi"`
	TentangMisi     string `gorm:"type:text;default:'[\"Menyelenggarakan pendidikan tinggi yang bermutu dan berkarakter.\",\"Melaksanakan penelitian yang inovatif dan bermanfaat bagi masyarakat.\",\"Melaksanakan pengabdian kepada masyarakat berbasis ilmu pengetahuan.\",\"Mengembangkan tata kelola universitas yang profesional dan akuntabel.\",\"Memperkuat jejaring kerja sama nasional dan internasional.\"]'" json:"tentang_misi"`
	TentangSejarah  string `gorm:"type:text;default:'Universitas Bhakti Kencana (UBK) didirikan pada tahun 2005 oleh Yayasan Bhakti Kencana dengan visi untuk menyediakan pendidikan tinggi yang berkualitas dan terjangkau bagi masyarakat Indonesia.\\n\\nBerawal dari Sekolah Tinggi Ilmu Kesehatan (STIKes) Bhakti Kencana, institusi ini terus berkembang dan pada tahun 2015 resmi berubah status menjadi Universitas Bhakti Kencana dengan 5 fakultas dan 18 program studi.\\n\\nKini UBK memiliki 8 kampus yang tersebar di Pulau Jawa dan Lombok, dengan lebih dari 30 program studi dan 10.000 mahasiswa aktif. UBK berkomitmen untuk terus meningkatkan kualitas pendidikan, penelitian, dan pengabdian kepada masyarakat.'" json:"tentang_sejarah"`
	TentangLeaders  string `gorm:"type:text;default:'[{\"name\":\"Prof. Dr. H. Ahmad Fauzi, M.Pd.\",\"role\":\"Rektor\"},{\"name\":\"Dr. Hj. Siti Nurjanah, S.Kp., M.Kes.\",\"role\":\"Wakil Rektor I\"},{\"name\":\"Dr. Agus Wijaya, S.E., M.M.\",\"role\":\"Wakil Rektor II\"},{\"name\":\"Dr. Rina Marlina, S.Psi., M.Psi.\",\"role\":\"Wakil Rektor III\"}]'" json:"tentang_leaders"`

	// Kontak Section
	KontakTitle    string `gorm:"size:255;default:'Hubungi Kami'" json:"kontak_title"`
	KontakSubtitle string `gorm:"type:text;default:'Punya pertanyaan? Kami siap membantu Anda.'" json:"kontak_subtitle"`
	KontakEmail    string `gorm:"size:255;default:'info@ubk.ac.id, pmb@ubk.ac.id'" json:"kontak_email"`
	KontakPhone    string `gorm:"size:255;default:'(022) 1234-5678, (022) 5678-1234'" json:"kontak_phone"`
	KontakAddress  string `gorm:"type:text;default:'Jl. Soekarno Hatta No. 754, Bandung 40286'" json:"kontak_address"`
	KontakJamOpr   string `gorm:"type:text;default:'Senin - Jumat: 08.00 - 16.00\\nSabtu: 08.00 - 12.00'" json:"kontak_jam_opr"`

	// Program Studi Section
	ProdiPageTitle    string `gorm:"size:255;default:'Program Studi'" json:"prodi_page_title"`
	ProdiPageSubtitle string `gorm:"type:text;default:'Jelajahi berbagai program studi unggulan di Universitas Bhakti Kencana'" json:"prodi_page_subtitle"`

	// Berita Section
	BeritaPageTitle    string `gorm:"size:255;default:'Berita & Artikel'" json:"berita_page_title"`
	BeritaPageSubtitle string `gorm:"type:text;default:'Dapatkan informasi terbaru seputar kampus, prestasi, dan kegiatan mahasiswa.'" json:"berita_page_subtitle"`

	// Footer Section
	FooterDesc      string `gorm:"type:text;default:'Menjadi universitas unggulan dalam pengembangan ilmu pengetahuan, teknologi, dan seni yang berkarakter pada tahun 2035.'" json:"footer_desc"`
	FooterSocials   string `gorm:"type:text;default:'[{\"platform\":\"instagram\",\"url\":\"#\"},{\"platform\":\"youtube\",\"url\":\"#\"},{\"platform\":\"facebook\",\"url\":\"#\"},{\"platform\":\"twitter\",\"url\":\"#\"}]'" json:"footer_socials"`
	FooterCopyright string `gorm:"size:255;default:'Universitas Bhakti Kencana. All rights reserved.'" json:"footer_copyright"`

	// Legal Pages
	KebijakanPrivasi string `gorm:"type:text;default:'1. Pendahuluan\nSelamat datang di sistem informasi akademik Universitas Bhakti Kencana. Kebijakan Privasi ini menjelaskan bagaimana kami mengumpulkan, menggunakan, melindungi, dan mengungkapkan informasi pribadi Anda saat menggunakan layanan kami. Dengan mengakses situs ini, Anda menyetujui praktik yang dijelaskan dalam kebijakan ini.\n\n2. Informasi yang Kami Kumpulkan\nKami dapat mengumpulkan informasi identitas pribadi (seperti nama, alamat email, nomor telepon, dan data akademik) ketika Anda mendaftar, memperbarui profil, atau berinteraksi dengan layanan kami. Kami juga mengumpulkan informasi non-pribadi secara otomatis seperti alamat IP, jenis peramban (browser), dan riwayat aktivitas di sistem.\n\n3. Penggunaan Informasi\nInformasi yang kami kumpulkan digunakan untuk berbagai tujuan, antara lain:\n- Menyediakan, memelihara, dan meningkatkan layanan akademik kami.\n- Memproses transaksi atau pendaftaran.\n- Mengirimkan pemberitahuan penting, pembaruan, dan peringatan keamanan.\n- Menanggapi pertanyaan, komentar, dan permintaan bantuan Anda.\n- Mematuhi kewajiban hukum dan peraturan yang berlaku.\n\n4. Keamanan Data\nKami berkomitmen untuk melindungi data pribadi Anda. Kami menerapkan standar keamanan yang ketat dan menggunakan teknologi enkripsi untuk mencegah akses, pengungkapan, atau modifikasi yang tidak sah. Meskipun demikian, tidak ada metode transmisi data melalui internet yang 100% aman, sehingga kami tidak dapat menjamin keamanan mutlak.\n\n5. Berbagi Informasi dengan Pihak Ketiga\nKami tidak akan menjual, menyewakan, atau memperdagangkan informasi pribadi Anda kepada pihak ketiga. Informasi Anda mungkin dibagikan hanya kepada mitra penyedia layanan kami yang terikat oleh kewajiban kerahasiaan ketat, atau jika diwajibkan oleh hukum dan aparat penegak hukum.\n\n6. Hak Pengguna\nAnda berhak untuk mengakses, memperbarui, atau meminta penghapusan data pribadi Anda di dalam sistem kami, kecuali jika data tersebut harus dipertahankan untuk tujuan hukum atau administratif yang sah. Anda dapat menghubungi pihak administrasi kampus untuk mengajukan permintaan terkait data Anda.\n\n7. Perubahan pada Kebijakan Privasi Kami\nKami berhak untuk memperbarui atau mengubah Kebijakan Privasi ini kapan saja. Setiap perubahan akan diumumkan melalui situs web ini, dan penggunaan berkelanjutan Anda atas sistem setelah perubahan berarti Anda menerima kebijakan yang telah direvisi.\n\n8. Hubungi Kami\nJika Anda memiliki pertanyaan, keluhan, atau kekhawatiran terkait Kebijakan Privasi ini atau cara kami menangani data Anda, silakan hubungi bagian administrasi Universitas Bhakti Kencana melalui halaman Kontak yang tersedia.'" json:"kebijakan_privasi"`
	SyaratKetentuan  string `gorm:"type:text;default:'1. Penerimaan Syarat\nDengan mengakses, menelusuri, atau menggunakan sistem informasi akademik Universitas Bhakti Kencana ini, Anda mengakui bahwa Anda telah membaca, memahami, dan setuju untuk terikat oleh Syarat dan Ketentuan ini, serta semua hukum dan peraturan yang berlaku. Jika Anda tidak setuju, mohon untuk tidak menggunakan layanan ini.\n\n2. Lisensi dan Akses Penggunaan\nUniversitas Bhakti Kencana memberikan Anda lisensi terbatas, non-eksklusif, dan tidak dapat dipindahtangankan untuk mengakses dan menggunakan sistem ini secara pribadi untuk tujuan akademik dan administratif. Anda dilarang mengunduh (selain caching halaman), memodifikasi, merekayasa balik (reverse engineer), atau menggunakan materi sistem ini untuk tujuan komersial apa pun tanpa izin tertulis dari pihak universitas.\n\n3. Tanggung Jawab Pengguna (Akun)\nJika Anda diberikan kredensial login (username dan password), Anda sepenuhnya bertanggung jawab untuk menjaga kerahasiaan kredensial tersebut dan membatasi akses ke perangkat Anda. Anda bertanggung jawab penuh atas semua aktivitas yang terjadi di bawah akun Anda. Jika Anda mencurigai adanya akses tidak sah ke akun Anda, segera laporkan ke administrator sistem.\n\n4. Konten dan Perilaku Pengguna\nAnda setuju untuk menggunakan sistem ini hanya untuk tujuan yang sah secara hukum dan akademik. Anda dilarang memposting atau mengirimkan materi yang melanggar hukum, mengancam, memfitnah, cabul, menyinggung, atau dapat melanggar hak kekayaan intelektual pihak mana pun. Segala bentuk pelanggaran dapat mengakibatkan pembekuan atau penutupan akses akun Anda tanpa pemberitahuan sebelumnya.\n\n5. Hak Kekayaan Intelektual\nSemua konten yang terdapat di sistem ini, termasuk namun tidak terbatas pada teks, grafik, logo, ikon tombol, gambar, klip audio, unduhan digital, dan kompilasi data, adalah milik Universitas Bhakti Kencana atau penyedia kontennya dan dilindungi oleh undang-undang hak cipta Republik Indonesia dan internasional.\n\n6. Penafian Jaminan\nSistem ini dan seluruh informasi, konten, materi, produk, dan layanan yang disertakan di dalamnya disediakan oleh Universitas Bhakti Kencana dengan dasar \"sebagaimana adanya\" dan \"sebagaimana tersedia\". Universitas tidak membuat representasi atau jaminan dalam bentuk apa pun, tersurat maupun tersirat, mengenai pengoperasian situs ini atau keakuratan informasi di dalamnya.\n\n7. Batasan Tanggung Jawab\nDalam keadaan apa pun, Universitas Bhakti Kencana, para dosen, staf, maupun afiliasinya tidak akan bertanggung jawab atas kerugian langsung, tidak langsung, insidental, khusus, atau konsekuensial yang timbul dari penggunaan atau ketidakmampuan untuk menggunakan sistem ini, termasuk kegagalan sistem, kehilangan data, atau gangguan akses layanan.\n\n8. Hukum yang Berlaku\nSegala sengketa atau perselisihan yang berkaitan dengan penggunaan sistem informasi ini akan diselesaikan berdasarkan hukum yang berlaku di wilayah Republik Indonesia.\n\n9. Modifikasi Syarat Penggunaan\nUniversitas Bhakti Kencana berhak untuk merevisi, menambah, atau mengubah Syarat dan Ketentuan ini kapan saja tanpa pemberitahuan sebelumnya. Dengan terus menggunakan sistem ini setelah adanya perubahan, Anda setuju untuk terikat dengan versi Syarat dan Ketentuan yang terbaru.'" json:"syarat_ketentuan"`

	UpdatedByID *uint `gorm:"index" json:"updated_by_id"`
}

func (LandingSetting) TableName() string {
	return "public.landing_settings"
}
