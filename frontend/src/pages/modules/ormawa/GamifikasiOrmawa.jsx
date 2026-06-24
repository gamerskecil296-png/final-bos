"use client"

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { DataTable } from '@/components/ui/DataTable'
import { TitleSubtitleCell } from '@/components/ui/TableCells'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'

// Fallback Icons
const Trophy = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, fontVariationSettings: "'FILL' 1", ...props.style }} {...props}>emoji_events</span>;
const History = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>history</span>;
const Medal = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>military_tech</span>;
const Stars = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>stars</span>;
const SettingsIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>settings</span>;
const EditIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>edit</span>;
const TrashIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>delete</span>;
const PlusIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>add</span>;

export default function GamifikasiOrmawa() {
  const [activeTab, setActiveTab] = useState('leaderboard') // 'leaderboard' or 'settings'
  const [leaderboard, setLeaderboard] = useState([])
  const [history, setHistory] = useState([])
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)

  // Rule Edit States
  const [selectedRule, setSelectedRule] = useState(null)
  const [isRuleEditOpen, setIsRuleEditOpen] = useState(false)
  const [isRuleDeleteOpen, setIsRuleDeleteOpen] = useState(false)
  const [ruleMode, setRuleMode] = useState('edit') // 'edit' or 'create'
  const [submittingRule, setSubmittingRule] = useState(false)
  const [ruleForm, setRuleForm] = useState({ key: '', poin: 0, label: '', deskripsi: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [leadRes, histRes, rulesRes] = await Promise.all([
        adminService.getOrmawaLeaderboard(),
        adminService.getOrmawaGamifikasiHistory(),
        adminService.getGamifikasiRules()
      ])

      if (leadRes.status === 'success') {
        setLeaderboard(leadRes.data || [])
      } else {
        toast.error('Gagal memuat papan peringkat')
      }

      if (histRes.status === 'success') {
        setHistory(histRes.data || [])
      } else {
        toast.error('Gagal memuat riwayat poin')
      }

      if (rulesRes.status === 'success') {
        setRules(rulesRes.data || [])
      } else {
        toast.error('Gagal memuat aturan poin')
      }
    } catch {
      toast.error('Terjadi gangguan jaringan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenCreateRule = () => {
    setRuleMode('create')
    setRuleForm({ key: '', poin: 0, label: '', deskripsi: '' })
    setSelectedRule(null)
    setIsRuleEditOpen(true)
  }

  const handleOpenEditRule = (rule) => {
    setRuleMode('edit')
    setSelectedRule(rule)
    setRuleForm({
      key: rule.key || '',
      poin: rule.poin || 0,
      label: rule.label || '',
      deskripsi: rule.deskripsi || ''
    })
    setIsRuleEditOpen(true)
  }

  const handleOpenDeleteRule = (rule) => {
    setSelectedRule(rule)
    setIsRuleDeleteOpen(true)
  }

  const handleSaveRule = async (e) => {
    if (e) e.preventDefault()
    setSubmittingRule(true)
    try {
      let res;
      if (ruleMode === 'create') {
        res = await adminService.createGamifikasiRule(ruleForm)
      } else {
        res = await adminService.updateGamifikasiRule(selectedRule.id || selectedRule.ID, ruleForm)
      }

      if (res.status === 'success') {
        toast.success(`Aturan gamifikasi berhasil ${ruleMode === 'create' ? 'ditambahkan' : 'diperbarui'} & disinkronkan!`)
        setIsRuleEditOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menyimpan aturan')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSubmittingRule(false)
    }
  }

  const handleDeleteRule = async () => {
    if (!selectedRule) return
    setSubmittingRule(true)
    try {
      const res = await adminService.deleteGamifikasiRule(selectedRule.id || selectedRule.ID)
      if (res.status === 'success') {
        toast.success('Aturan berhasil dihapus!')
        setIsRuleDeleteOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menghapus aturan')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSubmittingRule(false)
    }
  }

  // Top 3 Ormawas
  const top3 = leaderboard.slice(0, 3)

  const leaderboardColumns = [
    {
      key: 'rank',
      label: 'Rank',
      className: 'w-[80px] text-center',
      cellClassName: 'text-center font-bold px-5',
      render: (v, r, idx) => {
        if (idx < 3) {
          const colors = [
            "bg-amber-100 text-amber-700",
            "bg-slate-100 text-slate-700",
            "bg-orange-100 text-orange-700"
          ];
          return (
            <div className={`mx-auto size-6 flex items-center justify-center rounded-full text-[11px] font-bold ${colors[idx]}`}>
              {idx + 1}
            </div>
          );
        }
        return <span className="font-semibold text-slate-600 text-xs">{idx + 1}</span>;
      }
    },
    {
      key: 'nama',
      label: 'Organisasi Mahasiswa',
      sortable: true,
      render: (v, row) => <TitleSubtitleCell title={row.nama} subtitle={row.singkatan || 'Unit Kegiatan'} />
    },
    {
      key: 'poin',
      label: 'Total Poin',
      sortable: true,
      className: 'text-right px-5',
      cellClassName: 'text-right px-5',
      render: (v, row) => <span className="font-bold text-[var(--theme-text)] text-[13px]">{row.poin} <span className="text-[10px] text-[var(--theme-text-muted)] font-normal ml-0.5">Pts</span></span>
    }
  ];

  // Map key rule to symbol/icon
  const getRuleIcon = (key) => {
    switch (key) {
      case 'proposal_disetujui': return 'assignment';
      case 'kegiatan_selesai': return 'event_available';
      case 'aspirasi_selesai': return 'campaign';
      case 'prestasi_terverifikasi': return 'military_tech';
      default: return 'stars';
    }
  }

  return (
    <PageContent>
      <Toaster position="top-right" />

      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <DashboardHero
          title="Gamifikasi"
          highlightedTitle="Ormawa"
          subtitle="Papan peringkat keaktifan, total akumulasi poin prestasi, dan konfigurasi aturan poin yang tersinkron otomatis."
          icon="emoji_events"
          badges={[
            { label: 'Sistem Gamifikasi', active: true }
          ]}
        />

        {/* ── Tabs Switcher ────────────────────────────────────────── */}
        <div className="flex items-center p-1 bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] rounded-xl w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={cn(
              "px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center gap-2",
              activeTab === 'leaderboard'
                ? "bg-[var(--theme-primary-light)] text-[var(--theme-primary)]"
                : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
            )}
          >
            <Trophy size={16} />
            Papan Peringkat
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-5 py-2 rounded-lg text-[13px] font-bold transition-all duration-200 flex items-center gap-2",
              activeTab === 'settings'
                ? "bg-[var(--theme-primary-light)] text-[var(--theme-primary)]"
                : "text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
            )}
          >
            <SettingsIcon size={16} />
            Aturan Poin
          </button>
        </div>

        {activeTab === 'leaderboard' ? (
          <>
            {/* ── Podium Top 3 Section ─────────────────────────────────── */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-48 bg-white border border-neutral-200 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : top3.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">

                {/* 2nd Place (Left) */}
                {top3[1] && (
                  <Card className="border-slate-200 shadow-xl shadow-slate-200/40 rounded-3xl bg-white overflow-hidden p-6 md:p-8 text-center order-2 md:order-1 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className="absolute top-4 left-4 size-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-base">2</div>
                    <div className="w-20 h-20 rounded-full bg-slate-50 border-4 border-slate-200 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      <Trophy size={40} className="text-slate-400" />
                    </div>
                    <h3 className="font-bold text-[var(--theme-text)] text-lg leading-tight truncate">{top3[1].singkatan || top3[1].nama}</h3>
                    <p className="text-xs text-[var(--theme-text-muted)] font-medium mt-1.5 truncate max-w-[200px] mx-auto">{top3[1].nama}</p>
                    <div className="mt-6 inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200/50 px-4 py-2 rounded-xl group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      <span className="text-lg font-bold text-[var(--theme-text)] group-hover:text-primary">{top3[1].poin}</span>
                      <span className="text-[11px] font-semibold text-[var(--theme-text-muted)]">Pts</span>
                    </div>
                  </Card>
                )}

                {/* 1st Place (Center / Taller) */}
                {top3[0] && (
                  <Card className="border-amber-200 shadow-2xl shadow-amber-500/30 rounded-3xl bg-gradient-to-b from-amber-50/80 via-white to-white overflow-hidden p-8 md:p-10 text-center order-1 md:order-2 relative group hover:-translate-y-3 transition-all duration-300 z-10 md:-mt-8">
                    <div className="absolute top-4 left-4 size-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center font-bold text-amber-600 text-lg shadow-sm">1</div>
                    <div className="absolute -top-6 -right-6 text-amber-300 pointer-events-none opacity-20 group-hover:rotate-12 transition-transform duration-700">
                      <Stars size={120} />
                    </div>
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 border-4 border-amber-300 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-xl shadow-amber-200/50 relative">
                      <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-amber-400"></div>
                      <Trophy size={54} className="text-amber-500 relative z-10 drop-shadow-md" />
                    </div>
                    <h3 className="font-bold text-[var(--theme-text)] text-2xl leading-tight truncate">{top3[0].singkatan || top3[0].nama}</h3>
                    <p className="text-xs text-amber-600 font-medium mt-1.5 truncate max-w-[240px] mx-auto">{top3[0].nama}</p>
                    <div className="mt-8 inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 shadow-lg shadow-amber-500/30 px-6 py-3 rounded-2xl text-white group-hover:shadow-amber-500/50 transition-shadow">
                      <span className="text-2xl font-bold">{top3[0].poin}</span>
                      <span className="text-xs font-semibold text-amber-100">Pts</span>
                    </div>
                  </Card>
                )}

                {/* 3rd Place (Right) */}
                {top3[2] && (
                  <Card className="border-orange-200/50 shadow-xl shadow-orange-500/10 rounded-3xl bg-white overflow-hidden p-6 md:p-8 text-center order-3 relative group hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                    <div className="absolute top-4 left-4 size-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center font-bold text-orange-600/80 text-base">3</div>
                    <div className="w-20 h-20 rounded-full bg-orange-50/50 border-4 border-orange-200 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      <Trophy size={40} className="text-orange-400" />
                    </div>
                    <h3 className="font-bold text-[var(--theme-text)] text-lg leading-tight truncate">{top3[2].singkatan || top3[2].nama}</h3>
                    <p className="text-xs text-[var(--theme-text-muted)] font-medium mt-1.5 truncate max-w-[200px] mx-auto">{top3[2].nama}</p>
                    <div className="mt-6 inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl group-hover:bg-orange-100 transition-colors">
                      <span className="text-lg font-bold text-[var(--theme-text)]">{top3[2].poin}</span>
                      <span className="text-[11px] font-semibold text-orange-500">Pts</span>
                    </div>
                  </Card>
                )}

              </div>
            ) : null}

            {/* ── Leaderboard Table & Logs Bento Grid ──────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Rankings Table */}
              <div className="lg:col-span-2">
                <div className="glass-card shadow-sm rounded-xl overflow-hidden border-slate-100/60 h-full flex flex-col">
                  <div className="p-5 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)] flex items-center justify-between gap-4">
                    <h2 className="text-base font-bold text-[var(--theme-text)] font-headline">Peringkat Lengkap</h2>
                    <Badge className="bg-primary/5 text-primary border-primary/10 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {leaderboard.length} Unit
                    </Badge>
                  </div>

                  <div className="p-0 border-none shadow-none bg-transparent">
                    <DataTable
                      title="Peringkat Ormawa"
                      subtitle="Menampilkan daftar peringkat organisasi mahasiswa."
                      columns={leaderboardColumns}
                      data={leaderboard}
                      loading={loading}
                      searchable={true}
                      searchPlaceholder="Cari organisasi..."
                      pagination={true}
                      pageSize={10}
                      emptyMessage="Belum ada data peringkat."
                    />
                  </div>
                </div>
              </div>

              {/* Point Log Timeline */}
              <div className="lg:col-span-1">
                <Card className="glass-card shadow-sm rounded-xl overflow-hidden border-slate-100/60 flex flex-col h-full">
                  <div className="p-5 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)] flex items-center justify-between gap-4 shrink-0">
                    <h2 className="text-base font-bold text-[var(--theme-text)] font-headline">Log Poin</h2>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 bg-[var(--theme-surface)] rounded-xl animate-pulse border border-[var(--theme-border-muted)]" />
                      ))
                    ) : history.length === 0 ? (
                      <div className="text-center py-20 text-[var(--theme-text-muted)] text-[11px] font-semibold italic">Belum ada riwayat poin.</div>
                    ) : (
                      history.map((hist) => (
                        <div key={hist.id || hist.ID} className="flex gap-3 p-3 rounded-xl border border-[var(--theme-border-muted)] bg-transparent hover:bg-[var(--theme-surface)] transition-colors">
                          <div className="size-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                            <Medal size={16} className="text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-[var(--theme-text)] text-xs truncate">
                                {hist.ormawa ? hist.ormawa.singkatan || hist.ormawa.nama : 'Ormawa'}
                              </p>
                              <span className={cn(
                                "font-bold text-[10px] px-2 py-0.5 rounded-md border",
                                hist.tipe === 'tambah'
                                  ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                  : "bg-rose-50 text-rose-600 border-rose-100"
                              )}>
                                {hist.tipe === 'tambah' ? '+' : '-'}{hist.poin}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--theme-text-muted)] mt-1 font-medium leading-snug line-clamp-2">{hist.deskripsi}</p>
                            <p className="text-[10px] text-[var(--theme-text-subtle)] mt-1.5">
                              {hist.Tanggal ? new Date(hist.Tanggal).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              </div>

            </div>
          </>
        ) : (
          /* ── Point Rules Configurations Tab ─────────────────────── */
          <div className="space-y-6">
            <Card className="glass-card shadow-sm rounded-xl overflow-hidden border-slate-100/60">
              <div className="p-5 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-base font-bold text-[var(--theme-text)] font-headline">Aturan Poin</h2>
                <Button
                  onClick={handleOpenCreateRule}
                  className="bg-primary hover:bg-primary/90 text-white rounded-lg font-bold text-xs h-9 px-4 shadow-sm border-none shrink-0"
                >
                  <PlusIcon size={16} className="mr-1.5" />
                  Tambah Aturan
                </Button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 bg-[var(--theme-surface)] rounded-xl animate-pulse border border-[var(--theme-border-muted)]" />
                  ))
                ) : rules.length === 0 ? (
                  <div className="col-span-2 text-center py-20 text-[var(--theme-text-muted)] text-[11px] font-semibold italic">Belum ada aturan poin terdaftar.</div>
                ) : (
                  rules.map((rule) => (
                    <div key={rule.id || rule.ID} className="flex gap-4 p-4 rounded-xl border border-[var(--theme-border-muted)] bg-transparent hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)] transition-all duration-300 relative group">
                      <div className="size-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform duration-300">
                        <span className="material-symbols-outlined text-slate-500 text-xl">
                          {getRuleIcon(rule.key)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pr-12">
                        <h3 className="text-[13px] font-bold text-[var(--theme-text)] leading-tight truncate">{rule.label}</h3>
                        <p className="text-[11px] font-medium text-[var(--theme-text-muted)] leading-relaxed mt-1 line-clamp-2">{rule.deskripsi}</p>
                        <div className="mt-3 inline-flex items-center gap-1 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-amber-700 shadow-sm">
                          {rule.poin > 0 ? `+${rule.poin}` : rule.poin} Pts
                        </div>
                      </div>
                      <div className="absolute top-4 right-4 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditRule(rule)}
                          className="size-7 bg-white border border-[var(--theme-border)] rounded-md flex items-center justify-center text-[var(--theme-text-muted)] hover:text-primary hover:bg-primary/5 hover:border-primary/20 shadow-sm cursor-pointer transition-colors"
                          title="Edit Aturan"
                        >
                          <EditIcon size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenDeleteRule(rule)}
                          className="size-7 bg-white border border-[var(--theme-border)] rounded-md flex items-center justify-center text-[var(--theme-text-muted)] hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 shadow-sm cursor-pointer transition-colors"
                          title="Hapus Aturan"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

      </div>

      {/* ── Rule Edit/Create Dialog ─────────────────────────────────────── */}
      <DialogModal
        open={isRuleEditOpen}
        onOpenChange={setIsRuleEditOpen}
        title={ruleMode === 'create' ? 'Buat Aturan Poin' : 'Edit Aturan Poin'}
        subtitle={ruleMode === 'create' ? 'Tambahkan aturan pembagian poin baru.' : 'Ubah parameter pembagian poin otomatis untuk aktivitas ini.'}
        icon="stars"
        maxWidth="max-w-md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <ModalCancelButton onClick={() => setIsRuleEditOpen(false)} />
            <ModalSaveButton loading={submittingRule} form="rule-form">
              SIMPAN
            </ModalSaveButton>
          </div>
        }
      >
        <form id="rule-form" onSubmit={handleSaveRule} className="flex flex-col">
          <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar font-inter">
            {ruleMode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="ruleKey" className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Key Unik</Label>
                <Input
                  id="ruleKey"
                  value={ruleForm.key}
                  onChange={(e) => setRuleForm({ ...ruleForm, key: e.target.value })}
                  required
                  className="font-mono font-bold text-xs"
                  placeholder="Contoh: proposal_disetujui"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ruleLabel" className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Nama Aktivitas</Label>
              <Input
                id="ruleLabel"
                value={ruleForm.label}
                onChange={(e) => setRuleForm({ ...ruleForm, label: e.target.value })}
                required
                className="font-bold text-xs"
                placeholder="Contoh: Proposal Disetujui"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rulePoin" className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Poin Diberikan</Label>
              <Input
                id="rulePoin"
                type="number"
                value={ruleForm.poin}
                onChange={(e) => setRuleForm({ ...ruleForm, poin: parseInt(e.target.value) || 0 })}
                required
                className="font-mono font-bold text-xs"
                placeholder="Contoh: 20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ruleDesc" className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Deskripsi Aturan</Label>
              <Textarea
                id="ruleDesc"
                value={ruleForm.deskripsi}
                onChange={(e) => setRuleForm({ ...ruleForm, deskripsi: e.target.value })}
                required
                placeholder="Deskripsikan kapan poin ini akan diperoleh secara otomatis..."
              />
            </div>
          </div>
        </form>
      </DialogModal>

      {/* ── Rule Delete Confirmation Dialog ────────────────────────────── */}
      <DeleteConfirmModal 
        isOpen={isRuleDeleteOpen} 
        onClose={() => setIsRuleDeleteOpen(false)} 
        onConfirm={handleDeleteRule}
        title="Hapus Aturan?" 
        description={`Apakah Anda yakin ingin menghapus aturan poin "${selectedRule?.label}"? Tindakan ini tidak dapat dibatalkan.`} 
        loading={submittingRule} 
      />
    </PageContent>
  )
}
