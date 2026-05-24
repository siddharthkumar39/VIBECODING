import { useState, useEffect } from 'react';
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
    <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl mx-auto border border-gray-100">
      <h2 className="bg-yellow-400 text-2xl font-bold mb-6 text-gray-800 text-center">Scan Your Receipts</h2>
      
      <div className="border-2 border-dashed border-purple-300 bg-purple-50 p-8 rounded-xl mb-6 text-center hover:bg-purple-100 transition-colors">
        <input 
          type="file" 
          multiple
          accept=".pdf, image/jpeg, image/png, image/webp" 
          onChange={handleFileChange} 
          className="w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 cursor-pointer"
        />
      </div>

      <button 
        onClick={handleUpload}
        disabled={loading || files.length === 0}
        className={`w-full font-bold py-3.5 px-4 rounded-xl text-white shadow-lg transition-all ${
          loading || files.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-500/30'
        }`}
      >
        {loading ? `⚡ Processing... Please wait` : `Analyze ${files.length > 0 ? files.length : ''} Invoices`}
      </button>

      {batchMessage && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-bold text-center">
          {batchMessage}
        </div>
      )}

      {singleResult && (
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-green-600">⚡ Extraction Successful!</h3>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
              {singleResult.category || "Others"}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-6">
            <p className="bg-white p-3 rounded shadow-sm border border-gray-100"><strong>Merchant:</strong> <br/>{singleResult.merchant_name || "Unknown"}</p>
            <p className="bg-white p-3 rounded shadow-sm border border-gray-100"><strong>Date:</strong> <br/>{singleResult.date || "N/A"}</p>
            <p className="bg-white p-3 rounded shadow-sm border border-gray-100"><strong>Tax:</strong> <br/>₹{singleResult.tax_amount || 0}</p>
            <p className="bg-white p-3 rounded shadow-sm border border-purple-200 text-purple-700 text-lg font-bold"><strong>Total:</strong> <br/>₹{singleResult.total_amount || 0}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploader;