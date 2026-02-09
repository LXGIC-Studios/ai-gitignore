#!/usr/bin/env node

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// ── Colors ──────────────────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

// ── Types ───────────────────────────────────────────────────────────────────

interface CliOptions {
  dir: string;
  check: boolean;
  merge: boolean;
  preview: boolean;
  json: boolean;
  help: boolean;
  force: boolean;
}

interface DetectedStack {
  name: string;
  confidence: "high" | "medium" | "low";
  matchedFiles: string[];
}

// ── CLI Parsing ─────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dir: ".",
    check: false,
    merge: false,
    preview: false,
    json: false,
    help: false,
    force: false,
  };

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--help":
      case "-h":
        opts.help = true;
        break;
      case "--json":
        opts.json = true;
        break;
      case "--check":
      case "-c":
        opts.check = true;
        break;
      case "--merge":
      case "-m":
        opts.merge = true;
        break;
      case "--preview":
      case "-p":
        opts.preview = true;
        break;
      case "--force":
      case "-f":
        opts.force = true;
        break;
      case "--dir":
      case "-d":
        opts.dir = args[++i] || ".";
        break;
      default:
        if (!arg.startsWith("-")) {
          opts.dir = arg;
        }
        break;
    }
  }

  return opts;
}

// ── Help ────────────────────────────────────────────────────────────────────

function showHelp(): void {
  console.log(`
${c.bold}${c.cyan}ai-gitignore${c.reset} - Auto-detect tech stack and generate .gitignore

${c.bold}USAGE${c.reset}
  ${c.green}ai-gitignore${c.reset} [directory] [options]

${c.bold}EXAMPLES${c.reset}
  ${c.dim}# Generate .gitignore for current directory${c.reset}
  ai-gitignore

  ${c.dim}# Preview what would be generated (don't write)${c.reset}
  ai-gitignore --preview

  ${c.dim}# Merge with existing .gitignore${c.reset}
  ai-gitignore --merge

  ${c.dim}# Check for tracked files that should be ignored${c.reset}
  ai-gitignore --check

  ${c.dim}# Scan a specific directory${c.reset}
  ai-gitignore /path/to/project

${c.bold}OPTIONS${c.reset}
  ${c.yellow}-h, --help${c.reset}        Show this help message
  ${c.yellow}-d, --dir <path>${c.reset}  Directory to scan (default: current)
  ${c.yellow}-c, --check${c.reset}       Find tracked files that should be ignored
  ${c.yellow}-m, --merge${c.reset}       Merge with existing .gitignore instead of replacing
  ${c.yellow}-p, --preview${c.reset}     Preview generated .gitignore without writing
  ${c.yellow}-f, --force${c.reset}       Overwrite existing .gitignore
  ${c.yellow}--json${c.reset}            Output detection results as JSON

${c.bold}SUPPORTED STACKS${c.reset}
  Node.js, Python, Go, Rust, Java, Ruby, .NET/C#, PHP, Swift,
  Kotlin, Dart/Flutter, Elixir, Scala, Haskell, R, Terraform,
  Docker, Vim, VS Code, JetBrains, macOS, Windows, Linux
`);
}

// ── Stack Detection ─────────────────────────────────────────────────────────

interface StackDetector {
  name: string;
  files: string[];
  dirs?: string[];
  extensions?: string[];
}

const DETECTORS: StackDetector[] = [
  {
    name: "node",
    files: ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".nvmrc", ".npmrc"],
    dirs: ["node_modules"],
    extensions: [".js", ".mjs", ".cjs"],
  },
  {
    name: "typescript",
    files: ["tsconfig.json", "tsconfig.build.json"],
    extensions: [".ts", ".tsx"],
  },
  {
    name: "python",
    files: ["requirements.txt", "setup.py", "pyproject.toml", "Pipfile", "poetry.lock", ".python-version", "tox.ini"],
    dirs: ["__pycache__", ".venv", "venv"],
    extensions: [".py"],
  },
  {
    name: "go",
    files: ["go.mod", "go.sum"],
    extensions: [".go"],
  },
  {
    name: "rust",
    files: ["Cargo.toml", "Cargo.lock"],
    dirs: ["target"],
    extensions: [".rs"],
  },
  {
    name: "java",
    files: ["pom.xml", "build.gradle", "build.gradle.kts", "gradlew", ".java-version"],
    dirs: [".gradle", ".mvn"],
    extensions: [".java"],
  },
  {
    name: "ruby",
    files: ["Gemfile", "Gemfile.lock", "Rakefile", ".ruby-version", ".ruby-gemset"],
    extensions: [".rb"],
  },
  {
    name: "dotnet",
    files: ["*.csproj", "*.fsproj", "*.sln", "global.json", "nuget.config"],
    dirs: ["bin", "obj"],
    extensions: [".cs", ".fs"],
  },
  {
    name: "php",
    files: ["composer.json", "composer.lock", "artisan", ".php-version"],
    dirs: ["vendor"],
    extensions: [".php"],
  },
  {
    name: "swift",
    files: ["Package.swift", "*.xcodeproj", "*.xcworkspace", "Podfile"],
    dirs: [".build", "Pods"],
    extensions: [".swift"],
  },
  {
    name: "kotlin",
    files: ["build.gradle.kts", "settings.gradle.kts"],
    extensions: [".kt", ".kts"],
  },
  {
    name: "dart",
    files: ["pubspec.yaml", "pubspec.lock", ".flutter-plugins"],
    dirs: [".dart_tool"],
    extensions: [".dart"],
  },
  {
    name: "elixir",
    files: ["mix.exs", "mix.lock"],
    dirs: ["_build", "deps"],
    extensions: [".ex", ".exs"],
  },
  {
    name: "scala",
    files: ["build.sbt", "project/build.properties"],
    dirs: [".bsp"],
    extensions: [".scala"],
  },
  {
    name: "haskell",
    files: ["stack.yaml", "cabal.project", "*.cabal"],
    dirs: [".stack-work"],
    extensions: [".hs"],
  },
  {
    name: "r",
    files: [".Rprofile", "DESCRIPTION", "NAMESPACE", ".Rproj"],
    extensions: [".R", ".Rmd"],
  },
  {
    name: "terraform",
    files: ["main.tf", "variables.tf", "terraform.tfvars", ".terraform.lock.hcl"],
    dirs: [".terraform"],
    extensions: [".tf"],
  },
  {
    name: "docker",
    files: ["Dockerfile", "docker-compose.yml", "docker-compose.yaml", ".dockerignore"],
  },
  {
    name: "nextjs",
    files: ["next.config.js", "next.config.mjs", "next.config.ts"],
    dirs: [".next"],
  },
  {
    name: "react",
    files: ["vite.config.ts", "vite.config.js"],
    dirs: [".vite"],
  },
];

function detectStack(dir: string): DetectedStack[] {
  const detected: DetectedStack[] = [];
  let entries: string[] = [];

  try {
    entries = fs.readdirSync(dir);
  } catch {
    return detected;
  }

  // Also check for hidden dirs
  const allEntries = new Set(entries);

  for (const detector of DETECTORS) {
    const matchedFiles: string[] = [];

    // Check files
    for (const file of detector.files) {
      if (file.includes("*")) {
        // Wildcard match
        const pattern = file.replace(/\*/g, "");
        const match = entries.find((e) => e.endsWith(pattern));
        if (match) matchedFiles.push(match);
      } else if (allEntries.has(file)) {
        matchedFiles.push(file);
      }
    }

    // Check directories
    if (detector.dirs) {
      for (const d of detector.dirs) {
        if (allEntries.has(d)) {
          try {
            const stat = fs.statSync(path.join(dir, d));
            if (stat.isDirectory()) matchedFiles.push(d + "/");
          } catch {}
        }
      }
    }

    // Check extensions
    if (detector.extensions) {
      for (const ext of detector.extensions) {
        const match = entries.find((e) => e.endsWith(ext));
        if (match) matchedFiles.push(`*${ext}`);
      }
    }

    if (matchedFiles.length > 0) {
      const confidence: "high" | "medium" | "low" =
        matchedFiles.length >= 3 ? "high" : matchedFiles.length >= 2 ? "medium" : "low";
      detected.push({
        name: detector.name,
        confidence,
        matchedFiles,
      });
    }
  }

  return detected;
}

// ── Gitignore Templates ─────────────────────────────────────────────────────

const IGNORE_TEMPLATES: Record<string, string[]> = {
  node: [
    "# Node.js",
    "node_modules/",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    ".pnpm-debug.log*",
    "lerna-debug.log*",
    ".npm",
    ".yarn/cache",
    ".yarn/unplugged",
    ".yarn/build-state.yml",
    ".yarn/install-state.gz",
    ".pnp.*",
  ],
  typescript: [
    "# TypeScript",
    "dist/",
    "build/",
    "*.tsbuildinfo",
    "*.d.ts.map",
  ],
  python: [
    "# Python",
    "__pycache__/",
    "*.py[cod]",
    "*$py.class",
    "*.so",
    ".Python",
    "venv/",
    ".venv/",
    "env/",
    ".env/",
    "*.egg-info/",
    "dist/",
    "build/",
    "*.egg",
    ".pytest_cache/",
    ".mypy_cache/",
    ".ruff_cache/",
    "htmlcov/",
    ".coverage",
    ".coverage.*",
    "pip-log.txt",
    "pip-delete-this-directory.txt",
    ".tox/",
    ".nox/",
  ],
  go: [
    "# Go",
    "*.exe",
    "*.exe~",
    "*.dll",
    "*.so",
    "*.dylib",
    "*.test",
    "*.out",
    "vendor/",
  ],
  rust: [
    "# Rust",
    "target/",
    "Cargo.lock",
    "**/*.rs.bk",
  ],
  java: [
    "# Java",
    "*.class",
    "*.jar",
    "*.war",
    "*.ear",
    "*.nar",
    "hs_err_pid*",
    ".gradle/",
    "build/",
    "!gradle/wrapper/gradle-wrapper.jar",
    ".mvn/timing.properties",
    ".mvn/wrapper/maven-wrapper.jar",
  ],
  ruby: [
    "# Ruby",
    "*.gem",
    "*.rbc",
    "/.config",
    "/coverage/",
    "/InstalledFiles",
    "/pkg/",
    "/spec/reports/",
    "/spec/examples.txt",
    "/test/tmp/",
    "/test/version_tmp/",
    "/tmp/",
    ".bundle/",
    "vendor/bundle",
    "*.bundle",
    ".rvmrc",
  ],
  dotnet: [
    "# .NET",
    "[Dd]ebug/",
    "[Rr]elease/",
    "x64/",
    "x86/",
    "bld/",
    "[Bb]in/",
    "[Oo]bj/",
    "[Ll]og/",
    "[Ll]ogs/",
    "*.nupkg",
    "*.snupkg",
    ".nuget/",
    "*.suo",
    "*.user",
    "*.userosscache",
    "*.sln.docstates",
    "project.lock.json",
    "project.fragment.lock.json",
    "artifacts/",
  ],
  php: [
    "# PHP",
    "vendor/",
    "composer.phar",
    ".phpunit.result.cache",
    ".php_cs.cache",
    ".php-cs-fixer.cache",
    "*.phar",
    "storage/",
  ],
  swift: [
    "# Swift/Xcode",
    ".build/",
    "DerivedData/",
    "*.xcuserstate",
    "*.ipa",
    "*.dSYM.zip",
    "*.dSYM",
    "Pods/",
    "Carthage/Build/",
    "*.pbxuser",
    "!default.pbxuser",
    "*.mode1v3",
    "!default.mode1v3",
    "*.mode2v3",
    "!default.mode2v3",
    "*.perspectivev3",
    "!default.perspectivev3",
    "xcuserdata/",
  ],
  kotlin: [
    "# Kotlin",
    "*.class",
    ".gradle/",
    "build/",
    "out/",
    ".kotlin/",
  ],
  dart: [
    "# Dart/Flutter",
    ".dart_tool/",
    ".packages",
    "build/",
    ".flutter-plugins",
    ".flutter-plugins-dependencies",
    "*.iml",
  ],
  elixir: [
    "# Elixir",
    "_build/",
    "deps/",
    "*.ez",
    "*.beam",
    "/config/*.secret.exs",
    ".fetch",
    "erl_crash.dump",
    "*.plt",
    "*.plt.hash",
  ],
  scala: [
    "# Scala",
    "target/",
    ".bsp/",
    ".metals/",
    ".bloop/",
    "project/metals.sbt",
    "project/project/",
  ],
  haskell: [
    "# Haskell",
    ".stack-work/",
    "dist/",
    "dist-newstyle/",
    ".cabal-sandbox/",
    "cabal.sandbox.config",
    "*.o",
    "*.hi",
    "*.dyn_o",
    "*.dyn_hi",
    "*.prof",
    "*.tix",
  ],
  r: [
    "# R",
    ".Rhistory",
    ".Rdata",
    ".RData",
    ".Ruserdata",
    ".httr-oauth",
    "*.Rproj.user",
    "/*.Rcheck/",
    "/*_cache/",
  ],
  terraform: [
    "# Terraform",
    ".terraform/",
    "*.tfstate",
    "*.tfstate.*",
    "crash.log",
    "crash.*.log",
    "*.tfvars",
    "!*.tfvars.example",
    "override.tf",
    "override.tf.json",
    "*_override.tf",
    "*_override.tf.json",
    ".terraformrc",
    "terraform.rc",
  ],
  docker: [
    "# Docker",
    ".docker/",
  ],
  nextjs: [
    "# Next.js",
    ".next/",
    "out/",
    ".vercel",
  ],
  react: [
    "# Vite",
    ".vite/",
  ],
};

const COMMON_IGNORE = [
  "# OS files",
  ".DS_Store",
  ".DS_Store?",
  "._*",
  "Thumbs.db",
  "ehthumbs.db",
  "Desktop.ini",
  "",
  "# Editor/IDE",
  ".idea/",
  ".vscode/",
  "*.swp",
  "*.swo",
  "*~",
  ".project",
  ".classpath",
  ".settings/",
  "*.sublime-workspace",
  "*.sublime-project",
  "",
  "# Environment",
  ".env",
  ".env.local",
  ".env.*.local",
  "",
  "# Logs",
  "logs/",
  "*.log",
  "",
  "# Coverage",
  "coverage/",
  ".nyc_output/",
];

// ── Generate ────────────────────────────────────────────────────────────────

function generateGitignore(stacks: DetectedStack[]): string {
  const sections: string[] = [];

  // Header
  sections.push("# Generated by ai-gitignore");
  sections.push(`# Detected: ${stacks.map((s) => s.name).join(", ")}`);
  sections.push(`# ${new Date().toISOString().split("T")[0]}`);
  sections.push("");

  // Common rules
  sections.push(...COMMON_IGNORE);
  sections.push("");

  // Stack-specific rules
  const added = new Set<string>();
  for (const stack of stacks) {
    const template = IGNORE_TEMPLATES[stack.name];
    if (template && !added.has(stack.name)) {
      added.add(stack.name);
      sections.push(...template);
      sections.push("");
    }
  }

  return sections.join("\n").trimEnd() + "\n";
}

// ── Check Tracked Files ─────────────────────────────────────────────────────

function checkTrackedFiles(dir: string, gitignoreContent: string): string[] {
  const violations: string[] = [];

  try {
    // Get list of tracked files
    const tracked = execSync("git ls-files", {
      cwd: dir,
      encoding: "utf-8",
      timeout: 10000,
    })
      .trim()
      .split("\n")
      .filter(Boolean);

    // Parse gitignore patterns (simple version)
    const patterns = gitignoreContent
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    for (const file of tracked) {
      for (const pattern of patterns) {
        if (matchIgnorePattern(file, pattern)) {
          violations.push(file);
          break;
        }
      }
    }
  } catch {
    // Not a git repo or git not available
  }

  return violations;
}

function matchIgnorePattern(file: string, pattern: string): boolean {
  // Simple pattern matching
  let p = pattern;
  const isDir = p.endsWith("/");
  if (isDir) p = p.slice(0, -1);

  // Exact match
  if (file === p) return true;
  if (file.startsWith(p + "/")) return true;

  // Wildcard match
  if (p.includes("*")) {
    const regex = new RegExp(
      "^" +
        p
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/\*\*/g, "<<DOUBLE>>")
          .replace(/\*/g, "[^/]*")
          .replace(/<<DOUBLE>>/g, ".*") +
        (isDir ? "(/|$)" : "$")
    );
    return regex.test(file);
  }

  // Check if it's a directory match
  const parts = file.split("/");
  return parts.some((part) => part === p);
}

// ── Merge ───────────────────────────────────────────────────────────────────

function mergeGitignore(existing: string, generated: string): string {
  const existingLines = new Set(
    existing
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"))
  );

  const newLines = generated
    .split("\n")
    .filter((l) => {
      const trimmed = l.trim();
      if (!trimmed || trimmed.startsWith("#")) return true;
      return !existingLines.has(trimmed);
    });

  // Add section header
  const merged =
    existing.trimEnd() +
    "\n\n# Added by ai-gitignore\n" +
    newLines
      .filter((l) => {
        const trimmed = l.trim();
        return trimmed && !trimmed.startsWith("#");
      })
      .join("\n") +
    "\n";

  return merged;
}

// ── Main ────────────────────────────────────────────────────────────────────

function main(): void {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    showHelp();
    process.exit(0);
  }

  const dir = path.resolve(opts.dir);

  if (!fs.existsSync(dir)) {
    console.error(`\n${c.red}Directory not found: ${dir}${c.reset}\n`);
    process.exit(1);
  }

  // Detect stack
  const stacks = detectStack(dir);

  if (opts.json) {
    const gitignore = generateGitignore(stacks);
    const violations = opts.check ? checkTrackedFiles(dir, gitignore) : [];
    console.log(
      JSON.stringify({ stacks, gitignore, violations }, null, 2)
    );
    return;
  }

  // Display detected stacks
  console.log(
    `\n${c.bold}${c.magenta}🔍 Stack Detection${c.reset}${c.dim} (${dir})${c.reset}\n`
  );

  if (stacks.length === 0) {
    console.log(
      `  ${c.yellow}No tech stack detected. Generating common .gitignore only.${c.reset}\n`
    );
    // Still push common stuff
    stacks.push({
      name: "common",
      confidence: "high",
      matchedFiles: [],
    });
  } else {
    for (const stack of stacks) {
      const confidenceColor =
        stack.confidence === "high"
          ? c.green
          : stack.confidence === "medium"
            ? c.yellow
            : c.dim;
      const icon =
        stack.confidence === "high"
          ? "●"
          : stack.confidence === "medium"
            ? "◐"
            : "○";
      console.log(
        `  ${confidenceColor}${icon}${c.reset} ${c.bold}${stack.name}${c.reset} ${c.dim}(${stack.matchedFiles.join(", ")})${c.reset}`
      );
    }
    console.log("");
  }

  // Generate gitignore
  const generated = generateGitignore(stacks);

  // Check mode
  if (opts.check) {
    const existing = fs.existsSync(path.join(dir, ".gitignore"))
      ? fs.readFileSync(path.join(dir, ".gitignore"), "utf-8")
      : generated;

    const violations = checkTrackedFiles(dir, existing);

    if (violations.length === 0) {
      console.log(
        `  ${c.green}${c.bold}✓${c.reset} No tracked files match .gitignore patterns.\n`
      );
    } else {
      console.log(
        `  ${c.yellow}${c.bold}⚠${c.reset} ${violations.length} tracked file${violations.length !== 1 ? "s" : ""} should probably be ignored:\n`
      );
      for (const v of violations.slice(0, 20)) {
        console.log(`    ${c.red}${v}${c.reset}`);
      }
      if (violations.length > 20) {
        console.log(
          `    ${c.dim}...and ${violations.length - 20} more${c.reset}`
        );
      }
      console.log(
        `\n  ${c.dim}Run ${c.cyan}git rm --cached <file>${c.dim} to untrack them.${c.reset}\n`
      );
    }
    return;
  }

  // Preview mode
  if (opts.preview) {
    console.log(`${c.dim}${"─".repeat(50)}${c.reset}`);
    console.log(generated);
    console.log(`${c.dim}${"─".repeat(50)}${c.reset}`);
    return;
  }

  // Write or merge
  const gitignorePath = path.join(dir, ".gitignore");
  const exists = fs.existsSync(gitignorePath);

  if (exists && opts.merge) {
    const existing = fs.readFileSync(gitignorePath, "utf-8");
    const merged = mergeGitignore(existing, generated);
    fs.writeFileSync(gitignorePath, merged);
    console.log(
      `  ${c.green}${c.bold}✓${c.reset} Merged new rules into existing .gitignore\n`
    );
  } else if (exists && !opts.force) {
    console.log(
      `  ${c.yellow}.gitignore already exists. Use --force to overwrite or --merge to add new rules.${c.reset}\n`
    );
    process.exit(1);
  } else {
    fs.writeFileSync(gitignorePath, generated);
    console.log(
      `  ${c.green}${c.bold}✓${c.reset} Generated .gitignore with ${stacks.length} stack${stacks.length !== 1 ? "s" : ""} detected\n`
    );
  }
}

main();
