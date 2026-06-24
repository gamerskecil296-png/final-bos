import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenagaKesehatanService } from '../../services/api';
import { PageContent, PageCard, PageCardHeader } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable';
import DateRangeExportModal from '@/components/ui/DateRangeExportModal';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';
import toast from 'react-hot-toast';

const HistoryIcon = () => <span className="material-symbols-outlined text-[16px]">history</span>;
const AddIcon = () => <span className="material-symbols-outlined text-[16px]">medical_services</span>;

export default function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManualRegModal, setShowManualRegModal] = useState(false);
  const [exportModalConfig, setExportModalConfig] = useState({ isOpen: false, type: null, title: '', requireRows: false });
  const [manualRegData, setManualRegData] = useState({ mahasiswa_id: '', keluhan: '', nim_nama: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalSearchResults, setModalSearchResults] = useState([]);
  const [isSearchingModal, setIsSearchingModal] = useState(false);
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFakultas, setSelectedFakultas] = useState('all');
  const [selectedProdi, setSelectedProdi] = useState('all');
  const [selectedGender, setSelectedGender] = useState('all');
  const [globalResults, setGlobalResults] = useState([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: 'nama', direction: 'asc' });

  const navigate = useNavigate();

  const loadPatients = () => {
    setLoading(true);
    tenagaKesehatanService.getPatients()
      .then((res) => {
        setPatients(res.data || []);
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat data mahasiswa.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadPatients();
  }, []);

  // Debounced global lookup effect
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 1) {
      setGlobalResults([]);
      return;
    }

    const handler = setTimeout(() => {
      setIsSearchingGlobal(true);
      tenagaKesehatanService.lookupStudent(query)
        .then((res) => {
          // Exclude students that are already in the local patients array
          const localNims = new Set(patients.map((p) => p.nim));
          const newGlobals = (res.data || []).filter((s) => s.nim && !localNims.has(s.nim));
          setGlobalResults(newGlobals);
        })
        .catch(() => {
          setGlobalResults([]);
        })
        .finally(() => {
          setIsSearchingGlobal(false);
        });
    }, 400);

    return () => clearTimeout(handler);
  }, [searchQuery, patients]);

  // Extract unique Fakultas and Program Studi from patients list
  const fakultasList = useMemo(() => {
    const list = patients.map((p) => p.Fakultas?.nama).filter(Boolean);
    return Array.from(new Set(list));
  }, [patients]);

  const prodiList = useMemo(() => {
    const list = patients
      .filter((p) => selectedFakultas === 'all' || p.Fakultas?.nama === selectedFakultas)
      .map((p) => p.ProgramStudi?.nama)
      .filter(Boolean);
    return Array.from(new Set(list));
  }, [patients, selectedFakultas]);

  // Combine and filter lists
  const combinedList = useMemo(() => {
    const locals = patients.map((p) => ({ ...p, isLocal: true }));
    const globals = globalResults.map((g) => ({ ...g, isLocal: false }));
    return [...locals, ...globals];
  }, [patients, globalResults]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedFakultas, selectedProdi, selectedGender]);

  const filteredPatients = useMemo(() => {
    return combinedList.filter((p) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query ||
        (p.nama || '').toLowerCase().includes(query) ||
        (p.nim || '').toLowerCase().includes(query);

      const matchesFakultas = selectedFakultas === 'all' ||
        (p.Fakultas?.nama || '') === selectedFakultas;

      const matchesProdi = selectedProdi === 'all' ||
        (p.ProgramStudi?.nama || '') === selectedProdi;

      const matchesGender = selectedGender === 'all' ||
        (p.jenis_kelamin || 'Laki-Laki') === selectedGender;

      return matchesSearch && matchesFakultas && matchesProdi && matchesGender;
    });
  }, [combinedList, searchQuery, selectedFakultas, selectedProdi, selectedGender]);

  const columns = [
    {
      key: 'nama',
      label: 'Nama Mahasiswa',
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] flex items-center justify-center shrink-0 overflow-hidden relative group-hover:scale-105 transition-transform">
            {row.foto_url || row.foto ? (
              <img src={row.foto_url || row.foto} alt={row.nama} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">person</span>
            )}
          </div>
          <div>
            <p className="font-bold text-[13px] text-[var(--theme-text)] flex items-center gap-2 max-w-[200px] truncate">
              {row.nama}
              {!row.isLocal && (
                <span className="inline-flex items-center rounded-md bg-[var(--theme-info-light)]/20 px-1.5 py-0.5 text-[9px] font-black text-[var(--theme-info)] ring-1 ring-inset ring-[var(--theme-info)]/30 uppercase">
                  Pusat
                </span>
              )}
            </p>
            <p className="text-[10px] text-[var(--theme-text-muted)] mt-0.5 font-medium">{row.jenis_kelamin || 'Laki-Laki'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'nim',
      label: 'NIM',
      sortable: true,
      render: (v, row) => <span className="font-bold text-[12px] text-[var(--theme-text)]">{row.nim}</span>
    },
    {
      key: 'akademik',
      label: 'Program Studi & Fakultas',
      sortable: false,
      render: (v, row) => (
        <div className="flex flex-col gap-0.5 max-w-[180px]">
          <p className="text-[11px] font-bold text-[var(--theme-text)] truncate">{row.ProgramStudi?.nama || '-'}</p>
          <p className="text-[10px] font-medium text-[var(--theme-text-muted)] truncate">{row.Fakultas?.nama || '-'}</p>
        </div>
      )
    },
    {
      key: 'kontak',
      label: 'Kontak',
      sortable: false,
      render: (v, row) => (
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] font-bold text-[var(--theme-text)]">{row.no_hp || '-'}</p>
          <p className="text-[10px] font-medium text-[var(--theme-text-muted)]">{row.email_personal || '-'}</p>
        </div>
      )
    },
    {
      key: 'aksi',
      label: 'Tindakan Medis',
      sortable: false,
      className: 'text-right',
      render: (v, row) => (
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => navigate(`/tenagakes/patients/${row.id}/medical-record`)}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--theme-bg)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[11px] font-semibold text-[var(--theme-text)] shadow-sm transition-all"
          >
            <HistoryIcon /> Riwayat
          </button>
          {row.has_active_booking && (
            <button
              onClick={() => navigate(`/tenagakes/patients/${row.id}/medical-record?new_screening=true&booking_id=${row.active_booking_id}`)}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-[var(--theme-primary)] hover:opacity-90 text-white text-[11px] font-semibold transition-all shadow-sm"
            >
              <AddIcon /> Screening
            </button>
          )}
        </div>
      )
    }
  ];

  const handleExportExcel = async () => {
    try {
      await tenagaKesehatanService.exportExcel();
    } catch (err) {
      toast.error(err.message || 'Gagal export Excel.');
    }
  };

  const handleExportPDF = async () => {
    try {
      await tenagaKesehatanService.exportPDF();
    } catch (err) {
      toast.error(err.message || 'Gagal export PDF.');
    }
  };

  const handleExport = async (data) => {
    try {
      if (exportModalConfig.type === 'offline_form') {
        await tenagaKesehatanService.exportRegistrationFormPDF(data.rows);
      } else {
        // Fallback
      }
      setExportModalConfig({ ...exportModalConfig, isOpen: false });
    } catch (err) {
      toast.error(err.message || `Gagal melakukan export.`);
    }
  };

  const handleManualRegSubmit = async (e) => {
    e.preventDefault();
    if (!manualRegData.mahasiswa_id) {
      toast.error('Pilih mahasiswa dari daftar pencarian terlebih dahulu!');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await tenagaKesehatanService.createManualBooking({
        mahasiswa_id: parseInt(manualRegData.mahasiswa_id),
        keluhan: manualRegData.keluhan
      });
      toast.success('Berhasil mendaftarkan pasien secara manual!');
      setShowManualRegModal(false);
      setManualRegData({ mahasiswa_id: '', keluhan: '', nim_nama: '' });
      loadPatients(); // Refresh list
    } catch (err) {
      toast.error(err.message || 'Gagal mendaftarkan pasien');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const query = manualRegData.nim_nama.trim();
    if (!query || query.length < 1 || manualRegData.mahasiswa_id) {
      setModalSearchResults([]);
      return;
    }

    const handler = setTimeout(() => {
      setIsSearchingModal(true);
      tenagaKesehatanService.lookupStudent(query)
        .then((res) => {
          setModalSearchResults(res.data || []);
        })
        .catch(() => {
          setModalSearchResults([]);
        })
        .finally(() => {
          setIsSearchingModal(false);
        });
    }, 400);

    return () => clearTimeout(handler);
  }, [manualRegData.nim_nama, manualRegData.mahasiswa_id]);

  return (
    <PageContent>
      <DashboardHero
        title="Daftar"
        highlightedTitle="Mahasiswa"
        subtitle="Pencarian cepat rekam medis, input screening fisik baru secara langsung, atau rujuk kondisi medis mahasiswa ke unit eskalasi."
        icon="people"
        badges={[{ label: 'Rekam Medis Mahasiswa', active: true }]}
        actions={
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-[11px] font-bold text-[var(--theme-text)] transition-all hover:bg-[var(--theme-bg)] hover:text-[var(--theme-primary)] shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> Export Excel
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition-all hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> Export PDF
            </button>
            <button
              type="button"
              onClick={() => setExportModalConfig({ isOpen: true, type: 'offline_form', title: 'Download Form Offline', requireRows: true })}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2.5 text-[11px] font-bold text-[var(--theme-text)] transition-all hover:bg-[var(--theme-bg)] hover:text-[var(--theme-primary)] shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">print</span> Form Offline
            </button>
            <button
              type="button"
              onClick={() => setShowManualRegModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition-all hover:opacity-90"
            >
              <span className="material-symbols-outlined text-[16px]">how_to_reg</span> Registrasi Manual
            </button>
          </div>
        }
      />

      {/* Patient Table */}
      <div className="w-full relative">
        {isSearchingGlobal && (
          <div className="absolute left-1/2 top-[72px] -translate-x-1/2 z-10 flex items-center gap-2 bg-[var(--theme-surface)] px-4 py-1.5 rounded-full shadow-md border border-[var(--theme-border)] text-xs font-bold text-[var(--theme-primary)]">
            <span className="material-symbols-outlined text-[14px] animate-spin">sync</span> Mencari ke sistem pusat...
          </div>
        )}
        <DataTable
          title="Daftar Mahasiswa Terdaftar"
          subtitle={`Total ${filteredPatients.length} pasien mahasiswa reguler dan kunjungan klinik`}
          columns={columns}
          data={filteredPatients}
          loading={loading}
          searchable={true}
          manualFiltering={true}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Ketik NIM atau Nama..."
          filterValues={{ faculty: selectedFakultas, prodi: selectedProdi, gender: selectedGender }}
          onFilterChange={(key, val) => {
            if (key === 'faculty') {
              setSelectedFakultas(val);
              setSelectedProdi('all');
            } else if (key === 'prodi') {
              setSelectedProdi(val);
            } else if (key === 'gender') {
              setSelectedGender(val);
            }
          }}
          pagination={true}
          pageSize={10}
          emptyMessage="Tidak ada mahasiswa ditemukan. Coba ubah filter atau kata kunci pencarian."
          emptyIcon="person_off"
          filters={[
            {
              key: 'faculty',
              placeholder: 'Fakultas',
              options: fakultasList.map(f => ({ label: f, value: f }))
            },
            {
              key: 'prodi',
              placeholder: 'Prodi',
              options: prodiList.map(p => ({ label: p, value: p }))
            },
            {
              key: 'gender',
              placeholder: 'Gender',
              options: [
                { label: 'Laki-Laki', value: 'Laki-Laki' },
                { label: 'Perempuan', value: 'Perempuan' }
              ]
            }
          ]}
        />
      </div>

      {/* Export Modal */}
      <DateRangeExportModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onExport={handleExport}
        title={exportModalConfig.title}
        requireRows={exportModalConfig.requireRows}
      />

      {/* Manual Registration Modal */}
      <DialogModal
        open={showManualRegModal}
        onOpenChange={setShowManualRegModal}
        title="Registrasi Pasien Walk-in"
        subtitle="Registrasi Medis"
        icon="how_to_reg"
        maxWidth="max-w-md"
        footer={
          <>
            <ModalCancelButton onClick={() => setShowManualRegModal(false)} />
            <ModalSaveButton 
              form="manual-reg-form" 
              type="submit" 
              disabled={isSubmitting || !manualRegData.mahasiswa_id}
              loading={isSubmitting}
              icon={null}
            >
              {isSubmitting ? 'Menyimpan...' : 'Daftarkan Pasien'}
            </ModalSaveButton>
          </>
        }
      >
        <form id="manual-reg-form" onSubmit={handleManualRegSubmit} className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block text-[11px] font-bold text-[var(--theme-text)]">Cari Pasien / Mahasiswa</label>
            <div className="relative">
              <input
                type="text"
                value={manualRegData.nim_nama}
                onChange={(e) => setManualRegData({ ...manualRegData, nim_nama: e.target.value, mahasiswa_id: '' })}
                placeholder="Ketik NIM atau Nama..."
                className="w-full h-11 px-4 border border-[var(--theme-border)] rounded-xl text-[12px] font-semibold focus:border-[var(--theme-primary)] outline-none bg-[var(--theme-bg)] text-[var(--theme-text)] shadow-sm"
                required
              />
              {isSearchingModal && <span className="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined animate-spin text-[16px] text-[var(--theme-text-muted)]">progress_activity</span>}
              
              {/* Search Results Dropdown */}
              {modalSearchResults.length > 0 && !manualRegData.mahasiswa_id && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-lg z-10 flex flex-col p-1">
                  {modalSearchResults.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setManualRegData({ ...manualRegData, mahasiswa_id: s.id, nim_nama: `${s.nim} - ${s.nama}` });
                        setModalSearchResults([]);
                      }}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--theme-bg)] rounded-lg text-left"
                    >
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-[var(--theme-text)]">{s.nama}</span>
                        <span className="text-[10px] font-medium text-[var(--theme-text-muted)]">{s.nim} | {s.ProgramStudi?.nama}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="mb-2 block text-[11px] font-bold text-[var(--theme-text)]">Keluhan Utama</label>
            <textarea
              value={manualRegData.keluhan}
              onChange={(e) => setManualRegData({ ...manualRegData, keluhan: e.target.value })}
              placeholder="Deskripsikan keluhan medis pasien..."
              rows="3"
              className="w-full p-4 border border-[var(--theme-border)] rounded-xl text-[12px] font-semibold focus:border-[var(--theme-primary)] outline-none bg-[var(--theme-bg)] text-[var(--theme-text)] shadow-sm resize-none"
              required
            />
          </div>
        </form>
      </DialogModal>

    </PageContent>
  );
}
