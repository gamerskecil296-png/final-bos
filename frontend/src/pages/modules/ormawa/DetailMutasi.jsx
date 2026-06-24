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

import { useNavigate, useSearchParams } from 'react-router-dom';

export default function DetailMutasi() {
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

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilterSumber = searchParams.get('sumber') === 'kampus' ? 'kampus' : 'organisasi';

  const [form, setForm] = useState({
    Deskripsi: '',
    Nominal: '',
    Tipe: 'pemasukan',
    Tanggal: new Date().toISOString().slice(0, 10),
    Jam: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false}).replace('.', ':').slice(0, 5),
    OrmawaID: ormawaId,
    Sumber: initialFilterSumber,
    Kategori: ''
  })

  const [periodType, setPeriodType] = useState('bulanan')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if ((t.Sumber || t.sumber || 'organisasi') !== initialFilterSumber) return false
      
      if (periodType === 'bulanan' && selectedMonth && t.Tanggal) {
        if (!t.Tanggal.startsWith(selectedMonth)) return false
      }
      return true
    })
  }, [transactions, initialFilterSumber, periodType, selectedMonth])

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

    const datetimeStr = `${form.Tanggal}T${form.Jam || '00:00'}:00`

    const payload = {
      ...form,
      Nominal: Number(form.Nominal),
      OrmawaID: Number(form.OrmawaID),
      Sumber: form.Sumber || 'organisasi',
      Kategori: form.Kategori || form.Deskripsi,
      Tanggal: new Date(datetimeStr).toISOString()
    }

    try {
      const data = await fetchWithAuth(`${API}/kas`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      })
      if (data.status === 'success') {
        toast.success('Transaksi keuangan berhasil dicatat!')
        setForm({
          Deskripsi: '',
          Nominal: '',
          Tipe: 'pemasukan',
          Tanggal: new Date().toISOString().slice(0, 10),
          Jam: new Date().toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit', hour12: false}).replace('.', ':').slice(0, 5),
          OrmawaID: ormawaId,
          Sumber: initialFilterSumber,
          Kategori: ''
        })
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

  const exportToPDF = () => {
    const loadingToast = toast.loading('Menyiapkan dokumen PDF...');
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      const img = new Image();

      img.onload = () => {
        try {
          const user = useAuthStore.getState().user;
          const ormawaName = user?.Nama || user?.nama || user?.ormawa_nama || "Organisasi Mahasiswa";

          const targetHeight = 20;
          const targetWidth = img.height ? (img.width * targetHeight) / img.height : 40;
          doc.addImage(img, 'PNG', 15, 10, targetWidth, targetHeight);

          doc.setFontSize(10);
          doc.setTextColor(100, 100, 100);
          doc.setFont("helvetica", "normal");
          const pageWidth = doc.internal.pageSize.getWidth();
          const textRightX = pageWidth - 15;

          doc.text('Jl. Soekarno Hatta No 754 Bandung', textRightX, 15, { align: 'right' });
          doc.text('022 7830 760, 022 7830 768', textRightX, 20, { align: 'right' });
          doc.text('bku.ac.id | contact@bku.ac.id', textRightX, 25, { align: 'right' });

          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(15, 35, pageWidth - 15, 35);

          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          doc.setFont("helvetica", "bold");
          doc.text('LAPORAN TRANSPARANSI KEUANGAN', pageWidth / 2, 20, { align: 'center' });

          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text('Organisasi Mahasiswa Universitas Bhakti Kencana', pageWidth / 2, 26, { align: 'center' });

          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(ormawaName.toUpperCase(), pageWidth / 2, 32, { align: 'center' });

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
            startY: 40,
          });

          doc.save(`Transparansi_Keuangan_${new Date().getTime()}.pdf`);
        } catch (err) {
          console.error("Error fallback PDF:", err);
          toast.error("Gagal membuat PDF fallback: " + (err.message || err));
        }
      };

      img.src = '/images/bku%20logo.png';

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

  let heroTitle = "Detail Pagu";
  let heroHighlighted = "Kampus";
  let breadcrumbTitle = "Pagu Kampus";
  if (initialFilterSumber === 'organisasi') {
    heroTitle = "Detail Kas";
    heroHighlighted = "Mandiri";
    breadcrumbTitle = "Kas Mandiri";
  }

  const periodSubtitle = periodType === 'bulanan' && selectedMonth 
    ? `Periode ${selectedMonth}. Detail bagian ini tersambung dengan arus kas dan mutasi.`
    : `Semua Waktu. Detail bagian ini tersambung dengan arus kas dan mutasi.`;

  const headerFilter = (
    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Periode</span>
        <select 
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value)}
          className="h-9 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary cursor-pointer min-w-[120px]"
        >
          <option value="bulanan">Bulanan</option>
          <option value="semua">Semua Waktu</option>
        </select>
      </div>
      {periodType === 'bulanan' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Bulan</span>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 px-3 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-primary cursor-pointer min-w-[150px]"
          />
        </div>
      )}
    </div>
  )

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

      {/* ── Breadcrumbs ────────────────────────────────────────────── */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
          <span className="material-symbols-outlined" style={{fontSize: '18px'}}>account_balance_wallet</span>
          <span className="cursor-pointer hover:text-slate-800 transition-colors" onClick={() => navigate('/app/ormawa/keuangan')}>Keuangan</span>
          <span className="material-symbols-outlined text-slate-300" style={{fontSize: '16px'}}>chevron_right</span>
          <span className="text-slate-700">Detail {breadcrumbTitle}</span>
        </div>
      </div>

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title={heroTitle}
        highlightedTitle={heroHighlighted}
        subtitle={periodSubtitle}
        icon="receipt_long"
        badges={[]}
        actions={
          <div className="flex flex-col xl:flex-row items-end xl:items-center gap-4">
            {headerFilter}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={exportToPDF}
                className="h-11 px-4 rounded-xl bg-white text-slate-800 border-slate-200 font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-50 transition-all active:scale-95 shadow-sm cursor-pointer flex items-center justify-center"
                title="Download PDF"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              </Button>
            </div>
          </div>
        }
      />



      {/* ── Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <PrimaryStatsCard
          title={initialFilterSumber === 'kampus' ? 'Pagu Masuk / Hibah' : 'Pemasukan Masuk'}
          value={formatRp(filteredIn)}
          subtitle={periodType === 'bulanan' ? `Periode ${selectedMonth}` : 'Sepanjang Waktu'}
          icon={AccountBalanceIcon}
          colorTheme="success"
          badgeText="MASUK"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">arrow_downward</span>}
        />
        <PrimaryStatsCard
          title="Pengeluaran Keluar"
          value={formatRp(filteredOut)}
          subtitle={periodType === 'bulanan' ? `Periode ${selectedMonth}` : 'Sepanjang Waktu'}
          icon={PaymentsIcon}
          colorTheme="danger"
          badgeText="KELUAR"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">arrow_upward</span>}
        />
        <PrimaryStatsCard
          title="Saldo Periode"
          value={formatRp(filteredBalance)}
          subtitle={periodType === 'bulanan' ? `Netto bulan ${selectedMonth}` : 'Netto keseluruhan'}
          icon={AccountBalanceIcon}
          colorTheme="info"
          badgeText="NETTO"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">swap_vert</span>}
        />
        <PrimaryStatsCard
          title={initialFilterSumber === 'kampus' ? 'Sisa Pagu (Keseluruhan)' : 'Saldo Mandiri (Keseluruhan)'}
          value={formatRp(initialFilterSumber === 'kampus' ? paguRemaining : orgSaldo)}
          subtitle="Total uang fisik saat ini"
          icon={AssuredWorkloadIcon}
          colorTheme="primary"
          badgeText="SALDO"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">account_balance_wallet</span>}
        />
      </div>

      {/* ── Inline Add Transaction Form ──────────────────────────────── */}
      {hasPermission('ormawa.finance.create') && (
        <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm mb-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[15px] font-bold text-slate-800 font-headline">Tambah Mutasi {breadcrumbTitle}</h2>
            <p className="text-[12px] text-slate-500 font-medium">Catat pembayaran atau penggunaan dari pos {breadcrumbTitle} agar saldo detail dan mutasi tetap sinkron.</p>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* TANGGAL */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tanggal</label>
                <input type="date" required value={form.Tanggal} onChange={e => setForm({...form, Tanggal: e.target.value})} className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none w-full" />
              </div>
              {/* JAM */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Jam</label>
                <input type="time" required value={form.Jam || ''} onChange={e => setForm({...form, Jam: e.target.value})} className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none w-full" />
              </div>
              {/* ARAH */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Arah</label>
                <select value={form.Tipe} onChange={e => setForm({...form, Tipe: e.target.value})} className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none bg-white w-full">
                  <option value="pemasukan">Uang Masuk</option>
                  <option value="pengeluaran">Uang Keluar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PENERIMA / KATEGORI */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Penerima / Kategori</label>
                <input type="text" placeholder="Nama Penerima atau Kategori" value={form.Kategori} onChange={e => setForm({...form, Kategori: e.target.value})} className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none w-full" />
              </div>
              {/* NOMINAL */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nominal</label>
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input type="number" required placeholder="0" value={form.Nominal} onChange={e => setForm({...form, Nominal: e.target.value})} className="h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none w-full" />
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-end">
              {/* KETERANGAN */}
              <div className="flex-1 flex flex-col gap-2 w-full">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Keterangan</label>
                <input type="text" required placeholder="Contoh: biaya operasional / transfer antar rekening" value={form.Deskripsi} onChange={e => setForm({...form, Deskripsi: e.target.value})} className="h-11 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary outline-none w-full" />
              </div>
              {/* BUTTON */}
              <button disabled={isSubmitting} type="submit" className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-[13px] transition-colors whitespace-nowrap w-full lg:w-auto flex items-center justify-center cursor-pointer shadow-sm">
                {isSubmitting ? 'Menyimpan...' : 'Tambah Mutasi'}
              </button>
            </div>

            {/* INFO BOX */}
            <div className="mt-2 bg-primary/5 border border-primary/10 rounded-2xl p-4 flex gap-3 items-start">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Terkait {breadcrumbTitle}</span>
                <span className="text-xs text-slate-500 font-medium leading-relaxed">Catatan mutasi ini akan langsung tersinkronisasi ke laporan mutasi keseluruhan dan detail {breadcrumbTitle} sekaligus.</span>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ── Transaction Table Card ──────────────────────────────────── */}
      <div>
        <div>
          <DataTable
            title={`Riwayat Mutasi ${breadcrumbTitle}`}
            subtitle={`Menampilkan daftar seluruh transaksi yang tercatat pada pos ${breadcrumbTitle}.`}
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
