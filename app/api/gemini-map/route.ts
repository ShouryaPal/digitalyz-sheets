// api/gemini-map/route.ts
import { NextRequest, NextResponse } from "next/server";
// Correct import for Google models from the specific Google AI SDK provider package
import { generateText } from "ai"; // Keep this for the core generateText function
import { google } from "@ai-sdk/google"; // Correct import for the Google provider

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { headers, sampleRows } = await req.json();

    const prompt = `
      Given the following headers: ${JSON.stringify(headers)} and sample rows: ${JSON.stringify(sampleRows.slice(0, 3))},
      map them to one of these predefined entities: 'clients', 'workers', or 'tasks'.

      For each entity, the expected headers are:
      - clients: ["ClientID", "ClientName", "PriorityLevel", "RequestedTaskIDs", "GroupTag", "AttributesJSON"]
      - workers: ["WorkerID", "WorkerName", "Skills", "AvailableSlots", "MaxLoadPerPhase", "WorkerGroup", "QualificationLevel"]
      - tasks: ["TaskID", "TaskName", "Category", "Duration", "RequiredSkills", "PreferredPhases", "MaxConcurrent"]

      Your response MUST be a JSON object with two properties:
      1. 'entity': The determined entity type ('clients', 'workers', 'tasks', or 'null' if no clear match).
      2. 'mappedHeaders': An array of the original headers, reordered to match the expected order of the determined entity. If an expected header for the entity is missing in the input, include it as 'null' in the 'mappedHeaders' array. If no entity is matched, return the original headers as 'mappedHeaders'.

      Example for a 'clients' entity:
      Input headers: ["Customer ID", "Customer Name", "Task List", "Importance"]
      Expected output: { "entity": "clients", "mappedHeaders": ["Customer ID", "Customer Name", "Importance", "Task List", null, null] }

      Example for an unknown entity:
      Input headers: ["Product", "Price", "Quantity"]
      Expected output: { "entity": null, "mappedHeaders": ["Product", "Price", "Quantity"] }
    `;

    const result = await generateText({
      // Use the 'google' provider and specify the model
      model: google("gemini-2.0-flash"),
      prompt: prompt,
      // You can add safety settings or generation config here if needed
      // safetySettings: [...],
      // generationConfig: {...},
    });

    // Strip code block formatting if present
    let text = result.text.trim();
    if (text.startsWith("```")) {
      // Remove triple backticks and optional language tag
      text = text.replace(/^```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }

    let mapped = { entity: null, mappedHeaders: headers };
    try {
      mapped = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response:", e, "Raw text:", text);
      // Fallback to original headers if parsing fails
      return NextResponse.json({ entity: null, mappedHeaders: headers });
    }

    // Basic validation of the AI's output structure
    if (!mapped || typeof mapped.entity === 'undefined' || !Array.isArray(mapped.mappedHeaders)) {
      console.error("AI returned malformed JSON, falling back to original headers.");
      return NextResponse.json({ entity: null, mappedHeaders: headers });
    }

    return NextResponse.json(mapped);
  } catch (error) {
    console.error("Error in Gemini mapping API:", error);
    return NextResponse.json(
      { error: "Failed to process mapping request.", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}