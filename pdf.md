---
name: pdf-cascade
parent: documents
token_budget: 480
triggers: ["pdf", ".pdf", "portable document"]
mcp_dependencies: ["filesystem", "bash_exec"]
---

# PDF Creation Cascade

Loaded because the task requires a PDF document output.

## Setup

```bash
pip install fpdf2 --break-system-packages
```

## Core Pattern

```python
from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.cell(0, 10, 'Document Title', border=False, align='C')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}}', align='C')

doc = PDF()
doc.add_page()
doc.set_font('times', size=12)

# Content
doc.cell(0, 10, 'Section 1', new_x="LMARGIN", new_y="NEXT", align='L')
doc.multi_cell(0, 10, 'Body text goes here. It wraps automatically.')

doc.output('/mnt/user-data/outputs/output.pdf')
```

## Checklist

- [ ] Title and page numbers included
- [ ] Fonts are standard (Helvetica/Times/Courier) to avoid embedding issues
- [ ] Margins are sufficient (default 1cm)
- [ ] Saved to outputs and presented with `present_files`