import React, { useEffect, useMemo, useState } from 'react';
import { psychologistService } from '@/services/api';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DialogModal } from '@/components/ui/DialogModal';

// Icons
const NoteIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>edit_document</span>;
const CheckIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>task_alt</span>;
const WarningIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>error</span>;
const HeartIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>favorite</span>;

export default function MedicalRecords() {
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFakultas, setSelectedFakultas] = useState('Semua Fakultas');
  const [selectedProdi, setSelectedProdi] = useState('Semua Prodi');

  const [fakultasList, setFakultasList] = useState([]);
  const [prodiList, setProdiList] = useState([]);

  // Detail Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  useEffect(() => {
    let ignore = false;
    loadMedicalRecords();
    psychologistService.getFakultasList().then((res) => {
      if (!ignore) setFakultasList(res.data || []);
    });
    psychologistService.getProdiList().then((res) => {
      if (!ignore) setProdiList(res.data || []);
    });
    return () => { ignore = true; };
  }, []);

  const loadMedicalRecords = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await psychologistService.getMedicalRecords();
      if (res.status === 'success') {
        const flattened = (res.data || []).map(item => {
          const m = item.mahasiswa || {};
          return {
            ...item,
            _fakultas: item.mahasiswa_fakultas ?? m.Fakultas?.Nama ?? '',
            _prodi: item.mahasiswa_prodi ?? m.ProgramStudi?.Nama ?? '',
            _name: item.mahasiswa_name ?? m.Nama ?? '',
            _nim: item.mahasiswa_nim ?? m.NIM ?? ''
          };
        });
        setMedicalRecords(flattened);
      } else {
        setError('Gagal memuat rekam medis');
      }
    } catch (err) {
      console.error('Error loading medical records:', err);
      setError('Koneksi sistem terputus / Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const filteredProdis = useMemo(() => {
    if (selectedFakultas === 'Semua Fakultas') return [];
    const selectedFak = fakultasList.find(f => f.nama === selectedFakultas);
    if (!selectedFak) return [];
    return prodiList.filter(p => p.fakultas_id === selectedFak.id);
  }, [selectedFakultas, prodiList, fakultasList]);

  const handleFakultasChange = (val) => {
    setSelectedFakultas(val);
    setSelectedProdi('Semua Prodi');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Stabil': return { bg: 'color-mix(in srgb, var(--theme-success) 10%, transparent)', text: 'var(--theme-success)', border: 'color-mix(in srgb, var(--theme-success) 20%, transparent)', dot: 'var(--theme-success)', dotAnim: '' };
      case 'Perlu Perhatian': return { bg: 'color-mix(in srgb, var(--theme-error) 10%, transparent)', text: 'var(--theme-error)', border: 'color-mix(in srgb, var(--theme-error) 20%, transparent)', dot: 'var(--theme-error)', dotAnim: 'animate-pulse' };
      case 'Pemulihan': return { bg: 'color-mix(in srgb, var(--theme-info) 10%, transparent)', text: 'var(--theme-info)', border: 'color-mix(in srgb, var(--theme-info) 20%, transparent)', dot: 'var(--theme-info)', dotAnim: '' };
      default: return { bg: 'color-mix(in srgb, var(--theme-text-muted) 10%, transparent)', text: 'var(--theme-text-muted)', border: 'color-mix(in srgb, var(--theme-text-muted) 20%, transparent)', dot: 'var(--theme-text-muted)', dotAnim: '' };
    }
  };

  const filteredRecords = useMemo(() => {
    let result = [...medicalRecords];
    if (selectedFakultas !== 'Semua Fakultas') {
      result = result.filter(r => r._fakultas === selectedFakultas);
    }
    if (selectedProdi !== 'Semua Prodi') {
      result = result.filter(r => r._prodi === selectedProdi);
    }
    return result;
  }, [medicalRecords, selectedFakultas, selectedProdi]);

  const handleTableSearch = (data, searchVal) => {
    const query = searchVal.trim().toLowerCase();
    if (!query) return data;
    return data.filter((r) => {
      const searchableStr = [
        r._name,
        r._nim,
        r._fakultas,
        r._prodi,
        r.complaint,
        r.observation,
        r.recommendation,
        r.status_pasien,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableStr.includes(query);
    });
  };

  const columns = [
    {
      key: '_name',
      label: 'Identitas Pasien',
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden relative">
            {row.foto_url || row.foto ? (
              <img src={row.foto_url || row.foto} alt={row._name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">person</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 group-hover:text-primary transition-colors max-w-[200px]">{row._name}</p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{row._nim} &bull; {row._fakultas}</p>
          </div>
        </div>
      )
    },
    {
      key: 'kontak',
      label: 'Demografi & Kontak',
      render: (v, row) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined !text-[12px]">{row.jenis_kelamin === 'Perempuan' ? 'female' : 'male'}</span>
            </span>
            <div>
              <p className="text-[11px] font-bold text-slate-700">{row.jenis_kelamin || 'Tidak ada data'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined !text-[12px]">call</span>
            </span>
            <div>
              <p className="text-[10px] font-bold text-slate-500">{row.no_hp || 'Tidak ada data'}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Jadwal Pemeriksaan',
      sortable: true,
      render: (v, row) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined !text-[12px]">calendar_month</span>
            </span>
            <div>
              <p className="text-[11px] font-bold text-slate-700">{row.date || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined !text-[12px]">schedule</span>
            </span>
            <div>
              <p className="text-[10px] font-bold text-slate-500">{row.time || '-'} WIB</p>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Sesi & Mood',
      sortable: true,
      render: (v, row) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-primary/10 text-primary">
              <span className="material-symbols-outlined !text-[12px]">psychology</span>
            </span>
            <div>
              <p className="text-[11px] font-black text-slate-700">{row.type || 'Sesi Umum'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined !text-[12px]">mood</span>
            </span>
            <div>
              <p className="text-[10px] font-bold text-slate-500">Mood: {row.mood || '—'}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status_pasien',
      label: 'Status Klinis',
      sortable: true,
      render: (v, row) => {
        const statusStyle = getStatusColor(row.status_pasien);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotAnim}`} style={{ backgroundColor: statusStyle.dot }} />
            {row.status_pasien || '—'}
          </span>
        );
      }
    }
  ];

  const handleOpenDetail = (item) => {
    setDetailItem(item);
    setIsDetailOpen(true);
  };

  const getInitials = (name) => {
    if (!name) return '-';
    const parts = name.trim().split(/\s+/);
    return parts.map(p => p[0]).slice(0, 3).join('').toUpperCase();
  };

  const HeaderActions = (
    <div className="flex flex-col sm:flex-row gap-3 items-end">
      <div className="flex flex-col gap-1.5 w-full sm:w-auto">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Fakultas</label>
        <div className="relative">
          <select
            value={selectedFakultas}
            onChange={(e) => handleFakultasChange(e.target.value)}
            className="h-10 appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] pl-4 pr-8 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 cursor-pointer"
          >
            <option value="Semua Fakultas">Semua Fakultas</option>
            {fakultasList.map((f) => (
              <option key={f.id} value={f.nama}>{f.nama}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--theme-text-muted)] pointer-events-none">expand_more</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 w-full sm:w-auto">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Program Studi</label>
        <div className="relative">
          <select
            value={selectedProdi}
            onChange={(e) => setSelectedProdi(e.target.value)}
            disabled={selectedFakultas === 'Semua Fakultas'}
            className="h-10 appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] pl-4 pr-8 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="Semua Prodi">Semua Prodi</option>
            {filteredProdis.map((p) => (
              <option key={p.id} value={p.nama}>{p.nama}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--theme-text-muted)] pointer-events-none">expand_more</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full relative space-y-6 scroll-smooth">
        
        <DashboardHero 
          title="Catatan" 
          highlightedTitle="Medis" 
          subtitle="Lihat dan kelola rekam medis pasien dengan lengkap dan terstruktur." 
          icon="medical_services" 
          badges={[{ label: 'Rekam Medis Klinis', active: false }]} 
          actions={HeaderActions}
        />

        {/* Statistics Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <PrimaryStatsCard
            title="Total Rekam Medis"
            value={`${filteredRecords.length} Data`}
            icon={NoteIcon}
            colorTheme="primary"
            badgeText="ARSIP"
          />
          <PrimaryStatsCard
            title="Sesi Selesai"
            value={`${filteredRecords.filter(r => r.status_pasien === 'Stabil' || r.status_pasien === 'Pemulihan').length} Data`}
            icon={CheckIcon}
            colorTheme="success"
            badgeText="DONE"
            badgeIcon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          />
          <PrimaryStatsCard
            title="Perlu Perhatian"
            value={`${filteredRecords.filter(r => r.status_pasien === 'Perlu Perhatian').length} Data`}
            icon={WarningIcon}
            colorTheme="error"
            badgeText="URGENT"
          />
          <PrimaryStatsCard
            title="Pasien Stabil"
            value={`${filteredRecords.filter(r => r.status_pasien === 'Stabil').length} Data`}
            icon={HeartIcon}
            colorTheme="info"
            badgeText="PROGRESS"
          />
        </div>

        <div className="w-full">
          <DataTable
            title="Daftar Sesi Rekam Medis"
            subtitle={`Total ${filteredRecords.length} data ditemukan berdasarkan filter`}
            columns={columns}
            data={filteredRecords}
            loading={loading}
            searchable={true}
            onSearch={handleTableSearch}
            searchPlaceholder="Cari nama, NIM, keluhan..."
            pagination={true}
            pageSize={10}
            onRowClick={(row) => handleOpenDetail(row)}
            emptyMessage="Tidak ada rekam medis. Coba ubah filter atau kata kunci pencarian."
            emptyIcon="inbox"
            filters={[
              {
                key: 'status_pasien',
                placeholder: 'Status Klinis',
                options: [
                  { label: 'Stabil', value: 'Stabil' },
                  { label: 'Perlu Perhatian', value: 'Perlu Perhatian' },
                  { label: 'Pemulihan', value: 'Pemulihan' }
                ]
              },
              {
                key: 'jenis_kelamin',
                placeholder: 'Jenis Kelamin',
                options: [
                  { label: 'Laki-laki', value: 'Laki-laki' },
                  { label: 'Perempuan', value: 'Perempuan' }
                ]
              }
            ]}
          />
        </div>






      </div>

      {/* Detail Modal */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Detail Rekam Medis"
        subtitle="Catatan Sesi & Diagnosis Pasien"
        icon="medical_services"
        maxWidth="max-w-xl"
        bodyClassName="p-4 sm:p-5 space-y-3"
        footer={
          <button 
            onClick={() => setIsDetailOpen(false)} 
            className="px-6 py-3 bg-[var(--theme-primary)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--theme-primary-hover)] transition-colors"
          >
            Tutup Detail
          </button>
        }
      >
        {detailItem && (
          <div className="space-y-3">
            {/* Patient Identitas */}
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
              <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[14px]">person</span>
                </span>
                Identitas Mahasiswa
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Nama Lengkap</span>
                  <span className="text-[11px] font-bold text-slate-800">{detailItem._name || '—'}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">NIM</span>
                  <span className="text-[11px] font-bold text-slate-800">{detailItem._nim || '—'}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Fakultas</span>
                  <span className="text-[10px] font-semibold text-slate-700 line-clamp-2">{detailItem._fakultas || '—'}</span>
                </div>
                <div className="bg-slate-50 rounded-lg p-2.5">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Program Studi</span>
                  <span className="text-[10px] font-semibold text-slate-700 line-clamp-2">{detailItem._prodi || '—'}</span>
                </div>
              </div>
            </div>

            {/* Sesi Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col gap-1.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[12px]">calendar_today</span>
                  </span>
                  Tanggal Pemeriksaan
                </span>
                <span className="text-[11px] font-bold text-slate-800">{detailItem.date} {detailItem.time} WIB</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col gap-1.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[12px]">mood</span>
                  </span>
                  Mood Pasien
                </span>
                <span className="text-[11px] font-bold text-indigo-600">{detailItem.mood || '—'}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm flex flex-col gap-1.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[12px]">vital_signs</span>
                  </span>
                  Status Pasien
                </span>
                <div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest"
                    style={(() => {
                      const style = getStatusColor(detailItem.status_pasien);
                      return { backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}` };
                    })()}
                  >
                    {detailItem.status_pasien || '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {/* Keluhan */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[12px]">sick</span>
                  </span>
                  Keluhan Sesi Konseling
                </span>
                <div className="bg-slate-50/50 p-2.5 rounded-lg text-[10px] text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                  {detailItem.complaint || '—'}
                </div>
              </div>

              {/* Observasi */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                  </span>
                  Hasil Observasi Psikolog
                </span>
                <div className="bg-slate-50/50 p-2.5 rounded-lg text-[10px] text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                  {detailItem.observation || '—'}
                </div>
              </div>

              {/* Rekomendasi */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-2">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[12px]">prescriptions</span>
                  </span>
                  Rekomendasi Penanganan & Tindak Lanjut
                </span>
                <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-[10px] text-indigo-900 font-bold whitespace-pre-wrap leading-relaxed">
                  {detailItem.recommendation || '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogModal>
    </>
  );
}


