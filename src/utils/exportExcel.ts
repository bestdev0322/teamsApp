import * as XLSX from 'xlsx';
import React from 'react';

export function exportExcel(table: HTMLTableElement | null, fileName: string) {
  if (!table) return;

  // Clone the table to manipulate it without affecting the DOM
  const clonedTable = table.cloneNode(true) as HTMLTableElement;

  // Remove all columns (th/td) with class 'noprint'
  // Remove header cells
  clonedTable.querySelectorAll('th.noprint, td.noprint').forEach(cell => {
    const cellIndex = (cell as HTMLTableCellElement).cellIndex;
    // Remove this cell from all rows at this index
    clonedTable.querySelectorAll('tr').forEach(row => {
      if (row.children[cellIndex]) {
        row.removeChild(row.children[cellIndex]);
      }
    });
  });

  const ws = XLSX.utils.table_to_sheet(clonedTable);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
} 