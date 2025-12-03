import React, { useState } from 'react';
import ChatMode from './components/ChatMode';
import CritiqueMode from './components/CritiqueMode';
import { GraduationCap } from 'lucide-react';

const App: React.FC = () => {
  const [reportContext, setReportContext] = useState<string>("");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm h-16 flex-shrink-0">
        <div className="max-w-[1600px] mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-slate-900">Dissertation Proposal Analyzer</h1>
              <p className="text-xs text-slate-500 font-medium">Dr. Totok Dewayanto</p>
            </div>
          </div>
          <div className="text-sm text-slate-500 hidden md:block">
            Mode: Profesor Akuntansi & Penguji S3
          </div>
        </div>
      </header>

      {/* Main Content - Unified Dashboard */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 overflow-hidden h-[calc(100vh-64px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          
          {/* Left Panel: Critique System */}
          <div className="h-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
            <CritiqueMode onReportGenerated={setReportContext} />
          </div>

          {/* Right Panel: Academic Chat */}
          <div className="h-full overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
            <ChatMode reportContext={reportContext} />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;