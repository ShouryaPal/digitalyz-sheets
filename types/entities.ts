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