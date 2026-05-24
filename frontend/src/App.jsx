import { useState, useEffect } from 'react';
import InvoiceUploader from './components/InvoiceUploader';
import Dashboard from './components/Dashboard';
import Auth from './components/Auth'; // Auth import kiya

function App() {
  const [currentBatchId, setCurrentBatchId] = useState(null);
  
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');

  // Page reload hone par check karo ki user pehle se login toh nahi hai
  useEffect(() => {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('userName');
    if (token && name) {
      setIsAuthenticated(true);
      setUserName(name);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserName('');
    setCurrentBatchId(null); // Logout hone par batch id bhi reset kar do
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              AI FinTech <span className="text-purple-600">Analyzer</span>
            </h1>
          </div>
          
          {/* Logout Button (Sirf tab dikhega jab login ho) */}
          {isAuthenticated && (
            <div className="flex items-center space-x-4">
              <span className="font-semibold text-gray-700">Hi, {userName}</span>
              <button 
                onClick={handleLogout} 
                className="bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>
        
        {/* Conditional Rendering: Agar login hai toh app dikhao, warna Auth screen */}
        {isAuthenticated ? (
          <>
            <InvoiceUploader onUploadSuccess={setCurrentBatchId} />
            <Dashboard batchId={currentBatchId} />
          </>
        ) : (
          <Auth onLoginSuccess={(name) => {
            setIsAuthenticated(true);
            setUserName(name);
          }} />
        )}
        
      </div>
    </div>
  );
}

export default App;