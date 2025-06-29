import { z } from "zod";

// Define a more specific type for cell values
type CellValue = string | number | boolean | null | undefined;

export function validateNumericField(value: CellValue, fieldName: string): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  return null;
}

export function validatePriorityLevel(value: CellValue): string | null {
  const numError = validateNumericField(value, "PriorityLevel");
  if (numError) return numError;
  
  const num = Number(value);
  if (num < 1 || num > 5) {
    return "PriorityLevel must be between 1 and 5";
  }
  return null;
}

export function validateDuration(value: CellValue): string | null {
  const numError = validateNumericField(value, "Duration");
  if (numError) return numError;
  
  const num = Number(value);
  if (num < 1) {
    return "Duration must be at least 1";
  }
  return null;
}

export function validateMaxLoadPerPhase(value: CellValue): string | null {
  const numError = validateNumericField(value, "MaxLoadPerPhase");
  if (numError) return numError;
  
  const num = Number(value);
  if (num < 1) {
    return "MaxLoadPerPhase must be at least 1";
  }
  return null;
}

export function validateMaxConcurrent(value: CellValue): string | null {
  const numError = validateNumericField(value, "MaxConcurrent");
  if (numError) return numError;
  
  const num = Number(value);
  if (num < 1) {
    return "MaxConcurrent must be at least 1";
  }
  return null;
}

export function validateAvailableSlots(value: CellValue): string | null {
  if (!value || value === "") return null;
  
  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(value.toString());
    if (!Array.isArray(parsed)) {
      return "AvailableSlots must be an array of numbers";
    }
    
    for (const item of parsed) {
      const num = Number(item);
      if (isNaN(num) || num < 1) {
        return "AvailableSlots must contain positive numbers only";
      }
    }
  } catch {
    // If not JSON, check if it's comma-separated numbers
    const parts = value.toString().split(',').map((s: string) => s.trim());
    for (const part of parts) {
      const num = Number(part);
      if (isNaN(num) || num < 1) {
        return "AvailableSlots must be comma-separated positive numbers or JSON array";
      }
    }
  }
  return null;
}

export function validatePreferredPhases(value: CellValue): string | null {
  if (!value || value === "") return null;
  
  try {
    // Try to parse as JSON array
    const parsed = JSON.parse(value.toString());
    if (!Array.isArray(parsed)) {
      return "PreferredPhases must be an array of numbers";
    }
    
    for (const item of parsed) {
      const num = Number(item);
      if (isNaN(num) || num < 1) {
        return "PreferredPhases must contain positive numbers only";
      }
    }
  } catch {
    // Check for range syntax like "1-3"
    if (value.toString().includes('-')) {
      const [start, end] = value.toString().split('-').map((s: string) => Number(s.trim()));
      if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > end) {
        return "PreferredPhases range must be valid positive numbers (e.g., '1-3')";
      }
    } else {
      // Check comma-separated numbers
      const parts = value.toString().split(',').map((s: string) => s.trim());
      for (const part of parts) {
        const num = Number(part);
        if (isNaN(num) || num < 1) {
          return "PreferredPhases must be comma-separated numbers, range, or JSON array";
        }
      }
    }
  }
  return null;
}

export function validateQualificationLevel(value: CellValue): string | null {
  if (value === null || value === undefined || value === "") return null;
  
  const numError = validateNumericField(value, "QualificationLevel");
  if (numError) return numError;
  
  const num = Number(value);
  if (num < 1 || num > 10) {
    return "QualificationLevel must be between 1 and 10";
  }
  return null;
}

export function validateRow(
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>,
  row: CellValue[],
  rowIdx: number,
  headers: string[],
): Record<string, string> {
  const result = schema.safeParse(row);
  if (result.success) return {};

  const errs: Record<string, string> = {};
  for (const issue of result.error.issues) {
    if (issue.path.length > 0) {
      const fieldName = issue.path[0] as string;
      const colIdx = headers.indexOf(fieldName);
      if (colIdx !== -1) {
        errs[`${rowIdx}-${colIdx}`] = issue.message;
      }
    }
  }
  return errs;
} 