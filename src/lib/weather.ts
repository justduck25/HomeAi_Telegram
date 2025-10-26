interface WeatherData {
  name: string;
  country: string;
  temperature: number;
  feels_like: number;
  humidity: number;
  pressure: number;
  description: string;
  icon: string;
  wind_speed: number;
  wind_deg: number;
  visibility: number;
  uv_index?: number;
}

interface WeatherResponse {
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  wind: {
    speed: number;
    deg: number;
  };
  visibility: number;
  name: string;
  sys: {
    country: string;
  };
}

interface ForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      sea_level: number;
      grnd_level: number;
      humidity: number;
      temp_kf: number;
    };
    weather: Array<{
      id: number;
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
      gust?: number;
    };
    visibility: number;
    pop: number;
    rain?: {
      '3h': number;
    };
    snow?: {
      '3h': number;
    };
    sys: {
      pod: string;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: {
      lat: number;
      lon: number;
    };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

// Bản đồ mô tả thời tiết từ tiếng Anh sang tiếng Việt
const weatherDescriptions: { [key: string]: string } = {
  'clear sky': '☀️ Trời quang đãng',
  'few clouds': '🌤️ Ít mây',
  'scattered clouds': '⛅ Mây rải rác',
  'broken clouds': '☁️ Nhiều mây',
  'overcast clouds': '☁️ Trời u ám',
  'light rain': '🌦️ Mưa nhỏ',
  'moderate rain': '🌧️ Mưa vừa',
  'heavy intensity rain': '🌧️ Mưa to',
  'very heavy rain': '⛈️ Mưa rất to',
  'extreme rain': '⛈️ Mưa cực lớn',
  'freezing rain': '🌨️ Mưa đóng băng',
  'light intensity shower rain': '🌦️ Mưa rào nhẹ',
  'shower rain': '🌦️ Mưa rào',
  'heavy intensity shower rain': '⛈️ Mưa rào to',
  'ragged shower rain': '🌦️ Mưa rào không đều',
  'thunderstorm': '⛈️ Dông bão',
  'thunderstorm with light rain': '⛈️ Dông có mưa nhỏ',
  'thunderstorm with rain': '⛈️ Dông có mưa',
  'thunderstorm with heavy rain': '⛈️ Dông có mưa to',
  'light thunderstorm': '🌩️ Dông nhẹ',
  'heavy thunderstorm': '⛈️ Dông mạnh',
  'ragged thunderstorm': '⛈️ Dông không đều',
  'thunderstorm with light drizzle': '🌩️ Dông có mưa phùn',
  'thunderstorm with drizzle': '⛈️ Dông có mưa phùn',
  'thunderstorm with heavy drizzle': '⛈️ Dông có mưa phùn to',
  'light intensity drizzle': '🌦️ Mưa phùn nhẹ',
  'drizzle': '🌦️ Mưa phùn',
  'heavy intensity drizzle': '🌧️ Mưa phùn to',
  'light intensity drizzle rain': '🌦️ Mưa phùn nhẹ',
  'drizzle rain': '🌦️ Mưa phùn',
  'heavy intensity drizzle rain': '🌧️ Mưa phùn to',
  'shower drizzle': '🌦️ Mưa phùn rào',
  'heavy shower rain and drizzle': '🌧️ Mưa rào và phùn to',
  'snow': '❄️ Tuyết',
  'light snow': '🌨️ Tuyết nhẹ',
  'heavy snow': '❄️ Tuyết to',
  'sleet': '🌨️ Mưa tuyết',
  'light shower sleet': '🌨️ Mưa tuyết nhẹ',
  'shower sleet': '🌨️ Mưa tuyết',
  'light rain and snow': '🌨️ Mưa và tuyết nhẹ',
  'rain and snow': '🌨️ Mưa và tuyết',
  'light shower snow': '🌨️ Tuyết rào nhẹ',
  'shower snow': '❄️ Tuyết rào',
  'heavy shower snow': '❄️ Tuyết rào to',
  'mist': '🌫️ Sương mù',
  'smoke': '💨 Khói',
  'haze': '🌫️ Sương khô',
  'sand/dust whirls': '🌪️ Lốc cát/bụi',
  'fog': '🌫️ Sương mù dày',
  'sand': '🏜️ Cát',
  'dust': '💨 Bụi',
  'volcanic ash': '🌋 Tro núi lửa',
  'squalls': '💨 Gió giật',
  'tornado': '🌪️ Lốc xoáy'
};

// Bản đồ tên thành phố Việt Nam để tối ưu tìm kiếm
const vietnamCityMapping: { [key: string]: string } = {
  // Thành phố lớn
  'tp.hcm': 'Ho Chi Minh City',
  'tphcm': 'Ho Chi Minh City',
  'sài gòn': 'Ho Chi Minh City',
  'saigon': 'Ho Chi Minh City',
  'hồ chí minh': 'Ho Chi Minh City',
  'ho chi minh': 'Ho Chi Minh City',
  
  'hà nội': 'Hanoi',
  'ha noi': 'Hanoi',
  'hanoi': 'Hanoi',
  
  'đà nẵng': 'Da Nang',
  'da nang': 'Da Nang',
  'danang': 'Da Nang',
  
  // Các tỉnh thành khác
  'nghệ an': 'Nghe An',
  'nghe an': 'Nghe An',
  'thanh hóa': 'Thanh Hoa',
  'thanh hoa': 'Thanh Hoa',
  'hải phòng': 'Haiphong',
  'hai phong': 'Haiphong',
  'cần thơ': 'Can Tho',
  'can tho': 'Can Tho',
  'vũng tàu': 'Vung Tau',
  'vung tau': 'Vung Tau',
  'nha trang': 'Nha Trang',
  'đà lạt': 'Da Lat',
  'da lat': 'Da Lat',
  'dalat': 'Da Lat',
  'huế': 'Hue',
  'hue': 'Hue',
  'quy nhon': 'Quy Nhon',
  'quy nhơn': 'Quy Nhon',
  'buôn ma thuột': 'Buon Ma Thuot',
  'buon ma thuot': 'Buon Ma Thuot',
  'long xuyên': 'Long Xuyen',
  'long xuyen': 'Long Xuyen',
  'mỹ tho': 'My Tho',
  'my tho': 'My Tho',
  'rạch giá': 'Rach Gia',
  'rach gia': 'Rach Gia',
  'cà mau': 'Ca Mau',
  'ca mau': 'Ca Mau',
  'phan thiết': 'Phan Thiet',
  'phan thiet': 'Phan Thiet',
  'tây ninh': 'Tay Ninh',
  'tay ninh': 'Tay Ninh',
  'biên hòa': 'Bien Hoa',
  'bien hoa': 'Bien Hoa',
  'thủ dầu một': 'Thu Dau Mot',
  'thu dau mot': 'Thu Dau Mot',
  'bắc ninh': 'Bac Ninh',
  'bac ninh': 'Bac Ninh',
  'hạ long': 'Ha Long',
  'ha long': 'Ha Long',
  'nam định': 'Nam Dinh',
  'nam dinh': 'Nam Dinh',
  'thái nguyên': 'Thai Nguyen',
  'thai nguyen': 'Thai Nguyen',
  'vinh': 'Vinh',
  'pleiku': 'Pleiku',
  'kon tum': 'Kon Tum',
  'đồng hới': 'Dong Hoi',
  'dong hoi': 'Dong Hoi'
};

// Hàm chuẩn hóa tên thành phố Việt Nam
function normalizeVietnameseCity(cityName: string): string {
  const normalized = cityName.toLowerCase().trim();
  return vietnamCityMapping[normalized] || cityName;
}

// Interface cho Nominatim OSM Response
interface NominatimResponse {
  display_name: string;
  address: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}

// Hàm reverse geocoding sử dụng Nominatim OSM (miễn phí)
export async function reverseGeocodeNominatim(lat: number, lon: number): Promise<string | null> {
  try {
    // Sử dụng Nominatim OSM - hoàn toàn miễn phí, không cần API key
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1&accept-language=vi,en`,
      {
        headers: {
          'User-Agent': 'TelegramWeatherBot/1.0 (contact@example.com)' // Bắt buộc phải có User-Agent
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data: NominatimResponse = await response.json();
    
    if (!data || !data.address) {
      return null;
    }

    // Ưu tiên lấy tên thành phố/thị trấn
    const locationName = data.address.city || 
                        data.address.town || 
                        data.address.village || 
                        data.address.municipality ||
                        data.address.county ||
                        data.address.state;

    return locationName || null;

  } catch (error) {
    console.error('Lỗi Nominatim reverse geocoding:', error);
    return null;
  }
}

// Hàm reverse geocoding với fallback methods
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  // Method 1: Thử Nominatim OSM trước (miễn phí, tốt nhất)
  const nominatimResult = await reverseGeocodeNominatim(lat, lon);
  if (nominatimResult) {
    return nominatimResult;
  }

  // Method 2: Fallback về OpenWeatherMap nếu có API key
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    console.warn('Không có OpenWeatherMap API key để fallback reverse geocoding');
    return null;
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data: WeatherResponse = await response.json();
    
    // Trả về tên địa điểm từ OpenWeatherMap
    return data.name || null;
  } catch (error) {
    console.error('Lỗi khi reverse geocoding với OpenWeatherMap:', error);
    return null;
  }
}

// Hàm chuyển đổi hướng gió thành tiếng Việt
function getWindDirection(degrees: number): string {
  const directions = [
    'Bắc', 'Đông Bắc', 'Đông', 'Đông Nam',
    'Nam', 'Tây Nam', 'Tây', 'Tây Bắc'
  ];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// Hàm đánh giá chất lượng không khí dựa trên độ ẩm và tầm nhìn
function getAirQualityDescription(humidity: number, visibility: number): string {
  if (visibility >= 10000 && humidity < 60) {
    return '🟢 Tốt';
  } else if (visibility >= 5000 && humidity < 70) {
    return '🟡 Trung bình';
  } else {
    return '🔴 Kém';
  }
}

// Hàm lấy thời tiết theo tọa độ với reverse geocoding
export async function getWeatherByCoordinates(lat: number, lon: number): Promise<{ weatherData: WeatherData; cityName: string } | null> {
  try {
    // Lấy dữ liệu thời tiết
    const weather = await getWeatherData(lat, lon);
    if (!weather) {
      return null;
    }

    // Thử reverse geocoding để lấy tên địa điểm chính xác hơn
    const locationName = await reverseGeocode(lat, lon);
    const cityName = locationName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    
    // Cập nhật tên trong weather data
    weather.name = cityName;

    return {
      weatherData: weather,
      cityName: cityName
    };
  } catch (error) {
    console.error('Lỗi khi lấy thời tiết theo tọa độ:', error);
    return null;
  }
}

export async function getWeatherData(cityOrLat: string | number, lon?: number): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key không được cấu hình');
  }

  try {
    let url: string;
    let normalizedCity: string;
    
    // Nếu có lon parameter, sử dụng coordinates
    if (typeof cityOrLat === 'number' && lon !== undefined) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${cityOrLat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
    } else {
      // Chuẩn hóa tên thành phố Việt Nam trước khi tìm kiếm
      normalizedCity = normalizeVietnameseCity(String(cityOrLat));
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(normalizedCity)}&appid=${apiKey}&units=metric&lang=vi`;
    }
    
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Thành phố không tìm thấy
      }
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    const data: WeatherResponse = await response.json();

    // Lấy mô tả thời tiết bằng tiếng Việt
    const description = weatherDescriptions[data.weather[0].description.toLowerCase()] 
      || data.weather[0].description;

    return {
      name: data.name,
      country: data.sys.country,
      temperature: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      description,
      icon: data.weather[0].icon,
      wind_speed: data.wind.speed,
      wind_deg: data.wind.deg,
      visibility: data.visibility
    };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thời tiết:', error);
    throw error;
  }
}

export function formatWeatherMessage(weather: WeatherData, locationName?: string): string {
  const windDirection = getWindDirection(weather.wind_deg);
  const airQuality = getAirQualityDescription(weather.humidity, weather.visibility);
  
  const displayName = locationName || `${weather.name}, ${weather.country}`;
  
  return `🌍 **Thời tiết tại ${displayName}**

${weather.description}

🌡️ **Nhiệt độ:** ${weather.temperature}°C
🤚 **Cảm giác như:** ${weather.feels_like}°C
💧 **Độ ẩm:** ${weather.humidity}%
🌬️ **Gió:** ${weather.wind_speed} m/s hướng ${windDirection}
📊 **Áp suất:** ${weather.pressure} hPa
👁️ **Tầm nhìn:** ${(weather.visibility / 1000).toFixed(1)} km
🌬️ **Chất lượng không khí:** ${airQuality}

_Cập nhật lúc ${new Date().toLocaleString('vi-VN')}_`;
}

// Hàm lấy dự báo thời tiết 5 ngày
export async function getWeatherForecast(cityOrLat: string | number, lon?: number): Promise<ForecastResponse | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key không được cấu hình');
  }

  try {
    let url: string;
    
    // Nếu có lon parameter, sử dụng coordinates
    if (typeof cityOrLat === 'number' && lon !== undefined) {
      url = `https://api.openweathermap.org/data/2.5/forecast?lat=${cityOrLat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
    } else {
      // Sử dụng tên thành phố
      url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(String(cityOrLat))}&appid=${apiKey}&units=metric&lang=vi`;
    }
    
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`OpenWeatherMap API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi lấy dự báo thời tiết:', error);
    throw error;
  }
}

export function formatForecastMessage(forecast: ForecastResponse, locationName?: string): string {
  const city = forecast.city.name;
  const country = forecast.city.country;
  
  const displayName = locationName || `${city}, ${country}`;
  
  let message = `🌍 **Dự báo thời tiết 5 ngày tại ${displayName}**\n\n`;
  
  // Nhóm dự báo theo ngày
  const dailyForecasts: { [key: string]: ForecastResponse['list'] } = {};
  
  forecast.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dateKey = date.toLocaleDateString('vi-VN');
    
    if (!dailyForecasts[dateKey]) {
      dailyForecasts[dateKey] = [];
    }
    dailyForecasts[dateKey].push(item);
  });
  
  // Hiển thị dự báo cho từng ngày (chỉ lấy 5 ngày đầu)
  const dates = Object.keys(dailyForecasts).slice(0, 5);
  
  dates.forEach((date, index) => {
    const dayForecasts = dailyForecasts[date];
    const midDayForecast = dayForecasts[Math.floor(dayForecasts.length / 2)];
    
    const temp = Math.round(midDayForecast.main.temp);
    const description = weatherDescriptions[midDayForecast.weather[0].description.toLowerCase()] 
      || midDayForecast.weather[0].description;
    
    const dayName = index === 0 ? 'Hôm nay' : 
                   index === 1 ? 'Ngày mai' : 
                   new Date(midDayForecast.dt * 1000).toLocaleDateString('vi-VN', { weekday: 'long' });
    
    message += `📅 **${dayName} (${date})**\n`;
    message += `${description} - ${temp}°C\n`;
    message += `💧 Độ ẩm: ${midDayForecast.main.humidity}%\n\n`;
  });
  
  message += `_Cập nhật lúc ${new Date().toLocaleString('vi-VN')}_`;
  
  return message;
}
