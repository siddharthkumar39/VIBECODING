import { useState, useEffect } from 'react';
import InvoiceUploader from './components/InvoiceUploader';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth'; 

// PDF extraction ke liye
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Download, LogOut } from 'lucide-react';

function App() {
  const [currentBatchId, setCurrentBatchId] = useState(null); 
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  
  const [isDownloading, setIsDownloading] = useState(false);

  // Page reload par check karo ki user logged in hai ya nahi
  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');
    const savedBatchId = localStorage.getItem('currentBatchId'); 
    
    if (token && name) {
      setIsAuthenticated(true);
      setUserName(name);
      if (savedBatchId) {
        setCurrentBatchId(savedBatchId); 
      }
    }
  }, []);

  const handleUploadSuccess = (batchId) => {
    setCurrentBatchId(batchId);
    localStorage.setItem('currentBatchId', batchId); 
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserName('');
    setCurrentBatchId(null); 
  };

  // NAYA FUNCTION: Poore report ko single PDF me download karne ke liye
  const downloadReportPDF = async () => {
    const reportElement = document.getElementById('pdf-report-content');
    if (!reportElement) return alert("Bhai, pehle koi data toh screen par aane do!");

    setIsDownloading(true);

    try {
      // 1. Recharts ke animation poore hone ke liye thoda ruko
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. html-to-image se image generate karo 
      // NAYA: Background ab light (#f8fafc) hoga taaki PDF clean aaye
      const dataUrl = await toPng(reportElement, {
        quality: 1,
        pixelRatio: 2, 
        backgroundColor: '#f8fafc' 
      });
      
      // 3. PDF mein image ko dalo
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Pehla page
      pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Agar lamba document hai toh next page me break karo
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`FinTech_Analysis_Report_${Date.now()}.pdf`);

    } catch (error) {
      console.error("Asli PDF error:", error);
      alert(`Bhai exact error ye hai: ${error.message || error}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Soft Bokeh & Natural Glowing Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-purple-300/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-teal-300/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[30%] h-[30%] rounded-full bg-pink-200/30 blur-[100px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="relative flex justify-center items-center mb-12 min-h-[48px] bg-white/60 backdrop-blur-xl py-4 px-8 rounded-3xl border border-white shadow-sm">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight text-center">
             Nexus<span className="text-purple-600 font-light">AI</span> FinTech
          </h1>
          
          {/* Logout Button */}
          {isAuthenticated && (
            <div className="absolute right-4 sm:right-8 flex items-center space-x-4">
              <span className="font-medium text-slate-500 hidden sm:block text-sm">Welcome, <span className="text-slate-800 font-bold">{userName}</span></span>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 bg-white/80 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl font-semibold hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all duration-300 shadow-sm"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Conditional Rendering */}
        {isAuthenticated ? (
          <>
            {/* PDF Download Button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={downloadReportPDF}
                disabled={isDownloading}
                className={`flex items-center gap-2 font-bold py-3 px-6 rounded-2xl text-white shadow-lg transition-all duration-300 ${
                  isDownloading 
                    ? 'bg-slate-300 cursor-wait text-slate-600' 
                    : 'bg-gradient-to-r from-purple-600 to-teal-500 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-95'
                }`}
              >
                {isDownloading ? (
                   <span className="flex items-center gap-2">
                     <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                     Generating...
                   </span>
                ) : (
                  <>
                    <Download size={18} /> Download Full Report
                  </>
                )}
              </button>
            </div>

            {/* Main Content Area */}
            <div id="pdf-report-content" className="p-2 sm:p-4 rounded-3xl bg-transparent">
              <InvoiceUploader onUploadSuccess={handleUploadSuccess} />
              <Dashboard batchId={currentBatchId} />
            </div>
          </>
        ) : (
          <Auth onLoginSuccess={(name) => {
            setIsAuthenticated(true);
            setUserName(name);
            
            const savedBatchId = localStorage.getItem('currentBatchId');
            if (savedBatchId) {
              setCurrentBatchId(savedBatchId);
            }
          }} />
        )}
        
      </div>
    </div>
  );
}

export default App;