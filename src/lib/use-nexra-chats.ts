"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadChats,
  saveChats,
  loadActiveId,
  saveActiveId,
  uid,
  makeTitle,
  MAX_CHATS,
  MODEL_MAP,
  type Chat,
  type Msg,
  type NexraModelId,
} from "./nexra";

export function useNexraChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState<NexraModelId | null>(null);
  const [syncing, setSyncing] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncing(true);
    // simulate async load from storage
    setTimeout(() => {
      const loaded = loadChats();
      const aid = loadActiveId();
      const finalActive =
        aid && loaded.some((c) => c.id === aid) ? aid : loaded.length > 0 ? loaded[0].id : null;
      setChats(loaded);
      setActiveId(finalActive);
      setReady(true);
      setSyncing(false);
    }, 400);
  }, []);

  useEffect(() => {
    if (ready) saveChats(chats);
  }, [chats, ready]);
  useEffect(() => {
    if (ready) saveActiveId(activeId);
  }, [activeId, ready]);

  const activeChat = chats.find((c) => c.id === activeId) || null;

  const newChat = useCallback(
    (model: NexraModelId = "standard"): string | null => {
      const id = uid();
      setChats((prev) => {
        if (prev.length >= MAX_CHATS) return prev;
        const chat: Chat = {
          id,
          title: "Yeni sohbet",
          messages: [],
          model,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return [chat, ...prev];
      });
      setActiveId(id);
      return id;
    },
    []
  );

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeId === id) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        return next;
      });
    },
    [activeId]
  );

  const selectChat = useCallback((id: string) => setActiveId(id), []);

  const setModel = useCallback(
    (id: string, model: NexraModelId) => {
      // trigger loading screen
      setSwitching(model);
      const meta = MODEL_MAP[model];
      const delay = meta?.tier === "flagship" ? 2800 : meta?.tier === "premium" ? 2000 : 1200;
      setTimeout(() => {
        setChats((prev) =>
          prev.map((c) => {
            if (c.id !== id) return c;
            // add intro message from the new model
            const introMsg: Msg = {
              id: uid(),
              role: "assistant",
              content: `[NEXRA]\n\n${meta.intro}`,
              ts: Date.now(),
              model,
            };
            return {
              ...c,
              model,
              messages: [...c.messages, introMsg],
              updatedAt: Date.now(),
            };
          })
        );
        setSwitching(null);
      }, delay);
    },
    []
  );

  const addMessage = useCallback(
    (id: string, msg: Msg) => {
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const messages = [...c.messages, msg];
          const title =
            c.title === "Yeni sohbet" && msg.role === "user"
              ? makeTitle(msg.content)
              : c.title;
          return { ...c, messages, title, updatedAt: Date.now() };
        })
      );
    },
    []
  );

  const updateMessage = useCallback(
    (id: string, msgId: string, patch: Partial<Msg>) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id !== id
            ? c
            : {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === msgId ? { ...m, ...patch } : m
                ),
                updatedAt: Date.now(),
              }
        )
      );
    },
    []
  );

  const setChatTitle = useCallback(
    (id: string, title: string) => {
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title, updatedAt: Date.now() } : c))
      );
    },
    []
  );

  const clearAll = useCallback(() => {
    setChats([]);
    setActiveId(null);
  }, []);

  return {
    chats,
    activeId,
    activeChat,
    ready,
    switching,
    syncing,
    newChat,
    deleteChat,
    selectChat,
    setModel,
    addMessage,
    updateMessage,
    setChatTitle,
    clearAll,
    canCreate: chats.length < MAX_CHATS,
  };
}
