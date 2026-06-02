// Enhanced Search Service với multiple APIs và fallback system
// Tavily AI (chính) -> Brave Search API (backup) -> Pexels/Unsplash (hình ảnh) -> Google Vision filtering

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
}

interface ImageResult {
  url: string;
  alt: string;
  source: string;
  photographer?: string;
  width?: number;
  height?: number;
  // Thêm fields cho Unsplash API
  photoId?: string;
  downloadUrl?: string;
  photographerProfile?: string;
  // Thêm relevance score
  relevanceScore?: number;
}

interface RetrievalDocument {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  score?: number;
}

interface TavilyResult {
  title: string;
  content: string;
  url: string;
}

interface TavilyResponse {
  answer?: string;
  results?: TavilyResult[];
}

interface BraveWebResult {
  title: string;
  description: string;
  url: string;
}

interface BraveImageResult {
  src: string;
  title?: string;
  properties?: {
    width?: number;
    height?: number;
  };
}

interface BraveResponse {
  web?: {
    results?: BraveWebResult[];
  };
  images?: {
    results?: BraveImageResult[];
  };
}

interface PexelsPhoto {
  src: {
    large: string;
  };
  alt?: string;
  photographer?: string;
  width?: number;
  height?: number;
}

interface PexelsResponse {
  photos?: PexelsPhoto[];
}

interface UnsplashPhoto {
  id: string;
  urls: {
    regular: string;
  };
  alt_description?: string;
  description?: string;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  width?: number;
  height?: number;
  links: {
    download_location: string;
  };
}

interface UnsplashResponse {
  results?: UnsplashPhoto[];
}

interface SearchResponse {
  text: string | null;
  images: ImageResult[];
  documents: RetrievalDocument[];
  source: string;
  success: boolean;
}

class EnhancedSearchService {
  private tavilyApiKey: string | undefined;
  private braveApiKey: string | undefined;
  private pexelsApiKey: string | undefined;
  private unsplashApiKey: string | undefined;

  constructor() {
    this.tavilyApiKey = process.env.TAVILY_API_KEY;
    this.braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    this.pexelsApiKey = process.env.PEXELS_API_KEY;
    this.unsplashApiKey = process.env.UNSPLASH_ACCESS_KEY;
  }

  // Main search function với fallback system
  async search(query: string, includeImages: boolean = false, maxImages: number = 3): Promise<SearchResponse> {
    console.log(`🔍 Tìm kiếm: "${query}" (includeImages: ${includeImages}, maxImages: ${maxImages})`);

    // Thử Tavily AI trước (chính)
    if (this.tavilyApiKey) {
      try {
        const tavilyResult = await this.searchWithTavily(query);
        if (tavilyResult.success) {
          console.log("✅ Tavily AI search thành công");
          
          if (includeImages) {
            const images = await this.searchImages(query, maxImages);
            return { ...tavilyResult, images };
          }
          
          return tavilyResult;
        }
      } catch (error) {
        console.log("❌ Tavily AI failed, fallback to Brave Search:", error);
      }
    }

    // Fallback to Brave Search API
    if (this.braveApiKey) {
      try {
        const braveResult = await this.searchWithBrave(query, includeImages, maxImages);
        if (braveResult.success) {
          console.log("✅ Brave Search API thành công (backup)");
          return braveResult;
        }
      } catch (error) {
        console.log("❌ Brave Search API failed:", error);
      }
    }

    // Nếu tất cả fail
    return {
      text: null,
      images: [],
      documents: [],
      source: "none",
      success: false
    };
  }

  // Tavily AI Search (Real-time, AI-optimized)
  private async searchWithTavily(query: string): Promise<SearchResponse> {
    const url = "https://api.tavily.com/search";
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.tavilyApiKey}`
      },
      body: JSON.stringify({
        query: query,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
        max_results: 5,
        include_domains: [],
        exclude_domains: []
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = (await response.json()) as TavilyResponse;
    
    if (!data.results || data.results.length === 0) {
      return { text: null, images: [], documents: [], source: "tavily", success: false };
    }

    const documents: RetrievalDocument[] = data.results.slice(0, 5).map((item, index) => ({
      id: `tavily-${index + 1}`,
      title: item.title,
      content: item.content,
      url: item.url,
      source: "tavily",
    }));

    // Format kết quả
    let searchText = `🔍 **Kết quả tìm kiếm cho "${query}"** (Tavily AI):\n\n`;
    
    if (data.answer) {
      searchText += `💡 **Tóm tắt**: ${data.answer}\n\n`;
    }

    documents.slice(0, 3).forEach((item, index) => {
      searchText += `**${index + 1}. ${item.title}**\n`;
      searchText += `${item.content}\n`;
      searchText += `🔗 ${item.url}\n\n`;
    });

    return {
      text: searchText,
      images: [],
      documents,
      source: "tavily",
      success: true
    };
  }

  // Brave Search API (Backup)
  private async searchWithBrave(query: string, includeImages: boolean, maxImages: number = 3): Promise<SearchResponse> {
    const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&country=VN&search_lang=vi`;
    
    const response = await fetch(searchUrl, {
      headers: {
        "X-Subscription-Token": this.braveApiKey!,
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = (await response.json()) as BraveResponse;
    
    if (!data.web || !data.web.results || data.web.results.length === 0) {
      return { text: null, images: [], documents: [], source: "brave", success: false };
    }

    const documents: RetrievalDocument[] = data.web.results.slice(0, 5).map((item, index) => ({
      id: `brave-${index + 1}`,
      title: item.title,
      content: item.description,
      url: item.url,
      source: "brave",
    }));

    // Format text results
    let searchText = `🔍 **Kết quả tìm kiếm cho "${query}"** (Brave Search):\n\n`;
    
    documents.slice(0, 3).forEach((item, index) => {
      searchText += `**${index + 1}. ${item.title}**\n`;
      searchText += `${item.content}\n`;
      searchText += `🔗 ${item.url}\n\n`;
    });

    // Get images from Brave if requested and available
    let images: ImageResult[] = [];
    if (includeImages && data.images && data.images.results) {
      images = data.images.results.slice(0, maxImages).map((img) => ({
        url: img.src,
        alt: img.title || query,
        source: "brave",
        width: img.properties?.width,
        height: img.properties?.height
      }));
    }

    return {
      text: searchText,
      images,
      documents,
      source: "brave",
      success: true
    };
  }

  // Validate image URL để đảm bảo ảnh còn hợp lệ
  private async validateImageUrl(url: string): Promise<boolean> {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is ok and content-type is image
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        return contentType ? contentType.startsWith('image/') : false;
      }
      
      return false;
    } catch (error) {
      console.log(`❌ Image validation failed for ${url}:`, error);
      return false;
    }
  }

  // Validate và filter ảnh hợp lệ (parallel validation)
  private async validateAndFilterImages(images: ImageResult[]): Promise<ImageResult[]> {
    // Validate tất cả ảnh parallel để tăng tốc độ
    const validationPromises = images.map(async (image) => {
      const isValid = await this.validateImageUrl(image.url);
      return { image, isValid };
    });
    
    const validationResults = await Promise.all(validationPromises);
    
    const validImages: ImageResult[] = [];
    validationResults.forEach(({ image, isValid }) => {
      if (isValid) {
        validImages.push(image);
      } else {
        console.log(`🔄 Skipping invalid image: ${image.url}`);
      }
    });
    
    return validImages;
  }

  // Tìm kiếm hình ảnh chất lượng cao từ Pexels + Unsplash với Google Vision filtering
  private async searchImages(query: string, maxImages: number = 3): Promise<ImageResult[]> {
    console.log(`🔍 Searching images for: "${query}" (maxImages: ${maxImages})`);
    
    // Ưu tiên Unsplash (chất lượng cao hơn) - tạm thời không dùng Gemini Vision
    const searchCount = Math.min(maxImages * 2, 6); // Lấy gấp đôi để có buffer
    const unsplashCount = Math.ceil(searchCount * 0.7); // 70% từ Unsplash
    const pexelsCount = searchCount - unsplashCount; // 30% từ Pexels

    const images: ImageResult[] = [];
    
    // Cải thiện query cho tìm kiếm hình ảnh
    const enhancedQueries = this.enhanceImageQuery(query);
    console.log(`🔍 Enhanced queries: ${enhancedQueries.join(', ')}`);

    // Ưu tiên Unsplash trước, sau đó mới Pexels
    const searchPromises: Promise<ImageResult[]>[] = [];

    // Unsplash API - ưu tiên cao (chất lượng tốt hơn)
    if (this.unsplashApiKey) {
      for (const enhancedQuery of enhancedQueries.slice(0, 2)) { // Thử 2 query đầu tiên
        searchPromises.push(
          this.searchUnsplash(enhancedQuery, Math.ceil(unsplashCount / 2))
            .catch(error => {
              console.log(`❌ Unsplash search failed for "${enhancedQuery}":`, error);
              return [];
            })
        );
      }
    }

    // Pexels API - bổ sung thêm
    if (this.pexelsApiKey && pexelsCount > 0) {
      for (const enhancedQuery of enhancedQueries.slice(0, 1)) { // Chỉ thử 1 query
        searchPromises.push(
          this.searchPexels(enhancedQuery, pexelsCount)
            .catch(error => {
              console.log(`❌ Pexels search failed for "${enhancedQuery}":`, error);
              return [];
            })
        );
      }
    }

    // Chờ tất cả searches hoàn thành
    const searchResults = await Promise.all(searchPromises);
    searchResults.forEach(results => images.push(...results));

    console.log(`📸 Total images found: ${images.length} (target: ${searchCount})`);

    // Nếu không đủ ảnh, thử fallback queries
    if (images.length < searchCount) {
      console.log(`🔄 Need more images, trying fallback searches...`);
      const fallbackQueries = this.getFallbackQueries(query);
      
      for (const fallbackQuery of fallbackQueries) {
        if (images.length >= searchCount) break;
        
        const remainingCount = searchCount - images.length;
        
        // Thử Pexels với fallback query
        if (this.pexelsApiKey && remainingCount > 0) {
          try {
            const pexelsImages = await this.searchPexels(fallbackQuery, Math.ceil(remainingCount / 2));
            const newImages = pexelsImages.filter(newImg => 
              !images.some(existingImg => existingImg.url === newImg.url)
            );
            images.push(...newImages);
          } catch (error) {
            console.log(`❌ Fallback Pexels search failed for "${fallbackQuery}":`, error);
          }
        }
        
        // Thử Unsplash với fallback query
        if (this.unsplashApiKey && images.length < searchCount) {
          try {
            const unsplashImages = await this.searchUnsplash(fallbackQuery, Math.ceil((searchCount - images.length) / 2));
            const newImages = unsplashImages.filter(newImg => 
              !images.some(existingImg => existingImg.url === newImg.url)
            );
            images.push(...newImages);
          } catch (error) {
            console.log(`❌ Fallback Unsplash search failed for "${fallbackQuery}":`, error);
          }
        }
      }
    }

    // Loại bỏ duplicates dựa trên URL
    const uniqueImages = this.deduplicateImages(images);
    console.log(`🔄 Removed ${images.length - uniqueImages.length} duplicate images`);

    // Validate URLs trước khi gửi đến Google Vision
    console.log(`🔍 Validating ${uniqueImages.length} image URLs...`);
    const validImages = await this.validateAndFilterImages(uniqueImages);
    console.log(`✅ Found ${validImages.length} valid images out of ${uniqueImages.length}`);

    // Tạm thời không dùng Gemini Vision (rate limit), sử dụng scoring thông thường
    console.log(`📊 Using standard relevance scoring (Gemini Vision disabled due to rate limits)...`);
    
    // Score và sort theo relevance thông thường
    const scoredImages = this.scoreImageRelevance(validImages, query);
    const sortedImages = scoredImages.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    
    // Ưu tiên ảnh từ Unsplash
    const prioritizedImages = sortedImages.sort((a, b) => {
      // Unsplash gets priority
      if (a.source === 'unsplash' && b.source !== 'unsplash') return -1;
      if (b.source === 'unsplash' && a.source !== 'unsplash') return 1;
      // Then by relevance score
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });

    const finalImages = prioritizedImages.slice(0, maxImages);
    console.log(`🎯 Final result: ${finalImages.length} images selected (${finalImages.filter(img => img.source === 'unsplash').length} from Unsplash)`);
    
    return finalImages;
  }

  // Cải thiện query cho tìm kiếm hình ảnh
  private enhanceImageQuery(query: string): string[] {
    const queries: string[] = [];
    const originalQuery = query.toLowerCase().trim();
    
    // Dictionary dịch từ tiếng Việt sang tiếng Anh
    const vietnameseToEnglish: { [key: string]: string[] } = {
      'mèo': ['cat', 'kitten', 'feline'],
      'chó': ['dog', 'puppy', 'canine'],
      'hoa': ['flower', 'blossom', 'bloom'],
      'cây': ['tree', 'plant'],
      'biển': ['sea', 'ocean', 'beach'],
      'núi': ['mountain', 'hill'],
      'trời': ['sky', 'cloud'],
      'mặt trời': ['sun', 'sunshine', 'sunlight'],
      'mặt trăng': ['moon', 'moonlight'],
      'sao': ['star', 'starry'],
      'xe': ['car', 'vehicle', 'automobile'],
      'nhà': ['house', 'home', 'building'],
      'thức ăn': ['food', 'meal', 'cuisine'],
      'đồ ăn': ['food', 'meal', 'dish'],
      'cơm': ['rice', 'meal'],
      'phở': ['pho', 'vietnamese noodle soup'],
      'bánh mì': ['banh mi', 'vietnamese sandwich'],
      'cà phê': ['coffee', 'cafe'],
      'trà': ['tea'],
      'nước': ['water', 'liquid'],
      'lửa': ['fire', 'flame'],
      'đá': ['ice', 'stone', 'rock'],
      'gió': ['wind', 'breeze'],
      'mưa': ['rain', 'rainfall'],
      'tuyết': ['snow', 'snowfall'],
      'người': ['person', 'people', 'human'],
      'trẻ em': ['children', 'kids'],
      'em bé': ['baby', 'infant'],
      'gia đình': ['family'],
      'bạn bè': ['friends', 'friendship'],
      'yêu': ['love', 'romantic'],
      'hạnh phúc': ['happy', 'happiness', 'joy'],
      'buồn': ['sad', 'sadness'],
      'đẹp': ['beautiful', 'beauty', 'pretty'],
      'dễ thương': ['cute', 'adorable'],
      'màu đỏ': ['red color'],
      'màu xanh': ['blue color', 'green color'],
      'màu vàng': ['yellow color'],
      'màu hồng': ['pink color'],
      'màu tím': ['purple color'],
      'màu cam': ['orange color'],
      'màu đen': ['black color'],
      'màu trắng': ['white color'],
      'thiên nhiên': ['nature', 'natural'],
      'động vật': ['animal', 'wildlife'],
      'chim': ['bird', 'avian'],
      'cá': ['fish', 'aquatic'],
      'bướm': ['butterfly'],
      'hổ': ['tiger'],
      'sư tử': ['lion'],
      'voi': ['elephant'],
      'gấu': ['bear'],
      'thỏ': ['rabbit', 'bunny'],
      'công nghệ': ['technology', 'tech'],
      'máy tính': ['computer', 'laptop'],
      'điện thoại': ['phone', 'smartphone', 'mobile'],
      'xe hơi': ['car', 'automobile'],
      'máy bay': ['airplane', 'aircraft'],
      'tàu': ['ship', 'boat'],
      'xe đạp': ['bicycle', 'bike'],
      'thể thao': ['sport', 'sports'],
      'bóng đá': ['football', 'soccer'],
      'bóng rổ': ['basketball'],
      'tennis': ['tennis'],
      'bơi lội': ['swimming', 'pool'],
      'chạy': ['running', 'jogging'],
      'yoga': ['yoga', 'meditation'],
      'gym': ['gym', 'fitness', 'workout'],
      'du lịch': ['travel', 'tourism', 'vacation'],
      'nghỉ dưỡng': ['resort', 'vacation', 'holiday'],
      'khách sạn': ['hotel', 'accommodation'],
      'nhà hàng': ['restaurant', 'dining'],
      'quán cà phê': ['cafe', 'coffee shop'],
      'công viên': ['park', 'garden'],
      'bảo tàng': ['museum'],
      'thư viện': ['library'],
      'trường học': ['school', 'education'],
      'bệnh viện': ['hospital', 'medical'],
      'văn phòng': ['office', 'workplace'],
      'cửa hàng': ['shop', 'store', 'retail'],
      'chợ': ['market', 'marketplace'],
      'siêu thị': ['supermarket', 'grocery'],
      'thời trang': ['fashion', 'style'],
      'quần áo': ['clothing', 'clothes', 'apparel'],
      'giày': ['shoes', 'footwear'],
      'túi xách': ['bag', 'handbag', 'purse'],
      'đồng hồ': ['watch', 'clock', 'timepiece'],
      'trang sức': ['jewelry', 'accessories'],
      'kính': ['glasses', 'eyewear'],
      'mũ': ['hat', 'cap'],
      'áo': ['shirt', 'top', 'clothing'],
      'quần': ['pants', 'trousers'],
      'váy': ['dress', 'skirt'],
      'âm nhạc': ['music', 'musical'],
      'nhạc cụ': ['musical instrument'],
      'guitar': ['guitar'],
      'piano': ['piano'],
      'trống': ['drums'],
      'violin': ['violin'],
      'ca sĩ': ['singer', 'vocalist'],
      'nghệ sĩ': ['artist', 'performer'],
      'hội họa': ['painting', 'art'],
      'điêu khắc': ['sculpture'],
      'nhiếp ảnh': ['photography', 'photo'],
      'phim': ['movie', 'cinema', 'film'],
      'truyền hình': ['television', 'tv'],
      'sách': ['book', 'reading'],
      'báo': ['newspaper', 'news'],
      'tạp chí': ['magazine'],
      'internet': ['internet', 'online', 'web'],
      'mạng xã hội': ['social media', 'social network'],
      'game': ['game', 'gaming', 'video game'],
      'trò chơi': ['game', 'play', 'toy']
    };

    // Synonyms và related terms cho tiếng Anh
    const englishSynonyms: { [key: string]: string[] } = {
      'cat': ['kitten', 'feline', 'kitty', 'tabby', 'persian cat', 'siamese cat'],
      'dog': ['puppy', 'canine', 'doggy', 'golden retriever', 'labrador', 'bulldog'],
      'flower': ['blossom', 'bloom', 'floral', 'rose', 'tulip', 'sunflower', 'daisy'],
      'tree': ['forest', 'oak', 'pine', 'maple', 'birch', 'palm tree'],
      'car': ['automobile', 'vehicle', 'sedan', 'suv', 'sports car'],
      'food': ['meal', 'cuisine', 'dish', 'delicious', 'gourmet'],
      'nature': ['landscape', 'scenic', 'wilderness', 'outdoor'],
      'beautiful': ['gorgeous', 'stunning', 'pretty', 'elegant', 'lovely'],
      'cute': ['adorable', 'sweet', 'charming', 'lovely'],
      'happy': ['joyful', 'cheerful', 'smiling', 'celebration']
    };

    // 1. Thêm query gốc
    queries.push(originalQuery);

    // 2. Dịch từ tiếng Việt sang tiếng Anh
    for (const [vietnamese, englishTerms] of Object.entries(vietnameseToEnglish)) {
      if (originalQuery.includes(vietnamese)) {
        // Thêm các từ tiếng Anh tương ứng
        englishTerms.forEach(englishTerm => {
          const translatedQuery = originalQuery.replace(vietnamese, englishTerm);
          queries.push(translatedQuery);
        });
        
        // Thêm chỉ từ tiếng Anh (không có context tiếng Việt)
        englishTerms.forEach(englishTerm => {
          queries.push(englishTerm);
        });
      }
    }

    // 3. Mở rộng từ khóa tiếng Anh với synonyms
    const words = originalQuery.split(' ');
    for (const word of words) {
      if (englishSynonyms[word]) {
        englishSynonyms[word].forEach(synonym => {
          queries.push(synonym);
          // Thay thế trong context
          const expandedQuery = originalQuery.replace(word, synonym);
          queries.push(expandedQuery);
        });
      }
    }

    // 4. Thêm generic fallbacks cho các từ khóa phổ biến
    if (originalQuery.includes('mèo') || originalQuery.includes('cat')) {
      queries.push('cute cat', 'beautiful cat', 'cat portrait', 'domestic cat');
    }
    if (originalQuery.includes('chó') || originalQuery.includes('dog')) {
      queries.push('cute dog', 'beautiful dog', 'dog portrait', 'happy dog');
    }
    if (originalQuery.includes('hoa') || originalQuery.includes('flower')) {
      queries.push('beautiful flowers', 'colorful flowers', 'flower garden', 'blooming flowers');
    }

    // 5. Loại bỏ duplicates và giữ thứ tự ưu tiên
    const uniqueQueries = [...new Set(queries)];
    
    // 6. Sắp xếp theo độ ưu tiên (query gốc và dịch trước, synonyms sau)
    const prioritizedQueries = uniqueQueries.slice(0, 5); // Giới hạn 5 queries để tránh quá nhiều requests
    
    console.log(`🔄 Original query: "${originalQuery}" -> Enhanced to ${prioritizedQueries.length} queries`);
    return prioritizedQueries;
  }

  // Loại bỏ ảnh trùng lặp dựa trên URL
  private deduplicateImages(images: ImageResult[]): ImageResult[] {
    const seen = new Set<string>();
    return images.filter(image => {
      if (seen.has(image.url)) {
        return false;
      }
      seen.add(image.url);
      return true;
    });
  }

  // Tính điểm relevance cho ảnh
  private scoreImageRelevance(images: ImageResult[], originalQuery: string): ImageResult[] {
    const queryWords = originalQuery.toLowerCase().split(' ').filter(word => word.length > 2);
    
    return images.map(image => {
      let score = 0;
      const altText = (image.alt || '').toLowerCase();
      const photographer = (image.photographer || '').toLowerCase();
      
      // Điểm cơ bản dựa trên alt text
      queryWords.forEach(word => {
        if (altText.includes(word)) {
          score += 10; // Exact match trong alt text
        }
        // Partial match
        if (altText.includes(word.substring(0, Math.max(3, word.length - 1)))) {
          score += 5;
        }
      });
      
      // Bonus điểm cho ảnh có alt text chi tiết
      if (altText.length > 20) {
        score += 2;
      }
      
      // Bonus điểm cho ảnh có photographer name (thường chất lượng cao hơn)
      if (photographer && photographer.length > 0) {
        score += 1;
      }
      
      // Bonus điểm cho ảnh có kích thước hợp lý
      if (image.width && image.height) {
        if (image.width >= 800 && image.height >= 600) {
          score += 3; // High resolution
        } else if (image.width >= 400 && image.height >= 300) {
          score += 1; // Medium resolution
        }
      }
      
      // Bonus điểm cho source uy tín
      if (image.source === 'unsplash') {
        score += 2; // Unsplash thường có ảnh chất lượng cao hơn
      } else if (image.source === 'pexels') {
        score += 1;
      }
      
      return {
        ...image,
        relevanceScore: score
      };
    });
  }

  // Tạo fallback queries khi không tìm thấy đủ ảnh
  private getFallbackQueries(originalQuery: string): string[] {
    const fallbacks: string[] = [];
    const query = originalQuery.toLowerCase();
    
    // Generic fallbacks cho các từ khóa phổ biến
    if (query.includes('mèo') || query.includes('cat')) {
      fallbacks.push('cute animals', 'pets', 'domestic animals', 'adorable cat');
    } else if (query.includes('chó') || query.includes('dog')) {
      fallbacks.push('cute animals', 'pets', 'domestic animals', 'happy dog');
    } else if (query.includes('hoa') || query.includes('flower')) {
      fallbacks.push('nature', 'garden', 'colorful', 'spring');
    } else if (query.includes('thiên nhiên') || query.includes('nature')) {
      fallbacks.push('landscape', 'outdoor', 'scenic', 'wilderness');
    } else if (query.includes('đẹp') || query.includes('beautiful')) {
      fallbacks.push('aesthetic', 'gorgeous', 'stunning', 'pretty');
    } else {
      // Generic fallbacks
      fallbacks.push('beautiful', 'colorful', 'high quality', 'professional');
    }
    
    return fallbacks.slice(0, 3); // Giới hạn 3 fallback queries
  }

  // Pexels API - Hình ảnh chất lượng cao
  private async searchPexels(query: string, count: number = 2): Promise<ImageResult[]> {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": this.pexelsApiKey!
      }
    });

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.status}`);
    }

    const data = (await response.json()) as PexelsResponse;
    
    if (!data.photos || data.photos.length === 0) {
      return [];
    }

    return data.photos.map((photo) => ({
      url: photo.src.large,
      alt: photo.alt || query,
      source: "pexels",
      photographer: photo.photographer,
      width: photo.width,
      height: photo.height
    }));
  }

  // Unsplash API - Hình ảnh nghệ thuật
  private async searchUnsplash(query: string, count: number = 2): Promise<ImageResult[]> {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape&order_by=relevant`;
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Client-ID ${this.unsplashApiKey!}`,
        "Accept-Version": "v1"
      }
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = (await response.json()) as UnsplashResponse;
    
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((photo) => ({
      url: photo.urls.regular,
      alt: photo.alt_description || photo.description || query,
      source: "unsplash",
      photographer: photo.user.name,
      width: photo.width,
      height: photo.height,
      // Thêm thông tin bổ sung từ API
      photoId: photo.id,
      downloadUrl: photo.links.download_location,
      photographerProfile: photo.user.links.html
    }));
  }

  // Kiểm tra trạng thái các API
  async getApiStatus(): Promise<{[key: string]: boolean}> {
    return {
      tavily: !!this.tavilyApiKey,
      brave: !!this.braveApiKey,
      pexels: !!this.pexelsApiKey,
      unsplash: !!this.unsplashApiKey
    };
  }
}

// Export singleton instance
export const searchService = new EnhancedSearchService();
export type { SearchResponse, SearchResult, ImageResult, RetrievalDocument };
