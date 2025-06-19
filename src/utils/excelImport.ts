// Remove: import * as XLSX from 'xlsx';

interface ExcelImportOptions {
  requiredColumns: {
    name: string;
    aliases: string[];
  }[];
  onSuccess: (data: any[]) => void;
  onError: (error: string) => void;
}

export const importExcelFile = async (file: File, options: ExcelImportOptions) => {
  const resetInput = (inputRef: HTMLInputElement | null) => {
    if (inputRef) inputRef.value = '';
  };

  try {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) throw new Error('Failed to read file');

        const XLSX = await import('xlsx');
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as (string | undefined)[][];

        if (!Array.isArray(data) || data.length === 0) throw new Error('File is empty or malformed');
        const headerRow = data[0];
        if (!Array.isArray(headerRow)) throw new Error('Header row is missing or malformed');

        // Find required columns
        const header = headerRow.map(h => (typeof h === 'string' ? h.toLowerCase() : ''));
        const columnIndices = options.requiredColumns.map(col => {
          const index = header.findIndex(h => 
            col.aliases.some(alias => h.includes(alias.toLowerCase()))
          );
          if (index === -1) throw new Error(`Column "${col.name}" not found`);
          return { name: col.name, index };
        });

        // Process rows
        const rows = data.slice(1)
          .map(row => {
            if (!Array.isArray(row)) return null;
            
            const rowData: Record<string, string> = {};
            columnIndices.forEach(({ name, index }) => {
              rowData[name] = row[index]?.toString().trim() || '';
            });

            // Check if required fields are present
            const hasRequiredFields = columnIndices.every(({ name }) => rowData[name]);
            return hasRequiredFields ? rowData : null;
          })
          .filter((row): row is Record<string, string> => row !== null);

        if (!rows.length) throw new Error('No valid data found');

        options.onSuccess(rows);
      } catch (error) {
        console.error('Error processing Excel file:', error);
        options.onError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    reader.onerror = () => {
      options.onError('Error reading file');
    };

    reader.readAsBinaryString(file);
  } catch (error) {
    console.error('Error importing file:', error);
    options.onError(error instanceof Error ? error.message : 'Unknown error');
  }
}; 