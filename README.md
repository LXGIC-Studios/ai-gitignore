# @lxgicstudios/ai-gitignore

[![npm version](https://img.shields.io/npm/v/@lxgicstudios/ai-gitignore.svg)](https://www.npmjs.com/package/@lxgicstudios/ai-gitignore)
[![license](https://img.shields.io/npm/l/@lxgicstudios/ai-gitignore.svg)](https://github.com/lxgicstudios/ai-gitignore/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/@lxgicstudios/ai-gitignore.svg)](https://nodejs.org)

Auto-detect your project's tech stack and generate a comprehensive .gitignore file. Supports 20+ languages and frameworks. No config needed.

Zero external dependencies.

## Install

```bash
npm install -g @lxgicstudios/ai-gitignore
```

Or run it directly:

```bash
npx @lxgicstudios/ai-gitignore
```

## Usage

```bash
# Generate .gitignore for current directory
ai-gitignore

# Preview what would be generated
ai-gitignore --preview

# Merge with existing .gitignore
ai-gitignore --merge

# Check for tracked files that should be ignored
ai-gitignore --check

# Scan a specific directory
ai-gitignore /path/to/project

# Overwrite existing .gitignore
ai-gitignore --force

# JSON output
ai-gitignore --json
```

## Features

- Auto-detects your tech stack by scanning project files
- Supports 20+ languages: Node.js, TypeScript, Python, Go, Rust, Java, Ruby, .NET, PHP, Swift, Kotlin, Dart, Elixir, Scala, Haskell, R, Terraform, and more
- Detects frameworks: Next.js, React/Vite, Docker
- Includes OS-specific rules (macOS, Windows, Linux)
- Includes editor rules (VS Code, JetBrains, Vim)
- Merge mode to add rules to an existing .gitignore
- Check mode to find tracked files that should be ignored
- Preview mode to see output before writing
- JSON output for scripting
- Confidence scoring for detections
- Zero external dependencies

## Detected Stacks

| Stack | Detection Files |
|-------|----------------|
| Node.js | package.json, yarn.lock, .nvmrc |
| TypeScript | tsconfig.json, *.ts files |
| Python | requirements.txt, pyproject.toml, Pipfile |
| Go | go.mod, go.sum |
| Rust | Cargo.toml, Cargo.lock |
| Java | pom.xml, build.gradle |
| Ruby | Gemfile, Rakefile |
| .NET | *.csproj, *.sln |
| PHP | composer.json |
| Swift | Package.swift, *.xcodeproj |
| Kotlin | build.gradle.kts |
| Dart/Flutter | pubspec.yaml |
| Elixir | mix.exs |
| Terraform | main.tf, *.tf |
| Docker | Dockerfile, docker-compose.yml |
| Next.js | next.config.js |

## Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--help` | `-h` | Show help message | |
| `--dir <path>` | `-d` | Directory to scan | `.` |
| `--check` | `-c` | Find tracked files that should be ignored | `false` |
| `--merge` | `-m` | Merge with existing .gitignore | `false` |
| `--preview` | `-p` | Preview without writing | `false` |
| `--force` | `-f` | Overwrite existing .gitignore | `false` |
| `--json` | | Output as JSON | `false` |

## License

MIT - [LXGIC Studios](https://github.com/lxgicstudios)
