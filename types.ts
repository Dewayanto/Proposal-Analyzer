export enum AgentId {
  ORIGINALITY = 'ORIGINALITY',
  LITERATURE = 'LITERATURE',
  METHODOLOGY = 'METHODOLOGY',
  FEASIBILITY = 'FEASIBILITY'
}

export enum AgentStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface AgentResult {
  id: AgentId;
  name: string;
  status: AgentStatus;
  output: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export interface AnalysisReport {
  executiveSummary: string;
  agentDetails: AgentResult[];
  finalRecommendations: string;
  rawText: string;
}