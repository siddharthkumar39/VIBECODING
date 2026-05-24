// InvoiceUploader.jsx
import { useState, useEffect } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://aiinvoicebackend.onrender.com";

const InvoiceUploader = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [batchMessage, setBatchMessage] = useState("");

  // Component load hone par purana data check karo
  useEffect(() => {
    const savedResult = localStorage.getItem('singleInvoiceResult');
    if (savedResult && savedResult !== "undefined" && savedResult !== "null") {
      try {
        setSingleResult(JSON.parse(savedResult));
      } catch (e) {
        console.error("Purana data parse nahi ho paaya:", e);
      }
    }
  }, []);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setSingleResult(null); 
    setBatchMessage(""); 
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert("Bhai, pehle invoices toh select kar!");

    const newBatchId = Date.now().toString();
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("batch_id", newBatchId); 
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload-batch`, {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (typeof onUploadSuccess === 'function') {
           onUploadSuccess(newBatchId);
        }

        // Single Image Upload ka case
        if (data.successful_uploads && data.successful_uploads.length === 1) {
          const resultData = data.successful_uploads[0].data;
          setSingleResult(resultData);
          setBatchMessage("");
          
          // Data ko stringify karke browser mein solid tarah se save kiya
          localStorage.setItem('singleInvoiceResult', JSON.stringify(resultData));
          
        } 
        // Multiple Images ka case
        else if (data.successful_uploads && data.successful_uploads.length > 1) {
          setBatchMessage(`✅ ${data.successful_uploads.length} Invoices processed successfully!`);
          setSingleResult(null);
          localStorage.removeItem('singleInvoiceResult'); // Multiple aane par single ka purana data hata do
        } 
        // Agar saare fail ho jayein
        else {
          setBatchMessage("⚠️ Koi bhi file sahi se analyse nahi ho paayi.");
        }
      } else {
        alert(`Backend Error: ${data.detail}`);
      }
    } catch (error) {
      console.error("Asli Error ye hai:", error);
      // NAYA: Ab alert seedha error ka exact message dega
      alert(`Error aaya: ${error.message}`); 
    } finally {
      setLoading(false);
      setFiles([]); // Upload ke baad file selection clear kar do
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8">
      <div className="bg-white/60 backdrop-blur-2xl p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80">
        <h2 className="text-2xl font-extrabold mb-8 text-gray-800 text-center tracking-tight">
          Upload & Analyze <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-teal-500">Invoices</span>
        </h2>
        
        <div className="relative group border-2 border-dashed border-purple-300/60 bg-white/40 backdrop-blur-sm hover:bg-white/60 p-10 rounded-2xl mb-8 text-center transition-all duration-300">
          <input 
            type="file" 
            multiple
            accept=".pdf, image/jpeg, image/png, image/webp" 
            onChange={handleFileChange} 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="pointer-events-none flex flex-col items-center justify-center space-y-4">
             <div className="w-16 h-16 bg-purple-100/80 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
             </div>
             <div>
               <p className="text-gray-700 font-semibold text-lg">Drag & drop files here</p>
               <p className="text-gray-500 text-sm mt-1">or click to browse from your device</p>
               {files.length > 0 && (
                 <p className="mt-4 inline-block bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm">
                   {files.length} file(s) selected
                 </p>
               )}
             </div>
          </div>
        </div>

        <button 
          onClick={handleUpload}
          disabled={loading || files.length === 0}
          className={`w-full font-bold py-4 px-6 rounded-2xl text-white shadow-lg transition-all duration-300 flex justify-center items-center ${
            loading || files.length === 0 
            ? 'bg-gray-300/80 cursor-not-allowed text-gray-500' 
            : 'bg-gradient-to-r from-purple-600 to-teal-500 hover:shadow-purple-500/40 hover:scale-[1.01]'
          }`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Processing Documents...
            </span>
          ) : (
            `Analyze ${files.length > 0 ? files.length : ''} Invoices`
          )}
        </button>

        {batchMessage && (
          <div className="mt-6 p-4 bg-teal-50/80 backdrop-blur-sm border border-teal-200 rounded-xl text-teal-800 font-medium text-center shadow-sm">
            {batchMessage}
          </div>
        )}

        {singleResult && (
          <div className="mt-8 bg-white/50 backdrop-blur-md border border-gray-200/60 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6 border-b border-gray-200/50 pb-4">
              <h3 className="font-bold text-lg text-teal-700 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                Extraction Successful
              </h3>
              <span className="bg-gradient-to-r from-purple-100 to-teal-100 text-purple-800 border border-purple-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide">
                {singleResult.category || "Others"}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700">
              <div className="bg-white/60 p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Merchant</span>
                <span className="font-bold text-gray-800 truncate">{singleResult.merchant_name || "Unknown"}</span>
              </div>
              <div className="bg-white/60 p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Date</span>
                <span className="font-semibold text-gray-800">{singleResult.date || "N/A"}</span>
              </div>
              <div className="bg-white/60 p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">Tax</span>
                <span className="font-semibold text-gray-800">₹{singleResult.tax_amount || 0}</span>
              </div>
              <div className="bg-purple-50/60 p-4 rounded-xl shadow-sm border border-purple-100 flex flex-col justify-center items-center">
                <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">Total Amount</span>
                <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-teal-600">₹{singleResult.total_amount || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceUploader;