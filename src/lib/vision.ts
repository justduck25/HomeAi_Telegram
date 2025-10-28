// Google Cloud Vision API Service for Image Analysis and Filtering
import { ImageAnnotatorClient } from '@google-cloud/vision';
import type { google } from '@google-cloud/vision/build/protos/protos';

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

class GoogleVisionService {
  private client: ImageAnnotatorClient | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    try {
      // Kiểm tra credentials theo thứ tự ưu tiên
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
        // Sử dụng JSON credentials (cho Vercel/Production)
        const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
        this.client = new ImageAnnotatorClient({
          credentials,
          projectId: process.env.GOOGLE_CLOUD_PROJECT
        });
        this.isEnabled = true;
        console.log('✅ Google Cloud Vision API initialized (JSON credentials)');
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_CLOUD_PROJECT) {
        // Sử dụng file credentials (cho Development)
        this.client = new ImageAnnotatorClient({
          keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
          projectId: process.env.GOOGLE_CLOUD_PROJECT
        });
        this.isEnabled = true;
        console.log('✅ Google Cloud Vision API initialized (file credentials)');
      } else {
        console.log('⚠️ Google Cloud Vision API not configured - image filtering disabled');
        console.log('💡 Set GOOGLE_APPLICATION_CREDENTIALS + GOOGLE_CLOUD_PROJECT or GOOGLE_APPLICATION_CREDENTIALS_JSON');
        this.isEnabled = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Cloud Vision API:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Convert Google Cloud Vision Likelihood enum to string
   */
  private likelihoodToString(likelihood: google.cloud.vision.v1.Likelihood | string | null | undefined): string {
    if (!likelihood) return 'UNKNOWN';
    
    // If it's already a string, return as is
    if (typeof likelihood === 'string') return likelihood;
    
    // Convert enum to string using toString and mapping
    const likelihoodStr = likelihood.toString();
    
    // Map numeric values to string names
    const likelihoodMap: { [key: string]: string } = {
      '0': 'UNKNOWN',
      '1': 'VERY_UNLIKELY', 
      '2': 'UNLIKELY',
      '3': 'POSSIBLE',
      '4': 'LIKELY',
      '5': 'VERY_LIKELY'
    };
    
    return likelihoodMap[likelihoodStr] || 'UNKNOWN';
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
   * Phân tích một ảnh bằng Google Cloud Vision
   */
  async analyzeImage(imageUrl: string): Promise<VisionAnalysisResult | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      // Thực hiện multiple detections cùng lúc để tối ưu API calls
      const [result] = await this.client.annotateImage({
        image: { source: { imageUri: imageUrl } },
        features: [
          { type: 'LABEL_DETECTION', maxResults: 10 },
          { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
          { type: 'TEXT_DETECTION', maxResults: 5 },
          { type: 'SAFE_SEARCH_DETECTION' }
        ]
      });

      // Extract labels (general categories)
      const labels = result.labelAnnotations?.map(label => 
        label.description?.toLowerCase() || ''
      ).filter(label => label.length > 0) || [];

      // Extract objects (specific items)
      const objects = result.localizedObjectAnnotations?.map(obj => 
        obj.name?.toLowerCase() || ''
      ).filter(obj => obj.length > 0) || [];

      // Extract text if any
      const text = result.textAnnotations?.[0]?.description?.toLowerCase() || '';

      // Safe search results - convert enum to string
      const safeSearch = {
        adult: this.likelihoodToString(result.safeSearchAnnotation?.adult),
        spoof: this.likelihoodToString(result.safeSearchAnnotation?.spoof),
        medical: this.likelihoodToString(result.safeSearchAnnotation?.medical),
        violence: this.likelihoodToString(result.safeSearchAnnotation?.violence),
        racy: this.likelihoodToString(result.safeSearchAnnotation?.racy)
      };

      return {
        labels,
        objects,
        text,
        safeSearch,
        relevanceScore: 0 // Will be calculated later
      };

    } catch (error) {
      console.error(`❌ Vision API analysis failed for ${imageUrl}:`, error);
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
      hasCredentials: !!(
        (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_CLOUD_PROJECT) ||
        (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON && process.env.GOOGLE_CLOUD_PROJECT)
      )
    };
  }
}

// Export singleton instance
export const visionService = new GoogleVisionService();
