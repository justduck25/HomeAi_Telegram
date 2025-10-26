# 🔍 Hướng dẫn Setup Google Programmable Search Engine

## 1. Tạo Custom Search Engine

### Bước 1: Truy cập Google Custom Search
1. Đi tới: https://programmablesearchengine.google.com/
2. Đăng nhập bằng tài khoản Google
3. Click **"Add"** để tạo search engine mới

### Bước 2: Cấu hình Search Engine
1. **Name**: Đặt tên (ví dụ: "AI Bot Search")
2. **What to search**: Chọn **"Search the entire web"**
3. **Language**: Chọn **Vietnamese** hoặc **English**
4. Click **"Create"**

### Bước 3: Lấy Search Engine ID
1. Sau khi tạo xong, click vào search engine vừa tạo
2. Trong tab **"Overview"**, copy **Search engine ID** (dạng: `017576662512468239146:omuauf_lfve`)

## 2. Lấy API Key

### Bước 1: Tạo Google Cloud Project (nếu chưa có)
1. Đi tới: https://console.cloud.google.com/
2. Tạo project mới hoặc chọn project hiện có

### Bước 2: Enable Custom Search API
1. Trong Google Cloud Console, đi tới **"APIs & Services" > "Library"**
2. Tìm **"Custom Search API"**
3. Click **"Enable"**

### Bước 3: Tạo API Key
1. Đi tới **"APIs & Services" > "Credentials"**
2. Click **"Create Credentials" > "API Key"**
3. Copy API Key (dạng: `AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw`)

### Bước 4: Hạn chế API Key (Khuyến nghị)
1. Click vào API Key vừa tạo
2. Trong **"API restrictions"**, chọn **"Restrict key"**
3. Chọn **"Custom Search API"**
4. Save

## 3. Cấu hình Environment Variables

Thêm vào file `.env.local`:

```env
# Google Search API
GOOGLE_SEARCH_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

## 4. Giới hạn miễn phí

- **100 queries/day** miễn phí
- Sau đó: $5/1000 queries
- Monitor usage tại: https://console.cloud.google.com/apis/api/customsearch.googleapis.com/quotas

## 5. Test Search Engine

Sau khi setup xong, test bằng URL:
```
https://www.googleapis.com/customsearch/v1?key=YOUR_API_KEY&cx=YOUR_SEARCH_ENGINE_ID&q=test
```

## 6. Tính năng sẽ có

✅ Tìm kiếm thông tin thời sự  
✅ Kiểm tra tin tức mới nhất  
✅ Tìm kiếm thông tin sản phẩm  
✅ Tra cứu thông tin học tập  
✅ Tự động phát hiện khi cần search  

## 7. Cách sử dụng

Bot sẽ tự động search khi:
- Hỏi về tin tức, thời sự
- Hỏi về giá cả, sản phẩm
- Hỏi về sự kiện hiện tại
- Yêu cầu thông tin cập nhật

Hoặc dùng lệnh: `/search <từ khóa>`
