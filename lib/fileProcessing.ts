import Papa from "papaparse";
import * as XLSX from "xlsx";

export async function processCSVFile(file: File): Promise<{ headers: string[]; data: any[][] }[]> {
  const parsed = await new Promise<any>((resolve, reject) => {
    Papa.parse(file, {
      complete: (results) => resolve(results.data),
      error: (err) => reject(err),
    });
  });

  const data = parsed as any[][];
  if (!data.length) {
    throw new Error("CSV file is empty.");
  }

  let currentSection: any[][] = [];
  const sections: { headers: string[]; data: any[][] }[] = [];
  
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
    sections.push({
      headers: currentSection[0],
      data: currentSection.slice(1),
    });
  }
  if (sections.length === 0 && data.length > 1) {
    sections.push({ headers: data[0], data: data.slice(1) });
  }

  return sections;
}

export async function processXLSXFile(file: File): Promise<{ headers: string[]; data: any[][] }[]> {
  const parsed = await new Promise<any>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const allSections: { headers: string[]; data: any[][] }[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
          }) as any[][];

          if (json.length > 0) {
            allSections.push({ headers: json[0], data: json.slice(1) });
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

  return parsed as { headers: string[]; data: any[][] }[];
} 