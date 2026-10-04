"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Terminal as TerminalIcon,
  Folder,
  File,
  Eye,
  Code2,
  ChevronRight,
  ChevronDown,
  Play,
  Plus,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/lib/use-escape-key";

type VfsFile = {
  name: string;
  content: string;
  language?: string;
};

type TerminalLine = {
  id: string;
  type: "in" | "out" | "err" | "sys";
  text: string;
};

export function IDEPanel({
  open,
  onClose,
  initialHtml,
  initialName,
}: {
  open: boolean;
  onClose: () => void;
  initialHtml?: string;
  initialName?: string;
}) {
  const [files, setFiles] = useState<VfsFile[]>([
    { name: "index.html", content: '<!DOCTYPE html>\n<html>\n<head>\n  <title>NEXRA</title>\n</head>\n<body>\n  <h1>Hello NEXRA</h1>\n</body>\n</html>', language: "html" },
  { name: "style.css", content: "body { background: #0a0a0f; color: white; font-family: monospace; }", language: "css" },
    { name: "script.js", content: "console.log('NEXRA online');", language: "javascript" },
  ]);
  const [activeFile, setActiveFile] = useState("index.html");
  const [view, setView] = useState<"code" | "preview" | "split">("split");
  const [fileTreeOpen, setFileTreeOpen] = useState(true);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { id: "boot", type: "sys", text: "NEXRA IDE Terminal v1.0 — 'help' yaz." },
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalBusy, setTerminalBusy] = useState(false);
  const [vfs, setVfs] = useState<Record<string, string>>({});
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);

  const terminalRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEscapeKey(onClose, open);

  // Load initial HTML if provided
  useEffect(() => {
    if (initialHtml && open) {
      setFiles([{ name: "index.html", content: initialHtml, language: "html" }]);
      setActiveFile("index.html");
    }
  }, [initialHtml, open]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const currentFile = files.find((f) => f.name === activeFile);

  // Build preview HTML from files
  const previewHtml = (() => {
    const html = files.find((f) => f.name.endsWith(".html"))?.content || "";
    const css = files.find((f) => f.name.endsWith(".css"))?.content || "";
    const js = files.find((f) => f.name.endsWith(".js"))?.content || "";
    return html
      .replace("</head>", `<style>${css}</style></head>`)
      .replace("</body>", `<script>${js}</script></body>`);
  })();

  const updateFileContent = (name: string, content: string) => {
    setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, content } : f)));
  };

  const addFile = () => {
    const name = newFileName.trim();
    if (!name || files.some((f) => f.name === name)) return;
    const lang = name.endsWith(".html") ? "html" : name.endsWith(".css") ? "css" : name.endsWith(".js") ? "javascript" : name.endsWith(".py") ? "python" : name.endsWith(".ts") ? "typescript" : "text";
    setFiles([...files, { name, content: "", language: lang }]);
    setActiveFile(name);
    setNewFileName("");
    setShowNewFile(false);
  };

  const deleteFile = (name: string) => {
    if (files.length <= 1) return;
    setFiles(files.filter((f) => f.name !== name));
    if (activeFile === name) {
      setActiveFile(files[0].name);
    }
  };

  const pushTerminal = (type: TerminalLine["type"], text: string) => {
    setTerminalLines((prev) => [...prev, { id: Math.random().toString(36).slice(2), type, text }]);
  };

  const runTerminal = async () => {
    const cmd = terminalInput.trim();
    if (!cmd || terminalBusy) return;
    pushTerminal("in", cmd);
    setTerminalInput("");
    setTerminalBusy(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd, vfs }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.output) pushTerminal("out", data.output);
        else pushTerminal("sys", "(bos cikti)");
      } else {
        pushTerminal("err", data.output || "komut basarisiz");
      }
      if (data.vfs) setVfs(data.vfs);
    } catch {
      pushTerminal("err", "terminal baglantisi dustu");
    } finally {
      setTerminalBusy(false);
    }
  };

  const runCode = () => {
    pushTerminal("sys", `> ${activeFile} calistiriliyor...`);
    setView("preview");
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ y: 500, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 500, opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 280 }}
      className="fixed inset-0 z-[60] flex flex-col bg-[#0a0a0f]"
    >
      {/* Header */}
      <div className="shrink-0 h-11 border-b border-violet-500/20 bg-[#0c0c14] flex items-center gap-2 px-3">
        <TerminalIcon className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-mono text-violet-300">NEXRA IDE</span>
        <span className="text-[10px] font-mono text-zinc-600">{initialName || "proje"}</span>
        <div className="flex-1" />
        {/* View toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#13131a] border border-zinc-800">
          {(["code", "split", "preview"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition",
                view === v ? "bg-violet-500/20 text-violet-200" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {v === "code" && <Code2 className="w-3 h-3" />}
              {v === "preview" && <Eye className="w-3 h-3" />}
              {v === "split" && <span className="text-[9px]">⇆</span>}
              {v === "code" ? "Kod" : v === "preview" ? "Önizleme" : "Böl"}
            </button>
          ))}
        </div>
        <button
          onClick={runCode}
          className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
        >
          <Play className="w-3 h-3" />
          Çalıştır
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <div className="w-48 shrink-0 border-r border-violet-500/15 bg-[#08080c] flex flex-col">
          <div className="p-2 border-b border-violet-500/10 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">DOSYALAR</span>
            <button
              onClick={() => setShowNewFile(!showNewFile)}
              className="p-0.5 rounded text-zinc-500 hover:text-violet-300"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          {showNewFile && (
            <div className="p-2 border-b border-violet-500/10">
              <input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addFile()}
                placeholder="dosya.html"
                className="w-full px-2 py-1 text-[10px] font-mono bg-[#13131a] border border-zinc-700 rounded text-zinc-200 focus:border-violet-500/60 focus:outline-none"
                autoFocus
              />
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-1" style={{ scrollbarWidth: "thin" }}>
            <button
              onClick={() => setFileTreeOpen(!fileTreeOpen)}
              className="flex items-center gap-1 w-full px-1.5 py-1 text-[10px] font-mono text-zinc-400 hover:text-zinc-200"
            >
              {fileTreeOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              <Folder className="w-3 h-3 text-violet-400" />
              proje
            </button>
            {fileTreeOpen && (
              <div className="ml-3 mt-1 space-y-0.5">
                {files.map((f) => (
                  <div
                    key={f.name}
                    onClick={() => setActiveFile(f.name)}
                    className={cn(
                      "group flex items-center gap-1 w-full px-1.5 py-1 rounded text-[10px] font-mono transition cursor-pointer",
                      activeFile === f.name
                        ? "bg-violet-500/15 text-violet-200"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                    )}
                  >
                    <File className="w-3 h-3" />
                    {f.name}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFile(f.name); }}
                      className="ml-auto opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main area — split: code + preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Code editor */}
          {(view === "code" || view === "split") && (
            <div className={cn("flex flex-col overflow-hidden", view === "split" ? "w-1/2 border-r border-violet-500/15" : "w-full")}>
              <div className="shrink-0 h-7 border-b border-violet-500/10 bg-[#0c0c12] flex items-center px-3">
                <span className="text-[10px] font-mono text-zinc-500">{activeFile}</span>
                <span className="ml-auto text-[9px] font-mono text-zinc-700">
                  {currentFile?.content.length || 0} byte
                </span>
              </div>
              <div className="flex-1 overflow-auto bg-[#0c0c12]" style={{ scrollbarWidth: "thin" }}>
                {currentFile && (
                  <textarea
                    value={currentFile.content}
                    onChange={(e) => updateFileContent(activeFile, e.target.value)}
                    className="w-full h-full bg-transparent p-4 text-[12px] font-mono text-zinc-200 focus:outline-none resize-none leading-relaxed"
                    style={{ minHeight: "100%", tabSize: 2 }}
                    spellCheck={false}
                  />
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {(view === "preview" || view === "split") && (
            <div className={cn("flex flex-col overflow-hidden", view === "split" ? "w-1/2" : "w-full")}>
              <div className="shrink-0 h-7 border-b border-violet-500/10 bg-[#0c0c12] flex items-center px-3">
                <Eye className="w-3 h-3 text-violet-400 mr-1.5" />
                <span className="text-[10px] font-mono text-zinc-500">önizleme</span>
                <button
                  onClick={() => setView("preview")}
                  className="ml-auto text-[9px] font-mono text-zinc-600 hover:text-violet-300"
                >
                  yenile
                </button>
              </div>
              <div className="flex-1 bg-white overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                  title="önizleme"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terminal — bottom panel */}
      <div className="shrink-0 h-48 border-t border-violet-500/20 bg-[#08080c] flex flex-col">
        <div className="shrink-0 h-7 border-b border-violet-500/10 flex items-center gap-2 px-3 bg-[#0c0c12]">
          <TerminalIcon className="w-3 h-3 text-emerald-400" />
          <span className="text-[10px] font-mono text-zinc-500">Terminal 1</span>
          <span className="text-[9px] font-mono text-zinc-700">nexra@ide:~$</span>
        </div>
        <div
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-relaxed"
          style={{ scrollbarWidth: "thin" }}
        >
          {terminalLines.map((l) => (
            <div
              key={l.id}
              className={cn(
                "whitespace-pre-wrap break-words",
                l.type === "in" && "text-zinc-300",
                l.type === "out" && "text-emerald-200/80",
                l.type === "err" && "text-rose-300",
                l.type === "sys" && "text-cyan-400/60 italic"
              )}
            >
              {l.type === "in" ? (
                <span className="flex gap-1.5">
                  <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-cyan-500/60" />
                  <span>{l.text}</span>
                </span>
              ) : (
                l.text
              )}
            </div>
          ))}
          {terminalBusy && (
            <div className="text-cyan-400/60 italic flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              calisiyor...
            </div>
          )}
        </div>
        {/* Terminal input */}
        <div className="shrink-0 px-2 py-1.5 border-t border-violet-500/10 flex items-center gap-2 bg-[#0c0c12]">
          <ChevronRight className="w-3.5 h-3.5 text-cyan-500/60 shrink-0" />
          <input
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runTerminal()}
            placeholder="komut yaz... (help)"
            className="flex-1 bg-transparent text-[11px] font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
          />
          <button
            onClick={runTerminal}
            disabled={!terminalInput.trim() || terminalBusy}
            className="p-1 rounded text-cyan-400 hover:bg-cyan-500/10 transition disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
