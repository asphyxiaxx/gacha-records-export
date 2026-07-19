import { app, dialog } from "electron";
import { Workbook } from "exceljs";
import * as fs from "fs-extra";
import * as path from "path";
import i18n from "./i18n.js";

function pad(num) {
  return `${num}`.padStart(2, "0");
}

function getTimeString() {
  const d = new Date();
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${YYYY}${MM}${DD}_${HH}${mm}${ss}`;
}

function applyHeaderStyle(sheet) {
  sheet.columns.forEach((column, index) => {
    const cell = sheet.getCell(1, index + 1);

    cell.border = {
      top: { style: "thin", color: { argb: "ffc4c2bf" } },
      left: { style: "thin", color: { argb: "ffc4c2bf" } },
      bottom: { style: "thin", color: { argb: "ffc4c2bf" } },
      right: { style: "thin", color: { argb: "ffc4c2bf" } },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ffdbd7d3" },
    };
    cell.font = {
      name: i18n.excel.customFont,
      color: { argb: "ff757575" },
      bold: true,
    };
  });
}

function applyCellStyle(sheet, rowFormats) {
  sheet.columns.forEach((column, colIndex) => {
    rowFormats.forEach((rowFormat, rowIndex) => {
      const cell = sheet.getCell(rowIndex + 2, colIndex + 1);

      cell.font = {
        name: i18n.excel.customFont,
        color: { argb: rowFormat.color },
        bold: rowFormat.bold,
      };
      cell.border = {
        top: { style: "thin", color: { argb: "ffc4c2bf" } },
        left: { style: "thin", color: { argb: "ffc4c2bf" } },
        bottom: { style: "thin", color: { argb: "ffc4c2bf" } },
        right: { style: "thin", color: { argb: "ffc4c2bf" } },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "ffebebeb" },
      };
    });
  });
}

function createSheet(workbook, sheetData) {
  // Add sheet
  const sheetName = sheetData.name;
  const sheetFormat = { views: [{ state: "frozen", ySplit: 1 }] };
  const sheet = workbook.addWorksheet(sheetName, sheetFormat);

  // Add Column
  sheet.columns = sheetData.columns;

  // Add Rows
  sheet.addRows(sheetData.rows);

  applyHeaderStyle(sheet);
  applyCellStyle(sheet, sheetData.rowFormats);
}

async function save(sheets, filename) {
  const fileType = i18n.excel.fileType;
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(
      app.getPath("downloads"),
      `${filename}_${getTimeString()}`,
    ),
    filters: [{ name: fileType, extensions: ["xlsx"] }],
  });
  if (!filePath) return;

  await fs.ensureFile(filePath);

  const workbook = new Workbook();
  for (const sheetData of sheets) {
    createSheet(workbook, sheetData);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  await fs.writeFile(filePath, buffer);
}

export { save };
