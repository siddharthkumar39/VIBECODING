import InvoiceUploader from './components/InvoiceUploader';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            AI FinTech <span className="text-purple-600">Analyzer</span>
          </h1>
          <p className="mt-2 text-gray-600">Powered by Groq LPU & Llama 3.2 Vision</p>
        </div>
        
        {/* Humara separate component yahan render ho raha hai */}
        <InvoiceUploader />
        
      </div>
    </div>
  );
}

export default App;