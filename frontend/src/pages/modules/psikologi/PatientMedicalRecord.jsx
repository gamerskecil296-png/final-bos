import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { UI } from '@/constants/designSystem';
import { psychologistService } from '@/services/api';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';
import { usePermission } from '@/hooks/usePermission';
import toast from 'react-hot-toast';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const ArrowLeft = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>arrow_back</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Download = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>;



export default function PatientMedicalRecord() {
   const { id } = useParams();
   const navigate = useNavigate();
   const [searchParams, setSearchParams] = useSearchParams();
   const bookingId = searchParams.get('bookingId');
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingRecordId, setEditingRecordId] = useState(null);
   const { hasPermission } = usePermission();
   const canManageRecords = hasPermission('psychologist.medical_records.create') || hasPermission('psychologist.medical_records.update') || hasPermission('psychologist.medical_records.delete');

   // Form State — tuntas/lanjutan/rujuk use null = not yet chosen, true = Ya, false = Tidak
   const [newRecord, setNewRecord] = useState({
      complaint: '',
      observation: '',
      recommendation: '',
      mood: 'Stabil',
      tujuan_pemeriksaan: '',
      tanggal_asesmen: new Date().toISOString().split('T')[0],
      riwayat_keluhan: '',
      aspek_kognitif: '',
      aspek_emosional: '',
      aspek_perilaku: '',
      rekomendasi_mahasiswa: '',
      rekomendasi_prodi: '',
      rekomendasi_orang_tua: '',
      tindak_lanjut_tuntas: null,
      tindak_lanjut_lanjutan: null,
      tindak_lanjut_rujuk: null,
      kesimpulan: '',
      rujukan_tipe: 'Medis',
      rujukan_pihak_tujuan: '',
      rujukan_email_tujuan: '',
      rujukan_alasan: '',
   });

   const [records, setRecords] = useState([]);
   const [patient, setPatient] = useState({ id, name: 'Memuat...', nim: '-', faculty: '-', color: 'bg-primary', initials: '-', status: 'Baru', totalSessions: 0 });
   const [activeBookingId, setActiveBookingId] = useState(null);
   const [lastSessionTuntas, setLastSessionTuntas] = useState(false);

   useEffect(() => {
      let ignore = false;
      psychologistService.getMedicalRecord(id).then((res) => {
         if (!ignore) {
            setPatient(res.data.patient);
            setRecords(res.data.records || []);
            setActiveBookingId(res.data.active_booking_id || null);
            setLastSessionTuntas(res.data.last_session_tuntas === true);
         }
      });
      return () => { ignore = true; };
   }, [id]);

   const emptyRecord = {
      complaint: '', observation: '', recommendation: '', mood: 'Stabil',
      tujuan_pemeriksaan: '', tanggal_asesmen: new Date().toISOString().split('T')[0],
      riwayat_keluhan: '', aspek_kognitif: '', aspek_emosional: '', aspek_perilaku: '',
      rekomendasi_mahasiswa: '', rekomendasi_prodi: '', rekomendasi_orang_tua: '',
      tindak_lanjut_tuntas: null, tindak_lanjut_lanjutan: null, tindak_lanjut_rujuk: null,
      kesimpulan: '', rujukan_tipe: 'Medis', rujukan_pihak_tujuan: '', rujukan_email_tujuan: '', rujukan_alasan: '',
   };

   const handleAddRecord = async (e) => {
      e.preventDefault();
      // Validate tindak lanjut tuntas is selected
      if (newRecord.tindak_lanjut_tuntas === null) {
         toast.error('Harap pilih status Sesi Tuntas (Ya/Tidak).');
         return;
      }
      const observationCombined = `Kognitif: ${newRecord.aspek_kognitif}\nEmosional: ${newRecord.aspek_emosional}\nPerilaku: ${newRecord.aspek_perilaku}`;
      const recommendationCombined = `Mhs: ${newRecord.rekomendasi_mahasiswa}\nProdi: ${newRecord.rekomendasi_prodi}\nOrangTua: ${newRecord.rekomendasi_orang_tua}`;
      const isTuntas = newRecord.tindak_lanjut_tuntas === true;
      const isRujuk = newRecord.tindak_lanjut_rujuk === true;
      try {
         const payload = {
            ...newRecord,
            tindak_lanjut_tuntas: isTuntas,
            tindak_lanjut_lanjutan: newRecord.tindak_lanjut_lanjutan === true,
            tindak_lanjut_rujuk: isRujuk,
            complaint: newRecord.riwayat_keluhan || newRecord.complaint,
            observation: observationCombined,
            recommendation: recommendationCombined,
            type: 'Konseling Baru',
            status: isTuntas ? 'Selesai' : newRecord.mood,
            booking_id: Number(bookingId || activeBookingId || 0),
         };

         if (editingRecordId) {
            await psychologistService.updateSessionNote(editingRecordId, payload);
            toast.success('Catatan sesi berhasil diubah.');
         } else {
            await psychologistService.createSessionNote(id, payload);
            toast.success('Catatan sesi berhasil disimpan.');
         }

         const res = await psychologistService.getMedicalRecord(id);
         setPatient(res.data.patient);
         setRecords(res.data.records || []);
         setActiveBookingId(res.data.active_booking_id || null);
         setLastSessionTuntas(res.data.last_session_tuntas === true);
         setIsModalOpen(false);
         setEditingRecordId(null);
         if (bookingId) setSearchParams({});
         setNewRecord(emptyRecord);
         // If rujuk = Ya, redirect to referral management
         if (isRujuk && !editingRecordId) {
            navigate('/app/psikologi/referrals');
         }
      } catch (err) {
         toast.error(err.message || 'Gagal menyimpan catatan sesi.');
      }
   };

   const openEditModal = (record) => {
      // Parse observation
      const obsMatches = {
         kognitif: record.observation?.match(/Kognitif:\s*(.*?)(?=\nEmosional:|$)/s)?.[1] || '',
         emosional: record.observation?.match(/Emosional:\s*(.*?)(?=\nPerilaku:|$)/s)?.[1] || '',
         perilaku: record.observation?.match(/Perilaku:\s*(.*?)$/s)?.[1] || '',
      };

      // Parse recommendation
      const recMatches = {
         mhs: record.recommendation?.match(/Mhs:\s*(.*?)(?=\nProdi:|$)/s)?.[1] || '',
         prodi: record.recommendation?.match(/Prodi:\s*(.*?)(?=\nOrangTua:|$)/s)?.[1] || '',
         ortu: record.recommendation?.match(/OrangTua:\s*(.*?)$/s)?.[1] || '',
      };

      setNewRecord({
         complaint: record.complaint || '',
         observation: record.observation || '',
         recommendation: record.recommendation || '',
         mood: record.mood || 'Stabil',
         tujuan_pemeriksaan: record.tujuan_pemeriksaan || '',
         tanggal_asesmen: record.tanggal_asesmen ? record.tanggal_asesmen.split('T')[0] : new Date().toISOString().split('T')[0],
         riwayat_keluhan: record.riwayat_keluhan || record.complaint || '',
         aspek_kognitif: record.aspek_kognitif || obsMatches.kognitif,
         aspek_emosional: record.aspek_emosional || obsMatches.emosional,
         aspek_perilaku: record.aspek_perilaku || obsMatches.perilaku,
         rekomendasi_mahasiswa: record.rekomendasi_mahasiswa || recMatches.mhs,
         rekomendasi_prodi: record.rekomendasi_prodi || recMatches.prodi,
         rekomendasi_orang_tua: record.rekomendasi_orang_tua || recMatches.ortu,
         tindak_lanjut_tuntas: record.tindak_lanjut_tuntas ?? null,
         tindak_lanjut_lanjutan: record.tindak_lanjut_lanjutan ?? null,
         tindak_lanjut_rujuk: record.tindak_lanjut_rujuk ?? null,
         kesimpulan: record.kesimpulan || '',
         rujukan_tipe: record.rujukan_tipe || 'Medis',
         rujukan_pihak_tujuan: record.rujukan_pihak_tujuan || '',
         rujukan_email_tujuan: record.rujukan_email_tujuan || '',
         rujukan_alasan: record.rujukan_alasan || '',
      });
      setEditingRecordId(record.id);
      setIsModalOpen(true);
   };

   // Lock button if: last session is Tuntas (Selesai) AND there is no active booking
   const isSessionFinished = (lastSessionTuntas === true || patient.status === 'Selesai') && !activeBookingId && !bookingId;

   return (
      <>
         <div className={UI.layout.canvas}>

            {/* Top Actions */}
            <div className="flex items-center justify-between mb-6">
               <button
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)] shadow-sm text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary)]/5 transition-all group w-fit"
               >
                  <span className="material-symbols-outlined text-[16px] shrink-0 group-hover:-translate-x-1 transition-transform">arrow_back</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Kembali</span>
               </button>
               <div className="flex gap-2">
                  {canManageRecords && (
                     <button
                        onClick={() => setIsModalOpen(true)}
                        disabled={isSessionFinished}
                        className={`px-6 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all ${!isSessionFinished
                           ? 'bg-[var(--theme-primary)] text-white shadow-primary/20 hover:scale-105 active:scale-95 hover:bg-[var(--theme-primary-hover)]'
                           : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                           }`}
                     >
                        <span className="material-symbols-outlined text-[16px] shrink-0">add</span> Tambah Sesi
                     </button>
                  )}
               </div>
            </div>

            {isSessionFinished && (
               <div className="mb-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">check_circle</span>
                  <div>
                     <h4 className="text-xs font-black text-emerald-900">Kasus / Episode Ini Telah Ditutup (Selesai)</h4>
                     <p className="text-[10px] text-emerald-700 mt-0.5 leading-relaxed">
                        Mahasiswa ini sudah tidak memiliki sesi lanjutan. Untuk memulai episode kasus baru, mahasiswa perlu melakukan booking baru terlebih dahulu.
                     </p>
                  </div>
               </div>
            )}
            {!isSessionFinished && !Boolean(bookingId || activeBookingId) && (
               <div className="mb-4 p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-500 text-xl shrink-0">info</span>
                  <div>
                     <h4 className="text-xs font-bold text-amber-900">Tidak ada sesi booking aktif</h4>
                     <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                        Mahasiswa belum memiliki janji temu aktif. Tambah sesi hanya bisa dilakukan setelah mahasiswa booking.
                     </p>
                  </div>
               </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

               {/* Left Content: Medical History Timeline (Col 8) */}
               <div className="xl:col-span-8 space-y-6">
                  <div className="rounded-2xl border shadow-sm p-4" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[11px] font-black text-primary uppercase tracking-tight font-headline flex items-center gap-2">
                           <span className="material-symbols-outlined text-[18px] shrink-0" >description</span> Riwayat Sesi Konseling
                        </h3>
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Total: {patient.totalSessions} Sesi</div>
                     </div>

                     <div className="max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                        <div className="space-y-12 relative before:absolute before:left-[19px] before:top-4 before:bottom-0 before:w-[2px] before:bg-slate-50">
                           {records.map((record, index) => (
                              <div key={record.id} className="relative pl-12 group">
                                 <div className={`absolute left-0 top-1.5 size-10 rounded-xl border-4 border-white shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-110 ${index === 0 ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                    <span className="material-symbols-outlined text-base shrink-0" >calendar_month</span>
                                 </div>

                                 <div className="rounded-2xl border p-4 space-y-3 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                                    <div className="flex items-center justify-between">
                                       <div className="flex items-center gap-4">
                                          <span className="text-[10px] font-black text-primary uppercase tracking-widest">{record.date}</span>
                                          <span className="text-[10px] font-bold text-slate-300">•</span>
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{record.time}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${record.mood === 'Cemas' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                             Mood: {record.mood}
                                          </span>
                                          <button
                                             onClick={() => openEditModal(record)}
                                             className="p-1.5 bg-white border border-slate-100 hover:border-indigo-500/20 hover:text-indigo-500 rounded-lg text-slate-400 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                                             title="Edit Catatan Sesi"
                                          >
                                             <span className="material-symbols-outlined text-[12px]">edit</span>
                                          </button>
                                          <button
                                             onClick={async () => {
                                                try {
                                                   await psychologistService.downloadSessionNotePDF(record.id, patient.name);
                                                } catch (err) {
                                                   toast.error(err.message || 'Gagal mengunduh PDF Sesi');
                                                }
                                             }}
                                             className="p-1.5 bg-white border border-slate-100 hover:border-primary/20 hover:text-primary rounded-lg text-slate-400 shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                                             title="Download PDF Sesi Ini"
                                          >
                                             <Download size={12} />
                                          </button>
                                       </div>
                                    </div>

                                    <div className="space-y-4">
                                       {record.tujuan_pemeriksaan && (
                                          <div className="rounded-2xl p-4 border" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)' }}>
                                             <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--theme-primary)' }}>Tujuan Pemeriksaan / Tanggal Asesmen</p>
                                             <p className="text-xs font-bold text-slate-800 mt-0.5">
                                                {record.tujuan_pemeriksaan} {record.tanggal_asesmen ? ` • Tanggal Asesmen: ${new Date(record.tanggal_asesmen).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                                             </p>
                                          </div>
                                       )}

                                       <div>
                                          <h4 className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h4)' }}>Riwayat Keluhan</h4>
                                          <p className="text-xs font-semibold leading-relaxed rounded-2xl p-4" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', border: '1px solid var(--theme-border)', color: 'var(--theme-text)' }}>
                                             {record.riwayat_keluhan || record.complaint}
                                          </p>
                                       </div>

                                       {/* Aspek Asesmen Klinis */}
                                       {(record.aspek_kognitif || record.aspek_emosional || record.aspek_perilaku) && (
                                          <div className="pt-4 border-t border-slate-100">
                                             <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-xs shrink-0">psychology</span> Aspek Asesmen Klinis
                                             </h4>
                                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Kognitif</p>
                                                   <p className="text-[11px] font-medium text-slate-700 whitespace-pre-line leading-relaxed">{record.aspek_kognitif || '-'}</p>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Emosional</p>
                                                   <p className="text-[11px] font-medium text-slate-700 whitespace-pre-line leading-relaxed">{record.aspek_emosional || '-'}</p>
                                                </div>
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Perilaku</p>
                                                   <p className="text-[11px] font-medium text-slate-700 whitespace-pre-line leading-relaxed">{record.aspek_perilaku || '-'}</p>
                                                </div>
                                             </div>
                                          </div>
                                       )}

                                       {/* Rekomendasi Grid */}
                                       {(record.rekomendasi_mahasiswa || record.rekomendasi_prodi || record.rekomendasi_orang_tua || record.recommendation) && (
                                          <div className="pt-4 border-t border-slate-100">
                                             <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-xs shrink-0">reviews</span> Rekomendasi Hasil Konseling
                                             </h4>
                                             {record.rekomendasi_mahasiswa || record.rekomendasi_prodi || record.rekomendasi_orang_tua ? (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Mahasiswa</p>
                                                      <p className="text-[11px] font-medium text-slate-700 whitespace-pre-line leading-relaxed">{record.rekomendasi_mahasiswa || '-'}</p>
                                                   </div>
                                                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Program Studi</p>
                                                      <p className="text-[11px] font-medium text-slate-700 whitespace-pre-line leading-relaxed">{record.rekomendasi_prodi || '-'}</p>
                                                   </div>
                                                   <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">Orang Tua / Wali</p>
                                                      <p className="text-[11px] font-medium text-slate-700 whitespace-pre-line leading-relaxed">{record.rekomendasi_orang_tua || '-'}</p>
                                                   </div>
                                                </div>
                                             ) : (
                                                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                                   <p className="text-[11px] font-medium text-slate-700 leading-relaxed">{record.recommendation}</p>
                                                </div>
                                             )}
                                          </div>
                                       )}

                                       {/* Tindak Lanjut & Kesimpulan */}
                                       <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-5">
                                          <div>
                                             <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Tindak Lanjut</h4>
                                             <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                   <span className={`material-symbols-outlined text-sm font-bold shrink-0 ${record.tindak_lanjut_tuntas ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                      {record.tindak_lanjut_tuntas ? 'check_circle' : 'cancel'}
                                                   </span>
                                                   <span className={`text-[10px] font-black uppercase tracking-widest ${record.tindak_lanjut_tuntas ? 'text-slate-800' : 'text-slate-400'}`}>Sesi Tuntas</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                   <span className={`material-symbols-outlined text-sm font-bold shrink-0 ${record.tindak_lanjut_lanjutan ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                      {record.tindak_lanjut_lanjutan ? 'check_circle' : 'cancel'}
                                                   </span>
                                                   <span className={`text-[10px] font-black uppercase tracking-widest ${record.tindak_lanjut_lanjutan ? 'text-slate-800' : 'text-slate-400'}`}>Jadwal Konseling Lanjutan</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                   <span className="material-symbols-outlined text-sm font-bold shrink-0" style={{ color: record.tindak_lanjut_rujuk ? 'var(--theme-primary)' : '#cbd5e1' }}>
                                                      {record.tindak_lanjut_rujuk ? 'check_circle' : 'cancel'}
                                                   </span>
                                                   <span className={`text-[10px] font-black uppercase tracking-widest ${record.tindak_lanjut_rujuk ? 'text-slate-800' : 'text-slate-400'}`}>Rujuk Klinis</span>
                                                </div>
                                             </div>
                                          </div>
                                          {record.kesimpulan && (
                                             <div>
                                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                   <span className="material-symbols-outlined text-xs shrink-0">summarize</span> Kesimpulan
                                                </h4>
                                                <p className="text-[11px] font-semibold text-slate-700 leading-relaxed border rounded-2xl p-4 italic" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)' }}>
                                                   "{record.kesimpulan}"
                                                </p>
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right Sidebar... */}
               <div className="xl:col-span-4 space-y-5">
                  <div className="rounded-2xl border shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                     <div className="h-16 bg-primary relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-indigo-600"></div>
                        <span className="material-symbols-outlined absolute -right-4 -bottom-4 size-20 text-white/10" >show_chart</span>
                     </div>
                     <div className="px-5 pb-5 -mt-6 relative z-10">
                        <div className={`size-12 rounded-xl ${patient.color} border-4 border-white shadow-lg flex items-center justify-center text-white text-lg font-black mb-3 mx-auto md:mx-0`}>
                           {patient.initials}
                        </div>
                        <h2 className="text-base font-black font-headline uppercase tracking-tight" style={{ color: 'var(--theme-h2)' }}>{patient.name}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{patient.nim} • {patient.faculty}</p>

                        <div className="grid grid-cols-2 gap-2 mt-5">
                           <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                              <p className="text-xs font-black text-emerald-600 uppercase mt-0.5">{patient.status}</p>
                           </div>
                           <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}>
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sesi</p>
                              <p className="text-xs font-black text-primary uppercase mt-0.5">{patient.totalSessions} Kali</p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="rounded-2xl border shadow-sm p-4 space-y-4" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                     <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] shrink-0" >trending_up</span> Analitik Kesehatan
                     </h3>
                     <div className="space-y-4">
                        <div>
                           <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kepatuhan Rekomendasi</span>
                              <span className="text-[10px] font-black text-primary">85%</span>
                           </div>
                           <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full w-[85%]"></div>
                           </div>
                        </div>
                        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                           <div className="flex items-center gap-2 mb-2 text-primary">
                              <span className="material-symbols-outlined text-sm shrink-0" >error</span>
                              <span className="text-[9px] font-black uppercase tracking-widest">Catatan Penting</span>
                           </div>
                           <p className="text-[10px] font-medium text-slate-600 leading-relaxed uppercase">
                              Mahasiswa menunjukkan peningkatan signifikan dalam mengelola kecemasan akademik setelah 3 sesi terakhir.
                           </p>
                        </div>
                     </div>
                  </div>


               </div>
            </div>
         </div>

         {/* --- ADD SESSION MODAL --- */}
         <DialogModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            title={editingRecordId ? "Edit Catatan Sesi" : "Tambah Sesi Baru (Asesmen & Rekomendasi)"}
            subtitle={editingRecordId ? `Mengedit sesi #${editingRecordId}` : (bookingId ? `Terhubung ke booking #${bookingId}` : 'Form Asesmen dan Rekomendasi Hasil Konseling')}
            icon="post_add"
            maxWidth="max-w-3xl"
            footer={
               <>
                  <ModalCancelButton onClick={() => setIsModalOpen(false)} />
                  <ModalSaveButton type="button" onClick={handleAddRecord} icon="save">Simpan Catatan</ModalSaveButton>
               </>
            }
         >
            <form id="add-record-form" onSubmit={handleAddRecord} className="flex flex-col space-y-5">
               {/* Data Diri Mahasiswa Section */}
               <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                  <h4 className="text-[10px] font-black text-[#00236F] uppercase tracking-widest mb-3 flex items-center gap-2">
                     <span className="material-symbols-outlined text-[14px] shrink-0">badge</span> Data Diri Mahasiswa (Auto-Populated)
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-3 text-[10px] font-medium text-slate-600">
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Nama Klien</p>
                        <p className="font-bold text-slate-900">{patient.name || '-'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">NPM / NIM</p>
                        <p className="font-bold text-slate-900">{patient.nim || '-'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Semester</p>
                        <p className="font-bold text-slate-900">{patient.semester || '-'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">IPK</p>
                        <p className="font-bold text-slate-900">{patient.ipk !== undefined ? patient.ipk : '-'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Program Studi</p>
                        <p className="font-bold text-slate-900">{patient.program_studi || '-'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Dosen Wali</p>
                        <p className="font-bold text-slate-900">{patient.dosen_pa || '-'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Jenis Kelamin</p>
                        <p className="font-bold text-slate-900">{patient.jenis_kelamin || '-'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Tempat, Tanggal Lahir</p>
                        <p className="font-bold text-slate-900">
                           {patient.tempat_lahir || '-'}{patient.tanggal_lahir && patient.tanggal_lahir !== '-' ? `, ${(() => {
                              try {
                                 const d = new Date(patient.tanggal_lahir);
                                 if (isNaN(d.getTime())) return patient.tanggal_lahir;
                                 return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                              } catch {
                                 return patient.tanggal_lahir;
                              }
                           })()}` : ''}
                        </p>
                     </div>
                  </div>
               </div>

               {/* Section 1: Informasi Asesmen */}
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-slate-100 pb-2">I. Informasi Asesmen</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tujuan Pemeriksaan</label>
                        <input
                           value={newRecord.tujuan_pemeriksaan}
                           onChange={(e) => setNewRecord({ ...newRecord, tujuan_pemeriksaan: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                           placeholder="Misal: Evaluasi Layanan Konseling Akademik"
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tanggal Asesmen</label>
                        <input
                           type="date"
                           value={newRecord.tanggal_asesmen}
                           onChange={(e) => setNewRecord({ ...newRecord, tanggal_asesmen: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                        />
                     </div>
                  </div>

                  <div>
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Riwayat Keluhan</label>
                     <textarea
                        value={newRecord.riwayat_keluhan}
                        onChange={(e) => setNewRecord({ ...newRecord, riwayat_keluhan: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-16 resize-none"
                        placeholder="Deskripsikan riwayat keluhan pasien..."
                     />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Aspek Kognitif</label>
                        <textarea
                           value={newRecord.aspek_kognitif}
                           onChange={(e) => setNewRecord({ ...newRecord, aspek_kognitif: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-20 resize-none"
                           placeholder="Observasi aspek kognitif..."
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Aspek Emosional</label>
                        <textarea
                           value={newRecord.aspek_emosional}
                           onChange={(e) => setNewRecord({ ...newRecord, aspek_emosional: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-20 resize-none"
                           placeholder="Observasi aspek emosional..."
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Aspek Perilaku</label>
                        <textarea
                           value={newRecord.aspek_perilaku}
                           onChange={(e) => setNewRecord({ ...newRecord, aspek_perilaku: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-20 resize-none"
                           placeholder="Observasi aspek perilaku..."
                        />
                     </div>
                  </div>
               </div>

               {/* Section 2: Rekomendasi Layanan */}
               <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-slate-100 pb-2">II. Rekomendasi Layanan</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Rekomendasi Mahasiswa</label>
                        <textarea
                           value={newRecord.rekomendasi_mahasiswa}
                           onChange={(e) => setNewRecord({ ...newRecord, rekomendasi_mahasiswa: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-20 resize-none"
                           placeholder="Rekomendasi bagi mahasiswa..."
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Rekomendasi Program Studi</label>
                        <textarea
                           value={newRecord.rekomendasi_prodi}
                           onChange={(e) => setNewRecord({ ...newRecord, rekomendasi_prodi: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-20 resize-none"
                           placeholder="Rekomendasi bagi Prodi..."
                        />
                     </div>
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Rekomendasi Orang Tua/Wali</label>
                        <textarea
                           value={newRecord.rekomendasi_orang_tua}
                           onChange={(e) => setNewRecord({ ...newRecord, rekomendasi_orang_tua: e.target.value })}
                           className="w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 text-[11px] font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-20 resize-none"
                           placeholder="Rekomendasi bagi Orang tua..."
                        />
                     </div>
                  </div>
               </div>

               {/* Section 3: Tindak Lanjut & Kesimpulan */}
               <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-primary uppercase tracking-widest border-b border-slate-100 pb-2">III. Tindak Lanjut & Kesimpulan</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-slate-50 border border-slate-200/60 rounded-2xl p-4">
                     <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">1. Sesi Tuntas <span className="text-rose-500">*</span></label>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setNewRecord({ ...newRecord, tindak_lanjut_tuntas: true, tindak_lanjut_lanjutan: false })} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newRecord.tindak_lanjut_tuntas === true ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-300 hover:text-emerald-600'}`}>Ya</button>
                           <button type="button" onClick={() => setNewRecord({ ...newRecord, tindak_lanjut_tuntas: false })} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newRecord.tindak_lanjut_tuntas === false ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-rose-300 hover:text-rose-500'}`}>Tidak</button>
                        </div>
                        {newRecord.tindak_lanjut_tuntas === true && <p className="text-[9px] text-emerald-600 font-bold ml-1">⚠ Booking akan dikunci setelah disimpan</p>}
                     </div>

                     <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">2. Konseling Lanjutan</label>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setNewRecord({ ...newRecord, tindak_lanjut_lanjutan: true, tindak_lanjut_tuntas: false })} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newRecord.tindak_lanjut_lanjutan === true ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-primary/40 hover:text-primary'}`}>Ya</button>
                           <button type="button" onClick={() => setNewRecord({ ...newRecord, tindak_lanjut_lanjutan: false })} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newRecord.tindak_lanjut_lanjutan === false ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-rose-300 hover:text-rose-500'}`}>Tidak</button>
                        </div>
                     </div>

                     <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">3. Rujuk Klinis</label>
                        <div className="flex gap-2">
                           <button type="button" onClick={() => setNewRecord({ ...newRecord, tindak_lanjut_rujuk: true })} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newRecord.tindak_lanjut_rujuk === true ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'}`}>Ya</button>
                           <button type="button" onClick={() => setNewRecord({ ...newRecord, tindak_lanjut_rujuk: false })} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newRecord.tindak_lanjut_rujuk === false ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' : 'bg-white text-slate-400 border border-slate-200 hover:border-rose-300 hover:text-rose-500'}`}>Tidak</button>
                        </div>
                        {newRecord.tindak_lanjut_rujuk === true && <p className="text-[9px] text-indigo-600 font-bold ml-1">→ Surat rujukan otomatis dibuat & dikirim ke Referral</p>}
                     </div>
                  </div>

                  {newRecord.tindak_lanjut_rujuk && (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-primary/5 border border-primary/10 rounded-3xl p-5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipe Rujukan</label>
                           <select
                              value={newRecord.rujukan_tipe}
                              onChange={(e) => setNewRecord({ ...newRecord, rujukan_tipe: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                           >
                              <option value="Medis">Rujukan Medis</option>
                              <option value="Akademik">Rujukan Akademik</option>
                           </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Pihak / Instansi Tujuan</label>
                           <input
                              type="text"
                              value={newRecord.rujukan_pihak_tujuan}
                              onChange={(e) => setNewRecord({ ...newRecord, rujukan_pihak_tujuan: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                              placeholder="Misal: RS Pusat, Dekan FT"
                           />
                        </div>
                        <div className="flex flex-col gap-1.5">
                           <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Tujuan</label>
                           <input
                              type="email"
                              value={newRecord.rujukan_email_tujuan}
                              onChange={(e) => setNewRecord({ ...newRecord, rujukan_email_tujuan: e.target.value })}
                              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                              placeholder="email@tujuan.com"
                           />
                        </div>
                     </div>
                  )}

                  <div>
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Kesimpulan</label>
                     <textarea
                        value={newRecord.kesimpulan}
                        onChange={(e) => setNewRecord({ ...newRecord, kesimpulan: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl px-5 py-3 text-xs font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none h-20 resize-none"
                        placeholder="Tulis kesimpulan umum asesmen konseling..."
                     />
                  </div>

                  <div>
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Status Mood / Kondisi Emosional Saat Sesi</label>
                     <div className="flex flex-wrap gap-2">
                        {['Stabil', 'Cemas', 'Depresi', 'Netral', 'Membaik'].map((m) => (
                           <button
                              type="button"
                              key={m}
                              onClick={() => setNewRecord({ ...newRecord, mood: m })}
                              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${newRecord.mood === m ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'}`}
                           >
                              {m}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>
            </form>
         </DialogModal>

      </>
   );
}

