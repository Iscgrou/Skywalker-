// Temporary shim for uuid types (v4) until @types/uuid installed
declare module 'uuid' {
  export function v4(): string;
}
