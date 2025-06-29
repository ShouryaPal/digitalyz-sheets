import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { AINaturalLanguageRequest, AINaturalLanguageResponse } from "@/types/entities";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { request, entities, context }: AINaturalLanguageRequest = await req.json();

    const prompt = `
You are an AI-powered business rules expert for a task scheduling system. Your job is to convert natural language requests into structured business rules.

**AVAILABLE RULE TYPES:**

1. **Co-run Rule** (type: "coRun")
   - Purpose: Ensure specific tasks run together
   - Parameters: tasks (array of TaskIDs), minTasks, maxTasks
   - Example: "Tasks T12 and T14 must run together"

2. **Slot Restriction** (type: "slotRestriction")
   - Purpose: Limit availability for groups
   - Parameters: groupType ("clientGroup" | "workerGroup"), groupName, minCommonSlots, phases
   - Example: "Sales team needs at least 3 common slots"

3. **Load Limit** (type: "loadLimit")
   - Purpose: Limit worker group capacity per phase
   - Parameters: workerGroup, maxSlotsPerPhase, phases
   - Example: "Engineering team can handle max 5 tasks per phase"

4. **Phase Window** (type: "phaseWindow")
   - Purpose: Restrict when tasks can run
   - Parameters: taskId, allowedPhases (array or range), strict
   - Example: "Task T15 can only run in phases 2-4"

5. **Pattern Match** (type: "patternMatch")
   - Purpose: Apply rules based on data patterns
   - Parameters: regex, ruleTemplate, parameters, targetEntity, targetField
   - Example: "All tasks with 'urgent' in name get priority 1"

6. **Precedence Override** (type: "precedenceOverride")
   - Purpose: Override default values based on conditions
   - Parameters: scope, specificEntity, specificField, overrideValue, condition
   - Example: "VIP clients get priority 1 regardless of other factors"

**CURRENT DATA CONTEXT:**
${JSON.stringify(entities, null, 2)}

**EXISTING RULES:**
${context?.existingRules ? JSON.stringify(context.existingRules, null, 2) : "None"}

**USER REQUEST:**
"${request}"

**INSTRUCTIONS:**
1. Analyze the user's natural language request
2. Determine which rule type best fits the request
3. Extract relevant parameters from the request and available data
4. Validate that the rule can be applied with the current data
5. Generate a complete rule object with all required fields

**OUTPUT FORMAT:**
Respond with ONLY a valid JSON object:
{
  "success": boolean,
  "rule": {
    "id": "generated-unique-id",
    "type": "ruleType",
    "name": "Descriptive rule name",
    "description": "Detailed description",
    "priority": number (1-10),
    "enabled": true,
    "createdAt": "ISO timestamp",
    "updatedAt": "ISO timestamp",
    ...rule-specific-parameters
  },
  "reasoning": "Explanation of how you interpreted the request",
  "confidence": number (0-1),
  "validationIssues": ["any issues found"]
}

**VALIDATION RULES:**
- TaskIDs must exist in the tasks data
- Group names must exist in the respective entity data
- Phase numbers must be valid integers
- Priority must be between 1-10
- All required fields must be present

**EXAMPLES:**

Request: "Tasks T12 and T14 must always run together"
Response: {
  "success": true,
  "rule": {
    "id": "corun-001",
    "type": "coRun",
    "name": "T12-T14 Co-run Rule",
    "description": "Tasks T12 and T14 must be scheduled together",
    "priority": 5,
    "enabled": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "tasks": ["T12", "T14"]
  },
  "reasoning": "Identified co-run requirement for specific task pair",
  "confidence": 0.95,
  "validationIssues": []
}

Request: "Engineering team can handle maximum 3 tasks per phase"
Response: {
  "success": true,
  "rule": {
    "id": "loadlimit-001",
    "type": "loadLimit",
    "name": "Engineering Team Load Limit",
    "description": "Limit engineering team to 3 tasks per phase",
    "priority": 7,
    "enabled": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z",
    "workerGroup": "Engineering",
    "maxSlotsPerPhase": 3
  },
  "reasoning": "Identified load limit requirement for worker group",
  "confidence": 0.9,
  "validationIssues": []
}

Now process the user's request and generate the appropriate rule.
    `;

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: prompt,
      temperature: 0.1,
    });

    // Parse the AI response
    let text = result.text.trim();
    if (text.startsWith("```")) {
      text = text
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    let response: AINaturalLanguageResponse;

    try {
      response = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response:", e, "Raw text:", text);
      
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          response = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({
            success: false,
            error: "Failed to parse AI response",
            reasoning: "AI returned invalid JSON format",
            confidence: 0,
          } as AINaturalLanguageResponse);
        }
      } else {
        return NextResponse.json({
          success: false,
          error: "No valid JSON found in AI response",
          reasoning: "AI response format was unexpected",
          confidence: 0,
        } as AINaturalLanguageResponse);
      }
    }

    // Validate the response structure
    if (!response || typeof response.success !== "boolean") {
      return NextResponse.json({
        success: false,
        error: "Invalid response structure from AI",
        reasoning: "AI response missing required fields",
        confidence: 0,
      } as AINaturalLanguageResponse);
    }

    // Ensure confidence is between 0 and 1
    if (response.confidence !== undefined) {
      response.confidence = Math.max(0, Math.min(1, response.confidence));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in natural language API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process natural language request",
        reasoning: "API error occurred",
        confidence: 0,
      } as AINaturalLanguageResponse,
      { status: 500 }
    );
  }
} 