# 🔧 Troubleshooting Guide - Telegram Bot

## 🚨 Các lỗi thường gặp và cách khắc phục

### 1. ❌ Lỗi Parse Entities

**Lỗi**: `Bad Request: can't parse entities: Can't find end of the entity starting at byte offset XXXX`

**Nguyên nhân**: 
- Telegram không thể parse Markdown formatting trong tin nhắn
- Gemini AI trả về text có ký tự đặc biệt không hợp lệ

**Giải pháp đã triển khai**:
```typescript
// Bot tự động fallback từ Markdown → Plain Text
// 1. Thử gửi với parse_mode: "Markdown"
// 2. Nếu lỗi → Gửi lại với plain text
// 3. Chia tin nhắn dài thành nhiều phần (4000 ký tự/phần)
```

**Kiểm tra**:
- Xem logs trong Vercel Dashboard
- Tìm message: "Thử gửi lại với plain text..."

---

### 2. 📏 Lỗi Message Too Long

**Lỗi**: `Bad Request: message is too long`

**Nguyên nhân**: Telegram giới hạn 4096 ký tự/tin nhắn

**Giải pháp đã triển khai**:
```typescript
// Tự động chia tin nhắn dài
const maxLength = 4000; // Buffer 96 ký tự
// Chia theo: đoạn văn → câu → cắt cứng
```

---

### 3. ⏱️ Lỗi Timeout

**Lỗi**: Bot không phản hồi hoặc phản hồi chậm

**Nguyên nhân**:
- Gemini API chậm với câu hỏi phức tạp
- Vercel serverless function timeout

**Giải pháp**:
```typescript
// Timeout protection: 45 giây
const controller = new AbortController();
setTimeout(() => controller.abort(), 45000);

// Fallback message nếu timeout
reply = "😅 Xin lỗi, tôi đang bận xử lý. Bạn thử hỏi lại nhé!";
```

---

### 4. 🔐 Lỗi Authentication

**Lỗi**: `401 Unauthorized` hoặc `403 Forbidden`

**Nguyên nhân**:
- Bot token sai
- Webhook secret không khớp

**Kiểm tra**:
```bash
# Test bot token
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getMe"

# Kiểm tra webhook
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

**Sửa lỗi**:
1. Verify `TELEGRAM_BOT_TOKEN` trong env
2. Kiểm tra `TELEGRAM_SECRET` khớp với webhook setup

---

### 5. 🗄️ Lỗi MongoDB Connection

**Lỗi**: `MongoServerError` hoặc `MongoNetworkTimeoutError`

**Nguyên nhân**:
- MongoDB URI sai
- Network access chưa được cấu hình
- Database user permissions

**Debug steps**:
```javascript
// Thêm vào code để debug
console.log('MongoDB URI:', process.env.MONGODB_URI?.substring(0, 50) + '...');
```

**Sửa lỗi**:
1. Kiểm tra `MONGODB_URI` format
2. Whitelist IP `0.0.0.0/0` trong MongoDB Atlas
3. Verify database user có quyền read/write

---

### 6. 🖼️ Lỗi Image Processing

**Lỗi**: "❌ Không thể tải ảnh" hoặc "❌ Có lỗi khi xử lý ảnh"

**Nguyên nhân**:
- File quá lớn (>20MB)
- Format không hỗ trợ
- Telegram API lỗi

**Kiểm tra**:
```javascript
// Xem logs để debug
console.error("Lỗi xử lý ảnh:", error);
```

**Giải pháp**:
- Chỉ hỗ trợ: JPG, PNG, GIF, WebP
- Giới hạn file size trong code
- Fallback message cho user

---

## 🔍 Debug Tools

### 1. Vercel Logs
```bash
# Xem real-time logs
vercel logs --follow

# Xem logs của deployment cụ thể
vercel logs [deployment-url]
```

### 2. Telegram API Testing
```bash
# Test bot
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Xem webhook info
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Test send message
curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "CHAT_ID", "text": "Test message"}'
```

### 3. MongoDB Connection Test
```javascript
// Test script
const { MongoClient } = require('mongodb');

async function testConnection() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB connected successfully');
    await client.close();
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  }
}

testConnection();
```

---

## 🚀 Performance Optimization

### 1. Reduce Response Time
```typescript
// Gửi typing action ngay lập tức
await sendTypingAction(chatId);

// Parallel processing
const [context, typingPromise] = await Promise.all([
  mongodb.getContext(chatId),
  sendTypingAction(chatId)
]);
```

### 2. Memory Management
```typescript
// Cleanup old messages automatically
await mongodb.cleanupOldMessages(chatId);

// Limit context size
const recentContext = context.slice(-10); // Chỉ giữ 10 tin nhắn gần nhất
```

### 3. Error Recovery
```typescript
// Graceful error handling
try {
  // Main logic
} catch (error) {
  console.error("Error:", error);
  // Luôn trả về 200 để tránh Telegram retry
  return NextResponse.json({ ok: true });
}
```

---

## 📊 Monitoring

### 1. Key Metrics to Watch
- Response time (< 5 seconds)
- Error rate (< 1%)
- Memory usage
- MongoDB connections

### 2. Alerts Setup
- Vercel function errors
- MongoDB connection failures
- High response times

### 3. Health Checks
```typescript
// GET endpoint để health check
export async function GET() {
  return NextResponse.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    mongodb: await mongodb.isConnected()
  });
}
```

---

## 🆘 Emergency Procedures

### 1. Bot Down
1. Check Vercel deployment status
2. Verify environment variables
3. Check MongoDB Atlas status
4. Review recent logs

### 2. High Error Rate
1. Disable webhook temporarily
2. Check Gemini API quota
3. Review recent code changes
4. Scale MongoDB if needed

### 3. Memory Issues
1. Clear all contexts: `/reset` command
2. Check MongoDB storage usage
3. Optimize cleanup frequency

---

**💡 Tip**: Luôn monitor logs trong Vercel Dashboard để phát hiện sớm các vấn đề!
