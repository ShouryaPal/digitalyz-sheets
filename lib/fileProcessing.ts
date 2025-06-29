import Papa from "papaparse";
import * as XLSX from "xlsx";

// Define a more specific type for cell values
type CellValue = string | number | boolean | null | undefined;

export async function processCSVFile(file: File): Promise<{ headers: string[]; data: CellValue[][] }[]> {
  const parsed = await new Promise<CellValue[][]>((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => resolve(results.data as CellValue[][]),
      error: (err) => reject(err),
    });
  });

  const data = parsed as CellValue[][];
  if (!data.length) {
    throw new Error("CSV file is empty.");
  }

  let currentSection: CellValue[][] = [];
  const sections: { headers: string[]; data: CellValue[][] }[] = [];
  
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
          headers: currentSection[0].map(cell => String(cell ?? '')),
          data: currentSection.slice(1),
        });
      }
      currentSection = [];
    } else {
      currentSection.push(row);
    }
  }

  if (currentSection.length > 1) {
    sections.push({
      headers: currentSection[0].map(cell => String(cell ?? '')),
      data: currentSection.slice(1),
    });
  }
  if (sections.length === 0 && data.length > 1) {
    sections.push({ 
      headers: data[0].map(cell => String(cell ?? '')), 
      data: data.slice(1) 
    });
  }

  return sections;
}

export async function processXLSXFile(file: File): Promise<{ headers: string[]; data: CellValue[][] }[]> {
  const parsed = await new Promise<{ headers: string[]; data: CellValue[][] }[]>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const allSections: { headers: string[]; data: CellValue[][] }[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as CellValue[][];

          if (json.length > 0) {
            allSections.push({ 
              headers: json[0].map(cell => String(cell ?? '')), 
              data: json.slice(1) 
            });
          }
        });
        resolve(allSections);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read XLSX file."));
    reader.readAsArrayBuffer(file);
  });

  return parsed;
} 