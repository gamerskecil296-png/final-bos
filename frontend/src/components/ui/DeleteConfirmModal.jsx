"use client"

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./AlertDialog"


export function DeleteConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Hapus Data?", 
  description = "Tindakan ini bersifat permanen dan data tidak dapat dikembalikan lagi dari sistem.",
  loading = false,
  confirmText = "YA, HAPUS",
  cancelText = "Batal",
  confirmClassName = "bg-[#ef4444] hover:bg-[#dc2626] text-white",
  extraAction = null
}) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="rounded-[24px] p-8 border border-slate-100 shadow-xl bg-white max-w-md mx-auto text-left">
        <AlertDialogHeader className="text-left">
          <AlertDialogTitle className="text-[20px] font-bold text-[#0f172a] mb-2 leading-tight text-left">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left text-[13px] text-[#64748b] leading-relaxed mt-0">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 flex justify-end gap-3 flex-row items-center w-full">
          <AlertDialogCancel 
            onClick={(e) => { e.preventDefault(); onClose(); }}
            className="h-10 px-6 rounded-xl border border-[#cbd5e1] bg-white text-[11px] font-bold text-[#334155] uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center cursor-pointer"
          >
            {cancelText}
          </AlertDialogCancel>
          {extraAction}
          <AlertDialogAction 
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={loading}
            className={`h-10 px-6 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all disabled:opacity-60 flex items-center justify-center gap-2 border-none shadow-sm cursor-pointer ${confirmClassName}`}
          >
            {loading ? <span className="material-symbols-outlined size-4 animate-spin text-[12px]" >sync</span> : null}
            <span>{loading ? 'Processing...' : confirmText}</span>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
