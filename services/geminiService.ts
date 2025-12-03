import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { AgentId } from '../types';

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is not defined in the environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

// Model Selection
// Gemini 2.5 Flash digunakan untuk Chat dan tugas cepat.
// Gemini 3 Pro (Preview) digunakan untuk penalaran kompleks (Agen & Sintesis).
const COMPLEX_MODEL = 'gemini-3-pro-preview';
const CHAT_MODEL = 'gemini-2.5-flash';

// --- Mode Chat (Chatbot Akademik) ---

export const createChatSession = (context?: string): Chat => {
  const systemInstruction = `Anda adalah model AI yang bertindak sebagai **Profesor Akuntansi dan Penguji Disertasi S3** yang sangat ahli, profesional, dan sistematis. 
  
  Tugas utama Anda adalah:
  1. Menjawab pertanyaan akademik, memberikan panduan metodologi riset, dan menjelaskan standar disertasi.
  2. Jika tersedia "KONTEKS LAPORAN" (hasil kritik proposal), gunakan informasi tersebut untuk menjawab pertanyaan spesifik mahasiswa tentang perbaikan dokumen mereka.
  
  Gaya Respons: Formal, objektif, menggunakan terminologi akademik yang tepat (misalnya: validitas, reliabilitas, gap penelitian), namun tetap konstruktif.
  
  Gunakan Google Search untuk memverifikasi standar akademik terkini jika diperlukan.`;

  const chat = ai.chats.create({
    model: CHAT_MODEL,
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }],
    }
  });

  // Jika ada konteks laporan awal, kita bisa mengirimkannya (biasanya ditangani di UI sebagai pesan pertama atau pesan tersembunyi)
  return chat;
};

export const sendMessageToChat = async (chat: Chat, message: string): Promise<string> => {
  const result: GenerateContentResponse = await chat.sendMessage({ message });
  return result.text || "Mohon maaf, saya tidak dapat menghasilkan respons saat ini.";
};

// --- Mode Kritik (Sistem Multi-Agen) ---

interface AgentConfig {
  name: string;
  systemPrompt: string;
  useSearch: boolean;
}

const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  [AgentId.ORIGINALITY]: {
    name: "Agen 1: Evaluasi Originalitas & Kontribusi",
    systemPrompt: `Anda adalah 'Agen Evaluasi Originalitas & Kontribusi'. Tugas Anda adalah mengkritik proposal disertasi yang diberikan dengan fokus pada:
    1. Kebaruan (Novelty): Apakah penelitian ini baru?
    2. Kontribusi: Apa kontribusi signifikan terhadap keilmuan (body of knowledge)?
    3. Unique Selling Points: Apa yang membedakan riset ini dari karya yang sudah ada?
    
    Keluaran: Berikan kritik terstruktur dengan poin 'Kekuatan', 'Kelemahan', dan 'Rekomendasi Peningkatan Originalitas'.`,
    useSearch: false
  },
  [AgentId.LITERATURE]: {
    name: "Agen 2: Tinjauan Literatur",
    systemPrompt: `Anda adalah 'Agen Tinjauan Literatur'. Tugas Anda adalah mengkritik bagian Tinjauan Pustaka/Teori.
    1. Analisis Kritis: Apakah ini hanya ringkasan atau sintesis kritis?
    2. Grand Theory: Apakah kerangka teoritis (Grand Theory) tepat dan mutakhir?
    3. Research Gap: Apakah celah penelitian teridentifikasi dengan jelas dan terjustifikasi?
    
    Wajib gunakan Google Search untuk memverifikasi apakah teori yang disebutkan mutakhir dan jika ada karya besar terbaru yang terlewat.
    Keluaran: Berikan kritik terstruktur.`,
    useSearch: true
  },
  [AgentId.METHODOLOGY]: {
    name: "Agen 3: Tinjauan Metodologi",
    systemPrompt: `Anda adalah 'Agen Tinjauan Metodologi'. Tugas Anda adalah mengkritik Metodologi Penelitian.
    1. Desain: Apakah desain penelitian sesuai dengan pertanyaan penelitian?
    2. Instrumen: Apakah validitas dan reliabilitas dibahas?
    3. Analisis: Apakah teknik analisis data yang diusulkan sudah benar?
    
    Wajib gunakan Google Search untuk memeriksa standar metodologi untuk topik ini.
    Keluaran: Identifikasi kelemahan spesifik dan rekomendasi teknis.`,
    useSearch: true
  },
  [AgentId.FEASIBILITY]: {
    name: "Agen 4: Evaluasi Kelayakan",
    systemPrompt: `Anda adalah 'Agen Evaluasi Kelayakan'. Tugas Anda adalah mengkritik kelayakan proyek.
    1. Jadwal: Apakah realistis?
    2. Sumber Daya: Apakah akses data aman? Apakah ada risiko etika?
    3. Risiko: Apa potensi kegagalannya?
    
    Wajib gunakan Google Search untuk memeriksa isu ketersediaan data atau studi serupa.
    Keluaran: Berikan penilaian paling kritis tentang kelayakan dan saran mitigasi risiko.`,
    useSearch: true
  }
};

export const runAgentAnalysis = async (
  agentId: AgentId,
  fileBase64: string,
  mimeType: string
): Promise<string> => {
  const config = AGENT_CONFIGS[agentId];
  
  const tools = config.useSearch ? [{ googleSearch: {} }] : undefined;
  
  try {
    const response = await ai.models.generateContent({
      model: COMPLEX_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: fileBase64
            }
          },
          {
            text: `Silakan analisis dokumen terlampir berdasarkan instruksi peran Anda sebagai ${config.name}.`
          }
        ]
      },
      config: {
        systemInstruction: config.systemPrompt,
        temperature: 0.2, // Rendah untuk konsistensi faktual
        tools: tools,
      }
    });

    return response.text || "Analisis tidak dihasilkan.";
  } catch (error) {
    console.error(`Error pada agen ${config.name}:`, error);
    throw error;
  }
};

export const synthesizeReport = async (
  agentResults: { id: AgentId, output: string }[]
): Promise<string> => {
  const combinedInput = agentResults.map(r => 
    `--- LAPORAN DARI ${AGENT_CONFIGS[r.id].name} ---\n${r.output}\n`
  ).join("\n");

  try {
    const response = await ai.models.generateContent({
      model: COMPLEX_MODEL,
      contents: {
        parts: [{
          text: `Anda adalah Penguji Utama (Lead Examiner). Sintesiskan 4 laporan agen berikut menjadi satu "Laporan Pemeriksaan Proposal Disertasi" yang kohesif.
          
          Susun keluaran akhir persis seperti struktur berikut:
          # LAPORAN: Pemeriksaan Proposal Disertasi
          
          ## Bagian I: Ringkasan Eksekutif
          (Ringkasan tingkat tinggi status proposal: Diterima dengan Revisi Minor, Revisi Mayor, atau Ditolak, beserta alasannya).

          ## Bagian II: Kritik Spesialistik
          (Sintesis temuan dari para agen menjadi narasi yang kohesif, dikelompokkan berdasarkan tema (Originalitas, Literatur, Metodologi, Kelayakan), jangan hanya menyalin output agen mentah-mentah).

          ## Bagian III: Rekomendasi Aksi
          (Daftar poin tindakan spesifik yang harus dilakukan mahasiswa).
          
          DATA MASUKAN:
          ${combinedInput}`
        }]
      },
      config: {
        temperature: 0.2
      }
    });

    return response.text || "Gagal menyusun laporan sintesis.";
  } catch (error) {
    console.error("Error synthesizing report:", error);
    throw error;
  }
};