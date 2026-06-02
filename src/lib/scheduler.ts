import { getUsersForDailyNotification } from './location';
import type { IUser } from './models/User';
import { getWeatherData, formatWeatherMessage } from './weather';

/**
 * Gửi tin nhắn Telegram
 */
async function sendTelegramMessage(chatId: string, message: string): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to send Telegram message:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

/**
 * Gửi dự báo thời tiết cho một user
 */
async function sendWeatherNotificationToUser(user: IUser): Promise<boolean> {
  try {
    if (!user.location?.latitude || !user.location?.longitude) {
      console.log(`User ${user.telegramId} has no location data`);
      return false;
    }

    // Lấy dữ liệu thời tiết
    const weatherData = await getWeatherData(user.location.latitude, user.location.longitude);
    
    if (!weatherData) {
      console.error(`Failed to get weather data for user ${user.telegramId}`);
      return false;
    }

    // Format tin nhắn
    const locationName = user.location.city || `${user.location.latitude.toFixed(2)}, ${user.location.longitude.toFixed(2)}`;
    const message = `🌅 <b>Chào buổi sáng!</b>\n\n${formatWeatherMessage(weatherData, locationName)}`;

    // Gửi tin nhắn
    const success = await sendTelegramMessage(user.telegramId, message);
    
    if (success) {
      console.log(`Weather notification sent to user ${user.telegramId}`);
    } else {
      console.error(`Failed to send weather notification to user ${user.telegramId}`);
    }

    return success;
  } catch (error) {
    console.error(`Error sending weather notification to user ${user.telegramId}:`, error);
    return false;
  }
}

/**
 * Gửi dự báo thời tiết hàng ngày cho tất cả users đã đăng ký
 */
export async function sendDailyWeatherNotifications(): Promise<{ success: number; failed: number }> {
  console.log('Starting daily weather notifications...');
  
  try {
    const users = await getUsersForDailyNotification();
    console.log(`Found ${users.length} users for daily weather notifications`);

    if (users.length === 0) {
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    // Gửi thông báo cho từng user (với delay để tránh rate limit)
    for (const user of users) {
      try {
        const success = await sendWeatherNotificationToUser(user);
        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
        
        // Delay 100ms giữa các tin nhắn để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing user ${user.telegramId}:`, error);
        failedCount++;
      }
    }

    console.log(`Daily weather notifications completed: ${successCount} success, ${failedCount} failed`);
    return { success: successCount, failed: failedCount };
  } catch (error) {
    console.error('Error in sendDailyWeatherNotifications:', error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Kiểm tra xem có phải thời gian gửi thông báo không (6:00 AM GMT+7)
 */
export function shouldSendDailyNotification(): boolean {
  const now = new Date();
  const vietnamTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
  
  const hour = vietnamTime.getHours();
  const minute = vietnamTime.getMinutes();
  
  // Gửi vào 6:00 AM (có thể điều chỉnh trong khoảng 6:00-6:05)
  return hour === 6 && minute >= 0 && minute < 5;
}

/**
 * Scheduler chính - được gọi từ API endpoint hoặc cron job
 */
export async function runDailyWeatherScheduler(): Promise<{ executed: boolean; result?: { success: number; failed: number } }> {
  if (shouldSendDailyNotification()) {
    const result = await sendDailyWeatherNotifications();
    return { executed: true, result };
  }
  
  return { executed: false };
}
