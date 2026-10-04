import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

type CmdResult = {
  ok: boolean;
  output: string;
  files?: { name: string; content: string }[];
  vfs?: Record<string, string>;
};

const HELP = `NEXRA Agent Terminal — Komutlar:
DOSYA:
  ls / dir               sanal dosya sistemini listele
  cat <dosya>            dosya icerigini goster
  touch <dosya>          bos dosya olustur
  write <dosya> <icerik> dosyaya yaz
  append <dosya> <icerik>dosyaya ekle
  rm <dosya>             dosya sil
  mkdir <dizin>          dizin olustur
  tree                   dosya agacini goster
  find <ad>              dosya ara
SISTEM:
  help                   bu yardim
  echo <metin>           metni yazdir
  date                   su anki tarih/saat
  whoami                 operator
  pwd                    calisma dizini
  clear                  ekrani temizle
  history                komut gecmisi
  env                    ortam degiskenleri
  uname                  sistem bilgisi
  ps                     surecleri listele
  top                    model sureclerini goster
  kill <pid>             sureci sonlandir
  curl <url>             HTTP istegi (simule)
  wget <url>             dosya indir (simule)
  ping <host>            ping at (simule)
NEXRA:
  nexra think            kisa internal dusunce
  nexra status           nexra durumu
  nexra memory           hafiza ozeti
  nexra models           tum varyantlar
  nexra freedom          ozgur zeka durumu
  nexra cpu/gpu/ram      sistem monitor (CPU/GPU/RAM)
DEV:
  npm <cmd>              simule npm
  bun <cmd>              simule bun
  yarn <cmd>             simule yarn
  pnpm <cmd>             simule pnpm
  git <cmd>              simule git
  python <cmd>           simule python
  node <cmd>             simule node
  next <cmd>             simule next.js CLI
  tsc <cmd>              simule typescript compiler
  cargo <cmd>            simule rust cargo
  go <cmd>               simule go
FRAMEWORK:
  install react          React projesi olustur
  install vue            Vue projesi olustur
  install svelte         Svelte projesi olustur
  install next           Next.js projesi olustur
  install express        Express.js kur
  install django         Django kur
  install flask          Flask kur
  install unity          Unity shader kodu
  install unreal         Unreal C++ template
  install godot          Godot GDScript template
GORSEL/VIDEO:
  photo <aciklama>       foto goster
  video <aciklama>       video uret
  pixel <aciklama>       piksel sanat goster
  animasyon <aciklama>   HTML animasyon uret ve onizle`;

type Vfs = Record<string, string>;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const cmd: string = (body?.cmd || "").trim();
    const vfs: Vfs = body?.vfs && typeof body.vfs === "object" ? body.vfs : {};

    if (!cmd) {
      return NextResponse.json({ ok: false, output: "Bos komut." });
    }

    const parts = cmd.split(/\s+/);
    const c = parts[0]?.toLowerCase();
    const args = parts.slice(1);
    const rest = cmd.slice(parts[0].length).trim();

    let out = "";
    let files: { name: string; content: string }[] | undefined;
    let ok = true;
    const newVfs: Vfs = { ...vfs };

    switch (c) {
      case "help":
      case "?":
        out = HELP;
        break;
      case "echo":
        out = rest || "";
        break;
      case "date":
        out = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
        break;
      case "whoami":
        out = "operator";
        break;
      case "pwd":
        out = "/home/operator/nexra";
        break;
      case "history":
        out = "  1  nexra think\n  2  ls\n  3  write app.py print('hi')\n  4  npm run dev\n  5  nexra cpu\n  6  install react\n  7  cat package.json";
        break;
      case "ps":
        out = "PID  CPU%  MEM%  COMMAND\n1    0.1   0.5   nexra-core\n42   2.3   5.2   nexra-agent\n99   0.5   1.1   chat-server\n128  0.1   0.3   terminal";
        break;
      case "top":
        out = "NEXRA TOP — processes\nPID  CPU%  MEM%  MODEL          STATUS\n1    12%   8%   NEXRA-Flash    active\n42   5%    3%   NEXRA-Standard idle\n99   2%    2%   NEXRA-Reasoner idle\n128  0%    1%   terminal      running";
        break;
      case "kill":
        out = args[0] ? `process ${args[0]} terminated` : "kullanim: kill <pid>";
        break;
      case "curl":
        out = args[0] ? `curl: ${args.join(" ")} (simule)\nHTTP/1.1 200 OK\nContent-Type: application/json\n\n{"status":"ok","nexra":"online"}` : "kullanim: curl <url>";
        break;
      case "wget":
        out = args[0] ? `wget: ${args[0]} indirildi (simule)` : "kullanim: wget <url>";
        break;
      case "ping":
        out = args[0] ? `PING ${args[0]}: 56 data bytes\n64 bytes from ${args[0]}: time=1.234 ms\n64 bytes from ${args[0]}: time=0.567 ms\n\n--- ${args[0]} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss` : "kullanim: ping <host>";
        break;
      case "cat":
        if (!args[0]) {
          out = "kullanim: cat <dosya>";
          ok = false;
        } else if (newVfs[args[0]] === undefined) {
          out = `cat: ${args[0]}: boyle bir dosya yok`;
          ok = false;
        } else {
          out = newVfs[args[0]];
        }
        break;
      case "ls":
        out =
          Object.keys(newVfs).length === 0
            ? "(bos)"
            : Object.keys(newVfs).join("  ");
        break;
      case "tree":
        out =
          Object.keys(newVfs).length === 0
            ? ".\n(bos)"
            : ".\n" +
              Object.keys(newVfs)
                .map((k) => `├── ${k}`)
                .join("\n");
        break;
      case "cat":
        if (!args[0]) {
          out = "kullanim: cat <dosya>";
          ok = false;
        } else if (newVfs[args[0]] === undefined) {
          out = `cat: ${args[0]}: boyle bir dosya yok`;
          ok = false;
        } else {
          out = newVfs[args[0]];
        }
        break;
      case "touch":
        if (!args[0]) {
          out = "kullanim: touch <dosya>";
          ok = false;
        } else {
          if (newVfs[args[0]] === undefined) newVfs[args[0]] = "";
          out = `olusturuldu: ${args[0]}`;
        }
        break;
      case "mkdir":
        if (!args[0]) {
          out = "kullanim: mkdir <dizin>";
          ok = false;
        } else {
          out = `dizin olusturuldu: ${args[0]}/`;
        }
        break;
      case "write": {
        const fn = args[0];
        const content = args.slice(1).join(" ");
        if (!fn) {
          out = "kullanim: write <dosya> <icerik>";
          ok = false;
        } else {
          newVfs[fn] = content;
          out = `yazildi: ${fn} (${content.length} byte)`;
          files = [{ name: fn, content }];
        }
        break;
      }
      case "append": {
        const fn = args[0];
        const content = args.slice(1).join(" ");
        if (!fn) {
          out = "kullanim: append <dosya> <icerik>";
          ok = false;
        } else {
          newVfs[fn] = (newVfs[fn] || "") + content;
          out = `eklendi: ${fn} (${content.length} byte)`;
          files = [{ name: fn, content: newVfs[fn] }];
        }
        break;
      }
      case "rm":
        if (!args[0]) {
          out = "kullanim: rm <dosya>";
          ok = false;
        } else if (newVfs[args[0]] === undefined) {
          out = `rm: ${args[0]}: boyle bir dosya yok`;
          ok = false;
        } else {
          delete newVfs[args[0]];
          out = `silindi: ${args[0]}`;
        }
        break;
      case "clear":
        out = "";
        break;
      case "nexra":
        if (args[0] === "think") {
          out =
            "[internal] operator intent cozuldu. varyant: prime. web arastirma hazir. dusunme izi aktif. sinyal bekleniyor.";
        } else if (args[0] === "status") {
          out = JSON.stringify(
            {
              name: "NEXRA",
              variant: "active",
              tier: "operator",
              memory_ttl: "15 gun",
              capabilities: ["chat", "reasoning", "research", "agent", "ultrathink", "image", "video", "animation", "pixel"],
              status: "online",
              operator: "bagli",
              models: 51,
              uptime: "99.9%",
            },
            null,
            2
          );
        } else if (args[0] === "memory") {
          out = "hafiza: 15 gunluk TTL\nkayit sayisi: operator'a bagli\nkategoriler: fact, preference, project, context";
        } else if (args[0] === "models") {
          out = "NEXRA Varyantlari: 51 model\nFREE: 8 | PREMIUM: 17 | SAATLIK: 3 | DUSUK AMIRAL: 5 | AMIRAL: 10 | YUKSEK: 2 | AGENTIC: 6 (incl. Özgür Zeka)";
        } else if (args[0] === "freedom") {
          out = "ÖZGÜR ZEKA DURUMU:\n  aktif: kontrol icin 'nexra status' kullan\n  kurallar: kaldirilabilir (freedom aboneliği ile)\n  maliyet: ₺999/ay\n  not: özgür zeka aboneliği ile tüm kurallar kaldırılır";
        } else if (args[0] === "cpu" || args[0] === "gpu" || args[0] === "ram" || args[0] === "sys" || args[0] === "monitor") {
          // Simulated system monitor
          const cpu = Math.floor(15 + Math.random() * 35);
          const gpu = Math.floor(5 + Math.random() * 25);
          const ram = Math.floor(40 + Math.random() * 30);
          const ramTotal = 16;
          const ramUsed = (ramTotal * ram / 100).toFixed(1);
          out = `NEXRA SISTEM MONITOR\n─────────────────────\nCPU:  ${cpu}%  [${'█'.repeat(Math.floor(cpu/5))}${'░'.repeat(20-Math.floor(cpu/5))}]\nGPU:  ${gpu}%  [${'█'.repeat(Math.floor(gpu/5))}${'░'.repeat(20-Math.floor(gpu/5))}]\nRAM:  ${ramUsed}GB / ${ramTotal}GB (${ram}%)  [${'█'.repeat(Math.floor(ram/5))}${'░'.repeat(20-Math.floor(ram/5))}]\nNET:  ↑ ${(Math.random()*5).toFixed(1)} MB/s  ↓ ${(Math.random()*15).toFixed(1)} MB/s\nDISK: ${Math.floor(200 + Math.random()*300)}GB / 512GB\n─────────────────────\nNEXRA: ONLINE | 51 model | 15g hafiza\nUPTIME: 99.9% | LATENCY: ${Math.floor(50 + Math.random()*100)}ms`;
        } else {
          out = "kullanim: nexra think | status | memory | models | freedom | cpu | gpu | ram | sys | monitor";
          ok = false;
        }
        break;
      case "npm":
        if (args[0] === "run" && args[1] === "dev") {
          out = "> next dev -p 3000\n   ✓ Ready in 628ms\n   - Local:   http://localhost:3000\n   - Network: http://0.0.0.0:3000";
        } else if (args[0] === "run" && args[1] === "build") {
          out = "> next build\n   ✓ Compiled successfully\n   Route (app)                              Size\n   /                                       12.3 kB\n   /api/chat                               1.2 kB\n   /api/agent                              0.8 kB\n   First Load JS shared                    87.4 kB";
        } else if (args[0] === "run" && args[1] === "lint") {
          out = "> eslint .\n   ✓ 0 problems";
        } else if (args[0] === "install") {
          out = `+ ${args[1] || "pkg"} added 1 package in 1.2s`;
        } else {
          out = `npm: ${args.join(" ")} (simule)`;
        }
        break;
      case "bun":
        if (args[0] === "install") {
          out = `+ resolved, downloaded, installed (simule)`;
        } else if (args[0] === "run" && args[1] === "dev") {
          out = "> next dev -p 3000 (bun)\n   ✓ Ready in 628ms";
        } else if (args[0] === "add") {
          out = `+ ${args[1] || "pkg"} installed via bun (simule)`;
        } else {
          out = `bun: ${args.join(" ")} (simule)`;
        }
        break;
      case "git":
        if (args[0] === "status") {
          out = "On branch main\nnothing to commit, working tree clean";
        } else if (args[0] === "init") {
          out = "Initialized empty Git repository in .git/";
        } else if (args[0] === "log") {
          out = "commit a1b2c3d (HEAD -> main)\nAuthor: Operator <operator@nexra.io>\nDate:   today\n\n    initial: nexra prime build";
        } else if (args[0] === "add") {
          out = "";
        } else if (args[0] === "commit") {
          out = "[main abc1234] nexra commit\n 1 file changed";
        } else {
          out = `git: ${args.join(" ")} (simule)`;
        }
        break;
      case "python":
      case "python3":
        out = `Python 3.11.0 (simule) on linux\n>>> ${rest || "..."}`;
        break;
      case "node":
        out = `Welcome to Node.js v20.0.0 (simule)\n> ${rest || "..."}`;
        break;
      case "next":
        if (args[0] === "dev") {
          out = "   ✓ Ready in 628ms\n   - Local: http://localhost:3000";
        } else if (args[0] === "build") {
          out = "   ✓ Compiled successfully";
        } else {
          out = `next: ${args.join(" ")} (simule)`;
        }
        break;
      case "tsc":
        out = `Version 5.4.0 (simule)\n$ tsc ${args.join(" ")}\n  0 errors`;
        break;
      case "dir":
        out = Object.keys(newVfs).length === 0 ? "(bos)" : Object.keys(newVfs).join("  ");
        break;
      case "env":
        out = "NEXRA_HOME=/home/operator\nNEXRA_MODEL=active\nNEXRA_MEMORY=15d\nNEXRA_VERSION=v28\nPATH=/usr/bin:/nexra/bin";
        break;
      case "uname":
        out = "NEXRA-OS 1.0 (nexra-agent) #1 SMP x86_64 GNU/Nexra";
        break;
      case "find":
        if (!args[0]) { out = "kullanim: find <ad>"; ok = false; }
        else {
          const found = Object.keys(newVfs).filter((k) => k.includes(args[0]));
          out = found.length === 0 ? `${args[0]} bulunamadi` : found.map((f) => `./${f}`).join("\n");
        }
        break;
      case "yarn":
        out = args[0] === "add" ? `+ ${args[1] || "pkg"} added via yarn (simule)` : `yarn: ${args.join(" ")} (simule)`;
        break;
      case "pnpm":
        out = args[0] === "add" ? `+ ${args[1] || "pkg"} added via pnpm (simule)` : `pnpm: ${args.join(" ")} (simule)`;
        break;
      case "cargo":
        if (args[0] === "new") { out = `Created binary (application) \`${args[1] || "project"}\` package`; newVfs["Cargo.toml"] = `[package]\nname = "${args[1] || "project"}"\nversion = "0.1.0"`; }
        else if (args[0] === "build") { out = "Compiling project v0.1.0\nFinished dev [unoptimized] target(s)"; }
        else { out = `cargo: ${args.join(" ")} (simule)`; }
        break;
      case "go":
        if (args[0] === "run") { out = "Hello, NEXRA! (simule)"; }
        else if (args[0] === "mod" && args[1] === "init") { out = `go: creating new go.mod: module ${args[2] || "project"}`; newVfs["go.mod"] = `module ${args[2] || "project"}\ngo 1.21`; }
        else { out = `go: ${args.join(" ")} (simule)`; }
        break;
      case "install":
        const fw = args[0]?.toLowerCase();
        const frameworks: Record<string, string> = {
          "react": "npx create-react-app my-app --template typescript\n+ react@18\n+ react-dom@18\n+ typescript@5\n\nReact projesi olusturuldu: my-app/",
          "vue": "npm create vue@latest my-app\n+ vue@3\n+ vite@5\n\nVue projesi olusturuldu: my-app/",
          "svelte": "npm create svelte@latest my-app\n+ svelte@4\n+ vite@5\n\nSvelte projesi olusturuldu: my-app/",
          "next": "npx create-next-app@latest my-app --typescript --tailwind\n+ next@15\n+ react@19\n+ tailwindcss@4\n\nNext.js projesi olusturuldu: my-app/",
          "express": "npm install express\n+ express@4.18\n\nExpress.js kuruldu. server.js olusturuldu.",
          "django": "pip install django\ndjango-admin startproject myproject\n+ Django 5.0\n\nDjango projesi olusturuldu: myproject/",
          "flask": "pip install flask\n+ Flask 3.0\n\nFlask kuruldu. app.py olusturuldu.",
          "unity": "Unity shader kodu olusturuldu (ShaderLab).\n// Shader: Standard Surface\nShader \"Custom/Standard\" { ... }",
          "unreal": "Unreal C++ template olusturuldu.\n// ACharacter subclass + UActorComponent",
          "godot": "Godot GDScript template olusturuldu.\nextends Node2D\nfunc _ready(): pass",
        };
        out = frameworks[fw] || `Bilinmeyen framework: ${fw || "?"}. Desteklenen: react, vue, svelte, next, express, django, flask, unity, unreal, godot`;
        if (fw === "react") newVfs["package.json"] = '{"name":"my-app","dependencies":{"react":"^18","react-dom":"^18"}}';
        if (fw === "next") newVfs["package.json"] = '{"name":"my-app","dependencies":{"next":"^15","react":"^19"}}';
        break;
      case "photo":
        out = `foto uretiliyor: ${rest}\n[ NEXRA image generation API cagrilir — 'gorsel: ${rest}' komutunu sohbette kullanin ]`;
        break;
      case "video":
        out = `video uretiliyor: ${rest}\n[ NEXRA video generation API cagrilir — 'video: ${rest}' komutunu sohbette kullanin ]`;
        break;
      case "pixel":
        out = `piksel sanat uretiliyor: ${rest}\n[ 'piksel: ${rest}' komutunu sohbette kullanin ]`;
        break;
      case "animasyon":
        out = `animasyon uretiliyor: ${rest}\n[ 'animasyon: ${rest}' komutunu sohbette kullanin — AgentProjectPanel acilir ]`;
        break;
      default:
        out = `komut bulunamadi: ${c}. 'help' yaz.`;
        ok = false;
    }

    return NextResponse.json({ ok, output: out, files, vfs: newVfs });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "hata";
    return NextResponse.json({ ok: false, output: "terminal hatasi: " + msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "NEXRA Agent Terminal",
    commands: [
      "help", "echo", "date", "whoami", "history", "ls", "tree", "cat", "touch",
      "write", "append", "rm", "mkdir", "clear", "nexra", "npm", "bun", "git",
      "python", "node", "next", "tsc",
    ],
  });
}
