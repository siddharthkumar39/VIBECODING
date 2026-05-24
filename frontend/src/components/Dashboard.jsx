import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CreditCard, Receipt, Lightbulb, BrainCircuit, BarChart3 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://aiinvoicebackend.onrender.com";

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6b7280'];

const Dashboard = ({ batchId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const [aiData, setAiData] = useState({ summary: "", insights: [], recommendations: [] });
  const [loadingInsights, setLoadingInsights] = useState(false);

  const fetchStats = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      // Yahan theek kiya: upload-batch ko hata kar dashboard-stats kar diya
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
      // Yahan theek kiya: localhost hata kar API_BASE_URL laga diya
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

  if (loading) return <div className="text-center p-8 text-purple-600 font-bold text-xl">📊 Loading Analytics...</div>;
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
    <div className="mt-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-6xl mx-auto mb-10">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Batch Financial Dashboard</h2>
        <button 
          onClick={() => { fetchStats(); fetchInsights(); }}
          className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-semibold hover:bg-purple-200 transition"
        >
          Refresh Data
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex items-center shadow-sm">
          <div className="bg-purple-200 p-3 rounded-full mr-4"><CreditCard className="text-purple-700" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Total Spend</p>
            <p className="text-2xl font-bold text-purple-800">₹{stats.total_expense?.toFixed(2) || 0}</p>
          </div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex items-center shadow-sm">
          <div className="bg-blue-200 p-3 rounded-full mr-4"><Receipt className="text-blue-700" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Total Tax Paid</p>
            <p className="text-2xl font-bold text-blue-800">₹{stats.total_tax?.toFixed(2) || 0}</p>
          </div>
        </div>

        <div className="bg-green-50 p-6 rounded-xl border border-green-100 flex items-center shadow-sm">
          <div className="bg-green-200 p-3 rounded-full mr-4"><Activity className="text-green-700" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Unique Merchants</p>
            <p className="text-2xl font-bold text-green-800">{Object.keys(stats.merchant_summary || {}).length}</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm h-96 flex flex-col">
          <h3 className="text-center font-bold text-gray-700 mb-4">Category-wise Expense Breakdown</h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={5} dataKey="value">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm h-96 flex flex-col">
          <h3 className="text-center font-bold text-gray-700 mb-4">Merchant-wise Analysis (Top 7)</h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={merchantData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} angle={-45} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: '#e5e7eb'}} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE AI SECTION */}
      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="bg-gray-800 p-4">
          <h3 className="text-xl font-bold text-white flex items-center">
            <BrainCircuit className="mr-3 text-purple-400" />
            AI Financial Intelligence
          </h3>
        </div>

        {loadingInsights ? (
          <div className="p-8 text-center text-indigo-600 font-semibold animate-pulse">
            🤖 Extracting insights and generating recommendations...
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50">
            
            {/* 1. AI Summary */}
            <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center text-lg border-b pb-2">
                <Activity className="mr-2 text-blue-500" size={20} />
                Spending Summary
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                {aiData.summary}
              </p>
            </div>

            {/* 2. Key Insights */}
            <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center text-lg border-b pb-2">
                <BarChart3 className="mr-2 text-orange-500" size={20} />
                Key Insights
              </h4>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-2">
                {aiData.insights && aiData.insights.length > 0 ? (
                  aiData.insights.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <li>No insights available.</li>
                )}
              </ul>
            </div>

            {/* 3. Financial Recommendations */}
            <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
              <h4 className="font-bold text-gray-800 mb-3 flex items-center text-lg border-b pb-2">
                <Lightbulb className="mr-2 text-green-500" size={20} />
                Recommendations
              </h4>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-2">
                {aiData.recommendations && aiData.recommendations.length > 0 ? (
                  aiData.recommendations.map((item, idx) => <li key={idx}>{item}</li>)
                ) : (
                  <li>No recommendations available.</li>
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