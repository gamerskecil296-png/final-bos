import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import {
  useMentorSessionsQuery,
  useMentorGetSessionQRQuery,
} from '@/queries/useKencanaMentorQuery';

const MentorQRModal = ({ isOpen, onClose }) => {
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const { data: sessions, isLoading: sessionsLoading } = useMentorSessionsQuery();
  const { data: qrData, isFetching: qrLoading, error: qrError, isError: qrIsError, refetch: qrRefetch } = useMentorGetSessionQRQuery(selectedSessionId, {
    enabled: !!selectedSessionId,
  });

  if (!isOpen) return null;

  const qrToken = qrData?.qr_token;
  const expiresAt = qrData?.expires_at;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">QR Code Presensi</h2>
            <p className="text-sm text-slate-500 font-semibold">Scan oleh Mahasiswa Bimbingan</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div className="w-full">
            <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Sesi Kencana</label>
            {sessionsLoading ? (
              <div className="text-sm font-bold text-slate-500">Memuat sesi...</div>
            ) : (
              <select
                className="w-full h-11 px-4 rounded-xl border border-slate-300 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none text-sm font-bold text-slate-700"
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
              >
                <option value="">-- Pilih Sesi --</option>
                {sessions?.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            )}
          </div>

          {qrLoading && (
            <div className="text-sm font-bold text-slate-500 py-8">Memuat QR Code...</div>
          )}

          {!qrLoading && qrToken && (
            <>
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <QRCodeSVG value={qrToken} size={220} level="M" />
              </div>
              <p className="text-xs text-slate-500 font-semibold text-center">
                Token berlaku hingga {expiresAt ? new Date(expiresAt).toLocaleTimeString('id-ID') : '-'}
                <br />
                QR Code otomatis diperbarui setiap 4 menit.
              </p>
              <p className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-center">
                Hanya mahasiswa bimbingan Anda yang dapat melakukan scan pada QR ini.
              </p>
            </>
          )}

          {qrIsError && (
            <div className="text-sm font-bold text-red-500 py-4 text-center">
              Gagal memuat QR Code.
              <div className="text-xs font-normal text-red-400 mt-1">
                {qrError?.response?.data?.message || qrError?.message || 'Terjadi kesalahan'}
              </div>
              <button
                onClick={() => qrRefetch()}
                className="mt-3 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          )}
          {!qrLoading && !qrIsError && !qrToken && selectedSessionId && (
            <div className="text-sm font-bold text-slate-500 py-8">Data tidak tersedia.</div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorQRModal;
