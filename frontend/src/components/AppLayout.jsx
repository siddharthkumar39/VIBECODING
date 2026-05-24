// AppLayout.jsx
import React from 'react';

const AppLayout = ({ children, userName, onLogout }) => {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-slate-50 via-purple-50 to-teal-50 font-sans text-gray-800 overflow-hidden flex flex-col">
      {/* Soft Bokeh Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-300/30 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-teal-300/30 blur-[120px] pointer-events-none"></div>
      
      {/* Premium Glassmorphism Navbar */}
      <nav className="sticky top-0 z-50 bg-white/40 backdrop-blur-xl border-b border-white/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-teal-400 shadow-md"></div>
            <h1 className="text-xl font-extrabold tracking-tight text-gray-800">
              Nexus<span className="text-purple-600 font-light">AI</span>
            </h1>
          </div>
          
          <div className="flex items-center space-x-6">
            {userName ? (
              <>
                <span className="text-sm font-medium text-gray-600">Welcome, {userName}</span>
                <button 
                  onClick={onLogout}
                  className="text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <span className="text-sm font-medium text-gray-500">Intelligent Invoice Management</span>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 relative z-10 w-full">
        {children}
      </main>

      {/* Minimalist Footer */}
      <footer className="w-full bg-white/30 backdrop-blur-md border-t border-white/50 py-6 mt-auto z-10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} NexusAI. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;