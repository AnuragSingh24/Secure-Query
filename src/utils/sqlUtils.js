export function extractTableNames(sql) {
  const regex = /\bfrom\b\s+(\w+)|\bjoin\b\s+(\w+)/gi;
  const tables = new Set();
  let match;
  while ((match = regex.exec(sql))) {
    const table = match[1] || match[2];
    if (table) tables.add(table);
  }
  return Array.from(tables);
}

export function maskSSN(data) {
  return Array.isArray(data)
    ? data.map(row => {
        const newRow = { ...row };
        if (newRow.ssn) newRow.ssn = '***-**-****';
        return newRow;
      })
    : data;
}
