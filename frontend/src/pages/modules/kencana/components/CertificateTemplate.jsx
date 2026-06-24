import React from 'react';
import { ASSET_URL } from '@/services/api';

const CertificateTemplate = ({ 
  settings, 
  certNumber = '001/KNC/2026', 
  studentName = '<< NAMA MAHASISWA >>', 
  printRef = null 
}) => {
  const predikat = settings?.theme || "Membangun Generasi Emas";

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .paper-bg {
          background-color: #f7f7f5;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
        }

        .font-certificate-title {
          font-family: 'Times New Roman', Times, serif;
          letter-spacing: 0.15em;
        }
        
        .font-certificate-name {
          font-family: 'Georgia', serif;
          letter-spacing: 0.05em;
        }

        .gold-seal {
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.2));
        }
        .gold-seal-bg {
          clip-path: polygon(50% 0%, 61% 11%, 76% 9%, 81% 23%, 95% 28%, 93% 43%, 100% 55%, 90% 67%, 92% 82%, 78% 86%, 70% 99%, 55% 94%, 40% 100%, 30% 88%, 15% 88%, 14% 73%, 0% 66%, 8% 52%, 0% 37%, 13% 28%, 18% 13%, 33% 13%, 40% 0%);
          background: linear-gradient(135deg, #ffd700 0%, #daa520 50%, #b8860b 100%);
        }
        .gold-ribbon {
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%);
          background: linear-gradient(to right, #daa520, #b8860b);
        }
      `}} />

      <div ref={printRef} className="certificate-container paper-bg w-[1122px] h-[793px] relative shadow-2xl overflow-hidden flex flex-col items-center pt-16 pb-12 px-12 border-[8px] border-transparent" style={{boxSizing: 'border-box'}}>
        
        {/* Top Right Reference Number */}
        <div className="absolute top-12 right-16 text-right font-sans text-sm text-gray-600">
          {settings?.reference_number || '02.08.01/FRM-1/KMHS-SPMI'}
        </div>

        {/* BEGIN: Header Logos */}
        <header className="w-full flex justify-between items-center px-8 mb-6">
          {/* Left Logo */}
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 text-orange-500 flex-shrink-0">
                {settings?.left_logo_url ? (
                  <img src={settings.left_logo_url.startsWith('http') || settings.left_logo_url.startsWith('data:') ? settings.left_logo_url : `${ASSET_URL}${settings.left_logo_url}`} alt="Icon" className="w-full h-full object-contain" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L15 8H9L12 2Z"/><path d="M22 12L16 15V9L22 12Z"/><path d="M12 22L9 16H15L12 22Z"/><path d="M2 12L8 9V15L2 12Z"/></svg>
                )}
             </div>
             <div className="text-left font-sans text-gray-800 leading-tight">
               <span className="text-xl">Bhakti Kencana</span><br/>
               <span className="text-xl">University</span>
             </div>
          </div>

          {/* Center Logo */}
          <div className="text-center">
             {settings?.logo_url ? (
                <img src={settings.logo_url.startsWith('http') || settings.logo_url.startsWith('data:') ? settings.logo_url : `${ASSET_URL}${settings.logo_url}`} alt="Logo Kencana" className="max-h-20 object-contain mx-auto" onError={(e) => {e.target.style.display='none'}} />
             ) : (
                <div className="border border-gray-800 px-8 py-2 text-center font-sans">
                  <div className="text-lg">LOGO</div>
                  <div className="text-lg">KENCANA</div>
                </div>
             )}
          </div>

          {/* Right Logo */}
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                {settings?.right_logo_url ? (
                  <img src={settings.right_logo_url.startsWith('http') || settings.right_logo_url.startsWith('data:') ? settings.right_logo_url : `${ASSET_URL}${settings.right_logo_url}`} alt="Icon" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-12 h-8 bg-blue-500 rounded-full flex items-center justify-center text-yellow-400">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  </div>
                )}
             </div>
             <div className="text-left font-sans leading-tight">
               <span className="text-lg font-bold text-yellow-500 tracking-wide">DIKTISAINTEK</span><br/>
               <span className="text-lg font-bold text-blue-500 tracking-wide">BERDAMPAK</span>
             </div>
          </div>
        </header>

        {/* Decorative Inner Border */}
        <div className="absolute inset-8 border border-red-500 border-dashed opacity-50 pointer-events-none"></div>

        {/* BEGIN: Certificate Title & Recipient */}
        <section className="w-full flex flex-col items-center mt-4 mb-8">
          <h1 className="text-6xl font-bold font-certificate-title text-black mb-4">SERTIFIKAT</h1>
          <p className="text-xl font-sans tracking-[0.3em] text-gray-800 mb-8">No. {certNumber}</p>
          <p className="text-2xl font-sans text-gray-800 mb-6">Diberikan Kepada:</p>
          <div className="text-5xl font-certificate-name italic text-black font-semibold border-b-2 border-black px-8 pb-2 text-center">
            {studentName}
          </div>
        </section>

        {/* BEGIN: Body Text */}
        <section className="w-full px-16 text-center mb-12">
          <p className="text-[1.35rem] leading-snug font-sans text-gray-800">
            atas kelulusan dalam rangkaian kegiatan Upacara Penerimaan Mahasiswa Baru<br/>
            Universitas Bhakti Kencana (KENCANA) yang Berlangsung Pada Tanggal {settings?.start_date || '...'} s.d<br/>
            {settings?.end_date || '...'} dengan Tema "{predikat}"
          </p>
        </section>

        {/* BEGIN: Footer Signatures */}
        <footer className="w-full mt-auto flex flex-col items-center font-sans text-gray-800">
          <div className="text-center mb-8">
            <p className="text-xl mb-1">{settings?.issue_date || 'Bandung, ......'}</p>
            <p className="text-xl">Mengetahui,</p>
          </div>

          <div className="w-full grid grid-cols-3 gap-8 px-8">
            <div className="flex flex-col items-center text-center">
              <p className="text-xl h-14">Universitas Bhakti Kencana<br/>Rektor</p>
              <div className="h-24 w-full"></div>
              <p className="text-lg">{settings?.rektor_name || '<<Nama>>'}</p>
              <p className="text-lg">NIK. {settings?.rektor_nik || '..........................'}</p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <p className="text-xl h-14">Universitas Bhakti Kencana<br/>Direktur Layanan Kemahasiswaan</p>
              <div className="h-24 w-full"></div>
              <p className="text-lg">{settings?.direktur_name || '<<Nama>>'}</p>
              <p className="text-lg">NIK. {settings?.direktur_nik || '..........................'}</p>
            </div>

            <div className="flex flex-col items-center text-center">
              <p className="text-xl h-14">Presiden Mahasiswa<br/>BEM KEMA UBK Periode ......</p>
              <div className="h-24 w-full"></div>
              <p className="text-lg">{settings?.presma_name || '<<Nama>>'}</p>
              <p className="text-lg">NPM. {settings?.presma_npm || '..........................'}</p>
            </div>
          </div>
        </footer>

        {/* Right Seal Decoration */}
        <div className="absolute right-24 top-48 gold-seal flex flex-col items-center">
          <div className="w-32 h-32 gold-seal-bg relative flex flex-col items-center justify-center text-white z-10 shadow-inner">
            <span className="text-3xl font-bold mb-1">15</span>
            <span className="text-xl font-bold tracking-widest">SKP</span>
            <span className="text-xs italic mt-1 text-yellow-100">Kencana</span>
          </div>
          <div className="flex justify-between w-20 -mt-6 z-0">
             <div className="w-8 h-12 gold-ribbon transform rotate-12 -ml-2"></div>
             <div className="w-8 h-12 gold-ribbon transform -rotate-12 -mr-2"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CertificateTemplate;
