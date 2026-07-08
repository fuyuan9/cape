/**
 * CSV utilities for Cape export/import.
 *
 * Security measures:
 *  - CSV Injection escape: cells starting with =, +, -, @, TAB, CR are prefixed with '
 *  - Column whitelist: only columns defined in the resource table are accepted on import
 */
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';

/**
 * Characters that trigger formula execution in spreadsheet apps.
 * Prefix with single-quote to neutralise them (RFC 4180 safe).
 */
const INJECTION_CHARS = /^[=+\-@\t\r]/;

function escapeCsvInjection(value: string): string {
  if (INJECTION_CHARS.test(value)) {
    return `'${value}`;
  }
  return value;
}

/**
 * Serialise an array of records to a UTF-8 CSV string.
 * Only the columns listed in `columnNames` are included (in order).
 */
export function recordsToCsv(columnNames: string[], records: any[]): string {
  const header = columnNames;
  const rows = records.map((record) =>
    columnNames.map((col) => {
      const raw = record[col];
      if (raw === null || raw === undefined) return '';
      const str = String(raw);
      return escapeCsvInjection(str);
    })
  );

  return stringify([header, ...rows], {
    quoted_string: true,
    cast: {
      // Values are already strings at this point
    },
  });
}

export interface ParseResult {
  records: Record<string, string>[];
  errors: { row: number; message: string }[];
}

/**
 * Parse a CSV text into records.
 * Only columns present in `allowedColumns` are kept; unknown columns are silently dropped.
 */
export function csvToRecords(csvText: string, allowedColumns: string[]): ParseResult {
  const allowedSet = new Set(allowedColumns);
  const errors: { row: number; message: string }[] = [];
  let rawRows: string[][];

  try {
    rawRows = parse(csvText, {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    }) as string[][];
  } catch (err: any) {
    return { records: [], errors: [{ row: 0, message: `CSV parse error: ${err.message}` }] };
  }

  if (rawRows.length < 2) {
    return { records: [], errors: [{ row: 0, message: 'CSV must contain a header row and at least one data row' }] };
  }

  const [headerRow, ...dataRows] = rawRows;

  // Build index map: colName → column index (only for allowed columns)
  const colIndexMap: Record<string, number> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const name = headerRow[i].trim();
    if (allowedSet.has(name)) {
      colIndexMap[name] = i;
    }
  }

  const records: Record<string, string>[] = [];

  for (let rowIdx = 0; rowIdx < dataRows.length; rowIdx++) {
    const row = dataRows[rowIdx];
    const record: Record<string, string> = {};
    for (const [colName, colIdx] of Object.entries(colIndexMap)) {
      const cellValue = row[colIdx] ?? '';
      record[colName] = cellValue;
    }
    records.push(record);
  }

  return { records, errors };
}

/**
 * Build a safe filename for the exported CSV.
 * Strips non-alphanumeric characters to prevent header injection.
 */
export function buildCsvFilename(resourceName: string): string {
  const safe = resourceName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  return `${safe}-${date}.csv`;
}
