"use client"

import React, { useState, useEffect } from "react"
import api from "@/lib/axios"
import { adminService } from "@/services/api"
import { toast, Toaster } from "react-hot-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import useAuthStore from "@/store/useAuthStore"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { cn } from "@/lib/utils"
import { PageContent } from "@/components/ui/page/PageContent"
import { DashboardHero } from "@/components/ui/dashboard/DashboardHero"
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { DataTable } from '@/components/ui/DataTable'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Download = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>;
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const HeartPulse = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>monitor_heart</span>;
const Psychology = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>psychology</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const Globe = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>public</span>;



const API = "/app/dashboard"
const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#6366f1", "#ec4899"]

const prodiColumns = [
  { label: 'Program Studi', key: 'nama_prodi', sortable: true, render: (val) => (
      <span className="font-bold text-sm text-[var(--theme-text)]">{val}</span>
    )
  },
  { label: 'Mahasiswa Aktif', key: 'active', sortable: true, render: (val) => (
      <span className="inline-flex items-center gap-1.5 bg-[var(--theme-success-light)] border border-[var(--theme-success)]/10 text-[var(--theme-success)] px-2.5 py-1 rounded-lg text-xs font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-success)]" />
        {val || 0}
      </span>
    )
  },
  { label: 'Lulusan', key: 'graduated', sortable: true, render: (val) => (
      <span className="inline-flex items-center gap-1.5 bg-[var(--theme-info-light)] border border-[var(--theme-info)]/10 text-[var(--theme-info)] px-2.5 py-1 rounded-lg text-xs font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-info)]" />
        {val || 0}
      </span>
    )
  }
];

export default function LaporanFakultasPage() {
  const [data, setData] = useState({ summary: { total: 0, active: 0, graduated: 0, avgIPK: 0, totalPrestasi: 0, totalBeasiswa: 0, totalKonseling: 0 }, perAngkatan: [], perProdi: [], ipkDist: [] })
  const [loading, setLoading] = useState(true)
  const [isMounted, setMounted] = useState(false)
  const [facultyInfo, setFacultyInfo] = useState(null)
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [availablePeriods, setAvailablePeriods] = useState([])

  const fetchData = async () => {
    setLoading(true)
    try {
      const yearToFetch = filterPeriode !== 'all' ? (filterPeriode.length >= 4 ? filterPeriode.substring(0, 4) : filterPeriode) : 'all';
      const res = await api.get(`${API}/reports/summary${yearToFetch !== 'all' ? `?angkatan=${yearToFetch}` : ''}`)
      if (res.data.status === "success") {
        setData(res.data.data || data)
      }
    } catch { 
      toast.error("Gagal memuat data laporan") 
    }
    
    try {
      const periodRes = await adminService.getAllAcademicPeriods()
      if (periodRes && periodRes.status === 'success' && periodRes.data) {
        setAvailablePeriods(periodRes.data)
      } else if (periodRes?.data?.status === 'success' && periodRes?.data?.data) {
        setAvailablePeriods(periodRes.data.data)
      }
    } catch (err) {
      toast.error("Error get periods: " + err.message)
      console.error("Failed to fetch periods", err)
    }

    // Load profile (kop surat) - don't crash the report if this fails
    try {
      const profileRes = await api.get(`${API}/profile`)
      if (profileRes.data && (profileRes.data.success || profileRes.data.status === 'success') && profileRes.data.data?.fakultas) {
        setFacultyInfo(profileRes.data.data.fakultas)
      }
    } catch (e) {
      console.warn("Gagal memuat profil fakultas:", e)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [filterPeriode])

  const getKopImage = (facName) => {
    const name = (facName || "").toLowerCase();
    if (name.includes("farmasi")) return "kop_farmasi.jpg";
    if (name.includes("kesehatan") || name.includes("fikes")) return "kop_ilmu_kesehatan.jpg";
    if (name.includes("keperawatan") || name.includes("fkep")) return "kop_keperawatan.jpg";
    if (name.includes("sosial") || name.includes("social") || name.includes("sosiologi") || name.includes("fis")) return "kop_ilmu_sosial.jpg";
    return "kop_farmasi.jpg";
  };

  const downloadPDF = (title, subtitle, contentHtml, existingWindow = null) => {
    const printWindow = existingWindow || window.open('', '_blank');
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up browser tidak diblokir.");
      return;
    }

    const user = useAuthStore.getState().user;
    const isSuperAdmin = user?.role === 'super_admin';

    const facName = facultyInfo?.Nama || facultyInfo?.nama || "Fakultas Farmasi";
    const facDekan = facultyInfo?.Dekan || facultyInfo?.dekan || "Dekan Bidang Akademik";

    const printSize = isSuperAdmin ? 'A4 landscape' : 'A4 portrait';
    const bgSize = isSuperAdmin ? '297mm 210mm' : '210mm 297mm';
    const kopImage = isSuperAdmin ? 'format_kop_rektorat_landscape.jpg' : getKopImage(facName);
    const kopImageUrl = `${window.location.origin}/images/${kopImage}`;
    const facNameResolved = isSuperAdmin ? 'Universitas Bhakti Kencana' : facName;
    const titleResolved = isSuperAdmin ? 'Rektor Universitas Bhakti Kencana' : `Dekan ${facNameResolved}`;
    const nameResolved = isSuperAdmin ? 'Dr. apt. Entris Sutrisno, MH. Kes.' : facDekan;
    const footerText = isSuperAdmin ? 'Portal SIAKAD Rektorat BKU' : `Portal Akademik ${facNameResolved}`;

    const htmlContent = `<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page {
    size: ${printSize};
    margin: 0;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    line-height: 1.5;
    color: #334155;
    background-image: url('${kopImageUrl}');
    background-size: ${bgSize};
    background-repeat: no-repeat;
    background-position: top center;
    margin: 0;
    padding: 38mm 18mm 20mm 18mm;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    color: #1e293b;
    text-align: center;
    font-size: 14px;
    font-weight: 800;
    margin-top: 0;
    margin-bottom: 3px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  h2 {
    color: #64748b;
    text-align: center;
    font-size: 9px;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 25px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  h3 {
    color: #df9526;
    font-size: 11px;
    font-weight: 700;
    margin-top: 20px;
    margin-bottom: 8px;
    border-left: 3px solid #df9526;
    padding-left: 8px;
    text-transform: uppercase;
  }
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    border: none;
    margin-bottom: 15px;
  }
  .meta-table td {
    border: none;
    padding: 0 8px;
    width: 50%;
  }
  .meta-box {
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border: 1px solid #cbd5e1;
    padding: 12px 14px;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border-left: 4px solid #df9526;
  }
  .meta-title {
    font-size: 8px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 3px;
    letter-spacing: 0.5px;
  }
  .meta-value {
    font-size: 14px;
    font-weight: 800;
    color: #1e293b;
  }
  table.data-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-top: 15px;
    margin-bottom: 25px;
    border-radius: 10px;
    border: 1px solid #94a3b8;
    box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.08);
    background-color: #ffffff;
  }
  table.data-table th {
    background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
    color: #ffffff;
    font-weight: 800;
    text-align: left;
    padding: 12px 14px;
    border-bottom: 3px solid #b45309;
    border-right: 1px solid #fcd34d;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    text-shadow: 0px 1px 2px rgba(0,0,0,0.2);
  }
  table.data-table th:first-child {
    border-top-left-radius: 9px;
  }
  table.data-table th:last-child {
    border-top-right-radius: 9px;
    border-right: none;
  }
  table.data-table td {
    padding: 10px 14px;
    border-bottom: 1px solid #cbd5e1;
    border-right: 1px dashed #e2e8f0;
    font-size: 10px;
    color: #1e293b;
    vertical-align: middle;
  }
  table.data-table td:last-child {
    border-right: none;
  }
  table.data-table tbody tr:nth-child(odd) td {
    background-color: #ffffff;
  }
  table.data-table tbody tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  table.data-table tbody tr:hover td {
    background-color: #f1f5f9;
  }
  table.data-table tbody tr:last-child td {
    border-bottom: none;
  }
  table.data-table tbody tr:last-child td:first-child {
    border-bottom-left-radius: 9px;
  }
  table.data-table tbody tr:last-child td:last-child {
    border-bottom-right-radius: 9px;
  }
  .badge {
    display: inline-block;
    padding: 2px 6px;
    font-size: 8px;
    font-weight: 700;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .badge-success {
    background-color: #dcfce7;
    color: #15803d;
    border: 1px solid #bbf7d0;
  }
  .badge-info {
    background-color: #dbeafe;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
  }
  .badge-warning {
    background-color: #fef9c3;
    color: #a16207;
    border: 1px solid #fef08a;
  }
  .signature-section {
    margin-top: 30px;
    text-align: right;
    font-size: 9px;
    color: #334155;
    float: right;
    width: 250px;
  }
  @media print {
    body {
      background-image: url('${kopImageUrl}') !important;
      background-size: ${bgSize} !important;
      background-repeat: no-repeat !important;
      background-position: top center !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      padding: 38mm 18mm 20mm 18mm !important;
    }
    .no-print {
      display: none;
    }
  }
</style>
</head>
<body>
  <h1>${title}</h1>
  <h2>${subtitle}</h2>

  ${contentHtml}

  <!-- Footer Signature Section -->
  <div style="width: 100%; display: inline-block; margin-top: 15px;">
    <div class="signature-section">
      <p>Dicetak secara otomatis oleh ${footerText}</p>
      <p style="margin-top: 2px;">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</p>
      <br/>
      <p>Mengetahui,</p>
      <p style="font-weight: 700; margin-top: 5px;">${titleResolved}</p>
      <div style="margin-top: 45px; font-weight: 700; text-decoration: underline;">${nameResolved}</div>
    </div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          window.close();
        }, 100);
      }, 300);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const exportProdiPDF = () => {
    if (!data.perProdi || data.perProdi.length === 0) {
      toast.error("Tidak ada data prodi untuk diekspor");
      return;
    }

    let tableRows = "";
    data.perProdi.forEach(p => {
      tableRows += `
        <tr>
          <td style="font-weight: 700;">${p.nama_prodi}</td>
          <td>${p.active || 0} Mahasiswa</td>
          <td>${p.graduated || 0} Lulusan</td>
        </tr>`;
    });

    const contentHtml = `
      <h3>Ringkasan Sebaran Akademik</h3>
      <table class="meta-table">
        <tr>
          <td style="padding-left: 0;">
            <div class="meta-box">
              <div class="meta-title">Total Mahasiswa Terdaftar</div>
              <div class="meta-value">${data.summary.total} Orang</div>
            </div>
          </td>
        </tr>
      </table>

      <h3>Daftar Capaian per Program Studi</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Program Studi</th>
            <th>Mahasiswa Aktif</th>
            <th>Lulusan</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    `;

    downloadPDF(
      "Laporan Rekapitulasi Program Studi",
      "Kondisi Akademik & Capaian Nilai Rata-Rata Mahasiswa",
      contentHtml
    );
    toast.success("Berhasil mencetak Laporan Prodi!");
  };

  const downloadPrestasiPDF = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up browser tidak diblokir.");
      return;
    }
    printWindow.document.write("<html><body><p style='font-family:sans-serif; text-align:center; margin-top:20%; color:#64748b;'>Menyiapkan dokumen Laporan Prestasi...</p></body></html>");

    try {
      toast.loading("Menyiapkan dokumen Laporan Prestasi...", { id: "prestasi-dl" });
      const res = await api.get(`${API}/prestasi`);
      if (res.data.status === "success") {
        const list = (res.data.data || []).map(a => {
          const m = a.mahasiswa || a.Mahasiswa || {};
          return {
            ...a,
            Mahasiswa: { ...m, Nama: m.nama || m.Nama, NIM: m.nim || m.NIM },
            NamaKegiatan: a.nama_kegiatan || a.NamaKegiatan,
            Kategori: a.kategori || a.Kategori,
            Tingkat: a.tingkat || a.Tingkat,
            Peringkat: a.peringkat || a.Peringkat,
            Status: a.status || a.Status,
            Poin: a.poin !== undefined ? a.poin : a.Poin,
          };
        });
        if (list.length === 0) {
          printWindow.close();
          toast.dismiss("prestasi-dl");
          toast.error("Belum ada data prestasi untuk diekspor");
          return;
        }

        let tableRows = "";
        list.forEach((item, idx) => {
          const statusLabel = item.Status === "verified" || item.Status === "terverifikasi" || item.Status === "disetujui"
            ? '<span class="badge badge-success">Terverifikasi</span>'
            : (item.Status || "").toLowerCase().includes("tolak") || item.Status === "rejected"
              ? '<span class="badge badge-warning">Ditolak</span>'
              : '<span class="badge badge-info">Menunggu</span>';

          tableRows += `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight: 700;">${item.Mahasiswa?.Nama || "—"}<br/><span style="font-size: 8px; color: #64748b;">NIM: ${item.Mahasiswa?.NIM || "—"}</span></td>
              <td>${item.NamaKegiatan || "—"}<br/><span style="font-size: 8px; color: #1d4ed8; font-weight: 700;">${item.Kategori || "Umum"}</span></td>
              <td>${item.Tingkat || "—"}</td>
              <td>${item.Peringkat || "—"}</td>
              <td style="font-weight: 700;">${item.Poin || 0} Poin</td>
              <td>${statusLabel}</td>
            </tr>`;
        });

        const contentHtml = `
          <h3>Ringkasan Capaian Prestasi Mahasiswa</h3>
          <table class="meta-table">
            <tr>
              <td style="padding-left: 0;">
                <div class="meta-box">
                  <div class="meta-title">Total Pengajuan Prestasi</div>
                  <div class="meta-value">${list.length} Capaian</div>
                </div>
              </td>
              <td style="padding-right: 0;">
                <div class="meta-box">
                  <div class="meta-title">Tervalidasi Fakultas</div>
                  <div class="meta-value">${list.filter(a => ["verified", "terverifikasi", "disetujui"].includes((a.Status || "").toLowerCase())).length} Pengajuan</div>
                </div>
              </td>
            </tr>
          </table>

          <h3>Daftar Detail Prestasi & Penghargaan</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 25%;">Mahasiswa</th>
                <th style="width: 30%;">Prestasi / Penghargaan</th>
                <th style="width: 10%;">Tingkat</th>
                <th style="width: 10%;">Peringkat</th>
                <th style="width: 10%;">Poin</th>
                <th style="width: 10%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `;

        downloadPDF(
          "Laporan Prestasi & Capaian Mahasiswa",
          "Dataset Rekapitulasi Kompetisi Dan Penghargaan Mahasiswa Fakultas",
          contentHtml,
          printWindow
        );
        toast.dismiss("prestasi-dl");
        toast.success("Berhasil mencetak Laporan Prestasi!");
      } else {
        printWindow.close();
        toast.dismiss("prestasi-dl");
        toast.error("Gagal memuat data prestasi");
      }
    } catch (err) {
      printWindow.close();
      toast.dismiss("prestasi-dl");
      toast.error("Terjadi kesalahan sistem saat memproses PDF");
    }
  };

  const downloadBeasiswaPDF = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up browser tidak diblokir.");
      return;
    }
    printWindow.document.write("<html><body><p style='font-family:sans-serif; text-align:center; margin-top:20%; color:#64748b;'>Menyiapkan dokumen Laporan Beasiswa...</p></body></html>");

    try {
      toast.loading("Menyiapkan dokumen Laporan Beasiswa...", { id: "beasiswa-dl" });
      const res = await api.get(`${API}/scholarships`);
      if (res.data.status === "success") {
        const list = (res.data.data || []).map(b => ({
          ...b,
          Nama: b.nama || b.Nama,
          Penyelenggara: b.penyelenggara || b.Penyelenggara,
          Kuota: b.kuota !== undefined ? b.kuota : b.Kuota,
          Deskripsi: b.deskripsi || b.Deskripsi,
          IsActive: b.is_active !== undefined ? b.is_active : b.IsActive,
        }));
        if (list.length === 0) {
          printWindow.close();
          toast.dismiss("beasiswa-dl");
          toast.error("Belum ada data beasiswa untuk diekspor");
          return;
        }

        let tableRows = "";
        list.forEach((item, idx) => {
          tableRows += `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight: 700; color: #00236F;">${item.Nama || "—"}</td>
              <td>${item.Penyelenggara || "—"}</td>
              <td style="font-weight: 700;">${item.Kuota || 0} Penerima</td>
              <td>${item.Deskripsi || "—"}</td>
              <td>${item.IsActive ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-info">Non-Aktif</span>'}</td>
            </tr>`;
        });

        const contentHtml = `
          <h3>Daftar Program Beasiswa Internal & Eksternal</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 25%;">Nama Beasiswa</th>
                <th style="width: 20%;">Penyelenggara</th>
                <th style="width: 15%;">Kuota Penerima</th>
                <th style="width: 25%;">Deskripsi Program</th>
                <th style="width: 10%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `;

        downloadPDF(
          "Laporan Program Beasiswa Mahasiswa",
          "Dataset Penyelenggaraan Bantuan Finansial Dan Beasiswa Internal",
          contentHtml,
          printWindow
        );
        toast.dismiss("beasiswa-dl");
        toast.success("Berhasil mencetak Laporan Beasiswa!");
      } else {
        printWindow.close();
        toast.dismiss("beasiswa-dl");
        toast.error("Gagal memuat data beasiswa");
      }
    } catch (err) {
      printWindow.close();
      toast.dismiss("beasiswa-dl");
      toast.error("Terjadi kesalahan sistem saat memproses PDF");
    }
  };

  const downloadKonselingPDF = async () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up browser tidak diblokir.");
      return;
    }
    printWindow.document.write("<html><body><p style='font-family:sans-serif; text-align:center; margin-top:20%; color:#64748b;'>Menyiapkan dokumen Laporan Konseling...</p></body></html>");

    try {
      toast.loading("Menyiapkan dokumen Laporan Konseling...", { id: "konseling-dl" });
      const res = await api.get(`${API}/counseling`);
      if (res.data.status === "success") {
        const list = (res.data.data || []).map(item => {
          const m = item.mahasiswa || item.Mahasiswa || {};
          const p = item.psikolog || item.Psikolog || {};
          return {
            ...item,
            Mahasiswa: { ...m, Nama: m.nama || m.Nama, NIM: m.nim || m.NIM },
            Psikolog: { ...p, Nama: p.nama || p.Nama },
            Tanggal: item.tanggal || item.Tanggal,
            Keluhan: item.keluhan || item.Keluhan,
            Status: item.status || item.Status,
          };
        });
        if (list.length === 0) {
          printWindow.close();
          toast.dismiss("konseling-dl");
          toast.error("Belum ada sesi konseling untuk diekspor");
          return;
        }

        let tableRows = "";
        list.forEach((item, idx) => {
          tableRows += `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight: 700;">${item.Mahasiswa?.Nama || "—"}<br/><span style="font-size: 8px; color: #64748b;">NIM: ${item.Mahasiswa?.NIM || "—"}</span></td>
              <td>${item.Psikolog?.Nama || "—"}</td>
              <td>${item.Tanggal ? new Date(item.Tanggal).toLocaleDateString('id-ID') : "—"}</td>
              <td>${item.Keluhan || "—"}</td>
              <td style="font-weight: 700; color: #00236F;">${item.Status || "—"}</td>
            </tr>`;
        });

        const contentHtml = `
          <h3>Rekapitulasi Layanan Sesi Konseling &amp; Bimbingan</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 25%;">Mahasiswa</th>
                <th style="width: 20%;">Psikolog / Konselor</th>
                <th style="width: 15%;">Tanggal</th>
                <th style="width: 25%;">Masalah / Keluhan</th>
                <th style="width: 10%;">Status Sesi</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `;

        downloadPDF(
          "Laporan Layanan Konseling & Pendampingan",
          "Dataset Sesi Bimbingan, Konseling, Dan Layanan Psikologis Mahasiswa Fakultas",
          contentHtml,
          printWindow
        );
        toast.dismiss("konseling-dl");
        toast.success("Berhasil mencetak Laporan Konseling!");
      } else {
        printWindow.close();
        toast.dismiss("konseling-dl");
        toast.error("Gagal memuat data konseling");
      }
    } catch (err) {
      printWindow.close();
      toast.dismiss("konseling-dl");
      toast.error("Terjadi kesalahan sistem saat memproses PDF");
    }
  };

  useEffect(() => { setMounted(true) }, [])

  const periodeOptions = availablePeriods;

  const prodiWithColors = (data.perProdi || []).map((item, i) => ({ ...item, nama_prodi: item.nama_prodi || "Unknown", value: item.value || 0, color: CHART_COLORS[i % CHART_COLORS.length] }))

  const prodiColumns = [
    {
      key: "nama_prodi",
      label: "Program Studi",
      render: (val) => <span className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px]">{val}</span>
    },
    {
      key: "active",
      label: "Mahasiswa Aktif",
      render: (val) => <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{val || 0}</span>
    },
    {
      key: "graduated",
      label: "Lulusan",
      render: (val) => <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{val || 0}</span>
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Laporan"
        highlightedTitle="Fakultas"
        subtitle="Dashboard analitik performa akademik dan layanan kemahasiswaan."
        icon="analytics"
        badges={[
          { label: 'Monitoring Strategis', active: false },
          { label: `${data.summary.total} Mahasiswa Terdaftar`, active: true },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-[160px] h-10 border border-[var(--theme-border)] bg-[var(--theme-surface)] backdrop-blur-sm rounded-xl text-xs font-semibold text-[var(--theme-text-muted)] focus:ring-0">
                <SelectValue placeholder="Semua Tahun" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-[var(--theme-surface)]">
                <SelectItem value="all" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">Semua Periode</SelectItem>
                {periodeOptions.length > 0 ? periodeOptions.map(p => (
                  <SelectItem key={p.id || p.ID} value={String(p.sevima_id || p.id || p.ID)} className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">
                    {p.AcademicYear} · {p.Semester} {p.IsActive ? '⭐' : ''}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>
            <button onClick={exportProdiPDF} className="h-10 px-4 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 text-xs font-bold uppercase tracking-wider hover:bg-[var(--theme-primary)] hover:text-white shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-2">
              <Download size={13} className="text-current" /> Ekspor PDF
            </button>
            <button onClick={fetchData} disabled={loading} className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none">
              {loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>sync</span> : <RefreshCw size={13} className="text-current" />} Refresh Data
            </button>
          </div>
        }
      />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <PrimaryStatsCard
            title="Total Mahasiswa"
            value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : data.summary.total}
            icon={Users}
            colorTheme="info"
            badgeText="Terdaftar aktif"
          />
          <PrimaryStatsCard
            title="Capaian Prestasi"
            value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : data.summary.totalPrestasi}
            icon={Award}
            colorTheme="success"
            badgeText="Kompetisi & penghargaan"
          />
          <PrimaryStatsCard
            title="Penerima Beasiswa"
            value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : data.summary.totalBeasiswa}
            icon={Globe}
            colorTheme="primary"
            badgeText="Bantuan finansial"
          />
          <PrimaryStatsCard
            title="Layanan Konseling"
            value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : (data.summary.totalKonseling || 0)}
            icon={Psychology}
            colorTheme="warning"
            badgeText="Sesi terdaftar"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-4 shrink-0">
                <div className="w-12 h-12 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">bar_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Demografi</span>
                  <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Status per Angkatan</h3>
                </div>
              </div>
            <div className="flex-1 w-full h-60">
              {isMounted && (
                <ResponsiveContainer width="99%" height="100%" debounce={50}>
                  <BarChart data={data.perAngkatan} barGap={4} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-muted)" />
                    <XAxis dataKey="angkatan" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--theme-text-muted)' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'var(--theme-text-muted)' }} />
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} cursor={{ fill: 'var(--theme-bg, #f8fafc)', opacity: 0.8 }} />
                    <Bar dataKey="aktif" name="Aktif" fill="var(--theme-primary)" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="lulus" name="Lulus" fill="var(--theme-success)" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            </div>
          </div>

          <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-4 shrink-0">
                <div className="w-12 h-12 bg-[var(--theme-success-light)] rounded-xl flex justify-center items-center text-[var(--theme-success)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">pie_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Analisis Demografi</span>
                  <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Distribusi Prodi</h3>
                </div>
              </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 flex-1 min-h-0">
              <div className="h-48 w-48 shrink-0">
                {isMounted && (
                  <ResponsiveContainer width="100%" height="100%" debounce={50}>
                    <PieChart>
                      <Pie data={prodiWithColors} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                        {prodiWithColors.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex flex-col gap-2 w-full sm:w-auto sm:min-w-[160px] max-h-52 overflow-y-auto pr-2 pb-1">
                {prodiWithColors.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--theme-surface-hover)] border border-[var(--theme-border-muted)] shrink-0">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase truncate max-w-[140px] sm:max-w-[110px] leading-none" title={p.nama_prodi}>{p.nama_prodi}</p>
                      <p className="text-[10px] text-[var(--theme-text)] font-extrabold leading-none mt-1">{p.value} Mahasiswa</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Laporan Prestasi', icon: Award, theme: 'success', stat: `${data.summary.totalPrestasi} Capaian`, desc: 'Dataset kompetisi & penghargaan mahasiswa.', handler: downloadPrestasiPDF },
            { label: 'Laporan Beasiswa', icon: Globe, theme: 'info', stat: `${data.summary.totalBeasiswa} Penerima`, desc: 'Transkrip penerima bantuan finansial.', handler: downloadBeasiswaPDF },
            { label: 'Laporan Konseling', icon: Psychology, theme: 'warning', stat: `${data.summary.totalKonseling || 0} Sesi`, desc: 'Monitoring layanan bimbingan psikologis.', handler: downloadKonselingPDF },
          ].map((item, i) => (
            <div key={i} className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-[var(--theme-${item.theme})] bg-[var(--theme-${item.theme}-light)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300`}>
                    <item.icon size={24} />
                  </div>
                  <span className="text-[9px] font-bold text-[var(--theme-text-muted)] bg-[var(--theme-surface-hover)] border border-[var(--theme-border-muted)] px-2.5 py-1 rounded-lg uppercase tracking-wider">Laporan</span>
                </div>
                <h4 className="text-base font-bold text-[var(--theme-text)] leading-tight mb-1">{item.label}</h4>
                <p className="text-xs text-[var(--theme-text-subtle)] font-medium leading-relaxed mb-5">{item.desc}</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-[var(--theme-border-muted)] mt-auto">
                <div>
                  <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-0.5">Master Data</p>
                  <p className="text-sm font-extrabold text-[var(--theme-text)] tabular-nums">{item.stat}</p>
                </div>
                <button onClick={item.handler} className="w-10 h-10 rounded-xl bg-[var(--theme-surface-hover)] text-[var(--theme-text)] border border-[var(--theme-border)] flex items-center justify-center hover:bg-[var(--theme-primary)] hover:text-white hover:border-[var(--theme-primary)] transition-all active:scale-95 group-hover:shadow-md">
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Per-Prodi Table */}
        <div className="mb-8">
          <DataTable
            title="Rekap Per Program Studi"
            subtitle="Data akademik terbaru tiap prodi"
            data={data.perProdi || []}
            columns={prodiColumns}
            searchable={false}
            loading={loading}
            pagination={false}
          />
        </div>
    </PageContent>
  )
}
