export type EntityType = "clients" | "workers" | "tasks";

export interface MappingResult {
  entity: EntityType | null;
  mappedHeaders: string[];
  confidence: number;
  reasoning: string;
  timestamp?: string;
  inputHeaderCount?: number;
  mappedHeaderCount?: number;
}

export interface EntityData {
  headers: string[];
  data: any[][];
  mappingInfo?: MappingResult;
}

export interface Entities {
  clients: EntityData;
  workers: EntityData;
  tasks: EntityData;
}

export interface ValidationErrors {
  clients: Record<string, string>;
  workers: Record<string, string>;
  tasks: Record<string, string>;
}

// Business Rules Types
export type RuleType = 
  | "coRun" 
  | "slotRestriction" 
  | "loadLimit" 
  | "phaseWindow" 
  | "patternMatch" 
  | "precedenceOverride";

export interface BaseRule {
  id: string;
  type: RuleType;
  name: string;
  description?: string;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoRunRule extends BaseRule {
  type: "coRun";
  tasks: string[]; // TaskIDs that must run together
  minTasks?: number; // Minimum number of tasks that must be selected
  maxTasks?: number; // Maximum number of tasks that can be selected
}

export interface SlotRestrictionRule extends BaseRule {
  type: "slotRestriction";
  groupType: "clientGroup" | "workerGroup";
  groupName: string;
  minCommonSlots: number;
  phases?: number[]; // Specific phases to apply restriction to
}

export interface LoadLimitRule extends BaseRule {
  type: "loadLimit";
  workerGroup: string;
  maxSlotsPerPhase: number;
  phases?: number[]; // Specific phases to apply limit to
}

export interface PhaseWindowRule extends BaseRule {
  type: "phaseWindow";
  taskId: string;
  allowedPhases: number[] | { start: number; end: number };
  strict?: boolean; // If true, task can ONLY run in these phases
}

export interface PatternMatchRule extends BaseRule {
  type: "patternMatch";
  regex: string;
  ruleTemplate: string;
  parameters: Record<string, any>;
  targetEntity: EntityType;
  targetField: string;
}

export interface PrecedenceOverrideRule extends BaseRule {
  type: "precedenceOverride";
  scope: "global" | "specific";
  specificEntity?: EntityType;
  specificField?: string;
  overrideValue: any;
  condition?: {
    field: string;
    operator: "equals" | "notEquals" | "greaterThan" | "lessThan" | "contains";
    value: any;
  };
}

export type Rule = 
  | CoRunRule 
  | SlotRestrictionRule 
  | LoadLimitRule 
  | PhaseWindowRule 
  | PatternMatchRule 
  | PrecedenceOverrideRule;

export interface RuleSuggestion {
  id: string;
  type: RuleType;
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
  suggestedRule: Partial<Rule>;
  dataEvidence: {
    entity: EntityType;
    field: string;
    value: any;
    frequency?: number;
  }[];
}

export interface RulesConfig {
  version: string;
  rules: Rule[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    totalRules: number;
    enabledRules: number;
  };
}

export interface AINaturalLanguageRequest {
  request: string;
  entities: Entities;
  context?: {
    existingRules: Rule[];
    currentPhase?: number;
    specificConstraints?: string[];
  };
}

export interface AINaturalLanguageResponse {
  success: boolean;
  rule?: Rule;
  error?: string;
  reasoning: string;
  confidence: number;
  validationIssues?: string[];
} 