import { useState } from 'react';

const InvoiceUploader = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null); 
  };

  const handleUpload = async () => {
    if (!file) return alert("Bhai, pehle invoice toh select kar!");

    const formData = new FormData();
    formData.append("file", file);
    
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      if (response.ok) {
        setResult(data.extracted_data);
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
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Scan Your Receipt</h2>
      
      <div className="border-2 border-dashed border-purple-300 bg-purple-50 p-8 rounded-xl mb-6 text-center hover:bg-purple-100 transition-colors">
        <input 
          type="file" 
          accept=".pdf, image/jpeg, image/png" 
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
        {loading ? '⚡ Groq is analyzing lightning fast...' : 'Analyze with Groq'}
      </button>

      {/* JSON Result Mapping */}
      {result && (
        <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-green-600">⚡ Extraction Successful!</h3>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
              {result.category}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-6">
            <p className="bg-white p-3 rounded shadow-sm"><strong>Merchant:</strong> <br/>{result.merchant_name}</p>
            <p className="bg-white p-3 rounded shadow-sm"><strong>Date:</strong> <br/>{result.date}</p>
            <p className="bg-white p-3 rounded shadow-sm"><strong>Tax:</strong> <br/>₹{result.tax_amount}</p>
            <p className="bg-white p-3 rounded shadow-sm text-purple-700 text-lg"><strong>Total:</strong> <br/>₹{result.total_amount}</p>
          </div>
          
          <h4 className="font-semibold text-gray-800 mb-3 border-b pb-2">Items Purchased</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            {result.items?.map((item, index) => (
              <li key={index} className="flex justify-between bg-white p-2 rounded border border-gray-100">
                <span>{item.item_name}</span>
                <span className="font-semibold">₹{item.price}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InvoiceUploader;