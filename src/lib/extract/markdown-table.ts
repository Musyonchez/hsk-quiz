/** A raw markdown pipe-table row, split into trimmed cells (no leading/trailing empties). */
export function parseTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  const cells = trimmed
    .split("|")
    .slice(1, -1) // drop the empty strings before the leading and after the trailing "|"
    .map((cell) => cell.trim());
  return cells;
}

/**
 * Parses every markdown pipe-table in a block of lines, returning each table's
 * data rows (header + separator rows dropped). A block can contain more than
 * one table back to back with only prose between them — each contiguous run
 * of `|` lines is treated as its own table.
 */
export function parseAllTables(lines: string[]): string[][][] {
  const tables: string[][][] = [];
  let current: string[][] = [];
  let rowInCurrentTable = 0;

  for (const line of lines) {
    const cells = parseTableRow(line);
    if (cells === null) {
      if (current.length > 0) {
        tables.push(current);
        current = [];
        rowInCurrentTable = 0;
      }
      continue;
    }

    rowInCurrentTable++;
    // Row 1 is the header; row 2 is the `---` separator. Both are structural, not data.
    if (rowInCurrentTable <= 2) continue;
    current.push(cells);
  }

  if (current.length > 0) tables.push(current);
  return tables;
}
