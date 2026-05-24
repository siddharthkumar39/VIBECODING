import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, CreditCard, Receipt } from 'lucide-react';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6b7280'];

// NAYA: Props mein batchId receive kar rahe hain
const Dashboard = ({ batchId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    // Agar batchId null hai (first time ya koi naya batch nahi hai) toh fetch mat karo
    if (!batchId) return;

    setLoading(true);
    try {
      // NAYA: Backend ko url params mein batch_id bhej rahe hain taaki sirf current upload ka data aaye
      const response = await fetch(`http://localhost:8000/dashboard-stats?batch_id=${batchId}`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // NAYA: Jab bhi batchId change hoga (naya upload), yeh useEffect wapas chalega aur purana data clear karke naya layega
  useEffect(() => {
    if (batchId) {
      fetchStats();
    } else {
      setStats(null);
    }
  }, [batchId]);

  if (loading) return <div className="text-center p-8 text-purple-600 font-bold">Loading Analytics...</div>;
  
  // Agar abhi tak koi batchId assign nahi hua ya stats load nahi hue, toh dashboard mat dikhao
  if (!batchId || !stats) return null;

  // NAYA: Total bills count nikal rahe hain taaki pata chale single bill hai ya multiple
  const totalBillsCount = Object.values(stats.merchant_summary || {}).reduce((a, b) => a + b, 0);

  // NAYA: Agar single bill upload kiya hai (ya zero), toh dashboard poora hide ho jayega (purana wala gayab)
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
    <div className="mt-12 bg-white p-8 rounded-xl shadow-lg border border-gray-100 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800">Batch Financial Dashboard</h2>
        <button 
          onClick={fetchStats}
          className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-semibold hover:bg-purple-200 transition"
        >
          Refresh Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 flex items-center shadow-sm">
          <div className="bg-purple-200 p-3 rounded-full mr-4"><CreditCard className="text-purple-700" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-semibold">Total Spend (This Batch)</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
    </div>
  );
};

export default Dashboard;