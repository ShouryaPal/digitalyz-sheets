import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { headers, sampleRows } = await req.json();

    const prompt = `
You are an AI-powered CSV header mapping expert. Your task is to intelligently map CSV headers to predefined data entities, even when headers are wrongly named, abbreviated, or in different order.

**ENTITY DEFINITIONS:**

**1. CLIENTS Entity - Expected Headers:**
["ClientID", "ClientName", "PriorityLevel", "RequestedTaskIDs", "GroupTag", "AttributesJSON"]

Field Descriptions:
- ClientID: Unique identifier for client (numbers, codes, IDs)
- ClientName: Name of client/customer/organization
- PriorityLevel: Integer (1-5) indicating importance/urgency
- RequestedTaskIDs: Comma-separated TaskIDs that client wants
- GroupTag: Group/category/classification for the client
- AttributesJSON: Arbitrary JSON metadata

**2. WORKERS Entity - Expected Headers:**
["WorkerID", "WorkerName", "Skills", "AvailableSlots", "MaxLoadPerPhase", "WorkerGroup", "QualificationLevel"]

Field Descriptions:
- WorkerID: Unique identifier for worker (employee ID, etc.)
- WorkerName: Worker's name
- Skills: Comma-separated tags/capabilities
- AvailableSlots: Array of phase numbers when worker is available (e.g. [1,3,5])
- MaxLoadPerPhase: Integer maximum workload per phase
- WorkerGroup: Team/department/group assignment
- QualificationLevel: Integer skill level/experience rating (1-10)

**3. TASKS Entity - Expected Headers:**
["TaskID", "TaskName", "Category", "Duration", "RequiredSkills", "PreferredPhases", "MaxConcurrent"]

Field Descriptions:
- TaskID: Unique task identifier
- TaskName: Name/title of the task
- Category: Task type/classification
- Duration: Number of phases required (≥1)
- RequiredSkills: Comma-separated tags needed
- PreferredPhases: List or range syntax (e.g. "1-3" or [2,4,5])
- MaxConcurrent: Integer maximum parallel assignments

**DATA RELATIONSHIPS & CORRELATIONS:**

**Clients → Tasks:** Each RequestedTaskIDs entry for a client must match valid TaskIDs in tasks.csv. This ensures clients only request existing tasks.

**Tasks → Workers:** Every skill listed in a task's RequiredSkills must appear in at least one worker's Skills. Without this, no one can perform the task.

**Workers → Phases:** AvailableSlots define which phases a worker can serve. Phase-window and slot-restriction rules rely on these mappings.

**Group Tags:** GroupTag in clients and WorkerGroup in workers link to slot-restriction and load-limit rules for grouped operations.

**PriorityLevel Impact:** A client's PriorityLevel (1-5) signals which requests should be satisfied first during allocation.

**PreferredPhases:** Tasks may specify ranges (e.g. "2-4") or lists ([1,3,5]); these values guide phase-window constraints and must be normalized to explicit phase arrays.

**INPUT DATA:**
Headers: ${JSON.stringify(headers)}
Sample Data: ${JSON.stringify(sampleRows.slice(0, 3))}

**MAPPING INSTRUCTIONS:**

1. **Analyze the headers and sample data** to understand the content and purpose
2. **Use semantic matching** - look for meaning, not exact names:
   - "Customer ID", "Client_ID", "CustomerNumber" → ClientID
   - "Name", "Customer Name", "Client_Name" → ClientName
   - "Priority", "Importance", "Urgency Level" → PriorityLevel
   - "Tasks", "Requested Tasks", "Task_List" → RequestedTaskIDs
   - "Group", "Team", "Category" → GroupTag/WorkerGroup
   - "Skills", "Capabilities", "Expertise" → Skills/RequiredSkills
   - "Available", "Slots", "Phases" → AvailableSlots/PreferredPhases
   - "Load", "Capacity", "Max Load" → MaxLoadPerPhase
   - "Duration", "Length", "Time" → Duration
   - "Concurrent", "Parallel", "Max Parallel" → MaxConcurrent

3. **Examine sample data patterns**:
   - Look for ID patterns (numbers, codes)
   - Identify priority-like values (1-5 range)
   - Spot comma-separated lists (skills, tasks)
   - Find JSON-like content
   - Recognize phase arrays or ranges

4. **Handle variations**:
   - Case insensitive matching
   - Underscore vs space variations
   - Abbreviations (ID, Lvl, Req, etc.)
   - Different ordering of words

5. **Entity determination logic**:
   - If data contains client/customer references + priority/importance → CLIENTS
   - If data contains worker/employee references + skills/availability → WORKERS
   - If data contains task/job references + duration/skills → TASKS
   - Consider the overall context and field combinations

**OUTPUT FORMAT:**
Respond with ONLY a valid JSON object containing:
{
  "entity": "clients" | "workers" | "tasks" | null,
  "mappedHeaders": [array of headers in expected order],
  "confidence": number between 0-1,
  "reasoning": "brief explanation of mapping decisions"
}

**MAPPING RULES:**
- Map input headers to their best matching expected positions
- Use null for missing expected headers
- Maintain original header names in mappedHeaders (don't change them)
- If multiple headers could map to same field, choose the best semantic match
- If no clear entity match, return entity: null with original headers

**EXAMPLES:**

Input: ["Customer ID", "Customer Name", "Task List", "Importance"]
Output: {
  "entity": "clients",
  "mappedHeaders": ["Customer ID", "Customer Name", "Importance", "Task List", null, null],
  "confidence": 0.85,
  "reasoning": "Strong match for clients entity - has customer identifier, name, task references, and priority indicator"
}

Input: ["Employee", "Skills", "Team", "Availability"]
Output: {
  "entity": "workers",
  "mappedHeaders": [null, "Employee", "Skills", "Availability", null, "Team", null],
  "confidence": 0.75,
  "reasoning": "Worker entity detected - contains employee reference, skills, and availability information"
}

Now analyze the provided headers and sample data to determine the best entity mapping.
    `;

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: prompt,
      temperature: 0.1, // Lower temperature for more consistent mapping
    });

    // Strip code block formatting if present
    let text = result.text.trim();
    if (text.startsWith("```")) {
      text = text
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    let mapped = {
      entity: null,
      mappedHeaders: headers,
      confidence: 0,
      reasoning: "Failed to parse AI response",
    };

    try {
      mapped = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse Gemini response:", e, "Raw text:", text);

      // Enhanced fallback - try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          mapped = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error("Fallback JSON extraction also failed:", e2);
          return NextResponse.json({
            entity: null,
            mappedHeaders: headers,
            confidence: 0,
            reasoning: "AI response parsing failed",
          });
        }
      } else {
        return NextResponse.json({
          entity: null,
          mappedHeaders: headers,
          confidence: 0,
          reasoning: "No valid JSON found in AI response",
        });
      }
    }

    // Enhanced validation of the AI's output structure
    if (
      !mapped ||
      typeof mapped.entity === "undefined" ||
      !Array.isArray(mapped.mappedHeaders) ||
      typeof mapped.confidence !== "number"
    ) {
      console.error(
        "AI returned malformed JSON, falling back to original headers.",
      );
      return NextResponse.json({
        entity: null,
        mappedHeaders: headers,
        confidence: 0,
        reasoning: "AI returned malformed response structure",
      });
    }

    // Ensure confidence is between 0 and 1
    mapped.confidence = Math.max(0, Math.min(1, mapped.confidence));

    // Add metadata about the mapping process
    const response = {
      ...mapped,
      timestamp: new Date().toISOString(),
      inputHeaderCount: headers.length,
      mappedHeaderCount: mapped.mappedHeaders.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in Gemini mapping API:", error);
    return NextResponse.json(
      {
        error: "Failed to process mapping request.",
        details: error instanceof Error ? error.message : String(error),
        entity: null,
        mappedHeaders: [],
        confidence: 0,
        reasoning: "API error occurred",
      },
      { status: 500 },
    );
  }
}
