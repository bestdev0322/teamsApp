import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, Table as DocxTable, TableCell as DocxTableCell, TableRow as DocxTableRow, WidthType, TextRun, VerticalMergeType } from 'docx';

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

  const htmlRows = Array.from(tableElement.rows);
  if (htmlRows.length === 0) return;

  const docxRows: DocxTableRow[] = [];

  for (let rowIndex = 0; rowIndex < htmlRows.length; rowIndex++) {
    const htmlCells = Array.from(htmlRows[rowIndex].cells).filter(
      (cell) => !cell.classList.contains('noprint')
    );

    const docxCells: DocxTableCell[] = [];
    let htmlCellIndex = 0;

    for (let currentGridColIndex = 0; currentGridColIndex < columnWidths.length;) {
      if (htmlCellIndex < htmlCells.length) {
        const cell = htmlCells[htmlCellIndex];

        const rowSpan = cell.rowSpan > 1 ? cell.rowSpan : undefined;
        const colSpan = cell.colSpan > 1 ? cell.colSpan : undefined;
        let calculatedWidth = 0;
        const actualColSpan = colSpan || 1;
        for (let i = 0; i < actualColSpan; i++) {
          if (columnWidths[currentGridColIndex + i] !== undefined) {
            calculatedWidth += columnWidths[currentGridColIndex + i];
          } else {
            console.warn(`Column width for grid index ${currentGridColIndex + i} is undefined.`);
          }
        }

        const dataColor = cell.getAttribute('data-color');
        let color: string | undefined = undefined;
        if (dataColor) {
          if (dataColor.startsWith('#')) {
            color = dataColor.replace('#', '');
          } else if (dataColor.startsWith('rgb')) {
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

        const docxCell = new DocxTableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cell.textContent?.trim() || '',
                  color: color,
                }),
              ],
              alignment: cell.getAttribute('data-align') as 'left' | 'center' | 'right' || undefined,
            }),
          ],
          rowSpan: rowSpan,
          columnSpan: colSpan,
          // width: {
          //   size: Math.round(calculatedWidth * 100),
          //   type: WidthType.PERCENTAGE
          // },
        });
        docxCells.push(docxCell);
        currentGridColIndex += actualColSpan;
        htmlCellIndex++;
      } else {
        currentGridColIndex++;
      }
    }

    docxRows.push(new DocxTableRow({ children: docxCells }));
  }

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
