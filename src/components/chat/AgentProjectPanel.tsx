"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Terminal as TerminalIcon,
  Folder,
  File,
  Eye,
  Code2,
  Play,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEscapeKey } from "@/lib/use-escape-key";

export type ProjectFile = {
  name: string;
  content: string;
  language?: string;
};

export type AgentProject = {
  name: string;
  files: ProjectFile[];
  html?: string; // direct HTML for preview
};

export function AgentProjectPanel({
  open,
  onClose,
  project,
}: {
  open: boolean;
  onClose: () => void;
  project: AgentProject | null;
}) {
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [view, setView] = useState<"code" | "preview">("preview");
  const [fileTreeOpen, setFileTreeOpen] = useState(true);
  useEscapeKey(onClose, open);

  useEffect(() => {
    if (project?.files.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveFile(project.files[0].name);
    }
    if (project?.html) {
      setView("preview");
    } else if (project?.files.length) {
      setView("code");
    }
  }, [project]);

  if (!project) return null;

  const currentFile = project.files.find((f) => f.name === activeFile);
  const hasPreview = !!project.html;

  return (
    <AnimatePresence>
      {open && (
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
            <span className="text-xs font-mono text-violet-300">{project.name}</span>
            <span className="text-[10px] font-mono text-zinc-600">
              {project.files.length} dosya
            </span>
            <div className="flex-1" />
            {/* View toggle */}
            {hasPreview && (
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#13131a] border border-zinc-800">
                <button
                  onClick={() => setView("preview")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition",
                    view === "preview"
                      ? "bg-violet-500/20 text-violet-200"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Önizleme
                </button>
                <button
                  onClick={() => setView("code")}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition",
                    view === "code"
                      ? "bg-violet-500/20 text-violet-200"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Code2 className="w-3 h-3" />
                  Kod
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-zinc-500 hover:text-rose-300 hover:bg-rose-500/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 flex overflow-hidden">
            {/* File explorer */}
            {view === "code" && (
              <div className="w-48 shrink-0 border-r border-violet-500/15 bg-[#08080c] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                <div className="p-2">
                  <button
                    onClick={() => setFileTreeOpen(!fileTreeOpen)}
                    className="flex items-center gap-1 w-full px-1.5 py-1 text-[10px] font-mono text-zinc-400 hover:text-zinc-200"
                  >
                    {fileTreeOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <Folder className="w-3 h-3 text-violet-400" />
                    {project.name}
                  </button>
                  {fileTreeOpen && (
                    <div className="ml-3 mt-1 space-y-0.5">
                      {project.files.map((f) => (
                        <button
                          key={f.name}
                          onClick={() => setActiveFile(f.name)}
                          className={cn(
                            "flex items-center gap-1 w-full px-1.5 py-1 rounded text-[10px] font-mono transition",
                            activeFile === f.name
                              ? "bg-violet-500/15 text-violet-200"
                              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                          )}
                        >
                          <File className="w-3 h-3" />
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Main content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {view === "preview" && hasPreview ? (
                <div className="flex-1 bg-black">
                  <iframe
                    srcDoc={project.html}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin"
                    title={project.name}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-auto bg-[#0c0c12]" style={{ scrollbarWidth: "thin" }}>
                  {currentFile && (
                    <pre className="p-4 text-[12px] font-mono text-zinc-200 leading-relaxed">
                      <code>{currentFile.content}</code>
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Terminal bar */}
          <div className="shrink-0 h-7 border-t border-violet-500/15 bg-[#08080c] flex items-center gap-2 px-3">
            <TerminalIcon className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-mono text-zinc-600">
              nexra@agent:~$ proje hazır — {view === "preview" ? "canlı önizleme aktif" : "kod düzenleyici aktif"}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
