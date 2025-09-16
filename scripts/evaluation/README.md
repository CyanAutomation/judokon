# Evaluation Scripts

This folder provides tools for measuring retrieval quality of the vector search system.

## Running the evaluator

From the project root:

```bash
node scripts/evaluation/evaluateRAG.js
```

The script reads `queries.json` and reports:

- **MRR@5** – Mean Reciprocal Rank of the expected document within the top five results.
- **Recall@3** – Fraction of queries whose expected document appears in the top three results.
- **Recall@5** – Fraction of queries whose expected document appears in the top five results.

Higher values indicate better retrieval accuracy.
