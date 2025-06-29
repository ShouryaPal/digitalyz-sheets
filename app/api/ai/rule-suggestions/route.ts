import { NextRequest, NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { Entities, RuleSuggestion, Rule } from "@/types/entities";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { entities, existingRules = [] }: { entities: Entities; existingRules?: Rule[] } = await req.json();

    const prompt = `
You are an AI-powered business rules analyst for a task scheduling system. Your job is to analyze data patterns and suggest relevant business rules that could improve the scheduling process.

**AVAILABLE RULE TYPES:**

1. **Co-run Rule** (type: "coRun")
   - Detects when tasks frequently appear together in client requests
   - Suggests rules to ensure these tasks are scheduled together

2. **Slot Restriction** (type: "slotRestriction")
   - Identifies groups that have limited availability patterns
   - Suggests restrictions to prevent overloading these groups

3. **Load Limit** (type: "loadLimit")
   - Analyzes worker group capacity and workload patterns
   - Suggests limits to prevent overloading specific groups

4. **Phase Window** (type: "phaseWindow")
   - Identifies tasks with specific phase preferences
   - Suggests phase restrictions based on task characteristics

5. **Pattern Match** (type: "patternMatch")
   - Finds patterns in task names, categories, or other fields
   - Suggests rules based on naming conventions or categories

6. **Precedence Override** (type: "precedenceOverride")
   - Identifies priority patterns or special handling needs
   - Suggests overrides for specific conditions

**CURRENT DATA:**
${JSON.stringify(entities, null, 2)}

**EXISTING RULES:**
${JSON.stringify(existingRules, null, 2)}

**ANALYSIS INSTRUCTIONS:**
1. Analyze the data for patterns, correlations, and potential issues
2. Look for:
   - Tasks that frequently appear together in client requests
   - Worker groups that might be overloaded
   - Tasks with specific phase preferences
   - Priority patterns or special handling needs
   - Groups with limited availability
   - Naming conventions or categories that suggest rules

3. Generate 3-5 high-confidence rule suggestions
4. Each suggestion should include:
   - Clear reasoning based on data evidence
   - Specific parameters extracted from the data
   - Confidence level based on pattern strength
   - Data evidence supporting the suggestion

**OUTPUT FORMAT:**
Respond with ONLY a valid JSON array of rule suggestions:
[
  {
    "id": "suggestion-001",
    "type": "ruleType",
    "title": "Descriptive title",
    "description": "Detailed description of the suggested rule",
    "confidence": number (0-1),
    "reasoning": "Explanation of why this rule is suggested",
    "suggestedRule": {
      "id": "generated-unique-id",
      "type": "ruleType",
      "name": "Rule name",
      "description": "Rule description",
      "priority": number (1-10),
      "enabled": true,
      "createdAt": "ISO timestamp",
      "updatedAt": "ISO timestamp",
      ...rule-specific-parameters
    },
    "dataEvidence": [
      {
        "entity": "entityType",
        "field": "fieldName",
        "value": "specific value",
        "frequency": number
      }
    ]
  }
]

**PATTERN ANALYSIS EXAMPLES:**

1. **Co-run Detection:**
   - Look for clients requesting multiple specific tasks together
   - Check if certain task combinations appear frequently
   - Example: "Tasks T12 and T14 appear together in 80% of client requests"

2. **Load Limit Detection:**
   - Analyze worker group sizes vs. task demands
   - Check for groups that might be overloaded
   - Example: "Engineering team has 5 workers but 15 tasks assigned"

3. **Phase Window Detection:**
   - Look for tasks with specific phase preferences
   - Check if certain tasks are only available in specific phases
   - Example: "Task T15 is only available in phases 2-4"

4. **Pattern Match Detection:**
   - Find naming conventions or categories
   - Look for patterns in task names, client groups, etc.
   - Example: "All tasks with 'urgent' in name have priority 1"

Now analyze the data and generate rule suggestions.
    `;

    const result = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: prompt,
      temperature: 0.2,
    });

    // Parse the AI response
    let text = result.text.trim();
    if (text.startsWith("```")) {
      text = text
        .replace(/^```[a-zA-Z]*\n?/, "")
        .replace(/```$/, "")
        .trim();
    }

    let suggestions: RuleSuggestion[];

    try {
      suggestions = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response:", e, "Raw text:", text);
      
      // Try to extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          suggestions = JSON.parse(jsonMatch[0]);
        } catch {
          return NextResponse.json({
            suggestions: [],
            error: "Failed to parse AI response",
          });
        }
      } else {
        return NextResponse.json({
          suggestions: [],
          error: "No valid JSON array found in AI response",
        });
      }
    }

    // Validate the response structure
    if (!Array.isArray(suggestions)) {
      return NextResponse.json({
        suggestions: [],
        error: "AI response is not an array",
      });
    }

    // Validate each suggestion
    const validSuggestions = suggestions.filter(suggestion => {
      return suggestion && 
             suggestion.id && 
             suggestion.type && 
             suggestion.title && 
             suggestion.confidence !== undefined &&
             suggestion.suggestedRule;
    });

    // Ensure confidence is between 0 and 1 for each suggestion
    validSuggestions.forEach(suggestion => {
      suggestion.confidence = Math.max(0, Math.min(1, suggestion.confidence));
    });

    return NextResponse.json({
      suggestions: validSuggestions,
      totalFound: validSuggestions.length,
    });
  } catch (error) {
    console.error("Error in rule suggestions API:", error);
    return NextResponse.json(
      {
        suggestions: [],
        error: "Failed to generate rule suggestions",
      },
      { status: 500 }
    );
  }
} 