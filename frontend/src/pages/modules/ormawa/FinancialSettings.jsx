import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet, Search, RefreshCw, Save, History,
  CheckCircle2, AlertCircle, Building2, Calendar, Settings,
  Download, TrendingUp, TrendingDown, PieChart, BarChart3, FileText, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '@/services/api';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DataTable } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { PieChart as RechartPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PageHeader } from '@/components/ui/page';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const FinancialSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedOrmawa, setSelectedOrmawa] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [formData, setFormData] = useState({
    budget_limit: 0,
    fiscal_year: new Date().getFullYear(),
    active: true,
    enforce_limit: true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmData, setConfirmData] = useState(null);

  // Download PDF State
  const [docNumberStr, setDocNumberStr] = useState('-');
  const [kopImage, setKopImage] = useState(null);

  useEffect(() => {
    // Preload image
    const img = new Image();
    img.src = '/images/format_kop_rektorat_landscape.jpg';
    img.onload = () => setKopImage(img);

    // Pre-fetch document number so download can be 100% synchronous
    fetchWithAuth(`${API_BASE_URL}/admin/ormawa-financial-settings/generate-report-number`, { method: 'POST' })
      .then(res => {
        if (res && res.status === 'success' && res.document_number) {
          setDocNumberStr(res.document_number);
        }
      })
      .catch(err => console.warn('Failed to pre-fetch document number', err));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/ormawa-financial-settings`);
      if (res.status === 'success') {
        const data = res.data || [];
        setSettings(data);
        if (!selectedOrmawa && data.length > 0) {
          handleSelectOrmawa(data[0]);
        }
        return data;
      }
    } catch (err) {
      toast.error('Gagal memuat pengaturan keuangan ORMAWA');
    } finally {
      setLoading(false);
    }
    return [];
  };

  const fetchAuditLogs = async (ormawaId) => {
    try {
      setLoadingLogs(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/ormawa-financial-settings/${ormawaId}/audit-logs`);
      if (res.status === 'success') {
        setAuditLogs(res.data || []);
      } else {
        toast.error('Gagal memuat riwayat perubahan');
      }
    } catch (err) {
      toast.error('Gagal memuat riwayat perubahan');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleSelectOrmawa = (ormawa) => {
    setSelectedOrmawa(ormawa);
    setFormData({
      budget_limit: ormawa.budget_limit || 0,
      fiscal_year: ormawa.fiscal_year || new Date().getFullYear(),
      active: ormawa.active !== undefined ? ormawa.active : true,
      enforce_limit: ormawa.enforce_limit !== undefined ? ormawa.enforce_limit : true
    });
    fetchAuditLogs(ormawa.ormawa_id);
  };

  const doSave = async () => {
    if (!selectedOrmawa) return;
    try {
      setIsSaving(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/ormawa-financial-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ormawa_id: selectedOrmawa.ormawa_id,
          budget_limit: Number(formData.budget_limit),
          periode: String(formData.fiscal_year),
          is_active: formData.active,
          enforce_limit: formData.enforce_limit
        })
      });

      if (res.status === 'success') {
        toast.success(`Pagu keuangan untuk ${selectedOrmawa.name} berhasil disimpan`);
        const freshData = await fetchSettings();
        const updated = freshData.find(s => s.ormawa_id === selectedOrmawa.ormawa_id);
        if (updated) handleSelectOrmawa(updated);
        else fetchAuditLogs(selectedOrmawa.ormawa_id);
      } else {
        toast.error(res.message || 'Gagal menyimpan pengaturan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!selectedOrmawa) return;
    const newBudget = Number(formData.budget_limit);
    const oldBudget = selectedOrmawa.budget_limit || 0;
    if (newBudget > oldBudget) {
      setConfirmData({ ormawa: selectedOrmawa, oldBudget, newBudget });
      setShowConfirmDialog(true);
    } else {
      doSave();
    }
  };

  const confirmSave = () => {
    setShowConfirmDialog(false);
    setConfirmData(null);
    doSave();
  };

  const formatRupiahInput = (value) => {
    if (!value) return '';
    const numberString = value.toString().replace(/[^,\d]/g, '');
    const split = numberString.split(',');
    const sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    const ribuan = split[0].substr(sisa).match(/\d{3}/gi);

    if (ribuan) {
      const separator = sisa ? '.' : '';
      rupiah += separator + ribuan.join('.');
    }

    rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah;
    return rupiah;
  };

  const parseRupiahInput = (value) => {
    if (!value) return 0;
    return parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Computed summaries
  const totals = useMemo(() => {
    const totalPagu = settings.reduce((s, o) => s + (o.budget_limit || 0), 0);
    const totalUsed = settings.reduce((s, o) => s + (o.used_budget || 0), 0);
    const totalPending = settings.reduce((s, o) => s + (o.pending_budget || 0), 0);
    const totalRemaining = settings.reduce((s, o) => s + (o.remaining_budget || 0), 0);
    const ormawaWithPagu = settings.filter(o => (o.budget_limit || 0) > 0).length;
    const ormawaWithActivity = settings.filter(o => (o.used_budget || 0) > 0 || (o.pending_budget || 0) > 0).length;
    return { totalPagu, totalUsed, totalPending, totalRemaining, ormawaWithPagu, ormawaWithActivity };
  }, [settings]);

  // Pie data
  const pieData = useMemo(() => {
    return settings
      .filter(o => (o.budget_limit || 0) > 0)
      .map((o, i) => ({
        name: o.code || o.name,
        value: o.budget_limit || 0,
        used: o.used_budget || 0,
        pending: o.pending_budget || 0,
        remaining: o.remaining_budget || 0,
        fill: COLORS[i % COLORS.length]
      }));
  }, [settings]);

  const filteredSettings = (settings || []).filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadPDF = () => {
    const loadingToast = toast.loading('Membuat PDF...');
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      if (kopImage && kopImage.naturalWidth > 0) {
        doc.addImage(kopImage, 'JPEG', 0, 0, pageW, pageH);
      }

      // Title - Adjusted Y to match the visual space of the KOP
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN TRANSPARANSI ANGGARAN ORMAWA', pageW / 2, 43, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Periode Tahun ${new Date().getFullYear()} | Generated: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pageW / 2, 48, { align: 'center' });
      
      // Document Number
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`Nomor Surat : ${docNumberStr}`, 14, 55);
      doc.text(`Hal : Laporan Pagu Anggaran ORMAWA`, 14, 60);

      doc.line(14, 63, pageW - 14, 63);

      // Summary
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      let y = 70;
      doc.text(`Total Pagu: ${formatCurrency(totals.totalPagu)}`, 14, y);
      doc.text(`Total Terpakai: ${formatCurrency(totals.totalUsed)}`, 14, y + 5);
      doc.text(`Total Menunggu: ${formatCurrency(totals.totalPending)}`, 14, y + 10);
      doc.text(`Total Sisa: ${formatCurrency(totals.totalRemaining)}`, 14, y + 15);
      doc.text(`ORMAWA dengan Pagu: ${totals.ormawaWithPagu} / ${settings.length}`, 14, y + 20);

      // Table
      const tableData = settings.map(o => [
        o.code || '-',
        o.name || '-',
        formatCurrency(o.budget_limit || 0),
        formatCurrency(o.used_budget || 0),
        formatCurrency(o.pending_budget || 0),
        formatCurrency(o.remaining_budget || 0),
        o.active ? 'Aktif' : 'Nonaktif',
        o.enforce_limit ? 'Ya' : 'Tidak'
      ]);

      autoTable(doc, {
        startY: y + 25,
        head: [['Kode', 'ORMAWA', 'Total Pagu', 'Terpakai', 'Menunggu', 'Sisa', 'Aktif', 'Enforce']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 8, halign: 'center', lineColor: [0, 0, 0], lineWidth: 0.1 },
        bodyStyles: { fontSize: 8, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 50 },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' },
          5: { cellWidth: 35, halign: 'right' },
          6: { cellWidth: 15, halign: 'center' },
          7: { cellWidth: 15, halign: 'center' }
        },
        foot: [[
          'TOTAL',
          `${settings.length} ORMAWA`,
          formatCurrency(totals.totalPagu),
          formatCurrency(totals.totalUsed),
          formatCurrency(totals.totalPending),
          formatCurrency(totals.totalRemaining),
          '', ''
        ]],
        footStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontSize: 8, halign: 'center', fontStyle: 'bold', lineColor: [0, 0, 0], lineWidth: 0.1 }
      });

      // Footer note
      const finalY = doc.lastAutoTable.finalY || 200;
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(0, 0, 0);
      
      const filename = `Laporan_Anggaran_ORMAWA_${new Date().getFullYear()}.pdf`;
      doc.save(filename);
      toast.success('PDF berhasil diunduh', { id: loadingToast });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast.error('Gagal membuat PDF', { id: loadingToast });
    }
  };

  const auditColumns = [
    {
      key: 'created_at',
      label: 'Tanggal',
      render: (v) => <span className="text-slate-600 whitespace-nowrap">{formatDate(v)}</span>
    },
    {
      key: 'periode',
      label: 'Periode',
      render: (_, log) => (
        <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 border-indigo-100 rounded-lg">
          {log.setting?.periode || '-'}
        </Badge>
      )
    },
    {
      key: 'new_value',
      label: 'Pagu (Rp)',
      render: (v) => <span className="font-medium text-slate-800">{formatCurrency(Number(v) || 0)}</span>
    },
    {
      key: 'user',
      label: 'Diubah Oleh',
      render: (_, log) => <span className="text-slate-600">{log.user?.nama_lengkap || 'System'}</span>
    },
    {
      key: 'reason',
      label: 'Alasan/Catatan',
      render: (v) => <span className="text-slate-500 text-xs">{v || 'Perubahan melalui sistem'}</span>
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Pagu ORMAWA"
        subtitle="Manajemen pagu anggaran dan batas pengajuan dana per periode untuk setiap ORMAWA."
        icon="account_balance_wallet"
        breadcrumbs={[
          { label: 'Super Admin', path: '/app/dashboard' },
          { label: 'Financial Settings', path: '/app/dashboard/financial-settings' }
        ]}
        action={
          <Button onClick={downloadPDF} variant="outline" className="min-w-[160px] bg-white">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <PrimaryStatsCard
          title="Total Pagu"
          value={formatCurrency(totals.totalPagu)}
          icon={Wallet}
          colorTheme="info"
          badgeText={`${settings.length} ORMAWA terdaftar`}
        />

        <PrimaryStatsCard
          title="Terpakai"
          value={formatCurrency(totals.totalUsed)}
          icon={TrendingUp}
          colorTheme="error"
          badgeText={`${totals.ormawaWithActivity} ORMAWA aktif`}
        />

        <PrimaryStatsCard
          title="Menunggu"
          value={formatCurrency(totals.totalPending)}
          icon={FileText}
          colorTheme="warning"
          badgeText="Proposal diajukan"
        />

        <PrimaryStatsCard
          title="Sisa Pagu"
          value={formatCurrency(totals.totalRemaining)}
          icon={TrendingDown}
          colorTheme="success"
          badgeText={totals.totalPagu > 0 ? `${Math.round((totals.totalRemaining / totals.totalPagu) * 100)}% dari total` : '-'}
        />

        <PrimaryStatsCard
          title="ORMAWA"
          value={`${totals.ormawaWithPagu} / ${settings.length}`}
          icon={BarChart3}
          colorTheme="primary"
          badgeText="Sudah punya pagu"
        />
      </div>

      {/* PieChart + Daftar ORMAWA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PieChart Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-slate-500" />
            Distribusi Pagu per ORMAWA
          </h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <RechartPie>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => formatCurrency(val)}
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
                />
              </RechartPie>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[260px] text-slate-400">
              <PieChart className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">Belum ada pagu ditetapkan</p>
            </div>
          )}
        </div>

        {/* Card 1: List of ORMAWA */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                Daftar Organisasi
              </h2>
              <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                {filteredSettings.length} / {settings.length}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ORMAWA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredSettings.length > 0 ? (
              filteredSettings.map((ormawa) => {
                const pct = (ormawa.budget_limit || 0) > 0
                  ? Math.min(100, (((ormawa.used_budget || 0) + (ormawa.pending_budget || 0)) / (ormawa.budget_limit || 1)) * 100)
                  : 0;
                const usedPct = (ormawa.budget_limit || 0) > 0
                  ? ((ormawa.used_budget || 0) / (ormawa.budget_limit || 1)) * 100
                  : 0;
                const pendingPct = (ormawa.budget_limit || 0) > 0
                  ? ((ormawa.pending_budget || 0) / (ormawa.budget_limit || 1)) * 100
                  : 0;
                const isSelected = selectedOrmawa?.ormawa_id === ormawa.ormawa_id;

                return (
                  <div
                    key={ormawa.ormawa_id}
                    onClick={() => handleSelectOrmawa(ormawa)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${isSelected
                        ? 'bg-indigo-50/60 border-indigo-300 shadow-sm'
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`font-semibold text-sm truncate ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                          {ormawa.name || 'Unnamed ORMAWA'}
                        </h3>
                        {ormawa.budget_limit > 0 ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-700 shrink-0 ml-2">
                        {formatCurrency(ormawa.budget_limit || 0)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1.5">
                      <span className="px-1.5 py-0.5 bg-slate-100 rounded font-medium">{ormawa.code || '-'}</span>
                      {(ormawa.used_budget || 0) > 0 && (
                        <span className="text-rose-500 font-medium">Terpakai {formatCurrency(ormawa.used_budget)}</span>
                      )}
                      {(ormawa.pending_budget || 0) > 0 && (
                        <span className="text-amber-500 font-medium">Menunggu {formatCurrency(ormawa.pending_budget)}</span>
                      )}
                      <span className={`font-medium ${(ormawa.remaining_budget || 0) > 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        Sisa {formatCurrency(ormawa.remaining_budget || 0)}
                      </span>
                    </div>

                    {(ormawa.budget_limit || 0) > 0 && (
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                        {(ormawa.used_budget || 0) > 0 && (
                          <div
                            className="h-full bg-rose-400 transition-all"
                            style={{ width: `${usedPct}%` }}
                            title={`Terpakai: ${formatCurrency(ormawa.used_budget)}`}
                          />
                        )}
                        {(ormawa.pending_budget || 0) > 0 && (
                          <div
                            className="h-full bg-amber-400 transition-all"
                            style={{ width: `${pendingPct}%` }}
                            title={`Menunggu: ${formatCurrency(ormawa.pending_budget)}`}
                          />
                        )}
                        <div
                          className="h-full bg-emerald-400 transition-all rounded-r-full"
                          style={{ width: `${100 - pct}%` }}
                          title={`Sisa: ${formatCurrency(ormawa.remaining_budget)}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                Tidak ada data ORMAWA ditemukan.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card 2: Settings & Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Settings Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-slate-500" />
                Konfigurasi Pagu Anggaran
              </h2>
              {selectedOrmawa && (
                <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-200 text-slate-700">
                  {selectedOrmawa.code}
                </span>
              )}
            </div>

            {selectedOrmawa ? (
              <form onSubmit={handleSave} className="p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800">{selectedOrmawa.name}</h3>
                  <p className="text-sm text-slate-500">Atur pagu anggaran maksimum yang dapat diajukan dalam satu periode.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Pagu Anggaran (Rp)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-slate-500 font-medium">Rp</span>
                      </div>
                      <input
                        type="text"
                        value={formatRupiahInput(formData.budget_limit)}
                        onChange={(e) => {
                          const rawVal = parseRupiahInput(e.target.value);
                          setFormData({ ...formData, budget_limit: rawVal });
                        }}
                        className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-semibold"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Total Pagu</span>
                        <span className="font-bold text-slate-800">{formatCurrency(formData.budget_limit || 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Terpakai (disetujui)</span>
                        <span className="font-semibold text-rose-600">{formatCurrency(selectedOrmawa.used_budget || 0)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Menunggu (diajukan)</span>
                        <span className="font-semibold text-amber-600">{formatCurrency(selectedOrmawa.pending_budget || 0)}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-1 flex justify-between text-xs">
                        <span className="font-medium text-slate-600">Sisa Pagu</span>
                        <span className="font-bold text-primary">{formatCurrency(selectedOrmawa.remaining_budget || 0)}</span>
                      </div>
                      {(formData.budget_limit || 0) > 0 && (
                        <div className="w-full bg-slate-200 rounded-full h-2 mt-1 overflow-hidden flex">
                          <div
                            className="h-full bg-rose-400 transition-all rounded-l-full"
                            style={{
                              width: `${Math.min(100, ((selectedOrmawa.used_budget || 0) / (formData.budget_limit || 1)) * 100)}%`
                            }}
                          />
                          <div
                            className="h-full bg-amber-400 transition-all"
                            style={{
                              width: `${Math.min(100, ((selectedOrmawa.pending_budget || 0) / (formData.budget_limit || 1)) * 100)}%`
                            }}
                          />
                          <div
                            className="h-full bg-emerald-400 transition-all rounded-r-full"
                            style={{
                              width: `${Math.max(0, 100 - Math.min(100, (((selectedOrmawa.used_budget || 0) + (selectedOrmawa.pending_budget || 0)) / (formData.budget_limit || 1)) * 100))}%`
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Periode Tahun (Fiscal Year)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Calendar className="w-4 h-4 text-slate-400" />
                      </div>
                      <input
                        type="number"
                        min="2000"
                        max="2100"
                        value={formData.fiscal_year}
                        onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                        disabled={selectedOrmawa?.budget_limit > 0}
                        className={`w-full pl-10 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium ${selectedOrmawa?.budget_limit > 0
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-slate-50 border-slate-200'
                          }`}
                        required
                      />
                      {selectedOrmawa?.budget_limit > 0 && (
                        <p className="text-[10px] text-slate-400 mt-1">Periode hanya dapat diatur saat pertama kali membuat pagu.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.active}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                      />
                      <span className="text-xs font-medium text-slate-700">Pagu Aktif</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.enforce_limit}
                        onChange={(e) => setFormData({ ...formData, enforce_limit: e.target.checked })}
                        className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary"
                      />
                      <span className="text-xs font-medium text-slate-700">Enforce Limit</span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSaving}
                    className="min-w-[140px]"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Simpan Pagu
                  </Button>
                </div>
              </form>
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center text-slate-500">
                <Wallet className="w-12 h-12 text-slate-300 mb-3" />
                <p>Pilih ORMAWA dari daftar di samping untuk mengatur pagu anggaran.</p>
              </div>
            )}
          </div>

          {/* Audit Log Card */}
          {selectedOrmawa && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-slate-500" />
                  Riwayat Perubahan Pagu
                </h2>
                <span className="text-[10px] text-slate-400">{auditLogs.length} perubahan</span>
              </div>
              <div className="p-4 overflow-x-auto">
                <DataTable columns={auditColumns} data={auditLogs} loading={loadingLogs} />
              </div>
            </div>
          )}
        </div>

        {/* Legend / Info sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Legenda Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Terpakai</p>
                  <p className="text-[10px] text-slate-400">Proposal disetujui (Fakultas/Univ)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Menunggu</p>
                  <p className="text-[10px] text-slate-400">Proposal diajukan, belum diproses</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-700">Sisa Pagu</p>
                  <p className="text-[10px] text-slate-400">Anggaran tersedia untuk diajukan</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">Ringkasan</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Total ORMAWA</span><span className="font-semibold">{settings.length}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Dengan Pagu</span><span className="font-semibold">{totals.ormawaWithPagu}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Aktif mengajukan</span><span className="font-semibold">{totals.ormawaWithActivity}</span></div>
              <div className="border-t border-slate-100 pt-2 flex justify-between">
                <span className="text-slate-600 font-medium">Utilisasi</span>
                <span className="font-bold">{totals.totalPagu > 0 ? `${Math.round(((totals.totalUsed + totals.totalPending) / totals.totalPagu) * 100)}%` : '0%'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Budget Increase */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-[24px] p-8 border border-slate-100 shadow-xl bg-white max-w-md mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              Konfirmasi Penambahan Pagu
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-slate-600 mt-4 space-y-3">
                {confirmData && (
                  <>
                    <p>Anda akan <strong>menambah pagu</strong> untuk:</p>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">ORMAWA</span>
                        <span className="font-bold text-slate-800">{confirmData.ormawa.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Kode</span>
                        <span className="font-semibold">{confirmData.ormawa.code}</span>
                      </div>
                      <div className="border-t border-slate-200 pt-2 flex justify-between">
                        <span className="text-slate-500">Pagu Sebelumnya</span>
                        <span className="font-semibold text-slate-600">{formatCurrency(confirmData.oldBudget)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Pagu Baru</span>
                        <span className="font-bold text-emerald-600 text-base">{formatCurrency(confirmData.newBudget)}</span>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-2 flex items-center gap-2">
                        <ArrowUpRight className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="text-xs font-medium text-indigo-700">
                          Kenaikan: <strong>{formatCurrency(confirmData.newBudget - confirmData.oldBudget)}</strong>
                          {' '}({confirmData.oldBudget > 0 ? `${Math.round(((confirmData.newBudget - confirmData.oldBudget) / confirmData.oldBudget) * 100)}%` : '~'} dari pagu sebelumnya)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                      Tindakan ini akan dicatat di riwayat audit dan langsung berlaku untuk pengajuan proposal ORMAWA.
                    </p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex justify-end gap-3">
            <AlertDialogCancel
              onClick={() => setShowConfirmDialog(false)}
              className="h-11 px-6 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 transition-all"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSave}
              className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all border-none shadow-sm flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Ya, Simpan Pagu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FinancialSettings;
