import React, { useState } from 'react';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';

export default function DateRangeExportModal({ isOpen, onClose, onExport, title = 'Export Dokumen', requireRows = false }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rows, setRows] = useState(20);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert("Harap pilih rentang tanggal mulai dan akhir.");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      alert("Tanggal mulai tidak boleh lebih dari tanggal akhir.");
      return;
    }
    onExport({ startDate, endDate, rows });
  };

  return (
    <DialogModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={title}
      subtitle="Export Data"
      icon="download"
      maxWidth="max-w-md"
      footer={
        <>
          <ModalCancelButton onClick={onClose} />
          <ModalSaveButton 
            form="export-form" 
            type="submit" 
            icon="download"
          >
            Download
          </ModalSaveButton>
        </>
      }
    >
      <form id="export-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-[11px] font-bold text-[var(--theme-text)]">Tanggal Mulai</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-[var(--theme-text-muted)]">
                event
              </span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-11 pl-10 pr-4 border border-[var(--theme-border)] rounded-xl text-[12px] font-semibold focus:border-[var(--theme-primary)] outline-none bg-[var(--theme-bg)] text-[var(--theme-text)] shadow-sm"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="mb-2 block text-[11px] font-bold text-[var(--theme-text)]">Tanggal Akhir</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-[var(--theme-text-muted)]">
                event
              </span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-11 pl-10 pr-4 border border-[var(--theme-border)] rounded-xl text-[12px] font-semibold focus:border-[var(--theme-primary)] outline-none bg-[var(--theme-bg)] text-[var(--theme-text)] shadow-sm"
                required
              />
            </div>
          </div>
        </div>
      </form>
    </DialogModal>
  );
}
