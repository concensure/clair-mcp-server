---
name: pptx-cascade
parent: documents
token_budget: 510
triggers: ["pptx", "powerpoint", "slides", "presentation", "deck"]
mcp_dependencies: ["filesystem", "bash_exec"]
---

# PPTX Creation Cascade

Loaded because the task requires a PowerPoint presentation.

## Setup

```bash
npm install pptxgenjs
# OR
pip install python-pptx --break-system-packages
```

## Core Pattern (pptxgenjs — preferred)

```javascript
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';

// Title slide
let slide = pptx.addSlide();
slide.addText('Presentation Title', {
  x: 0.5, y: 1.5, w: '90%', h: 1.5,
  fontSize: 44, bold: true, align: 'center', color: '363636'
});

// Content slide
slide = pptx.addSlide();
slide.addText('Section Title', { x: 0.5, y: 0.3, fontSize: 28, bold: true });
slide.addText([
  { text: 'Key point one', options: { bullet: true } },
  { text: 'Key point two', options: { bullet: true } }
], { x: 0.5, y: 1.2, w: '90%', fontSize: 18 });

await pptx.writeFile({ fileName: '/mnt/user-data/outputs/presentation.pptx' });
```

## Checklist

- [ ] Title slide with clear title and subtitle
- [ ] No more than 5 bullet points per slide
- [ ] Consistent font sizes (title: 28-44pt, body: 16-20pt)
- [ ] Color scheme consistent throughout
- [ ] Saved to outputs and presented with `present_files`
