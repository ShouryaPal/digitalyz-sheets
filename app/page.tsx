"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileSpreadsheet, Upload } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { z } from "zod";

interface ParsedData {
  data: any[][];
  headers: string[];
}

interface SheetData {
  [sheetName: string]: ParsedData;
}

type EntityType = "clients" | "workers" | "tasks";

const clientSchema = z.object({
  ClientID: z.string(),
  ClientName: z.string(),
  PriorityLevel: z.coerce.number().int().min(1).max(5),
  RequestedTaskIDs: z.string(),
  GroupTag: z.string().optional(),
  AttributesJSON: z.string().optional(),
});
const workerSchema = z.object({
  WorkerID: z.string(),
  WorkerName: z.string(),
  Skills: z.string(),
  AvailableSlots: z.string(),
  MaxLoadPerPhase: z.coerce.number().int(),
  WorkerGroup: z.string().optional(),
  QualificationLevel: z.string().optional(),
});
const taskSchema = z.object({
  TaskID: z.string(),
  TaskName: z.string(),
  Category: z.string(),
  Duration: z.coerce.number().min(1),
  RequiredSkills: z.string(),
  PreferredPhases: z.string(),
  MaxConcurrent: z.coerce.number().int(),
});

const entitySchemas: Record<EntityType, z.ZodObject<any>> = {
  clients: clientSchema,
  workers: workerSchema,
  tasks: taskSchema,
};

// Helper: Gemini prompt for header/entity mapping via API route
async function mapHeadersWithGemini(rawHeaders: string[], sampleRows: any[][]): Promise<{ entity: EntityType | null, mappedHeaders: string[] }> {
  const res = await fetch("/api/gemini-map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ headers: rawHeaders, sampleRows }),
  });
  if (!res.ok) return { entity: null, mappedHeaders: rawHeaders };
  return await res.json();
}

// Editable grid component
function EditableGrid({ data, headers, onEdit, errors }: { data: any[][], headers: string[], onEdit: (rowIdx: number, colIdx: number, value: any) => void, errors?: Record<string, string> }) {
  const columns = headers.map((header, colIdx) => ({
    header,
    accessorKey: header,
    cell: ({ row }: any) => (
      <input
        className={`w-full border rounded px-2 py-1 ${errors && errors[`${row.index}-${colIdx}`] ? "border-red-500 bg-red-50" : ""}`}
        value={row.original[header] ?? ""}
        onChange={e => onEdit(row.index, colIdx, e.target.value)}
      />
    ),
  }));
  const table = useReactTable({
    data: data.map(row => Object.fromEntries(headers.map((h, i) => [h, row[i]]))),
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {table.getHeaderGroups()[0].headers.map(header => (
            <TableHead key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map(row => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map(cell => (
              <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function Home() {
  const [entities, setEntities] = useState<{
    clients: { headers: string[]; data: any[][] };
    workers: { headers: string[]; data: any[][] };
    tasks: { headers: string[]; data: any[][] };
  }>({
    clients: { headers: [], data: [] },
    workers: { headers: [], data: [] },
    tasks: { headers: [], data: [] },
  });
  const [errors, setErrors] = useState<{
    clients: Record<string, string>;
    workers: Record<string, string>;
    tasks: Record<string, string>;
  }>({ clients: {}, workers: {}, tasks: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Validate a row against a schema
  function validateRow(schema: z.ZodObject<any>, row: any, rowIdx: number): Record<string, string> {
    const result = schema.safeParse(row);
    if (result.success) return {};
    const errs: Record<string, string> = {};
    for (const issue of result.error.issues) {
      if (issue.path.length > 0) {
        const col = issue.path[0] as string;
        errs[`${rowIdx}-${col}`] = issue.message;
      }
    }
    return errs;
  }

  // Handle file upload and AI mapping
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setEntities({
      clients: { headers: [], data: [] },
      workers: { headers: [], data: [] },
      tasks: { headers: [], data: [] },
    });
    setErrors({ clients: {}, workers: {}, tasks: {} });
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    const ext = file.name.split(".").pop()?.toLowerCase();
    let sections: { headers: string[]; data: any[][] }[] = [];

    // Parse file into sections/sheets
    if (ext === "csv") {
      const parsed = await new Promise<any>((resolve, reject) => {
        Papa.parse(file, {
          complete: (results) => resolve(results.data),
          error: (err) => reject(err),
        });
      });
      const data = parsed as any[][];
      if (!data.length) {
        setError("CSV file is empty.");
        setLoading(false);
        return;
      }
      let currentSection: any[][] = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const isEmptyRow =
          !row ||
          row.length === 0 ||
          row.every(
            (cell) =>
              cell === null ||
              cell === undefined ||
              cell.toString().trim() === "",
          );
        if (isEmptyRow) {
          if (currentSection.length > 1) {
            sections.push({
              headers: currentSection[0],
              data: currentSection.slice(1),
            });
          }
          currentSection = [];
        } else {
          currentSection.push(row);
        }
      }
      if (currentSection.length > 1) {
        sections.push({ headers: currentSection[0], data: currentSection.slice(1) });
      }
      if (sections.length === 0 && data.length > 1) {
        sections.push({ headers: data[0], data: data.slice(1) });
      }
    } else if (ext === "xlsx") {
      const parsed = await new Promise<any>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array" });
            const allSections: { headers: string[]; data: any[][] }[] = [];
            workbook.SheetNames.forEach((sheetName) => {
              const worksheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
              if (json.length > 0) {
                allSections.push({ headers: json[0], data: json.slice(1) });
              }
            });
            resolve(allSections);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject("Failed to read XLSX file.");
        reader.readAsArrayBuffer(file);
      });
      sections = parsed as { headers: string[]; data: any[][] }[];
    } else {
      setError("Unsupported file type. Please upload a .csv or .xlsx file.");
      setLoading(false);
      return;
    }

    // AI mapping for each section
    const entityBuckets: {
      clients: { headers: string[]; data: any[][] };
      workers: { headers: string[]; data: any[][] };
      tasks: { headers: string[]; data: any[][] };
    } = { clients: { headers: [], data: [] }, workers: { headers: [], data: [] }, tasks: { headers: [], data: [] } };
    for (const section of sections) {
      const { entity, mappedHeaders } = await mapHeadersWithGemini(section.headers, section.data);
      if (entity && entityBuckets[entity]) {
        // Map data to new header order
        const headerIdxMap = mappedHeaders.map(h => section.headers.indexOf(h));
        const mappedData = section.data.map(row => headerIdxMap.map(idx => row[idx]));
        entityBuckets[entity] = {
          headers: mappedHeaders,
          data: [...entityBuckets[entity].data, ...mappedData],
        };
      }
    }
    setEntities(entityBuckets);

    // Initial validation
    const newErrors: typeof errors = { clients: {}, workers: {}, tasks: {} };
    (Object.keys(entityBuckets) as EntityType[]).forEach((entity) => {
      const { headers, data } = entityBuckets[entity];
      const schema = entitySchemas[entity];
      data.forEach((row, rowIdx) => {
        const rowObj = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
        const rowErrors = validateRow(schema, rowObj, rowIdx);
        Object.assign(newErrors[entity], rowErrors);
      });
    });
    setErrors(newErrors);
    setLoading(false);
  };

  // Inline edit handler
  function handleEdit(entity: EntityType, rowIdx: number, colIdx: number, value: any) {
    setEntities(prev => {
      const updated = { ...prev };
      const row = [...updated[entity].data[rowIdx]];
      row[colIdx] = value;
      updated[entity].data = [
        ...updated[entity].data.slice(0, rowIdx),
        row,
        ...updated[entity].data.slice(rowIdx + 1),
      ];
      return updated;
    });
    // Re-validate the edited row
    setErrors(prev => {
      const updated = { ...prev };
      const headers = entities[entity].headers;
      const row = entities[entity].data[rowIdx];
      const rowObj = Object.fromEntries(headers.map((h, i) => [h, row[i]]));
      const rowErrors = validateRow(entitySchemas[entity], rowObj, rowIdx);
      // Remove previous errors for this row
      Object.keys(updated[entity]).forEach(key => {
        if (key.startsWith(`${rowIdx}-`)) delete updated[entity][key];
      });
      Object.assign(updated[entity], rowErrors);
      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
              <CardTitle className="text-3xl font-bold text-indigo-700">
                Data Alchemist: AI Spreadsheet Cleaner
              </CardTitle>
            </div>
            <CardDescription className="text-lg">
              Upload CSV or XLSX files for clients, workers, and tasks. AI will map, validate, and let you edit in place.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file-upload" className="text-sm font-medium">
                Choose File
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleFile}
                  disabled={loading}
                  className="cursor-pointer"
                />
                {loading && (
                  <div className="flex items-center gap-2 text-indigo-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Editable Grids for each entity */}
            {(entities.clients.data.length > 0 || entities.workers.data.length > 0 || entities.tasks.data.length > 0) && (
              <div className="space-y-8">
                {(["clients", "workers", "tasks"] as EntityType[]).map((entity) =>
                  entities[entity].data.length > 0 ? (
                    <Card key={entity} className="border-2 border-indigo-200">
                      <CardHeader>
                        <CardTitle className="capitalize text-xl">{entity}</CardTitle>
                        <CardDescription>
                          {entities[entity].data.length} rows, {entities[entity].headers.length} columns
                        </CardDescription>
                        {/* Validation summary placeholder */}
                        <div className="mt-2">
                          {Object.keys(errors[entity]).length > 0 ? (
                            <Alert variant="destructive">
                              <AlertDescription>
                                {Object.keys(errors[entity]).length} validation error(s) found. Invalid cells are highlighted in red.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert variant="default">
                              <AlertDescription>All rows valid!</AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <EditableGrid
                          data={entities[entity].data}
                          headers={entities[entity].headers}
                          onEdit={(rowIdx, colIdx, value) => handleEdit(entity, rowIdx, colIdx, value)}
                          errors={errors[entity]}
                        />
                      </CardContent>
                    </Card>
                  ) : null
                )}
              </div>
            )}

            {/* Natural language search placeholder */}
            <div className="mt-8">
              <Label className="text-md font-medium">Natural Language Search (coming soon)</Label>
              <Input disabled placeholder="e.g. Show all tasks with duration > 1 and phase 2 in preferred phases" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
