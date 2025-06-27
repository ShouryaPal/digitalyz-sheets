"use client";
import React, { useState } from "react";
// import { Button } from "@/components/ui/button";
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

interface ParsedData {
  data: any[][];
  headers: string[];
}

interface SheetData {
  [sheetName: string]: ParsedData;
}

export default function Home() {
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSheetData(null);
    setSelectedSheet("");
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        complete: (results) => {
          const data = results.data as any[][];
          if (!data.length) {
            setError("CSV file is empty.");
            setLoading(false);
            return;
          }

          // Simple approach: Split CSV by empty rows
          const sections: { [key: string]: ParsedData } = {};
          let currentSection: any[][] = [];
          let sectionCount = 1;

          for (let i = 0; i < data.length; i++) {
            const row = data[i];
            // Check if row is empty (all cells are empty or whitespace)
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
              // Save current section if it has data
              if (currentSection.length > 1) {
                const headers = currentSection[0] as string[];
                const sectionData = currentSection.slice(1);
                sections[`Section ${sectionCount}`] = {
                  headers,
                  data: sectionData,
                };
                sectionCount++;
              }
              currentSection = [];
            } else {
              currentSection.push(row);
            }
          }

          // Don't forget the last section
          if (currentSection.length > 1) {
            const headers = currentSection[0] as string[];
            const sectionData = currentSection.slice(1);
            sections[`Section ${sectionCount}`] = {
              headers,
              data: sectionData,
            };
          }

          // If no sections found or only one section, treat as single CSV
          if (Object.keys(sections).length <= 1 && currentSection.length > 0) {
            const headers = (currentSection[0] || data[0]) as string[];
            const allData =
              currentSection.length > 0
                ? currentSection.slice(1)
                : data.slice(1);
            sections["CSV Data"] = { headers, data: allData };
          }

          setSheetData(sections);
          setSelectedSheet(Object.keys(sections)[0]);
          setLoading(false);
          console.log("Parsed CSV with sections:", Object.keys(sections));
          console.log("Section data:", sections);
        },
        error: (err) => {
          setError("Failed to parse CSV: " + err.message);
          setLoading(false);
        },
      });
    } else if (ext === "xlsx") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const allSheetData: SheetData = {};

          // Process all sheets
          workbook.SheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
            }) as any[][];

            if (json.length > 0) {
              const headers = json[0] as string[];
              allSheetData[sheetName] = {
                data: json.slice(1),
                headers,
              };
            }
          });

          if (Object.keys(allSheetData).length === 0) {
            setError("XLSX file contains no data.");
            setLoading(false);
            return;
          }

          setSheetData(allSheetData);
          setSelectedSheet(Object.keys(allSheetData)[0]); // Select first sheet by default
          setLoading(false);
          console.log("Parsed XLSX with sheets:", Object.keys(allSheetData));
        } catch (err: any) {
          setError("Failed to parse XLSX: " + err.message);
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError("Failed to read XLSX file.");
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setError("Unsupported file type. Please upload a .csv or .xlsx file.");
      setLoading(false);
    }
  };

  const currentData =
    sheetData && selectedSheet ? sheetData[selectedSheet] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileSpreadsheet className="h-8 w-8 text-indigo-600" />
              <CardTitle className="text-3xl font-bold text-indigo-700">
                Multi-Sheet File Parser
              </CardTitle>
            </div>
            <CardDescription className="text-lg">
              Upload CSV or XLSX files to preview and navigate through multiple
              sheets or sections. CSV sections are automatically detected when
              separated by empty rows.
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

            {sheetData && Object.keys(sheetData).length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="sheet-select" className="text-sm font-medium">
                  Select{" "}
                  {Object.keys(sheetData).some((key) =>
                    key.startsWith("Section"),
                  )
                    ? "Section"
                    : "Sheet"}
                </Label>
                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Choose a sheet..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(sheetData).map((sheetName) => (
                      <SelectItem key={sheetName} value={sheetName}>
                        {sheetName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentData && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {sheetData && Object.keys(sheetData).length > 1 && (
                    <Badge variant="secondary" className="text-sm">
                      Current: {selectedSheet}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-sm">
                    Rows: {currentData.data.length.toLocaleString()}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Columns: {currentData.headers.length}
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    Total Sheets: {Object.keys(sheetData).length}
                  </Badge>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Data Preview</CardTitle>
                    {currentData.data.length > 100 && (
                      <CardDescription>
                        Showing first 100 rows of{" "}
                        {currentData.data.length.toLocaleString()} total rows
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <div className="overflow-x-auto max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {currentData.headers.map((header, i) => (
                                <TableHead
                                  key={i}
                                  className="font-semibold bg-muted/50"
                                >
                                  {header}
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentData.data.slice(0, 100).map((row, i) => (
                              <TableRow key={i}>
                                {currentData.headers.map((_, j) => (
                                  <TableCell
                                    key={j}
                                    className="max-w-xs truncate"
                                  >
                                    {row[j] !== undefined ? String(row[j]) : ""}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {!currentData && !loading && !error && (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    No file selected
                  </p>
                  <p className="text-sm text-muted-foreground text-center">
                    Upload a CSV or XLSX file to get started
                  </p>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
