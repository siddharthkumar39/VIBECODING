import { useState } from 'react';

// Props me onUploadSuccess receive kiya
const InvoiceUploader = ({ onUploadSuccess }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [singleResult, setSingleResult] = useState(null);
  const [batchMessage, setBatchMessage] = useState("");

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setSingleResult(null); 
    setBatchMessage(""); 
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert("Bhai, pehle invoices toh select kar!");

    // Ek naya unique Batch ID banate hain current time ke hisaab se
    const newBatchId = Date.now().toString();

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("batch_id", newBatchId); // Backend ko ID bhej rahe hain
    
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/upload-batch", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok) {
        // ID App.jsx ko bhej do taaki Dashboard update ho sake
        onUploadSuccess(newBatchId);

        if (data.successful_uploads.length === 1) {
          setSingleResult(data.successful_uploads[0].data);
          setBatchMessage("");
        } else {
          setBatchMessage(`✅ ${data.successful_uploads.length} Invoices processed successfully!`);
          setSingleResult(null);
        }
      } else {
        alert(`Error: ${data.detail}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Backend server se connect nahi ho paaya.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-2xl mx-auto border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Scan Your Receipts</h2>
      
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
        disabled={loading}
        className={`w-full font-bold py-3.5 px-4 rounded-xl text-white shadow-lg transition-all ${
          loading ? 'bg-gray-400 cursor-wait' : 'bg-purple-600 hover:bg-purple-700 hover:shadow-purple-500/30'
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
              {singleResult.category}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-6">
            <p className="bg-white p-3 rounded shadow-sm border border-gray-100"><strong>Merchant:</strong> <br/>{singleResult.merchant_name}</p>
            <p className="bg-white p-3 rounded shadow-sm border border-gray-100"><strong>Date:</strong> <br/>{singleResult.date}</p>
            <p className="bg-white p-3 rounded shadow-sm border border-gray-100"><strong>Tax:</strong> <br/>₹{singleResult.tax_amount}</p>
            <p className="bg-white p-3 rounded shadow-sm border border-purple-200 text-purple-700 text-lg font-bold"><strong>Total:</strong> <br/>₹{singleResult.total_amount}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploader;