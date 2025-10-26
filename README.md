# 🤖 Telegram Gemini Bot

Bot Telegram thông minh được hỗ trợ bởi Google Gemini AI, có khả năng trò chuyện tự nhiên bằng tiếng Việt và ghi nhớ ngữ cảnh hội thoại.

## ✨ Tính năng

- 💬 **Trò chuyện thông minh**: Giao tiếp tự nhiên với AI Gemini
- 🧠 **Ghi nhớ ngữ cảnh**: Lưu trữ cuộc trò chuyện trong 2 tiếng với MongoDB
- ⚡ **Phản hồi nhanh**: Xử lý tin nhắn trong thời gian thực
- 🔒 **Bảo mật**: Xác thực webhook với secret token
- 🌐 **Deploy dễ dàng**: Tối ưu cho Vercel với MongoDB Atlas

## 🚀 Cài đặt nhanh

### 1. Clone repository

```bash
git clone <repository-url>
cd tg-gemini-bot
npm install
```

### 2. Cấu hình biến môi trường

Tạo file `.env.local`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_SECRET=your_custom_secret_key
GOOGLE_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telegram-bot?retryWrites=true&w=majority
```

### 3. Lấy các API key cần thiết

#### Telegram Bot Token
1. Mở Telegram, tìm [@BotFather](https://t.me/botfather)
2. Gửi `/newbot` và làm theo hướng dẫn
3. Copy token vào `TELEGRAM_BOT_TOKEN`

#### Google Gemini API Key
1. Truy cập [Google AI Studio](https://aistudio.google.com/)
2. Tạo API Key mới
3. Copy key vào `GOOGLE_API_KEY`

#### MongoDB Database
1. Truy cập [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo cluster miễn phí
3. Tạo database user và lấy connection string
4. Copy connection string vào `MONGODB_URI`

### 4. Chạy development server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) để xem dashboard.

## 🌐 Deploy lên Vercel

### 1. Chuẩn bị Vercel

```bash
npm install -g vercel
vercel login
```

### 2. Cấu hình MongoDB

1. Tạo MongoDB Atlas cluster (miễn phí)
2. Tạo database user và whitelist IP
3. Lấy connection string

### 3. Cấu hình biến môi trường

Trong Vercel Dashboard → Project → Settings → Environment Variables:

```
TELEGRAM_BOT_TOKEN = <your_bot_token>
TELEGRAM_SECRET = <your_secret>
GOOGLE_API_KEY = <your_gemini_key>
MONGODB_URI = <your_mongodb_connection_string>
```

### 4. Deploy

```bash
vercel --prod
```

### 5. Thiết lập webhook Telegram

Sau khi deploy thành công:

```bash
# Thiết lập biến môi trường
export WEBHOOK_URL=https://your-app.vercel.app/api/tg
export TELEGRAM_BOT_TOKEN=your_bot_token
export TELEGRAM_SECRET=your_secret

# Chạy script thiết lập webhook
npm run webhook:setup
```

## 🛠️ Scripts có sẵn

```bash
npm run dev          # Chạy development server
npm run build        # Build production
npm run start        # Chạy production server
npm run lint         # Kiểm tra linting

# Webhook management
npm run webhook:setup   # Thiết lập webhook
npm run webhook:delete  # Xóa webhook
npm run webhook:info    # Kiểm tra thông tin webhook
```

## 📁 Cấu trúc project

```
tg-gemini-bot/
├── src/
│   └── app/
│       ├── api/
│       │   └── tg/
│       │       └── route.ts      # Webhook handler
│       ├── page.tsx              # Dashboard
│       └── layout.tsx
├── scripts/
│   └── setup-webhook.js          # Script thiết lập webhook
├── SETUP.md                      # Hướng dẫn chi tiết
└── vercel.json                   # Cấu hình Vercel
```

## 🤖 Cách sử dụng bot

1. **Bắt đầu**: Gửi `/start` cho bot
2. **Trò chuyện**: Nhắn tin bình thường, bot sẽ trả lời
3. **Reset**: Gửi `/reset` để xóa lịch sử hội thoại

## 🔧 Tùy chỉnh

### Thay đổi model AI

Trong `src/app/api/tg/route.ts`:

```typescript
// Sử dụng model mới nhất Gemini 2.5 Flash
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
```

### Điều chỉnh system prompt

```typescript
const SYS_PROMPT = "Tùy chỉnh prompt của bạn ở đây...";
```

### Thay đổi số lượng tin nhắn lưu trữ

```typescript
// Thay đổi từ 10 sang số khác
const context = existingContext.slice(-20); // Lưu 20 lượt
```

## 🐛 Troubleshooting

### Bot không phản hồi
1. Kiểm tra webhook: `npm run webhook:info`
2. Xem logs trong Vercel Dashboard
3. Đảm bảo biến môi trường đã được cấu hình đúng

### Lỗi timeout
- Gemini API có thể chậm với câu hỏi phức tạp
- Bot sẽ tự động timeout sau 18 giây

### Lỗi MongoDB database
- Đảm bảo MongoDB URI đã được cấu hình đúng
- Kiểm tra network access và database user permissions
- Xem logs trong Vercel Dashboard để debug connection

## 📄 License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 🤝 Đóng góp

Mọi đóng góp đều được chào đón! Hãy tạo issue hoặc pull request.

---

**Lưu ý**: Đây là project demo. Trong production, hãy thêm các tính năng bảo mật và monitoring phù hợp.
