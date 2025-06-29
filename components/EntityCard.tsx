import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Info } from "lucide-react";
import { EditableGrid } from "./EditableGrid";
import { DownloadButton } from "./DownloadButton";
import { EntityType, EntityData } from "@/types/entities";

type CellValue = string | number | boolean | null | undefined;

interface EntityCardProps {
  entity: EntityType;
  entityData: EntityData;
  errors: Record<string, string>;
  onEdit: (rowIdx: number, colIdx: number, value: CellValue) => void;
  onClearErrors?: (entityType: EntityType, rowIdx: number, colIdx: number) => void;
}

export function EntityCard({
  entity,
  entityData,
  errors,
  onEdit,
  onClearErrors,
}: EntityCardProps) {
  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8)
      return <Badge className="bg-green-500">High Confidence</Badge>;
    if (confidence >= 0.6)
      return <Badge className="bg-yellow-500">Medium Confidence</Badge>;
    return <Badge className="bg-red-500">Low Confidence</Badge>;
  };

  const handleEdit = (rowIdx: number, colIdx: number, value: CellValue) => {
    if (onClearErrors) {
      onClearErrors(entity, rowIdx, colIdx);
    }
    
    onEdit(rowIdx, colIdx, value);
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="capitalize text-xl flex items-center gap-2">
              {entity}
              {entityData.mappingInfo &&
                getConfidenceBadge(entityData.mappingInfo.confidence)}
            </CardTitle>
            <CardDescription>
              {entityData.data.length} rows, {entityData.headers.length} columns
            </CardDescription>
          </div>
          <DownloadButton 
            entityType={entity} 
            entityData={entityData}
            disabled={entityData.data.length === 0}
          />
        </div>

        {entityData.mappingInfo && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Reasoning:</strong>{" "}
              {entityData.mappingInfo.reasoning}
              <br />
              <strong>Confidence:</strong>{" "}
              {(entityData.mappingInfo.confidence * 100).toFixed(1)}%
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-2">
          {Object.keys(errors).length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {Object.keys(errors).length} validation error(s) found. Invalid
                cells are highlighted in red.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>All rows valid!</AlertDescription>
            </Alert>
          )}
        </div>

        {Object.keys(errors).some(
          (key) =>
            errors[key].includes("not found") ||
            errors[key].includes("not available")
        ) && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Relationship Issues:</strong> Some data references cannot be
              resolved across entities. Check that referenced tasks exist and
              required skills are available.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      <CardContent>
        <EditableGrid
          data={entityData.data}
          headers={entityData.headers}
          onEdit={handleEdit}
          errors={errors}
          entityType={entity}
        />
      </CardContent>
    </Card>
  );
} 