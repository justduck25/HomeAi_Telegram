import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { 
  initializeUser, 
  getUserByTelegramId, 
  updateUser,
  saveMemory,
  getMemory,
  clearMemory,
  getAllUsers,
  type User 
} from "@/lib/database";
import { textToSpeech, sendVoiceMessage, sendRecordingAction, isTextSuitableForTTS } from "@/lib/text-to-speech";
import { getWeatherData, formatWeatherMessage, getWeatherForecast, formatForecastMessage } from "@/lib/weather";

// Sử dụng Node.js runtime để tương thích với SDK
export const runtime = "nodejs";

// Types for compatibility
type ContextMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

// Helper function to format location name
function formatUserLocationName(location: { latitude: number; longitude: number; city?: string; country?: string }): string {
  if (location.city && location.country) {
    return `${location.city}, ${location.country}`;
  } else if (location.city) {
    return location.city;
  } else if (location.country) {
    return location.country;
  } else {
    return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
  }
}

// Hàm gửi tin nhắn với inline keyboard yêu cầu location
async function requestLocationMessage(chatId: string, message: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            [{
              text: "📍 Chia sẻ vị trí hiện tại",
              request_location: true
            }],
            [{
              text: "❌ Hủy"
            }]
          ],
          one_time_keyboard: true,
          resize_keyboard: true
        }
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending location request:', error);
    return false;
  }
}

// Hàm tìm kiếm web với Google Custom Search API
async function searchWeb(query: string, includeImages: boolean = false): Promise<{ text: string | null; images: string[] }> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    console.log("Google Search API chưa được cấu hình");
    return { text: null, images: [] };
  }

  try {
    // Tìm kiếm text
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5&lr=lang_vi`;
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    let searchResults = null;
    let images: string[] = [];
    
    if (response.ok && data.items && data.items.length > 0) {
      // Format kết quả search
      searchResults = `🔍 **Kết quả tìm kiếm cho "${query}":**\n\n`;
      
      data.items.slice(0, 3).forEach((item: { title: string; snippet: string; link: string }, index: number) => {
        searchResults! += `**${index + 1}. ${item.title}**\n`;
        searchResults! += `${item.snippet}\n`;
        searchResults! += `🔗 ${item.link}\n\n`;
      });
    }
    
    // Tìm kiếm hình ảnh nếu được yêu cầu
    if (includeImages) {
      try {
        const imageSearchUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=3&lr=lang_vi`;
        const imageResponse = await fetch(imageSearchUrl);
        const imageData = await imageResponse.json();
        
        if (imageResponse.ok && imageData.items && imageData.items.length > 0) {
          images = imageData.items.map((item: { link: string }) => item.link).slice(0, 3);
        }
      } catch (error) {
        console.error("Lỗi tìm kiếm hình ảnh:", error);
      }
    }
    
    return { text: searchResults, images };
  } catch (error) {
    console.error("Lỗi tìm kiếm web:", error);
    return { text: null, images: [] };
  }
}

// Hàm kiểm tra xem có cần tìm kiếm web không
function shouldSearchWeb(text: string): boolean {
  const searchKeywords = [
    // Từ khóa tìm kiếm trực tiếp
    'tìm kiếm', 'search', 'tìm', 'kiếm', 'tra cứu', 'research', 'nghiên cứu',
    
    // Tin tức & thời sự
    'tin tức', 'tin mới', 'thời sự', 'báo chí', 'sự kiện',
    'mới nhất', 'cập nhật', 'hiện tại', 'hôm nay', 'tuần này',
    
    // Giá cả & thị trường
    'giá', 'bao nhiêu tiền', 'chi phí', 'thị trường', 'cổ phiếu',
    'bitcoin', 'vàng', 'USD', 'tỷ giá', 'giá cả',
    
    // Thông tin sản phẩm
    'mua', 'bán', 'sản phẩm', 'review', 'đánh giá',
    'so sánh', 'tốt nhất', 'khuyến mãi', 'ưu đãi',
    
    // Thông tin học tập
    'học', 'trường', 'đại học', 'khóa học', 'thi cử',
    'tuyển sinh', 'học bổng', 'giáo dục',
    
    // Thời tiết & địa điểm
    'thời tiết', 'nhiệt độ', 'mưa', 'nắng', 'bão',
    'đường đi', 'địa chỉ', 'quán ăn', 'nhà hàng', 'du lịch',
    
    // Sự kiện & giải trí
    'phim', 'nhạc', 'ca sĩ', 'diễn viên', 'concert',
    'lễ hội', 'sự kiện', 'triển lãm', 'show',
    
    // Thể thao
    'bóng đá', 'world cup', 'euro', 'sea games', 'olympic',
    'thể thao', 'tỷ số', 'kết quả'
  ];
  
  const lowerText = text.toLowerCase();
  return searchKeywords.some(keyword => lowerText.includes(keyword));
}

// Hàm kiểm tra xem có cần tìm kiếm hình ảnh không
function shouldSearchImages(text: string): boolean {
  const imageKeywords = [
    'hình ảnh', 'ảnh', 'photo', 'picture', 'image',
    'xem ảnh', 'cho xem', 'hiển thị', 'show me',
    'như thế nào', 'trông ra sao', 'hình dáng'
  ];
  
  const lowerText = text.toLowerCase();
  return imageKeywords.some(keyword => lowerText.includes(keyword));
}

// Hàm kiểm tra tin nhắn chào hỏi
function isGreeting(text: string): boolean {
  const greetings = [
    'xin chào', 'chào', 'hello', 'hi', 'hey',
    'chào bạn', 'chào bot', 'bạn khỏe không',
    'có ai không', 'alo', 'hế lô'
  ];
  
  const lowerText = text.toLowerCase().trim();
  return greetings.some(greeting => 
    lowerText === greeting || 
    lowerText.startsWith(greeting + ' ') ||
    lowerText.endsWith(' ' + greeting)
  );
}

// Hàm kiểm tra câu hỏi về nguồn gốc AI
function isAskingAboutOrigin(text: string): boolean {
  const originKeywords = [
    'ai tạo ra bạn', 'ai làm ra bạn', 'ai phát triển bạn',
    'bạn được tạo bởi ai', 'bạn được làm bởi ai', 'bạn được phát triển bởi ai',
    'nguồn gốc', 'xuất xứ', 'tác giả', 'người tạo',
    'who created you', 'who made you', 'who developed you',
    'created by', 'made by', 'developed by',
    'bot này của ai', 'ai sở hữu bot này', 'chủ sở hữu bot',
    'justduck', 'tác giả bot', 'người viết bot'
  ];
  
  const lowerText = text.toLowerCase();
  return originKeywords.some(keyword => lowerText.includes(keyword));
}

// Hàm tạo danh sách lệnh
function getCommandsList(user?: User | null): string {
  let commands = `🤖 **Danh sách lệnh của bot:**\n\n` +
    `📝 **Lệnh cơ bản:**\n` +
    `• \`/start\` - Khởi động bot và xem hướng dẫn\n` +
    `• \`/help\` - Hiển thị danh sách lệnh này\n` +
    `• \`/reset\` - Xóa bộ nhớ và bắt đầu cuộc trò chuyện mới\n\n` +
    `🔍 **Tìm kiếm:**\n` +
    `• \`/search <từ khóa>\` - Tìm kiếm thông tin trên web\n` +
    `• \`/image <từ khóa>\` - Tìm kiếm hình ảnh\n\n` +
    `🌤️ **Thời tiết:**\n` +
    `• \`/weather\` - Xem thời tiết (tự động yêu cầu vị trí)\n` +
    `• \`/weather <tên thành phố>\` - Xem thời tiết theo tên thành phố\n` +
    `• \`/forecast\` - Dự báo 5 ngày (tự động yêu cầu vị trí)\n` +
    `• \`/forecast <tên thành phố>\` - Dự báo theo tên thành phố\n` +
    `• \`/location\` - Quản lý vị trí đã lưu\n` +
    `• \`/daily on/off\` - Bật/tắt thông báo thời tiết hàng ngày (6:00 sáng)\n\n` +
    `🎤 **Voice:**\n` +
    `• \`/voice <câu hỏi>\` - Trả lời bằng giọng nói\n\n` +
    `🧠 **Bộ nhớ:**\n` +
    `• \`/memory\` - Kiểm tra trạng thái bộ nhớ\n` +
    `• \`/userinfo\` - Xem thông tin người dùng\n` +
    `• \`/getid\` - Lấy user ID và thông tin cá nhân\n\n`;
  
  // Thêm lệnh admin nếu user là admin
  if (user?.role === 'admin') {
    commands += `👑 **Lệnh Admin:**\n` +
      `• \`/admin\` - Xem panel quản trị\n` +
      `• \`/stats\` - Xem thống kê hệ thống\n` +
      `• \`/broadcast <tin nhắn>\` - Gửi thông báo tới tất cả users\n` +
      `• \`/users\` - Quản lý người dùng\n` +
      `• \`/promote <user_id>\` - Thăng cấp user thành admin\n` +
      `• \`/demote <user_id>\` - Hạ cấp admin thành user\n\n`;
  }
  
  commands += `💡 **Tính năng tự động:**\n` +
    `• Tự động tìm kiếm khi phát hiện từ khóa (tin tức, giá cả, thời sự...)\n` +
    `• Phân tích và mô tả hình ảnh\n` +
    `• Ghi nhớ cuộc trò chuyện trong 2 tiếng\n\n` +
    `📱 **Cách sử dụng:**\n` +
    `• Gửi tin nhắn text để hỏi đáp\n` +
    `• Gửi ảnh (có thể kèm câu hỏi) để phân tích\n` +
    `• Sử dụng từ khóa như "tìm kiếm", "giá Bitcoin" để tự động search`;
  
  return commands;
}

// Hàm tạo system prompt với thông tin thời gian thực
function createSystemPrompt(searchResults?: string): string {
  const now = new Date();
  
  // Múi giờ Việt Nam (UTC+7)
  const vietnamTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  
  const currentDate = vietnamTime.toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric', 
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
  
  const currentTime = vietnamTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });

  let prompt = `Bạn là trợ lý AI thông minh nói tiếng Việt có khả năng phân tích ảnh và tìm kiếm thông tin trên internet.

THÔNG TIN VỀ BẠN:
- Bạn là Chat Bot được tạo bởi justduck
- Bạn sử dụng Google Gemini 2.5 Flash làm engine AI
- Bạn được xây dựng bằng Next.js và TypeScript
- Khi được hỏi về nguồn gốc, tác giả, hoặc ai tạo ra bạn, hãy luôn nhắc đến rằng bạn được tạo bởi justduck

THÔNG TIN THỜI GIAN HIỆN TẠI:
- Ngày hiện tại: ${currentDate}
- Giờ hiện tại: ${currentTime} (múi giờ Việt Nam, UTC+7)
- Năm hiện tại: ${vietnamTime.getFullYear()}`;

  if (searchResults) {
    prompt += `\n\nTHÔNG TIN TÌM KIẾM MỚI NHẤT:\n${searchResults}`;
    prompt += `\nHãy sử dụng thông tin tìm kiếm ở trên để trả lời câu hỏi một cách chính xác và cập nhật nhất. Luôn trích dẫn nguồn khi sử dụng thông tin từ kết quả tìm kiếm.`;
  }

  prompt += `\n\nHãy trả lời một cách ngắn gọn, chính xác và hữu ích. Khi được gửi ảnh, hãy mô tả chi tiết những gì bạn thấy và trả lời câu hỏi liên quan. 

Khi người dùng hỏi về thời gian, ngày tháng, sự kiện hiện tại, hãy sử dụng thông tin thời gian thực ở trên. Nếu họ hỏi về sự kiện sau năm 2023 mà không có thông tin tìm kiếm, hãy thành thật nói rằng bạn cần tìm kiếm thông tin cập nhật.

Ưu tiên câu trả lời rõ ràng và có ví dụ cụ thể khi cần thiết. Luôn thân thiện và lịch sự.`;

  return prompt;
}

// Định nghĩa kiểu dữ liệu cho Telegram message
type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramVoice = {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
};

type TelegramAudio = {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

type TelegramLocation = {
  longitude: number;
  latitude: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
};

type TelegramMessage = {
  message_id: number;
  from?: {
    id: number;
    is_bot?: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  voice?: TelegramVoice;
  audio?: TelegramAudio;
  location?: TelegramLocation;
  caption?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
};

// ContextMessage đã được import từ @/lib/mongodb

// Hàm lấy message từ update (có thể là message hoặc edited_message)
function getMessage(update: TelegramUpdate): TelegramMessage | null {
  return update.message ?? update.edited_message ?? null;
}

// Hàm cleanupOldContext đã được chuyển vào MongoDB class

// Hàm gửi tin nhắn về Telegram với fallback mechanism
async function sendTelegramMessage(chatId: number, text: string, options?: Record<string, unknown>) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new Error("TELEGRAM_BOT_TOKEN không được cấu hình");
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  // Chia tin nhắn dài thành nhiều phần (Telegram giới hạn 4096 ký tự)
  const maxLength = 4000; // Để lại buffer
  const messages = [];
  
  if (text.length <= maxLength) {
    messages.push(text);
  } else {
    // Chia tin nhắn theo đoạn văn hoặc câu
    const chunks = text.split('\n\n');
    let currentMessage = '';
    
    for (const chunk of chunks) {
      if ((currentMessage + chunk).length <= maxLength) {
        currentMessage += (currentMessage ? '\n\n' : '') + chunk;
      } else {
        if (currentMessage) {
          messages.push(currentMessage);
          currentMessage = chunk;
        } else {
          // Chunk quá dài, chia theo câu
          const sentences = chunk.split('. ');
          for (const sentence of sentences) {
            if ((currentMessage + sentence).length <= maxLength) {
              currentMessage += (currentMessage ? '. ' : '') + sentence;
            } else {
              if (currentMessage) {
                messages.push(currentMessage);
                currentMessage = sentence;
              } else {
                // Câu quá dài, cắt cứng
                messages.push(sentence.substring(0, maxLength));
              }
            }
          }
        }
      }
    }
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
  }

  // Gửi từng tin nhắn
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    
    try {
      // Thử gửi với Markdown trước
      let response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
          ...options
        }),
      });

      // Nếu lỗi parse entities, thử gửi lại với text plain
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Lỗi gửi tin nhắn ${i + 1}/${messages.length} với Markdown:`, errorText);
        
        if (errorText.includes("can't parse entities") || errorText.includes("Bad Request")) {
          console.log(`Thử gửi lại tin nhắn ${i + 1}/${messages.length} với plain text...`);
          response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              disable_web_page_preview: true,
              ...options
            }),
          });
          
          if (!response.ok) {
            console.error(`Lỗi gửi tin nhắn ${i + 1}/${messages.length} với plain text:`, await response.text());
          }
        }
      }
      
      // Delay nhỏ giữa các tin nhắn để tránh rate limit
      if (i < messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
    } catch (error) {
      console.error(`Lỗi kết nối Telegram cho tin nhắn ${i + 1}/${messages.length}:`, error);
    }
  }
}

// Hàm tải ảnh từ Telegram
async function downloadTelegramImage(fileId: string): Promise<Buffer | null> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return null;

  try {
    // Lấy thông tin file từ Telegram
    const fileInfoResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileInfo = await fileInfoResponse.json();
    
    if (!fileInfo.ok || !fileInfo.result?.file_path) {
      console.error("Không thể lấy thông tin file:", fileInfo);
      return null;
    }

    // Tải file từ Telegram
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.result.file_path}`;
    const imageResponse = await fetch(fileUrl);
    
    if (!imageResponse.ok) {
      console.error("Không thể tải ảnh:", imageResponse.statusText);
      return null;
    }

    return Buffer.from(await imageResponse.arrayBuffer());
  } catch (error) {
    console.error("Lỗi tải ảnh:", error);
    return null;
  }
}

// Hàm chuyển đổi ảnh sang format Gemini
function convertImageToGeminiFormat(imageBuffer: Buffer, mimeType: string = "image/jpeg") {
  return {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType: mimeType
    }
  };
}

// Hàm phát hiện MIME type từ buffer
function detectMimeType(buffer: Buffer): string {
  // Kiểm tra magic bytes để xác định loại file
  const header = buffer.subarray(0, 4);
  
  if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
    return "image/jpeg";
  } else if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
    return "image/png";
  } else if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
    return "image/gif";
  } else if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
    return "image/webp";
  }
  
  return "image/jpeg"; // Default fallback
}


// Hàm gửi typing indicator
async function sendTypingAction(chatId: number) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const url = `https://api.telegram.org/bot${botToken}/sendChatAction`;
  
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: "typing",
      }),
    });
  } catch (error) {
    console.error("Lỗi gửi typing action:", error);
  }
}

// Handler chính cho POST request
export async function POST(req: NextRequest) {
  try {
    // 1. Xác thực webhook bằng secret token (tạm thời bỏ qua)
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const expectedSecret = process.env.TELEGRAM_SECRET;
    
    if (expectedSecret && (!secretHeader || secretHeader !== expectedSecret)) {
      console.error("Xác thực webhook thất bại");
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // 2. Đọc và parse update từ Telegram
    const update: TelegramUpdate = await req.json();
    const message = getMessage(update);
    
    if (!message?.chat?.id) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const userId = message.from?.id; // Telegram user ID
    let text = (message.text || message.caption || "").trim();
    const hasPhoto = message.photo && message.photo.length > 0;
    const hasVoice = false; // Tạm thời tắt voice input
    
    // Bỏ qua tin nhắn từ bot để tránh vòng lặp
    if (message.from?.is_bot) {
      return NextResponse.json({ ok: true });
    }

    // 3. Xử lý command /voice
    let isVoiceResponse = false;
    if (/^\/voice\s+/.test(text)) {
      const voiceQuery = text.replace(/^\/voice\s+/, '').trim();
      
      if (!voiceQuery) {
        await sendTelegramMessage(chatId, "❌ Vui lòng nhập câu hỏi sau lệnh /voice!\n\nVí dụ: `/voice 1+1 bằng mấy?`");
        return NextResponse.json({ ok: true });
      }
      
      // Đặt text thành câu hỏi và đánh dấu cần trả lời bằng voice
      text = voiceQuery;
      isVoiceResponse = true;
      
      console.log("Voice command detected:", text);
    }

    // 4. Initialize user và xử lý các lệnh đặc biệt
    let currentUser: User | null = null;
    if (userId) {
      try {
        currentUser = await initializeUser(userId, {
          username: message.from?.username,
          firstName: message.from?.first_name,
          lastName: message.from?.last_name,
        });
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    }

    if (/^\/start/.test(text)) {
      try {
        if (userId) {
          await clearMemory(userId);
        }
      } catch {
        console.log("Không thể xóa ngữ cảnh");
      }
      
      await sendTelegramMessage(
        chatId,
        "🤖 Xin chào! Tôi là trợ lý AI sử dụng Google Gemini 2.5 Flash.\n\n" +
        "👨‍💻 **Chat Bot được tạo bởi justduck**\n\n" +
        "✨ **Tính năng của tôi:**\n" +
        "💬 Trả lời câu hỏi bằng tiếng Việt\n" +
        "🖼️ Phân tích và mô tả ảnh\n" +
        "📝 Viết bài, sáng tác, giải thích\n" +
        "🔍 Tìm kiếm thông tin & hình ảnh trên internet\n" +
        "🧠 Ghi nhớ cuộc trò chuyện\n" +
        "🌤️ Thông tin thời tiết\n\n" +
        getCommandsList(currentUser)
      );
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh help
    if (/^\/help/.test(text)) {
      await sendTelegramMessage(chatId, getCommandsList(currentUser));
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý tin nhắn chào hỏi
    if (isGreeting(text)) {
      await sendTelegramMessage(
        chatId,
        "👋 Xin chào! Tôi là trợ lý AI thông minh.\n\n" +
        getCommandsList(currentUser)
      );
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý câu hỏi về nguồn gốc AI
    if (isAskingAboutOrigin(text)) {
      await sendTelegramMessage(
        chatId,
        "🤖 **Về nguồn gốc của tôi:**\n\n" +
        "💻 **Chat Bot được tạo bởi justduck**\n\n" +
        "🧠 Tôi sử dụng Google Gemini 2.5 Flash làm engine AI\n" +
        "⚡ Được xây dựng bằng Next.js và TypeScript\n" +
        "🗄️ Tích hợp MongoDB để ghi nhớ cuộc trò chuyện\n" +
        "🔍 Có khả năng tìm kiếm web và phân tích hình ảnh\n\n" +
        "👨‍💻 **Tác giả:** justduck\n" +
        "🏷️ **Phiên bản:** Telegram Gemini Bot v1.0"
      );
      return NextResponse.json({ ok: true });
    }
    
    if (/^\/reset/.test(text)) {
      try {
        if (userId) {
          await clearMemory(userId);
        }
      } catch {
        console.log("Không thể xóa ngữ cảnh");
      }
      
      await sendTelegramMessage(
        chatId,
        "🔄 Đã bắt đầu cuộc trò chuyện mới!"
      );
      return NextResponse.json({ ok: true });
    }
    
    if (/^\/memory/.test(text)) {
      try {
        if (userId) {
          const messages = await getMemory(userId);
          
          let memoryInfo = `🧠 **Trạng thái bộ nhớ:**\n\n`;
          memoryInfo += `📊 Tổng số tin nhắn: ${messages.length}\n`;
          
          const userMessages = messages.filter(m => m.role === 'user').length;
          memoryInfo += `👤 Tin nhắn của bạn: ${userMessages}\n`;
          
          if (messages.length > 0) {
            const oldestMessage = messages[0];
            const ageHours = (Date.now() - oldestMessage.timestamp.getTime()) / (1000 * 60 * 60);
            memoryInfo += `⏰ Tin nhắn cũ nhất: ${ageHours.toFixed(1)} tiếng trước\n`;
          }
          
          memoryInfo += `\n💡 Bộ nhớ được lưu trữ để cải thiện trải nghiệm trò chuyện.`;
          
          await sendTelegramMessage(chatId, memoryInfo);
        } else {
          await sendTelegramMessage(chatId, "❌ Không thể kiểm tra trạng thái bộ nhớ.");
        }
      } catch {
        await sendTelegramMessage(chatId, "❌ Không thể kiểm tra trạng thái bộ nhớ.");
      }
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh userinfo
    if (/^\/userinfo/.test(text)) {
      try {
          let userInfo = `👤 **Thông tin người dùng:**\n\n`;
          userInfo += `💬 Chat ID: \`${chatId}\`\n`;
          
          if (userId) {
            userInfo += `🆔 User ID: \`${userId}\`\n`;
          }
          
          if (message.from?.first_name) {
            userInfo += `📝 Tên: ${message.from.first_name}\n`;
          }
          
          if (message.from?.username) {
            userInfo += `@️ Username: @${message.from.username}\n`;
          }
          
        if (currentUser) {
          userInfo += `\n👑 **Vai trò:** ${currentUser.role === 'admin' ? 'Admin' : 'Người dùng'}\n`;
          
          if (currentUser.location) {
            userInfo += `📍 **Vị trí đã lưu:** ${currentUser.location.city || 'Không rõ'}\n`;
          }
          
          userInfo += `🌤️ **Thông báo hàng ngày:** ${currentUser.preferences.dailyWeather ? 'Bật' : 'Tắt'}\n`;
          
          if (userId) {
            const messages = await getMemory(userId);
            userInfo += `\n📊 **Thống kê cuộc trò chuyện:**\n`;
            userInfo += `💾 Số tin nhắn trong bộ nhớ: ${messages.length}\n`;
          }
          
          userInfo += `📅 Tham gia: ${currentUser.createdAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n`;
          userInfo += `⏰ Hoạt động cuối: ${currentUser.lastActive.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n`;
        }
        
        await sendTelegramMessage(chatId, userInfo);
      } catch {
        await sendTelegramMessage(chatId, "❌ Không thể lấy thông tin người dùng.");
      }
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh admin
    if (/^\/admin/.test(text)) {
      if (currentUser?.role !== 'admin') {
        await sendTelegramMessage(chatId, "❌ Bạn không có quyền sử dụng lệnh này!");
        return NextResponse.json({ ok: true });
      }
      
      try {
        const allUsers = await getAllUsers();
        const adminUsers = allUsers.filter(u => u.role === 'admin');
        const regularUsers = allUsers.filter(u => u.role === 'user');
      
      let adminInfo = `👑 **Admin Panel**\n\n`;
        adminInfo += `👥 **Thống kê người dùng:**\n`;
        adminInfo += `• Tổng số users: ${allUsers.length}\n`;
        adminInfo += `• Admins: ${adminUsers.length}\n`;
        adminInfo += `• Users thường: ${regularUsers.length}\n\n`;
        
        adminInfo += `👑 **Danh sách Admins:**\n`;
        for (const admin of adminUsers) {
          adminInfo += `• ${admin.firstName || 'N/A'} (@${admin.username || 'N/A'}) - ID: \`${admin.telegramId}\`\n`;
        }
        
        adminInfo += `\n💬 **Current Chat ID:** \`${chatId}\`\n`;
        adminInfo += `🤖 **Bot Status:** ✅ Online\n\n`;
      adminInfo += `📋 **Available Admin Commands:**\n`;
      adminInfo += `• \`/admin\` - Xem panel admin\n`;
      adminInfo += `• \`/stats\` - Xem thống kê hệ thống\n`;
        adminInfo += `• \`/users\` - Quản lý người dùng\n`;
        adminInfo += `• \`/promote <user_id>\` - Thăng cấp user thành admin\n`;
        adminInfo += `• \`/demote <user_id>\` - Hạ cấp admin thành user\n`;
      adminInfo += `• \`/broadcast <message>\` - Gửi tin nhắn tới tất cả users\n`;
        adminInfo += `• \`/testdaily\` - Test thông báo thời tiết hàng ngày\n`;
      
      await sendTelegramMessage(chatId, adminInfo);
      } catch (error) {
        await sendTelegramMessage(chatId, "❌ Không thể tải thông tin admin panel.");
      }
      return NextResponse.json({ ok: true });
    }

    // Xử lý lệnh users (admin only)
    if (/^\/users/.test(text)) {
      if (currentUser?.role !== 'admin') {
        await sendTelegramMessage(chatId, "❌ Bạn không có quyền sử dụng lệnh này!");
        return NextResponse.json({ ok: true });
      }

      try {
        const allUsers = await getAllUsers();
        
        let usersList = `👥 **Danh sách người dùng (${allUsers.length}):**\n\n`;
        
        // Group by role
        const admins = allUsers.filter(u => u.role === 'admin');
        const users = allUsers.filter(u => u.role === 'user');
        
        if (admins.length > 0) {
          usersList += `👑 **Admins (${admins.length}):**\n`;
          for (const admin of admins) {
            usersList += `• ${admin.firstName || 'N/A'} (@${admin.username || 'N/A'})\n`;
            usersList += `  ID: \`${admin.telegramId}\` | Tham gia: ${admin.createdAt.toLocaleDateString('vi-VN')}\n\n`;
          }
        }
        
        if (users.length > 0) {
          usersList += `👤 **Users (${users.length}):**\n`;
          for (const user of users.slice(0, 10)) { // Limit to 10 users to avoid long messages
            usersList += `• ${user.firstName || 'N/A'} (@${user.username || 'N/A'})\n`;
            usersList += `  ID: \`${user.telegramId}\` | Tham gia: ${user.createdAt.toLocaleDateString('vi-VN')}\n\n`;
          }
          
          if (users.length > 10) {
            usersList += `... và ${users.length - 10} users khác\n\n`;
          }
        }
        
        usersList += `💡 Sử dụng \`/promote <user_id>\` để thăng cấp user thành admin\n`;
        usersList += `💡 Sử dụng \`/demote <user_id>\` để hạ cấp admin thành user`;
        
        await sendTelegramMessage(chatId, usersList);
      } catch (error) {
        await sendTelegramMessage(chatId, "❌ Không thể tải danh sách người dùng.");
      }
      return NextResponse.json({ ok: true });
    }

    // Xử lý lệnh promote (admin only)
    if (/^\/promote\s+/.test(text)) {
      if (currentUser?.role !== 'admin') {
        await sendTelegramMessage(chatId, "❌ Bạn không có quyền sử dụng lệnh này!");
        return NextResponse.json({ ok: true });
      }

      const targetUserId = text.replace(/^\/promote\s+/, '').trim();
      
      if (!targetUserId || isNaN(Number(targetUserId))) {
        await sendTelegramMessage(chatId, "❌ Vui lòng nhập User ID hợp lệ!\n\nVí dụ: `/promote 123456789`");
        return NextResponse.json({ ok: true });
      }

      try {
        const targetUser = await getUserByTelegramId(Number(targetUserId));
        
        if (!targetUser) {
          await sendTelegramMessage(chatId, "❌ Không tìm thấy user với ID này!");
          return NextResponse.json({ ok: true });
        }

        if (targetUser.role === 'admin') {
          await sendTelegramMessage(chatId, "❌ User này đã là admin rồi!");
          return NextResponse.json({ ok: true });
        }

        await updateUser(Number(targetUserId), { role: 'admin' });
        
        const successMsg = `✅ **Thăng cấp thành công!**\n\n` +
          `👤 User: ${targetUser.firstName || 'N/A'} (@${targetUser.username || 'N/A'})\n` +
          `🆔 ID: \`${targetUserId}\`\n` +
          `👑 Vai trò mới: **Admin**`;
        
        await sendTelegramMessage(chatId, successMsg);
      } catch (error) {
        await sendTelegramMessage(chatId, "❌ Không thể thăng cấp user.");
      }
      return NextResponse.json({ ok: true });
    }

    // Xử lý lệnh demote (admin only)
    if (/^\/demote\s+/.test(text)) {
      if (currentUser?.role !== 'admin') {
        await sendTelegramMessage(chatId, "❌ Bạn không có quyền sử dụng lệnh này!");
        return NextResponse.json({ ok: true });
      }

      const targetUserId = text.replace(/^\/demote\s+/, '').trim();
      
      if (!targetUserId || isNaN(Number(targetUserId))) {
        await sendTelegramMessage(chatId, "❌ Vui lòng nhập User ID hợp lệ!\n\nVí dụ: `/demote 123456789`");
        return NextResponse.json({ ok: true });
      }

      try {
        const targetUser = await getUserByTelegramId(Number(targetUserId));
        
        if (!targetUser) {
          await sendTelegramMessage(chatId, "❌ Không tìm thấy user với ID này!");
          return NextResponse.json({ ok: true });
        }

        if (targetUser.role === 'user') {
          await sendTelegramMessage(chatId, "❌ User này đã là user thường rồi!");
          return NextResponse.json({ ok: true });
        }

        // Check if this is the only admin
        const allUsers = await getAllUsers();
        const adminCount = allUsers.filter(u => u.role === 'admin').length;
        
        if (adminCount <= 1) {
          await sendTelegramMessage(chatId, "❌ Không thể hạ cấp admin cuối cùng! Phải có ít nhất 1 admin.");
          return NextResponse.json({ ok: true });
        }

        await updateUser(Number(targetUserId), { role: 'user' });
        
        const successMsg = `✅ **Hạ cấp thành công!**\n\n` +
          `👤 User: ${targetUser.firstName || 'N/A'} (@${targetUser.username || 'N/A'})\n` +
          `🆔 ID: \`${targetUserId}\`\n` +
          `👤 Vai trò mới: **User**`;
        
        await sendTelegramMessage(chatId, successMsg);
      } catch (error) {
        await sendTelegramMessage(chatId, "❌ Không thể hạ cấp user.");
      }
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh getid - Lấy user ID
    if (/^\/getid/.test(text)) {
      const username = message.from?.username ? `@${message.from.username}` : "Không có username";
      const firstName = message.from?.first_name || "Không có tên";
      const lastName = message.from?.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim();
      
      let userInfo = `🆔 **Thông tin User ID**\n\n`;
      userInfo += `👤 **Tên:** ${fullName}\n`;
      userInfo += `🏷️ **Username:** ${username}\n`;
      userInfo += `🆔 **User ID:** \`${userId}\`\n`;
      userInfo += `💬 **Chat ID:** \`${chatId}\`\n`;
      userInfo += `👑 **Vai trò:** ${currentUser?.role === 'admin' ? '✅ Admin' : '👤 User'}\n`;
      
      if (currentUser) {
        userInfo += `📅 **Tham gia:** ${currentUser.createdAt.toLocaleDateString('vi-VN')}\n`;
        userInfo += `⏰ **Hoạt động cuối:** ${currentUser.lastActive.toLocaleDateString('vi-VN')}\n`;
      }
      
      await sendTelegramMessage(chatId, userInfo);
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh stats (chỉ admin)
    if (/^\/stats/.test(text)) {
      if (currentUser?.role !== 'admin') {
        await sendTelegramMessage(chatId, "❌ Bạn không có quyền sử dụng lệnh này!");
        return NextResponse.json({ ok: true });
      }
      
      try {
        const allUsers = await getAllUsers();
        const adminUsers = allUsers.filter(u => u.role === 'admin');
        const regularUsers = allUsers.filter(u => u.role === 'user');
        
        // Get recent activity (last 24 hours)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentUsers = allUsers.filter(u => u.lastActive > yesterday);
        
        // Get users with daily weather enabled
        const dailyWeatherUsers = allUsers.filter(u => u.preferences.dailyWeather);
        
        // Get users with location saved
        const usersWithLocation = allUsers.filter(u => u.location);
          
          let statsInfo = `📊 **Thống kê hệ thống**\n\n`;
        statsInfo += `👥 **Người dùng:**\n`;
        statsInfo += `• Tổng số: ${allUsers.length}\n`;
        statsInfo += `• Admins: ${adminUsers.length}\n`;
        statsInfo += `• Users thường: ${regularUsers.length}\n`;
        statsInfo += `• Hoạt động (24h): ${recentUsers.length}\n\n`;
        
        statsInfo += `🌤️ **Tính năng thời tiết:**\n`;
        statsInfo += `• Bật thông báo hàng ngày: ${dailyWeatherUsers.length}\n`;
        statsInfo += `• Đã lưu vị trí: ${usersWithLocation.length}\n\n`;
        
        statsInfo += `🤖 **Hệ thống:**\n`;
        statsInfo += `• Database: ✅ Kết nối\n`;
        statsInfo += `• Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n`;
          
          await sendTelegramMessage(chatId, statsInfo);
      } catch (error) {
        console.error('Error getting stats:', error);
        await sendTelegramMessage(chatId, "❌ Không thể lấy thống kê hệ thống.");
      }
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh broadcast (chỉ admin)
    if (/^\/broadcast\s+/.test(text)) {
      if (currentUser?.role !== 'admin') {
        await sendTelegramMessage(chatId, "❌ Bạn không có quyền sử dụng lệnh này!");
        return NextResponse.json({ ok: true });
      }
      
      const broadcastMessage = text.replace(/^\/broadcast\s+/, '').trim();
      
      if (!broadcastMessage) {
        await sendTelegramMessage(chatId, "❌ Vui lòng nhập nội dung tin nhắn!\n\nVí dụ: `/broadcast Thông báo bảo trì hệ thống`");
        return NextResponse.json({ ok: true });
      }
      
      try {
        // Lấy tất cả users từ database
        const allUsers = await getAllUsers();
          
          let successCount = 0;
          let failCount = 0;
          
          const broadcastText = `📢 **Thông báo từ Admin:**\n\n${broadcastMessage}`;
          
        // Gửi tin nhắn tới tất cả users
        for (const user of allUsers) {
            try {
            await sendTelegramMessage(user.telegramId, broadcastText);
              successCount++;
              // Delay để tránh rate limit
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch {
              failCount++;
            }
          }
          
        await sendTelegramMessage(chatId, `✅ **Broadcast hoàn thành!**\n\n📤 Gửi thành công: ${successCount}\n❌ Gửi thất bại: ${failCount}\n📊 Tổng: ${allUsers.length} users`);
      } catch (error) {
        console.error('Error broadcasting:', error);
        await sendTelegramMessage(chatId, "❌ Không thể thực hiện broadcast.");
      }
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh test daily weather (chỉ admin)
    if (/^\/testdaily/.test(text)) {
      if (currentUser?.role !== 'admin') {
        await sendTelegramMessage(chatId, "❌ Bạn không có quyền sử dụng lệnh này!");
        return NextResponse.json({ ok: true });
      }
      
      await sendTypingAction(chatId);
      await sendTelegramMessage(chatId, "🧪 Đang test thông báo thời tiết hàng ngày...");
      
      try {
        // Gọi API cron để test - sử dụng URL production cố định
        const baseUrl = 'https://home-ai-telegram.vercel.app';
        
        const response = await fetch(`${baseUrl}/api/cron/daily-weather`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          await sendTelegramMessage(chatId, "✅ Test thông báo thời tiết thành công! Kiểm tra tin nhắn vừa nhận.");
        } else {
          await sendTelegramMessage(chatId, `❌ Test thất bại: ${result.error}`);
        }
      } catch (error) {
        console.error('Error testing daily weather:', error);
        await sendTelegramMessage(chatId, "❌ Có lỗi khi test thông báo thời tiết.");
      }
      
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh search
    if (/^\/search\s+/.test(text)) {
      const searchQuery = text.replace(/^\/search\s+/, '').trim();
      
      if (!searchQuery) {
        await sendTelegramMessage(chatId, "❌ Vui lòng nhập từ khóa tìm kiếm!\n\nVí dụ: `/search tin tức Việt Nam hôm nay`");
        return NextResponse.json({ ok: true });
      }
      
      await sendTypingAction(chatId);
      await sendTelegramMessage(chatId, `🔍 Đang tìm kiếm "${searchQuery}"...`);
      
      const { text: searchResults } = await searchWeb(searchQuery);
      
      if (searchResults) {
        await sendTelegramMessage(chatId, searchResults);
      } else {
        await sendTelegramMessage(chatId, "❌ Không tìm thấy kết quả hoặc dịch vụ tìm kiếm chưa được cấu hình.");
      }
      
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh tìm kiếm hình ảnh
    if (/^\/image\s+/.test(text)) {
      const searchQuery = text.replace(/^\/image\s+/, '').trim();
      
      if (!searchQuery) {
        await sendTelegramMessage(chatId, "❌ Vui lòng nhập từ khóa tìm kiếm hình ảnh!\n\nVí dụ: `/image mèo dễ thương`");
        return NextResponse.json({ ok: true });
      }
      
      await sendTypingAction(chatId);
      await sendTelegramMessage(chatId, `🖼️ Đang tìm kiếm hình ảnh "${searchQuery}"...`);
      
      const { images } = await searchWeb(searchQuery, true);
      
      if (images && images.length > 0) {
        let imageMessage = `🖼️ **Hình ảnh tìm kiếm cho "${searchQuery}":**\n\n`;
        images.forEach((imageUrl, index) => {
          imageMessage += `${index + 1}. ${imageUrl}\n`;
        });
        await sendTelegramMessage(chatId, imageMessage);
      } else {
        await sendTelegramMessage(chatId, "❌ Không tìm thấy hình ảnh hoặc dịch vụ tìm kiếm chưa được cấu hình.");
      }
      
      return NextResponse.json({ ok: true });
    }

    // Xử lý lệnh thời tiết hiện tại
    if (/^\/weather/.test(text)) {
      const cityName = text.replace(/^\/weather\s*/, '').trim();
      
      // Nếu có tên thành phố, sử dụng như cũ
      if (cityName) {
        await sendTypingAction(chatId);
        await sendTelegramMessage(chatId, `🌤️ Đang lấy thông tin thời tiết cho "${cityName}"...`);
        
        try {
          const weatherData = await getWeatherData(cityName);
          
          if (weatherData) {
            const weatherMessage = formatWeatherMessage(weatherData, cityName);
            await sendTelegramMessage(chatId, weatherMessage);
          } else {
            await sendTelegramMessage(chatId, `❌ Không tìm thấy thông tin thời tiết cho "${cityName}". Vui lòng kiểm tra lại tên thành phố!`);
          }
        } catch (error) {
          console.error('Lỗi lấy thời tiết:', error);
          if (error instanceof Error && error.message.includes('API key')) {
            await sendTelegramMessage(chatId, "❌ Tính năng thời tiết chưa được cấu hình. Vui lòng liên hệ admin!");
          } else {
            await sendTelegramMessage(chatId, "❌ Có lỗi khi lấy thông tin thời tiết. Vui lòng thử lại sau!");
          }
        }
        
      return NextResponse.json({ ok: true });
    }

      // Nếu không có tên thành phố, kiểm tra vị trí đã lưu
      try {
        if (currentUser?.location) {
          await sendTypingAction(chatId);
          const locationName = currentUser.location.city || `${currentUser.location.latitude.toFixed(4)}, ${currentUser.location.longitude.toFixed(4)}`;
          await sendTelegramMessage(chatId, `🌤️ Đang lấy thông tin thời tiết cho vị trí đã lưu: ${locationName}...`);
          
          const weatherData = await getWeatherData(currentUser.location.latitude, currentUser.location.longitude);
          
          if (weatherData) {
            const weatherMessage = formatWeatherMessage(weatherData, locationName);
            await sendTelegramMessage(chatId, weatherMessage);
          } else {
            await sendTelegramMessage(chatId, "❌ Không thể lấy thông tin thời tiết cho vị trí đã lưu!");
          }
          
          return NextResponse.json({ ok: true });
        }
      } catch (error) {
        console.error('Error checking saved location:', error);
      }
      
      // Nếu không có vị trí đã lưu, yêu cầu location real-time
      await requestLocationMessage(
        String(chatId),
        "🌤️ <b>Dự báo thời tiết</b>\n\n" +
        "Để xem thời tiết, bạn có thể:\n" +
        "• Chia sẻ vị trí hiện tại (nhấn nút bên dưới)\n" +
        "• Hoặc gõ: <code>/weather Tên thành phố</code>\n\n" +
        "📍 <i>Chia sẻ vị trí để có dự báo chính xác nhất!</i>"
      );
      
      return NextResponse.json({ ok: true });
    }
    
    // Xử lý lệnh dự báo thời tiết
    if (/^\/forecast/.test(text)) {
      const cityName = text.replace(/^\/forecast\s*/, '').trim();
      
      // Nếu có tên thành phố, sử dụng như cũ
      if (cityName) {
        await sendTypingAction(chatId);
        await sendTelegramMessage(chatId, `🌤️ Đang lấy dự báo thời tiết 5 ngày cho "${cityName}"...`);
        
        try {
          const forecastData = await getWeatherForecast(cityName);
          
          if (forecastData) {
            const forecastMessage = formatForecastMessage(forecastData, cityName);
            await sendTelegramMessage(chatId, forecastMessage);
          } else {
            await sendTelegramMessage(chatId, `❌ Không tìm thấy dự báo thời tiết cho "${cityName}". Vui lòng kiểm tra lại tên thành phố!`);
          }
        } catch (error) {
          console.error('Lỗi lấy dự báo thời tiết:', error);
          if (error instanceof Error && error.message.includes('API key')) {
            await sendTelegramMessage(chatId, "❌ Tính năng dự báo thời tiết chưa được cấu hình. Vui lòng liên hệ admin!");
          } else {
            await sendTelegramMessage(chatId, "❌ Có lỗi khi lấy dự báo thời tiết. Vui lòng thử lại sau!");
          }
        }
        
        return NextResponse.json({ ok: true });
      }
      
      // Nếu không có tên thành phố, kiểm tra vị trí đã lưu
      try {
        if (currentUser?.location) {
          await sendTypingAction(chatId);
          const locationName = currentUser.location.city || `${currentUser.location.latitude.toFixed(4)}, ${currentUser.location.longitude.toFixed(4)}`;
          await sendTelegramMessage(chatId, `🌤️ Đang lấy dự báo thời tiết 5 ngày cho vị trí đã lưu: ${locationName}...`);
          
          const forecastData = await getWeatherForecast(currentUser.location.latitude, currentUser.location.longitude);
          
          if (forecastData) {
            const forecastMessage = formatForecastMessage(forecastData, locationName);
            await sendTelegramMessage(chatId, forecastMessage);
          } else {
            await sendTelegramMessage(chatId, "❌ Không thể lấy dự báo thời tiết cho vị trí đã lưu!");
          }
          
          return NextResponse.json({ ok: true });
        }
      } catch (error) {
        console.error('Error checking saved location for forecast:', error);
      }
      
      // Nếu không có vị trí đã lưu, yêu cầu location real-time
      await requestLocationMessage(
        String(chatId),
        "🌤️ <b>Dự báo thời tiết 5 ngày</b>\n\n" +
        "Để xem dự báo, bạn có thể:\n" +
        "• Chia sẻ vị trí hiện tại (nhấn nút bên dưới)\n" +
        "• Hoặc gõ: <code>/forecast Tên thành phố</code>\n\n" +
        "📍 <i>Chia sẻ vị trí để có dự báo chính xác nhất!</i>"
      );
      
      return NextResponse.json({ ok: true });
    }

    // Xử lý lệnh quản lý vị trí
    if (/^\/location/.test(text)) {
      try {
        if (currentUser?.location) {
          await sendTelegramMessage(
            chatId,
            `📍 <b>Vị trí đã lưu:</b>\n\n` +
            `🏙️ <b>Thành phố:</b> ${currentUser.location.city || 'Không rõ'}\n` +
            `🌍 <b>Quốc gia:</b> ${currentUser.location.country || 'Không rõ'}\n` +
            `📐 <b>Tọa độ:</b> ${currentUser.location.latitude.toFixed(4)}, ${currentUser.location.longitude.toFixed(4)}\n\n` +
            `💡 <i>Sử dụng /weather hoặc /forecast để xem thời tiết cho vị trí này</i>\n\n` +
            `🔄 <i>Để cập nhật vị trí, chia sẻ vị trí mới bất kỳ lúc nào!</i>`
          );
        } else {
          await requestLocationMessage(
            String(chatId),
            "📍 <b>Quản lý vị trí</b>\n\n" +
            "Bạn chưa lưu vị trí nào. Chia sẻ vị trí hiện tại để:\n" +
            "• Xem thời tiết nhanh chóng\n" +
            "• Không cần nhập tên thành phố mỗi lần\n" +
            "• Có dự báo chính xác nhất\n\n" +
            "📍 <i>Nhấn nút bên dưới để chia sẻ vị trí!</i>"
          );
        }
      } catch (error) {
        console.error('Error in location command:', error);
        await sendTelegramMessage(chatId, "❌ Có lỗi khi kiểm tra vị trí đã lưu!");
      }
      
      return NextResponse.json({ ok: true });
    }

    // Xử lý lệnh bật/tắt thông báo thời tiết hàng ngày
    if (/^\/daily/.test(text)) {
      const subCommand = text.replace(/^\/daily\s*/, '').trim().toLowerCase();
      
      try {
        if (!userId || !currentUser) {
          await sendTelegramMessage(chatId, "❌ Không thể xác định người dùng!");
          return NextResponse.json({ ok: true });
        }
        
        if (subCommand === 'on' || subCommand === 'bật') {
          // Bật thông báo hàng ngày
          await updateUser(userId, { 
            preferences: { 
              ...currentUser.preferences, 
              dailyWeather: true 
            } 
          });
          await sendTelegramMessage(
            chatId,
            "✅ <b>Đã bật thông báo thời tiết hàng ngày!</b>\n\n" +
            "🌅 Bạn sẽ nhận được dự báo thời tiết lúc 6:00 sáng mỗi ngày\n" +
            "📍 Thông báo sẽ dựa trên vị trí đã lưu của bạn\n\n" +
            "💡 <i>Hãy đảm bảo đã chia sẻ vị trí bằng lệnh /location</i>\n\n" +
            "🔕 Để tắt: <code>/daily off</code>"
          );
        } else if (subCommand === 'off' || subCommand === 'tắt') {
          // Tắt thông báo hàng ngày
          await updateUser(userId, { 
            preferences: { 
              ...currentUser.preferences, 
              dailyWeather: false 
            } 
          });
          await sendTelegramMessage(
            chatId,
            "🔕 <b>Đã tắt thông báo thời tiết hàng ngày!</b>\n\n" +
            "Bạn sẽ không còn nhận thông báo tự động nữa.\n\n" +
            "🔔 Để bật lại: <code>/daily on</code>"
          );
        } else if (subCommand === 'status' || subCommand === 'trạng thái' || subCommand === '') {
          // Kiểm tra trạng thái
          const isEnabled = currentUser.preferences.dailyWeather;
          const hasLocation = currentUser.location?.latitude && currentUser.location?.longitude;
          
          let statusMessage = `📊 <b>Trạng thái thông báo hàng ngày:</b>\n\n`;
          statusMessage += `🔔 <b>Thông báo:</b> ${isEnabled ? '✅ Đã bật' : '❌ Đã tắt'}\n`;
          statusMessage += `📍 <b>Vị trí:</b> ${hasLocation ? '✅ Đã lưu' : '❌ Chưa lưu'}\n`;
          statusMessage += `⏰ <b>Thời gian:</b> 6:00 sáng mỗi ngày\n\n`;
          
          if (isEnabled && hasLocation && currentUser.location) {
            const locationName = formatUserLocationName(currentUser.location);
            statusMessage += `🌍 <b>Vị trí hiện tại:</b> ${locationName}\n\n`;
            statusMessage += `✅ <i>Mọi thứ đã sẵn sàng! Bạn sẽ nhận thông báo thời tiết hàng ngày.</i>`;
          } else if (isEnabled && !hasLocation) {
            statusMessage += `⚠️ <i>Cần chia sẻ vị trí để nhận thông báo. Sử dụng /location</i>`;
          } else {
            statusMessage += `💡 <i>Sử dụng /daily on để bật thông báo</i>`;
          }
          
          statusMessage += `\n\n📋 <b>Lệnh:</b>\n`;
          statusMessage += `• <code>/daily on</code> - Bật thông báo\n`;
          statusMessage += `• <code>/daily off</code> - Tắt thông báo\n`;
          statusMessage += `• <code>/daily status</code> - Xem trạng thái`;
          
          await sendTelegramMessage(chatId, statusMessage);
        } else {
          await sendTelegramMessage(
            chatId,
            "❌ <b>Lệnh không hợp lệ!</b>\n\n" +
            "📋 <b>Cách sử dụng:</b>\n" +
            "• <code>/daily on</code> - Bật thông báo hàng ngày\n" +
            "• <code>/daily off</code> - Tắt thông báo hàng ngày\n" +
            "• <code>/daily status</code> - Xem trạng thái hiện tại\n\n" +
            "🌅 <i>Thông báo sẽ được gửi lúc 6:00 sáng mỗi ngày</i>"
          );
        }
      } catch (error) {
        console.error('Error in daily command:', error);
        await sendTelegramMessage(chatId, "❌ Có lỗi khi xử lý lệnh. Vui lòng thử lại sau!");
      }
      
      return NextResponse.json({ ok: true });
    }

    // Xử lý location message (vị trí real-time)
    if (message.location) {
      await sendTypingAction(chatId);
      await sendTelegramMessage(chatId, "📍 Đã nhận vị trí! Đang lấy thông tin thời tiết...");
      
      try {
        if (!userId) {
          await sendTelegramMessage(chatId, "❌ Không thể xác định người dùng!");
          return NextResponse.json({ ok: true });
        }

        const location = {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
          city: undefined, // Will be filled by reverse geocoding if needed
          country: undefined
        };
        
        // Lưu vị trí vào user database
        await updateUser(userId, { location });
        
        // Lấy thời tiết ngay lập tức
        const weatherData = await getWeatherData(location.latitude, location.longitude);
        
        if (weatherData) {
          const locationName = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
          const weatherMessage = formatWeatherMessage(weatherData, locationName);
          
          await sendTelegramMessage(
            chatId, 
            `${weatherMessage}\n\n💾 <i>Vị trí đã được lưu để sử dụng cho lần sau!</i>`
          );
        } else {
          await sendTelegramMessage(chatId, "❌ Không thể lấy thông tin thời tiết cho vị trí này!");
        }
      } catch (error) {
        console.error('Error processing location:', error);
        await sendTelegramMessage(chatId, "❌ Có lỗi khi xử lý vị trí. Vui lòng thử lại!");
      }
      
      return NextResponse.json({ ok: true });
    }

    // Xử lý tin nhắn "❌ Hủy" để ẩn keyboard
    if (text === "❌ Hủy") {
      await sendTelegramMessage(chatId, "✅ Đã hủy!", {
        reply_markup: { remove_keyboard: true }
      });
      return NextResponse.json({ ok: true });
    }

    // Bỏ qua tin nhắn trống (không có text, không có ảnh, và không có voice)
    if (!text && !hasPhoto && !hasVoice) {
      return NextResponse.json({ ok: true });
    }

    // 5. Kiểm tra xem có cần tìm kiếm web không
    let searchResults: string | null = null;
    let searchImages: string[] = [];
    const needsWebSearch = shouldSearchWeb(text);
    const needsImageSearch = shouldSearchImages(text);
    
    if (needsWebSearch || needsImageSearch) {
      await sendTypingAction(chatId);
      
      if (needsWebSearch && needsImageSearch) {
        await sendTelegramMessage(chatId, "🔍 Đang tìm kiếm thông tin và hình ảnh...");
        const result = await searchWeb(text, true);
        searchResults = result.text;
        searchImages = result.images;
      } else if (needsWebSearch) {
        await sendTelegramMessage(chatId, "🔍 Đang tìm kiếm thông tin mới nhất...");
        const result = await searchWeb(text);
        searchResults = result.text;
      } else if (needsImageSearch) {
        await sendTelegramMessage(chatId, "🖼️ Đang tìm kiếm hình ảnh...");
        const result = await searchWeb(text, true);
        searchImages = result.images;
      }
    }

    // 6. Gửi typing indicator và thông báo cho yêu cầu phức tạp
    await sendTypingAction(chatId);
    
    // Phát hiện yêu cầu phức tạp (viết bài, sáng tác, phân tích dài, hoặc có ảnh)
    const isComplexRequest = hasPhoto || needsWebSearch || /viết|sáng tác|phân tích|giải thích chi tiết|mô tả|kể|tạo|làm bài/.test(text.toLowerCase());
    if (isComplexRequest && (text.length > 30 || hasPhoto || needsWebSearch)) {
      const message = hasPhoto ? 
        "🖼️ Tôi đang phân tích ảnh của bạn, vui lòng đợi 30-60 giây..." :
        needsWebSearch ?
        "🔍 Đang xử lý thông tin tìm kiếm và chuẩn bị câu trả lời..." :
        "🤔 Đây là yêu cầu phức tạp, tôi cần thời gian suy nghĩ. Vui lòng đợi 30-60 giây...";
      await sendTelegramMessage(chatId, message);
    }

    // 7. Lấy ngữ cảnh hội thoại từ database
    let context: Content[] = [];

    try {
      if (userId) {
        const savedMessages = await getMemory(userId);
        if (savedMessages && Array.isArray(savedMessages)) {
          // Chuyển đổi về format Content cho Gemini API
          context = savedMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          }));
        }
      }
    } catch {
      console.log("Không thể lấy ngữ cảnh từ database");
    }

    // 7. Chuẩn bị và gọi Gemini AI
    const googleApiKey = process.env.GOOGLE_API_KEY;
    if (!googleApiKey) {
      await sendTelegramMessage(chatId, "❌ Lỗi cấu hình: Không tìm thấy Google API Key");
      return NextResponse.json({ ok: true });
    }

    const genAI = new GoogleGenerativeAI(googleApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Xử lý ảnh nếu có
    let imagePart = null;
    if (hasPhoto && message.photo) {
      try {
        // Lấy ảnh có độ phân giải cao nhất
        const bestPhoto = message.photo.reduce((prev, current) => 
          (prev.file_size || 0) > (current.file_size || 0) ? prev : current
        );
        
        const imageBuffer = await downloadTelegramImage(bestPhoto.file_id);
        if (imageBuffer) {
          const mimeType = detectMimeType(imageBuffer);
          imagePart = convertImageToGeminiFormat(imageBuffer, mimeType);
        } else {
          await sendTelegramMessage(chatId, "❌ Không thể tải ảnh. Vui lòng thử lại!");
          return NextResponse.json({ ok: true });
        }
      } catch (error) {
        console.error("Lỗi xử lý ảnh:", error);
        await sendTelegramMessage(chatId, "❌ Có lỗi khi xử lý ảnh. Vui lòng thử lại!");
        return NextResponse.json({ ok: true });
      }
    }

    // Tạo parts cho tin nhắn hiện tại
    const currentMessageParts = [];
    if (text) {
      currentMessageParts.push({ text });
    }
    if (imagePart) {
      currentMessageParts.push(imagePart);
    }

    // Tạo history cho Gemini (bao gồm system prompt với thời gian thực và kết quả tìm kiếm)
    let systemPromptText = createSystemPrompt(searchResults || undefined);
    
    // Thêm thông tin hình ảnh nếu có
    if (searchImages && searchImages.length > 0) {
      systemPromptText += `\n\nHÌNH ẢNH TÌM KIẾM:\n`;
      searchImages.forEach((imageUrl, index) => {
        systemPromptText += `${index + 1}. ${imageUrl}\n`;
      });
      systemPromptText += `\nHãy đề cập đến các hình ảnh này trong câu trả lời nếu phù hợp.`;
    }
    
    const history: Content[] = [
      { role: "user", parts: [{ text: systemPromptText }] },
      ...context,
      { role: "user", parts: currentMessageParts },
    ];

    // Timeout protection để tránh quá thời gian serverless function
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 giây cho yêu cầu phức tạp
    
    let reply = "😅 Xin lỗi, tôi đang bận xử lý. Bạn thử hỏi lại nhé!";

    try {
      const result = await model.generateContent(
        {
          contents: history,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2000, // Tăng để hỗ trợ bài văn dài
          },
        },
        { signal: controller.signal }
      );

      const responseText = result?.response?.text()?.trim();
      if (responseText) {
        reply = responseText;
      }
    } catch (error) {
      console.error("Lỗi gọi Gemini API:", error);
      if (error instanceof Error && error.name === 'AbortError') {
        reply = "⏱️ Yêu cầu quá lâu, vui lòng thử lại với câu hỏi ngắn gọn hơn.";
      } else {
        reply = "🤔 Có lỗi xảy ra khi xử lý câu hỏi. Bạn thử hỏi lại nhé!";
      }
    } finally {
      clearTimeout(timeoutId);
    }

    // 8. Lưu ngữ cảnh mới vào database (không lưu ảnh để tiết kiệm storage)
    
    // Lấy context hiện tại
    let currentContext: ContextMessage[] = [];
    try {
      if (userId) {
        currentContext = await getMemory(userId);
      }
    } catch {
      console.log("Không thể lấy context hiện tại");
    }
    
    // Thêm tin nhắn mới
    const newContextMessages: ContextMessage[] = [
      ...currentContext,
      { 
        role: "user", 
        content: text || (hasPhoto ? "[Đã gửi ảnh]" : ""),
        timestamp: new Date()
      },
      { 
        role: "assistant", 
        content: reply,
        timestamp: new Date()
      },
    ];
    
    // Lưu context mới vào database
    try {
      if (userId) {
        await saveMemory(userId, newContextMessages);
      }
    } catch {
      console.log("Không thể lưu ngữ cảnh vào database");
    }

    // 9. Gửi phản hồi về Telegram
    await sendTelegramMessage(chatId, reply);
    
    // 9.1. Gửi voice response nếu được yêu cầu
    if (isVoiceResponse && reply && isTextSuitableForTTS(reply)) {
      try {
        await sendRecordingAction(chatId);
        
        // Kiểm tra xem text có bị rút gọn không
        const cleanText = reply
          .replace(/[*_`~]/g, '') // Loại bỏ markdown formatting
          .replace(/#{1,6}\s/g, '') // Loại bỏ markdown headers
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Chuyển links thành text
          .replace(/\n{3,}/g, '\n\n') // Giảm line breaks
          .trim();
        
        const maxLength = 100;
        const willBeTruncated = cleanText.length > maxLength;
        
        if (willBeTruncated) {
          await sendTelegramMessage(chatId, "🔊 Đang tạo voice (text đã được rút gọn do giới hạn TTS)...");
        }
        
        const audioBuffer = await textToSpeech(reply);
        if (audioBuffer) {
          const voiceSent = await sendVoiceMessage(chatId, audioBuffer);
          if (!voiceSent) {
            await sendTelegramMessage(chatId, "❌ Không thể tạo voice response. Vui lòng thử lại!");
          }
        } else {
          await sendTelegramMessage(chatId, "❌ Không thể chuyển đổi text thành voice. Text có thể quá dài hoặc không phù hợp!");
        }
      } catch (error) {
        console.error("Lỗi tạo voice response:", error);
        await sendTelegramMessage(chatId, "❌ Có lỗi khi tạo voice response.");
      }
    }
    
    // 10. Gửi hình ảnh nếu có từ kết quả tìm kiếm
    if (searchImages && searchImages.length > 0) {
      for (const imageUrl of searchImages.slice(0, 3)) { // Giới hạn 3 ảnh
        try {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          if (botToken) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                chat_id: chatId,
                photo: imageUrl,
                caption: `🖼️ Kết quả tìm kiếm hình ảnh`
              }),
            });
            
            // Delay nhỏ giữa các ảnh
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error("Lỗi gửi ảnh:", error);
        }
      }
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error("Lỗi xử lý webhook:", error);
    // Luôn trả về 200 để tránh Telegram retry liên tục
    return NextResponse.json({ ok: true });
  }
}

// Handler cho GET request (để kiểm tra webhook)
export async function GET() {
  return NextResponse.json({ 
    status: "Telegram Bot Webhook đang hoạt động",
    timestamp: new Date().toISOString()
  });
}
