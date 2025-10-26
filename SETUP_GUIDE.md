# 🤖 Telegram Gemini Bot - Setup Guide

## 📋 Tổng quan

Bot Telegram thông minh sử dụng Google Gemini AI với các tính năng:
- ✅ **User Management System** - Quản lý người dùng với roles (admin/user)
- ✅ **Location & Weather** - Thời tiết theo vị trí, thông báo hàng ngày
- ✅ **Memory System** - Ghi nhớ cuộc trò chuyện
- ✅ **Admin Commands** - Quản lý users, broadcast, thống kê
- ✅ **Auto Search** - Tìm kiếm web tự động
- ✅ **Image Analysis** - Phân tích hình ảnh

## 🚀 Cài đặt nhanh

### 1. Environment Variables

Tạo file `.env.local`:

```bash
# 🤖 Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
TELEGRAM_SECRET=your_custom_secret_key

# 🧠 Google Gemini AI
GOOGLE_API_KEY=your_gemini_api_key

# 💾 MongoDB Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/telegram-bot?retryWrites=true&w=majority

# 🌤️ OpenWeatherMap API
OPENWEATHER_API_KEY=your_openweathermap_api_key

# 🔐 Cron Secret (optional)
CRON_SECRET=my-cron-secret-2024
```

### 2. Deploy to Vercel

```bash
# Clone và deploy
git clone <your-repo>
cd tg-gemini-bot
npm install
vercel --prod
```

### 3. Setup Webhook

```bash
# Cấu hình webhook
npm run webhook:setup
```

## 🎯 Tính năng chính

### 👑 Admin System
- **First user** tự động trở thành admin
- Admin có thể:
  - `/users` - Xem danh sách users
  - `/promote <user_id>` - Thăng cấp user thành admin
  - `/demote <user_id>` - Hạ cấp admin thành user
  - `/broadcast <message>` - Gửi thông báo tới tất cả users
  - `/stats` - Xem thống kê hệ thống

### 🌤️ Weather System
- `/weather` - Thời tiết hiện tại (dùng vị trí đã lưu)
- `/weather <city>` - Thời tiết theo tên thành phố
- `/forecast` - Dự báo 5 ngày
- `/location` - Quản lý vị trí đã lưu
- `/daily on/off` - Bật/tắt thông báo hàng ngày (6:00 sáng)

### 🧠 Memory & Chat
- `/memory` - Kiểm tra trạng thái bộ nhớ
- `/reset` - Xóa bộ nhớ cuộc trò chuyện
- `/userinfo` - Xem thông tin chi tiết user

## 🔧 Database Schema

### Users Collection
```javascript
{
  telegramId: Number,        // Telegram user ID (unique)
  username: String,          // @username
  firstName: String,         // Tên
  lastName: String,          // Họ
  role: "admin" | "user",    // Vai trò
  location: {                // Vị trí đã lưu
    latitude: Number,
    longitude: Number,
    city: String,
    country: String
  },
  preferences: {             // Tùy chọn
    dailyWeather: Boolean,   // Thông báo hàng ngày
    weatherTime: String,     // Thời gian thông báo
    timezone: String
  },
  createdAt: Date,
  updatedAt: Date,
  lastActive: Date
}
```

### Memories Collection
```javascript
{
  telegramId: Number,        // Telegram user ID
  messages: [{               // Lịch sử chat
    role: "user" | "assistant",
    content: String,
    timestamp: Date
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## ⏰ Cron Jobs

### Daily Weather Notifications
- **Schedule**: `0 23 * * *` (6:00 AM Vietnam time)
- **Endpoint**: `/api/cron/daily-weather`
- **Function**: Gửi thông báo thời tiết cho users đã bật tính năng

## 🔐 Security Features

### Role-based Access Control
- **Admin**: Full access to all commands
- **User**: Limited access to basic features
- **First user**: Automatically becomes admin

### API Security
- Webhook verification với `TELEGRAM_SECRET`
- Cron job authentication với `CRON_SECRET`
- Input validation và sanitization

## 📊 Monitoring & Stats

### Admin Dashboard (`/admin`)
- Tổng số users (admin/user)
- Hoạt động 24h gần nhất
- Thống kê tính năng weather
- Danh sách admins

### System Stats (`/stats`)
- User metrics
- Weather feature usage
- Database connection status

## 🚨 Troubleshooting

### Common Issues

1. **Bot không phản hồi**
   - Kiểm tra `TELEGRAM_BOT_TOKEN`
   - Verify webhook setup: `npm run webhook:info`

2. **Database errors**
   - Kiểm tra `MONGODB_URI`
   - Verify network access từ Vercel

3. **Weather không hoạt động**
   - Kiểm tra `OPENWEATHER_API_KEY`
   - User cần chia sẻ location trước

4. **Daily notifications không gửi**
   - Kiểm tra cron job trong Vercel dashboard
   - Verify `CRON_SECRET` nếu có

### Debug Commands

```bash
# Kiểm tra webhook
npm run webhook:info

# Test daily weather
curl -X POST https://your-app.vercel.app/api/cron/daily-weather \
  -H "Content-Type: application/json" \
  -d '{"telegramId": "your_telegram_id"}'
```

## 🔄 Updates & Maintenance

### Database Migrations
- Schema tự động tạo indexes khi khởi động
- Backward compatible với dữ liệu cũ

### Feature Flags
- Tính năng có thể bật/tắt per user
- Admin có thể quản lý permissions

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra logs trong Vercel dashboard
2. Verify tất cả environment variables
3. Test từng tính năng riêng lẻ
4. Liên hệ admin qua Telegram

---

**Made with ❤️ by justduck**
