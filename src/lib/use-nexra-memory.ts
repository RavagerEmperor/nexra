"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadMemory,
  addMemory as addMem,
  clearMemory as clearMem,
  saveMemory,
  type MemoryEntry,
  type MemoryEntry as ME,
} from "./nexra";

export function useNexraMemory(accountId?: string) {
  const [memory, setMemory] = useState<MemoryEntry[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setMemory(loadMemory(accountId));
  }, [accountId]);

  // reload when account changes
  useEffect(() => {
    setMemory(loadMemory(accountId));
  }, [accountId]);

  const add = useCallback(
    (text: string, category: ME["category"] = "fact") => {
      const next = addMem(text, category, accountId);
      setMemory(next);
      return next;
    },
    [accountId]
  );

  const clear = useCallback(() => {
    clearMem(accountId);
    setMemory([]);
  }, [accountId]);

  const remove = useCallback(
    (id: string) => {
      const next = loadMemory(accountId).filter((m) => m.id !== id);
      setMemory(next);
      saveMemory(next, accountId);
    },
    [accountId]
  );

  const contextString = useCallback(() => {
    if (memory.length === 0) return "";
    const lines = memory.slice(0, 20).map((m) => `- [${m.category}] ${m.text}`);
    return `\n\n--- OPERATOR HAFIZASI (15 gunluk) ---\n${lines.join("\n")}\n--- HAFIZA SONU ---\n`;
  }, [memory]);

  return {
    memory,
    add,
    remove,
    clear,
    contextString,
  };
}
