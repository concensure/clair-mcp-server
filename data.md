---
name: data
domain: data_analysis
token_budget: 340
triggers: ["data", "csv", "excel", "spreadsheet", "analysis", "chart", "statistics", "dataset"]
loads_children_when:
  visualization: "chart|graph|plot|visualize|histogram|scatter"
  ml_pipeline: "model|train|predict|classify|cluster|regression"
mcp_dependencies: ["filesystem", "python_exec"]
---

# Data Analysis Domain

## Core Principles

- Always inspect the data before analyzing: shape, types, nulls, sample rows
- Prefer pandas for tabular data, numpy for numerical operations
- Visualize before concluding — surprises hide in data

## ML Offload Check (MANDATORY)

Before ANY data task, check if it qualifies for ML offload via `clair_offload`:

| Task | Volume Threshold | Backend |
|------|-----------------|---------|
| Sentiment labeling | ≥3 rows | distilbert |
| Anomaly detection | ≥20 rows | isolation_forest |
| Text classification | ≥10 rows | sklearn |
| NER extraction | ≥5 rows | spacy |

For tasks below threshold or requiring nuanced reasoning, proceed with LLM.

## Analysis Workflow

1. Load and inspect (`df.head()`, `df.info()`, `df.describe()`)
2. Clean (nulls, types, outliers)
3. Analyze (aggregations, correlations)
4. Visualize (matplotlib/seaborn for files, recharts for artifacts)
5. Summarize findings in plain language

## Output

- Save charts to `/mnt/user-data/outputs/` as PNG
- Save processed CSVs to `/mnt/user-data/outputs/`
- Present all outputs with `present_files`
