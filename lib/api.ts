import { MappingResult } from "@/types/entities";

export async function mapHeadersWithGemini(
  rawHeaders: string[],
  sampleRows: any[][],
): Promise<MappingResult> {
  try {
    const res = await fetch("/api/gemini-map", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headers: rawHeaders, sampleRows }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const result = await res.json();

    return {
      entity: result.entity || null,
      mappedHeaders: result.mappedHeaders || rawHeaders,
      confidence: result.confidence || 0,
      reasoning: result.reasoning || "No reasoning provided",
      timestamp: result.timestamp,
      inputHeaderCount: result.inputHeaderCount,
      mappedHeaderCount: result.mappedHeaderCount,
    };
  } catch (error) {
    console.error("Error calling AI mapping API:", error);
    return {
      entity: null,
      mappedHeaders: rawHeaders,
      confidence: 0,
      reasoning: `API Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
} 