"use client"

import React, { useState, useEffect } from 'react'
import { useSuperAdminOrmawa } from '@/contexts/SuperAdminOrmawaContext'
import useAuthStore from '@/store/useAuthStore'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import { PageContent, PageCard, PageCardHeader } from '@/components/ui/page'
import { DashboardHero, DashboardStatCard, DashboardStatGrid } from '@/components/ui/dashboard'

const API = `${API_BASE_URL}/ormawa`
const formatRp = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, notation: 'compact' }).format(n || 0)

const STATUS_PROPOSAL = { 
  diajukan: 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border border-[var(--theme-info)]/20', 
  disetujui_dosen: 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/20', 
  disetujui_univ: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border border-[var(--theme-success)]/20', 
  revisi: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border border-[var(--theme-warning)]/20', 
  ditolak: 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border border-[var(--theme-error)]/20' 
}

export default function SuperAdminOrmawaDashboard() {
  let selectedOrmawaId, selectedOrmawa
  
  // Safe context usage
  try {
    const context = useSuperAdminOrmawa()
    selectedOrmawaId = context.selectedOrmawaId
    selectedOrmawa = context.selectedOrmawa
  } catch (error) {
    console.error('SuperAdminOrmawaDashboard: Context not available')
    // Fallback to auth store
    const user = useAuthStore.getState()?.user
    selectedOrmawaId = user?.ormawa_id || user?.OrmawaID || null
    selectedOrmawa = null
  }
  
  const [isLoading, setIsLoading] = useState(false)
  const [stats, setStats] = useState({ totalProposals: 0, totalMembers: 0, totalKas: 0, totalEvents: 0 })
  const [proposals, setProposals] = useState([])
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [identity, setIdentity] = useState({ Nama: 'Portal Ormawa' })
  const [gamifikasi, setGamifikasi] = useState({ poin: 0, peringkat: 0, total_ormawa: 0, riwayat: [] })
  
  const navigate = useNavigate()

  // Load data whenever selectedOrmawaId changes
  useEffect(() => {
    if (!selectedOrmawaId) return

    const load = async () => {
      setIsLoading(true)
      try {
        const [settingsJson, statsJson, proposalJson, memberJson, eventJson, gamJson] = await Promise.all([
          fetchWithAuth(`${API}/settings/${selectedOrmawaId}`),
          fetchWithAuth(`${API}/stats?ormawaId=${selectedOrmawaId}`),
          fetchWithAuth(`${API}/proposals?ormawaId=${selectedOrmawaId}`),
          fetchWithAuth(`${API}/members?ormawaId=${selectedOrmawaId}`),
          fetchWithAuth(`${API}/events?ormawaId=${selectedOrmawaId}`),
          fetchWithAuth(`${API}/gamifikasi?ormawaId=${selectedOrmawaId}`)
        ])
        if (settingsJson.status === 'success') setIdentity(settingsJson.data || { Nama: 'Portal Ormawa' })
        if (statsJson.status === 'success') setStats(statsJson.data || {})
        if (proposalJson.status === 'success') setProposals((proposalJson.data || []).slice(0, 5))
        if (memberJson.status === 'success') setMembers((memberJson.data || []).slice(0, 5))
        if (eventJson.status === 'success') setEvents((eventJson.data || []).slice(0, 4))
        if (gamJson.status === 'success') setGamifikasi(gamJson.data || { poin: 0, peringkat: 0, riwayat: [] })
      } catch {} finally { setIsLoading(false) }
    }
    load()
  }, [selectedOrmawaId])

  const statCards = [
    { label: 'Total Proposal', value: stats.totalProposals || proposals.length, icon: 'description', colorClass: 'text-primary', bgClass: 'bg-primary/10 border-primary/20 border', accentGradient: 'from-primary/10', route: '/app/dashboard/ormawa-proposal' },
    { label: 'Total Anggota', value: stats.totalMembers || members.length, icon: 'group', colorClass: 'text-secondary', bgClass: 'bg-secondary/10 border-secondary/20 border', accentGradient: 'from-secondary/10', route: '/app/dashboard/ormawa-anggota' },
    { label: 'PAGU', value: formatRp(stats.totalKas), icon: 'attach_money', colorClass: 'text-success', bgClass: 'bg-success/10 border-success/20 border', accentGradient: 'from-success/10', route: '/app/dashboard/ormawa-keuangan' },
    { label: 'Kegiatan Aktif', value: stats.totalEvents || events.length, icon: 'calendar_today', colorClass: 'text-warning', bgClass: 'bg-warning/10 border-warning/20 border', accentGradient: 'from-warning/10', route: '/app/dashboard/ormawa-jadwal' },
  ]

  return (
    <PageContent>
      {/* Page Header dengan Dropdown */}
      <DashboardHero 
        title="Dashboard"
        highlightedTitle={selectedOrmawa?.Nama || selectedOrmawa?.Singkatan || 'Ormawa'}
        subtitle="Portal manajemen utama organisasi mahasiswa. Pantau agenda, kepatuhan LPJ, dan pengajuan dana."
        icon="corporate_fare"
        badges={[
          { label: 'Super Admin Portal', active: false },
          { label: selectedOrmawa ? `ID: ${selectedOrmawaId}` : 'Sistem Aktif', active: true }
        ]}
      />

      {/* Content - hanya tampil kalau sudah pilih ormawa */}
      {!selectedOrmawaId ? (
        <div className="text-center py-20 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-sm mt-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--theme-bg)] mb-4">
            <span className="material-symbols-outlined text-[var(--theme-text-subtle)]" style={{ fontSize: '40px' }}>
              groups
            </span>
          </div>
          <h3 className="text-lg font-bold text-[var(--theme-text)] mb-2">Pilih Organisasi</h3>
          <p className="text-sm text-[var(--theme-text-subtle)]">
            Gunakan dropdown di atas untuk memilih organisasi yang ingin dilihat
          </p>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <DashboardStatGrid>
            {statCards.map((card, i) => (
              <DashboardStatCard key={i} {...card} loading={isLoading} />
            ))}
          </DashboardStatGrid>

          {/* Proposals & Events Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Proposal Terbaru */}
            <PageCard>
              <PageCardHeader 
                title="Proposal Terbaru" 
                description="Status pengajuan proposal" 
                icon="description"
              />
              <div className="divide-y divide-[var(--theme-border-muted)] max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-[var(--theme-primary)]">sync</span></div>
                ) : proposals.length === 0 ? (
                  <div className="p-8 text-center"><p className="text-xs text-[var(--theme-text-subtle)]">Belum ada proposal</p></div>
                ) : proposals.map((p) => (
                  <div key={p.id || p.ID} className="p-4 flex items-center gap-4 hover:bg-[var(--theme-bg)] transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate" style={{ color: 'var(--theme-text)' }}>{p.Judul}</p>
                      <p className="text-[10px] text-[var(--theme-text-subtle)] mt-0.5">PROP-{p.id || p.ID}</p>
                    </div>
                    <Badge className={cn('text-[9px] px-2.5 py-1 rounded-full font-semibold shadow-none', STATUS_PROPOSAL[p.Status] || 'bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-subtle)]')}>
                      {p.Status || 'draft'}
                    </Badge>
                  </div>
                ))}
              </div>
            </PageCard>

            {/* Agenda Kegiatan */}
            <PageCard>
              <PageCardHeader 
                title="Agenda Kegiatan" 
                description="Jadwal acara mendatang" 
                icon="calendar_month"
              />
              <div className="divide-y divide-[var(--theme-border-muted)] max-h-80 overflow-y-auto">
                {isLoading ? (
                  <div className="p-8 text-center"><span className="material-symbols-outlined animate-spin text-[var(--theme-primary)]">sync</span></div>
                ) : events.length === 0 ? (
                  <div className="p-8 text-center"><p className="text-xs text-[var(--theme-text-subtle)]">Belum ada kegiatan</p></div>
                ) : events.map((ev) => {
                  const d = ev.TanggalMulai ? new Date(ev.TanggalMulai) : null
                  return (
                    <div key={ev.id || ev.ID} className="p-4 flex items-center gap-4 hover:bg-[var(--theme-bg)] transition-colors">
                      {d && (
                        <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)] flex flex-col items-center justify-center border border-[var(--theme-primary)]/20">
                          <span className="text-[11px] font-black text-[var(--theme-primary)]">{d.getDate()}</span>
                          <span className="text-[8px] font-bold text-[var(--theme-primary)]/75">{d.toLocaleDateString('id-ID', { month: 'short' })}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: 'var(--theme-text)' }}>{ev.Judul}</p>
                        <p className="text-[10px] text-[var(--theme-text-subtle)] truncate">{ev.Lokasi || 'TBA'}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </PageCard>
          </div>
        </>
      )}
    </PageContent>
  )
}
