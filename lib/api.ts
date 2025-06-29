import { MappingResult } from "@/types/entities";

// Define a more specific type for cell values
type CellValue = string | number | boolean | null | undefined;

export async function mapHeadersWithGemini(
  rawHeaders: string[],
  sampleRows: CellValue[][],
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

export async function processNaturalLanguageRequest(
  request: string,
  entities: any,
  context?: any
): Promise<any> {
  try {
    const response = await fetch('/api/ai/natural-language', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        request,
        entities,
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error processing natural language request:', error);
    throw error;
  }
}

export async function getRuleSuggestions(
  entities: any,
  existingRules: any[] = []
): Promise<any> {
  try {
    const response = await fetch('/api/ai/rule-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        entities,
        existingRules,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting rule suggestions:', error);
    throw error;
  }
} 