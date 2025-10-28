// Edge TTS implementation - Thay thế Google TTS với khả năng xử lý text dài không giới hạn
// Sử dụng edge-tts-universal package cho Node.js
import { EdgeTTS } from 'edge-tts-universal';

// Không còn giới hạn ký tự như Google TTS
export const MAX_EDGE_TTS_LEN = 10000; // Edge TTS có thể xử lý text rất dài

// Danh sách giọng tiếng Việt có sẵn trong Edge TTS
export const VIETNAMESE_VOICES = [
  'vi-VN-HoaiMyNeural',     // Nữ, tự nhiên
  'vi-VN-NamMinhNeural',    // Nam, tự nhiên
] as const;

export type VietnameseVoice = typeof VIETNAMESE_VOICES[number];

// Cấu hình mặc định
const DEFAULT_VOICE: VietnameseVoice = 'vi-VN-HoaiMyNeural';

export async function edgeTextToSpeech(
  text: string, 
  voice: VietnameseVoice = DEFAULT_VOICE
): Promise<Buffer | null> {
  try {
    // Làm sạch text để tránh lỗi TTS
    const cleanText = text
      .replace(/[*_`~]/g, '') // Loại bỏ markdown formatting
      .replace(/#{1,6}\s/g, '') // Loại bỏ markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Chuyển links thành text
      .replace(/\n{3,}/g, '\n\n') // Giảm line breaks
      .replace(/🔍|✅|❌|🖼️|📊|⚡|🎯|💡|🔧|🚀/g, '') // Loại bỏ emoji
      .trim();

    if (cleanText.length === 0) {
      console.log("Text rỗng, không thể tạo voice");
      return null;
    }

    console.log(`🎤 Đang tạo voice từ text bằng Edge TTS (${voice})...`);
    console.log(`📝 Text length: ${cleanText.length} characters`);

    // Sử dụng edge-tts-universal
    const tts = new EdgeTTS(cleanText, voice);
    const result = await tts.synthesize();
    
    // Chuyển ArrayBuffer thành Buffer
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());
    
    console.log(`✅ Edge TTS thành công: ${audioBuffer.length} bytes`);
    return audioBuffer;
    
  } catch (error) {
    console.error("❌ Lỗi Edge TTS:", error);
    return null;
  }
}

// Hàm chia text thành chunks nếu quá dài (Edge TTS có thể handle text dài nhưng để tối ưu performance)
export function splitTextForTTS(text: string, maxLength: number = MAX_EDGE_TTS_LEN): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    // Nếu câu hiện tại quá dài, cắt theo từ
    if (trimmedSentence.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
      // Chia câu dài theo từ
      const words = trimmedSentence.split(' ');
      let wordChunk = '';
      
      for (const word of words) {
        if ((wordChunk + ' ' + word).length > maxLength) {
          if (wordChunk) {
            chunks.push(wordChunk.trim());
          }
          wordChunk = word;
        } else {
          wordChunk += (wordChunk ? ' ' : '') + word;
        }
      }
      
      if (wordChunk) {
        chunks.push(wordChunk.trim());
      }
    } else {
      // Kiểm tra xem có thể thêm câu vào chunk hiện tại không
      const testChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;
      
      if (testChunk.length > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk = testChunk;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 0);
}

// Hàm tạo multiple audio files cho text dài
export async function edgeTextToSpeechLong(
  text: string,
  voice: VietnameseVoice = DEFAULT_VOICE,
  maxLength: number = MAX_EDGE_TTS_LEN
): Promise<Buffer[]> {
  const chunks = splitTextForTTS(text, maxLength);
  const audioBuffers: Buffer[] = [];
  
  console.log(`🔄 Chia text thành ${chunks.length} chunks để xử lý`);
  
  for (let i = 0; i < chunks.length; i++) {
    console.log(`🎤 Đang xử lý chunk ${i + 1}/${chunks.length}...`);
    
    const audioBuffer = await edgeTextToSpeech(chunks[i], voice);
    
    if (audioBuffer) {
      audioBuffers.push(audioBuffer);
    } else {
      console.warn(`⚠️ Chunk ${i + 1} không thể tạo audio`);
    }
    
    // Delay nhỏ giữa các requests để tránh rate limiting
    if (i < chunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return audioBuffers;
}

// Hàm kiểm tra xem text có phù hợp cho Edge TTS không
export function isTextSuitableForEdgeTTS(text: string): boolean {
  const cleanText = text.replace(/[*_`~#\[\]()🔍✅❌🖼️📊⚡🎯💡🔧🚀]/g, '').trim();
  
  // Edge TTS có thể xử lý text rất dài, chỉ cần kiểm tra cơ bản
  if (cleanText.length === 0) {
    return false;
  }
  
  // Kiểm tra xem có phải chỉ là emoji hoặc ký tự đặc biệt không
  const textOnly = cleanText.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  
  return textOnly.length > 0;
}

// Export các hàm tương thích với interface cũ
export const textToSpeech = edgeTextToSpeech;
export const isTextSuitableForTTS = isTextSuitableForEdgeTTS;
export const TTS_LANGUAGE = 'vi-VN';
export const MAX_TTS_LENGTH = MAX_EDGE_TTS_LEN;
