import React from 'react';
import { ShieldAlert, RefreshCcw, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/student/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6 font-body">
          <div className="max-w-md w-full text-center">
            {/* Illustration Area */}
            <div className="relative mb-8 flex justify-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[120px] md:text-[160px] font-black text-[#ef4444]/10 leading-none select-none font-headline uppercase"
              >
                ERR
              </motion.div>
              
              <div className="absolute inset-0 flex items-center justify-center pt-8">
                <div className="w-24 h-24 bg-white rounded-[40px] shadow-2xl flex items-center justify-center border border-[#ffedd5] relative overflow-hidden ring-4 ring-[#ef4444]/5">
                   <ShieldAlert size={48} className="text-[#ef4444]" strokeWidth={1.5} />
                </div>
              </div>
            </div>

            {/* Text Content */}
            <h1 className="text-3xl font-extrabold text-[#171717] font-headline mb-4">
              Terjadi Kesalahan Aplikasi
            </h1>
            <p className="text-[#737373] text-lg mb-10 font-medium leading-relaxed">
              Maaf, aplikasi mengalami masalah yang tidak terduga. Kamu bisa mencoba memuat ulang halaman atau kembali ke dashboard.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                 onClick={() => window.location.reload()}
                 className="px-8 py-4 bg-primary text-white rounded-3xl font-bold text-sm shadow-xl hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} />
                Muat Ulang
              </button>
              
              <button
                 onClick={this.handleReset}
                 className="px-8 py-4 bg-white text-[#525252] border-2 border-[#e5e5e5] rounded-3xl font-bold text-sm hover:bg-[#f5f5f5] transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={18} />
                Dashboard
              </button>
            </div>

            {/* Debug info (Hidden in production ideally) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-12 text-left bg-neutral-100 p-4 rounded-2xl border border-neutral-200 overflow-x-auto">
                <p className="text-xs font-mono text-red-600 font-bold mb-2">Error Detail:</p>
                <pre className="text-[10px] font-mono text-[#525252]">
                  {this.state.error?.toString()}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
