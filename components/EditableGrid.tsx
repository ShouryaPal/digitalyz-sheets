import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { EntityType } from "@/types/entities";
import { expectedHeaders } from "@/lib/schemas";

interface EditableGridProps {
  data: any[][];
  headers: string[];
  onEdit: (rowIdx: number, colIdx: number, value: any) => void;
  errors?: Record<string, string>;
  entityType: EntityType;
}

export function EditableGrid({
  data,
  headers,
  onEdit,
  errors,
  entityType,
}: EditableGridProps) {
  const expectedHeadersForEntity = expectedHeaders[entityType];

  const columns = headers.map((header, colIdx) => ({
    header,
    accessorKey: header,
    cell: ({ row }: any) => {
      const errorKey = `${row.index}-${colIdx}`;
      const hasError = errors && errors[errorKey];
      const isRelationshipError = hasError && (
        errors[errorKey].includes("not found") || 
        errors[errorKey].includes("not available")
      );

      return (
        <div className="space-y-1">
          <input
            className={`w-full border rounded px-2 py-1 ${
              hasError
                ? isRelationshipError
                  ? "border-red-600 bg-red-100 text-red-800"
                  : "border-red-500 bg-red-50"
                : "border-gray-300 focus:border-blue-500"
            }`}
            value={row.original[header] ?? ""}
            onChange={(e) => onEdit(row.index, colIdx, e.target.value)}
            placeholder={header === "null" ? "Not mapped" : ""}
            disabled={header === "null"}
          />
          {hasError && (
            <div className={`text-xs ${
              isRelationshipError ? "text-red-700 font-medium" : "text-red-600"
            }`}>
              {errors[errorKey]}
            </div>
          )}
        </div>
      );
    },
  }));

  const table = useReactTable({
    data: data.map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i]])),
    ),
    columns,
    getCoreRowModel: getCoreRowModel(),
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

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {table.getHeaderGroups()[0].headers.map((header, idx) => (
                <TableHead key={header.id} className="min-w-32">
                  <div className="space-y-1">
                    <div className="font-medium">
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      → {expectedHeadersForEntity[idx] || "Extra"}
                    </div>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="p-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 