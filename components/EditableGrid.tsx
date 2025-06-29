import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EntityType } from "@/types/entities";
import { useUpdatedDataStore } from "@/lib/updatedDataStore";

// Define a more specific type for cell values
type CellValue = string | number | boolean | null | undefined;

interface EditableGridProps {
  data: CellValue[][];
  headers: string[];
  onEdit: (rowIdx: number, colIdx: number, value: CellValue) => void;
  errors?: Record<string, string>;
  entityType: EntityType;
}

// Expected headers for different entity types
const expectedHeaders: Record<EntityType, string[]> = {
  clients: ["ClientID", "ClientName", "PriorityLevel", "RequestedTaskIDs", "GroupTag", "AttributesJSON"],
  workers: ["WorkerID", "WorkerName", "Skills", "AvailableSlots", "MaxLoadPerPhase", "WorkerGroup", "QualificationLevel"],
  tasks: ["TaskID", "TaskName", "Category", "Duration", "RequiredSkills", "PreferredPhases", "MaxConcurrent"]
};

export function EditableGrid({
  data,
  headers,
  onEdit,
  errors = {},
  entityType,
}: EditableGridProps) {
  const expectedHeadersForEntity = expectedHeaders[entityType];
  
  // Zustand store for managing updated data
  const {
    updatedData,
    initializeData,
    updateCell: updateStoreCell,
    hasChanges,
    getModifiedCells
  } = useUpdatedDataStore();

  const [localData, setLocalData] = useState<CellValue[][]>([]);
  useEffect(() => {
    if (data && data.length > 0) {
      initializeData(entityType, data);
    }
  }, [data, entityType, initializeData]);

  useEffect(() => {
    const storeData = updatedData[entityType];
    if (storeData && storeData.length > 0) {
      setLocalData(storeData);
    } else {
      setLocalData(data);
    }
  }, [updatedData, entityType, data]);

  const handleInputChange = (rowIdx: number, colIdx: number, value: string) => {
    setLocalData(prev => {
      const newData = [...prev];
      if (!newData[rowIdx]) {
        newData[rowIdx] = [];
      }
      newData[rowIdx] = [...newData[rowIdx]];
      newData[rowIdx][colIdx] = value;
      return newData;
    });

    updateStoreCell(entityType, rowIdx, colIdx, value);

    onEdit(rowIdx, colIdx, value);
  };

  const getCellError = (rowIdx: number, colIdx: number): string | undefined => {
    const errorKey = `${rowIdx}-${colIdx}`;
    return errors[errorKey];
  };

  const isRelationshipError = (error: string): boolean => {
    return error.includes("not found") || error.includes("not available");
  };

  const isCellModified = (rowIdx: number, colIdx: number): boolean => {
    const modifiedCells = getModifiedCells(entityType);
    return modifiedCells.includes(`${rowIdx}-${colIdx}`);
  };

  const filteredData = localData.filter((row) => {
    return row.some((cell) => {
      const value = cell?.toString().trim();
      return value && value !== "" && value !== "null" && value !== "undefined";
    });
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-sm mb-2">Expected Headers:</h4>
          <div className="flex flex-wrap gap-1">
            {expectedHeadersForEntity.map((header, idx) => (
              <Badge
                key={idx}
                variant={
                  headers[idx] && headers[idx] !== "null"
                    ? "default"
                    : "secondary"
                }
                className="text-xs"
              >
                {header}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-sm mb-2">Mapped Headers:</h4>
          <div className="flex flex-wrap gap-1">
            {headers.map((header, idx) => (
              <Badge
                key={idx}
                variant={header === "null" ? "destructive" : "outline"}
                className="text-xs"
              >
                {header === "null" ? "Not mapped" : header}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {hasChanges(entityType) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {getModifiedCells(entityType).length} changes
            </Badge>
            <span className="text-sm text-blue-700">
              Data has been modified. Save to persist changes.
            </span>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header, idx) => (
                <TableHead key={idx} className="min-w-32">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {header}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      → {expectedHeadersForEntity[idx] || "Extra"}
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, rowIdx) => {
              return (
              <TableRow key={rowIdx}>
                {headers.map((header, colIdx) => {
                  const cellError = getCellError(rowIdx, colIdx);
                  const hasError = Boolean(cellError);
                  const isRelError = cellError ? isRelationshipError(cellError) : false;
                  const isModified = isCellModified(rowIdx, colIdx);
                  
                  return (
                    <TableCell key={colIdx} className="p-2">
                      <div className="space-y-1">
                        <input
                          type="text"
                          className={`w-full border rounded px-3 py-2 text-sm transition-colors ${
                            hasError
                              ? isRelError
                                ? "border-red-600 bg-red-50 text-red-800 focus:border-red-700 focus:ring-red-200"
                                : "border-red-500 bg-red-50 focus:border-red-600 focus:ring-red-200"
                              : isModified
                              ? "border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-blue-200"
                              : "border-input bg-background hover:border-gray-400 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          }`}
                          value={String(row[colIdx] ?? "")}
                          onChange={(e) => handleInputChange(rowIdx, colIdx, e.target.value)}
                          placeholder={header === "null" ? "Not mapped" : `Enter ${header}`}
                          disabled={header === "null"}
                        />
                        {hasError && (
                          <div className={`text-xs ${
                            isRelError ? "text-red-700 font-medium" : "text-red-600"
                          }`}>
                            {cellError}
                          </div>
                        )}
                        {isModified && !hasError && (
                          <div className="text-xs text-blue-600 font-medium">
                            Modified
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}