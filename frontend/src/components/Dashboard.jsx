// Dashboard.jsx
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CreditCard, Receipt, Lightbulb, BrainCircuit, BarChart3, RefreshCw } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://aiinvoicebackend.onrender.com";

const COLORS = ['#8b5cf6', '#14b8a6', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];

const Dashboard = ({ batchId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [aiData, setAiData] = useState({ summary: "", insights: [], recommendations: [] });
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchStats = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/dashboard-stats?batch_id=${batchId}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    if (!batchId) return;
    setLoadingInsights(true);
    try {
      const response = await fetch(`${API_BASE_URL}/insights?batch_id=${batchId}`);
      const data = await response.json();
      
      if (data) {
        setAiData({
          summary: data.summary || "Summary not available.",
          insights: data.insights || [],
          recommendations: data.recommendations || []
        });
      }
    } catch (error) {
      console.error("Insights fetch fail hua:", error);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    if (batchId) {
      fetchStats();
      fetchInsights();
    } else {
      setStats(null);
      setAiData({ summary: "", insights: [], recommendations: [] });
    }
  }, [batchId]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      <p className="text-purple-600 font-semibold text-lg tracking-wide">Compiling Analytics...</p>
    </div>
  );
  
  if (!batchId || !stats) return null;

  const totalBillsCount = Object.values(stats.merchant_summary || {}).reduce((a, b) => a + b, 0);

  if (totalBillsCount < 2) {
    return null; 
  }

  const categoryData = Object.keys(stats.category_summary || {}).map(key => ({
    name: key,
    value: stats.category_summary[key]
  }));

  const merchantData = Object.keys(stats.merchant_summary || {})
    .map(key => ({
      name: key.length > 12 ? key.substring(0, 12) + "..." : key,
      count: stats.merchant_summary[key]
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  return (
    <div className="w-full max-w-7xl mx-auto my-10 space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/40 backdrop-blur-xl p-6 md:px-8 rounded-3xl border border-white/60 shadow-sm">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">Financial Overview</h2>
          <p className="text-gray-500 text-sm font-medium mt-1">Batch ID: <span className="font-mono text-purple-600">{batchId}</span></p>
        </div>
        <button 
          onClick={() => { fetchStats(); fetchInsights(); }}
          className="mt-4 md:mt-0 flex items-center gap-2 bg-white/60 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-white hover:shadow-md transition-all duration-300"
        >
          <RefreshCw size={16} className="text-purple-600" />
          Refresh Data
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-sm flex items-center hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-purple-100/80 p-4 rounded-2xl mr-5"><CreditCard className="text-purple-600" size={28} /></div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Spend</p>
            <p className="text-3xl font-black text-gray-800">₹{stats.total_expense?.toFixed(2) || 0}</p>
          </div>
        </div>
        
        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-sm flex items-center hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-teal-100/80 p-4 rounded-2xl mr-5"><Receipt className="text-teal-600" size={28} /></div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Tax Paid</p>
            <p className="text-3xl font-black text-gray-800">₹{stats.total_tax?.toFixed(2) || 0}</p>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/80 shadow-sm flex items-center hover:-translate-y-1 transition-transform duration-300">
          <div className="bg-blue-100/80 p-4 rounded-2xl mr-5"><Activity className="text-blue-600" size={28} /></div>
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Unique Merchants</p>
            <p className="text-3xl font-black text-gray-800">{Object.keys(stats.merchant_summary || {}).length}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/50 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm flex flex-col h-[420px]">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2 text-lg">
            <PieChart className="text-purple-500 w-5 h-5" /> Category Breakdown
          </h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={85} outerRadius={125} paddingAngle={6} dataKey="value" stroke="rgba(255,255,255,0.5)" strokeWidth={2}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `₹${value.toFixed(2)}`}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.95)' }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/50 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/80 shadow-sm flex flex-col h-[420px]">
          <h3 className="font-bold text-gray-700 mb-6 flex items-center gap-2 text-lg">
            <BarChart3 className="text-teal-500 w-5 h-5" /> Top Merchants
          </h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} interval={0} angle={-35} textAnchor="end" height={60} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{fill: '#6b7280', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(139, 92, 246, 0.05)'}} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', backgroundColor: 'rgba(255,255,255,0.95)' }}
                />
                <Bar dataKey="count" fill="url(#colorGradient)" radius={[6, 6, 0, 0]} barSize={40} />
                <defs>
                  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#14b8a6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE AI SECTION */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-3xl overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-purple-600/90 to-teal-500/90 backdrop-blur-md p-6 border-b border-white/20">
          <h3 className="text-xl font-extrabold text-white flex items-center tracking-wide">
            <BrainCircuit className="mr-3 text-teal-200" size={26} />
            AI Financial Intelligence
          </h3>
        </div>

        {loadingInsights ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-4">
             <BrainCircuit className="text-purple-400 animate-pulse w-12 h-12" />
             <p className="text-gray-500 font-semibold">Extracting intelligent insights...</p>
          </div>
        ) : (
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/20">
            
            {/* 1. AI Summary */}
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow duration-300">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center text-lg border-b border-gray-100 pb-3">
                <Activity className="mr-2 text-blue-500" size={20} />
                Spending Summary
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed font-medium">
                {aiData.summary}
              </p>
            </div>

            {/* 2. Key Insights */}
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow duration-300">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center text-lg border-b border-gray-100 pb-3">
                <BarChart3 className="mr-2 text-purple-500" size={20} />
                Key Insights
              </h4>
              <ul className="space-y-3">
                {aiData.insights && aiData.insights.length > 0 ? (
                  aiData.insights.map((item, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600 font-medium">
                      <span className="text-purple-400 mr-2 mt-0.5">•</span> {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400 italic">No insights available.</li>
                )}
              </ul>
            </div>

            {/* 3. Financial Recommendations */}
            <div className="bg-white/70 backdrop-blur-md p-6 rounded-2xl border border-white shadow-sm hover:shadow-md transition-shadow duration-300">
              <h4 className="font-bold text-gray-800 mb-4 flex items-center text-lg border-b border-gray-100 pb-3">
                <Lightbulb className="mr-2 text-teal-500" size={20} />
                Recommendations
              </h4>
              <ul className="space-y-3">
                {aiData.recommendations && aiData.recommendations.length > 0 ? (
                  aiData.recommendations.map((item, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600 font-medium">
                      <span className="text-teal-400 mr-2 mt-0.5">→</span> {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-gray-400 italic">No recommendations available.</li>
                )}
              </ul>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;