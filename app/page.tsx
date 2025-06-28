"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { EntityCard } from "@/components/EntityCard";
import { 
  validateRow,
  validatePriorityLevel,
  validateDuration,
  validateMaxLoadPerPhase,
  validateMaxConcurrent,
  validateAvailableSlots,
  validatePreferredPhases,
  validateQualificationLevel
} from "@/components/validation/validationUtils";
import { validateRelationships } from "@/components/validation/relationshipValidation";
import { entitySchemas } from "@/lib/schemas";
import { mapHeadersWithGemini } from "@/lib/api";
import { processCSVFile, processXLSXFile } from "@/lib/fileProcessing";
import { EntityType, Entities, ValidationErrors } from "@/types/entities";

export default function Home() {
  const [entities, setEntities] = useState<Entities>({
    clients: { headers: [], data: [] },
    workers: { headers: [], data: [] },
    tasks: { headers: [], data: [] },
  });

  const [errors, setErrors] = useState<ValidationErrors>({ 
    clients: {}, 
    workers: {}, 
    tasks: {} 
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");

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
    setProcessingStatus("Reading file...");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let sections: { headers: string[]; data: any[][] }[] = [];

      if (ext === "csv") {
        setProcessingStatus("Parsing CSV...");
        sections = await processCSVFile(file);
      } else if (ext === "xlsx") {
        setProcessingStatus("Parsing Excel file...");
        sections = await processXLSXFile(file);
      } else {
        throw new Error(
          "Unsupported file type. Please upload a .csv or .xlsx file.",
        );
      }

      if (sections.length === 0) {
        throw new Error("No data sections found in the file.");
      }

      setProcessingStatus("Mapping headers with AI...");
      const entityBuckets: Entities = {
        clients: { headers: [], data: [] },
        workers: { headers: [], data: [] },
        tasks: { headers: [], data: [] },
      };

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        setProcessingStatus(
          `Processing section ${i + 1}/${sections.length}...`,
        );

        const mappingResult = await mapHeadersWithGemini(
          section.headers,
          section.data.slice(0, 3), 
        );

        if (mappingResult.entity && entityBuckets[mappingResult.entity]) {
          const headerIdxMap = mappingResult.mappedHeaders.map((h) =>
            h === "null" ? -1 : section.headers.indexOf(h),
          );

          const mappedData = section.data.map((row) =>
            headerIdxMap.map((idx) => (idx === -1 ? null : row[idx] || null)),
          );

          const entity = mappingResult.entity;
          entityBuckets[entity] = {
            headers: mappingResult.mappedHeaders,
            data: [...entityBuckets[entity].data, ...mappedData],
            mappingInfo: mappingResult,
          };
        }
      }

      setEntities(entityBuckets);

      setProcessingStatus("Validating data...");
      const newErrors: ValidationErrors = { clients: {}, workers: {}, tasks: {} };

      (Object.keys(entityBuckets) as EntityType[]).forEach((entity) => {
        const { headers, data } = entityBuckets[entity];
        const schema = entitySchemas[entity];

        data.forEach((row, rowIdx) => {
          const rowObj = Object.fromEntries(
            headers.map((h, i) => [h === "null" ? `unknown_${i}` : h, row[i]]),
          );

          const rowErrors = validateRow(schema, rowObj, rowIdx, headers);
          Object.assign(newErrors[entity], rowErrors);

          headers.forEach((header, colIdx) => {
            const value = row[colIdx];

            if (header === "PriorityLevel") {
              const error = validatePriorityLevel(value);
              if (error) newErrors[entity][`${rowIdx}-${colIdx}`] = error;
            } else if (header === "Duration") {
              const error = validateDuration(value);
              if (error) newErrors[entity][`${rowIdx}-${colIdx}`] = error;
            } else if (header === "MaxLoadPerPhase") {
              const error = validateMaxLoadPerPhase(value);
              if (error) newErrors[entity][`${rowIdx}-${colIdx}`] = error;
            } else if (header === "MaxConcurrent") {
              const error = validateMaxConcurrent(value);
              if (error) newErrors[entity][`${rowIdx}-${colIdx}`] = error;
            } else if (header === "AvailableSlots") {
              const error = validateAvailableSlots(value);
              if (error) newErrors[entity][`${rowIdx}-${colIdx}`] = error;
            } else if (header === "PreferredPhases") {
              const error = validatePreferredPhases(value);
              if (error) newErrors[entity][`${rowIdx}-${colIdx}`] = error;
            } else if (header === "QualificationLevel") {
              const error = validateQualificationLevel(value);
              if (error) newErrors[entity][`${rowIdx}-${colIdx}`] = error;
            }
          });
        });
      });

      const relationshipErrors = validateRelationships(entityBuckets);

      Object.entries(relationshipErrors).forEach(([key, error]) => {
        const [entity, rowIdx, colIdx] = key.split('-');
        if (entity && rowIdx && colIdx && newErrors[entity as EntityType]) {
          newErrors[entity as EntityType][`${rowIdx}-${colIdx}`] = error;
        }
      });

      setErrors(newErrors);
      setProcessingStatus("Complete!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred",
      );
    } finally {
      setLoading(false);
      setTimeout(() => setProcessingStatus(""), 2000);
    }
  };

  function handleEdit(
    entity: EntityType,
    rowIdx: number,
    colIdx: number,
    value: any,
  ) {
    setEntities((prev) => {
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

    setTimeout(() => {
      setErrors((prev) => {
        const updated = { ...prev };
        const headers = entities[entity].headers;
        const newData = [...entities[entity].data];
        newData[rowIdx][colIdx] = value;
        const rowObj = Object.fromEntries(
          headers.map((h, i) => [
            h === "null" ? `unknown_${i}` : h,
            newData[rowIdx][i],
          ]),
        );

        Object.keys(updated[entity]).forEach((key) => {
          if (key.startsWith(`${rowIdx}-`)) delete updated[entity][key];
        });

        const rowErrors = validateRow(
          entitySchemas[entity],
          rowObj,
          rowIdx,
          headers,
        );
        Object.assign(updated[entity], rowErrors);

        const header = headers[colIdx];
        if (header === "PriorityLevel") {
          const error = validatePriorityLevel(value);
          if (error) updated[entity][`${rowIdx}-${colIdx}`] = error;
        } else if (header === "Duration") {
          const error = validateDuration(value);
          if (error) updated[entity][`${rowIdx}-${colIdx}`] = error;
        } else if (header === "MaxLoadPerPhase") {
          const error = validateMaxLoadPerPhase(value);
          if (error) updated[entity][`${rowIdx}-${colIdx}`] = error;
        } else if (header === "MaxConcurrent") {
          const error = validateMaxConcurrent(value);
          if (error) updated[entity][`${rowIdx}-${colIdx}`] = error;
        } else if (header === "AvailableSlots") {
          const error = validateAvailableSlots(value);
          if (error) updated[entity][`${rowIdx}-${colIdx}`] = error;
        } else if (header === "PreferredPhases") {
          const error = validatePreferredPhases(value);
          if (error) updated[entity][`${rowIdx}-${colIdx}`] = error;
        } else if (header === "QualificationLevel") {
          const error = validateQualificationLevel(value);
          if (error) updated[entity][`${rowIdx}-${colIdx}`] = error;
        }

        const relationshipErrors = validateRelationships(entities);
        Object.entries(relationshipErrors).forEach(([key, error]) => {
          const [relEntity, relRowIdx, relColIdx] = key.split('-');
          if (relEntity === entity && relRowIdx === rowIdx.toString()) {
            updated[entity][`${relRowIdx}-${relColIdx}`] = error;
          }
        });
        
        return updated;
      });
    }, 0);
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
              Upload CSV or XLSX files for clients, workers, and tasks. AI will
              intelligently map, validate, and let you edit in place.
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
                    <span className="text-sm">{processingStatus}</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {(entities.clients.data.length > 0 ||
              entities.workers.data.length > 0 ||
              entities.tasks.data.length > 0) && (
              <div className="space-y-8">
                {(["clients", "workers", "tasks"] as EntityType[]).map(
                  (entity) =>
                    entities[entity].data.length > 0 ? (
                      <EntityCard
                        key={entity}
                        entity={entity}
                        entityData={entities[entity]}
                        errors={errors[entity]}
                        onEdit={(rowIdx, colIdx, value) =>
                          handleEdit(entity, rowIdx, colIdx, value)
                        }
                      />
                    ) : null,
                )}
              </div>
            )}
            <div className="mt-8">
              <Label className="text-md font-medium">
                Natural Language Search (coming soon)
              </Label>
              <Input
                disabled
                placeholder="e.g. Show all tasks with duration > 1 and phase 2 in preferred phases"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
