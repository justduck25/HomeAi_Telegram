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
  async search(query: string, includeImages: boolean = false): Promise<SearchResponse> {
    console.log(`🔍 Tìm kiếm: "${query}" (includeImages: ${includeImages})`);

    // Thử Tavily AI trước (chính)
    if (this.tavilyApiKey) {
      try {
        const tavilyResult = await this.searchWithTavily(query);
        if (tavilyResult.success) {
          console.log("✅ Tavily AI search thành công");
          
          if (includeImages) {
            const images = await this.searchImages(query);
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
        const braveResult = await this.searchWithBrave(query, includeImages);
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
  private async searchWithBrave(query: string, includeImages: boolean): Promise<SearchResponse> {
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
      images = data.images.results.slice(0, 3).map((img: any) => ({
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

  // Tìm kiếm hình ảnh chất lượng cao từ Pexels + Unsplash
  private async searchImages(query: string): Promise<ImageResult[]> {
    const images: ImageResult[] = [];

    // Pexels API
    if (this.pexelsApiKey) {
      try {
        const pexelsImages = await this.searchPexels(query);
        images.push(...pexelsImages);
      } catch (error) {
        console.log("❌ Pexels search failed:", error);
      }
    }

    // Unsplash API
    if (this.unsplashApiKey && images.length < 3) {
      try {
        const unsplashImages = await this.searchUnsplash(query);
        images.push(...unsplashImages);
      } catch (error) {
        console.log("❌ Unsplash search failed:", error);
      }
    }

    return images.slice(0, 3); // Giới hạn 3 ảnh
  }

  // Pexels API - Hình ảnh chất lượng cao
  private async searchPexels(query: string): Promise<ImageResult[]> {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=2&orientation=landscape`;
    
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
  private async searchUnsplash(query: string): Promise<ImageResult[]> {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=2&orientation=landscape&order_by=relevant`;
    
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
