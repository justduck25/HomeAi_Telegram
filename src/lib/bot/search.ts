import { searchService } from "@/lib/searchService";

export async function searchWeb(
  query: string,
  includeImages: boolean = false,
  maxImages: number = 3,
): Promise<{ text: string | null; images: string[] }> {
  try {
    const result = await searchService.search(query, includeImages, maxImages);

    if (!result.success) {
      console.log("Enhanced search service could not search");
      return { text: null, images: [] };
    }

    return {
      text: result.text,
      images: result.images.map((img) => img.url),
    };
  } catch (error) {
    console.error("Enhanced search service error:", error);
    return { text: null, images: [] };
  }
}
