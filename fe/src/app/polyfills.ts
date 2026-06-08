import { Buffer } from "buffer";

const globalRef = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
};

if (!globalRef.Buffer) {
  globalRef.Buffer = Buffer;
}

if (!globalRef.global) {
  globalRef.global = globalRef;
}
