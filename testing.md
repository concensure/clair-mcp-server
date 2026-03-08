---
name: testing-cascade
parent: coding
token_budget: 280
triggers: ["test", "spec", "coverage", "jest", "pytest", "unit test"]
mcp_dependencies: ["filesystem", "bash_exec"]
---

# Testing Cascade

Loaded because the task requires writing or running tests.

## Python Tests (pytest)

```python
import pytest
from mymodule import my_function

def test_basic_case():
    assert my_function(2, 3) == 5

def test_edge_case():
    assert my_function(0, 0) == 0

def test_raises_on_invalid():
    with pytest.raises(ValueError):
        my_function(-1, None)
```

Run: `pytest -v --tb=short`

## TypeScript Tests (Jest / Vitest)

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('handles basic case', () => {
    expect(myFunction(2, 3)).toBe(5);
  });

  it('throws on invalid input', () => {
    expect(() => myFunction(-1, null)).toThrow();
  });
});
```

Run: `npx vitest run`

## Coverage Requirements

- Aim for >80% line coverage
- 100% coverage on pure utility functions
- Integration tests for all public API surfaces

## Checklist

- [ ] One test file per source file
- [ ] Tests named: `test_<function>_<scenario>` or `<function> <scenario>`
- [ ] No test depends on another test's state
- [ ] Tests run cleanly with zero output on success
