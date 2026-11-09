// ASCII PDF with byte offsets and paginated text. PDF Association Basics structure.
export function createReportPdf(lines: string[]): Blob {
  const clean = (s: string) =>
    s
      .normalize("NFKD")
      .replace(/[^\x20-\x7e]/g, " ")
      .replace(/([\\()])/g, "\\$1");
  const objects = [
    "",
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  const pages: number[] = [];
  for (let n = 0; n < lines.length; n += 43) {
    const id = objects.length;
    pages.push(id);
    const content =
      "BT\n/F1 10 Tf\n42 800 Td\n16 TL\n" +
      lines
        .slice(n, n + 43)
        .map((s, i) => `${i ? "T*\n" : ""}(${clean(s)}) Tj`)
        .join("\n") +
      "\nET\n";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id + 1} 0 R >>`,
    );
    objects.push(
      `<< /Length ${content.length} >>\nstream\n${content}endstream`,
    );
  }
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((id) => `${id} 0 R`).join(" ")}] >>`;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id++) {
    offsets.push(pdf.length);
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf +=
    `xref\n0 ${objects.length}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
      .join("") +
    `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([pdf], { type: "application/pdf" });
}
