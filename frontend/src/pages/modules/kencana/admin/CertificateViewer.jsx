import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import CertificateTemplate from '@/components/CertificateTemplate';

const CertificateViewer = () => {
  const { id } = useParams();

  const { data: cert, isLoading } = useQuery({
    queryKey: ['certificate', id],
    queryFn: async () => {
      const res = await api.get(`/app/kencana/certificates/${id}`);
      return res.data?.data || res.data;
    },
    enabled: id !== 'preview'
  });

  const { data: settingsRes, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['certificate-settings-viewer'],
    queryFn: async () => {
      const res = await api.get('/app/kencana/certificate-settings');
      return res.data?.data || res.data;
    }
  });

  const printRef = useRef(null);

  if ((isLoading && id !== 'preview') || isSettingsLoading) return <div className="p-8 text-center">Loading certificate...</div>;
  if (!cert && id !== 'preview') return <div className="p-8 text-center text-red-500">Sertifikat tidak ditemukan</div>;

  const handlePrint = () => {
    window.print();
  };

  const settings = settingsRes || {};
  const isPreview = id === 'preview';

  // Prepare dynamic data
  const certNumber = isPreview ? '001/KNC/2026' : (cert?.certificate_number || 'KNC-.....');
  const studentName = isPreview ? '<< NAMA MAHASISWA >>' : (cert?.student?.nama?.toUpperCase() || 'NAMA MAHASISWA');
  const predikat = settings.theme || "Membangun Generasi Emas";

  return (
    <div className="min-h-screen bg-gray-200 py-8 flex flex-col items-center">
      <div className="mb-4 flex gap-4 no-print">
        <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded shadow font-bold hover:bg-blue-700">
          Cetak PDF / Print
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden; }
          .certificate-container, .certificate-container * { visibility: visible; }
          .certificate-container {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page { size: A4 landscape; margin: 0; }
          .no-print { display: none !important; }
        }
      `}} />

      <CertificateTemplate 
        settings={settings}
        certNumber={certNumber}
        studentName={studentName}
        printRef={printRef}
      />
    </div>
  );
};

export default CertificateViewer;
