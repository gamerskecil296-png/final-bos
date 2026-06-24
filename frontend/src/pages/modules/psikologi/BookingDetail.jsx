import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { psychologistService } from '@/services/api';
import { PageContent } from '@/components/ui/page';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';

const Mail = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>mail</span>;
const Phone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>phone</span>;
const MessageSquare = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>chat</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');

  useEffect(() => {
    let ignore = false;
    psychologistService.getBookingDetail(id).then((res) => {
      if (!ignore) setBooking({ ...res.data, color: 'bg-[var(--theme-primary)]' });
    });
    return () => { ignore = true; };
  }, [id]);

  const handleStatus = async (status, link = '') => {
    await psychologistService.updateBookingStatus(id, status, '', link);
    setBooking((prev) => ({ ...prev, status, link_meeting: link }));
  };

  const handleConfirmClick = () => {
    if (booking.mode === 'Online') {
      setMeetingLink('');
      setShowLinkModal(true);
    } else {
      handleStatus('Dikonfirmasi');
    }
  };

  const submitConfirmWithLink = () => {
    if (!meetingLink.trim()) {
      alert('Harap masukkan link meeting Zoom/Google Meet');
      return;
    }
    setShowLinkModal(false);
    handleStatus('Dikonfirmasi', meetingLink);
  };

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-surface)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--theme-primary)]/20 border-t-[var(--theme-primary)] rounded-full animate-spin shadow-lg shadow-[var(--theme-primary)]/10" />
          <p className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] animate-pulse">Memuat Detail Booking...</p>
        </div>
      </div>
    );
  }

  const history = (booking.history || []).map((item) => ({ 
    ...item, 
    icon: item.type === 'created' ? MessageSquare : Clock, 
    color: item.type === 'created' ? 'text-blue-500' : 'text-amber-500' 
  }));
  const isLocked = ['Dikonfirmasi', 'Selesai', 'Dibatalkan', 'Ditolak'].includes(booking.status);

  return (
    <PageContent>
        
      {/* ── Breadcrumb / Back ────────────────────────────────────────── */}
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border)] shadow-sm text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary)]/5 transition-all group w-fit"
      >
        <span className="material-symbols-outlined text-[16px] shrink-0 group-hover:-translate-x-1 transition-transform">arrow_back</span>
        <span className="text-[10px] font-black uppercase tracking-widest">Kembali</span>
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (2/3) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Profile Card */}
          <div className="bg-[var(--theme-surface)] rounded-[2rem] border border-[var(--theme-border)] shadow-sm relative group">
            {/* Header Banner */}
            <div className="h-36 relative bg-[var(--theme-primary)] overflow-hidden rounded-t-[2rem]">
               <div className="absolute inset-0 bg-black/10"></div>
               <div className="absolute inset-0 bg-white/5" style={{ backgroundImage: `radial-gradient(circle at 20% 50%, white 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>
               <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none group-hover:bg-white/20 transition-colors duration-700" />
               <div className="absolute -top-24 left-10 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none" />
            </div>
               
            <div className="absolute top-24 left-8 z-20">
               <div className={`w-24 h-24 rounded-2xl bg-[var(--theme-surface)] text-[var(--theme-primary)] flex items-center justify-center text-4xl font-black border-4 border-[var(--theme-surface)] shadow-xl shadow-black/5 ring-4 ring-black/5`}>
                 {booking.avatar || booking.name.charAt(0)}
               </div>
            </div>
            
            <div className="pt-14 pb-8 px-8 relative z-10">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-[var(--theme-text)] tracking-tight font-headline">{booking.name}</h2>
                  <p className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mt-1">NIM {booking.nim} &bull; {booking.prodi}</p>
                </div>
                <span className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest self-start ${
                  booking.status === 'Menunggu' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                  booking.status === 'Dikonfirmasi' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                  booking.status === 'Selesai' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                  'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 ${
                    booking.status === 'Menunggu' ? 'bg-amber-400' :
                    booking.status === 'Dikonfirmasi' ? 'bg-blue-400' :
                    booking.status === 'Selesai' ? 'bg-emerald-400' :
                    'bg-rose-400'
                  }`}></span>
                  {booking.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-[var(--theme-border)]">
                {[
                  { label: 'Email', value: booking.email || '-', icon: Mail },
                  { label: 'WhatsApp', value: booking.phone || '-', icon: Phone },
                  { label: 'Akademik', value: `Smt ${booking.semester || '-'}`, icon: 'school' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-[var(--theme-surface)] hover:border-[var(--theme-border)] hover:shadow-sm transition-all group">
                     <div className="w-12 h-12 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-text-muted)] shrink-0 shadow-sm group-hover:text-[var(--theme-primary)] group-hover:border-[var(--theme-primary)]/20 transition-all">
                       {typeof item.icon === 'string' ? (
                         <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                       ) : (
                         <item.icon className="text-[20px] shrink-0" />
                       )}
                     </div>
                     <div className="overflow-hidden">
                        <p className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest">{item.label}</p>
                        <p className="text-[13px] font-bold text-[var(--theme-text)] truncate mt-0.5">{item.value}</p>
                     </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-[var(--theme-surface)] rounded-[2rem] border border-[var(--theme-border)] shadow-sm p-8 space-y-8">
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <div className="p-4 rounded-[1.25rem] border border-[var(--theme-border)] flex items-center gap-4 bg-slate-50/30 hover:bg-[var(--theme-surface)] hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-primary)] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                      </div>
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Tanggal Booking</p>
                        <p className="text-sm font-black text-[var(--theme-text)] mt-0.5 font-headline">{booking.date}</p>
                     </div>
                  </div>
                  <div className="p-4 rounded-[1.25rem] border border-[var(--theme-border)] flex items-center gap-4 bg-slate-50/30 hover:bg-[var(--theme-surface)] hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-primary)] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">schedule</span>
                      </div>
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Waktu Booking</p>
                        <p className="text-sm font-black text-[var(--theme-text)] mt-0.5 font-headline">{booking.time}</p>
                     </div>
                  </div>
                  <div className="p-4 rounded-[1.25rem] border border-[var(--theme-border)] flex items-start gap-4 bg-slate-50/30 hover:bg-[var(--theme-surface)] hover:shadow-sm transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-primary)] shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">
                         {booking.mode === 'Online' ? 'videocam' : 'groups'}
                       </span>
                      </div>
                     <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Metode & Lokasi</p>
                        <p className="text-sm font-black text-[var(--theme-text)] mt-0.5 font-headline">
                          {booking.mode === 'Online' ? 'Online (Zoom / Meet)' : 'Tatap Muka'}
                        </p>
                        {booking.mode === 'Online' && booking.link_meeting && (
                          <div className="mt-3 p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-sm">
                            <a 
                              href={booking.link_meeting.startsWith('http') ? booking.link_meeting : `https://${booking.link_meeting}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-[var(--theme-primary)] font-bold hover:underline break-all flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[14px]">link</span>
                              {booking.link_meeting}
                            </a>
                          </div>
                        )}
                     </div>
                  </div>
               </div>

               <div className="p-5 rounded-[1.25rem] bg-[var(--theme-primary)] text-white relative overflow-hidden flex flex-col justify-center shadow-sm shadow-[var(--theme-primary)]/20">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/20"></div>
                  <span className="material-symbols-outlined absolute -right-2 -bottom-4 text-[80px] text-white/5 pointer-events-none">psychology</span>
                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/70 mb-1">Topik Konseling (Isu)</p>
                    <p className="text-lg lg:text-xl font-black uppercase tracking-tight font-headline leading-tight">{booking.issue}</p>
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-[var(--theme-border)]">
               <h4 className="flex items-center gap-2 text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-4">
                 <span className="material-symbols-outlined text-[18px]">format_quote</span>
                 Catatan Mahasiswa
               </h4>
               <div className="p-8 rounded-[1.5rem] bg-amber-50/50 border border-amber-100/50 text-amber-900 relative">
                  <span className="material-symbols-outlined absolute -top-3 -left-2 text-4xl text-amber-200/50">format_quote</span>
                  <p className="text-sm font-medium italic leading-relaxed relative z-10">"{booking.note || 'Tidak ada catatan tambahan yang diberikan.'}"</p>
               </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3) */}
        <div className="space-y-6">
          
          {/* Actions Card */}
          <div className="bg-[var(--theme-surface)] rounded-[2rem] border border-[var(--theme-border)] shadow-sm p-8 space-y-6">
             <h3 className="flex items-center gap-2 text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-2 border-b border-[var(--theme-border)] pb-4">
               <span className="material-symbols-outlined text-[18px]">bolt</span>
               Tindakan
             </h3>
             
             <div className="space-y-3">
                 <button
                   onClick={handleConfirmClick}
                   disabled={isLocked}
                   className="w-full py-4 bg-[var(--theme-primary)] text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest shadow-md shadow-[var(--theme-primary)]/20 hover:bg-[var(--theme-primary)]/90 hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:hover:scale-100 flex items-center justify-center gap-2"
                 >
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    Konfirmasi Sesi
                 </button>
                 <button
                   onClick={() => handleStatus('Ditolak')}
                   disabled={isLocked}
                   className="w-full py-4 bg-rose-50 text-rose-600 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 hover:scale-[1.02] transition-all disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:hover:scale-100 flex items-center justify-center gap-2"
                 >
                    <span className="material-symbols-outlined text-[20px]">cancel</span>
                    Tolak Sesi
                 </button>
             </div>
             
             {isLocked && (
               <div className="rounded-xl p-5 bg-slate-50/50 border border-slate-100">
                 <p className="text-[10px] font-bold leading-relaxed text-slate-500 text-center">
                   Status booking sudah <span className="uppercase text-slate-800 tracking-wider font-black">{booking.status}</span>. Perubahan tidak dapat dilakukan.
                 </p>
               </div>
             )}
             
             {['Dikonfirmasi', 'Selesai'].includes(booking.status) && (
               <div className="pt-6 border-t border-[var(--theme-border)]">
                 <button
                    onClick={() => navigate(`/app/psikologi/patients/${booking.mahasiswa_id}/medical-record?bookingId=${booking.id}`)}
                    className="w-full py-4 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text)] rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:border-[var(--theme-primary)]/50 hover:bg-[var(--theme-primary)]/5 hover:text-[var(--theme-primary)] transition-all"
                 >
                     <span className="material-symbols-outlined text-[20px]">description</span> 
                     Buka Rekam Medis
                 </button>
               </div>
             )}
          </div>

          {/* History Card */}
          <div className="bg-[var(--theme-surface)] rounded-[2rem] border border-[var(--theme-border)] shadow-sm p-8">
             <h3 className="flex items-center gap-2 text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-8 border-b border-[var(--theme-border)] pb-4">
               <span className="material-symbols-outlined text-[18px]">history</span>
               Riwayat Booking
             </h3>
             
             {history.length > 0 ? (
               <div className="space-y-8 relative before:absolute before:left-[23px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                   {history.map((item, i) => (
                    <div key={i} className="flex gap-6 relative z-10 group">
                       <div className="w-12 h-12 rounded-full bg-[var(--theme-surface)] border-4 border-white shadow-sm flex items-center justify-center shrink-0 ring-1 ring-slate-100 group-hover:scale-110 transition-transform">
                           <item.icon className={`text-[18px] shrink-0 ${item.color}`} />
                       </div>
                       <div className="pt-2">
                          <p className="text-[11px] font-black text-[var(--theme-text)] uppercase tracking-tight">{item.action}</p>
                          <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mt-1.5">{item.time}</p>
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
               <p className="text-[11px] font-bold text-[var(--theme-text-muted)] text-center py-6">Belum ada riwayat tercatat.</p>
             )}
          </div>
        </div>

      </div>

      {/* Zoom / Meeting Link Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal} maxWidth="max-w-md">
        <DialogHeader className="bg-slate-50/50 border-b border-slate-100 flex-shrink-0 relative">
          <div className="pr-8">
            <DialogTitle>Konfirmasi Sesi Online</DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
              Harap masukkan link Zoom atau Google Meet untuk mahasiswa.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Link Meeting</label>
            <input
              type="text"
              placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-bold text-slate-800 outline-none transition-all focus:border-[var(--theme-primary)] focus:bg-white focus:ring-4 focus:ring-primary/10"
            />
          </div>
        </div>
        <DialogFooter className="bg-slate-50/20 border-t border-slate-100/60">
          <button
            type="button"
            onClick={() => { setShowLinkModal(false); }}
            className="flex-1 sm:flex-initial px-5 py-3 border border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-colors rounded-xl"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submitConfirmWithLink}
            className="flex-1 sm:flex-initial px-8 py-3 bg-[var(--theme-primary)] text-white text-xs font-black uppercase tracking-widest hover:bg-[var(--theme-primary)]/90 transition-all shadow-md shadow-[var(--theme-primary)]/20 rounded-xl"
          >
            Konfirmasi
          </button>
        </DialogFooter>
      </Dialog>
    </PageContent>
  );
}
