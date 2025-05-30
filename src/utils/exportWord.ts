import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType, TextRun } from 'docx';

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export async function exportWord(tableRef: React.MutableRefObject<any>, title: string, columnWidths: number[]) {
  const tableElement = tableRef.current as HTMLTableElement;
  if (!tableElement) return;

  // Extract table data, skipping noprint cells
  const rows = Array.from(tableElement.rows);
  if (rows.length === 0) return;

  const docxRows = rows.map((row, rowIndex) => {
    const cells = Array.from(row.cells).filter(
      (cell) => !cell.classList.contains('noprint')
    );
    return new DocxTableRow({
      children: cells.map((cell, colIndex) => {
        // Handle data-color for text color
        const dataColor = cell.getAttribute('data-color');
        let color: string | undefined = undefined;
        if (dataColor) {
          // Convert rgb/hex to hex string for docx
          if (dataColor.startsWith('#')) {
            color = dataColor.replace('#', '');
          } else if (dataColor.startsWith('rgb')) {
            // Convert rgb(r,g,b) to hex
            const rgb = dataColor.match(/\d+/g);
            if (rgb && rgb.length === 3) {
              color = (
                ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2]))
                  .toString(16)
                  .slice(1)
              );
            }
          }
        }
        return new DocxTableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell.textContent || '',
                  color: color,
                }),
              ],
            }),
          ],
          width: columnWidths[colIndex] ? { size: Math.round(columnWidths[colIndex] * 100), type: WidthType.PERCENTAGE } : undefined,
        });
      }),
    });
  });

  const docxTable = new DocxTable({
    rows: docxRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: title, size: 36, font: 'Arial', bold: true })
            ],
            spacing: { after: 300 },
            alignment: 'center',
          }),
          docxTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${title.replace(/\s+/g, '_')}.docx`);
} 