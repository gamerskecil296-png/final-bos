import React from 'react';
import { useFakultasScoresQuery } from '@/queries/useKencanaFakultasQuery';
import useAuthStore from '@/store/useAuthStore';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { UserInfoCell, ScoreCell, StatusBadgeCell } from '@/components/ui/TableCells';

const Scores = () => {
  const user = useAuthStore(state => state.user);
  const fakultasId = user?.fakultas_id;
  const { data: scores, isLoading } = useFakultasScoresQuery({ fakultas_id: fakultasId });

  const columns = [
    {
      key: 'student',
      label: 'Mahasiswa',
      render: (v, s) => <UserInfoCell name={s.student?.nama} subtitle={s.student?.nim} avatarUrl={s.student?.foto_url || s.student?.foto} />
    },
    {
      key: 'cognitive_score',
      label: 'Cognitive (25%)',
      render: (v, s) => <ScoreCell value={s.cognitive_score?.toFixed(1)} />
    },
    {
      key: 'psychomotor_score',
      label: 'Psychomotor (35%)',
      render: (v, s) => <ScoreCell value={s.psychomotor_score?.toFixed(1)} />
    },
    {
      key: 'affective_score',
      label: 'Affective (40%)',
      render: (v, s) => <ScoreCell value={s.affective_score?.toFixed(1)} />
    },
    {
      key: 'final_score',
      label: 'Nilai Akhir',
      render: (v, s) => <ScoreCell value={s.final_score?.toFixed(1)} highlight={true} />
    },
    {
      key: 'is_passed',
      label: 'Status',
      render: (v, s) => (
        <StatusBadgeCell 
          status={s.is_passed ? 'success' : 'error'} 
          label={s.is_passed ? 'Lulus' : 'Belum Lulus'} 
        />
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DashboardHero
        title="Rekap"
        highlightedTitle="Nilai"
        subtitle="Evaluasi dan nilai akhir seluruh peserta Kencana di tingkat fakultas."
        icon="award_star"
        badges={[
          { label: 'Kencana Fakultas', active: false },
          { label: 'Penilaian Terpadu', active: true }
        ]}
      />

      <div>
          <DataTable
            columns={columns}
            data={scores || []}
            loading={isLoading}
            searchPlaceholder="Cari nama mahasiswa..."
            title="Evaluasi Peserta"
            itemLabel="data nilai"
          />
      </div>
    </div>
  );
};

export default Scores;
