import { NextRequest, NextResponse } from "next/server";
import { getAllUsers, getUserByTelegramId } from "@/lib/database";
import { getWeatherData, formatWeatherMessage } from "@/lib/weather";

// Hàm format location name cho UserLocation
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

// Hàm gửi tin nhắn Telegram
async function sendTelegramMessage(chatId: string, message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.error("TELEGRAM_BOT_TOKEN không được cấu hình");
    return false;
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Lỗi gửi tin nhắn tới ${chatId}:`, errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Lỗi gửi tin nhắn tới ${chatId}:`, error);
    return false;
  }
}

// Hàm lấy danh sách users đã bật thông báo hàng ngày
async function getUsersWithDailyNotification() {
  try {
    const allUsers = await getAllUsers();
    
    const users = allUsers.filter(user => 
      user.preferences.dailyWeather && 
      user.location?.latitude && 
      user.location?.longitude
    );
    
    return users;
  } catch (error) {
    console.error('Lỗi lấy danh sách users:', error);
    return [];
  }
}

// Handler cho GET request (cron job)
export async function GET() {
  try {
    console.log('🌅 Bắt đầu gửi thông báo thời tiết hàng ngày...');

    // Lấy danh sách users đã bật thông báo
    const users = await getUsersWithDailyNotification();
    
    if (users.length === 0) {
      console.log('Không có user nào bật thông báo hàng ngày');
      return NextResponse.json({ 
        success: true, 
        message: 'Không có user nào bật thông báo',
        count: 0 
      });
    }

    console.log(`Tìm thấy ${users.length} users đã bật thông báo hàng ngày`);

    let successCount = 0;
    let failCount = 0;

    // Gửi thông báo cho từng user
    for (const user of users) {
      try {
        // Kiểm tra user có location không
        if (!user.location) {
          console.log(`User ${user.telegramId} không có location, bỏ qua`);
          failCount++;
          continue;
        }

        const { latitude, longitude } = user.location;
        const locationName = formatUserLocationName(user.location);
        
        // Lấy dữ liệu thời tiết từ Open-Meteo (miễn phí, chính xác)
        const weatherData = await getWeatherData(latitude, longitude);
        
        if (weatherData) {
          // Tạo tin nhắn thời tiết với format đặc biệt cho thông báo hàng ngày
          let weatherMessage = `🌅 <b>Chào buổi sáng! Dự báo thời tiết hôm nay</b>\n\n`;
          weatherMessage += `📍 <b>Vị trí:</b> ${locationName}\n\n`;
          
          // Thêm thông tin thời tiết chi tiết
          const mainWeatherInfo = formatWeatherMessage(weatherData, locationName);
          // Loại bỏ tiêu đề đầu vì đã có tiêu đề riêng
          const cleanWeatherInfo = mainWeatherInfo.replace(/🌤️.*?\n\n/, '');
          weatherMessage += cleanWeatherInfo;
          
          weatherMessage += `\n\n💡 <i>Chúc bạn một ngày tốt lành!</i>`;
          weatherMessage += `\n🔕 Để tắt thông báo: /daily off`;
          
          // Gửi tin nhắn
          const sent = await sendTelegramMessage(user.telegramId.toString(), weatherMessage);
          
          if (sent) {
            successCount++;
            console.log(`✅ Đã gửi thông báo cho user ${user.telegramId}`);
          } else {
            failCount++;
            console.log(`❌ Không thể gửi thông báo cho user ${user.telegramId}`);
          }
        } else {
          failCount++;
          console.log(`❌ Không thể lấy dữ liệu thời tiết cho user ${user.telegramId}`);
        }
        
        // Delay nhỏ giữa các request để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        failCount++;
        console.error(`Lỗi xử lý user ${user.telegramId}:`, error);
      }
    }

    const result = {
      success: true,
      message: 'Hoàn thành gửi thông báo thời tiết hàng ngày',
      totalUsers: users.length,
      successCount,
      failCount,
      timestamp: new Date().toISOString()
    };

    console.log('📊 Kết quả gửi thông báo:', result);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('Lỗi trong cron job daily weather:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handler cho POST request (test manual)
export async function POST(req: NextRequest) {
  try {
    const { telegramId } = await req.json();
    
    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    console.log(`Testing daily weather for telegramId: ${telegramId}`);

    // Lấy thông tin user
    const user = await getUserByTelegramId(telegramId);
    
    if (!user) {
      return NextResponse.json({ 
        success: false,
        error: 'User không tồn tại trong database' 
      }, { status: 404 });
    }

    console.log(`User found: ${user.firstName}, role: ${user.role}, dailyWeather: ${user.preferences?.dailyWeather}`);

    // Cho phép admin test ngay cả khi chưa bật daily weather
    if (user.role !== 'admin' && !user.preferences?.dailyWeather) {
      return NextResponse.json({ 
        success: false,
        error: 'User chưa bật thông báo hàng ngày. Sử dụng /daily on để bật.' 
      }, { status: 400 });
    }

    if (!user.location?.latitude || !user.location?.longitude) {
      return NextResponse.json({ 
        success: false,
        error: 'User chưa có vị trí đã lưu. Sử dụng /location để thiết lập vị trí.' 
      }, { status: 400 });
    }

    // Gửi thông báo test
    const { latitude, longitude } = user.location;
    const locationName = formatUserLocationName(user.location);
    
    const weatherData = await getWeatherData(latitude, longitude);
    
    if (weatherData) {
      let weatherMessage = `🧪 <b>TEST - Thông báo thời tiết hàng ngày</b>\n\n`;
      weatherMessage += `📍 <b>Vị trí:</b> ${locationName}\n\n`;
      
      const mainWeatherInfo = formatWeatherMessage(weatherData, locationName);
      const cleanWeatherInfo = mainWeatherInfo.replace(/🌤️.*?\n\n/, '');
      weatherMessage += cleanWeatherInfo;
      
      weatherMessage += `\n\n💡 <i>Đây là tin nhắn test. Thông báo thực tế sẽ được gửi lúc 6:00 sáng mỗi ngày.</i>`;
      
      const sent = await sendTelegramMessage(telegramId, weatherMessage);
      
      if (sent) {
        return NextResponse.json({ 
          success: true, 
          message: 'Đã gửi thông báo test thành công' 
        });
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Không thể gửi thông báo' 
        }, { status: 500 });
      }
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Không thể lấy dữ liệu thời tiết' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Lỗi trong POST daily weather:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
