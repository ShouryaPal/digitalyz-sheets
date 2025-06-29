import { z } from "zod";
import { EntityType } from "@/types/entities";

export const clientSchema = z.object({
  ClientID: z.string().min(1, "ClientID is required"),
  ClientName: z.string().min(1, "ClientName is required"),
  PriorityLevel: z.coerce.number().int().min(1).max(5),
  RequestedTaskIDs: z.string().min(1, "RequestedTaskIDs is required"),
  GroupTag: z.string().optional(),
  AttributesJSON: z.string().optional(),
});

export const workerSchema = z.object({
  WorkerID: z.string().min(1, "WorkerID is required"),
  WorkerName: z.string().min(1, "WorkerName is required"),
  Skills: z.string().min(1, "Skills are required"),
  AvailableSlots: z.string().min(1, "AvailableSlots is required"),
  MaxLoadPerPhase: z.coerce
    .number()
    .int()
    .min(1, "MaxLoadPerPhase must be at least 1"),
  WorkerGroup: z.string().optional(),
  QualificationLevel: z.coerce.number().int().min(1).max(10).optional(),
});

export const taskSchema = z.object({
  TaskID: z.string().min(1, "TaskID is required"),
  TaskName: z.string().min(1, "TaskName is required"),
  Category: z.string().min(1, "Category is required"),
  Duration: z.coerce.number().min(1, "Duration must be at least 1"),
  RequiredSkills: z.string().min(1, "RequiredSkills is required"),
  PreferredPhases: z.string().min(1, "PreferredPhases is required"),
  MaxConcurrent: z.coerce
    .number()
    .int()
    .min(1, "MaxConcurrent must be at least 1"),
});

export const entitySchemas: Record<EntityType, z.ZodObject<Record<string, z.ZodTypeAny>>> = {
  clients: clientSchema,
  workers: workerSchema,
  tasks: taskSchema,
};

export const expectedHeaders: Record<EntityType, string[]> = {
  clients: [
    "ClientID",
    "ClientName",
    "PriorityLevel",
    "RequestedTaskIDs",
    "GroupTag",
    "AttributesJSON",
  ],
  workers: [
    "WorkerID",
    "WorkerName",
    "Skills",
    "AvailableSlots",
    "MaxLoadPerPhase",
    "WorkerGroup",
    "QualificationLevel",
  ],
  tasks: [
    "TaskID",
    "TaskName",
    "Category",
    "Duration",
    "RequiredSkills",
    "PreferredPhases",
    "MaxConcurrent",
  ],
}; 