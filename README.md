# 🤖 Telegram Gemini Bot

Bot Telegram thông minh được hỗ trợ bởi Google Gemini AI, có khả năng trò chuyện tự nhiên bằng tiếng Việt và ghi nhớ ngữ cảnh hội thoại.

## ✨ Tính năng

- 💬 **Trò chuyện thông minh**: Giao tiếp tự nhiên với AI Gemini 2.5 Flash
- 🖼️ **Phân tích ảnh**: Mô tả và trả lời câu hỏi về hình ảnh
- 🔍 **Tìm kiếm web thông minh**: 
  - Tự động search khi phát hiện từ khóa (tin tức, giá cả, thời sự...)
  - Lệnh `/search <từ khóa>` để tìm kiếm thủ công
  - Lệnh `/image <từ khóa>` để tìm kiếm hình ảnh với Gemini AI
  - Lọc ảnh chất lượng cao từ Pexels & Unsplash (10→3 ảnh tốt nhất)
  - Tích hợp kết quả vào câu trả lời AI
- 🌤️ **Thông tin thời tiết**:
  - Lệnh `/weather <tên thành phố>` để xem thời tiết hiện tại
  - Lệnh `/forecast <tên thành phố>` để xem dự báo 5 ngày
  - Hiển thị đầy đủ thông tin: nhiệt độ, độ ẩm, gió, áp suất, tầm nhìn
  - Hỗ trợ tiếng Việt với emoji trực quan
- 🎤 **Voice Response**: 
  - Lệnh `/voice <câu hỏi>` để nhận câu trả lời bằng giọng nói
  - Sử dụng Microsoft Edge TTS (miễn phí, không giới hạn ký tự)
  - Giọng tiếng Việt tự nhiên (HoaiMy nữ, NamMinh nam)
  - Hỗ trợ text dài với multiple voice messages
- 🧠 **Ghi nhớ ngữ cảnh**: Lưu trữ cuộc trò chuyện trong 2 tiếng với MongoDB
- 🤖 **Lệnh thông minh**: `/help`, `/start`, `/reset`, `/memory`
- 👋 **Phát hiện chào hỏi**: Tự động hiển thị hướng dẫn khi được chào
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

# Enhanced Search APIs (Optional - for advanced search features)
# See ENV_SETUP.md for detailed setup instructions
TAVILY_API_KEY=your_tavily_api_key
BRAVE_SEARCH_API_KEY=your_brave_search_api_key
PEXELS_API_KEY=your_pexels_api_key
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

# Smart Image Filtering powered by Gemini AI (uses existing GOOGLE_API_KEY)
# No additional setup required - uses the same Gemini API key

# Optional: For weather feature
OPENWEATHER_API_KEY=your_openweathermap_api_key
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

#### MongoDB Database (Tùy chọn)
1. Truy cập [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Tạo cluster miễn phí
3. Tạo database user và lấy connection string
4. Copy connection string vào `MONGODB_URI`

#### Enhanced Search APIs (Tùy chọn - cho tính năng tìm kiếm nâng cao)
1. Xem hướng dẫn chi tiết trong [ENV_SETUP.md](./ENV_SETUP.md)
2. Setup Tavily AI, Bing Search, Pexels, và Unsplash APIs
3. Hệ thống fallback tự động với real-time search
4. Chất lượng hình ảnh cao từ Pexels/Unsplash

#### OpenWeatherMap API Key (Tùy chọn - cho tính năng thời tiết)

1. Truy cập [OpenWeatherMap](https://openweathermap.org/api)
2. Tạo tài khoản miễn phí
3. Vào **My API Keys** để lấy API key
4. Cấu hình vào biến môi trường `OPENWEATHER_API_KEY`

> **Lưu ý**: Tài khoản miễn phí có giới hạn 1000 calls/ngày, đủ cho sử dụng cá nhân.

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

# Enhanced Search APIs (Optional)
TAVILY_API_KEY = <your_tavily_api_key>
BRAVE_SEARCH_API_KEY = <your_brave_search_api_key>
PEXELS_API_KEY = <your_pexels_api_key>
UNSPLASH_ACCESS_KEY = <your_unsplash_access_key>
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

### Lệnh cơ bản
- `/start` - Bắt đầu sử dụng bot và xem hướng dẫn
- `/help` - Hiển thị danh sách tất cả lệnh
- `/reset` - Xóa lịch sử hội thoại và bắt đầu mới
- `/memory` - Kiểm tra trạng thái bộ nhớ

### Lệnh tìm kiếm
- `/search <từ khóa>` - Tìm kiếm thông tin trên web
  - Ví dụ: `/search tin tức Việt Nam hôm nay`
- `/image <từ khóa>` - Tìm kiếm hình ảnh
  - Ví dụ: `/image mèo dễ thương`

### Lệnh voice
- `/voice <câu hỏi>` - Nhận câu trả lời bằng giọng nói tiếng Việt
  - Ví dụ: `/voice 1+1 bằng mấy?`
  - Ví dụ: `/voice thủ đô của Việt Nam là gì?`

### Lệnh thời tiết
- `/weather <tên thành phố>` - Xem thời tiết hiện tại
  - Ví dụ: `/weather Hà Nội`
  - Ví dụ: `/weather Ho Chi Minh City`
  - Ví dụ: `/weather Tokyo`
- `/forecast <tên thành phố>` - Xem dự báo thời tiết 5 ngày
  - Ví dụ: `/forecast Đà Nẵng`
  - Ví dụ: `/forecast New York`

### Tính năng tự động
- **Trò chuyện**: Nhắn tin bình thường, bot sẽ trả lời
- **Phân tích ảnh**: Gửi ảnh (có thể kèm câu hỏi)
- **Chào hỏi thông minh**: Nói "xin chào", "hello" → bot hiển thị hướng dẫn
- **Tìm kiếm tự động**: Bot tự động search khi phát hiện từ khóa:
  - **Tìm kiếm trực tiếp**: "tìm kiếm", "search", "tra cứu", "research"
  - **Tin tức & thời sự**: "tin tức", "mới nhất", "cập nhật", "hôm nay"
  - **Giá cả & thị trường**: "giá", "bitcoin", "vàng", "tỷ giá", "thị trường"
  - **Sản phẩm**: "mua", "bán", "review", "so sánh", "tốt nhất"
  - **Học tập**: "trường", "đại học", "khóa học", "tuyển sinh"
  - **Thời tiết**: "thời tiết", "nhiệt độ", "mưa", "bão"
  - **Giải trí**: "phim", "nhạc", "concert", "sự kiện"
  - **Thể thao**: "bóng đá", "world cup", "tỷ số", "kết quả"
- **Tìm kiếm hình ảnh tự động**: "hình ảnh", "ảnh", "cho xem", "như thế nào"

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
