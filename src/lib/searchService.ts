// Enhanced Search Service với multiple APIs và fallback system
// Tavily AI (chính) -> Brave Search API (backup) -> Pexels/Unsplash (hình ảnh)

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
}

interface SearchResponse {
  text: string | null;
  images: ImageResult[];
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

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return { text: null, images: [], source: "tavily", success: false };
    }

    // Format kết quả
    let searchText = `🔍 **Kết quả tìm kiếm cho "${query}"** (Tavily AI):\n\n`;
    
    if (data.answer) {
      searchText += `💡 **Tóm tắt**: ${data.answer}\n\n`;
    }

    data.results.slice(0, 3).forEach((item: any, index: number) => {
      searchText += `**${index + 1}. ${item.title}**\n`;
      searchText += `${item.content}\n`;
      searchText += `🔗 ${item.url}\n\n`;
    });

    return {
      text: searchText,
      images: [],
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

    const data = await response.json();
    
    if (!data.web || !data.web.results || data.web.results.length === 0) {
      return { text: null, images: [], source: "brave", success: false };
    }

    // Format text results
    let searchText = `🔍 **Kết quả tìm kiếm cho "${query}"** (Brave Search):\n\n`;
    
    data.web.results.slice(0, 3).forEach((item: any, index: number) => {
      searchText += `**${index + 1}. ${item.title}**\n`;
      searchText += `${item.description}\n`;
      searchText += `🔗 ${item.url}\n\n`;
    });

    // Get images from Brave if requested and available
    let images: ImageResult[] = [];
    if (includeImages && data.images && data.images.results) {
      images = data.images.results.slice(0, maxImages).map((img: any) => ({
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

  // Tìm kiếm hình ảnh chất lượng cao từ Pexels + Unsplash với validation
  private async searchImages(query: string, maxImages: number = 3): Promise<ImageResult[]> {
    const images: ImageResult[] = [];
    
    // Giới hạn theo Telegram: tối đa 10 ảnh
    const limitedMaxImages = Math.min(maxImages, 10);
    
    // Lấy nhiều ảnh hơn để có buffer cho việc validate
    const bufferMultiplier = 1.5;
    const searchCount = Math.ceil(limitedMaxImages * bufferMultiplier);

    // Pexels API - lấy khoảng 60% số ảnh yêu cầu
    if (this.pexelsApiKey) {
      try {
        const pexelsCount = Math.ceil(searchCount * 0.6);
        const pexelsImages = await this.searchPexels(query, pexelsCount);
        images.push(...pexelsImages);
      } catch (error) {
        console.log("❌ Pexels search failed:", error);
      }
    }

    // Unsplash API - lấy phần còn lại
    if (this.unsplashApiKey) {
      try {
        const remainingCount = Math.ceil(searchCount * 0.4);
        const unsplashImages = await this.searchUnsplash(query, remainingCount);
        images.push(...unsplashImages);
      } catch (error) {
        console.log("❌ Unsplash search failed:", error);
      }
    }

    // Validate tất cả ảnh
    console.log(`🔍 Validating ${images.length} images...`);
    let validImages = await this.validateAndFilterImages(images);
    console.log(`✅ Found ${validImages.length} valid images out of ${images.length}`);
    
    // Nếu không đủ ảnh hợp lệ, thử lấy thêm từ APIs
    if (validImages.length < limitedMaxImages) {
      console.log(`🔄 Need more images. Fetching additional images...`);
      
      const additionalNeeded = limitedMaxImages - validImages.length;
      const additionalImages: ImageResult[] = [];
      
      // Lấy thêm từ Pexels
      if (this.pexelsApiKey && additionalNeeded > 0) {
        try {
          const extraPexels = await this.searchPexels(query, additionalNeeded + 2);
          // Filter out ảnh đã có
          const newPexels = extraPexels.filter(img => 
            !validImages.some(existing => existing.url === img.url)
          );
          additionalImages.push(...newPexels);
        } catch (error) {
          console.log("❌ Additional Pexels search failed:", error);
        }
      }
      
      // Lấy thêm từ Unsplash nếu vẫn chưa đủ
      if (this.unsplashApiKey && additionalImages.length < additionalNeeded) {
        try {
          const extraUnsplash = await this.searchUnsplash(query, additionalNeeded + 2);
          // Filter out ảnh đã có
          const newUnsplash = extraUnsplash.filter(img => 
            !validImages.some(existing => existing.url === img.url) &&
            !additionalImages.some(existing => existing.url === img.url)
          );
          additionalImages.push(...newUnsplash);
        } catch (error) {
          console.log("❌ Additional Unsplash search failed:", error);
        }
      }
      
      // Validate ảnh bổ sung
      if (additionalImages.length > 0) {
        console.log(`🔍 Validating ${additionalImages.length} additional images...`);
        const validAdditional = await this.validateAndFilterImages(additionalImages);
        validImages.push(...validAdditional);
        console.log(`✅ Added ${validAdditional.length} more valid images`);
      }
    }
    
    // Trả về đúng số lượng yêu cầu
    return validImages.slice(0, limitedMaxImages);
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

    const data = await response.json();
    
    if (!data.photos || data.photos.length === 0) {
      return [];
    }

    return data.photos.map((photo: any) => ({
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

    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }

    return data.results.map((photo: any) => ({
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
export type { SearchResponse, SearchResult, ImageResult };
