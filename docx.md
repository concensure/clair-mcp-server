---
name: docx-cascade
parent: documents
token_budget: 560
triggers: ["word", "docx", ".docx"]
mcp_dependencies: ["filesystem", "bash_exec"]
---

# DOCX Creation Cascade

Loaded because the task requires a Word document output.

## Setup

```bash
pip install python-docx --break-system-packages
```

## Core Pattern

```python
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH

doc = Document()

# Title
title = doc.add_heading('Document Title', 0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER

# Section heading
doc.add_heading('Section 1', level=1)

# Body paragraph
doc.add_paragraph('Body text goes here.')

# Table
table = doc.add_table(rows=1, cols=3)
table.style = 'Table Grid'
hdr = table.rows[0].cells
hdr[0].text = 'Column A'
hdr[1].text = 'Column B'
hdr[2].text = 'Column C'

doc.save('/mnt/user-data/outputs/output.docx')
```

## Checklist

- [ ] Appropriate heading hierarchy (H1, H2, H3)
- [ ] Page margins set (default: 1 inch all sides)
- [ ] Font consistent throughout (default: Calibri 11pt body)
- [ ] Tables use 'Table Grid' style
- [ ] File saved to outputs and presented with `present_files`
