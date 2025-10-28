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

// Open-Meteo Response Interfaces
interface OpenMeteoCurrentResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    is_day: string;
    precipitation: string;
    weather_code: string;
    cloud_cover: string;
    pressure_msl: string;
    surface_pressure: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
    wind_gusts_10m: string;
    uv_index: string;
    visibility: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    uv_index: number;
    visibility: number;
  };
}

interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  daily_units: {
    time: string;
    weather_code: string;
    temperature_2m_max: string;
    temperature_2m_min: string;
    apparent_temperature_max: string;
    apparent_temperature_min: string;
    sunrise: string;
    sunset: string;
    uv_index_max: string;
    precipitation_sum: string;
    rain_sum: string;
    showers_sum: string;
    snowfall_sum: string;
    precipitation_hours: string;
    precipitation_probability_max: string;
    wind_speed_10m_max: string;
    wind_gusts_10m_max: string;
    wind_direction_10m_dominant: string;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    sunrise: string[];
    sunset: string[];
    uv_index_max: number[];
    precipitation_sum: number[];
    rain_sum: number[];
    showers_sum: number[];
    snowfall_sum: number[];
    precipitation_hours: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
  };
}

// WeatherAPI.com Response Interfaces (Legacy - sẽ xóa sau)
interface WeatherAPIResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  current: {
    last_updated_epoch: number;
    last_updated: string;
    temp_c: number;
    temp_f: number;
    is_day: number;
    condition: {
      text: string;
      icon: string;
      code: number;
    };
    wind_mph: number;
    wind_kph: number;
    wind_degree: number;
    wind_dir: string;
    pressure_mb: number;
    pressure_in: number;
    precip_mm: number;
    precip_in: number;
    humidity: number;
    cloud: number;
    feelslike_c: number;
    feelslike_f: number;
    vis_km: number;
    vis_miles: number;
    uv: number;
    gust_mph: number;
    gust_kph: number;
  };
}

interface WeatherAPIForecastResponse {
  location: {
    name: string;
    region: string;
    country: string;
    lat: number;
    lon: number;
    tz_id: string;
    localtime_epoch: number;
    localtime: string;
  };
  current: WeatherAPIResponse['current'];
  forecast: {
    forecastday: Array<{
      date: string;
      date_epoch: number;
      day: {
        maxtemp_c: number;
        maxtemp_f: number;
        mintemp_c: number;
        mintemp_f: number;
        avgtemp_c: number;
        avgtemp_f: number;
        maxwind_mph: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        totalprecip_in: number;
        totalsnow_cm: number;
        avgvis_km: number;
        avgvis_miles: number;
        avghumidity: number;
        daily_will_it_rain: number;
        daily_chance_of_rain: number;
        daily_will_it_snow: number;
        daily_chance_of_snow: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        uv: number;
      };
      astro: {
        sunrise: string;
        sunset: string;
        moonrise: string;
        moonset: string;
        moon_phase: string;
        moon_illumination: string;
      };
      hour: Array<{
        time_epoch: number;
        time: string;
        temp_c: number;
        temp_f: number;
        is_day: number;
        condition: {
          text: string;
          icon: string;
          code: number;
        };
        wind_mph: number;
        wind_kph: number;
        wind_degree: number;
        wind_dir: string;
        pressure_mb: number;
        pressure_in: number;
        precip_mm: number;
        precip_in: number;
        humidity: number;
        cloud: number;
        feelslike_c: number;
        feelslike_f: number;
        windchill_c: number;
        windchill_f: number;
        heatindex_c: number;
        heatindex_f: number;
        dewpoint_c: number;
        dewpoint_f: number;
        will_it_rain: number;
        chance_of_rain: number;
        will_it_snow: number;
        chance_of_snow: number;
        vis_km: number;
        vis_miles: number;
        gust_mph: number;
        gust_kph: number;
        uv: number;
      }>;
    }>;
  };
}


// Bản đồ mô tả thời tiết cho Open-Meteo weather codes
// Dựa trên WMO Weather interpretation codes (WW)
const openMeteoWeatherDescriptions: { [key: number]: string } = {
  0: '☀️ Trời quang đãng',
  1: '🌤️ Chủ yếu quang đãng',
  2: '⛅ Có mây một phần',
  3: '☁️ U ám',
  45: '🌫️ Sương mù',
  48: '🌫️ Sương mù đóng băng',
  51: '🌦️ Mưa phùn nhẹ',
  53: '🌦️ Mưa phùn vừa',
  55: '🌦️ Mưa phùn dày đặc',
  56: '🌨️ Mưa phùn đóng băng nhẹ',
  57: '🌨️ Mưa phùn đóng băng dày đặc',
  61: '🌧️ Mưa nhẹ',
  63: '🌧️ Mưa vừa',
  65: '🌧️ Mưa to',
  66: '🌨️ Mưa đóng băng nhẹ',
  67: '🌨️ Mưa đóng băng nặng',
  71: '🌨️ Tuyết rơi nhẹ',
  73: '❄️ Tuyết rơi vừa',
  75: '❄️ Tuyết rơi nặng',
  77: '❄️ Hạt tuyết',
  80: '🌦️ Mưa rào nhẹ',
  81: '🌧️ Mưa rào vừa',
  82: '⛈️ Mưa rào nặng',
  85: '🌨️ Tuyết rào nhẹ',
  86: '❄️ Tuyết rào nặng',
  95: '⛈️ Dông nhẹ đến vừa',
  96: '⛈️ Dông có mưa đá nhẹ',
  99: '⛈️ Dông có mưa đá nặng'
};

// Bản đồ mô tả thời tiết từ tiếng Anh sang tiếng Việt cho WeatherAPI.com (Legacy)
const weatherDescriptions: { [key: string]: string } = {
  // WeatherAPI.com conditions
  'sunny': '☀️ Nắng đẹp',
  'clear': '☀️ Trời quang đãng',
  'partly cloudy': '🌤️ Có mây',
  'cloudy': '☁️ Nhiều mây',
  'overcast': '☁️ Trời u ám',
  'mist': '🌫️ Sương mù',
  'patchy rain possible': '🌦️ Có thể có mưa rải rác',
  'patchy snow possible': '🌨️ Có thể có tuyết rải rác',
  'patchy sleet possible': '🌨️ Có thể có mưa tuyết',
  'patchy freezing drizzle possible': '🌨️ Có thể có mưa phùn đóng băng',
  'thundery outbreaks possible': '⛈️ Có thể có dông',
  'blowing snow': '❄️ Tuyết thổi',
  'blizzard': '❄️ Bão tuyết',
  'fog': '🌫️ Sương mù dày',
  'freezing fog': '🌫️ Sương mù đóng băng',
  'patchy light drizzle': '🌦️ Mưa phùn nhẹ rải rác',
  'light drizzle': '🌦️ Mưa phùn nhẹ',
  'freezing drizzle': '🌨️ Mưa phùn đóng băng',
  'heavy freezing drizzle': '🌨️ Mưa phùn đóng băng nặng',
  'patchy light rain': '🌦️ Mưa nhẹ rải rác',
  'light rain': '🌦️ Mưa nhẹ',
  'moderate rain at times': '🌧️ Mưa vừa từng đợt',
  'moderate rain': '🌧️ Mưa vừa',
  'heavy rain at times': '🌧️ Mưa to từng đợt',
  'heavy rain': '🌧️ Mưa to',
  'light freezing rain': '🌨️ Mưa đóng băng nhẹ',
  'moderate or heavy freezing rain': '🌨️ Mưa đóng băng vừa đến nặng',
  'light sleet': '🌨️ Mưa tuyết nhẹ',
  'moderate or heavy sleet': '🌨️ Mưa tuyết vừa đến nặng',
  'patchy light snow': '🌨️ Tuyết nhẹ rải rác',
  'light snow': '🌨️ Tuyết nhẹ',
  'patchy moderate snow': '❄️ Tuyết vừa rải rác',
  'moderate snow': '❄️ Tuyết vừa',
  'patchy heavy snow': '❄️ Tuyết nặng rải rác',
  'heavy snow': '❄️ Tuyết nặng',
  'ice pellets': '🧊 Mưa đá nhỏ',
  'light rain shower': '🌦️ Mưa rào nhẹ',
  'moderate or heavy rain shower': '🌧️ Mưa rào vừa đến to',
  'torrential rain shower': '⛈️ Mưa rào như trút nước',
  'light sleet showers': '🌨️ Mưa tuyết rào nhẹ',
  'moderate or heavy sleet showers': '🌨️ Mưa tuyết rào vừa đến nặng',
  'light snow showers': '🌨️ Tuyết rào nhẹ',
  'moderate or heavy snow showers': '❄️ Tuyết rào vừa đến nặng',
  'light showers of ice pellets': '🧊 Mưa đá rào nhẹ',
  'moderate or heavy showers of ice pellets': '🧊 Mưa đá rào vừa đến nặng',
  'patchy light rain with thunder': '⛈️ Mưa nhẹ có sấm sét rải rác',
  'moderate or heavy rain with thunder': '⛈️ Mưa vừa đến to có sấm sét',
  'patchy light snow with thunder': '⛈️ Tuyết nhẹ có sấm sét rải rác',
  'moderate or heavy snow with thunder': '⛈️ Tuyết vừa đến nặng có sấm sét',
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

// Hàm reverse geocoding sử dụng Nominatim OSM (miễn phí) - trả về đầy đủ thông tin
export async function reverseGeocodeNominatim(lat: number, lon: number): Promise<{ city?: string; country?: string } | null> {
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
    const city = data.address.city || 
                        data.address.town || 
                        data.address.village || 
                        data.address.municipality ||
                        data.address.county ||
                        data.address.state;

    // Lấy tên quốc gia
    const country = data.address.country;

    return {
      city: city || undefined,
      country: country || undefined
    };

  } catch (error) {
    console.error('Lỗi Nominatim reverse geocoding:', error);
    return null;
  }
}

// Hàm reverse geocoding legacy - chỉ trả về city name (để backward compatibility)
export async function reverseGeocodeNominatimLegacy(lat: number, lon: number): Promise<string | null> {
  const result = await reverseGeocodeNominatim(lat, lon);
  return result?.city || null;
}

// Hàm reverse geocoding (chỉ dùng Nominatim OSM)
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  return await reverseGeocodeNominatimLegacy(lat, lon);
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

// Hàm lấy thời tiết theo tọa độ với reverse geocoding (sử dụng Open-Meteo)
export async function getWeatherByCoordinates(lat: number, lon: number): Promise<{ weatherData: WeatherData; cityName: string } | null> {
  try {
    // Thử reverse geocoding để lấy tên địa điểm
    const locationInfo = await reverseGeocodeNominatim(lat, lon);
    const cityName = locationInfo?.city || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    const locationName = locationInfo?.city && locationInfo?.country 
      ? `${locationInfo.city}, ${locationInfo.country}`
      : cityName;
    
    // Lấy dữ liệu thời tiết từ Open-Meteo
    const weather = await getWeatherDataFromOpenMeteo(lat, lon, locationName);
    if (!weather) {
      return null;
    }

    // Cập nhật country nếu có
    if (locationInfo?.country) {
      weather.country = locationInfo.country;
    }

    return {
      weatherData: weather,
      cityName: locationName
    };
  } catch (error) {
    console.error('Lỗi khi lấy thời tiết theo tọa độ:', error);
    return null;
  }
}

// Hàm lấy thời tiết từ Open-Meteo
export async function getWeatherDataFromOpenMeteo(lat: number, lon: number, locationName?: string): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,uv_index,visibility&timezone=auto`;
    
    console.log(`🌤️ Gọi Open-Meteo cho: ${lat}, ${lon}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo API error: ${response.status}`);
    }

    const data: OpenMeteoCurrentResponse = await response.json();

    // Lấy mô tả thời tiết từ weather code
    const description = openMeteoWeatherDescriptions[data.current.weather_code] 
      || `Mã thời tiết: ${data.current.weather_code}`;

    // Tạo icon URL dựa trên weather code và is_day
    const isDay = data.current.is_day === 1;
    const iconCode = getOpenMeteoIcon(data.current.weather_code, isDay);

    console.log(`✅ Open-Meteo thành công: ${lat}, ${lon}`);

    return {
      name: locationName || `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      country: '', // Open-Meteo không trả về country, sẽ lấy từ reverse geocoding
      temperature: Math.round(data.current.temperature_2m),
      feels_like: Math.round(data.current.apparent_temperature),
      humidity: data.current.relative_humidity_2m,
      pressure: data.current.pressure_msl,
      description,
      icon: iconCode,
      wind_speed: data.current.wind_speed_10m / 3.6, // Convert km/h to m/s
      wind_deg: data.current.wind_direction_10m,
      visibility: data.current.visibility * 1000, // Convert km to meters
      uv_index: data.current.uv_index
    };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thời tiết từ Open-Meteo:', error);
    throw error;
  }
}

// Hàm lấy thời tiết từ WeatherAPI.com (Legacy - sẽ xóa sau)
export async function getWeatherDataFromWeatherAPI(cityOrLat: string | number, lon?: number): Promise<WeatherData | null> {
  const apiKey = process.env.WEATHERAPI_KEY;
  
  if (!apiKey) {
    throw new Error('WeatherAPI key không được cấu hình. Vui lòng thêm WEATHERAPI_KEY vào file .env.local');
  }

  try {
    let query: string;
    
    // Nếu có lon parameter, sử dụng coordinates
    if (typeof cityOrLat === 'number' && lon !== undefined) {
      query = `${cityOrLat},${lon}`;
    } else {
      // Chuẩn hóa tên thành phố Việt Nam trước khi tìm kiếm
      query = normalizeVietnameseCity(String(cityOrLat));
    }
    
    const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(query)}&aqi=no&lang=vi`;
    
    console.log(`🌤️ Gọi WeatherAPI.com cho: ${query}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 400) {
        console.log(`❌ Không tìm thấy địa điểm: ${query}`);
        return null; // Địa điểm không tìm thấy
      } else if (response.status === 401) {
        throw new Error('WeatherAPI key không hợp lệ. Vui lòng kiểm tra WEATHERAPI_KEY trong file .env.local');
      } else if (response.status === 403) {
        throw new Error('WeatherAPI key đã hết quota hoặc bị khóa. Vui lòng kiểm tra tài khoản WeatherAPI.com');
      }
      throw new Error(`WeatherAPI error: ${response.status}`);
    }

    const data: WeatherAPIResponse = await response.json();

    // Lấy mô tả thời tiết bằng tiếng Việt
    const description = weatherDescriptions[data.current.condition.text.toLowerCase()] 
      || data.current.condition.text;

    console.log(`✅ WeatherAPI thành công: ${data.location.name}, ${data.location.country}`);

    return {
      name: data.location.name,
      country: data.location.country,
      temperature: Math.round(data.current.temp_c),
      feels_like: Math.round(data.current.feelslike_c),
      humidity: data.current.humidity,
      pressure: data.current.pressure_mb,
      description,
      icon: data.current.condition.icon,
      wind_speed: data.current.wind_kph / 3.6, // Convert kph to m/s
      wind_deg: data.current.wind_degree,
      visibility: data.current.vis_km * 1000, // Convert km to meters
      uv_index: data.current.uv
    };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu thời tiết từ WeatherAPI:', error);
    throw error;
  }
}

// Hàm chuyển đổi Open-Meteo weather code thành icon
function getOpenMeteoIcon(weatherCode: number, isDay: boolean): string {
  const dayNight = isDay ? 'd' : 'n';
  
  // Mapping weather codes to icon codes (similar to OpenWeatherMap format)
  const iconMap: { [key: number]: string } = {
    0: `01${dayNight}`, // Clear sky
    1: `02${dayNight}`, // Mainly clear
    2: `03${dayNight}`, // Partly cloudy
    3: `04${dayNight}`, // Overcast
    45: `50${dayNight}`, // Fog
    48: `50${dayNight}`, // Depositing rime fog
    51: `09${dayNight}`, // Light drizzle
    53: `09${dayNight}`, // Moderate drizzle
    55: `09${dayNight}`, // Dense drizzle
    56: `13${dayNight}`, // Light freezing drizzle
    57: `13${dayNight}`, // Dense freezing drizzle
    61: `10${dayNight}`, // Slight rain
    63: `10${dayNight}`, // Moderate rain
    65: `10${dayNight}`, // Heavy rain
    66: `13${dayNight}`, // Light freezing rain
    67: `13${dayNight}`, // Heavy freezing rain
    71: `13${dayNight}`, // Slight snow fall
    73: `13${dayNight}`, // Moderate snow fall
    75: `13${dayNight}`, // Heavy snow fall
    77: `13${dayNight}`, // Snow grains
    80: `09${dayNight}`, // Slight rain showers
    81: `09${dayNight}`, // Moderate rain showers
    82: `09${dayNight}`, // Violent rain showers
    85: `13${dayNight}`, // Slight snow showers
    86: `13${dayNight}`, // Heavy snow showers
    95: `11${dayNight}`, // Thunderstorm
    96: `11${dayNight}`, // Thunderstorm with slight hail
    99: `11${dayNight}`  // Thunderstorm with heavy hail
  };
  
  return iconMap[weatherCode] || `01${dayNight}`;
}

// Hàm lấy thời tiết chính (chỉ dùng Open-Meteo)
export async function getWeatherData(cityOrLat: string | number, lon?: number): Promise<WeatherData | null> {
  // Nếu có coordinates, dùng Open-Meteo trực tiếp
  if (typeof cityOrLat === 'number' && lon !== undefined) {
    return await getWeatherDataFromOpenMeteo(cityOrLat, lon);
  }
  
  // Nếu chỉ có tên thành phố, cần geocoding trước
  // Tạm thời fallback về WeatherAPI cho đến khi implement geocoding
  console.log('⚠️ Open-Meteo cần coordinates. Fallback về WeatherAPI cho city name.');
  return await getWeatherDataFromWeatherAPI(cityOrLat, lon);
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

// Hàm lấy dự báo thời tiết từ Open-Meteo
export async function getWeatherForecastFromOpenMeteo(lat: number, lon: number, days: number = 7, locationName?: string): Promise<OpenMeteoForecastResponse | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,rain_sum,showers_sum,snowfall_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=auto&forecast_days=${days}`;
    
    console.log(`🌤️ Gọi Open-Meteo forecast cho: ${lat}, ${lon}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open-Meteo forecast API error: ${response.status}`);
    }

    const data: OpenMeteoForecastResponse = await response.json();
    console.log(`✅ Open-Meteo forecast thành công: ${lat}, ${lon}`);
    
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy dự báo thời tiết từ Open-Meteo:', error);
    throw error;
  }
}

// Hàm lấy dự báo thời tiết từ WeatherAPI.com (Legacy - sẽ xóa sau)
export async function getWeatherForecastFromWeatherAPI(cityOrLat: string | number, lon?: number, days: number = 5): Promise<WeatherAPIForecastResponse | null> {
  const apiKey = process.env.WEATHERAPI_KEY;
  
  if (!apiKey) {
    throw new Error('WeatherAPI key không được cấu hình. Vui lòng thêm WEATHERAPI_KEY vào file .env.local');
  }

  try {
    let query: string;
    
    // Nếu có lon parameter, sử dụng coordinates
    if (typeof cityOrLat === 'number' && lon !== undefined) {
      query = `${cityOrLat},${lon}`;
    } else {
      // Chuẩn hóa tên thành phố Việt Nam trước khi tìm kiếm
      query = normalizeVietnameseCity(String(cityOrLat));
    }
    
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(query)}&days=${days}&aqi=no&alerts=no&lang=vi`;
    
    console.log(`🌤️ Gọi WeatherAPI forecast cho: ${query}`);
    
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 400) {
        console.log(`❌ Không tìm thấy địa điểm cho forecast: ${query}`);
        return null;
      } else if (response.status === 401) {
        throw new Error('WeatherAPI key không hợp lệ. Vui lòng kiểm tra WEATHERAPI_KEY trong file .env.local');
      } else if (response.status === 403) {
        throw new Error('WeatherAPI key đã hết quota hoặc bị khóa. Vui lòng kiểm tra tài khoản WeatherAPI.com');
      }
      throw new Error(`WeatherAPI forecast error: ${response.status}`);
    }

    const data: WeatherAPIForecastResponse = await response.json();
    console.log(`✅ WeatherAPI forecast thành công: ${data.location.name}, ${data.location.country}`);
    
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy dự báo thời tiết từ WeatherAPI:', error);
    throw error;
  }
}

// Hàm lấy dự báo thời tiết (chỉ dùng Open-Meteo)
export async function getWeatherForecast(cityOrLat: string | number, lon?: number): Promise<OpenMeteoForecastResponse | WeatherAPIForecastResponse | null> {
  // Nếu có coordinates, dùng Open-Meteo trực tiếp
  if (typeof cityOrLat === 'number' && lon !== undefined) {
    return await getWeatherForecastFromOpenMeteo(cityOrLat, lon, 7);
  }
  
  // Nếu chỉ có tên thành phố, cần geocoding trước
  // Tạm thời fallback về WeatherAPI cho đến khi implement geocoding
  console.log('⚠️ Open-Meteo cần coordinates. Fallback về WeatherAPI cho city name.');
  return await getWeatherForecastFromWeatherAPI(cityOrLat, lon, 5);
}


// Hàm format forecast message cho Open-Meteo
export function formatOpenMeteoForecastMessage(forecast: OpenMeteoForecastResponse, locationName?: string): string {
  const displayName = locationName || `${forecast.latitude.toFixed(4)}, ${forecast.longitude.toFixed(4)}`;
  
  let message = `🌍 **Dự báo thời tiết 7 ngày tại ${displayName}**\n\n`;
  
  for (let i = 0; i < forecast.daily.time.length; i++) {
    const date = new Date(forecast.daily.time[i]);
    const dateStr = date.toLocaleDateString('vi-VN');
    
    const maxTemp = Math.round(forecast.daily.temperature_2m_max[i]);
    const minTemp = Math.round(forecast.daily.temperature_2m_min[i]);
    const weatherCode = forecast.daily.weather_code[i];
    const description = openMeteoWeatherDescriptions[weatherCode] || `Mã: ${weatherCode}`;
    
    const dayName = i === 0 ? 'Hôm nay' : 
                   i === 1 ? 'Ngày mai' : 
                   date.toLocaleDateString('vi-VN', { weekday: 'long' });
    
    message += `📅 **${dayName} (${dateStr})**\n`;
    message += `${description}\n`;
    message += `🌡️ ${minTemp}°C - ${maxTemp}°C\n`;
    message += `🌧️ Lượng mưa: ${forecast.daily.precipitation_sum[i]}mm\n`;
    message += `💧 Khả năng mưa: ${forecast.daily.precipitation_probability_max[i]}%\n`;
    if (forecast.daily.uv_index_max[i] > 0) {
      message += `☀️ Chỉ số UV: ${forecast.daily.uv_index_max[i]}\n`;
    }
    message += `🌬️ Gió: ${forecast.daily.wind_speed_10m_max[i]} km/h\n`;
    message += `\n`;
  }
  
  message += `_Cập nhật lúc ${new Date().toLocaleString('vi-VN')}_`;
  
  return message;
}

// Hàm format forecast message cho WeatherAPI (Legacy)
export function formatForecastMessage(forecast: WeatherAPIForecastResponse | OpenMeteoForecastResponse, locationName?: string): string {
  // Kiểm tra xem đây là OpenMeteo hay WeatherAPI response
  if ('latitude' in forecast) {
    return formatOpenMeteoForecastMessage(forecast as OpenMeteoForecastResponse, locationName);
  }
  
  // Legacy WeatherAPI format
  const weatherApiForecast = forecast as WeatherAPIForecastResponse;
  const city = weatherApiForecast.location.name;
  const country = weatherApiForecast.location.country;
  
  const displayName = locationName || `${city}, ${country}`;
  
  let message = `🌍 **Dự báo thời tiết 5 ngày tại ${displayName}**\n\n`;
  
  weatherApiForecast.forecast.forecastday.forEach((day, index) => {
    const date = new Date(day.date);
    const dateStr = date.toLocaleDateString('vi-VN');
    
    const maxTemp = Math.round(day.day.maxtemp_c);
    const minTemp = Math.round(day.day.mintemp_c);
    const description = weatherDescriptions[day.day.condition.text.toLowerCase()] 
      || day.day.condition.text;
    
    const dayName = index === 0 ? 'Hôm nay' : 
                   index === 1 ? 'Ngày mai' : 
                   date.toLocaleDateString('vi-VN', { weekday: 'long' });
    
    message += `📅 **${dayName} (${dateStr})**\n`;
    message += `${description}\n`;
    message += `🌡️ ${minTemp}°C - ${maxTemp}°C\n`;
    message += `💧 Độ ẩm: ${day.day.avghumidity}%\n`;
    message += `🌧️ Khả năng mưa: ${day.day.daily_chance_of_rain}%\n`;
    if (day.day.uv > 0) {
      message += `☀️ Chỉ số UV: ${day.day.uv}\n`;
    }
    message += `\n`;
  });
  
  message += `_Cập nhật lúc ${new Date().toLocaleString('vi-VN')}_`;
  
  return message;
}

