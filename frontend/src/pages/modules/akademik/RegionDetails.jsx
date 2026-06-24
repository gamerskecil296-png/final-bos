import React, { useState, useEffect } from 'react'
import { PageContent } from '@/components/ui/page'
import { adminService } from '@/services/api'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Loader2, Search, Map } from 'lucide-react'

const RegionDetails = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const res = await adminService.getStudentStats()
        if (res?.data?.top_kota) {
          setData(res.data.top_kota)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const filteredData = data.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalMahasiswa = data.reduce((acc, curr) => acc + curr.count, 0)

  return (
    <PageContent>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Map size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-slate-800">Detail Asal Wilayah Mahasiswa</h1>
              <p className="text-sm text-slate-500 font-body">Menampilkan persebaran seluruh kota/kabupaten asal pendaftar.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-sm py-1.5 px-3">
              Total Wilayah: {data.length}
            </Badge>
            <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-sm py-1.5 px-3 border-none">
              Total Mahasiswa: {totalMahasiswa}
            </Badge>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input
                placeholder="Cari Kota/Kabupaten..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white border-slate-200"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Memuat data wilayah...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <p>Tidak ada wilayah yang sesuai pencarian.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">No.</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">Kota / Kabupaten</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Jumlah Mahasiswa</th>
                    <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100 text-right">Persentase</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.map((item, idx) => {
                    const percentage = totalMahasiswa > 0 ? ((item.count / totalMahasiswa) * 100).toFixed(2) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-6 text-sm text-slate-500 font-medium">{idx + 1}</td>
                        <td className="py-3 px-6 text-sm text-slate-800 font-semibold">{item.name}</td>
                        <td className="py-3 px-6 text-sm text-blue-600 font-bold text-right">{item.count}</td>
                        <td className="py-3 px-6 text-sm text-slate-500 font-medium text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{percentage}%</span>
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </PageContent>
  )
}

export default RegionDetails
