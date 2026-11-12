import { assert, describe, it } from "@effect/vitest";
import * as NodeZlib from "node:zlib";

import { decompressZstdFrames } from "./zstdFrames.ts";

describe("decompressZstdFrames", () => {
  it("decodes a single frame like the stream decoder", () => {
    const text = '{"type":"session"}\n{"type":"assistant/message","usage":{}}\n';
    assert.equal(decompressZstdFrames(NodeZlib.zstdCompressSync(text)).toString("utf8"), text);
  });

  it("concatenates multi-frame snapshots", () => {
    const first = '{"type":"session","id":"session-a"}\n';
    const second = '{"type":"assistant/message","seq":20,"usage":{"outputTokens":3}}\n';
    const buffer = Buffer.concat([
      NodeZlib.zstdCompressSync(first),
      NodeZlib.zstdCompressSync(second),
      NodeZlib.zstdCompressSync(first),
    ]);
    assert.equal(decompressZstdFrames(buffer).toString("utf8"), first + second + first);
  });

  it("skips skippable frames", () => {
    const text = '{"type":"session"}\n';
    const skippable = Buffer.alloc(8 + 4);
    skippable.writeUInt32LE(0x184d2a50, 0);
    skippable.writeUInt32LE(4, 4);
    skippable.write("skip", 8);
    const buffer = Buffer.concat([skippable, NodeZlib.zstdCompressSync(text)]);
    assert.equal(decompressZstdFrames(buffer).toString("utf8"), text);
  });

  it("rejects truncated frames instead of returning partial text", () => {
    const frame = NodeZlib.zstdCompressSync("hello\n");
    assert.throws(() => decompressZstdFrames(frame.subarray(0, frame.length - 1)));
    assert.throws(() => decompressZstdFrames(Buffer.from("not zstd")));
  });
});
