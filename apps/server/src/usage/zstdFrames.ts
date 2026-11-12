// @effect-diagnostics nodeBuiltinImport:off - the usage scanner already streams transcripts with node:zlib.
import * as NodeZlib from "node:zlib";

const ZSTD_MAGIC = 0xfd2fb528;
const SKIPPABLE_MAGIC_MASK = 0xfffffff0;
const SKIPPABLE_MAGIC = 0x184d2a50;

const DICTIONARY_ID_BYTES = [0, 1, 2, 4] as const;
const FRAME_CONTENT_SIZE_BYTES = [0, 2, 4, 8] as const;

class ZstdFrameError extends Error {
  override name = "ZstdFrameError";
}

function incomplete(offset: number): never {
  throw new ZstdFrameError(`Truncated zstd frame at byte ${offset}.`);
}

function readByte(buffer: Buffer, offset: number): number {
  if (offset >= buffer.length) incomplete(offset);
  return buffer[offset]!;
}

function readUInt32LE(buffer: Buffer, offset: number): number {
  if (offset + 4 > buffer.length) incomplete(offset);
  return buffer.readUInt32LE(offset);
}

function frameEnd(buffer: Buffer, offset: number): number {
  const magic = readUInt32LE(buffer, offset);
  if ((magic & SKIPPABLE_MAGIC_MASK) >>> 0 === SKIPPABLE_MAGIC) {
    const size = readUInt32LE(buffer, offset + 4);
    const end = offset + 8 + size;
    if (end > buffer.length) incomplete(offset);
    return end;
  }
  if (magic !== ZSTD_MAGIC) {
    throw new ZstdFrameError(`Unrecognized zstd frame at byte ${offset}.`);
  }

  let position = offset + 4;
  const descriptor = readByte(buffer, position);
  position += 1;
  const contentSizeFlag = descriptor >>> 6;
  const singleSegment = (descriptor >>> 5) & 1;
  const hasChecksum = ((descriptor >>> 2) & 1) === 1;
  const dictionaryIdFlag = descriptor & 3;

  if (singleSegment === 0) position += 1;
  position += DICTIONARY_ID_BYTES[dictionaryIdFlag]!;
  position +=
    contentSizeFlag === 0
      ? singleSegment === 1
        ? 1
        : 0
      : FRAME_CONTENT_SIZE_BYTES[contentSizeFlag]!;

  for (;;) {
    if (position + 3 > buffer.length) incomplete(position);
    const header = buffer.readUIntLE(position, 3);
    position += 3;
    const lastBlock = (header & 1) === 1;
    const blockType = (header >>> 1) & 3;
    const blockSize = header >>> 3;
    if (blockType === 3) {
      throw new ZstdFrameError(`Reserved zstd block type at byte ${position - 3}.`);
    }
    position += blockType === 1 ? 1 : blockSize;
    if (position > buffer.length) incomplete(position);
    if (lastBlock) break;
  }
  if (hasChecksum) position += 4;
  if (position > buffer.length) incomplete(position);
  return position;
}

/**
 * DeepSeek Harness appends one zstd frame per batch instead of rewriting a
 * single frame. Node's zstd stream stops after the first frame, so split the
 * concatenated frames and decode each one.
 */
export function decompressZstdFrames(buffer: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const end = frameEnd(buffer, offset);
    const magic = buffer.readUInt32LE(offset);
    if ((magic & SKIPPABLE_MAGIC_MASK) >>> 0 !== SKIPPABLE_MAGIC) {
      chunks.push(NodeZlib.zstdDecompressSync(buffer.subarray(offset, end)));
    }
    offset = end;
  }
  return Buffer.concat(chunks);
}
