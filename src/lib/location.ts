import { User, IUser } from './models/User';
import { connectToMongoDB } from './mongoose';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

/**
 * Reverse geocoding để lấy tên thành phố từ tọa độ - sử dụng Nominatim OSM
 */
export async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; country?: string }> {
  try {
    // Import function từ weather.ts để tái sử dụng
    const { reverseGeocodeNominatim } = await import('./weather');
    
    // Thử Nominatim OSM trước (miễn phí) - giờ trả về đầy đủ city và country
    const locationData = await reverseGeocodeNominatim(lat, lon);
    if (locationData) {
      return {
        city: locationData.city,
        country: locationData.country
      };
    }

    // Nếu Nominatim không có kết quả, trả về empty
    return {};
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {};
  }
}

/**
 * Lưu vị trí người dùng vào database
 */
export async function saveUserLocation(
  telegramId: string, 
  location: LocationData,
  userInfo?: { firstName?: string; lastName?: string; username?: string }
): Promise<IUser> {
  try {
    // Ensure MongoDB connection
    await connectToMongoDB();
    
    // Reverse geocoding để lấy tên thành phố
    const { city, country } = await reverseGeocode(location.latitude, location.longitude);
    
    const updateData: Partial<IUser> = {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        city: city || location.city,
        country: country || location.country,
        updatedAt: new Date()
      }
    };

    // Cập nhật thông tin user nếu có
    if (userInfo) {
      if (userInfo.firstName) updateData.firstName = userInfo.firstName;
      if (userInfo.lastName) updateData.lastName = userInfo.lastName;
      if (userInfo.username) updateData.username = userInfo.username;
    }

    const user = await User.findOneAndUpdate(
      { telegramId },
      { $set: updateData },
      { 
        new: true, 
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    return user;
  } catch (error) {
    console.error('Error saving user location:', error);
    throw error;
  }
}

/**
 * Lấy vị trí người dùng từ database
 */
export async function getUserLocation(telegramId: string): Promise<LocationData | null> {
  try {
    await connectToMongoDB();
    const user = await User.findOne({ telegramId });
    
    if (user?.location?.latitude && user?.location?.longitude) {
      return {
        latitude: user.location.latitude,
        longitude: user.location.longitude,
        city: user.location.city,
        country: user.location.country
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting user location:', error);
    return null;
  }
}

/**
 * Cập nhật preferences thông báo của user
 */
export async function updateUserNotificationPreferences(
  telegramId: string,
  preferences: {
    dailyWeatherNotification?: boolean;
    notificationTime?: string;
    timezone?: string;
  }
): Promise<IUser | null> {
  try {
    const user = await User.findOneAndUpdate(
      { telegramId },
      { 
        $set: { 
          'preferences.dailyWeatherNotification': preferences.dailyWeatherNotification,
          'preferences.notificationTime': preferences.notificationTime,
          'preferences.timezone': preferences.timezone
        }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return user;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return null;
  }
}

/**
 * Lấy danh sách users cần gửi thông báo thời tiết
 */
export async function getUsersForDailyNotification(): Promise<IUser[]> {
  try {
    const users = await User.find({
      'preferences.dailyWeatherNotification': true,
      'location.latitude': { $exists: true },
      'location.longitude': { $exists: true }
    });

    return users;
  } catch (error) {
    console.error('Error getting users for daily notification:', error);
    return [];
  }
}

/**
 * Format location display name
 */
export function formatLocationName(location: LocationData): string {
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
