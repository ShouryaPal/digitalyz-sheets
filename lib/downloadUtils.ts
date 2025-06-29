import { Entities, EntityType } from "@/types/entities";
import * as XLSX from "xlsx";

// Define a more specific type for cell values
type CellValue = string | number | boolean | null | undefined;

export function downloadEntityAsCSV(entityType: EntityType, entityData: { headers: string[]; data: CellValue[][] }) {
  const { headers, data } = entityData;
  
  // Filter out null headers (unmapped columns) and get their indices
  const validHeaders: string[] = [];
  const validHeaderIndices: number[] = [];
  
  headers.forEach((header, index) => {
    if (header !== "null") {
      validHeaders.push(header);
      validHeaderIndices.push(index);
    }
  });
  
  // Create CSV content
  const csvContent = [
    validHeaders.join(','), // Header row
    ...data.map(row => 
      validHeaderIndices.map(index => {
        const value = row[index] || '';
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${entityType}_data.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadEntityAsXLSX(entityType: EntityType, entityData: { headers: string[]; data: CellValue[][] }) {
  const { headers, data } = entityData;
  
  // Filter out null headers (unmapped columns) and get their indices
  const validHeaders: string[] = [];
  const validHeaderIndices: number[] = [];
  
  headers.forEach((header, index) => {
    if (header !== "null") {
      validHeaders.push(header);
      validHeaderIndices.push(index);
    }
  });
  
  // Create worksheet data
  const worksheetData = [
    validHeaders, // Header row
    ...data.map(row => 
      validHeaderIndices.map(index => row[index] || '')
    )
  ];
  
  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, entityType);
  
  // Download file
  XLSX.writeFile(workbook, `${entityType}_data.xlsx`);
}

export function downloadAllEntitiesAsCSV(entities: Entities) {
  const allData: { entityType: string; headers: string[]; data: CellValue[][] }[] = [];
  
  (Object.keys(entities) as EntityType[]).forEach(entityType => {
    const entityData = entities[entityType];
    if (entityData.data.length > 0) {
      allData.push({
        entityType,
        headers: entityData.headers,
        data: entityData.data
      });
    }
  });
  
  if (allData.length === 0) {
    alert('No data to download');
    return;
  }
  
  // Create combined CSV with sections separated by empty rows
  let combinedCSV = '';
  
  allData.forEach((section, index) => {
    if (index > 0) {
      combinedCSV += '\n\n'; // Add empty rows between sections
    }
    
    // Add section header comment
    combinedCSV += `# ${section.entityType.toUpperCase()} DATA\n`;
    
    // Filter out null headers
    const validHeaders: string[] = [];
    const validHeaderIndices: number[] = [];
    
    section.headers.forEach((header, idx) => {
      if (header !== "null") {
        validHeaders.push(header);
        validHeaderIndices.push(idx);
      }
    });
    
    // Add headers and data
    combinedCSV += validHeaders.join(',') + '\n';
    combinedCSV += section.data.map(row => 
      validHeaderIndices.map(index => {
        const value = row[index] || '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
  });
  
  // Download combined file
  const blob = new Blob([combinedCSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'all_entities_data.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadAllEntitiesAsXLSX(entities: Entities) {
  const allData: { entityType: string; headers: string[]; data: CellValue[][] }[] = [];
  
  (Object.keys(entities) as EntityType[]).forEach(entityType => {
    const entityData = entities[entityType];
    if (entityData.data.length > 0) {
      allData.push({
        entityType,
        headers: entityData.headers,
        data: entityData.data
      });
    }
  });
  
  if (allData.length === 0) {
    alert('No data to download');
    return;
  }
  
  // Create workbook
  const workbook = XLSX.utils.book_new();
  
  allData.forEach((section) => {
    // Filter out null headers
    const validHeaders: string[] = [];
    const validHeaderIndices: number[] = [];
    
    section.headers.forEach((header, idx) => {
      if (header !== "null") {
        validHeaders.push(header);
        validHeaderIndices.push(idx);
      }
    });
    
    // Create worksheet data
    const worksheetData = [
      validHeaders, // Header row
      ...section.data.map(row => 
        validHeaderIndices.map(index => row[index] || '')
      )
    ];
    
    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, section.entityType);
  });
  
  // Download file
  XLSX.writeFile(workbook, 'all_entities_data.xlsx');
} 