import { useState, useEffect } from 'react';
import InvoiceUploader from './components/InvoiceUploader';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth'; 

//  PDF extraction ke liye
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

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

      // 2. html-to-image se image generate karo (oklch supported)
      const dataUrl = await toPng(reportElement, {
        quality: 1,
        pixelRatio: 2, // High resolution ke liye
        backgroundColor: '#f9fafb' // Background color matching
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="relative flex justify-center items-center mb-10 min-h-[48px]">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight text-center">
             <span className="text-purple-600">AI FinTech Analyzer</span>
          </h1>
          
          {/* Logout Button */}
          {isAuthenticated && (
            <div className="absolute right-0 flex items-center space-x-4">
              <span className="font-semibold text-gray-700 hidden sm:block">Hi, {userName}</span>
              <button 
                onClick={handleLogout} 
                className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        
        {/* Conditional Rendering */}
        {isAuthenticated ? (
          <>
            {/* NAYA: PDF Download Button - Sirf tabhi dikhega jab screen par koi data ho */}
            <div className="flex justify-end mb-4">
              <button
                onClick={downloadReportPDF}
                disabled={isDownloading}
                className={`font-bold py-2.5 px-6 rounded-xl text-white shadow-md transition-all ${
                  isDownloading 
                    ? 'bg-gray-400 cursor-wait' 
                    : 'bg-green-600 hover:bg-green-700 hover:shadow-green-500/30'
                }`}
              >
                {isDownloading ? '⚡ Generating PDF Report...' : '📥 Download Full PDF Report'}
              </button>
            </div>

            <div id="pdf-report-content" className="p-4 rounded-xl">
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