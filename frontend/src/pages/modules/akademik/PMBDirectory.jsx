import React, { useState, useEffect, useMemo } from 'react'
import { adminService } from '@/services/api'
import api from '@/lib/axios'
import { toast } from 'react-hot-toast'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { DataTable } from '@/components/ui/DataTable'
import { DialogModal, ModalCancelButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { usePermission } from '@/hooks/usePermission'
import { P } from '@/config/permissions'

const PMBDirectory = () => {
  const [records, setRecords] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterJalur, setFilterJalur] = useState('all')
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [selected, setSelected] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [anomalies, setAnomalies] = useState([])
  const [activeView, setActiveView] = useState('list')
  const { hasPermission } = usePermission()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [dataRes, statsRes, anomaliRes] = await Promise.all([
        adminService.getAllPMB({ search, jalur: filterJalur, periode: filterPeriode }),
        adminService.getPMBStats(),
        hasPermission(P.PMB_SYNC) ? api.get('/admin/sevima/pmb-anomali') : Promise.resolve({ data: { status: 'success', data: [] } })
      ])
      if (dataRes.status === 'success') setRecords(dataRes.data || [])
      if (statsRes.status === 'success') setStats(statsRes.data)
      if (anomaliRes.data.status === 'success') setAnomalies(anomaliRes.data.data || [])
    } catch {
      toast.error('Gagal memuat data PMB')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => { fetchData() }, 400)
    return () => clearTimeout(timeout)
  }, [search, filterJalur, filterPeriode])

  const [jalurOptions, setJalurOptions] = useState([])
  const [periodeOptions, setPeriodeOptions] = useState([])

  // Accumulate unique filter values so options don't shrink when filtered
  useEffect(() => {
    if (records.length > 0) {
      setJalurOptions(prev => {
        const set = new Set([...prev, ...records.map(r => r.jalur).filter(Boolean)])
        return [...set].sort()
      })

      setPeriodeOptions(prev => {
        const set = new Set([...prev, ...records.map(r => r.idPeriode ? r.idPeriode.substring(0, 4) : '').filter(Boolean)])
        return [...set].sort().reverse()
      })
    }
  }, [records])

  useEffect(() => {
    let interval;
    const checkProgress = async () => {
      if (!hasPermission(P.PMB_SYNC)) return;
      try {
        const res = await api.get('/admin/sync-sevima/progress');
        if (res.data && res.data.data) {
          const prog = res.data.data;
          setSyncProgress(prog);
          
          if (prog.is_running) {
            if (!syncing) setSyncing(true);
          } else {
            if (syncing) {
              setSyncing(false);
              setIsSyncModalOpen(false);
              toast.success(`Sinkronisasi SEVIMA Selesai! ${prog.total_synced || 0} data ditarik.`, { duration: 6000 });
              fetchData();
            }
          }
        }
      } catch (e) {}
    };

    if (syncing) {
      interval = setInterval(checkProgress, 1000);
    } else {
      checkProgress();
    }

    return () => clearInterval(interval);
  }, [syncing]);

  const handleSync = async () => {
    setSyncing(true)
    setSyncProgress({ is_running: true, status_text: 'Memulai koneksi ke SEVIMA...' })
    try {
      const res = await api.post('/admin/integrasi/kencana-sync-pmb')
      if (res.data.status !== 'success') {
        toast.error(res.data.message || 'Gagal sinkronisasi')
        setSyncing(false)
        setSyncProgress(null)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat sinkronisasi')
      setSyncing(false)
      setSyncProgress(null)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await api.delete('/admin/integrasi/reset-pmb')
      if (res.data.status === 'success') {
        toast.success(res.data.message || 'Data PMB berhasil direset total!')
        fetchData()
      } else {
        toast.error(res.data.message || 'Gagal reset data PMB')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mereset data PMB')
    } finally {
      setResetting(false)
    }
  }

  const handleSyncAnomali = async (row) => {
    const loadingToast = toast.loading(`Menyinkronkan ulang data PMB SEVIMA (${row.nama || row.nim})...`);
    try {
      const res = await api.post(`/admin/sevima/pmb-anomali/${row.id_sevima}/sync`);
      if (res.data.status === 'success') {
        toast.success(res.data.message || 'Berhasil sinkron ulang!', { id: loadingToast });
        fetchData();
      } else {
        toast.error(res.data.message || 'Gagal sinkron ulang', { id: loadingToast });
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Terjadi kesalahan saat sinkron ulang', { id: loadingToast });
    }
  };

  const handleDeleteAnomali = async (row) => {
    if (!window.confirm(`Yakin ingin menghapus permanen data anomali ${row.nama || row.id_sevima} dari karantina? Data ini akan diabaikan pada sinkronisasi berikutnya jika tidak diperbaiki di SEVIMA.`)) {
      return;
    }
    const loadingToast = toast.loading(`Menghapus data anomali...`);
    try {
      const res = await api.delete(`/admin/sevima/pmb-anomali/${row.id_sevima}`);
      if (res.data.status === 'success') {
        toast.success(res.data.message || 'Data anomali berhasil dihapus', { id: loadingToast });
        fetchData();
      } else {
        toast.error(res.data.message || 'Gagal menghapus data anomali', { id: loadingToast });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat menghapus', { id: loadingToast });
    }
  };

  const handleExportAnomaliCsv = () => {
    if (!anomalies || anomalies.length === 0) {
      toast.error('Tidak ada data anomali untuk diekspor');
      return;
    }
    const headers = ['ID SEVIMA', 'NOMOR DAFTAR', 'NAMA', 'PRODI', 'ALASAN ERROR'];
    const csvContent = [
      headers.join(','),
      ...anomalies.map(a => [
        `"${a.id_sevima || ''}"`,
        `"${a.nomor_daftar || ''}"`,
        `"${a.nama || ''}"`,
        `"${a.prodi || ''}"`,
        `"${(a.alasan_error || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PMB_Data_Anomali_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File CSV berhasil diunduh');
  };

  const formatErrorMsg = (msg) => {
    if (!msg) return 'Error tidak diketahui';
    if (msg.includes('unique constraint') && msg.includes('nomor_daftar')) return 'Nomor Daftar sudah ada di database utama (Duplikat)';
    if (msg.includes('Nomor Daftar (Kode) kosong')) return 'Nomor Daftar belum terisi di SEVIMA';
    return msg;
  };

  return (
    <PageContent>
      <DashboardHero
        title="Penerimaan"
        highlightedTitle="Mahasiswa Baru"
        subtitle="Data pendaftar yang telah daftar ulang dari SEVIMA. Hanya mahasiswa yang sudah terkonfirmasi."
        icon="person_add"
        badges={[
          { label: `${records.length} Pendaftar Daftar Ulang`, active: true },
          { label: 'Synced from SEVIMA', active: false },
        ]}
        actions={
          <>
          {hasPermission(P.DB_RESET) && (
            <Button
              onClick={() => setIsResetModalOpen(true)}
              variant="danger"
              icon="delete_sweep"
              loading={resetting}
              disabled={syncing || resetting}
              className="h-11 px-6 w-full sm:w-auto rounded-xl text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer"
            >
              RESET
            </Button>
          )}
          {hasPermission(P.PMB_SYNC) && (
            <Button
              onClick={() => setIsSyncModalOpen(true)}
              variant="primary"
              icon="cloud_sync"
              loading={syncing}
              disabled={syncing || resetting}
              className="h-11 px-6 w-full sm:w-auto rounded-xl border-slate-200 text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer"
            >
              SEVIMA Sync
            </Button>
          )}
          </>
        }
      />

      {/* ── Tabs Layout ────────────────────────────────────────── */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full space-y-6 mt-6">
        <TabsList className="inline-flex bg-slate-100/60 p-1 rounded-xl w-full sm:w-auto border border-slate-200/40">
          <TabsTrigger value="list" className="flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-sm">list_alt</span>
            Data Pendaftar
          </TabsTrigger>
          <TabsTrigger value="anomali" className="flex-1 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer">
            <span className="material-symbols-outlined text-sm">warning</span>
            Data Anomali ({anomalies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 focus-visible:ring-0 focus-visible:outline-none">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <PrimaryStatsCard
                title="Total Pendaftar"
                value={stats.total?.toLocaleString('id-ID')}
                icon="groups"
                colorTheme="primary"
              />
              <PrimaryStatsCard
                title="Laki-Laki"
                value={stats.laki?.toLocaleString('id-ID')}
                icon="male"
                colorTheme="info"
              />
              <PrimaryStatsCard
                title="Perempuan"
                value={stats.perempuan?.toLocaleString('id-ID')}
                icon="female"
                colorTheme="success"
              />
              <PrimaryStatsCard
                title="Jalur Pendaftaran"
                value={stats.by_jalur?.length || 0}
                icon="alt_route"
                colorTheme="warning"
              />
              <PrimaryStatsCard
                className="bg-red-50 border border-red-100 cursor-pointer transition-transform hover:scale-[1.02]"
                title="Data Anomali"
                value={stats.anomali || 0}
                icon="warning"
                colorTheme="danger"
                badgeText="Karantina"
                badgeIcon={<span className="material-symbols-outlined text-[12px]">error</span>}
                onClick={() => setActiveView('anomali')}
              />
            </div>
          )}



      {/* Data Table */}
      <div className="mt-4">
        <DataTable
          title="Laporan Pendaftar Mahasiswa Baru"
          subtitle="Menampilkan daftar seluruh pendaftar mahasiswa baru."
          data={records}
          columns={[
            {
              label: 'No. Daftar',
              key: 'nomorDaftar',
              render: (_, row) => (
                <div className="text-xs font-bold text-[var(--theme-text)] font-mono">
                  {row.nomorDaftar}
                </div>
              )
            },
            {
              label: 'Nama Lengkap',
              key: 'namaLengkap',
              render: (_, row) => (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center font-bold text-xs shrink-0">
                    {row.namaLengkap?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-[var(--theme-text)] truncate">{row.namaLengkap || '-'}</span>
                    <span className="text-[10px] text-[var(--theme-text-muted)] truncate">{row.email || '-'}</span>
                  </div>
                </div>
              )
            },
            {
              label: 'NIM',
              key: 'nim',
              render: (_, row) => (
                <div className="text-xs font-medium text-[var(--theme-text)] font-mono">
                  {row.nim || <span className="text-[var(--theme-text-muted)] italic">Belum ada</span>}
                </div>
              )
            },
            {
              label: 'Jalur',
              key: 'jalur',
              render: (_, row) => (
                <div className="inline-flex px-2 py-1 rounded-md bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] text-[10px] font-bold text-[var(--theme-text-muted)] tracking-wider">
                  {row.jalur || '-'}
                </div>
              )
            },
            {
              label: 'Tahun / Periode',
              key: 'periodeDaftar',
              render: (_, row) => (
                <div className="text-xs font-medium text-[var(--theme-text-muted)]">
                  {row.idPeriode ? row.idPeriode.substring(0, 4) : '-'} / {row.periodeDaftar || '-'}
                </div>
              )
            },
            {
              label: 'Status',
              key: 'status',
              render: (_, row) => (
                <div className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border
                  ${row.status?.toLowerCase() === 'belum' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}
                `}>
                  {row.status || '-'}
                </div>
              )
            }
          ]}
          loading={loading}
          searchPlaceholder="Cari nama, NIM, nomor daftar, email..."
          onSearchChange={(val) => setSearch(val)}
          filters={[
            {
              key: 'jalur',
              placeholder: 'Jalur',
              options: jalurOptions.map(j => ({ value: j, label: j }))
            },
            {
              key: 'periode',
              placeholder: 'Tahun',
              options: periodeOptions.map(p => ({ value: p, label: p }))
            }
          ]}
          filterValues={{ jalur: filterJalur, periode: filterPeriode }}
          onFilterChange={(key, val) => {
            if (key === 'jalur') setFilterJalur(val)
            if (key === 'periode') setFilterPeriode(val)
          }}
          manualFiltering={true}
          onRowClick={(row) => setSelected(row)}
        />
      </div>
      </TabsContent>

      <TabsContent value="anomali" className="space-y-6 focus-visible:ring-0 focus-visible:outline-none">
        <div className="bg-white rounded-xl border border-red-100 p-6 shadow-sm shadow-slate-100/50">
          <div className="mb-6 flex items-center gap-3 text-red-600">
            <span className="material-symbols-outlined text-3xl">warning</span>
            <div>
              <h3 className="text-lg font-bold font-display">Karantina Data Anomali PMB</h3>
              <p className="text-sm text-slate-500 font-body">
                Data berikut tidak dimasukkan ke dalam database utama karena memiliki anomali/error (misalnya Nomor Daftar ganda atau Nomor Daftar kosong). 
                Silakan perbaiki data ini di portal SEVIMA agar dapat tertarik pada sinkronisasi berikutnya.
              </p>
            </div>
          </div>

          <DataTable
            title="Daftar Data Anomali"
            subtitle="Menampilkan data PMB yang ditolak sistem karena anomali."
            columns={[
              { label: 'ID SEVIMA', key: 'id_sevima', className: 'font-mono text-xs text-slate-500' },
              { label: 'NOMOR DAFTAR', key: 'nomor_daftar', className: 'font-bold text-slate-700' },
              { label: 'NAMA PENDAFTAR', key: 'nama' },
              { label: 'PRODI (SEVIMA)', key: 'prodi' },
              { 
                label: 'ALASAN ERROR / PENOLAKAN', 
                key: 'alasan_error',
                render: (val) => <span className="text-red-600 text-xs font-semibold">{formatErrorMsg(val)}</span>
              }
            ]}
            data={anomalies}
            loading={loading}
            searchPlaceholder="Cari berdasarkan Nama atau Nomor Daftar..."
            searchWidth="max-w-md"
            toolbarActions={
              <button
                type="button"
                onClick={handleExportAnomaliCsv}
                className="h-9 px-3.5 rounded-lg bg-green-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                Export CSV
              </button>
            }
            actions={(row) => (
              <div className="flex gap-2">
                {hasPermission(P.PMB_SYNC) && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSyncAnomali(row); }}
                      className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Sync Ulang dari SEVIMA"
                    >
                      <span className="material-symbols-outlined text-[16px]">sync</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteAnomali(row); }}
                      className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                      title="Hapus Permanen dari Karantina"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </>
                )}
              </div>
            )}
          />
        </div>
      </TabsContent>
    </Tabs>

      {/* Detail Modal */}
      {/* Detail Modal */}
      <DialogModal
        open={!!selected}
        onOpenChange={(open) => { if (!open) setSelected(null) }}
        title="Detail Pendaftar"
        subtitle={`${selected?.nomorDaftar || ''} · ${selected?.periodeDaftar || ''}`}
        icon="badge"
        maxWidth="max-w-4xl"
        footer={
          <ModalCancelButton onClick={() => setSelected(null)}>Tutup Detail</ModalCancelButton>
        }
      >
        {selected && (
          <div className="flex flex-col gap-8 p-2">
            {/* Header Identity */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm mx-1">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-dark)] text-white flex items-center justify-center shadow-lg shadow-[var(--theme-primary)]/20 shrink-0">
                <span className="material-symbols-outlined text-4xl">badge</span>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-800 font-headline tracking-tight">
                  {selected.namaLengkap}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1 font-bold"><span className="material-symbols-outlined text-[14px]">pin</span> {selected.nomorDaftar}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="flex items-center gap-1 font-bold"><span className="material-symbols-outlined text-[14px]">calendar_month</span> {selected.periodeDaftar}</span>
                </div>
              </div>
            </div>

            {/* Identity Section */}
            <div className="space-y-4 px-1">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="material-symbols-outlined text-[var(--theme-primary)]">person</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-headline">Data Identitas Pribadi</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem label="Nomor Induk Mahasiswa" value={selected.nim} highlight />
                <DetailItem label="Nomor Induk Kependudukan" value={selected.nik} />
                <DetailItem label="Nomor Ujian" value={selected.nomorUjian} />
                <DetailItem label="Jenis Kelamin" value={selected.jenisKelamin === 'L' ? 'Laki-laki' : selected.jenisKelamin === 'P' ? 'Perempuan' : selected.jenisKelamin} />
                <DetailItem label="Tempat, Tanggal Lahir" value={`${selected.tempatLahir || '—'}, ${selected.tanggalLahir ? new Date(selected.tanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`} />
                <DetailItem label="Agama" value={selected.agama} />
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4 px-1">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="material-symbols-outlined text-amber-500">contact_mail</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-headline">Informasi Kontak</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <DetailItem label="Email Pribadi" value={selected.email} />
                <DetailItem label="Nomor Handphone" value={selected.noHP} />
                <DetailItem label="Alamat Domisili" value={selected.alamat} full />
                <DetailItem label="Kota/Kabupaten" value={selected.kota} />
                <DetailItem label="Provinsi" value={selected.provinsi} />
              </div>
            </div>

            {/* Enrollment Section */}
            <div className="space-y-4 px-1">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <span className="material-symbols-outlined text-emerald-500">school</span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-headline">Riwayat Akademik & Pendaftaran</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <DetailItem label="Jalur Pendaftaran" value={selected.jalur} />
                <DetailItem label="Sistem Kuliah" value={selected.sistemKuliah} />
                <DetailItem label="Asal Sekolah / PT" value={selected.universitasAsal || selected.asalSekolah} />
                <DetailItem label="Prodi Asal (Transfer)" value={selected.prodiAsal} />
                <DetailItem label="Tanggal Daftar Awal" value={selected.tanggalDaftar ? new Date(selected.tanggalDaftar).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
                <DetailItem label="Tanggal Daftar Ulang" value={selected.tanggalDaftarUlang ? new Date(selected.tanggalDaftarUlang).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />
              </div>
            </div>
          </div>
        )}
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isSyncModalOpen || syncing}
        onClose={() => { if (!syncing) setIsSyncModalOpen(false) }}
        onConfirm={() => {
          if (!syncing) handleSync()
        }}
        title="Sinkronisasi Data PMB SEVIMA?"
        description={
          syncing ? (
            <div className="flex flex-col gap-3 mt-4 w-full">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 font-body">
                <span>{syncProgress?.status_text || 'Memproses sinkronisasi data PMB...'}</span>
                {syncProgress?.total_data > 0 && (
                  <span className="text-[var(--theme-primary)]">
                    {Math.min(100, Math.floor(((syncProgress?.total_synced || 0) / syncProgress.total_data) * 100))}%
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="bg-[var(--theme-primary)] h-3 rounded-full relative transition-all duration-500 overflow-hidden"
                  style={{ width: `${syncProgress?.total_data > 0 ? Math.min(100, Math.max(5, ((syncProgress?.total_synced || 0) / syncProgress.total_data) * 100)) : Math.min(100, Math.max(5, (syncProgress?.total_synced || 0) / 100))}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 progress-shimmer"></div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold font-mono">
                {syncProgress?.total_synced || 0} / {syncProgress?.total_data || '?'} Data berhasil ditarik.
              </p>
            </div>
          ) : "Apakah Anda yakin ingin menyinkronkan data calon mahasiswa baru (PMB) dari SEVIMA? Aksi ini akan menarik data terbaru dan mungkin memakan waktu agak lama."
        }
        loading={syncing}
        cancelText={syncing ? "Sembunyikan" : "Batal"}
        confirmText={syncing ? "SINKRONISASI BERJALAN..." : "YA, SINKRONISASI"}
        confirmClassName={syncing ? "hidden" : "bg-[var(--theme-primary)] hover:brightness-90 text-white"}
      />

      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          setIsResetModalOpen(false);
          handleReset();
        }}
        title="Hard Reset Data PMB?"
        description="PERINGATAN: Aksi ini akan menghapus SELURUH data pendaftaran mahasiswa baru (PMB) dari database secara permanen! Apakah Anda benar-benar yakin?"
        loading={resetting}
        confirmText="YA, RESET TOTAL"
        confirmClassName="bg-red-600 hover:brightness-90 text-white"
      />
    </PageContent>
  )
}

const DetailItem = ({ label, value, full, highlight }) => (
  <div className={full ? 'col-span-full' : ''}>
    <div className={`text-[9px] font-black uppercase tracking-widest ${highlight ? 'text-[var(--theme-primary)]' : 'text-slate-400'}`}>{label}</div>
    <div className={`text-sm mt-0.5 ${highlight ? 'font-black text-[var(--theme-primary-dark)] font-mono text-base' : 'font-semibold text-slate-700'}`}>{value || '—'}</div>
  </div>
)

export default PMBDirectory
