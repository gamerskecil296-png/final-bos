import React, { useState, useMemo, useRef, useCallback } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import {
  useOrganisasiListQuery,
  useOrmawaListQuery,
  useDaftarOrmawaMutation,
  usePendaftaranListQuery,
  useCreateOrganisasiMutation,
  useUpdateOrganisasiMutation,
  useDeleteOrganisasiMutation
} from '@/queries/useOrganisasiQuery';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import { CardGridSkeleton } from '@/components/ui/SkeletonGroups';
import EmptyState from '@/components/ui/EmptyState';
import { DataTable } from '@/components/ui/DataTable';
import { NavLink } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const ClipboardList = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>assignment</span>;
const Shield = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>security</span>;

const TIPE_COLORS = {
  UKM: { bg: 'bg-primary/10', text: 'text-primary' },
  'Himpunan Prodi': { bg: 'bg-primary/10', text: 'text-primary' },
  BEM: { bg: 'bg-primary/10', text: 'text-primary' },
  DPM: { bg: 'bg-primary/10', text: 'text-primary' },
  Komunitas: { bg: 'bg-background', text: 'text-text-muted' },
  Lainnya: { bg: 'bg-background', text: 'text-text-muted' },
};

export default function OrganisasiPage() {
  const { data: list, isLoading } = useOrganisasiListQuery();
  const { data: ormawaList, isLoading: isOrmawaLoading } = useOrmawaListQuery();
  const { data: pendaftaranList } = usePendaftaranListQuery();
  const { hasPermission } = usePermission();
  const canManageOrmawa = hasPermission('ormawa.create') || hasPermission('ormawa.manage') || hasPermission('ormawa.update') || hasPermission('ormawa.delete');

  const getRecruitmentStatus = (org) => {
    if (!org.open_recruitment) {
      return { isOpen: false, text: 'Pendaftaran Ditutup', color: 'bg-error/10 text-error border border-error/20', buttonText: 'Pendaftaran Ditutup' };
    }
    const now = new Date();
    if (org.recruitment_start && new Date(org.recruitment_start) > now) {
      const startDate = new Date(org.recruitment_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return { isOpen: false, text: `Mulai: ${startDate}`, color: 'bg-warning/10 text-warning border border-warning/20', buttonText: 'Belum Dibuka' };
    }
    if (org.recruitment_end && new Date(org.recruitment_end) < now) {
      return { isOpen: false, text: 'Pendaftaran Selesai', color: 'bg-error/10 text-error border border-error/20', buttonText: 'Pendaftaran Selesai' };
    }
    return { isOpen: true, text: 'Pendaftaran Dibuka', color: 'bg-success/10 text-success border border-success/20 animate-pulse', buttonText: 'Daftar Sekarang' };
  };

  const getPendaftaranRecord = (orgId) => {
    return pendaftaranList?.find(app => (app.OrmawaID === orgId || app.ormawa_id === orgId));
  };

  const { data: profile } = useQuery({
    queryKey: ['mahasiswa', 'profile'],
    queryFn: async () => {
      const { data } = await api.get('/profil');
      return data.data;
    }
  });

  const [mainTab, setMainTab] = useState('portfolio'); // 'portfolio', 'daftar', 'pendaftaran'
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [activeTab, setActiveTab] = useState('ringkasan');

  // Registration state
  const [selectedDaftarOrg, setSelectedDaftarOrg] = useState(null);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [divisiPilihan, setDivisiPilihan] = useState('');
  const [divisiPilihanDua, setDivisiPilihanDua] = useState('');
  const [alasan, setAlasan] = useState('');
  const [cvUrl, setCvUrl] = useState('');
  const [customAnswers, setCustomAnswers] = useState({});
  const [fileUploading, setFileUploading] = useState({});
  const [fileUploads, setFileUploads] = useState({});
  const [dragOver, setDragOver] = useState(null);
  const daftarMutation = useDaftarOrmawaMutation();

  const ormawaId = selectedDaftarOrg?.id || selectedDaftarOrg?.ID;
  const { data: divisionsList, isLoading: isDivisionsLoading } = useQuery({
    queryKey: ['ormawa', 'divisions', ormawaId],
    queryFn: async () => {
      if (!ormawaId) return [];
      const { data } = await api.get(`/organisasi/divisions/${ormawaId}`);
      return data.data || [];
    },
    enabled: !!ormawaId,
  });

  // Load dynamic recruitment form fields
  const { data: recruitmentFieldsData } = useQuery({
    queryKey: ['ormawa', 'recruitment-fields', ormawaId],
    queryFn: async () => {
      if (!ormawaId) return { fields: [] };
      try {
        const { data } = await api.get(`/organisasi/recruitment-fields/${ormawaId}`);
        return data;
      } catch {
        return { fields: [] };
      }
    },
    enabled: !!ormawaId,
  });
  const recruitmentFields = recruitmentFieldsData?.data || [];

  const closeDaftarModal = () => {
    setSelectedDaftarOrg(null);
    setRegistrationStep(1);
    setDivisiPilihan('');
    setDivisiPilihanDua('');
    setAlasan('');
    setCvUrl('');
    setCustomAnswers({});
    setFileUploading({});
    setFileUploads({});
    setDragOver(null);
  };

  const handleCustomAnswer = (fieldId, value) => {
    setCustomAnswers(prev => ({ ...prev, [String(fieldId)]: value }));
  };

  const handleFileUpload = async (fieldId, file) => {
    if (!file) return;
    setFileUploading(prev => ({ ...prev, [fieldId]: true }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/organisasi/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data.success) {
        handleCustomAnswer(fieldId, data.url);
        setFileUploads(prev => ({ ...prev, [fieldId]: { name: file.name, size: file.size } }));
        toast.success('File berhasil diunggah');
      }
    } catch {
      toast.error('Gagal mengunggah file. Maksimal 5 MB.');
    } finally {
      setFileUploading(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const handleDropFile = (fieldId, e) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFileUpload(fieldId, file);
  };

  const handleDragOver = (fieldId, e) => {
    e.preventDefault();
    setDragOver(fieldId);
  };

  const handleDragLeave = (fieldId, e) => {
    e.preventDefault();
    setDragOver(null);
  };


  // Portfolio CRUD state
  const [isPortModalOpen, setIsPortModalOpen] = useState(false);
  const [editingPort, setEditingPort] = useState(null);
  const [portForm, setPortForm] = useState({
    nama_organisasi: '',
    tipe: 'UKM',
    jabatan: '',
    periode_mulai: new Date().getFullYear(),
    periode_selesai: '',
    deskripsi_kegiatan: '',
    apresiasi: ''
  });

  const createMutation = useCreateOrganisasiMutation();
  const updateMutation = useUpdateOrganisasiMutation();
  const deleteMutation = useDeleteOrganisasiMutation();

  // Print state
  const [printCertData, setPrintCertData] = useState(null);

  const tipeColor = (tipe) => TIPE_COLORS[tipe] ?? TIPE_COLORS['Lainnya'];
  const currentAchievements = useMemo(() => selectedOrg?.Prestasi || [], [selectedOrg]);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    if (!selectedDaftarOrg) return;

    // Check GPA eligibility on student-side before submitting
    const studentIPK = profile?.IPK || 0;
    const minIPK = selectedDaftarOrg.min_ipk || selectedDaftarOrg.MinIPK || 0;
    const isNewStudent = profile?.SemesterSekarang === 1 || profile?.SemesterSekarang === "1";
    if (minIPK > 0 && studentIPK < minIPK && !isNewStudent) {
      toast.error(`IPK Anda (${studentIPK.toFixed(2)}) tidak memenuhi syarat minimal (${minIPK.toFixed(2)})`);
      return;
    }

    daftarMutation.mutate({
      ormawa_id: String(selectedDaftarOrg.id || selectedDaftarOrg.ID),
      divisi: divisiPilihan || 'Umum',
      divisi_pilihan_dua: divisiPilihanDua || undefined,
      alasan: recruitmentFields.length === 0 ? alasan : undefined,
      cv_url: recruitmentFields.length === 0 ? cvUrl : undefined,
      custom_answers: Object.keys(customAnswers).length > 0 ? customAnswers : undefined,
    }, {
      onSuccess: () => {
        toast.success(`Berhasil mengirim pendaftaran ke ${selectedDaftarOrg.Nama || selectedDaftarOrg.nama}!`);
        closeDaftarModal();
        setMainTab('portfolio');
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Gagal mengajukan pendaftaran');
      }
    });
  };

  const handlePortFormSubmit = (e) => {
    e.preventDefault();
    const payload = {
      nama_organisasi: portForm.nama_organisasi,
      tipe: portForm.tipe,
      jabatan: portForm.jabatan,
      periode_mulai: parseInt(portForm.periode_mulai),
      periode_selesai: portForm.periode_selesai ? parseInt(portForm.periode_selesai) : null,
      deskripsi_kegiatan: portForm.deskripsi_kegiatan,
      apresiasi: portForm.apresiasi
    };

    if (editingPort) {
      updateMutation.mutate({ id: editingPort.id || editingPort.ID, ...payload }, {
        onSuccess: () => {
          toast.success('Riwayat organisasi berhasil diperbarui!');
          setIsPortModalOpen(false);
          setEditingPort(null);
        },
        onError: (err) => {
          toast.error(err.response?.data?.message || 'Gagal memperbarui data');
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Riwayat organisasi berhasil dilaporkan!');
          setIsPortModalOpen(false);
          resetPortForm();
        },
        onError: (err) => {
          toast.error(err.response?.data?.message || 'Gagal menyimpan data');
        }
      });
    }
  };

  const resetPortForm = () => {
    setPortForm({
      nama_organisasi: '',
      tipe: 'UKM',
      jabatan: '',
      periode_mulai: new Date().getFullYear(),
      periode_selesai: '',
      deskripsi_kegiatan: '',
      apresiasi: ''
    });
  };

  const handleEditPort = (item) => {
    setEditingPort(item);
    setPortForm({
      nama_organisasi: item.NamaOrganisasi || '',
      tipe: item.Tipe || 'UKM',
      jabatan: item.Jabatan || '',
      periode_mulai: item.PeriodeMulai || new Date().getFullYear(),
      periode_selesai: item.PeriodeSelesai || '',
      deskripsi_kegiatan: item.DeskripsiKegiatan || '',
      apresiasi: item.Apresiasi || ''
    });
    setIsPortModalOpen(true);
  };

  const handleDeletePort = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus riwayat organisasi ini?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Riwayat organisasi berhasil dihapus');
        },
        onError: () => {
          toast.error('Gagal menghapus data');
        }
      });
    }
  };

  const handlePrintCertificate = (item) => {
    setPrintCertData(item);
  };

  const triggerPrint = () => {
    window.print();
  };

  const combinedData = useMemo(() => {
    const portfolioData = (list || []).map(p => ({
      _id: `port_${p.id || p.ID}`,
      _type: 'portfolio',
      ormawa_nama: p.NamaOrganisasi,
      tipe: p.Tipe,
      jabatan: p.Jabatan,
      periode: `${p.PeriodeMulai} - ${p.PeriodeSelesai || 'Sekarang'}`,
      status: p.StatusVerifikasi,
      raw: p
    }));

    const pendaftaranData = (pendaftaranList || [])
      .filter(a => a.Status?.toLowerCase() !== 'aktif')
      .map(a => {
        let st = a.Status?.toLowerCase() || 'pending';
        let statusLabel = 'Menunggu';
        if (st === 'tidak_aktif' || st === 'ditolak') statusLabel = 'Ditolak';

        return {
          _id: `pend_${a.id || a.ID}`,
          _type: 'pendaftaran',
          ormawa_nama: a.Ormawa?.Nama || 'Organisasi',
          tipe: a.Ormawa?.Kategori || 'Organisasi',
          jabatan: a.Divisi ? `${a.Role || 'Anggota'} (${a.Divisi})` : (a.Role || 'Anggota'),
          periode: a.CreatedAt ? new Date(a.CreatedAt).getFullYear().toString() : '-',
          status: statusLabel,
          raw: a
        };
      });

    return [...portfolioData, ...pendaftaranData];
  }, [list, pendaftaranList]);

  const columns = [
    {
      key: 'ormawa_nama',
      label: 'Organisasi',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-bku-text">{val}</span>
          <span className="text-[10px] text-text-muted">{row.tipe}</span>
        </div>
      )
    },
    {
      key: 'jabatan',
      label: 'Jabatan / Posisi',
      sortable: true,
      render: (val) => <span className="font-semibold text-text-muted">{val}</span>
    },
    {
      key: 'periode',
      label: 'Periode',
      sortable: true,
      render: (val) => <span className="text-sm">{val}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val, row) => {
        if (val === 'Terverifikasi') {
           return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-success/10 text-success border border-success/20 flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[12px]">check_circle</span> {val}</span>
        }
        if (val === 'Menunggu' || val === 'Pending') {
           return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-warning/10 text-warning border border-warning/20 flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[12px]">schedule</span> {val}</span>
        }
        if (val === 'Ditolak' || val === 'Tidak Aktif') {
           return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-error/10 text-error border border-error/20 flex items-center gap-1 w-max"><span className="material-symbols-outlined text-[12px]">cancel</span> {val}</span>
        }
        return <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-background text-text-muted border border-border w-max">{val || 'Draft'}</span>
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (_, row) => {
        if (row._type === 'portfolio') {
          const item = row.raw;
          const isPending = item.StatusVerifikasi === 'Menunggu' || item.StatusVerifikasi === 'Pending';
          const isVerified = item.StatusVerifikasi === 'Terverifikasi' || item.StatusVerifikasi === 'Diverifikasi' || item.StatusVerifikasi === 'Valid' || item.StatusVerifikasi === 'Disetujui';
          return (
            <div className="flex gap-2 items-center">
              {isVerified && (
                <button onClick={() => handlePrintCertificate(item)} className="p-1.5 text-success hover:bg-success/10 rounded-md transition-colors" title="Cetak Sertifikat">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
                </button>
              )}
              <button onClick={() => { setSelectedOrg(item); setActiveTab('ringkasan'); }} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" title="Detail">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
              </button>
              {isPending && (
                <>
                  <button onClick={() => handleEditPort(item)} className="p-1.5 text-warning hover:bg-warning/10 rounded-md transition-colors" title="Edit">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                  </button>
                  <button onClick={() => handleDeletePort(item.id || item.ID)} className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors" title="Hapus">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </>
              )}
            </div>
          );
        } else {
          return (
            <div className="flex gap-2 items-center">
              <button disabled className="p-1.5 text-text-muted/50 rounded-md" title="Sistem">
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>lock</span>
              </button>
            </div>
          );
        }
      }
    }
  ];

  return (
    <PageContent className="font-body">

      <div className="max-w-7xl mx-auto">
        <PageHeader
          title="Portfolio Keorganisasian"
          subtitle="Portofolio keaktifan organisasi kemahasiswaan dan pendaftaran Ormawa."
          icon="group"
          breadcrumbs={[
            { label: 'Dashboard', path: '/app/student/dashboard' },
            { label: 'Organisasi', path: '/app/student/organisasi' }
          ]}
        />

        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row border-b border-border mb-8 sm:items-center sm:justify-between gap-4 print:hidden">
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setMainTab('portfolio')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${mainTab === 'portfolio' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-bku-text'
                }`}
            >
              Keanggotaan & Riwayat ({combinedData.length})
            </button>
            <button
              onClick={() => setMainTab('daftar')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${mainTab === 'daftar' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-bku-text'
                }`}
            >
              Daftar Ormawa Baru
            </button>
          </div>
          {mainTab === 'portfolio' && canManageOrmawa && (
            <button
              onClick={() => { resetPortForm(); setEditingPort(null); setIsPortModalOpen(true); }}
              className="mb-2 sm:mb-0 bg-primary text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all shadow-sm shadow-primary/20 active:scale-95"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >add</span>
              Tambah Riwayat Organisasi
            </button>
          )}
        </div>

        {/* Content Tabs */}
        {mainTab === 'portfolio' && (
          isLoading ? (
            <CardGridSkeleton count={4} />
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <DataTable
                title="Daftar Organisasi"
                subtitle="Menampilkan daftar organisasi yang terdaftar."
                columns={columns}
                data={combinedData}
                searchable={true}
                searchPlaceholder="Cari organisasi atau jabatan..."
                manualFiltering={true}
                emptyStateProps={{
                  icon: "Users",
                  title: "Belum Ada Organisasi",
                  description: "Belum ada catatan keaktifan organisasi atau pendaftaran.",
                  iconBgClass: "bg-primary/10",
                  iconBorderClass: "border-primary/20",
                  actionLabel: "Daftar Ormawa",
                  onAction: () => setMainTab('daftar')
                }}
              />
            </div>
          )
        )}

        {mainTab === 'daftar' && (
          isOrmawaLoading ? (
            <CardGridSkeleton count={3} />
          ) : ormawaList?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 print:hidden">
              {ormawaList.map((org) => (
                <div
                  key={org.id || org.ID}
                  className="bg-surface rounded-2xl border border-border p-5 flex flex-col gap-4 hover:border-primary/20 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                      {org.LogoURL ? (
                        <img src={org.LogoURL} alt={org.Singkatan} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        org.Singkatan?.slice(0, 3) || 'ORG'
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-bku-text">{org.Nama}</h3>
                      <div className="flex flex-wrap gap-2 items-center mt-1">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wide border border-primary/20">
                          {org.Kategori || 'Organisasi'}
                        </span>
                        {(() => {
                          const status = getRecruitmentStatus(org);
                          return (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border ${status.color}`}>
                              {status.text}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-text-muted leading-relaxed line-clamp-3">
                    {org.Deskripsi || 'Tidak ada deskripsi.'}
                  </p>

                  {org.Visi && (
                    <div className="text-xs bg-background p-3 rounded-xl border border-border-muted">
                      <span className="font-bold text-bku-text block mb-0.5">Visi:</span>
                      <span className="text-text-muted italic">"{org.Visi}"</span>
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-border-muted flex items-center justify-between gap-4">
                    <div className="text-xs text-text-muted font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>email</span>
                      {org.Email || '-'}
                    </div>
                    {(() => {
                      const orgId = org.id || org.ID;
                      const record = getPendaftaranRecord(orgId);
                      const status = getRecruitmentStatus(org);

                      if (record && record.Status?.toLowerCase() === 'aktif') {
                        return (
                          <span className="px-3 py-1.5 rounded-xl bg-success/10 text-success text-xs font-bold border border-success/20">
                            Sudah Tergabung
                          </span>
                        );
                      }
                      if (record && record.Status?.toLowerCase() === 'pending') {
                        return (
                          <span className="px-3 py-1.5 rounded-xl bg-warning/10 text-warning text-xs font-bold border border-warning/20">
                            Menunggu Persetujuan
                          </span>
                        );
                      }
                      if (!status.isOpen) {
                        return (
                          <button
                            disabled
                            className="px-4 py-2 rounded-xl bg-background text-text-muted/40 text-xs font-bold border border-border cursor-not-allowed"
                          >
                            {status.buttonText || 'Pendaftaran Ditutup'}
                          </button>
                        );
                      }
                      return (
                        <button
                          onClick={() => setSelectedDaftarOrg(org)}
                          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition-colors active:scale-95 duration-150"
                        >
                          Daftar Sekarang
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="Users"
              title="Tidak Ada Organisasi"
              description="Tidak ada organisasi mahasiswa aktif yang tersedia saat ini."
              iconBgClass="bg-primary/10"
              iconBorderClass="border-primary/20"
            />
          )
        )}


      </div>

      {/* Detail Modal */}
      <Dialog open={!!selectedOrg} onOpenChange={() => setSelectedOrg(null)} maxWidth="max-w-4xl">
        <DialogContent>
          <DialogHeader>
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <span className="material-symbols-outlined text-8xl text-slate-900">group</span>
            </div>
            <div className="text-left relative z-10">
              <p className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Detail Organisasi</p>
              <DialogTitle className="text-xl md:text-2xl font-extrabold mt-1 text-[var(--theme-text)] leading-tight">
                {selectedOrg?.NamaOrganisasi}
              </DialogTitle>
              <DialogDescription className="text-sm text-[var(--theme-text-muted)] mt-1">
                {selectedOrg?.Jabatan} • {selectedOrg?.Tipe}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-8 pt-4 border-b border-[var(--theme-border-muted)] flex gap-2 overflow-x-auto bg-[var(--theme-bg)]/20">
            {[
              { key: 'ringkasan', label: 'Ringkasan', icon: ClipboardList },
              { key: 'prestasi', label: 'Prestasi', icon: Award },
              { key: 'verifikasi', label: 'Status & Verifikasi', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${isActive ? 'text-[var(--theme-primary)] border-[var(--theme-primary)] bg-[var(--theme-primary-light)]/20' : 'text-[var(--theme-text-muted)] border-transparent hover:text-[var(--theme-text)]'
                    }`}
                >
                  <Icon size={14} /> {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-8 overflow-y-auto max-h-[50vh] no-scrollbar">
            {selectedOrg && activeTab === 'ringkasan' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailItem label="Nama Organisasi" value={selectedOrg.NamaOrganisasi} />
                <DetailItem label="Jenis" value={selectedOrg.Tipe} />
                <DetailItem label="Jabatan" value={selectedOrg.Jabatan} />
                <DetailItem label="Periode" value={`${selectedOrg.PeriodeMulai} - ${selectedOrg.PeriodeSelesai || 'Sekarang'}`} />
                <DetailItem label="Deskripsi Kegiatan" value={selectedOrg.DeskripsiKegiatan || '-'} full />
                <DetailItem label="Apresiasi" value={selectedOrg.Apresiasi || '-'} full />
              </div>
            )}

            {selectedOrg && activeTab === 'prestasi' && (
              <div className="space-y-3">
                {currentAchievements.length > 0 ? currentAchievements.map((p) => (
                  <div key={p.id || p.ID} className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
                    <p className="font-semibold text-warning text-sm">{p.NamaKegiatan || '-'}</p>
                    <p className="text-xs text-warning mt-1">{p.Tingkat || '-'} • {p.Peringkat || '-'}</p>
                  </div>
                )) : (
                  <EmptyState
                    size="sm"
                    icon="emoji_events"
                    title="Belum Ada Prestasi"
                    description="Prestasi yang terkait organisasi ini belum tersedia."
                    iconBgClass="bg-warning/10"
                    iconBorderClass="border-warning/20"
                  />
                )}
              </div>
            )}

            {selectedOrg && activeTab === 'verifikasi' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[var(--theme-border)] p-4 bg-[var(--theme-bg)]">
                  <p className="text-xs text-[var(--theme-text-muted)]">Status Keanggotaan</p>
                  <p className="text-base font-semibold text-[var(--theme-text)] mt-1">{selectedOrg.PeriodeSelesai ? 'Selesai/Purna' : 'Aktif'}</p>
                </div>
                <div className="rounded-2xl border border-[var(--theme-border)] p-4 bg-[var(--theme-bg)]">
                  <p className="text-xs text-[var(--theme-text-muted)]">Status Verifikasi</p>
                  <p className="text-base font-semibold mt-1 text-[var(--theme-text)]">{selectedOrg.StatusVerifikasi || 'Menunggu'}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={() => setSelectedOrg(null)}
              className="w-full md:w-auto h-10 px-6 rounded-xl font-semibold text-xs text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] active:scale-95 transition-all shadow-none border border-[var(--theme-border)] bg-transparent cursor-pointer uppercase tracking-wider"
            >
              Tutup
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registration Modal — Step-by-step Wizard */}
      <Dialog open={!!selectedDaftarOrg} onOpenChange={closeDaftarModal} maxWidth="max-w-xl">
        <DialogContent className="p-0 overflow-hidden bg-[var(--theme-surface)] rounded-3xl border-0 shadow-2xl">
          {selectedDaftarOrg && (() => {
            const studentIPK = profile?.IPK || 0;
            const minIPK = selectedDaftarOrg.min_ipk || selectedDaftarOrg.MinIPK || 0;
            const isNewStudent = profile?.SemesterSekarang === 1 || profile?.SemesterSekarang === "1";
            const isGPAEligible = minIPK === 0 || studentIPK >= minIPK || isNewStudent;
            const hasDivisions = divisionsList && divisionsList.length > 0;
            const divisionsOptions = hasDivisions ? divisionsList.map(d => d.Nama || d.nama) : [];

            const totalSteps = 3;
            const allFieldsFilled = recruitmentFields.every(f => {
              if (!f.required) return true;
              const answer = customAnswers[String(f.id || f.ID)];
              if (f.type === 'file') return !!answer;
              if (f.type === 'checkbox') return Array.isArray(answer) && answer.length > 0;
              return !!answer;
            });
            const canProceedToReview = (!hasDivisions || divisiPilihan) && (recruitmentFields.length === 0 ? (alasan && cvUrl) : allFieldsFilled);

            return (
              <>
                <DialogHeader>
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <span className="material-symbols-outlined text-8xl text-slate-900">assignment</span>
                  </div>
                  <div className="text-left relative z-10">
                    <p className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Formulir Rekrutmen Anggota</p>
                    <DialogTitle className="text-lg font-extrabold mt-1 text-[var(--theme-text)]">
                      {selectedDaftarOrg.Nama || selectedDaftarOrg.nama}
                    </DialogTitle>
                  </div>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="px-8 pt-2 pb-4">
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((step) => {
                      const isActive = registrationStep === step;
                      const isDone = registrationStep > step;
                      return (
                        <React.Fragment key={step}>
                          <div className={`flex items-center gap-2 ${isActive ? 'text-[var(--theme-primary)]' : isDone ? 'text-[var(--theme-success)]' : 'text-[var(--theme-text-muted)]'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                              isActive ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)]/20 text-[var(--theme-primary)]' :
                              isDone ? 'border-[var(--theme-success)] bg-[var(--theme-success-light)]/20 text-[var(--theme-success)]' :
                              'border-[var(--theme-border)] bg-white text-[var(--theme-text-muted)]'
                            }`}>
                              {isDone ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> : step}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-wider hidden md:block ${isActive ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)]'}`}>
                              {step === 1 ? 'Profil & Syarat' : step === 2 ? 'Formulir' : 'Review'}
                            </span>
                          </div>
                          {step < 3 && (
                            <div className={`flex-1 h-[2px] rounded-full ${isDone ? 'bg-[var(--theme-success)]' : 'bg-[var(--theme-border)]'}`} />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>

                <form onSubmit={handleRegisterSubmit} className="flex flex-col">
                  <div className="px-8 space-y-5 max-h-[55vh] overflow-y-auto no-scrollbar pb-6">

                    {/* ── STEP 1: Profile & Requirements ── */}
                    {registrationStep === 1 && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                        {/* Persyaratan */}
                        {(selectedDaftarOrg.recruitment_requirements || minIPK > 0) && (
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-[var(--theme-text)] uppercase tracking-widest block flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-warning" style={{ fontSize: 16 }}>assignment_late</span>
                              Persyaratan & Kriteria
                            </label>
                            <div className="p-4 bg-warning/10 border border-warning/20 rounded-2xl text-xs font-semibold text-warning leading-relaxed space-y-2">
                              {selectedDaftarOrg.recruitment_requirements && (
                                <div className="whitespace-pre-wrap font-body">{selectedDaftarOrg.recruitment_requirements}</div>
                              )}
                              {minIPK > 0 && (
                                <div className="flex items-center gap-1.5 text-warning font-bold border-t border-warning/10 pt-2 mt-2">
                                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>school</span>
                                  <span>IPK Minimal: {minIPK.toFixed(2)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Profil */}
                        <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-[var(--theme-border)] pb-2">
                            <h4 className="text-[11px] font-semibold text-[var(--theme-text)] uppercase tracking-wider flex items-center gap-1">
                              <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 14 }}>verified_user</span>
                              Profil Pendaftar
                            </h4>
                            <span className="px-2 py-0.5 rounded bg-[var(--theme-success-light)]/20 text-[var(--theme-success)] text-[9px] font-semibold uppercase">Auto-filled</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div><span className="text-[var(--theme-text-muted)] font-medium">Nama</span><p className="font-semibold text-[var(--theme-text)] mt-0.5">{profile?.Nama || '-'}</p></div>
                            <div><span className="text-[var(--theme-text-muted)] font-medium">NIM</span><p className="font-semibold text-[var(--theme-text)] mt-0.5">{profile?.NIM || '-'}</p></div>
                            <div className="col-span-2"><span className="text-[var(--theme-text-muted)] font-medium">Program Studi</span><p className="font-semibold text-[var(--theme-text)] mt-0.5">{profile?.ProgramStudi?.Nama || '-'}</p></div>
                            <div className="col-span-2 border-t border-[var(--theme-border)] pt-2 flex items-center justify-between">
                              <div>
                                <span className="text-[var(--theme-text-muted)] font-medium block">IPK</span>
                                <span className="font-semibold text-sm text-[var(--theme-text)]">{studentIPK.toFixed(2)}</span>
                              </div>
                              <div>
                                {minIPK > 0 ? (
                                  isNewStudent ? (
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--theme-primary-light)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20">
                                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>school</span> Maba (Pengecualian)
                                    </span>
                                  ) : isGPAEligible ? (
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--theme-success-light)]/20 text-[var(--theme-success)] border border-[var(--theme-success)]/20">
                                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span> Memenuhi Syarat
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--theme-error-light)]/20 text-[var(--theme-error)] border border-[var(--theme-error)]/20">
                                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>cancel</span> IPK Kurang
                                    </span>
                                  )
                                ) : (
                                  <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] px-2.5 py-1 rounded border border-[var(--theme-border)]">Tidak Ada Syarat IPK</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {!isGPAEligible && (
                          <div className="p-4 bg-[var(--theme-error-light)]/20 border border-[var(--theme-error)]/20 text-[var(--theme-error)] text-xs font-semibold rounded-2xl flex gap-3 leading-relaxed">
                            <span className="material-symbols-outlined shrink-0 animate-bounce" style={{ fontSize: 18 }}>warning</span>
                            <span>Maaf, IPK Anda ({studentIPK.toFixed(2)}) di bawah minimum ({minIPK.toFixed(2)}).</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── STEP 2: Form ── */}
                    {registrationStep === 2 && isGPAEligible && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-right-2 duration-300">
                        {/* Divisi */}
                        {hasDivisions && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest block">Divisi Pilihan 1 <span className="text-[var(--theme-error)]">*</span></label>
                              <select value={divisiPilihan} onChange={e => setDivisiPilihan(e.target.value)}
                                className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors outline-none" required>
                                <option value="" disabled>-- Pilih Divisi --</option>
                                {divisionsOptions.map((div, i) => <option key={i} value={div}>{div}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest block">Divisi Pilihan 2 <span className="text-[var(--theme-text-muted)] text-[10px] font-normal">(Opsional)</span></label>
                              <select value={divisiPilihanDua} onChange={e => setDivisiPilihanDua(e.target.value)}
                                className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors outline-none">
                                <option value="">-- Tidak Memilih --</option>
                                {divisionsOptions.filter(d => d !== divisiPilihan).map((div, i) => <option key={i} value={div}>{div}</option>)}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Custom Fields atau Fallback */}
                        {recruitmentFields.length > 0 ? (
                          <div className="space-y-4 text-left">
                            <div className="flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
                              <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 15 }}>dynamic_form</span>
                              <h4 className="text-[11px] font-semibold text-[var(--theme-text)] uppercase tracking-wider">Pertanyaan Tambahan</h4>
                            </div>
                            {recruitmentFields.map((field) => {
                              const fieldId = field.id || field.ID;
                              const options = field.options ? field.options.split(',').map(o => o.trim()).filter(Boolean) : [];
                              const answer = customAnswers[String(fieldId)];
                              return (
                                <div key={fieldId} className="space-y-1.5">
                                  <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest block">
                                    {field.label}{field.required && <span className="text-[var(--theme-error)] ml-1">*</span>}
                                  </label>

                                  {field.type === 'text' && (
                                    <input type="text" placeholder={field.label} value={answer || ''}
                                      onChange={e => handleCustomAnswer(fieldId, e.target.value)} required={field.required}
                                      className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors outline-none" />
                                  )}

                                  {field.type === 'paragraph' && (
                                    <textarea placeholder={field.label} value={answer || ''}
                                      onChange={e => handleCustomAnswer(fieldId, e.target.value)} required={field.required}
                                      rows={3} className="w-full p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors resize-none" />
                                  )}

                                  {field.type === 'select' && (
                                    <select value={answer || ''} onChange={e => handleCustomAnswer(fieldId, e.target.value)} required={field.required}
                                      className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors outline-none">
                                      <option value="">-- Pilih --</option>
                                      {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                    </select>
                                  )}

                                  {field.type === 'checkbox' && (
                                    <div className="space-y-2">
                                      {options.map((opt, i) => {
                                        const checkedValues = Array.isArray(answer) ? answer : (answer ? [answer] : []);
                                        const isChecked = checkedValues.includes(opt);
                                        return (
                                          <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                                            <input type="checkbox" checked={isChecked}
                                              onChange={() => handleCustomAnswer(fieldId, isChecked ? checkedValues.filter(v => v !== opt) : [...checkedValues, opt])}
                                              className="w-4 h-4 rounded border-[var(--theme-border)] accent-[var(--theme-primary)]" />
                                            <span className="text-xs font-semibold text-[var(--theme-text)]">{opt}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {field.type === 'file' && (
                                    <div className="space-y-2">
                                      <div
                                        onDrop={e => handleDropFile(fieldId, e)}
                                        onDragOver={e => handleDragOver(fieldId, e)}
                                        onDragLeave={handleDragLeave}
                                        className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
                                          dragOver === fieldId
                                            ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)]/20'
                                            : 'border-[var(--theme-border)] bg-[var(--theme-bg)]/30 hover:border-[var(--theme-primary)]/50 hover:bg-[var(--theme-primary-light)]/10'
                                        } ${!isGPAEligible ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      >
                                        <span className="material-symbols-outlined text-2xl text-[var(--theme-primary)]">cloud_upload</span>
                                        <p className="text-xs font-semibold text-[var(--theme-text-muted)]">
                                          {fileUploading[fieldId] ? 'Mengunggah...' : 'Seret file ke sini atau klik untuk pilih'}
                                        </p>
                                        <p className="text-[10px] text-[var(--theme-text-muted)]">PDF / Gambar, maks 5 MB</p>
                                        <input type="file" accept=".pdf,image/*"
                                          disabled={!isGPAEligible || fileUploading[fieldId]}
                                          onChange={e => handleFileUpload(fieldId, e.target.files?.[0])}
                                          className="absolute inset-0 opacity-0 cursor-pointer" />
                                      </div>
                                      {fileUploads[fieldId] && (
                                        <div className="flex items-center justify-between p-2 bg-[var(--theme-success-light)]/20 border border-[var(--theme-success)]/20 rounded-xl">
                                          <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-[var(--theme-success)]" style={{ fontSize: 16 }}>check_circle</span>
                                            <span className="text-xs font-semibold text-[var(--theme-text)] truncate max-w-[200px]">{fileUploads[fieldId].name}</span>
                                          </div>
                                          <a href={answer} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--theme-primary)] font-bold hover:underline">Lihat</a>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          /* Fallback form */
                          <div className="space-y-4 text-left">
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest block">Alasan & Motivasi Bergabung <span className="text-[var(--theme-error)]">*</span></label>
                              <textarea placeholder="Tuliskan alasan singkat mengapa Anda tertarik bergabung..."
                                value={alasan} onChange={e => setAlasan(e.target.value)}
                                className="w-full h-24 p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors resize-none" required />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest block">CV / Portfolio <span className="text-[var(--theme-error)]">*</span></label>
                              <input type="url" placeholder="https://drive.google.com/..." value={cvUrl} onChange={e => setCvUrl(e.target.value)}
                                className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors outline-none" required />
                              <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] block">Gunakan link Google Drive dengan akses publik.</span>
                            </div>
                          </div>
                        )}

                        <div className="p-4 bg-[var(--theme-primary-light)]/20 border border-[var(--theme-primary)]/20 rounded-xl flex gap-3 text-xs text-[var(--theme-primary)] font-medium leading-relaxed">
                          <span className="material-symbols-outlined shrink-0" style={{ fontSize: 16 }}>info</span>
                          <span>Pendaftaran akan ditinjau oleh pengurus Ormawa. Status bisa dipantau di tab "Status Pendaftaran".</span>
                        </div>
                      </div>
                    )}

                    {/* ── STEP 3: Review & Submit ── */}
                    {registrationStep === 3 && isGPAEligible && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                        <div className="flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
                          <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 15 }}>summarize</span>
                          <h4 className="text-[11px] font-semibold text-[var(--theme-text)] uppercase tracking-wider">Ringkasan Pendaftaran</h4>
                        </div>

                        {/* Profile Summary */}
                        <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider">Pendaftar</span>
                            <span className="text-[10px] text-[var(--theme-success)] font-semibold">Terverifikasi</span>
                          </div>
                          <p className="font-bold text-[var(--theme-text)]">{profile?.Nama} ({profile?.NIM})</p>
                          <p className="text-xs text-[var(--theme-text-muted)]">{profile?.ProgramStudi?.Nama} · IPK: {studentIPK.toFixed(2)}</p>
                        </div>

                        {/* Division Summary */}
                        {hasDivisions && (
                          <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-4 space-y-2">
                            <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider block">Divisi Pilihan</span>
                            <div className="flex gap-2">
                              <span className="px-3 py-1.5 rounded-lg bg-[var(--theme-primary-light)]/20 text-[var(--theme-primary)] text-xs font-bold">{divisiPilihan}</span>
                              {divisiPilihanDua && <span className="px-3 py-1.5 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] text-xs font-bold text-[var(--theme-text-muted)]">Cadangan: {divisiPilihanDua}</span>}
                            </div>
                          </div>
                        )}

                        {/* Custom Answers Summary */}
                        {recruitmentFields.length > 0 ? (
                          <div className="space-y-3">
                            <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider block">Jawaban Pertanyaan</span>
                            {recruitmentFields.map(f => {
                              const answer = customAnswers[String(f.id || f.ID)];
                              if (!answer) return null;
                              return (
                                <div key={f.id || f.ID} className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-4">
                                  <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">{f.label}</p>
                                  <p className="text-xs font-semibold text-[var(--theme-text)]">
                                    {f.type === 'file' ? (
                                      <a href={answer} target="_blank" rel="noreferrer" className="text-[var(--theme-primary)] hover:underline flex items-center gap-1">
                                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>attach_file</span>
                                        File terlampir
                                      </a>
                                    ) : Array.isArray(answer) ? answer.join(', ') : String(answer)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-4 space-y-2">
                            <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider block">Alasan & CV</span>
                            <p className="text-xs font-semibold text-[var(--theme-text)] leading-relaxed">{alasan}</p>
                            {cvUrl && <a href={cvUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--theme-primary)] font-bold hover:underline flex items-center gap-1 mt-1">
                              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                              Lihat CV/Portfolio
                            </a>}
                          </div>
                        )}

                        <div className="p-4 bg-[var(--theme-warning-light)]/20 border border-[var(--theme-warning)]/20 rounded-2xl flex gap-3 text-xs font-semibold text-warning leading-relaxed">
                          <span className="material-symbols-outlined shrink-0" style={{ fontSize: 18 }}>info</span>
                          <span>Dengan mengirim pendaftaran ini, Anda menyetujui bahwa data Anda akan ditinjau oleh pengurus Ormawa.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Step Navigation & Submit ── */}
                  <DialogFooter className="flex gap-3 shrink-0 px-8 pb-6 pt-2">
                    {registrationStep > 1 ? (
                      <button type="button" onClick={() => setRegistrationStep(s => s - 1)}
                        className="h-10 px-5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] font-semibold rounded-xl transition-all text-xs active:scale-95 cursor-pointer flex items-center gap-1">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
                        Kembali
                      </button>
                    ) : (
                      <button type="button" onClick={closeDaftarModal}
                        className="h-10 px-5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] font-semibold rounded-xl transition-all text-xs active:scale-95 cursor-pointer">
                        Batal
                      </button>
                    )}

                    <div className="flex-1" />

                    {registrationStep < totalSteps ? (
                      <button type="button" onClick={() => setRegistrationStep(s => s + 1)}
                        disabled={(registrationStep === 1 && !isGPAEligible) || (registrationStep === 2 && !canProceedToReview)}
                        className={`h-10 px-6 font-semibold rounded-xl transition-all text-xs flex items-center gap-1 active:scale-95 cursor-pointer border-none ${
                          ((registrationStep === 1 && !isGPAEligible) || (registrationStep === 2 && !canProceedToReview))
                            ? 'bg-[var(--theme-text-subtle)] text-white/50 cursor-not-allowed'
                            : 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)]'
                        }`}>
                        Lanjut <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                      </button>
                    ) : (
                      <button type="submit" disabled={daftarMutation.isPending}
                        className={`h-10 px-6 font-semibold rounded-xl transition-all text-xs flex items-center gap-1.5 active:scale-95 text-white border-none cursor-pointer ${
                          daftarMutation.isPending ? 'bg-[var(--theme-text-subtle)]' : 'bg-[var(--theme-success)] hover:bg-[var(--theme-success-hover)]'
                        }`}>
                        {daftarMutation.isPending ? (
                          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Mengirim...</>
                        ) : (
                          <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span> Kirim Pendaftaran</>
                        )}
                      </button>
                    )}
                  </DialogFooter>
                </form>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

    {/* Certificate Print Preview Modal */ }
    <Dialog open= {!!printCertData
} onOpenChange = {() => setPrintCertData(null)} maxWidth = "max-w-4xl" >
  <DialogContent className="print:shadow-none print:border-none print:w-full print:max-w-none print:h-full print:rounded-none">
    {printCertData && (
      <>
        {/* Modal Header (Hidden on Print) */}
        <div className="bg-[var(--theme-primary)] text-white p-5 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">badge</span>
            <span className="font-semibold text-sm uppercase tracking-wider">Cetak Sertifikat Keaktifan Organisasi</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={triggerPrint}
              className="h-10 px-4 bg-[var(--theme-success)] hover:bg-[var(--theme-success)]/90 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border-none cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>print</span> Cetak Sekarang
            </button>
          </div>
        </div>

        {/* Certificate Print Area */}
        <div className="p-6 md:p-10 flex-1 flex justify-start lg:justify-center bg-gray-50 print:bg-white print:p-0 overflow-auto">
          <div
            id="certificate-print-area"
            className="w-[842px] h-[595px] bg-surface border-[16px] border-double border-warning/30 p-8 relative flex flex-col justify-between shadow-lg print:shadow-none print:border-double print:m-0 shrink-0"
            style={{
              backgroundImage: 'radial-gradient(circle, #fff 60%, #fffbeb 100%)',
            }}
          >
            {/* Certificate Background watermark */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center">
              <span className="material-symbols-outlined text-[350px] text-primary">group</span>
            </div>

            {/* Certificate Inner Border */}
            <div className="absolute inset-2 border border-warning/30/50 pointer-events-none"></div>

            {/* Top Section */}
            <div className="text-center relative z-10">
              <div className="flex justify-center items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-4xl text-primary">school</span>
                <div className="text-left">
                  <h2 className="text-lg font-black tracking-widest text-primary leading-none">UNIVERSITAS BHAKTI KENCANA</h2>
                  <p className="text-[9px] font-bold tracking-widest text-text-muted mt-0.5 uppercase">Lembaga Kemahasiswaan & Hubungan Alumni</p>
                </div>
              </div>
              <div className="h-[2px] w-48 bg-warning mx-auto my-3"></div>
              <h1 className="text-3xl font-serif font-black text-primary uppercase tracking-wide">Sertifikat Penghargaan</h1>
              <p className="text-[10px] font-bold text-warning uppercase tracking-widest mt-1">Nomor: BKU-CERT/ORG/{printCertData.id || printCertData.ID}/{new Date().getFullYear()}</p>
            </div>

            {/* Body Section */}
            <div className="text-center my-6 relative z-10 px-8">
              <p className="text-xs text-text-muted font-semibold italic">Sertifikat ini diberikan dengan penuh apresiasi kepada:</p>
              <h3 className="text-2xl font-serif font-black text-primary mt-3 border-b border-border pb-2 inline-block px-12">
                {profile?.Nama || 'NAMA MAHASISWA'}
              </h3>
              <p className="text-xs font-bold text-text-muted mt-1.5">NIM: {profile?.NIM || 'NIM MAHASISWA'}</p>

              <p className="text-xs text-text-muted leading-relaxed max-w-xl mx-auto mt-5">
                Atas dedikasi, kontribusi, dan keaktifannya sebagai <strong className="text-bku-text">{printCertData.Jabatan}</strong> dalam organisasi <strong className="text-primary">{printCertData.NamaOrganisasi}</strong> periode <strong className="text-bku-text">{printCertData.PeriodeMulai} - {printCertData.PeriodeSelesai || 'Sekarang'}</strong>.
              </p>
            </div>

            {/* Footer Section (Signatures) */}
            <div className="flex justify-between items-end px-10 relative z-10 mt-auto">
              <div className="text-center w-48">
                <p className="text-[9px] font-bold text-text-muted uppercase mb-1">Ketua Umum {printCertData.NamaOrganisasi}</p>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif text-[11px] italic text-text-muted">Tanda Tangan Digital</span>
                </div>
                <div className="h-[1px] bg-[#a3a3a3] w-full mt-2"></div>
                <p className="text-[10px] font-extrabold text-bku-text mt-1">Ketua {printCertData.NamaOrganisasi}</p>
              </div>

              {/* Stamp or verification badge */}
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-warning/30/50 rounded-full w-20 h-20 bg-warning/5 backdrop-blur-sm shadow-inner">
                <span className="material-symbols-outlined text-warning text-2xl">verified</span>
                <span className="text-[6px] font-black text-warning tracking-tighter uppercase mt-0.5">BKU Hub</span>
                <span className="text-[6px] font-black text-warning tracking-tighter uppercase">Verified</span>
              </div>

              <div className="text-center w-48">
                <p className="text-[9px] font-bold text-text-muted uppercase mb-1">Rektor Universitas Bhakti Kencana</p>
                <div className="h-10 flex items-center justify-center">
                  <span className="font-serif text-[11px] italic text-text-muted">Tanda Tangan Digital</span>
                </div>
                <div className="h-[1px] bg-[#a3a3a3] w-full mt-2"></div>
                <p className="text-[10px] font-extrabold text-bku-text mt-1">Dr. Rektor Universitas</p>
              </div>
            </div>
          </div>
        </div>

        <style>{`
                @page {
                  size: landscape;
                  margin: 0;
                }
                @media print {
                  body * {
                    visibility: hidden !important;
                  }
                  #certificate-print-area, #certificate-print-area * {
                    visibility: visible !important;
                  }
                  #certificate-print-area {
                    position: absolute !important;
                    left: 50% !important;
                    top: 50% !important;
                    transform: translate(-50%, -50%) !important;
                    width: 842px !important;
                    height: 595px !important;
                    margin: 0 !important;
                    padding: 32px !important;
                    box-shadow: none !important;
                    border: 16px double #b45309 !important;
                    background-color: white !important;
                    box-sizing: border-box !important;
                  }
                }
              `}</style>
      </>
    )}
  </DialogContent>
      </Dialog>

  {/* Portfolio Add/Edit Modal */ }
  <Dialog open= { isPortModalOpen } onOpenChange = {(open) => { if (!open) { setIsPortModalOpen(false); setEditingPort(null); } }} maxWidth = "max-w-lg" >
    <DialogContent>
      <DialogHeader>
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <span className="material-symbols-outlined text-8xl text-slate-900">edit_note</span>
        </div>
        <div className="text-left relative z-10">
          <p className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">
            {editingPort ? 'Ubah Riwayat Organisasi' : 'Tambah Riwayat Organisasi'}
          </p>
          <DialogTitle className="text-lg font-extrabold mt-1 text-[var(--theme-text)]">
            {editingPort ? 'Edit Data Keorganisasian' : 'Laporkan Keaktifan Organisasi'}
          </DialogTitle>
        </div>
      </DialogHeader>

      <form onSubmit={handlePortFormSubmit} className="flex flex-col">
        <div className="p-8 space-y-4 max-h-[50vh] overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] uppercase block text-left">Nama Organisasi <span className="text-[var(--theme-error)]">*</span></label>
            <input
              type="text"
              placeholder="Contoh: Himpunan Mahasiswa Informatika"
              value={portForm.nama_organisasi}
              onChange={(e) => setPortForm({ ...portForm, nama_organisasi: e.target.value })}
              className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors outline-none text-left"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] uppercase block">Tipe Organisasi <span className="text-[var(--theme-error)]">*</span></label>
              <select
                value={portForm.tipe}
                onChange={(e) => setPortForm({ ...portForm, tipe: e.target.value })}
                className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors outline-none"
                required
              >
                <option value="UKM">UKM</option>
                <option value="Himpunan Prodi">Himpunan Prodi</option>
                <option value="BEM">BEM</option>
                <option value="DPM">DPM</option>
                <option value="Komunitas">Komunitas</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] uppercase block">Jabatan <span className="text-[var(--theme-error)]">*</span></label>
              <input
                type="text"
                placeholder="Contoh: Ketua, Anggota"
                value={portForm.jabatan}
                onChange={(e) => setPortForm({ ...portForm, jabatan: e.target.value })}
                className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] uppercase block">Tahun Mulai <span className="text-[var(--theme-error)]">*</span></label>
              <input
                type="number"
                placeholder="Contoh: 2025"
                value={portForm.periode_mulai}
                onChange={(e) => setPortForm({ ...portForm, periode_mulai: e.target.value })}
                className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors outline-none"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] uppercase block">Tahun Selesai (Kosongkan jika aktif)</label>
              <input
                type="number"
                placeholder="Contoh: 2026"
                value={portForm.periode_selesai}
                onChange={(e) => setPortForm({ ...portForm, periode_selesai: e.target.value })}
                className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors outline-none"
              />
            </div>
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] uppercase block">Deskripsi Kegiatan</label>
            <textarea
              placeholder="Deskripsikan kontribusi atau peran Anda..."
              value={portForm.deskripsi_kegiatan}
              onChange={(e) => setPortForm({ ...portForm, deskripsi_kegiatan: e.target.value })}
              className="w-full p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors resize-none h-20"
            />
          </div>

          <div className="space-y-1 text-left">
            <label className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] uppercase block">Apresiasi/Penghargaan (Opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Anggota Terbaik Periode 2025"
              value={portForm.apresiasi}
              onChange={(e) => setPortForm({ ...portForm, apresiasi: e.target.value })}
              className="h-10 w-full px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl font-semibold text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors outline-none"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => { setIsPortModalOpen(false); setEditingPort(null); }}
            className="flex-1 h-10 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] font-semibold rounded-xl transition-all uppercase tracking-wide text-xs active:scale-95 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1 h-10 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white font-semibold rounded-xl transition-all text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 border-none cursor-pointer"
          >
            {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan Riwayat'}
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
      </Dialog>
    </PageContent>
  );
}

function DetailItem({ label, value, full = false }) {
  return (
    <div className={`rounded-2xl border border-[var(--theme-border)] p-4 bg-[var(--theme-bg)] ${full ? 'md:col-span-2' : ''}`}>
      <p className="text-xs text-[var(--theme-text-muted)] text-left">{label}</p>
      <p className="text-sm font-semibold text-[var(--theme-text)] mt-1 whitespace-pre-wrap text-left">{value || '-'}</p>
    </div>
  );
}
