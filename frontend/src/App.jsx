import { useState } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file first!");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setStatus("Uploading...");

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      setStatus(`Success: ${data.message} (${data.filename})`);
    } catch (error) {
      console.error("Error uploading file:", error);
      setStatus("Upload failed. Check console.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">AI Invoice Analyzer</h1>
        
        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg mb-4">
          <input 
            type="file" 
            accept=".pdf, image/*" 
            onChange={handleFileChange} 
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button 
          onClick={handleUpload}
          className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition"
        >
          Analyze Invoice
        </button>

        {status && (
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
            {status}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;