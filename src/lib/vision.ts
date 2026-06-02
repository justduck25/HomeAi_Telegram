// Image Analysis and Filtering using Google Gemini AI
// Image Analysis and Filtering
// Gemini integration removed in favor of Groq directly in route.ts
// This service is now a stub for backward compatibility


export interface VisionAnalysisResult {
  labels: string[];
  objects: string[];
  text?: string;
  safeSearch: {
    adult: string;
    spoof: string;
    medical: string;
    violence: string;
    racy: string;
  };
  relevanceScore: number;
}

export interface ImageFilterResult {
  url: string;
  alt: string;
  source: string;
  photographer?: string;
  width?: number;
  height?: number;
  visionAnalysis: VisionAnalysisResult;
  isRelevant: boolean;
  relevanceScore: number;
}

type GeminiModel = {
  generateContent(content: unknown[]): Promise<{
    response: {
      text(): string;
    };
  }>;
};

type GeminiClient = {
  getGenerativeModel(options: { model: string }): GeminiModel;
};

class GeminiVisionService {
  private genAI: GeminiClient | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    console.log('⚠️ Vision Service is disabled (Gemini removed)');
    this.isEnabled = false;
  }

  /**
   * Check if content is unsafe based on safe search results
   */
  private isUnsafeContent(safeSearch: { adult: string; spoof: string; medical: string; violence: string; racy: string; }): boolean {
    const unsafeLevels = ['LIKELY', 'VERY_LIKELY'];

    return unsafeLevels.includes(safeSearch.adult) ||
      unsafeLevels.includes(safeSearch.violence) ||
      unsafeLevels.includes(safeSearch.racy);
  }

  /**
   * Phân tích một ảnh bằng Google Gemini AI
   */
  async analyzeImage(imageUrl: string): Promise<VisionAnalysisResult | null> {
    if (!this.isEnabled || !this.genAI) {
      return null;
    }

    try {
      // Sử dụng Gemini 2.5 Flash model
      const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Fetch image data
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      // Prompt để phân tích ảnh
      const prompt = `Analyze this image and provide a JSON response with the following structure:
{
  "labels": ["list", "of", "general", "categories", "describing", "the", "image"],
  "objects": ["specific", "objects", "visible", "in", "image"],
  "text": "any text visible in the image (empty string if none)",
  "safeSearch": {
    "adult": "VERY_UNLIKELY|UNLIKELY|POSSIBLE|LIKELY|VERY_LIKELY",
    "violence": "VERY_UNLIKELY|UNLIKELY|POSSIBLE|LIKELY|VERY_LIKELY", 
    "racy": "VERY_UNLIKELY|UNLIKELY|POSSIBLE|LIKELY|VERY_LIKELY",
    "spoof": "VERY_UNLIKELY",
    "medical": "VERY_UNLIKELY"
  }
}

Focus on:
- General categories/themes (labels)
- Specific objects you can identify
- Any text content
- Safety assessment (adult content, violence, etc.)

Respond ONLY with valid JSON, no additional text.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg'
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const analysis = JSON.parse(text.trim());

      return {
        labels: analysis.labels || [],
        objects: analysis.objects || [],
        text: analysis.text || '',
        safeSearch: {
          adult: analysis.safeSearch?.adult || 'UNKNOWN',
          spoof: analysis.safeSearch?.spoof || 'VERY_UNLIKELY',
          medical: analysis.safeSearch?.medical || 'VERY_UNLIKELY',
          violence: analysis.safeSearch?.violence || 'UNKNOWN',
          racy: analysis.safeSearch?.racy || 'UNKNOWN'
        },
        relevanceScore: 0 // Will be calculated later
      };

    } catch (error) {
      console.error(`❌ Gemini Vision analysis failed for ${imageUrl}:`, error);
      return null;
    }
  }

  /**
   * Tính điểm relevance dựa trên kết quả Vision API và query của user
   */
  private calculateRelevanceScore(
    analysis: VisionAnalysisResult,
    userQuery: string
  ): number {
    let score = 0;
    const queryWords = userQuery.toLowerCase().split(' ').filter(word => word.length > 2);
    const allDetectedTerms = [...analysis.labels, ...analysis.objects];

    if (analysis.text) {
      allDetectedTerms.push(analysis.text);
    }

    // Điểm cho exact matches
    queryWords.forEach(queryWord => {
      allDetectedTerms.forEach(detectedTerm => {
        if (detectedTerm.includes(queryWord)) {
          score += 15; // High score for exact match
        }
        // Partial match
        if (queryWord.length > 3 && detectedTerm.includes(queryWord.substring(0, queryWord.length - 1))) {
          score += 8;
        }
      });
    });

    // Bonus cho ảnh có nhiều labels (thường chất lượng cao hơn)
    score += Math.min(analysis.labels.length * 2, 10);

    // Bonus cho ảnh có objects được detect
    score += Math.min(analysis.objects.length * 3, 15);

    // Penalty cho ảnh không safe
    if (this.isUnsafeContent(analysis.safeSearch)) {
      score -= 50; // Heavy penalty for unsafe content
    }

    // Đảm bảo score không âm
    return Math.max(0, score);
  }

  /**
   * Lọc và rank ảnh dựa trên Google Vision analysis
   */
  async filterAndRankImages(
    images: Array<{
      url: string;
      alt: string;
      source: string;
      photographer?: string;
      width?: number;
      height?: number;
    }>,
    userQuery: string,
    maxResults: number = 3
  ): Promise<ImageFilterResult[]> {
    if (!this.isEnabled) {
      console.log('⚠️ Vision API not enabled, returning original images');
      return images.slice(0, maxResults).map(img => ({
        ...img,
        visionAnalysis: {
          labels: [],
          objects: [],
          safeSearch: {
            adult: 'UNKNOWN',
            spoof: 'UNKNOWN',
            medical: 'UNKNOWN',
            violence: 'UNKNOWN',
            racy: 'UNKNOWN'
          },
          relevanceScore: 0
        },
        isRelevant: true,
        relevanceScore: 0
      }));
    }

    console.log(`🔍 Analyzing ${images.length} images with Google Vision API...`);

    // Analyze all images in parallel (với rate limiting)
    const analysisPromises = images.map(async (image, index) => {
      // Add delay để tránh rate limiting
      await new Promise(resolve => setTimeout(resolve, index * 100));

      const analysis = await this.analyzeImage(image.url);
      if (!analysis) {
        return null;
      }

      const relevanceScore = this.calculateRelevanceScore(analysis, userQuery);
      analysis.relevanceScore = relevanceScore;

      // Determine if image is relevant (threshold có thể adjust)
      const isRelevant = relevanceScore > 10 &&
        !this.isUnsafeContent(analysis.safeSearch);

      return {
        ...image,
        visionAnalysis: analysis,
        isRelevant,
        relevanceScore
      };
    });

    // Wait for all analyses to complete
    const analysisResults = await Promise.all(analysisPromises);

    // Filter out failed analyses
    const validResults = analysisResults.filter(result => result !== null) as ImageFilterResult[];

    console.log(`✅ Vision analysis completed: ${validResults.length}/${images.length} images analyzed`);

    // Filter relevant images and sort by relevance score
    const relevantImages = validResults
      .filter(result => result.isRelevant)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.log(`🎯 Found ${relevantImages.length} relevant images out of ${validResults.length}`);

    // Log top results for debugging
    relevantImages.slice(0, 3).forEach((img, index) => {
      console.log(`📸 Top ${index + 1}: Score ${img.relevanceScore}, Labels: [${img.visionAnalysis.labels.slice(0, 3).join(', ')}]`);
    });

    // Return top results, fallback to all valid results if not enough relevant ones
    if (relevantImages.length >= maxResults) {
      return relevantImages.slice(0, maxResults);
    } else {
      // Nếu không đủ ảnh relevant, lấy thêm từ valid results
      const additionalImages = validResults
        .filter(result => !result.isRelevant)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults - relevantImages.length);

      return [...relevantImages, ...additionalImages];
    }
  }

  /**
   * Kiểm tra trạng thái của Vision API
   */
  isVisionEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get API status for debugging
   */
  getStatus(): { enabled: boolean; hasCredentials: boolean } {
    return {
      enabled: this.isEnabled,
      hasCredentials: !!process.env.GOOGLE_API_KEY
    };
  }
}

// Export singleton instance
export const visionService = new GeminiVisionService();
