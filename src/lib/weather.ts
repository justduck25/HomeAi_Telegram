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

export async function getWeatherData(cityOrLat: string | number, lon?: number): Promise<WeatherData | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenWeatherMap API key không được cấu hình');
  }

  try {
    let url: string;
    
    // Nếu có lon parameter, sử dụng coordinates
    if (typeof cityOrLat === 'number' && lon !== undefined) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${cityOrLat}&lon=${lon}&appid=${apiKey}&units=metric&lang=vi`;
    } else {
      // Sử dụng tên thành phố
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(String(cityOrLat))}&appid=${apiKey}&units=metric&lang=vi`;
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
