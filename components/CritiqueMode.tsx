import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Play, ChevronRight, ChevronDown, Download, Users, ClipboardList } from 'lucide-react';
import { AgentId, AgentStatus, AgentResult } from '../types';
import { runAgentAnalysis, synthesizeReport } from '../services/geminiService';
import MarkdownRenderer from './MarkdownRenderer';

interface AgentCardProps {
  result: AgentResult;
}

const AgentCard: React.FC<AgentCardProps> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (result.status) {
      case AgentStatus.IDLE: return <div className="w-5 h-5 rounded-full border-2 border-slate-300" />;
      case AgentStatus.THINKING: return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case AgentStatus.COMPLETED: return <CheckCircle className="w-5 h-5 text-green-500" />;
      case AgentStatus.ERROR: return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden mb-2 shadow-sm">
      <div 
        className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-medium text-slate-900 text-sm">{result.name}</h3>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              {result.status === AgentStatus.THINKING ? 'Sedang Menganalisis...' : 
               result.status === AgentStatus.COMPLETED ? 'Selesai' : 
               result.status === AgentStatus.ERROR ? 'Gagal' : 'Menunggu'}
            </p>
          </div>
        </div>
        {result.output && (
          <button className="text-slate-400">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}
      </div>
      
      {isExpanded && result.output && (
        <div className="p-4 border-t border-slate-100 bg-slate-50 text-sm max-h-60 overflow-y-auto">
           <MarkdownRenderer content={result.output} />
        </div>
      )}
    </div>
  );
};

interface CritiqueModeProps {
  onReportGenerated: (report: string) => void;
}

const CritiqueMode: React.FC<CritiqueModeProps> = ({ onReportGenerated }) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentResult[]>([
    { id: AgentId.ORIGINALITY, name: "Agen 1: Evaluasi Originalitas", status: AgentStatus.IDLE, output: "" },
    { id: AgentId.LITERATURE, name: "Agen 2: Tinjauan Literatur", status: AgentStatus.IDLE, output: "" },
    { id: AgentId.METHODOLOGY, name: "Agen 3: Tinjauan Metodologi", status: AgentStatus.IDLE, output: "" },
    { id: AgentId.FEASIBILITY, name: "Agen 4: Evaluasi Kelayakan", status: AgentStatus.IDLE, output: "" },
  ]);
  const [finalReport, setFinalReport] = useState<string>("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [view, setView] = useState<'upload' | 'report'>('upload');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        alert("Mohon unggah file PDF.");
        return;
      }
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data url prefix
        const base64Content = base64String.split(',')[1];
        setFileBase64(base64Content);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const startAnalysis = async () => {
    if (!fileBase64 || !file) return;

    setAgents(prev => prev.map(a => ({ ...a, status: AgentStatus.THINKING, output: "", error: undefined })));
    setFinalReport("");
    setView('report'); // Switch to report view automatically
    
    // Launch agents in parallel
    const agentPromises = agents.map(async (agent) => {
      try {
        const output = await runAgentAnalysis(agent.id, fileBase64, file.type);
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: AgentStatus.COMPLETED, output } : a));
        return { id: agent.id, output };
      } catch (error) {
        console.error(error);
        setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, status: AgentStatus.ERROR, error: "Gagal menganalisis" } : a));
        return { id: agent.id, output: "Analisis Gagal." };
      }
    });

    const results = await Promise.all(agentPromises);
    
    // Synthesize
    setIsSynthesizing(true);
    try {
      const report = await synthesizeReport(results);
      setFinalReport(report);
      onReportGenerated(report); // Send to Chat Mode
    } catch (error) {
      console.error(error);
      setFinalReport("Gagal menyusun laporan akhir.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <FileText size={20} className="text-blue-600"/>
          Panel Kritik Disertasi
        </h2>
        {/* Simple Tabs for small screens if needed, mostly just indicators */}
        <div className="flex gap-2 text-xs">
            <span className={`px-2 py-1 rounded cursor-pointer ${view === 'upload' ? 'bg-slate-200 font-medium' : 'text-slate-500'}`} onClick={() => setView('upload')}>Unggah</span>
            <span className={`px-2 py-1 rounded cursor-pointer ${view === 'report' ? 'bg-slate-200 font-medium' : 'text-slate-500'}`} onClick={() => setView('report')}>Laporan</span>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Upload & Agents Area - Always visible but collapsible logic via scrolling */}
        <div className={`p-4 border-b border-slate-200 ${view === 'report' && finalReport ? 'hidden md:block' : 'block'}`}>
             {/* Upload Section */}
             <div className="mb-4">
              {!file ? (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-all">
                  <div className="flex flex-col items-center justify-center pt-2">
                    <Upload className="w-6 h-6 mb-2 text-slate-400" />
                    <p className="text-sm text-slate-500 font-medium">Klik untuk unggah Proposal PDF</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="text-blue-600" size={20} />
                    <div className="overflow-hidden">
                      <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{file.name}</p>
                    </div>
                  </div>
                  <button onClick={() => { setFile(null); setFileBase64(null); setFinalReport(""); setView('upload'); }} className="text-xs text-red-500 hover:underline">Hapus</button>
                </div>
              )}

              <button
                onClick={startAnalysis}
                disabled={!fileBase64 || agents.some(a => a.status === AgentStatus.THINKING)}
                className="w-full mt-3 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium text-sm"
              >
                {agents.some(a => a.status === AgentStatus.THINKING) ? (
                  <><Loader2 className="animate-spin" size={16} /> Memproses...</>
                ) : (
                  <><Play size={16} /> Mulai Kritik Multi-Agen</>
                )}
              </button>
            </div>

            {/* Agent List */}
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Users size={12} /> Status Agen
              </h3>
              {agents.map(agent => (
                <AgentCard key={agent.id} result={agent} />
              ))}
            </div>
        </div>

        {/* Report Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-white relative">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 sticky top-0 bg-white py-2 border-b border-transparent z-10">
              <ClipboardList size={16} /> Laporan Pemeriksaan Akhir
              {finalReport && !isSynthesizing && (
                <button 
                  onClick={() => {
                    const blob = new Blob([finalReport], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Laporan_Kritik_${file?.name || 'Proposal'}.md`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="ml-auto flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded"
                >
                  <Download size={12} /> Unduh
                </button>
              )}
            </h3>

            {!finalReport && !isSynthesizing ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400">
                <p className="text-sm">Unggah proposal dan jalankan analisis untuk melihat laporan.</p>
              </div>
            ) : isSynthesizing ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500">
                <Loader2 size={32} className="animate-spin mb-3 text-blue-600" />
                <p className="text-sm font-medium">Penguji Utama sedang menyusun laporan...</p>
              </div>
            ) : (
              <MarkdownRenderer content={finalReport} />
            )}
        </div>
      </div>
    </div>
  );
};

export default CritiqueMode;