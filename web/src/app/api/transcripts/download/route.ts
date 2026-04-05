import {
  getRecentRecordings,
  getConversationsByRecordingId,
  getTasksByRecordingId,
  getIdeasByRecordingId,
} from '@/lib/db/queries';
import { recordingToMarkdown } from '@/lib/markdown';

// Minimal ZIP generation (no external dependency)
// Produces a valid ZIP with Store (no compression) — sufficient for text files

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDir: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;

    // Local file header (30 + name + data)
    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);   // signature
    lv.setUint16(4, 20, true);            // version needed
    lv.setUint16(6, 0, true);             // flags
    lv.setUint16(8, 0, true);             // compression: store
    lv.setUint16(10, 0, true);            // mod time
    lv.setUint16(12, 0, true);            // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);         // compressed
    lv.setUint32(22, size, true);         // uncompressed
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);            // extra length
    new Uint8Array(local).set(nameBytes, 30);

    parts.push(new Uint8Array(local));
    parts.push(file.data);

    // Central directory entry
    const cd = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(cd);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0x20, true);         // external attrs
    cv.setUint32(42, offset, true);       // local header offset
    new Uint8Array(cd).set(nameBytes, 46);

    centralDir.push(new Uint8Array(cd));
    offset += 30 + nameBytes.length + size;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const c of centralDir) cdSize += c.length;

  // End of central directory
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, cdOffset, true);
  ev.setUint16(20, 0, true);

  const total = offset + cdSize + 22;
  const result = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) { result.set(p, pos); pos += p.length; }
  for (const c of centralDir) { result.set(c, pos); pos += c.length; }
  result.set(new Uint8Array(eocd), pos);

  return result;
}

export async function GET() {
  const recordings = await getRecentRecordings(365);

  if (recordings.length === 0) {
    return new Response('No recordings found', { status: 404 });
  }

  const encoder = new TextEncoder();
  const files: { name: string; data: Uint8Array }[] = [];

  for (const rec of recordings) {
    const conversations = await getConversationsByRecordingId(rec.id);
    const tasks = await getTasksByRecordingId(rec.id);
    const ideas = await getIdeasByRecordingId(rec.id);

    const md = recordingToMarkdown(rec, conversations, tasks, ideas);
    const filename = rec.filename.replace(/\.[^.]+$/, '') + '.md';
    files.push({ name: filename, data: encoder.encode(md) });
  }

  const zip = buildZip(files);
  const today = new Date().toISOString().slice(0, 10);

  return new Response(zip.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="transcripts_${today}.zip"`,
    },
  });
}
