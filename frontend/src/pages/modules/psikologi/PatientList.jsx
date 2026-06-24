import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { psychologistService } from '@/services/api';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';

// Fallback Icons
const GroupIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const ChartIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const WarningIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>error</span>;
const HeartIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>favorite</span>;

export default function PatientList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [fakultasList, setFakultasList] = useState([]);
  const [prodiList, setProdiList] = useState([]);
  const [selectedFakultas, setSelectedFakultas] = useState('Semua Fakultas');
  const [selectedProdi, setSelectedProdi] = useState('Semua Prodi');

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    psychologistService.getPatients()
      .then((res) => {
        if (!ignore) {
          const sanitized = (res.data || []).map(p => ({
            ...p,
            sessions: Number(p.sessions || 0)
          })).sort((a, b) => {
            const dateA = a.raw_last_visit || '';
            const dateB = b.raw_last_visit || '';
            return dateB.localeCompare(dateA);
          });
          setPatients(sanitized);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    psychologistService.getFakultasList().then((res) => {
      if (!ignore) setFakultasList(res.data || []);
    });
    psychologistService.getProdiList().then((res) => {
      if (!ignore) setProdiList(res.data || []);
    });
    return () => { ignore = true; };
  }, []);

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

  const filteredPatients = useMemo(() => {
    let result = [...patients];
    if (selectedFakultas !== 'Semua Fakultas') {
      result = result.filter(p => p.faculty === selectedFakultas);
    }
    if (selectedProdi !== 'Semua Prodi') {
      result = result.filter(p => p.program_studi === selectedProdi);
    }
    return result;
  }, [patients, selectedFakultas, selectedProdi]);

  const handleTableSearch = (data, searchVal) => {
    const query = searchVal.trim().toLowerCase();
    if (!query) return data;
    return data.filter((p) => {
      const searchableStr = [
        p.name,
        p.nim,
        p.faculty,
        p.program_studi,
        p.status,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableStr.includes(query);
    });
  };

  const columns = [
    {
      key: 'name',
      label: 'Identitas Pasien',
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden relative">
            {row.foto_url || row.foto ? (
              <img src={row.foto_url || row.foto} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">person</span>
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors max-w-[200px] truncate">{row.name}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{row.nim} &bull; {row.faculty}</p>
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
      key: 'sessions',
      label: 'Aktivitas Sesi',
      sortable: true,
      render: (v, row) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-primary/10 text-primary">
              <span className="material-symbols-outlined !text-[12px]">show_chart</span>
            </span>
            <div>
              <p className="text-[11px] font-black text-slate-700">{row.sessions} Kali</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined !text-[12px]">calendar_month</span>
            </span>
            <div>
              <p className="text-[10px] font-bold text-slate-500">{row.lastVisit}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status Klinis',
      sortable: true,
      render: (v, row) => {
        const statusStyle = getStatusColor(row.status);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap"
            style={{ backgroundColor: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotAnim}`} style={{ backgroundColor: statusStyle.dot }} />
            {row.status}
          </span>
        );
      }
    }
  ];

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
          title="Daftar"
          highlightedTitle="Pasien"
          subtitle="Lihat profil riwayat konseling dari seluruh mahasiswa yang terdaftar."
          icon="groups"
          badges={[{ label: 'Database Pasien', active: false }]}
          actions={HeaderActions}
        />

        {/* Statistics Top Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <PrimaryStatsCard
            title="Total Pasien"
            value={`${filteredPatients.length} Orang`}
            icon={GroupIcon}
            colorTheme="primary"
            badgeText="AKTIF"
          />
          <PrimaryStatsCard
            title="Sesi Bulan Ini"
            value={`${filteredPatients.reduce((sum, item) => sum + Number(item.sessions || 0), 0)} Sesi`}
            icon={ChartIcon}
            colorTheme="success"
            badgeText="LIVE"
            badgeIcon={<span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
          />
          <PrimaryStatsCard
            title="Perlu Perhatian"
            value={`${filteredPatients.filter(p => p.status === 'Perlu Perhatian').length} Orang`}
            icon={WarningIcon}
            colorTheme="error"
            badgeText="URGENT"
          />
          <PrimaryStatsCard
            title="Pasien Stabil"
            value={`${filteredPatients.filter(p => p.status === 'Stabil' || p.status === 'Pemulihan').length} Orang`}
            icon={HeartIcon}
            colorTheme="info"
            badgeText="PROGRESS"
          />
        </div>

        <div className="w-full">
          <DataTable
            title="Daftar Pasien Terdaftar"
            subtitle={`Total ${filteredPatients.length} pasien ditemukan berdasarkan filter`}
            columns={columns}
            data={filteredPatients}
            loading={loading}
            searchable={true}
            onSearch={handleTableSearch}
            searchPlaceholder="Cari nama, NIM, fakultas..."
            pagination={true}
            pageSize={10}
            onRowClick={(row) => navigate(`/app/psikologi/patients/${row.id}/medical-record`)}
            emptyMessage="Tidak ada pasien. Coba ubah filter atau kata kunci pencarian."
            emptyIcon="group_off"
            filters={[
              {
                key: 'status',
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
    </>
  );
}



