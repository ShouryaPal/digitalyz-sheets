import { Rule, RulesConfig, RuleType, Entities } from '@/types/entities';

export function generateRuleId(type: RuleType): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}-${timestamp}-${random}`;
}

export function createBaseRule(type: RuleType, name: string, description?: string): Partial<Rule> {
  const now = new Date().toISOString();
  return {
    id: generateRuleId(type),
    type,
    name,
    description,
    priority: 5,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function validateRule(rule: Rule, entities: Entities): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Common validation
  if (!rule.name || rule.name.trim().length === 0) {
    errors.push("Rule name is required");
  }

  if (rule.priority < 1 || rule.priority > 10) {
    errors.push("Priority must be between 1 and 10");
  }

  // Type-specific validation
  switch (rule.type) {
    case "coRun":
      const coRunRule = rule as any;
      if (!coRunRule.tasks || coRunRule.tasks.length < 2) {
        errors.push("Co-run rule requires at least 2 tasks");
      }
      if (coRunRule.tasks) {
        const validTaskIds = entities.tasks.data.map(row => row[0]); // Assuming TaskID is first column
        const invalidTasks = coRunRule.tasks.filter((taskId: string) => !validTaskIds.includes(taskId));
        if (invalidTasks.length > 0) {
          errors.push(`Invalid task IDs: ${invalidTasks.join(", ")}`);
        }
      }
      break;

    case "slotRestriction":
      const slotRule = rule as any;
      if (!slotRule.groupName || slotRule.groupName.trim().length === 0) {
        errors.push("Group name is required for slot restriction rule");
      }
      if (slotRule.minCommonSlots < 1) {
        errors.push("Minimum common slots must be at least 1");
      }
      // Validate group exists
      if (slotRule.groupType === "workerGroup") {
        const workerGroups = entities.workers.data.map(row => row[5]); // Assuming WorkerGroup is 6th column
        if (!workerGroups.includes(slotRule.groupName)) {
          errors.push(`Worker group "${slotRule.groupName}" not found in data`);
        }
      } else if (slotRule.groupType === "clientGroup") {
        const clientGroups = entities.clients.data.map(row => row[4]); // Assuming GroupTag is 5th column
        if (!clientGroups.includes(slotRule.groupName)) {
          errors.push(`Client group "${slotRule.groupName}" not found in data`);
        }
      }
      break;

    case "loadLimit":
      const loadRule = rule as any;
      if (!loadRule.workerGroup || loadRule.workerGroup.trim().length === 0) {
        errors.push("Worker group is required for load limit rule");
      }
      if (loadRule.maxSlotsPerPhase < 1) {
        errors.push("Maximum slots per phase must be at least 1");
      }
      // Validate worker group exists
      const workerGroups = entities.workers.data.map(row => row[5]); // Assuming WorkerGroup is 6th column
      if (!workerGroups.includes(loadRule.workerGroup)) {
        errors.push(`Worker group "${loadRule.workerGroup}" not found in data`);
      }
      break;

    case "phaseWindow":
      const phaseRule = rule as any;
      if (!phaseRule.taskId || phaseRule.taskId.trim().length === 0) {
        errors.push("Task ID is required for phase window rule");
      }
      if (!phaseRule.allowedPhases || 
          (Array.isArray(phaseRule.allowedPhases) && phaseRule.allowedPhases.length === 0) ||
          (typeof phaseRule.allowedPhases === 'object' && !phaseRule.allowedPhases.start && !phaseRule.allowedPhases.end)) {
        errors.push("Allowed phases must be specified");
      }
      // Validate task exists
      const validTaskIds = entities.tasks.data.map(row => row[0]); // Assuming TaskID is first column
      if (!validTaskIds.includes(phaseRule.taskId)) {
        errors.push(`Task ID "${phaseRule.taskId}" not found in data`);
      }
      break;

    case "patternMatch":
      const patternRule = rule as any;
      if (!patternRule.regex || patternRule.regex.trim().length === 0) {
        errors.push("Regex pattern is required for pattern match rule");
      }
      if (!patternRule.ruleTemplate || patternRule.ruleTemplate.trim().length === 0) {
        errors.push("Rule template is required for pattern match rule");
      }
      if (!patternRule.targetEntity || !patternRule.targetField) {
        errors.push("Target entity and field are required for pattern match rule");
      }
      // Validate regex
      try {
        new RegExp(patternRule.regex);
      } catch (e) {
        errors.push("Invalid regex pattern");
      }
      break;

    case "precedenceOverride":
      const precedenceRule = rule as any;
      if (!precedenceRule.scope) {
        errors.push("Scope is required for precedence override rule");
      }
      if (precedenceRule.scope === "specific" && (!precedenceRule.specificEntity || !precedenceRule.specificField)) {
        errors.push("Specific entity and field are required for specific scope precedence override");
      }
      if (precedenceRule.overrideValue === undefined || precedenceRule.overrideValue === null) {
        errors.push("Override value is required for precedence override rule");
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function generateRulesConfig(rules: Rule[]): RulesConfig {
  const now = new Date().toISOString();
  const enabledRules = rules.filter(rule => rule.enabled).length;

  return {
    version: "1.0.0",
    rules: rules.sort((a, b) => b.priority - a.priority), // Sort by priority (highest first)
    metadata: {
      createdAt: now,
      updatedAt: now,
      totalRules: rules.length,
      enabledRules,
    }
  };
}

export function downloadRulesConfig(rulesConfig: RulesConfig, filename: string = "rules.json") {
  const dataStr = JSON.stringify(rulesConfig, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = filename;
  link.click();
  
  URL.revokeObjectURL(link.href);
}

export function getRuleTypeDisplayName(type: RuleType): string {
  const displayNames: Record<RuleType, string> = {
    coRun: "Co-run",
    slotRestriction: "Slot Restriction",
    loadLimit: "Load Limit",
    phaseWindow: "Phase Window",
    patternMatch: "Pattern Match",
    precedenceOverride: "Precedence Override"
  };
  return displayNames[type];
}

export function getRuleTypeDescription(type: RuleType): string {
  const descriptions: Record<RuleType, string> = {
    coRun: "Ensure specific tasks run together",
    slotRestriction: "Limit availability for groups",
    loadLimit: "Limit worker group capacity per phase",
    phaseWindow: "Restrict when tasks can run",
    patternMatch: "Apply rules based on data patterns",
    precedenceOverride: "Override default values based on conditions"
  };
  return descriptions[type];
}

export function getAvailableTaskIds(entities: Entities): string[] {
  return entities.tasks.data.map(row => row[0]).filter(Boolean);
}

export function getAvailableWorkerGroups(entities: Entities): string[] {
  const groups = entities.workers.data.map(row => row[5]).filter(Boolean);
  return [...new Set(groups)]; // Remove duplicates
}

export function getAvailableClientGroups(entities: Entities): string[] {
  const groups = entities.clients.data.map(row => row[4]).filter(Boolean);
  return [...new Set(groups)]; // Remove duplicates
} 