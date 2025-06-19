import React, { useState, useEffect, useRef } from 'react';

export const exportPdf = async (type: string, tableRef: React.MutableRefObject<undefined>, title: string, totalWeight: string, footer: string, columnWidths: number[], overalScore?: {score: string, color: string}) => {
  const { default: jsPDF } = await import('jspdf');
  const { autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF('l', 'mm', 'a4'); // Set to landscape
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add title
  doc.setFontSize(13);
  doc.text(title, 10, 20, { align: 'left' });

  // Add line below title
  doc.setLineWidth(0.5);
  doc.line(10, 25, pageWidth - 10, 25);

  doc.text(totalWeight, pageWidth - 10, 32, { align: 'right' });

  const tableElement = tableRef.current as HTMLTableElement;
  const mTable = tableElement.cloneNode(true) as HTMLTableElement;
  mTable.querySelectorAll('.noprint').forEach(element => {
    element.remove();
  });

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const tableWidth = pageWidth - 30; // Adjust margins

  let finalY = 40; // Initialize finalY

  const columnStyles: any = {}
  columnWidths.forEach((val, index) => {
    columnStyles[String(index)] = {cellWidth: tableWidth * val, valign: 'middle'}
  })

  autoTable(doc, {
    html: mTable,
    startY: 40, // Start table after title
    columnStyles: columnStyles,
    alternateRowStyles: {
      fillColor: 'white'
    },
    styles: {
      lineColor: 'black',
      lineWidth: 0.1,
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontSize: 8,
      fontStyle: 'bold'
    },
    didParseCell: (data) => {
        const cellElement = data.cell.raw as HTMLElement;
        const color = cellElement.style.color || cellElement.getAttribute('data-color');
        if (color) {
          const rgb = hexToRgb(color);
          if (rgb) {
            data.cell.styles.textColor = [rgb.r, rgb.g, rgb.b];
          }
        }
        const align = cellElement.getAttribute('data-align');
        if (align) {
          data.cell.styles.halign = align as 'left' | 'center' | 'right';
        }
    },
    didDrawPage: (data) => {
      finalY = data.cursor.y; // Store the final Y position
    }
  });

  // Add footer below table
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128); // Gray color
  if(overalScore) {
    // Calculate text widths for positioning from right
    const scoreText = overalScore.score;
    const labelText = "Overall Rating Score = ";
    const scoreWidth = doc.getTextWidth(scoreText);
    const labelWidth = doc.getTextWidth(labelText);
    const padding = 4; // Padding inside the rectangle
    
    // Position everything from the right side
    const rightMargin = 10;
    const scoreRectRight = pageWidth - rightMargin;
    const scoreRectLeft = scoreRectRight - (scoreWidth + (padding * 2));
    const labelRight = scoreRectLeft - 2;
    const labelLeft = labelRight - labelWidth;
    
    // Draw label
    doc.setTextColor(128, 128, 128);
    doc.text(labelText, labelLeft, finalY + 10);
    
    // Draw score background and text
    doc.setTextColor(overalScore?.color);
    doc.text(scoreText, scoreRectLeft + padding, finalY + 10);
  }

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
};
