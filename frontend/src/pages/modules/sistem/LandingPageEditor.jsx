import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { adminService, getPublicLandingSettings } from '@/services/api';
import toast, { Toaster } from 'react-hot-toast';
import { Loader2, Plus, Trash2, Save, LayoutTemplate, BarChart3, BookOpen, MapPin, MessageSquare, Newspaper, MousePointerClick, Info, Phone, Mail, Clock, Scale, Power } from 'lucide-react';

const MAIN_TABS = [
  { id: 'beranda', label: 'Halaman Beranda', icon: LayoutTemplate },
  { id: 'pmb', label: 'Pengaturan PMB', icon: Power },
  { id: 'tentang', label: 'Halaman Tentang', icon: BookOpen },
  { id: 'kontak', label: 'Halaman Kontak', icon: MapPin },
  { id: 'prodi', label: 'Halaman Program Studi', icon: BookOpen },
  { id: 'berita', label: 'Halaman Berita', icon: Newspaper },
  { id: 'legal', label: 'Halaman Legal', icon: Scale },
  { id: 'footer', label: 'Pengaturan Footer', icon: LayoutTemplate },
];

const BERANDA_TABS = [
  { id: 'hero', label: 'Hero Section', icon: LayoutTemplate },
  { id: 'stats', label: 'Fakta & Angka', icon: BarChart3 },
  { id: 'programs', label: 'Program Studi', icon: BookOpen },
  { id: 'locations', label: 'Lokasi Kampus', icon: MapPin },
  { id: 'testimonials', label: 'Testimoni', icon: MessageSquare },
  { id: 'news', label: 'Berita', icon: Newspaper },
  { id: 'cta', label: 'Call to Action', icon: MousePointerClick },
];

const AVAILABLE_ICONS = [
  { value: 'GraduationCap', label: 'Topi Toga (GraduationCap)' },
  { value: 'Building2', label: 'Gedung (Building2)' },
  { value: 'Users', label: 'Pengguna (Users)' },
  { value: 'Award', label: 'Penghargaan (Award)' },
  { value: 'BookOpen', label: 'Buku Terbuka (BookOpen)' },
  { value: 'Globe', label: 'Global (Globe)' },
  { value: 'Heart', label: 'Hati (Heart)' },
  { value: 'Stethoscope', label: 'Stetoskop (Stethoscope)' },
  { value: 'Microscope', label: 'Mikroskop (Microscope)' },
  { value: 'Laptop', label: 'Laptop (Laptop)' },
  { value: 'Activity', label: 'Aktivitas Medis (Activity)' },
  { value: 'Syringe', label: 'Suntikan (Syringe)' },
  { value: 'FlaskConical', label: 'Tabung Kimia (FlaskConical)' },
  { value: 'Briefcase', label: 'Tas Kerja (Briefcase)' },
  { value: 'Monitor', label: 'Monitor (Monitor)' },
  { value: 'Library', label: 'Perpustakaan (Library)' },
  { value: 'MapPin', label: 'Lokasi (MapPin)' },
  { value: 'Trophy', label: 'Piala (Trophy)' },
  { value: 'Star', label: 'Bintang (Star)' },
  { value: 'Medal', label: 'Medali (Medal)' },
];

const ProdiListEditor = ({ nestIndex, control, register }) => {
  const { fields, remove, append } = useFieldArray({
    control,
    name: `programs_list.${nestIndex}.programs_array`
  });

  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-gray-500 mb-2">Daftar Program Studi</label>
      <div className="space-y-2">
        {fields.map((item, k) => (
          <div key={item.id} className="flex gap-2">
            <input
              {...register(`programs_list.${nestIndex}.programs_array.${k}.name`)}
              placeholder="Contoh: Keperawatan (S1)"
              className="w-full px-3 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-[var(--theme-primary)]"
            />
            <button
              type="button"
              onClick={() => remove(k)}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-md shrink-0 border border-transparent hover:border-red-200 transition-colors"
              title="Hapus Prodi"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => append({ name: '' })}
        className="mt-2 flex items-center text-xs text-[var(--theme-primary)] hover:opacity-80 bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 px-2 py-1 rounded transition-colors"
      >
        <Plus className="w-3 h-3 mr-1" /> Tambah Prodi
      </button>
    </div>
  );
};

export default function LandingPageEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState('beranda');
  const [activeBerandaTab, setActiveBerandaTab] = useState('hero');

  const { register, control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      hero_badge: '',
      hero_title: '',
      hero_subtitle: '',
      stats: [],
      stats_section_title: '',
      stats_section_subtitle: '',
      stats_section_desc: '',
      stats_list: [],
      programs_title: '',
      programs_subtitle: '',
      programs_desc: '',
      programs_list: [],
      locations_title: '',
      locations_subtitle: '',
      locations_desc: '',
      locations_list: [],
      testimonials_title: '',
      testimonials_subtitle: '',
      testimonials_desc: '',
      testimonials_list: [],
      news_title: '',
      news_subtitle: '',
      news_desc: '',
      news_desc: '',
      cta_title: '',
      cta_subtitle: '',
      cta_desc: '',
      cta_button_text: '',
      cta_button_link: '',

      // Tentang
      tentang_title: '',
      tentang_subtitle: '',
      tentang_visi: '',
      tentang_misi: '',
      tentang_sejarah: '',
      tentang_leaders: [],

      // Kontak
      kontak_title: '',
      kontak_subtitle: '',
      kontak_email: '',
      kontak_phone: '',
      kontak_address: '',
      kontak_jam_opr: '',

      // Prodi
      prodi_page_title: '',
      prodi_page_subtitle: '',

      // Berita
      berita_page_title: '',
      berita_page_subtitle: '',

      // Legal
      kebijakan_privasi: '',
      syarat_ketentuan: '',

      // Footer
      footer_desc: '',
      footer_copyright: '',
      footer_socials: [],

      // PMB
      is_pmb_open: true,
    }
  });

  const { fields: tentangLeadersFields, append: appendTentangLeaders, remove: removeTentangLeaders } = useFieldArray({
    control,
    name: "tentang_leaders"
  });

  const { fields: statsFields, append: appendStats, remove: removeStats } = useFieldArray({
    control,
    name: "stats"
  });

  const { fields: statsListFields, append: appendStatsList, remove: removeStatsList } = useFieldArray({
    control,
    name: "stats_list"
  });

  const { fields: programsFields, append: appendPrograms, remove: removePrograms } = useFieldArray({
    control,
    name: "programs_list"
  });

  const { fields: locationsFields, append: appendLocations, remove: removeLocations } = useFieldArray({
    control,
    name: "locations_list"
  });

  const { fields: testimonialsFields, append: appendTestimonials, remove: removeTestimonials } = useFieldArray({
    control,
    name: "testimonials_list"
  });

  const { fields: socialsFields, append: appendSocials, remove: removeSocials } = useFieldArray({
    control,
    name: "footer_socials"
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await getPublicLandingSettings();
      if (res?.data) {
        let parsedStats = [];
        let parsedStatsList = [];
        let parsedProgramsList = [];
        let parsedLocationsList = [];
        let parsedTestimonialsList = [];

        let parsedTentangLeaders = [];
        let parsedTentangMisi = [];
        
        try { 
          parsedStats = JSON.parse(res.data.stats_json || '[]'); 
          if (parsedStats.length === 0) {
            parsedStats = [
              { value: '30+', label: 'Program Studi' },
              { value: '8', label: 'Kampus Tersebar' },
              { value: '10.000+', label: 'Total Mahasiswa' },
              { value: 'A', label: 'Akreditasi' }
            ];
          }

          const realStats = res.real_stats || {};
          parsedStats = parsedStats.map(stat => {
            if (stat.label.toLowerCase().includes('mahasiswa') && realStats.mahasiswa_aktif !== undefined) {
              const formatted = realStats.mahasiswa_aktif.toLocaleString('id-ID') + (realStats.mahasiswa_aktif > 1000 ? '+' : '');
              return { ...stat, value: formatted };
            }
            if (stat.label.toLowerCase().includes('program studi') && realStats.prodi !== undefined) {
              return { ...stat, value: realStats.prodi.toString() + '+' };
            }
            return stat;
          });
        } catch(e) {}
        try { parsedStatsList = JSON.parse(res.data.stats_section_items || '[]'); } catch(e) {}
        try { 
            parsedProgramsList = JSON.parse(res.data.programs_items || '[]'); 
            parsedProgramsList = parsedProgramsList.map(p => ({
                ...p,
                programs_array: Array.isArray(p.programs) ? p.programs.map(name => ({ name })) : []
            }));
        } catch(e) {}
        try { parsedLocationsList = JSON.parse(res.data.locations_items || '[]'); } catch(e) {}
        try { parsedTestimonialsList = JSON.parse(res.data.testimonials_items || '[]'); } catch(e) {}

        try { parsedTentangLeaders = JSON.parse(res.data.tentang_leaders || '[]'); } catch(e) {}
        try { 
            const arr = JSON.parse(res.data.tentang_misi || '[]'); 
            parsedTentangMisi = Array.isArray(arr) ? arr.join('\n') : arr;
        } catch(e) {
            parsedTentangMisi = res.data.tentang_misi || '';
        }

        let parsedSocials = [];
        try { parsedSocials = JSON.parse(res.data.footer_socials || '[]'); } catch(e) {}

        reset({
          hero_badge: res.data.hero_badge || '',
          hero_title: res.data.hero_title || '',
          hero_subtitle: res.data.hero_subtitle || '',
          stats: parsedStats,
          stats_section_title: res.data.stats_section_title || '',
          stats_section_subtitle: res.data.stats_section_subtitle || '',
          stats_section_desc: res.data.stats_section_desc || '',
          stats_list: parsedStatsList,
          programs_title: res.data.programs_title || '',
          programs_subtitle: res.data.programs_subtitle || '',
          programs_desc: res.data.programs_desc || '',
          programs_list: parsedProgramsList,
          locations_title: res.data.locations_title || '',
          locations_subtitle: res.data.locations_subtitle || '',
          locations_desc: res.data.locations_desc || '',
          locations_list: parsedLocationsList,
          testimonials_title: res.data.testimonials_title || '',
          testimonials_subtitle: res.data.testimonials_subtitle || '',
          testimonials_desc: res.data.testimonials_desc || '',
          testimonials_list: parsedTestimonialsList,
          news_title: res.data.news_title || '',
          news_subtitle: res.data.news_subtitle || '',
          news_desc: res.data.news_desc || '',

          cta_title: res.data.cta_title || '',
          cta_subtitle: res.data.cta_subtitle || '',
          cta_desc: res.data.cta_desc || '',
          cta_button_text: res.data.cta_button_text || '',
          cta_button_link: res.data.cta_button_link || '',

          tentang_title: res.data.tentang_title || '',
          tentang_subtitle: res.data.tentang_subtitle || '',
          tentang_visi: res.data.tentang_visi || '',
          tentang_misi: parsedTentangMisi,
          tentang_sejarah: res.data.tentang_sejarah || '',
          tentang_leaders: parsedTentangLeaders,

          kontak_title: res.data.kontak_title || '',
          kontak_subtitle: res.data.kontak_subtitle || '',
          kontak_email: res.data.kontak_email || '',
          kontak_phone: res.data.kontak_phone || '',
          kontak_address: res.data.kontak_address || '',
          kontak_jam_opr: res.data.kontak_jam_opr || '',

          prodi_page_title: res.data.prodi_page_title || '',
          prodi_page_subtitle: res.data.prodi_page_subtitle || '',

          berita_page_title: res.data.berita_page_title || '',
          berita_page_subtitle: res.data.berita_page_subtitle || '',

          kebijakan_privasi: res.data.kebijakan_privasi || '',
          syarat_ketentuan: res.data.syarat_ketentuan || '',

          footer_desc: res.data.footer_desc || '',
          footer_copyright: res.data.footer_copyright || '',
          footer_socials: parsedSocials,

          is_pmb_open: res.data.is_pmb_open !== undefined ? res.data.is_pmb_open : true,
        });
      }
    } catch (error) {
      toast.error('Gagal mengambil data pengaturan landing page');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setSaving(true);
      const payload = {
        ...data,
        stats_json: JSON.stringify(data.stats),
        stats_section_items: JSON.stringify(data.stats_list),
        programs_items: JSON.stringify(data.programs_list.map(p => ({
            faculty: p.faculty, 
            icon: p.icon, 
            color: p.color, 
            programs: (p.programs_array || []).map(s => (s.name || '').trim()).filter(Boolean)
        }))),
        locations_items: JSON.stringify(data.locations_list),
        testimonials_items: JSON.stringify(data.testimonials_list),

        tentang_misi: JSON.stringify((data.tentang_misi || '').split('\n').filter(Boolean)),
        tentang_leaders: JSON.stringify(data.tentang_leaders),

        footer_socials: JSON.stringify(data.footer_socials),
      };
      
      delete payload.stats;
      delete payload.stats_list;
      delete payload.programs_list;
      delete payload.locations_list;
      delete payload.testimonials_list;


      await adminService.updateLandingSettings(payload);
      toast.success('Pengaturan landing page berhasil disimpan');
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--theme-primary)]" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-12 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Landing Page Editor</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola konten halaman beranda publik Anda dari sini.</p>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={saving}
          className="flex items-center px-6 py-2 bg-[var(--theme-primary)] text-white rounded-lg hover:bg-[var(--theme-primary)] disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          {saving ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
          Simpan Semua
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex flex-col">
              {MAIN_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeMainTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveMainTab(tab.id)}
                    className={`flex items-center px-4 py-3 text-sm font-medium transition-colors border-l-4 ${
                      isActive
                        ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-[var(--theme-primary)]'
                        : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[var(--theme-primary)]' : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <form id="landing-settings-form" onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* --- BERANDA TABS --- */}
            <div className={activeMainTab === 'beranda' ? 'block' : 'hidden'}>
              {/* Beranda Sub-tabs */}
              <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50/50">
                {BERANDA_TABS.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveBerandaTab(tab.id)}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeBerandaTab === tab.id
                        ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* HERO TAB */}
              <div className={`p-6 space-y-6 ${activeBerandaTab === 'hero' ? 'block' : 'hidden'}`}>
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Hero Section</h2>
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge Text</label>
                  <input {...register("hero_badge")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama</label>
                  <input {...register("hero_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subjudul</label>
                  <textarea {...register("hero_subtitle")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-800">Statistik Bawah Hero</h3>
                    <button type="button" onClick={() => appendStats({ value: '', label: '' })} className="flex items-center text-sm text-[var(--theme-primary)] hover:opacity-80">
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </button>
                  </div>
                  <div className="space-y-3">
                    {statsFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <input {...register(`stats.${index}.value`)} placeholder="Nilai (e.g. 30+)" className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                        <div className="flex-1">
                          <input {...register(`stats.${index}.label`)} placeholder="Label (e.g. Program Studi)" className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                        <button type="button" onClick={() => removeStats(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* STATS TAB */}
            <div className={`p-6 space-y-6 ${activeBerandaTab === 'stats' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Fakta & Angka</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge / Pre-title</label>
                  <input {...register("stats_section_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Seksi</label>
                  <input {...register("stats_section_subtitle")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea {...register("stats_section_desc")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-800">Daftar Fakta & Angka</h3>
                    <button type="button" onClick={() => appendStatsList({ icon: '', value: '', label: '' })} className="flex items-center text-sm text-[var(--theme-primary)] hover:opacity-80">
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </button>
                  </div>
                  <div className="space-y-3">
                    {statsListFields.map((field, index) => (
                      <div key={field.id} className="flex flex-wrap gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-full sm:w-auto flex-1">
                          <select {...register(`stats_list.${index}.icon`)} className="w-full px-3 py-2 text-sm border rounded-md bg-white">
                            <option value="">Pilih Icon...</option>
                            {AVAILABLE_ICONS.map(icon => (
                              <option key={icon.value} value={icon.value}>{icon.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full sm:w-auto flex-1">
                          <input {...register(`stats_list.${index}.value`)} placeholder="Nilai (e.g. 30+)" className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                        <div className="w-full sm:w-auto flex-[2]">
                          <input {...register(`stats_list.${index}.label`)} placeholder="Label (e.g. Program Studi)" className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                        <button type="button" onClick={() => removeStatsList(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Gunakan nama icon Lucide (misal: GraduationCap, Building2, Users, Award, BookOpen, Globe).</p>
                </div>
              </div>
            </div>

            {/* PROGRAMS TAB */}
            <div className={`p-6 space-y-6 ${activeBerandaTab === 'programs' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Program Studi</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge / Pre-title</label>
                  <input {...register("programs_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Seksi</label>
                  <input {...register("programs_subtitle")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea {...register("programs_desc")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-800">Daftar Fakultas & Program Studi</h3>
                    <button type="button" onClick={() => appendPrograms({ faculty: '', icon: '', programs_array: [] })} className="flex items-center text-sm text-[var(--theme-primary)] hover:opacity-80">
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </button>
                  </div>
                  <div className="space-y-4">
                    {programsFields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                        <button type="button" onClick={() => removePrograms(index)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nama Fakultas</label>
                            <input {...register(`programs_list.${index}.faculty`)} placeholder="Fakultas Ilmu Kesehatan" className="w-full px-3 py-2 text-sm border rounded-md" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Icon</label>
                            <select {...register(`programs_list.${index}.icon`)} className="w-full px-3 py-2 text-sm border rounded-md bg-white">
                              <option value="">Pilih Icon...</option>
                              {AVAILABLE_ICONS.map(icon => (
                                <option key={icon.value} value={icon.value}>{icon.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <ProdiListEditor nestIndex={index} control={control} register={register} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* LOCATIONS TAB */}
            <div className={`p-6 space-y-6 ${activeBerandaTab === 'locations' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Lokasi Kampus</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge / Pre-title</label>
                  <input {...register("locations_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Seksi</label>
                  <input {...register("locations_subtitle")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea {...register("locations_desc")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-800">Daftar Lokasi Kampus</h3>
                    <button type="button" onClick={() => appendLocations({ name: '', file: '', desc: '' })} className="flex items-center text-sm text-[var(--theme-primary)] hover:opacity-80">
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </button>
                  </div>
                  <div className="space-y-3">
                    {locationsFields.map((field, index) => (
                      <div key={field.id} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                        <button type="button" onClick={() => removeLocations(index)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-md z-10 bg-white shadow-sm border border-red-100">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nama Kota</label>
                            <input {...register(`locations_list.${index}.name`)} placeholder="e.g. Bandung" className="w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] outline-none" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nama Kampus</label>
                            <input {...register(`locations_list.${index}.desc`)} placeholder="e.g. Kampus Pusat" className="w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] outline-none" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Alamat Lengkap</label>
                            <input {...register(`locations_list.${index}.address`)} placeholder="e.g. Jl. Soekarno Hatta No. 754" className="w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] outline-none" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Link Google Maps</label>
                            <input {...register(`locations_list.${index}.gmaps_url`)} placeholder="https://maps.app.goo.gl/..." className="w-full px-3 py-2 text-sm border rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] outline-none" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">Gambar Kampus</label>
                            <div className="flex gap-4 items-center">
                              {watch(`locations_list.${index}.file`) && (
                                <img src={watch(`locations_list.${index}.file`).startsWith('http') || watch(`locations_list.${index}.file`).startsWith('/') ? watch(`locations_list.${index}.file`) : `/images/Kampus/${watch(`locations_list.${index}.file`)}`} alt="Preview" className="h-14 w-20 object-cover rounded border bg-white" />
                              )}
                              <div className="flex-1">
                                <input type="file" accept="image/*" onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const formData = new FormData();
                                  formData.append("image", file);
                                  try {
                                    toast.loading('Mengunggah gambar...', { id: `upload_${index}` });
                                    const res = await adminService.uploadImage(formData);
                                    toast.dismiss(`upload_${index}`);
                                    toast.success('Gambar berhasil diunggah');
                                    setValue(`locations_list.${index}.file`, res.url || res.data?.url);
                                  } catch (err) {
                                    toast.dismiss(`upload_${index}`);
                                    toast.error('Gagal mengunggah gambar');
                                  }
                                }} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-[var(--theme-primary)]/10 file:text-[var(--theme-primary)] hover:file:bg-[var(--theme-primary)]/20 cursor-pointer" />
                                <input type="hidden" {...register(`locations_list.${index}.file`)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Nama file akan merujuk pada gambar di folder `/public/images/Kampus/`.</p>
                </div>
              </div>
            </div>

            {/* TESTIMONIALS TAB */}
            <div className={`p-6 space-y-6 ${activeBerandaTab === 'testimonials' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Testimoni</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge / Pre-title</label>
                  <input {...register("testimonials_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Seksi</label>
                  <input {...register("testimonials_subtitle")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea {...register("testimonials_desc")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-800">Daftar Testimoni</h3>
                    <button type="button" onClick={() => appendTestimonials({ name: '', role: '', content: '', image: null })} className="flex items-center text-sm text-[var(--theme-primary)] hover:opacity-80">
                      <Plus className="w-4 h-4 mr-1" /> Tambah
                    </button>
                  </div>
                  <div className="space-y-4">
                    {testimonialsFields.map((field, index) => (
                      <div key={field.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
                        <button type="button" onClick={() => removeTestimonials(index)} className="absolute top-2 right-2 p-1.5 text-red-500 hover:bg-red-50 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Nama</label>
                            <input {...register(`testimonials_list.${index}.name`)} placeholder="Aulia Rahman" className="w-full px-3 py-2 text-sm border rounded-md" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Peran / Status</label>
                            <input {...register(`testimonials_list.${index}.role`)} placeholder="Alumni Psikologi 2023" className="w-full px-3 py-2 text-sm border rounded-md" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Isi Testimoni</label>
                          <textarea {...register(`testimonials_list.${index}.content`)} rows={2} placeholder="Kuliah di UBK memberikan..." className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* NEWS TAB */}
            <div className={`p-6 space-y-6 ${activeBerandaTab === 'news' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Berita</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge / Pre-title</label>
                  <input {...register("news_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Seksi</label>
                  <input {...register("news_subtitle")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea {...register("news_desc")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>

              </div>
            </div>

            {/* CTA TAB */}
            <div className={`p-6 space-y-6 ${activeBerandaTab === 'cta' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Call to Action</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Badge / Pre-title</label>
                  <input {...register("cta_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama</label>
                  <input {...register("cta_subtitle")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea {...register("cta_desc")} rows={4} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teks Tombol</label>
                    <input {...register("cta_button_text")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link Tombol</label>
                    <input {...register("cta_button_link")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)]" />
                  </div>
                </div>
              </div>
            </div>

            </div> {/* End of Beranda Tabs wrapper */}

            {/* --- PMB TAB --- */}
            <div className={`p-6 space-y-6 ${activeMainTab === 'pmb' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Pengaturan Pendaftaran Mahasiswa Baru (PMB)</h2>
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl flex items-start gap-4">
                  <div className="mt-1">
                    <Power className={`w-6 h-6 ${watch('is_pmb_open') ? 'text-green-500' : 'text-red-500'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-gray-800">Status Pendaftaran</h3>
                    <p className="text-xs text-gray-500 mt-1 mb-3">
                      Gunakan tombol ini untuk membuka atau menutup akses pendaftaran PMB secara global. 
                      Jika dimatikan, semua tombol pendaftaran di Landing Page akan disembunyikan dan rute pendaftaran akan diblokir.
                    </p>
                    
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" {...register('is_pmb_open')} />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--theme-primary)]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--theme-primary)]"></div>
                      <span className="ml-3 text-sm font-bold text-gray-700">
                        {watch('is_pmb_open') ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* --- TENTANG TAB --- */}
            <div className={`p-6 space-y-6 ${activeMainTab === 'tentang' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Halaman Tentang Kami</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama Halaman</label>
                  <input {...register("tentang_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Tentang Universitas Bhakti Kencana" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slogan Bawah Judul (Subtitle)</label>
                  <textarea {...register("tentang_subtitle")} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Menjadi universitas unggulan..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Visi Universitas</label>
                  <textarea {...register("tentang_visi")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Masukkan visi universitas di sini" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Misi Universitas</label>
                  <p className="text-xs text-gray-500 mb-2">Pisahkan setiap misi dengan garis baru (Enter)</p>
                  <textarea {...register("tentang_misi")} rows={5} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Misi 1&#10;Misi 2&#10;Misi 3" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sejarah Universitas</label>
                  <p className="text-xs text-gray-500 mb-2">Gunakan enter untuk memisahkan paragraf</p>
                  <textarea {...register("tentang_sejarah")} rows={6} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Tuliskan sejarah universitas..." />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-800">Daftar Pimpinan Universitas</h3>
                    <button type="button" onClick={() => appendTentangLeaders({ name: '', role: '' })} className="flex items-center text-sm text-[var(--theme-primary)] hover:opacity-80">
                      <Plus className="w-4 h-4 mr-1" /> Tambah Pimpinan
                    </button>
                  </div>
                  <div className="space-y-3">
                    {tentangLeadersFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Nama Lengkap & Gelar</label>
                          <input {...register(`tentang_leaders.${index}.name`)} placeholder="Contoh: Prof. Dr. H. Ahmad Fauzi, M.Pd." className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">Jabatan</label>
                          <input {...register(`tentang_leaders.${index}.role`)} placeholder="Contoh: Rektor" className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                        <button type="button" onClick={() => removeTentangLeaders(index)} className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* --- KONTAK TAB --- */}
            <div className={`p-6 space-y-6 ${activeMainTab === 'kontak' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Halaman Kontak</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama Halaman</label>
                  <input {...register("kontak_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Hubungi Kami" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slogan Bawah Judul (Subtitle)</label>
                  <textarea {...register("kontak_subtitle")} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Punya pertanyaan? Kami siap membantu Anda." />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Email</label>
                    <p className="text-xs text-gray-500 mb-2">Pisahkan dengan koma jika lebih dari satu</p>
                    <input {...register("kontak_email")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="info@ubk.ac.id, pmb@ubk.ac.id" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Telepon</label>
                    <p className="text-xs text-gray-500 mb-2">Pisahkan dengan koma jika lebih dari satu</p>
                    <input {...register("kontak_phone")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="(022) 1234-5678, (022) 5678-1234" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Kantor Pusat</label>
                  <textarea {...register("kontak_address")} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Jl. Soekarno Hatta No. 754, Bandung 40286" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jam Operasional</label>
                  <p className="text-xs text-gray-500 mb-2">Gunakan enter untuk baris baru</p>
                  <textarea {...register("kontak_jam_opr")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Senin - Jumat: 08.00 - 16.00&#10;Sabtu: 08.00 - 12.00" />
                </div>
                <div className="bg-[var(--theme-primary)]/10 p-4 rounded-lg flex items-start gap-3 mt-4">
                  <Info className="w-5 h-5 text-[var(--theme-primary)] shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <strong>Catatan:</strong> Daftar lokasi kampus yang ada di bagian bawah halaman kontak akan mengambil data secara otomatis dari tab <strong>"Beranda" &gt; "Lokasi Kampus"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* --- PRODI TAB --- */}
            <div className={`p-6 space-y-6 ${activeMainTab === 'prodi' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Halaman Program Studi</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama Halaman</label>
                  <input {...register("prodi_page_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Program Studi" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slogan Bawah Judul (Subtitle)</label>
                  <textarea {...register("prodi_page_subtitle")} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Jelajahi berbagai program studi unggulan..." />
                </div>
                <div className="bg-[var(--theme-primary)]/10 p-4 rounded-lg flex items-start gap-3 mt-4">
                  <Info className="w-5 h-5 text-[var(--theme-primary)] shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <strong>Catatan:</strong> Daftar Fakultas dan Program Studi akan mengambil data secara otomatis dari tab <strong>"Beranda" &gt; "Program Studi"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* --- BERITA TAB --- */}
            <div className={`p-6 space-y-6 ${activeMainTab === 'berita' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Halaman Berita</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul Utama Halaman</label>
                  <input {...register("berita_page_title")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Berita & Artikel" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slogan Bawah Judul (Subtitle)</label>
                  <textarea {...register("berita_page_subtitle")} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Contoh: Dapatkan informasi terbaru seputar kampus..." />
                </div>
                <div className="bg-[var(--theme-primary)]/10 p-4 rounded-lg flex items-start gap-3 mt-4">
                  <Info className="w-5 h-5 text-[var(--theme-primary)] shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    <strong>Catatan:</strong> Daftar Berita Utama yang ditampilkan akan mengambil data secara otomatis dari tab <strong>"Beranda" &gt; "Berita"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* --- LEGAL TAB --- */}
            <div className={`p-6 space-y-6 ${activeMainTab === 'legal' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Halaman Legal</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kebijakan Privasi</label>
                  <p className="text-xs text-gray-500 mb-2">Gunakan enter (baris baru) untuk memisahkan paragraf. Jangan gunakan tag HTML.</p>
                  <textarea {...register("kebijakan_privasi")} rows={15} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-sm" placeholder="1. Pendahuluan..." />
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Syarat & Ketentuan</label>
                  <p className="text-xs text-gray-500 mb-2">Gunakan enter (baris baru) untuk memisahkan paragraf. Jangan gunakan tag HTML.</p>
                  <textarea {...register("syarat_ketentuan")} rows={15} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] text-sm" placeholder="1. Penerimaan Syarat..." />
                </div>
              </div>
            </div>

            {/* --- FOOTER TAB --- */}
            <div className={`p-6 space-y-6 ${activeMainTab === 'footer' ? 'block' : 'hidden'}`}>
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Pengaturan Footer</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi Footer</label>
                  <textarea {...register("footer_desc")} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Menjadi universitas unggulan..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Copyright Text</label>
                  <input {...register("footer_copyright")} type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)]" placeholder="Universitas Bhakti Kencana. All rights reserved." />
                </div>
                
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-gray-800">Tautan Sosial Media</h3>
                    <button type="button" onClick={() => appendSocials({ platform: '', url: '' })} className="flex items-center text-sm text-[var(--theme-primary)] hover:opacity-80">
                      <Plus className="w-4 h-4 mr-1" /> Tambah Sosmed
                    </button>
                  </div>
                  <div className="space-y-3">
                    {socialsFields.map((field, index) => (
                      <div key={field.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-1/3">
                          <label className="block text-xs text-gray-500 mb-1">Platform</label>
                          <select {...register(`footer_socials.${index}.platform`)} className="w-full px-3 py-2 text-sm border rounded-md bg-white">
                            <option value="">Pilih...</option>
                            <option value="instagram">Instagram</option>
                            <option value="youtube">YouTube</option>
                            <option value="facebook">Facebook</option>
                            <option value="twitter">Twitter</option>
                            <option value="tiktok">TikTok</option>
                            <option value="linkedin">LinkedIn</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs text-gray-500 mb-1">URL / Link</label>
                          <input {...register(`footer_socials.${index}.url`)} placeholder="https://instagram.com/..." className="w-full px-3 py-2 text-sm border rounded-md" />
                        </div>
                        <button type="button" onClick={() => removeSocials(index)} className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-md">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
