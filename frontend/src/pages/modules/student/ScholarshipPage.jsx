import React, { useState, useRef } from 'react';
import { PageContent, PageHeader, PageCard } from '@/components/ui/page';
import { CardContent } from '@/components/ui/Card';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable';
import { useNavigate, NavLink } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DialogModal } from '@/components/ui/DialogModal';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { 
  useScholarshipKatalogQuery, 
  useScholarshipRiwayatQuery, 
  useDaftarBeasiswaMutation 
} from '@/queries/useScholarshipQuery';
import api from '@/lib/axios';
import useAuthStore from '@/store/useAuthStore';
import { usePermission } from '@/hooks/usePermission';

import { motion, AnimatePresence } from 'framer-motion';
import { CardGridSkeleton, TableSkeleton } from '@/components/ui/SkeletonGroups';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'react-hot-toast';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const ArrowLeft = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>arrow_back</span>;
const Wallet = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>account_balance_wallet</span>;
const DescriptionIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>description</span>;
const ScheduleIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const EmojiEventsIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const CloseIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>close</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Sparkles = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>auto_awesome</span>;
const Filter = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>filter_alt</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const LayoutGrid = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>grid_view</span>;
const History = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>history</span>;



// ======================== UTILITIES ========================
const formatRupiah = (number) => {
  if (number === undefined || number === null || isNaN(number)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number);
};

const getDaysLeft = (deadline) => {
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};



// ======================== STATUS CONFIG ========================
const STATUS_BADGE = {
  dikirim: { label: 'Dikirim', color: 'text-[var(--theme-primary)]', bg: 'bg-[var(--theme-primary-light)]', border: 'border-[var(--theme-primary)]/20' },
  menunggu: { label: 'Menunggu', color: 'text-[var(--theme-primary)]', bg: 'bg-[var(--theme-primary-light)]', border: 'border-[var(--theme-primary)]/20' },
  proses: { label: 'Proses', color: 'text-[var(--theme-warning)]', bg: 'bg-[var(--theme-warning-light)]', border: 'border-[var(--theme-warning)]/20' },
  diterima: { label: 'Diterima', color: 'text-[var(--theme-success)]', bg: 'bg-[var(--theme-success-light)]', border: 'border-[var(--theme-success)]/20' },
  ditolak: { label: 'Ditolak', color: 'text-[var(--theme-error)]', bg: 'bg-[var(--theme-error-light)]', border: 'border-[var(--theme-error)]/20' },
  seleksi_berkas: { label: 'Seleksi Berkas', color: 'text-[var(--theme-primary)]', bg: 'bg-[var(--theme-primary-light)]', border: 'border-[var(--theme-primary)]/20' },
  evaluasi: { label: 'Evaluasi', color: 'text-[var(--theme-primary)]', bg: 'bg-[var(--theme-primary-light)]', border: 'border-[var(--theme-primary-light)]' },
  review: { label: 'Review', color: 'text-[var(--theme-primary)]', bg: 'bg-[var(--theme-primary-light)]', border: 'border-[var(--theme-primary)]/20' },
  penetapan: { label: 'Penetapan', color: 'text-[var(--theme-warning)]', bg: 'bg-[var(--theme-warning-light)]', border: 'border-[var(--theme-warning)]/20' },
};

// ======================== APPLICATION MODAL (3/4-STEP WIZARD) ========================
function ApplyWizard({ scholarship, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [motivasi, setMotivasi] = useState('');
  const [files, setFiles] = useState({}); // { key: File }
  const [customAnswers, setCustomAnswers] = useState({}); // { label: value }
  const [agreed, setAgreed] = useState(false);
  const fileInputRefs = useRef({});
  const daftarMutation = useDaftarBeasiswaMutation();

  const scholarshipNama = scholarship?.nama || scholarship?.Nama || '';

  const customFields = React.useMemo(() => {
    const raw = scholarship?.custom_fields || scholarship?.CustomFields;
    if (!raw) return [];
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [scholarship]);

  const hasCustomFields = customFields.length > 0;
  const totalSteps = hasCustomFields ? 4 : 3;

  const handleFileChange = (key, file) => {
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }
    setFiles(prev => ({ ...prev, [key]: file }));
  };

  const handleCustomFileChange = async (label, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran berkas maksimal 5MB');
      return;
    }
    
    const toastId = toast.loading(`Mengunggah berkas ${label}...`);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const { data } = await api.post('/scholarship/upload-custom-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (data.success) {
        const fileUrl = data.url;
        setCustomAnswers(prev => ({ ...prev, [label]: fileUrl }));
        toast.success(`Berkas ${label} berhasil diunggah`, { id: toastId });
      } else {
        toast.error(`Gagal mengunggah berkas: ${data.message}`, { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error(`Kesalahan sistem saat mengunggah berkas`, { id: toastId });
    }
  };

  const isStep1Valid = motivasi.length >= 150;
  
  const fileKtmRule = scholarship?.file_ktm || scholarship?.FileKtm || 'wajib';
  const fileTranskripRule = scholarship?.file_transkrip || scholarship?.FileTranskrip || 'wajib';
  const fileSertifikatRule = scholarship?.file_sertifikat || scholarship?.FileSertifikat || 'opsional';

  const requiredKeys = [];
  if (fileKtmRule === 'wajib') requiredKeys.push('ktm_ktp');
  if (fileTranskripRule === 'wajib') requiredKeys.push('transkrip');
  if (fileSertifikatRule === 'wajib') requiredKeys.push('sertifikat');
  
  const isStep2Valid = requiredKeys.every(key => !!files[key]);

  const isStep3Valid = React.useMemo(() => {
    if (!hasCustomFields) return true;
    return customFields.every(field => {
      if (!field.required) return true;
      const val = customAnswers[field.label];
      if (val === undefined || val === null) return false;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'string') return val.trim().length > 0;
      return !!val;
    });
  }, [customFields, customAnswers, hasCustomFields]);

  const handleSubmit = () => {
    const formData = new FormData();
    formData.append('motivasi', motivasi);
    Object.entries(files).forEach(([key, file]) => {
      if (file) {
        formData.append(key, file);
      }
    });
    if (hasCustomFields) {
      formData.append('custom_answers', JSON.stringify(customAnswers));
    }

    daftarMutation.mutate({ id: scholarship.id || scholarship.ID, formData }, {
      onSuccess: () => {
        onSuccess();
      },
      onError: (error) => {
        const msg = error.response?.data?.message || 'Gagal mengirim pendaftaran';
        toast.error(msg);
      }
    });
  };

  const isNextDisabled = () => {
    if (step === 1) return !isStep1Valid;
    if (step === 2) return !isStep2Valid;
    if (step === 3 && hasCustomFields) return !isStep3Valid;
    return false;
  };

  return (
    <DialogModal
      open={true}
      onOpenChange={(open) => { if (!open) onClose(); }}
      title="Pendaftaran Beasiswa"
      subtitle={scholarshipNama}
      badgeText={`Langkah ${step} dari ${totalSteps}`}
      icon="workspace_premium"
      maxWidth="max-w-4xl"
      bodyClassName="p-0"
      footer={
        <>
          {step > 1 ? (
            <Button 
              onClick={() => setStep(s => s - 1)}
              variant="ghost"
              className="w-full md:w-auto text-[10px] font-black tracking-widest text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] px-6 h-11 rounded-xl active:scale-95 transition-all shadow-none border-none cursor-pointer font-headline uppercase"
            >
              Sebelumnya
            </Button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <Button 
              disabled={isNextDisabled()}
              onClick={() => setStep(s => s + 1)}
              className="w-full md:w-auto h-11 px-8 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 border-none cursor-pointer font-black text-[10px]"
            >
              Lanjutkan <span className="material-symbols-outlined" style={{ fontSize: '15px' }} >arrow_forward</span>
            </Button>
          ) : (
            <Button 
              disabled={!agreed || daftarMutation.isPending}
              onClick={handleSubmit}
              className="w-full md:w-auto h-11 px-8 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 border-none cursor-pointer font-black text-[10px]"
            >
              {daftarMutation.isPending ? (
                <span className="material-symbols-outlined animate-spin size-4" style={{ fontSize: '15px' }}>sync</span>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>send</span>
                  <span className="text-[10px] font-black tracking-widest uppercase">Kirim Pengajuan</span>
                </>
              )}
            </Button>
          )}
        </>
      }
    >
      {/* Progress Bar */}
      <div className="h-1.5 bg-[var(--theme-bg)] w-full flex">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`flex-1 transition-all duration-500 ${step >= (i + 1) ? 'bg-primary' : 'bg-transparent'}`} />
        ))}
      </div>

      {/* Body */}
      <div className="p-8 pt-5 space-y-5 max-h-[50vh] overflow-y-auto no-scrollbar">
          {/* STEP 1: DATA PENGAJUAN */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-[var(--theme-text-muted)] tracking-[0.2em] ml-1 uppercase font-headline mb-2">Pernyataan Motivasi / Motivation Letter *</label>
                <textarea 
                  value={motivasi}
                  onChange={(e) => setMotivasi(e.target.value)}
                  placeholder="Jelaskan kenapa kamu layak menerima beasiswa ini... (min. 150 karakter)"
                  className="w-full h-40 p-5 rounded-xl border-[var(--theme-border)] focus:border-primary outline-none text-xs leading-relaxed resize-none shadow-inner bg-[var(--theme-bg)] focus:bg-[var(--theme-surface)] transition-all font-bold text-xs"
                />
                <div className="flex justify-between mt-2">
                  <p className={`text-[10px] font-bold ${motivasi.length < 150 ? 'text-[var(--theme-error)]' : 'text-[var(--theme-success)]'}`}>
                    {motivasi.length} / 150 Karakter Minimum
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: UPLOAD BERKAS UTAMA */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'ktm_ktp', label: 'Kartu Tanda Mahasiswa & KTP' + (fileKtmRule === 'opsional' ? ' (Opsional)' : ''), required: fileKtmRule === 'wajib', rule: fileKtmRule },
                { key: 'transkrip', label: 'Transkrip Nilai Akademik' + (fileTranskripRule === 'opsional' ? ' (Opsional)' : ''), required: fileTranskripRule === 'wajib', rule: fileTranskripRule },
                { key: 'sertifikat', label: 'Sertifikat Pendukung' + (fileSertifikatRule === 'opsional' ? ' (Opsional)' : ''), required: fileSertifikatRule === 'wajib', rule: fileSertifikatRule }
              ].filter(item => item.rule !== 'tidak').map(item => (
                <div key={item.key} className="relative">
                  <label className="block text-[10px] font-black text-[var(--theme-text-muted)] tracking-[0.2em] ml-1 uppercase font-headline mb-2">
                    {item.label} {item.required && <span className="text-[var(--theme-error)]">*</span>}
                  </label>
                  <div 
                    onClick={() => fileInputRefs.current[item.key].click()}
                    className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-4 ${
                       files[item.key] ? 'border-[var(--theme-success)] bg-[var(--theme-success-light)]' : 'border-[var(--theme-border)] hover:border-primary bg-[var(--theme-bg)]'
                     }`}
                  >
                    <div className={`p-2 rounded-xl ${files[item.key] ? 'bg-[var(--theme-success)] text-white' : 'bg-[var(--theme-surface)] border-[var(--theme-border)] shadow-sm text-[var(--theme-text-muted)]'}`}>
                      {files[item.key] ? <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >assignment_turned_in</span> : <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >upload</span>}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-black truncate">{files[item.key] ? files[item.key].name : `Pilih Berkas`}</p>
                              <p className="text-[9px] text-[var(--theme-text-muted)] font-bold uppercase tracking-tighter">PDF/JPG (Max. 5MB)</p>
                    </div>
                    {files[item.key] && <span className="material-symbols-outlined text-[var(--theme-success)]" style={{ fontSize: 16 }}>check</span>}
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={el => fileInputRefs.current[item.key] = el}
                    onChange={(e) => handleFileChange(item.key, e.target.files[0])}
                  />
                </div>
              ))}
            </motion.div>
          )}

          {/* STEP 3: PERSYARATAN KUSTOM (Google Form style) */}
          {hasCustomFields && step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-[var(--theme-bg)] p-6 rounded-2xl border-[var(--theme-border)] space-y-5 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary">description</span>
                  <h4 className="font-black text-primary uppercase tracking-wider text-xs">Form Persyaratan Tambahan</h4>
                </div>
                
                {customFields.map((field, idx) => {
                  const label = field.label;
                  const type = field.type;
                  const required = field.required;
                  const options = field.options ? field.options.split(',').map(o => o.trim()).filter(Boolean) : [];
                  
                  return (
                    <div key={idx} className="space-y-2">
                      <label className="block text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider">
                        {label} {required && <span className="text-[var(--theme-error)]">*</span>}
                      </label>
                      
                      {type === 'text' && (
                        <input
                          type="text"
                          required={required}
                          value={customAnswers[label] || ''}
                          onChange={(e) => setCustomAnswers(prev => ({ ...prev, [label]: e.target.value }))}
                          placeholder="Masukkan jawaban..."
                          className="w-full h-10 px-4 rounded-xl border-[var(--theme-border)] focus:border-primary outline-none text-xs bg-[var(--theme-surface)] font-bold"
                        />
                      )}
                      
                      {type === 'paragraph' && (
                        <textarea
                          required={required}
                          value={customAnswers[label] || ''}
                          onChange={(e) => setCustomAnswers(prev => ({ ...prev, [label]: e.target.value }))}
                          placeholder="Masukkan jawaban panjang..."
                          className="w-full h-24 p-4 rounded-xl border-[var(--theme-border)] focus:border-primary outline-none text-xs bg-[var(--theme-surface)] resize-none font-bold"
                        />
                      )}
                      
                      {type === 'select' && (
                        <select
                          required={required}
                          value={customAnswers[label] || ''}
                          onChange={(e) => setCustomAnswers(prev => ({ ...prev, [label]: e.target.value }))}
                          className="w-full h-10 px-3 rounded-xl border-[var(--theme-border)] focus:border-primary outline-none text-xs bg-[var(--theme-surface)] font-bold"
                        >
                          <option value="">-- Pilih opsi --</option>
                          {options.map((opt, i) => (
                            <option key={i} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                      
                      {type === 'checkbox' && (
                        <div className="space-y-2 bg-[var(--theme-surface)] p-4 rounded-xl border-[var(--theme-border)]">
                          {options.map((opt, i) => {
                            const currentList = Array.isArray(customAnswers[label]) ? customAnswers[label] : [];
                            const checked = currentList.includes(opt);
                            return (
                              <label key={i} className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const nextList = e.target.checked 
                                      ? [...currentList, opt]
                                      : currentList.filter(x => x !== opt);
                                    setCustomAnswers(prev => ({ ...prev, [label]: nextList }));
                                  }}
                                  className="rounded text-primary focus:ring-primary size-4"
                                />
                                <span className="text-xs font-bold text-[var(--theme-text)]">{opt}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      
                      {type === 'file' && (
                        <div className="relative">
                          <div
                            onClick={() => fileInputRefs.current[`custom-${idx}`].click()}
                            className={`p-4 rounded-xl border-2 border-dashed cursor-pointer transition-all flex items-center gap-4 ${
                               customAnswers[label] ? 'border-[var(--theme-success)] bg-[var(--theme-success-light)]' : 'border-[var(--theme-border)] hover:border-primary bg-[var(--theme-surface)]'
                             }`}
                          >
                            <div className={`p-2 rounded-xl ${customAnswers[label] ? 'bg-[var(--theme-success)] text-white' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]'}`}>
                              {customAnswers[label] ? <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >assignment_turned_in</span> : <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >upload</span>}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-bold truncate">
                                {customAnswers[label] ? 'Berkas berhasil diunggah' : 'Pilih Berkas'}
                              </p>
                      <p className="text-[9px] text-[var(--theme-text-muted)] font-bold uppercase tracking-tighter">PDF/JPG (Max. 5MB)</p>
                            </div>
                            {customAnswers[label] && (
                              <a 
                                href={customAnswers[label]} 
                                target="_blank" 
                                rel="noreferrer" 
                                onClick={e => e.stopPropagation()}
                                className="text-primary hover:underline text-xs font-bold"
                              >
                                Lihat File
                              </a>
                            )}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            ref={el => fileInputRefs.current[`custom-${idx}`] = el}
                            onChange={(e) => handleCustomFileChange(label, e.target.files[0])}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3 or 4: KONFIRMASI */}
          {((!hasCustomFields && step === 3) || (hasCustomFields && step === 4)) && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 text-left">
                <h4 className="font-black text-primary mb-4 flex items-center gap-2 tracking-wide"><Sparkles size={18} /> Ringkasan Pengajuan</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--theme-text-muted)] font-bold">Beasiswa</span>
                    <span className="font-black text-[var(--theme-text)]">{scholarshipNama}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--theme-text-muted)] font-bold">Berkas Terunggah</span>
                    <div className="flex flex-col items-end gap-1">
                      {fileKtmRule !== 'tidak' && files['ktm_ktp'] && <span className="text-xs font-black text-[var(--theme-success)]">✓ KTM & KTP</span>}
                      {fileTranskripRule !== 'tidak' && files['transkrip'] && <span className="text-xs font-black text-[var(--theme-success)]">✓ Transkrip Nilai</span>}
                      {fileSertifikatRule !== 'tidak' && files['sertifikat'] && <span className="text-xs font-black text-[var(--theme-success)]">✓ Sertifikat</span>}
                      {!files['ktm_ktp'] && !files['transkrip'] && !files['sertifikat'] && <span className="text-xs font-bold text-[var(--theme-error)]">Belum ada berkas</span>}
                    </div>
                  </div>
                  {hasCustomFields && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--theme-text-muted)] font-bold">Syarat Kustom</span>
                      <span className="text-xs font-black text-[var(--theme-success)]">✓ Terisi ({Object.keys(customAnswers).length} jawaban)</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-primary/10">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Motivasi Preview</p>
                    <p className="text-xs text-[var(--theme-text)] font-medium line-clamp-3 italic opacity-70">"{motivasi}"</p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-4 p-5 bg-[var(--theme-bg)] rounded-xl border-[var(--theme-border)] cursor-pointer group text-left">
                <input 
                  type="checkbox" 
                  checked={agreed} 
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-[var(--theme-border)] text-primary focus:ring-primary transition-all cursor-pointer" 
                />
                <span className="text-[10px] font-black text-[var(--theme-text-muted)] leading-relaxed uppercase tracking-tight group-hover:text-[var(--theme-text)]">
                  Saya menyatakan bahwa seluruh data and dokumen yang saya kirimkan adalah benar, asli, dan dapat dipertanggungjawabkan di hadapan verifikator beasiswa BKU.
                </span>
              </label>
            </motion.div>
          )}
        </div>

    </DialogModal>
  );
}

// ======================== MAIN PAGE ========================
export default function ScholarshipPage() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { hasPermission } = usePermission();
  const canApplyScholarship = hasPermission('scholarship.create') || hasPermission('scholarship.manage');
  const [activeTab, setActiveTab] = useState('katalog'); // 'katalog' | 'riwayat'
  const [filters, setFilters] = useState({ kategori: 'Semua', sort: 'deadline_asc' });
  const [selectedSch, setSelectedSch] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const { data: katalog, isLoading: isCatalogLoading } = useScholarshipKatalogQuery(filters);
  const { data: riwayatResp, isLoading: isRiwayatLoading } = useScholarshipRiwayatQuery();
  
  const riwayatList = riwayatResp?.data || [];
  const stats = React.useMemo(() => {
    const total = riwayatList.length;
    let proses = 0;
    let diterima = 0;
    let ditolak = 0;
    riwayatList.forEach(item => {
      const statusStr = (item.Status || item.status || '').toLowerCase();
      if (statusStr === 'diterima' || statusStr === 'disetujui') {
        diterima++;
      } else if (statusStr === 'ditolak') {
        ditolak++;
      } else {
        proses++;
      }
    });
    return { total, proses, diterima, ditolak };
  }, [riwayatList]);

  const columns = React.useMemo(() => [
    {
      key: 'NamaBeasiswa',
      label: 'Nama Beasiswa',
      render: (_, row) => (
        <div className="flex flex-col">
          <p className="font-black text-[var(--theme-text)]">{row.Beasiswa?.nama || row.Beasiswa?.Nama}</p>
          <p className="text-[10px] text-[var(--theme-text-muted)] font-bold uppercase tracking-wide">{(row.Beasiswa?.kategori || row.Beasiswa?.Kategori || 'Internal')} Beasiswa</p>
        </div>
      )
    },
    {
      key: 'id',
      label: 'Ref. Number',
      render: (_, row) => (
        <code className="text-[10px] font-bold bg-[var(--theme-border-muted)] px-2 py-1 rounded-lg text-[var(--theme-text-muted)]">{row.id || row.ID}</code>
      )
    },
    {
      key: 'created_at',
      label: 'Tgl Daftar',
      className: 'text-center',
      render: (_, row) => {
        const createdAt = row.created_at || row.CreatedAt;
        return <span className="text-sm font-bold text-[var(--theme-text-muted)]">{createdAt ? new Date(createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>;
      }
    },
    {
      key: 'status',
      label: 'Tahap Sekarang',
      className: 'text-center',
      render: (_, row) => {
        const badge = STATUS_BADGE[(row.Status || row.status || 'menunggu').toLowerCase()] || STATUS_BADGE.dikirim;
        return <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badge.bg} ${badge.color} ${badge.border}`}>{badge.label}</span>;
      }
    },
    {
      key: 'aksi',
      label: 'Aksi',
      className: 'text-center',
      render: (_, row) => {
        const itemId = row.id || row.ID;
        return (
          <button 
           onClick={() => {
             if (itemId) {
               if (user?.role === 'super_admin') {
                 navigate(`/app/kemahasiswaan/beasiswa/pengajuan/${itemId}`);
               } else {
                 navigate(`/app/student/scholarship/pengajuan/${itemId}`);
               }
             } else {
               toast.error('ID Pengajuan tidak ditemukan');
             }
           }}
           className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-black hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] transition-all flex items-center justify-center gap-2 mx-auto"
          >
            Lihat Progress <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
          </button>
        );
      }
    }
  ], [navigate, user]);

  return (
    <PageContent>
      <DashboardHero
        title="Scholarship"
        highlightedTitle="Hub"
        subtitle="Akses Beasiswa Internal & Eksternal BKU"
        badges={[{ label: 'STUDENT HUB > SCHOLARSHIP', color: 'primary' }]}
        actions={
          <div className="flex p-1 bg-[var(--theme-bg)] rounded-xl shadow-inner border border-border w-fit">
            {[
              { id: 'katalog', label: 'Katalog Aktif', icon: LayoutGrid },
              { id: 'riwayat', label: 'Riwayat Saya', icon: History }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs md:text-sm transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[var(--theme-surface)] text-[var(--theme-text)] shadow-sm border border-border' 
                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] bg-transparent border border-transparent'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {activeTab === 'katalog' ? (
        <>
          {/* Filter Bar */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="flex flex-wrap items-center gap-3 mb-6 bg-surface p-3.5 rounded-xl border border-border shadow-sm"
          >
            <div className="flex items-center gap-2 px-4 border-r border-[var(--theme-border-muted)] mr-2">
              <Filter size={16} className="text-[var(--theme-primary)]" />
              <span className="text-xs font-black text-[var(--theme-text)] uppercase tracking-widest">Filters</span>
            </div>
            
            {['Semua', 'Internal', 'Mitra', 'Prestasi', 'Eksternal'].map(cat => (
              <button 
                key={cat}
                onClick={() => setFilters(f => ({ ...f, kategori: cat }))}
                className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold transition-all ${
                  filters.kategori === cat 
                    ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary-light)]' 
                    : 'bg-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text-muted)]'
                }`}
              >
                {cat}
              </button>
            ))}

            <div className="ml-auto flex items-center gap-2">
               <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest">Urutkan:</span>
                <select 
                 value={filters.sort}
                 onChange={(e) => setFilters(f => ({ ...f, sort: e.target.value }))}
                 className="bg-[var(--theme-bg)] border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[var(--theme-primary)]"
                >
                  <option value="deadline_asc">Deadline Terdekat</option>
                  <option value="nilai_desc">Bantuan Terbesar</option>
                </select>
             </div>
           </motion.div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isCatalogLoading ? (
              <CardGridSkeleton count={6} />
            ) : katalog?.length > 0 ? (
              katalog.map((beasiswa, idx) => {
                const beasiswaId = beasiswa.id || beasiswa.ID;
                const beasiswaNama = beasiswa.nama || beasiswa.Nama || '';
                const beasiswaPenyelenggara = beasiswa.penyelenggara || beasiswa.Penyelenggara || '';
                const beasiswaDeskripsi = beasiswa.deskripsi || beasiswa.Deskripsi || '';
                const beasiswaKategori = beasiswa.kategori || beasiswa.Kategori || 'Internal';
                const beasiswaNilaiBantuan = beasiswa.nilai_bantuan || beasiswa.NilaiBantuan || 5000000;
                const beasiswaKuota = beasiswa.kuota || beasiswa.Kuota || '-';
                const beasiswaDeadline = beasiswa.deadline || beasiswa.Deadline;

                const daysLeft = getDaysLeft(beasiswaDeadline);
                const isUrgent = daysLeft < 14;

                const riwayatItem = riwayatList.find(r => 
                  r.BeasiswaID === beasiswaId || 
                  r.beasiswa_id === beasiswaId || 
                  r.Beasiswa?.ID === beasiswaId || 
                  r.Beasiswa?.id === beasiswaId
                );
                const isRegistered = !!riwayatItem;

                return (
                  <motion.div 
                    key={`katalog-${beasiswaId || idx}-${beasiswaNama || ''}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group bg-surface rounded-xl border border-border overflow-hidden hover:border-[var(--theme-primary-light)] hover:shadow-md transition-all flex flex-col relative"
                  >
                    <div className="p-4 md:p-5 pb-3 flex-1">
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          beasiswaKategori === 'Internal' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]' :
                          beasiswaKategori === 'Mitra' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20' :
                          beasiswaKategori === 'Prestasi' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20' :
                          'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20'
                        }`}>
                          {beasiswaKategori}
                        </span>
                        {isRegistered ? (
                          <div className="flex items-center gap-1 text-[var(--theme-success)] bg-[var(--theme-success-light)] border-[var(--theme-success)]/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                             <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >check_circle</span> Terdaftar
                          </div>
                        ) : isUrgent ? (
                           <div className="flex items-center gap-1 text-[var(--theme-error)] bg-[var(--theme-error-light)] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
                              <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >schedule</span> Sisa {daysLeft} Hari
                           </div>
                        ) : null}
                      </div>
                      
                      <h3 className="text-base md:text-lg font-black mb-1 leading-tight group-hover:text-[var(--theme-primary)] transition-colors">{beasiswaNama}</h3>
                      <p className="text-[11px] text-[var(--theme-text-muted)] font-bold uppercase tracking-wider mb-6">{beasiswaPenyelenggara}</p>
                      <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed mb-4 line-clamp-2">{beasiswaDeskripsi}</p>

                      <div className="space-y-3 pt-3 border-t border-[var(--theme-border-muted)]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[var(--theme-success-light)] text-[var(--theme-success)] rounded-xl flex items-center justify-center">
                              <Wallet size={18} />
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest">Nilai Bantuan</p>
                               <p className="text-sm font-black text-[var(--theme-text)]">{formatRupiah(beasiswaNilaiBantuan)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] rounded-xl flex items-center justify-center">
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >group</span>
                            </div>
                            <div>
                               <p className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest">Kuota</p>
                               <p className="text-sm font-black text-[var(--theme-text)]">{beasiswaKuota} <span className="text-[var(--theme-text-muted)] font-bold">/ {beasiswaKuota}</span></p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 md:p-5 pt-0">
                       {isRegistered ? (
                         <button 
                           onClick={() => {
                             if (user?.role === 'super_admin') {
                               navigate(`/app/kemahasiswaan/beasiswa/pengajuan/${riwayatItem.id || riwayatItem.ID}`);
                             } else {
                               navigate(`/app/student/scholarship/pengajuan/${riwayatItem.id || riwayatItem.ID}`);
                             }
                           }}
                           className="w-full bg-[var(--theme-success-light)] hover:brightness-95 text-[var(--theme-success)] border-[var(--theme-success)]/20 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-sm animate-fade-in"
                         >
                           Lihat Progress <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >chevron_right</span>
                         </button>
                       ) : (
                         <button 
                           onClick={() => setSelectedSch(beasiswa)}
                           className="w-full bg-[var(--theme-primary)] text-white py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-colors hover:bg-[var(--theme-primary-hover)]"
                         >
                           {user?.role === 'super_admin' ? 'Detail Beasiswa' : 'Detail & Daftar'} <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >arrow_forward</span>
                         </button>
                       )}
                     </div>
                  </motion.div>
                );
              })
            ) : (
               <div className="col-span-full">
                 <EmptyState 
                   icon="Search" 
                   iconColor="text-[var(--theme-primary)]"
                   iconBgClass="bg-[var(--theme-primary-light)]"
                   iconBorderClass="border-[var(--theme-primary-light)]"
                   title="Beasiswa Tidak Ditemukan" 
                   description="Coba bersihkan filter atau pilih kategori lain."
                 />
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <PrimaryStatsCard
              title="Total Diajukan"
              value={stats.total}
              icon={DescriptionIcon}
              badgeText="Total"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">description</span>}
            />
            <PrimaryStatsCard
              title="Sedang Proses"
              value={stats.proses}
              colorTheme="primary"
              icon={ScheduleIcon}
              badgeText="Proses"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">schedule</span>}
            />
            <PrimaryStatsCard
              title="Lulus Seleksi"
              value={stats.diterima}
              colorTheme="success"
              icon={EmojiEventsIcon}
              badgeText="Lulus"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">emoji_events</span>}
            />
            <PrimaryStatsCard
              title="Ditolak"
              value={stats.ditolak}
              colorTheme="error"
              icon={CloseIcon}
              badgeText="Ditolak"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">close</span>}
            />
          </div>

          {/* History Table */}
          <PageCard>
            <CardContent className="p-0">
              <DataTable 
                title="Riwayat Beasiswa"
                subtitle="Menampilkan riwayat pendaftaran beasiswa."
                columns={columns} 
                data={riwayatList} 
                loading={isRiwayatLoading}
                emptyMessage="Belum Ada Pendaftaran Beasiswa"
                emptyIcon="history"
                searchPlaceholder="Cari riwayat beasiswa..."
              />
            </CardContent>
          </PageCard>
        </div>
      )}

      {/* DETAIL MODAL (Quick View) */}
      <DialogModal
        open={!!selectedSch}
        onOpenChange={(open) => !open && setSelectedSch(null)}
        title={selectedSch?.nama || selectedSch?.Nama || ''}
        subtitle={selectedSch?.penyelenggara || selectedSch?.Penyelenggara || ''}
        icon="workspace_premium"
        badgeText="DETAIL BEASISWA"
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button 
              onClick={() => setSelectedSch(null)}
              variant="ghost"
              className="w-full md:w-auto text-[10px] font-black tracking-widest text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] px-8 h-11 rounded-xl active:scale-95 transition-all shadow-none border-none cursor-pointer font-headline uppercase"
            >
              Tutup
            </Button>
            {user?.role !== 'super_admin' && canApplyScholarship && (
              <Button 
                onClick={() => setShowApplyModal(true)}
                className="w-full md:w-auto h-11 px-8 rounded-xl bg-primary text-white hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 border-none cursor-pointer font-black text-[10px]"
              >
                Daftar Sekarang
              </Button>
            )}
          </>
        }
      >
        {selectedSch && (() => {
          const schVal = selectedSch.nilai_bantuan || selectedSch.NilaiBantuan || 5000000;
          const schQuota = selectedSch.kuota || selectedSch.Kuota || '-';
          const schIpk = selectedSch.ipk_min || selectedSch.IPKMin || 0;
          const schDeadline = selectedSch.deadline || selectedSch.Deadline;
          const schDesc = selectedSch.deskripsi || selectedSch.Deskripsi || '';
          
          return (
            <div className="space-y-5 overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-3.5 bg-[var(--theme-bg)] rounded-xl border-[var(--theme-border)]">
                      <p className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Nilai Bantuan</p>
                      <p className="text-sm font-black text-primary">{formatRupiah(schVal)}</p>
                    </div>
                    <div className="p-3.5 bg-[var(--theme-bg)] rounded-xl border-[var(--theme-border)]">
                      <p className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Kuota Sisa</p>
                      <p className="text-sm font-black text-[var(--theme-text)]">{schQuota} <span className="text-[10px] text-[var(--theme-text-muted)]">Org</span></p>
                    </div>
                    <div className="p-3.5 bg-[var(--theme-bg)] rounded-xl border-[var(--theme-border)]">
                      <p className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Min. IPK</p>
                      <p className="text-sm font-black text-[var(--theme-text)]">{schIpk.toFixed(2)}</p>
                    </div>
                    <div className={`p-3.5 rounded-xl border ${getDaysLeft(schDeadline) < 7 ? 'bg-[var(--theme-error-light)] border-[var(--theme-error)]/20' : 'bg-[var(--theme-bg)] border-[var(--theme-border)]'}`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${getDaysLeft(schDeadline) < 7 ? 'text-[var(--theme-error)]' : 'text-[var(--theme-text-muted)]'}`}>Deadline</p>
                      <p className={`text-sm font-black ${getDaysLeft(schDeadline) < 7 ? 'text-[var(--theme-error)]' : 'text-[var(--theme-text)]'}`}>{new Date(schDeadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-3"><span className="material-symbols-outlined text-primary" style={{ fontSize: 16 }}>info</span> Deskripsi Program</h4>
                      <p className="text-xs text-[var(--theme-text-muted)] font-medium leading-relaxed">{schDesc}</p>
                    </div>

                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-3"><span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }} >description</span> Persyaratan</h4>
                      <div className="bg-[var(--theme-bg)] p-6 rounded-xl border-[var(--theme-border)]">
                         <pre className="text-xs text-[var(--theme-text-muted)] font-medium whitespace-pre-line font-body leading-relaxed">
                           {selectedSch.persyaratan || selectedSch.Persyaratan || 'Tidak ada persyaratan khusus.'}
                         </pre>
                      </div>
                    </div>

                    {/* Persyaratan Tambahan (Kustom) */}
                    {(() => {
                      const raw = selectedSch.custom_fields || selectedSch.CustomFields;
                      if (!raw) return null;
                      let fields = [];
                      try {
                        fields = typeof raw === 'string' ? JSON.parse(raw) : raw;
                      } catch (e) {
                        console.error(e);
                      }
                      if (!Array.isArray(fields) || fields.length === 0) return null;
                      return (
                        <div>
                          <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-3">
                            <span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }}>assignment</span> 
                            Persyaratan Tambahan
                          </h4>
                          <div className="bg-[var(--theme-bg)] p-5 rounded-xl border-[var(--theme-border)] space-y-3">
                            {fields.map((f, i) => (
                              <div key={i} className="flex justify-between items-start text-xs border-b border-[var(--theme-border)]/50 last:border-0 pb-2.5 last:pb-0">
                                <div className="min-w-0 pr-2 text-left">
                                  <span className="font-bold text-[var(--theme-text)] block">{f.label}</span>
                                  {f.options && (
                                    <span className="text-[9px] text-[var(--theme-text-muted)] block mt-1">Pilihan: {f.options}</span>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <span className="font-black text-[9px] px-2 py-0.5 bg-primary/10 text-primary rounded-md uppercase tracking-wider">
                                    {f.type}
                                  </span>
                                  {f.required && (
                                    <span className="font-black text-[8px] px-1.5 bg-[var(--theme-error-light)] text-[var(--theme-error)] rounded uppercase tracking-wider">
                                      Wajib
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                       <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest mb-3"><Sparkles size={16} className="text-primary" /> Tahapan Seleksi</h4>
                       <div className="flex items-center justify-between px-2 py-4">
                          {['Daftar', 'Berkas', 'Evaluasi', 'Review', 'Penetapan', 'Hasil'].map((s, i) => (
                             <div key={s} className="flex flex-col items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${i === 0 ? 'bg-primary' : 'bg-[var(--theme-border)]'}`} />
                                <span className={`text-[8px] font-black uppercase tracking-tighter ${i === 0 ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)]'}`}>{s}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                  </div>
              </div>
          );
        })()}
      </DialogModal>

      {/* APPLICATION WIZARD */}
      <AnimatePresence>
        {showApplyModal && (
          <ApplyWizard 
            scholarship={selectedSch} 
            onClose={() => setShowApplyModal(false)}
            onSuccess={() => {
              toast.success('Pendaftaran Berhasil Dikirim!');
              setShowApplyModal(false);
              setSelectedSch(null);
              setActiveTab('riwayat');
            }}
          />
        )}
      </AnimatePresence>
    </PageContent>
  );
}
