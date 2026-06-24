"use client"
import React, { useState, useEffect, useMemo } from 'react';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable'



import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { SelectField, SelectOption } from '@/components/ui/SelectField'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const AccountBalanceIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>account_balance</span>;
const AssuredWorkloadIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>assured_workload</span>;
const PaymentsIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>payments</span>;

// Premium Rupiah Formatter
const formatRp = (n) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(n || 0)
}

import { useNavigate } from 'react-router-dom';

export default function KeuanganKas() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([])
  const [budgetStatus, setBudgetStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { hasPermission } = usePermission()

  const ormawaId = getOrmawaId()

  const [sortConfig, setSortConfig] = useState({ key: 'Tanggal', direction: 'desc' })
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const [form, setForm] = useState({
    Deskripsi: '',
    Nominal: '',
    Tipe: 'pemasukan',
    Tanggal: '',
    OrmawaID: ormawaId,
    Sumber: 'organisasi',
    Kategori: ''
  })

  // Filters
  const [filterSumber, setFilterSumber] = useState('all')
  const [filterTipe, setFilterTipe] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filterSumber !== 'all' && (t.Sumber || t.sumber || 'organisasi') !== filterSumber) return false
      if (filterTipe !== 'all' && (t.Tipe || '').toLowerCase() !== filterTipe) return false
      if (startDate && t.Tanggal && new Date(t.Tanggal) < new Date(startDate)) return false
      if (endDate && t.Tanggal) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        if (new Date(t.Tanggal) > end) return false
      }
      return true
    })
  }, [transactions, filterSumber, filterTipe, startDate, endDate])

  // Calculate totals from filtered
  const saldo = transactions.reduce((acc, t) => t.Tipe === 'pemasukan' ? acc + (t.Nominal || 0) : acc - (t.Nominal || 0), 0)
  const totalIn = transactions.filter(t => t.Tipe === 'pemasukan').reduce((a, t) => a + (t.Nominal || 0), 0)
  const totalOut = transactions.filter(t => t.Tipe === 'pengeluaran').reduce((a, t) => a + (t.Nominal || 0), 0)

  // Filtered totals for display
  const filteredIn = filteredTransactions.filter(t => t.Tipe === 'pemasukan').reduce((a, t) => a + (t.Nominal || 0), 0)
  const filteredOut = filteredTransactions.filter(t => t.Tipe === 'pengeluaran').reduce((a, t) => a + (t.Nominal || 0), 0)
  const filteredBalance = filteredIn - filteredOut

  // Isolated Campus vs Organisasi calculations
  const campusIn = transactions.filter(t => t.Tipe === 'pemasukan' && (t.Sumber === 'kampus' || t.sumber === 'kampus')).reduce((a, t) => a + (t.Nominal || 0), 0)
  const campusOut = transactions.filter(t => t.Tipe === 'pengeluaran' && (t.Sumber === 'kampus' || t.sumber === 'kampus')).reduce((a, t) => a + (t.Nominal || 0), 0)
  const campusSaldo = campusIn - campusOut

  // Pagu settings from backend
  const paguLimit = budgetStatus ? budgetStatus.budget_limit : campusIn
  const paguUsed = budgetStatus ? budgetStatus.used_budget : campusOut
  const paguRemaining = budgetStatus ? budgetStatus.remaining_budget : campusSaldo

  const orgIn = transactions.filter(t => t.Tipe === 'pemasukan' && (t.Sumber === 'organisasi' || t.sumber === 'organisasi' || !t.sumber)).reduce((a, t) => a + (t.Nominal || 0), 0)
  const orgOut = transactions.filter(t => t.Tipe === 'pengeluaran' && (t.Sumber === 'organisasi' || t.sumber === 'organisasi' || !t.sumber)).reduce((a, t) => a + (t.Nominal || 0), 0)
  const orgSaldo = orgIn - orgOut

  const sortedTransactions = useMemo(() => {
    const items = [...filteredTransactions]
    items.sort((a, b) => {
      let aVal = a[sortConfig.key]
      let bVal = b[sortConfig.key]
      if (sortConfig.key === 'Nominal') {
        aVal = Number(a.Nominal || 0)
        bVal = Number(b.Nominal || 0)
      } else if (sortConfig.key === 'Tanggal') {
        aVal = a.Tanggal ? new Date(a.Tanggal).getTime() : 0
        bVal = b.Tanggal ? new Date(b.Tanggal).getTime() : 0
      } else {
        aVal = String(aVal || '').toLowerCase()
        bVal = String(bVal || '').toLowerCase()
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return items
  }, [filteredTransactions, sortConfig])

  // Chart data
  const tipeDistData = useMemo(() => [
    { name: 'Pemasukan', value: totalIn },
    { name: 'Pengeluaran', value: totalOut }
  ].filter(d => d.value > 0), [totalIn, totalOut])

  const sumberDistData = useMemo(() => [
    { name: 'Pagu Kampus', value: campusIn + campusOut },
    { name: 'Kas Mandiri', value: orgIn + orgOut }
  ].filter(d => d.value > 0), [campusIn, campusOut, orgIn, orgOut])

  const monthlyTrendData = useMemo(() => {
    const byMonth = {}
    transactions.forEach(t => {
      const d = t.Tanggal
      if (!d) return
      const date = new Date(d)
      if (isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { pemasukan: 0, pengeluaran: 0 }
      if (t.Tipe === 'pemasukan') byMonth[key].pemasukan += t.Nominal || 0
      else byMonth[key].pengeluaran += t.Nominal || 0
    })
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([m, v]) => {
      const [y, mo] = m.split('-')
      return { month: `${months[parseInt(mo) - 1]} ${y}`, pemasukan: v.pemasukan, pengeluaran: v.pengeluaran }
    })
  }, [transactions])

  const prokerSpendData = useMemo(() => {
    const byProker = {}
    transactions.filter(t => t.Tipe === 'pengeluaran').forEach(t => {
      const proker = t.Kategori || t.kategori || t.Deskripsi || 'Tanpa Kategori'
      byProker[proker] = (byProker[proker] || 0) + (t.Nominal || 0)
    })
    return Object.entries(byProker).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const PIE_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#14b8a6']

  const fetchData = async () => {
    setLoading(true)
    try {
      const [kasRes, budgetRes] = await Promise.all([
        fetchWithAuth(`${API}/kas?ormawaId=${ormawaId}`),
        fetchWithAuth(`${API}/budget-status?ormawaId=${ormawaId}`)
      ]);
      
      if (kasRes.status === 'success') {
        setTransactions(kasRes.data || [])
      } else {
        toast.error('Gagal memuat data keuangan')
      }

      if (budgetRes.status === 'success') {
        setBudgetStatus(budgetRes.data)
      }
    } catch (err) {
      toast.error('Koneksi database backend gagal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [ormawaId])

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const payload = {
      ...form,
      Nominal: Number(form.Nominal),
      OrmawaID: Number(form.OrmawaID),
      Sumber: form.Sumber || 'organisasi',
      Kategori: form.Kategori || form.Deskripsi,
      Tanggal: form.Tanggal ? new Date(form.Tanggal).toISOString() : new Date().toISOString()
    }

    try {
      const data = await fetchWithAuth(`${API}/kas`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      })
      if (data.status === 'success') {
        toast.success('Transaksi keuangan berhasil dicatat!')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(data.message || 'Gagal menyimpan transaksi')
      }
    } catch (err) {
      console.error(err); toast.error(err.message || 'Terjadi kesalahan koneksi backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const data = await fetchWithAuth(`${API}/kas/${selected?.id || selected?.ID}`, {
        method: 'DELETE'
      })
      if (data.status === 'success') {
        toast.success('Transaksi berhasil dihapus dari sistem')
        setIsDelOpen(false)
        fetchData()
      } else {
        toast.error('Gagal menghapus transaksi')
      }
    } catch (err) {
      console.error(err); toast.error(err.message || 'Terjadi kesalahan koneksi backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  const exportToPDF = async () => {
    const loadingToast = toast.loading('Menyiapkan dokumen PDF...');
    try {
      let reportNumber = "001/LAP-ORMAWA/X/202X"; // Fallback
      let pdfOrmawaName = "Organisasi Mahasiswa";
      
      try {
        const numRes = await fetchWithAuth(`${API_BASE_URL}/ormawa/kas/generate-report-number?ormawaId=${ormawaId}`, { method: 'POST' });
        if (numRes?.status === 'success' && numRes?.document_number) {
          reportNumber = numRes.document_number;
        }
      } catch (e) {
        console.error("Gagal mendapatkan nomor surat", e);
      }

      try {
        const profRes = await fetchWithAuth(`${API_BASE_URL}/ormawa/profile?ormawaId=${ormawaId}`);
        if (profRes?.status === 'success' && profRes?.data?.nama) {
          pdfOrmawaName = profRes.data.nama;
        } else {
          const user = useAuthStore.getState().user;
          pdfOrmawaName = user?.Nama || user?.nama || user?.ormawa_nama || "Organisasi Mahasiswa";
        }
      } catch (e) {
        console.error("Gagal mendapatkan data profile", e);
        const user = useAuthStore.getState().user;
        pdfOrmawaName = user?.Nama || user?.nama || user?.ormawa_nama || "Organisasi Mahasiswa";
      }

      const doc = new jsPDF({ orientation: 'landscape' });
      const img = new Image();

      img.onload = () => {
        try {
          const ormawaName = pdfOrmawaName;
          
          const pageWidth = doc.internal.pageSize.getWidth();
          const pageHeight = doc.internal.pageSize.getHeight();
          
          // Gambar menutupi full satu halaman karena image ini berisi watermark juga
          doc.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight);

          let currentY = 45;

          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "bold");
          doc.text('LAPORAN TRANSPARANSI KEUANGAN', pageWidth / 2, currentY, { align: 'center' });

          currentY += 6;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text('Organisasi Mahasiswa Universitas Bhakti Kencana', pageWidth / 2, currentY, { align: 'center' });

          currentY += 6;
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(ormawaName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });

          currentY += 8;
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`Nomor Surat: ${reportNumber}`, pageWidth / 2, currentY, { align: 'center' });

          currentY += 10;

          const tableColumn = ["No", "Tanggal", "Keterangan", "Sumber", "Jenis", "Nominal (Rp)"];
          const tableRows = [];

          sortedTransactions.forEach((t, i) => {
            const dateStr = t.Tanggal ? new Date(t.Tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            const nominalStr = formatRp(t.Nominal).replace('Rp', '').trim();
            const jenis = t.Tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
            const sumber = (t.Sumber === 'kampus' || t.sumber === 'kampus') ? 'Pagu Kampus' : 'Kas Mandiri';
            tableRows.push([
              i + 1,
              dateStr,
              t.Deskripsi || '-',
              sumber,
              jenis,
              nominalStr
            ]);
          });

          autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: currentY,
            margin: { top: 20 },
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [15, 23, 42], textColor: 255, halign: 'center' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
              0: { cellWidth: 15, halign: 'center' },
              1: { cellWidth: 35 },
              2: { cellWidth: 'auto' },
              3: { cellWidth: 35 },
              4: { cellWidth: 30 },
              5: { cellWidth: 40, halign: 'right' }
            }
          });

          const finalY = doc.lastAutoTable?.finalY || 60;
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`Total Pemasukan: ${formatRp(filteredIn)}`, 15, finalY + 10);
          doc.text(`Total Pengeluaran: ${formatRp(filteredOut)}`, 15, finalY + 16);
          doc.text(`Saldo Akhir: ${formatRp(filteredBalance)}`, 15, finalY + 22);

          doc.save(`Transparansi_Keuangan_${new Date().getTime()}.pdf`);
          toast.dismiss(loadingToast);
          toast.success("PDF berhasil diunduh");
        } catch (err) {
          console.error("Error drawing PDF:", err);
          toast.dismiss(loadingToast);
          toast.error("Terjadi kesalahan saat memproses PDF: " + (err.message || err));
        }
      };

      img.onerror = () => {
        try {
          toast.dismiss(loadingToast);
          toast.error("Gagal memuat logo, menggunakan fallback teks");

          doc.setFontSize(18);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "bold");
          doc.text('Universitas Bhakti Kencana', 15, 20);

          doc.setFontSize(14);
          doc.text('LAPORAN TRANSPARANSI KEUANGAN', doc.internal.pageSize.getWidth() / 2, 45, { align: 'center' });

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`Nomor Surat: ${reportNumber}`, doc.internal.pageSize.getWidth() / 2, 53, { align: 'center' });

          const tableColumn = ["No", "Tanggal", "Keterangan", "Sumber", "Jenis", "Nominal (Rp)"];
          const tableRows = [];

          sortedTransactions.forEach((t, i) => {
            const dateStr = t.Tanggal ? new Date(t.Tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
            const nominalStr = formatRp(t.Nominal).replace('Rp', '').trim();
            const jenis = t.Tipe === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran';
            const sumber = (t.Sumber === 'kampus' || t.sumber === 'kampus') ? 'Pagu Kampus' : 'Kas Mandiri';
            tableRows.push([
              i + 1,
              dateStr,
              t.Deskripsi || '-',
              sumber,
              jenis,
              nominalStr
            ]);
          });

          autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 65,
          });

          const finalY = doc.lastAutoTable?.finalY || 60;
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text(`Total Pemasukan: ${formatRp(filteredIn)}`, 15, finalY + 10);
          doc.text(`Total Pengeluaran: ${formatRp(filteredOut)}`, 15, finalY + 16);
          doc.text(`Saldo Akhir: ${formatRp(filteredBalance)}`, 15, finalY + 22);

          doc.save(`Transparansi_Keuangan_${new Date().getTime()}.pdf`);
        } catch (err) {
          console.error("Error fallback PDF:", err);
          toast.error("Gagal membuat PDF fallback: " + (err.message || err));
        }
      };

      img.src = '/images/kop_rektorat.jpeg';

    } catch (err) {
      console.error("Error init PDF:", err);
      toast.dismiss(loadingToast);
      toast.error("Gagal menginisialisasi modul PDF");
    }
  }

  const columns = [
    {
      key: 'Tanggal',
      label: 'Tanggal',
      sortable: true,
      className: 'w-[150px]',
      render: v => (
        <span className="font-bold text-slate-500 text-[11px] font-headline">
          {v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
      )
    },
    {
      key: 'Deskripsi',
      label: 'Keterangan Transaksi',
      sortable: true,
      className: 'min-w-[280px]',
      render: (v, row) => {
        const isCampus = row.Sumber === 'kampus' || row.sumber === 'kampus'
        return (
          <div className="flex flex-col gap-1.5 py-1">
            <span className="font-bold text-slate-900 text-[13px] font-headline leading-tight">
              {v || '—'}
            </span>
            <div className="flex items-center">
              <span className={cn(
                "flex items-center gap-1 text-[8.5px] font-black tracking-widest px-2.5 py-0.5 rounded-md border",
                isCampus
                  ? "bg-blue-50 text-blue-600 border-blue-100/50"
                  : "bg-slate-50 text-slate-500 border-border"
              )}>
                {isCampus ? (
                  <><span className="material-symbols-outlined" style={{ fontSize: '11px' }}>account_balance</span> PAGU KAMPUS</>
                ) : (
                  <><span className="material-symbols-outlined" style={{ fontSize: '11px' }}>account_balance_wallet</span> KAS MANDIRI</>
                )}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'Tipe',
      label: 'Jenis Mutasi',
      sortable: true,
      className: 'w-[140px] text-center',
      cellClassName: 'text-center',
      render: v => {
        const isIncome = v === 'pemasukan'
        return (
          <Badge className={cn(
            'flex items-center justify-center gap-1 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1 border rounded-full',
            isIncome
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-rose-50 text-rose-700 border-rose-100'
          )}>
            {isIncome ? (
              <><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>arrow_upward</span> MASUK</>
            ) : (
              <><span className="material-symbols-outlined" style={{ fontSize: '12px' }}>arrow_downward</span> KELUAR</>
            )}
          </Badge>
        )
      }
    },
    {
      key: 'Nominal',
      label: 'Jumlah Nominal',
      sortable: true,
      className: 'w-[200px] text-right',
      cellClassName: 'text-right',
      render: (v, row) => {
        const isIncome = row.Tipe === 'pemasukan'
        return (
          <span className={cn(
            'font-black text-[13px] font-headline tracking-tight',
            isIncome ? 'text-emerald-600' : 'text-rose-600'
          )}>
            {isIncome ? '+ ' : '- '}{formatRp(v)}
          </span>
        )
      }
    }
  ]

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Keuangan &"
        highlightedTitle="Kas"
        subtitle="Pantau dan kelola seluruh pemasukan serta pengeluaran kas ormawa secara akuntabel."
        icon="account_balance_wallet"
        badges={[{ label: 'Buku Kas Organisasi', active: true }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportToPDF}
              className="h-11 px-6 rounded-xl bg-white text-slate-800 border-slate-200 font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-none cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              DOWNLOAD PDF
            </Button>
          </div>
        }
      />

      {/* ── Financial Summary Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <PrimaryStatsCard
          title="Saldo Kas Gabungan"
          value={formatRp(saldo)}
          subtitle={`Pemasukan: ${formatRp(totalIn)} | Pengeluaran: ${formatRp(totalOut)}`}
          icon={AccountBalanceIcon}
          colorTheme="primary"
          badgeText="Total"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">wallet</span>}
        />

        <PrimaryStatsCard
          title="Sisa Pagu (Duit Kampus)"
          value={formatRp(paguRemaining)}
          subtitle={budgetStatus ? `Pagu Diberikan: ${formatRp(paguLimit)} | Digunakan: ${formatRp(paguUsed)}` : `Hibah Masuk: ${formatRp(paguLimit)} | Penggunaan LPJ: ${formatRp(paguUsed)}`}
          icon={AssuredWorkloadIcon}
          colorTheme="info"
          badgeText="Kampus"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">account_balance</span>}
          onClick={() => navigate('/app/ormawa/keuangan/mutasi?sumber=kampus')}
        />

        <PrimaryStatsCard
          title="Kas Mandiri Organisasi"
          value={formatRp(orgSaldo)}
          subtitle={`Iuran/Sponsor: ${formatRp(orgIn)} | Pengeluaran: ${formatRp(orgOut)}`}
          icon={PaymentsIcon}
          colorTheme="success"
          badgeText="Mandiri"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">savings</span>}
          onClick={() => navigate('/app/ormawa/keuangan/mutasi?sumber=organisasi')}
        />
      </div>



      {/* ── 5W1H Charts ─────────────────────────────────────────────── */}
      {!loading && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-400">
            {/* WHAT → Distribusi Tipe */}
            <div className="glass-card shadow-sm rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pie_chart</span>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribusi Mutasi</h3>
                  <p className="text-[9px] text-slate-400">Rasio pemasukan vs pengeluaran</p>
                </div>
              </div>
              <div className="h-[160px] w-full flex items-center justify-center">
                {tipeDistData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={tipeDistData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value" stroke="none">
                        {tipeDistData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatRp(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400 italic">Tidak ada data</span>}
              </div>
              <div className="flex justify-center gap-3 mt-1">
                {tipeDistData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[10px] font-bold text-slate-500">{item.name}: {formatRp(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* WHERE → Sumber Dana */}
            <div className="glass-card shadow-sm rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance</span>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sumber Dana</h3>
                  <p className="text-[9px] text-slate-400">Pagu Kampus vs Kas Mandiri</p>
                </div>
              </div>
              <div className="h-[160px] w-full flex items-center justify-center">
                {sumberDistData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={sumberDistData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value" stroke="none">
                        {sumberDistData.map((_, i) => <Cell key={i} fill={['#3b82f6', '#10b981'][i % 2]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatRp(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400 italic">Tidak ada data</span>}
              </div>
              <div className="flex justify-center gap-3 mt-1">
                {sumberDistData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#3b82f6', '#10b981'][i % 2] }} />
                    <span className="text-[10px] font-bold text-slate-500">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* WHEN → Trend Bulanan */}
            <div className="glass-card shadow-sm rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trend Bulanan</h3>
                  <p className="text-[9px] text-slate-400">Pemasukan & pengeluaran per bulan</p>
                </div>
              </div>
              <div className="h-[160px] w-full">
                {monthlyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => formatRp(v)} />
                      <Line type="monotone" dataKey="pemasukan" name="Pemasukan" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="pengeluaran" name="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><span className="text-xs text-slate-400 italic">Tidak ada data</span></div>}
              </div>
            </div>
          </div>
          {/* HOW → Pengeluaran per Proker (full width) */}
          {!loading && prokerSpendData.length > 0 && (
            <div className="glass-card shadow-sm rounded-xl p-5 mb-6 animate-in slide-in-from-bottom-4 duration-500 delay-500">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pengeluaran per Proker</h3>
                  <p className="text-[9px] text-slate-400">Program kerja dengan pengeluaran terbesar</p>
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={prokerSpendData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 8.5, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} width={120} />
                    <Tooltip formatter={(v) => formatRp(v)} />
                    <Bar dataKey="value" name="Pengeluaran" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Transaction Table Card ──────────────────────────────────── */}
      <div>
        <div>
          <DataTable
            title="Laporan Mutasi Keseluruhan"
            subtitle="Menampilkan daftar seluruh mutasi gabungan dari Pagu Kampus dan Kas Mandiri."
            columns={columns}
            data={sortedTransactions}
            loading={loading}
            sortConfig={sortConfig}
            onSort={handleSort}
            searchPlaceholder="Cari berdasarkan keterangan transaksi..."
            filters={[
              {
                key: 'Tipe',
                placeholder: 'Filter Mutasi',
                options: [
                  { label: 'Pemasukan', value: 'pemasukan' },
                  { label: 'Pengeluaran', value: 'pengeluaran' }
                ]
              },
              {
                key: 'Sumber',
                placeholder: 'Filter Sumber Dana',
                options: [
                  { label: 'Pagu Kampus', value: 'kampus' },
                  { label: 'Kas Mandiri', value: 'organisasi' }
                ]
              }
            ]}
            actions={(row) => hasPermission('ormawa.finance.delete') ? (
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    setSelected(row)
                    setIsDelOpen(true)
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl active:scale-95 transition-all"
                  title="Hapus Transaksi"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                </Button>
              </div>
            ) : null}
          />
        </div>
      </div>


      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Transaksi?"
        description="Apakah Anda yakin ingin menghapus data transaksi ini dari sistem? Tindakan ini bersifat permanen."
        loading={isSubmitting}
      />
    </PageContent>
  )
}
