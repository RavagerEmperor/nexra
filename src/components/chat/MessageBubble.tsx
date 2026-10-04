"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { ExternalLink, AlertCircle, Terminal, FileText, Cpu, Brain } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { ThinkingPanel } from "./ThinkingPanel";
import { cn } from "@/lib/utils";
import type { Msg } from "@/lib/nexra";
import { MODEL_MAP } from "@/lib/nexra";

function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function stripTag(s: string) {
  const m = s.match(/^\s*\[NEXRA\]\s*\n?/i);
  return m ? s.slice(m[0].length) : s;
}

export function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const meta = msg.model ? MODEL_MAP[msg.model] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
    >
      <div className="flex items-center gap-2 mb-1 px-1">
        <span
          className={cn(
            "text-[10px] font-mono tracking-widest",
            isUser ? "text-zinc-500" : "text-violet-400"
          )}
        >
          {isUser ? "OPERATOR" : "NEXRA"}
          {!isUser && meta && (
            <span
              className="ml-1.5 px-1 py-0.5 rounded text-[9px] uppercase border"
              style={{
                color: meta.accent,
                borderColor: meta.accent + "40",
                background: meta.accent + "15",
              }}
            >
              {meta.tag}
            </span>
          )}
          {!isUser && msg.ultraThink && (
            <span className="ml-1 px-1 py-0.5 rounded text-[9px] uppercase border bg-indigo-500/15 text-indigo-300 border-indigo-500/30 flex items-center gap-0.5">
              <Brain className="w-2 h-2" /> ULTRA
            </span>
          )}
        </span>
        <span className="text-[10px] font-mono text-zinc-600">{fmtTime(msg.ts)}</span>
      </div>

      <div
        className={cn(
          "max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-zinc-800/60 border border-zinc-700/50 text-zinc-100 rounded-br-sm"
            : msg.error
            ? "bg-red-950/30 border border-red-500/30 text-red-200 rounded-bl-sm"
            : "bg-[#13131a] border border-violet-500/25 text-zinc-100 rounded-bl-sm"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        ) : msg.researching ? (
          <ResearchingPulse accent={meta?.accent} />
        ) : msg.loading ? (
          <ThinkingIndicator accent={meta?.accent} ultra={msg.ultraThink} />
        ) : (
          <>
            {msg.thinking && (
              <ThinkingPanel
                thinking={msg.thinking}
                modelLabel={meta?.label}
                ultra={msg.ultraThink}
              />
            )}

            {/* IMAGE output */}
            {msg.imageBase64 && (
              <div className="mb-2 rounded-lg overflow-hidden border border-violet-500/30">
                <img
                  src={`data:image/png;base64,${msg.imageBase64}`}
                  alt={msg.imagePrompt || "uretilen gorsel"}
                  className="w-full h-auto"
                />
                {msg.imagePrompt && (
                  <div className="px-3 py-1.5 bg-[#0c0c12] text-[10px] font-mono text-violet-300/70">
                    prompt: {msg.imagePrompt}
                  </div>
                )}
              </div>
            )}

            {/* VIDEO output */}
            {msg.videoUrl && (
              <div className="mb-2 rounded-lg overflow-hidden border border-rose-500/30">
                <video
                  src={msg.videoUrl}
                  controls
                  className="w-full h-auto"
                />
                {msg.videoPrompt && (
                  <div className="px-3 py-1.5 bg-[#0c0c12] text-[10px] font-mono text-rose-300/70">
                    prompt: {msg.videoPrompt}
                  </div>
                )}
              </div>
            )}

            {/* PIXEL ART output */}
            {msg.pixelGrid && (
              <div className="mb-2 rounded-lg overflow-hidden border border-green-500/30 bg-[#0c0c12]">
                <PixelArtCanvas grid={msg.pixelGrid.grid} />
                {msg.pixelConcept && (
                  <div className="px-3 py-1.5 text-[10px] font-mono text-green-300/70">
                    konsept: {msg.pixelConcept}
                  </div>
                )}
              </div>
            )}

            {/* ANIMATION output */}
            {msg.animationHtml && (
              <div className="mb-2 rounded-lg overflow-hidden border border-cyan-500/30 bg-black">
                <iframe
                  srcDoc={msg.animationHtml}
                  className="w-full h-64"
                  sandbox="allow-scripts"
                  title={msg.animationConcept || "animasyon"}
                />
                {msg.animationConcept && (
                  <div className="px-3 py-1.5 bg-[#0c0c12] text-[10px] font-mono text-cyan-300/70">
                    konsept: {msg.animationConcept}
                  </div>
                )}
              </div>
            )}

            {msg.agentActions && msg.agentActions.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {msg.agentActions.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-cyan-500/20 bg-cyan-950/10 overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/5 border-b border-cyan-500/15">
                      {a.type === "command" ? (
                        <Terminal className="w-3 h-3 text-cyan-400" />
                      ) : a.type === "file" ? (
                        <FileText className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Cpu className="w-3 h-3 text-cyan-400" />
                      )}
                      <span className="text-[10px] font-mono text-cyan-300/80 uppercase tracking-widest">
                        {a.type === "command" ? "terminal" : a.type === "file" ? `file: ${a.filename}` : "dusunce"}
                      </span>
                    </div>
                    <pre className="px-2.5 py-2 text-[12px] font-mono text-cyan-100/80 whitespace-pre-wrap overflow-x-auto">
                      {a.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}

            <div className="nexra-md break-words">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const text = String(children ?? "");
                    const match = /language-(\w+)/.exec(className || "");
                    const isBlock = !!match || text.includes("\n");
                    if (isBlock) {
                      return (
                        <CodeBlock code={text.replace(/\n$/, "")} lang={match?.[1]}>
                          {children}
                        </CodeBlock>
                      );
                    }
                    return (
                      <code
                        className="px-1 py-0.5 rounded bg-violet-500/10 text-violet-200 text-[0.85em] font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  pre({ children }) {
                    return <>{children}</>;
                  },
                  a({ href, children }) {
                    return (
                      <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
                      >
                        {children}
                      </a>
                    );
                  },
                  h1: ({ children }) => (
                    <h1 className="text-base font-bold text-zinc-100 mt-4 mb-2 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-bold text-zinc-100 mt-4 mb-2 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-zinc-200 mt-3 mb-1.5 first:mt-0">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="my-2 first:my-0 leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                  blockquote: ({ children }) => (
                    <blockquote className="my-2 pl-3 border-l-2 border-violet-500/40 text-zinc-300 italic">
                      {children}
                    </blockquote>
                  ),
                  hr: () => <hr className="my-3 border-violet-500/15" />,
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto">
                      <table className="w-full text-xs border border-violet-500/20">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="px-2 py-1 bg-violet-500/10 text-left text-zinc-200 border border-violet-500/20">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-2 py-1 border border-violet-500/20 text-zinc-300">
                      {children}
                    </td>
                  ),
                }}
              >
                {stripTag(msg.content)}
              </ReactMarkdown>
            </div>

            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-violet-500/15">
                <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400/70 mb-1.5">
                  Kaynaklar
                </p>
                <div className="space-y-1">
                  {msg.sources.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-1.5 text-[11px] text-zinc-400 hover:text-violet-200 transition group"
                    >
                      <span className="font-mono text-violet-400/70">[{i + 1}]</span>
                      <span className="flex-1 truncate">
                        {s.title}
                        <span className="text-zinc-600"> — {s.host}</span>
                      </span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function PixelArtCanvas({ grid }: { grid: string[][] }) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  if (rows === 0 || cols === 0) return null;
  const cellSize = Math.max(4, Math.min(16, Math.floor(256 / Math.max(rows, cols))));
  return (
    <div
      className="flex flex-col items-center justify-center py-3"
      style={{ imageRendering: "pixelated" }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gap: 0,
        }}
      >
        {grid.flat().map((color, i) => (
          <div
            key={i}
            style={{
              width: cellSize,
              height: cellSize,
              backgroundColor: color,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ResearchingPulse({ accent }: { accent?: string }) {
  const c = accent || "#d946ef";
  return (
    <div className="flex items-center gap-2 py-1">
      <AlertCircle className="w-3.5 h-3.5" style={{ color: c }} />
      <span className="text-xs font-mono" style={{ color: c + "cc" }}>
        web'de arastiriyor
      </span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: c,
              animation: `nexraPulse 1.2s ${i * 0.18}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes nexraPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function ThinkingIndicator({ accent, ultra }: { accent?: string; ultra?: boolean }) {
  const c = accent || "#8b5cf6";
  const label = ultra ? "ultra düşünüyor" : "düşünüyor";
  return (
    <div className="flex items-center gap-3 py-2">
      <motion.div
        animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: `radial-gradient(circle, ${c}40, transparent)`,
          border: `1.5px solid ${c}80`,
        }}
      >
        <Brain className="w-4 h-4" style={{ color: c }} />
      </motion.div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-mono" style={{ color: c + "cc" }}>
          {label}
        </span>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: c,
                animation: `thinkingPulse 1.2s ${i * 0.18}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes thinkingPulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function LoadingPulse({ accent }: { accent?: string }) {
  const c = accent || "#8b5cf6";
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-mono" style={{ color: c + "cc" }}>
        model yukleniyor
      </span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: c,
              animation: `nexraPulse 1.2s ${i * 0.18}s infinite ease-in-out`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
