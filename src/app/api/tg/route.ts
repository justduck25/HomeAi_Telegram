import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";
import { mongodb, type ContextMessage } from "@/lib/mongodb";

// Sử dụng Node.js runtime để tương thích với SDK
export const runtime = "nodejs";

// System prompt tiếng Việt
const SYS_PROMPT =
  "Bạn là trợ lý AI thông minh nói tiếng Việt có khả năng phân tích ảnh. Hãy trả lời một cách ngắn gọn, chính xác và hữu ích. Khi được gửi ảnh, hãy mô tả chi tiết những gì bạn thấy và trả lời câu hỏi liên quan. Ưu tiên câu trả lời rõ ràng và có ví dụ cụ thể khi cần thiết. Luôn thân thiện và lịch sự.";

// Định nghĩa kiểu dữ liệu cho Telegram message
type TelegramPhotoSize = {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
};

type TelegramMessage = {
  message_id: number;
  from?: {
    id: number;
    is_bot?: boolean;
    first_name: string;
    username?: string;
  };
  chat: {
    id: number;
    type: string;
  };
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
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
async function sendTelegramMessage(chatId: number, text: string) {
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
    const text = (message.text || message.caption || "").trim();
    const hasPhoto = message.photo && message.photo.length > 0;
    
    // Bỏ qua tin nhắn từ bot để tránh vòng lặp
    if (message.from?.is_bot) {
      return NextResponse.json({ ok: true });
    }

    // 3. Xử lý các lệnh đặc biệt
    if (/^\/start/.test(text)) {
      try {
        if (mongodb.isAvailable()) {
          await mongodb.clearContext(chatId.toString());
        }
      } catch {
        console.log("Không thể xóa ngữ cảnh từ MongoDB");
      }
      
      await sendTelegramMessage(
        chatId,
        "🤖 Xin chào! Tôi là trợ lý AI sử dụng Google Gemini 2.5 Flash.\n\n" +
        "✨ **Tính năng của tôi:**\n" +
        "💬 Trả lời câu hỏi bằng tiếng Việt\n" +
        "🖼️ Phân tích và mô tả ảnh\n" +
        "📝 Viết bài, sáng tác, giải thích\n" +
        (mongodb.isAvailable() ? "🧠 Ghi nhớ cuộc trò chuyện trong 2 tiếng\n" : "") + "\n" +
        "**Cách sử dụng:**\n" +
        "• Gửi tin nhắn text để hỏi đáp\n" +
        "• Gửi ảnh (có thể kèm câu hỏi) để phân tích\n" +
        "• Tôi sẽ nhớ những gì bạn hỏi trong 2 tiếng qua\n\n" +
        "**Lệnh hữu ích:**\n" +
        "📝 `/reset` - Xóa bộ nhớ và bắt đầu mới\n" +
        "🧠 `/memory` - Kiểm tra trạng thái bộ nhớ"
      );
      return NextResponse.json({ ok: true });
    }
    
    if (/^\/reset/.test(text)) {
      try {
        if (mongodb.isAvailable()) {
          await mongodb.clearContext(chatId.toString());
        }
      } catch {
        console.log("Không thể xóa ngữ cảnh từ MongoDB");
      }
      
      await sendTelegramMessage(
        chatId,
        "🔄 Đã bắt đầu cuộc trò chuyện mới!"
      );
      return NextResponse.json({ ok: true });
    }
    
    if (/^\/memory/.test(text)) {
      try {
        if (mongodb.isAvailable()) {
          const stats = await mongodb.getMemoryStats(chatId.toString());
          
          let memoryInfo = `🧠 **Trạng thái bộ nhớ:**\n\n`;
          memoryInfo += `📊 Tổng số tin nhắn: ${stats.totalMessages}\n`;
          memoryInfo += `👤 Tin nhắn của bạn: ${stats.userMessages}\n`;
          if (stats.oldestMessageTime) {
            const ageHours = (Date.now() - stats.oldestMessageTime) / (1000 * 60 * 60);
            memoryInfo += `⏰ Tin nhắn cũ nhất: ${ageHours.toFixed(1)} tiếng trước\n`;
          }
          memoryInfo += `\n💡 Tôi sẽ tự động xóa tin nhắn cũ hơn 2 tiếng.`;
          
          await sendTelegramMessage(chatId, memoryInfo);
        } else {
          await sendTelegramMessage(chatId, "❌ Tính năng bộ nhớ chưa được kích hoạt (cần MongoDB database).");
        }
      } catch {
        await sendTelegramMessage(chatId, "❌ Không thể kiểm tra trạng thái bộ nhớ.");
      }
      return NextResponse.json({ ok: true });
    }

    // Bỏ qua tin nhắn trống (không có text và không có ảnh)
    if (!text && !hasPhoto) {
      return NextResponse.json({ ok: true });
    }

    // 4. Gửi typing indicator và thông báo cho yêu cầu phức tạp
    await sendTypingAction(chatId);
    
    // Phát hiện yêu cầu phức tạp (viết bài, sáng tác, phân tích dài, hoặc có ảnh)
    const isComplexRequest = hasPhoto || /viết|sáng tác|phân tích|giải thích chi tiết|mô tả|kể|tạo|làm bài/.test(text.toLowerCase());
    if (isComplexRequest && (text.length > 30 || hasPhoto)) {
      const message = hasPhoto ? 
        "🖼️ Tôi đang phân tích ảnh của bạn, vui lòng đợi 30-60 giây..." :
        "🤔 Đây là yêu cầu phức tạp, tôi cần thời gian suy nghĩ. Vui lòng đợi 30-60 giây...";
      await sendTelegramMessage(chatId, message);
    }

    // 5. Lấy ngữ cảnh hội thoại từ MongoDB
    let context: Content[] = [];

    try {
      if (mongodb.isAvailable()) {
        const savedContext = await mongodb.getContext(chatId.toString());
        if (savedContext && Array.isArray(savedContext)) {
          // Chuyển đổi về format Content cho Gemini API
          context = savedContext.map(msg => ({
            role: msg.role,
            parts: msg.parts
          }));
        }
      }
    } catch {
      console.log("MongoDB không khả dụng, bỏ qua ngữ cảnh");
    }

    // 6. Chuẩn bị và gọi Gemini AI
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

    // Tạo history cho Gemini (bao gồm system prompt)
    const history: Content[] = [
      { role: "user", parts: [{ text: SYS_PROMPT }] },
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

    // 7. Lưu ngữ cảnh mới vào MongoDB với timestamp (không lưu ảnh để tiết kiệm storage)
    const now = Date.now();
    
    // Lấy context hiện tại với timestamp
    let currentContext: ContextMessage[] = [];
    try {
      if (mongodb.isAvailable()) {
        currentContext = await mongodb.getContext(chatId.toString());
      }
    } catch {
      console.log("Không thể lấy context hiện tại");
    }
    
    // Thêm tin nhắn mới với timestamp
    const newContextMessages: ContextMessage[] = [
      ...currentContext,
      { 
        role: "user", 
        parts: [{ text: text || (hasPhoto ? "[Đã gửi ảnh]" : "") }],
        timestamp: now
      },
      { 
        role: "model", 
        parts: [{ text: reply }],
        timestamp: now
      },
    ];
    
    // Lưu context mới vào MongoDB
    try {
      if (mongodb.isAvailable()) {
        await mongodb.saveContext(chatId.toString(), newContextMessages);
      }
    } catch {
      console.log("Không thể lưu ngữ cảnh vào MongoDB");
    }

    // 8. Gửi phản hồi về Telegram
    await sendTelegramMessage(chatId, reply);

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
