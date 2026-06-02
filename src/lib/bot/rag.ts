import { searchService } from "@/lib/searchService";
import type { RetrievalDocument } from "@/lib/searchService";

export type RagContext = {
  query: string;
  contextText: string | null;
  documents: RetrievalDocument[];
  images: string[];
  source: string;
  success: boolean;
};

const MAX_DOCUMENTS = 5;
const MAX_DOCUMENT_CHARS = 900;

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number): string {
  const clean = compactWhitespace(value);
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength - 3).trim()}...`;
}

function dedupeDocuments(documents: RetrievalDocument[]): RetrievalDocument[] {
  const seen = new Set<string>();
  const deduped: RetrievalDocument[] = [];

  for (const document of documents) {
    const key = document.url || `${document.title}:${document.content}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(document);
  }

  return deduped;
}

export function formatRagContext(documents: RetrievalDocument[]): string | null {
  const selected = dedupeDocuments(documents).slice(0, MAX_DOCUMENTS);
  if (selected.length === 0) {
    return null;
  }

  const blocks = selected.map((document, index) => {
    const sourceNumber = index + 1;
    return [
      `[${sourceNumber}] ${document.title}`,
      `URL: ${document.url}`,
      `Nguon: ${document.source}`,
      `Noi dung: ${truncate(document.content, MAX_DOCUMENT_CHARS)}`,
    ].join("\n");
  });

  return [
    "NGU CANH RAG DA TRUY XUAT:",
    ...blocks,
    "",
    "HUONG DAN SU DUNG RAG:",
    "- Chi tra loi dua tren ngu canh da truy xuat neu cau hoi can thong tin moi/can nguon.",
    "- Neu ngu canh khong du, noi ro rang rang chua du thong tin.",
    "- Khi dung thong tin tu ngu canh, trich dan bang [1], [2] tuong ung voi nguon.",
  ].join("\n\n");
}

export function formatRagSources(documents: RetrievalDocument[]): string {
  const selected = dedupeDocuments(documents).slice(0, MAX_DOCUMENTS);
  if (selected.length === 0) {
    return "";
  }

  const sources = selected.map((document, index) => `[${index + 1}] ${document.title}: ${document.url}`);
  return `\n\nNguon:\n${sources.join("\n")}`;
}

export async function retrieveRagContext(
  query: string,
  options: {
    includeImages?: boolean;
    maxImages?: number;
  } = {},
): Promise<RagContext> {
  const result = await searchService.search(query, options.includeImages ?? false, options.maxImages ?? 3);
  const documents = dedupeDocuments(result.documents);

  return {
    query,
    contextText: formatRagContext(documents),
    documents,
    images: result.images.map((image) => image.url),
    source: result.source,
    success: result.success && documents.length > 0,
  };
}
