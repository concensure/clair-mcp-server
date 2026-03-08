---
name: typescript-cascade
parent: coding
token_budget: 310
triggers: ["typescript", "javascript", ".ts", ".js", "node", "react", "next"]
mcp_dependencies: ["filesystem", "bash_exec"]
---

# TypeScript Coding Cascade

Loaded because the task involves TypeScript or JavaScript.

## Standards

- Strict TypeScript (`"strict": true` in tsconfig)
- ESM modules (`"type": "module"` in package.json)
- No `any` unless genuinely unavoidable
- Async/await over `.then()` chains

## Project Bootstrap

```bash
npm init -y
npm install typescript tsx @types/node --save-dev
echo '{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","strict":true}}' > tsconfig.json
```

## Core Pattern

```typescript
#!/usr/bin/env node

async function main(): Promise<void> {
  try {
    // implementation
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
```

## React Component Pattern

```typescript
import { useState } from 'react';

interface Props {
  title: string;
  onAction: (value: string) => void;
}

export default function MyComponent({ title, onAction }: Props) {
  const [value, setValue] = useState('');
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => onAction(value)}>Submit</button>
    </div>
  );
}
```

## Checklist

- [ ] All parameters and returns typed
- [ ] Error handling with typed catch
- [ ] No implicit `any`
