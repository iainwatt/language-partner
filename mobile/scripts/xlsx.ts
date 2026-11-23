import { inflateRawSync } from "node:zlib";

// Just enough of the .xlsx format to read the cells of the first sheet. An
// .xlsx file is a zip of XML files, and Node can inflate but not unzip, so the
// zip's own directory is read here.
function unzip(file: Buffer): Map<string, Buffer> {
  const end = file.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("This is not an .xlsx file.");
  const entries = new Map<string, Buffer>();
  let at = file.readUInt32LE(end + 16);
  for (let count = file.readUInt16LE(end + 10); count > 0; count--) {
    const method = file.readUInt16LE(at + 10);
    const size = file.readUInt32LE(at + 20);
    const nameLength = file.readUInt16LE(at + 28);
    const local = file.readUInt32LE(at + 42);
    const name = file.toString("utf8", at + 46, at + 46 + nameLength);
    const data = local + 30 + file.readUInt16LE(local + 26) + file.readUInt16LE(local + 28);
    const packed = file.subarray(data, data + size);
    entries.set(name, method === 0 ? packed : inflateRawSync(packed));
    at += 46 + nameLength + file.readUInt16LE(at + 30) + file.readUInt16LE(at + 32);
  }
  return entries;
}
const decode = (text: string) =>
  text
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
// The text of a cell or shared string: every <t> run inside it, joined.
const runs = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((match) => decode(match[1])).join("");
const column = (reference: string) =>
  [...reference.replace(/\d+/g, "")].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;

// The first sheet as rows of cells, text or number, with gaps left undefined.
export function readXlsx(file: Buffer): (string | number | undefined)[][] {
  const entries = unzip(file);
  const shared = [...(entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => runs(match[1]));
  const sheetName = [...entries.keys()].filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort()[0];
  if (!sheetName) throw new Error("The .xlsx file has no sheet.");
  const sheet = entries.get(sheetName)!.toString("utf8");
  return [...sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells: (string | number | undefined)[] = [];
    for (const cell of row[1].matchAll(/<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const reference = cell[1].match(/r="([A-Z]+\d+)"/)?.[1];
      const type = cell[1].match(/t="(\w+)"/)?.[1];
      const value = cell[2]?.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const at = reference ? column(reference) : cells.length;
      cells[at] =
        type === "s" ? shared[Number(value)]
          : type === "inlineStr" ? runs(cell[2] ?? "")
            : type === "str" ? decode(value ?? "")
              : value === undefined ? undefined : Number(value);
    }
    // Cells the row skips are left as plain undefined entries, not holes.
    return Array.from(cells);
  });
}
