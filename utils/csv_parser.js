import Papa from 'papaparse';
import XLSX from 'xlsx';

export class CSVParser {
  static async parseFile(file, fileType) {
    if (fileType === 'csv') {
      return this.parseCSV(file);
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      return this.parseExcel(file);
    } else {
      throw new Error('Unsupported file type');
    }
  }

  static async parseCSV(fileBuffer) {
    return new Promise((resolve, reject) => {
      Papa.parse(fileBuffer.toString(), {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          resolve(results.data);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  }

  static parseExcel(fileBuffer) {
    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      return data;
    } catch (error) {
      throw new Error('Failed to parse Excel file: ' + error.message);
    }
  }

  static toCSV(data) {
    return Papa.unparse(data);
  }

  static toExcel(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enhanced Listings');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}