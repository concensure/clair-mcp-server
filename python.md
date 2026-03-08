---
name: python-cascade
parent: coding
token_budget: 320
triggers: ["python", ".py", "django", "flask", "fastapi", "pandas", "numpy"]
mcp_dependencies: ["filesystem", "bash_exec"]
---

# Python Coding Cascade

Loaded because the task involves Python code.

## Standards

- Python 3.10+ type hints throughout
- Use `pathlib.Path` not `os.path`
- Use f-strings, not `.format()` or `%`
- Always `pip install X --break-system-packages` in this environment

## Structure

```python
#!/usr/bin/env python3
"""Module docstring."""

from __future__ import annotations
from pathlib import Path
from typing import Any
import sys


def main() -> int:
    """Entry point."""
    try:
        # implementation
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
```

## Common Patterns

**File I/O:** `Path('/mnt/user-data/outputs/result.txt').write_text(content)`  
**CSV:** `import pandas as pd; df = pd.read_csv(path)`  
**JSON:** `import json; data = json.loads(text)`  

## Quality Checklist

- [ ] All functions typed
- [ ] Errors go to stderr
- [ ] `main()` returns int exit code
- [ ] No bare `except:` clauses
