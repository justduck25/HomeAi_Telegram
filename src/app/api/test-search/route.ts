// Test endpoint cho Enhanced Search Service
import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/lib/searchService';

export async function POST(request: NextRequest) {
  try {
    const { query = "test search", includeImages = false } = await request.json();
    
    console.log(`🧪 Testing search with query: "${query}"`);
    
    // Test API status
    const apiStatus = await searchService.getApiStatus();
    console.log("📊 API Status:", apiStatus);
    
    // Test search
    const searchResult = await searchService.search(query, includeImages);
    
    return NextResponse.json({
      success: true,
      apiStatus,
      searchResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("❌ Test search error:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Simple API status check
    const apiStatus = await searchService.getApiStatus();
    
    return NextResponse.json({
      message: "Enhanced Search Service Test Endpoint",
      apiStatus,
      availableAPIs: {
        tavily: apiStatus.tavily ? "✅ Configured" : "❌ Not configured",
        brave: apiStatus.brave ? "✅ Configured" : "❌ Not configured", 
        pexels: apiStatus.pexels ? "✅ Configured" : "❌ Not configured",
        unsplash: apiStatus.unsplash ? "✅ Configured" : "❌ Not configured"
      },
      usage: {
        POST: "Test search with custom query",
        body: {
          query: "string (optional, default: 'test search')",
          includeImages: "boolean (optional, default: false)"
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      error: "Failed to check API status",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
