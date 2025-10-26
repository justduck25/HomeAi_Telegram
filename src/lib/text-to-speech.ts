// Hàm chuyển đổi text thành voice sử dụng Google Translate TTS (miễn phí)
export async function textToSpeech(text: string): Promise<Buffer | null> {
  try {
    // Làm sạch text để tránh lỗi TTS
    const cleanText = text
      .replace(/[*_`~]/g, '') // Loại bỏ markdown formatting
      .replace(/#{1,6}\s/g, '') // Loại bỏ markdown headers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Chuyển links thành text
      .replace(/\n{3,}/g, '\n\n') // Giảm line breaks
      .trim();

    // Giới hạn độ dài text (Google Translate TTS có giới hạn ~200 ký tự mỗi request)
    const maxLength = 200;
    const finalText = cleanText.length > maxLength 
      ? cleanText.substring(0, maxLength) + "..."
      : cleanText;

    if (!finalText || finalText.trim().length === 0) {
      console.log("Text rỗng, không thể tạo voice");
      return null;
    }

    console.log("Đang tạo voice từ text bằng Google Translate TTS...");
    
    // Encode text cho URL
    const encodedText = encodeURIComponent(finalText);
    
    // URL Google Translate TTS API (miễn phí)
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodedText}`;
    
    // Gọi Google Translate TTS API
    const response = await fetch(ttsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error("Lỗi gọi Google Translate TTS:", response.status, response.statusText);
      return null;
    }

    // Chuyển response thành buffer
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    console.log("Text-to-speech thành công với Google Translate TTS");
    return audioBuffer;
    
  } catch (error) {
    console.error("Lỗi Text-to-Speech:", error);
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

// Hàm kiểm tra xem text có phù hợp cho TTS không
export function isTextSuitableForTTS(text: string): boolean {
  const cleanText = text.replace(/[*_`~#\[\]()]/g, '').trim();
  
  // Kiểm tra độ dài
  if (cleanText.length === 0 || cleanText.length > 5000) {
    return false;
  }
  
  // Kiểm tra xem có phải chỉ là emoji hoặc ký tự đặc biệt không
  const textOnly = cleanText.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
  
  return textOnly.length > 0;
}

// Google Translate TTS hỗ trợ tiếng Việt với giọng mặc định
export const TTS_LANGUAGE = 'vi'; // Mã ngôn ngữ cho Google Translate TTS
