const globalAlias = globalThis as typeof globalThis & { global?: typeof globalThis };

if (!globalAlias.global) {
  globalAlias.global = globalAlias;
}

