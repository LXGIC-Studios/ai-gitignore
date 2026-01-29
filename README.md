# ai-gitignore

[![npm version](https://img.shields.io/npm/v/ai-gitignore.svg)](https://www.npmjs.com/package/ai-gitignore)
[![npm downloads](https://img.shields.io/npm/dm/ai-gitignore.svg)](https://www.npmjs.com/package/ai-gitignore)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)


Stop copy-pasting .gitignore templates from GitHub. This thing actually looks at your project and figures out what to ignore.

## Install

```bash
npm install -g ai-gitignore
```

## Usage

```bash
# Preview what it'll generate
npx ai-gitignore --preview

# Just write the .gitignore
npx ai-gitignore

# Custom output path
npx ai-gitignore --output ./my-project/.gitignore
```

## How it works

It scans your project for config files like `package.json`, `Cargo.toml`, `go.mod`, etc. Then it asks OpenAI to generate a proper .gitignore based on what it finds. That's it. No templates, no guessing.

## Requirements

Set your `OPENAI_API_KEY` environment variable. You'll need an OpenAI API key.

```bash
export OPENAI_API_KEY=sk-...
```

## License

MIT
