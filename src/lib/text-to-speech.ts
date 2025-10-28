// Import Edge TTS functions
import { 
  edgeTextToSpeech, 
  edgeTextToSpeechLong, 
  isTextSuitableForEdgeTTS, 
  MAX_EDGE_TTS_LEN,
  VIETNAMESE_VOICES,
  type VietnameseVoice 
} from './edge-tts';

// Sử dụng Edge TTS thay vì Google Translate TTS - KHÔNG CÓ GIỚI HẠN KÝ TỰ!
export const MAX_GOOGLE_TRANSLATE_TTS_LEN = MAX_EDGE_TTS_LEN; // Backward compatibility

export async function textToSpeech(text: string, voice?: VietnameseVoice): Promise<Buffer | null> {
  try {
    // Sử dụng Edge TTS - có thể xử lý text rất dài
    const audioBuffer = await edgeTextToSpeech(text, voice);
    
    if (audioBuffer) {
      console.log("✅ Text-to-speech thành công với Edge TTS");
      return audioBuffer;
    } else {
      console.error("❌ Edge TTS không thể tạo audio");
      return null;
    }
    
  } catch (error) {
    console.error("❌ Lỗi Edge Text-to-Speech:", error);
    return null;
  }
}

// Hàm gửi voice message về Telegram
export async function sendVoiceMessage(chatId: number, audioBuffer: Buffer): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN không được cấu hình");
  }

  try {
    // Tạo FormData để gửi file
    const formData = new FormData();
    formData.append('chat_id', chatId.toString());
    
    // Chuyển Buffer thành Uint8Array để tương thích với Blob
    const uint8Array = new Uint8Array(audioBuffer);
    formData.append('voice', new Blob([uint8Array], { type: 'audio/mpeg' }), 'voice.mp3');

    // Gửi voice message
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendVoice`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lỗi gửi voice message:", errorText);
      return false;
    }

    const result = await response.json();
    if (!result.ok) {
      console.error("Telegram API error:", result);
      return false;
    }

    console.log("Gửi voice message thành công");
    return true;
    
  } catch (error) {
    console.error("Lỗi gửi voice message:", error);
    return false;
  }
}

// Hàm gửi recording action (hiển thị "đang ghi âm...")
export async function sendRecordingAction(chatId: number): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendChatAction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: "record_voice", // Hiển thị "đang ghi âm..."
      }),
    });
  } catch (error) {
    console.error("Lỗi gửi recording action:", error);
  }
}

// Hàm tạo multiple voice messages cho text dài
export async function textToSpeechLong(text: string, voice?: VietnameseVoice): Promise<Buffer[]> {
  try {
    console.log(`🎤 Tạo voice cho text dài: ${text.length} ký tự`);
    
    // Sử dụng Edge TTS để xử lý text dài
    const audioBuffers = await edgeTextToSpeechLong(text, voice);
    
    console.log(`✅ Tạo thành công ${audioBuffers.length} audio chunks`);
    return audioBuffers;
    
  } catch (error) {
    console.error("❌ Lỗi tạo voice cho text dài:", error);
    return [];
  }
}

// Hàm kiểm tra xem text có phù hợp cho TTS không (sử dụng Edge TTS)
export function isTextSuitableForTTS(text: string): boolean {
  return isTextSuitableForEdgeTTS(text);
}

// Edge TTS hỗ trợ tiếng Việt với nhiều giọng nói
export const TTS_LANGUAGE = 'vi-VN'; // Mã ngôn ngữ cho Edge TTS
export { VIETNAMESE_VOICES, type VietnameseVoice } from './edge-tts';
