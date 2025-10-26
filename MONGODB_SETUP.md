# 🍃 Hướng dẫn thiết lập MongoDB cho Telegram Bot

## 📋 Tổng quan

Bot sử dụng MongoDB để lưu trữ bộ nhớ cuộc trò chuyện. Mỗi tin nhắn được lưu với timestamp và tự động xóa sau 2 tiếng.

## 🚀 Thiết lập MongoDB Atlas (Miễn phí)

### 1. Tạo tài khoản MongoDB Atlas

1. Truy cập [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Đăng ký tài khoản miễn phí
3. Xác thực email

### 2. Tạo Cluster

1. Chọn **"Build a Database"**
2. Chọn **"M0 Sandbox"** (miễn phí)
3. Chọn **Cloud Provider**: AWS
4. Chọn **Region**: gần nhất với server của bạn
5. Đặt tên cluster: `telegram-bot-cluster`
6. Click **"Create"**

### 3. Cấu hình Database Access

1. Vào **Database Access** → **Add New Database User**
2. **Authentication Method**: Password
3. **Username**: `telegram-bot-user`
4. **Password**: Tạo password mạnh (lưu lại)
5. **Database User Privileges**: Read and write to any database
6. Click **"Add User"**

### 4. Cấu hình Network Access

1. Vào **Network Access** → **Add IP Address**
2. Chọn **"Allow Access from Anywhere"** (0.0.0.0/0)
   - *Lưu ý: Trong production, hãy giới hạn IP cụ thể*
3. Click **"Confirm"**

### 5. Lấy Connection String

1. Vào **Database** → **Connect**
2. Chọn **"Connect your application"**
3. **Driver**: Node.js
4. **Version**: 4.1 or later
5. Copy connection string:
   ```
   mongodb+srv://telegram-bot-user:<password>@telegram-bot-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Thay `<password>` bằng password thực tế
7. Thêm database name: `/telegram-bot` vào cuối URI

### 6. Connection String cuối cùng

```
mongodb+srv://telegram-bot-user:your_password@telegram-bot-cluster.xxxxx.mongodb.net/telegram-bot?retryWrites=true&w=majority
```

## ⚙️ Cấu hình trong Project

### 1. Thêm vào `.env.local`

```env
MONGODB_URI=mongodb+srv://telegram-bot-user:your_password@telegram-bot-cluster.xxxxx.mongodb.net/telegram-bot?retryWrites=true&w=majority
```

### 2. Thêm vào Vercel Environment Variables

1. Vào Vercel Dashboard → Project → Settings → Environment Variables
2. Thêm:
   - **Name**: `MONGODB_URI`
   - **Value**: Connection string của bạn
   - **Environment**: Production, Preview, Development

## 🗄️ Cấu trúc Database

### Collection: `chat_contexts`

```javascript
{
  _id: ObjectId("..."),
  chatId: "123456789",  // Telegram chat ID
  userId: 987654321,    // Telegram user ID (optional)
  messages: [
    {
      role: "user",
      parts: [{ text: "Xin chào!" }],
      timestamp: 1640995200000
    },
    {
      role: "model", 
      parts: [{ text: "Chào bạn!" }],
      timestamp: 1640995201000
    }
  ],
  lastUpdated: ISODate("2024-01-01T00:00:00.000Z")
}
```

## 🔧 Tính năng MongoDB trong Bot

### ⏰ Auto Cleanup
- Tin nhắn cũ hơn 2 tiếng tự động bị xóa
- Cleanup chạy mỗi khi có tin nhắn mới

### 💾 Efficient Storage
- Chỉ lưu text, không lưu ảnh
- Sử dụng timestamp để quản lý thời gian
- Upsert operation để tối ưu performance

### 🧠 Memory Commands
- `/memory`: Xem trạng thái bộ nhớ
- `/userinfo`: Xem thông tin người dùng và thống kê
- `/reset`: Xóa toàn bộ bộ nhớ
- Tự động hiển thị số tin nhắn và thời gian

### 👑 Admin Commands (chỉ dành cho Admin ID: 539971498)
- `/admin`: Xem panel quản trị
- `/stats`: Xem thống kê hệ thống chi tiết
- `/broadcast <tin nhắn>`: Gửi thông báo tới tất cả users đã từng sử dụng bot

## 👑 Admin System

### 🔐 Admin Configuration
- **Admin User ID**: `539971498` (hard-coded trong source code)
- **Quyền hạn**: Truy cập tất cả lệnh admin và thống kê hệ thống
- **Bảo mật**: Chỉ user có ID chính xác mới có thể sử dụng lệnh admin

### 📊 Admin Features
- **System Stats**: Xem tổng số cuộc trò chuyện, tin nhắn, và hoạt động 24h gần nhất
- **Broadcast**: Gửi thông báo tới tất cả users đã từng sử dụng bot
- **User Management**: Xem thông tin chi tiết về từng user và cuộc trò chuyện
- **Real-time Monitoring**: Theo dõi trạng thái MongoDB và hệ thống

### 🚀 Admin Panel Usage
1. Sử dụng `/admin` để xem panel quản trị
2. Sử dụng `/stats` để xem thống kê chi tiết
3. Sử dụng `/broadcast <message>` để gửi thông báo
4. Lệnh admin chỉ hiển thị trong `/help` khi user là admin

## 🛠️ Troubleshooting

### ❌ Connection Failed

**Lỗi**: `MongoServerError: bad auth`
- **Giải pháp**: Kiểm tra username/password trong connection string

**Lỗi**: `MongoNetworkTimeoutError`
- **Giải pháp**: Kiểm tra Network Access, thêm IP 0.0.0.0/0

**Lỗi**: `MongoParseError: Invalid connection string`
- **Giải pháp**: Kiểm tra format connection string, encode special characters

### 🔍 Debug Connection

Thêm vào code để debug:

```javascript
// Trong mongodb.ts
console.log('MongoDB URI:', process.env.MONGODB_URI?.substring(0, 50) + '...');
```

### 📊 Monitor Usage

1. Vào MongoDB Atlas Dashboard
2. **Metrics** tab để xem:
   - Connections
   - Operations per second
   - Storage usage

## 🚀 Production Tips

### 🔒 Security
- Sử dụng IP whitelist thay vì 0.0.0.0/0
- Tạo user với quyền hạn tối thiểu
- Rotate password định kỳ

### ⚡ Performance
- Tạo index cho `chatId` field:
  ```javascript
  db.chat_contexts.createIndex({ "chatId": 1 })
  ```
- Monitor connection pool size
- Sử dụng connection pooling

### 💰 Cost Optimization
- M0 cluster miễn phí: 512MB storage
- Monitor storage usage trong Atlas
- Cleanup old data nếu cần

---

**🎉 Hoàn thành!** Bot giờ đã có bộ nhớ thông minh với MongoDB!
