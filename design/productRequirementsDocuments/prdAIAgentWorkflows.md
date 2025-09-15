# PRD: AI Agent Workflows

## TL;DR

This PRD defines comprehensive workflows and standards for AI agents working with the JU-DO-KON! project, focusing on RAG (Retrieval-Augmented Generation) usage patterns, vector search optimization, and PRD creation guidelines. It consolidates agent interaction patterns, query optimization techniques, and quality standards to ensure AI agents provide accurate, efficient, and valuable assistance. These workflows enable agents to leverage the project's vector database effectively while maintaining high standards for code generation and documentation.

---

## Problem Statement

AI agents working with the JU-DO-KON! project lack unified workflows and optimization strategies, leading to inefficient query patterns, missed context opportunities, and inconsistent output quality. Without clear guidelines for RAG usage, vector search optimization, and PRD creation standards, agents spend excessive time on manual exploration instead of leveraging the comprehensive knowledge base. This results in slower response times, reduced accuracy, and failure to capitalize on the project's rich documentation ecosystem.

---

## Goals

- **Efficiency**: Maximize RAG usage to achieve 15x speed improvements over manual exploration
- **Accuracy**: Maintain 62.5%+ success rate for finding correct sources through optimized queries
- **Consistency**: Establish standardized workflows for common agent tasks and interactions
- **Quality**: Ensure AI-generated content meets project standards for documentation and code
- **Knowledge Leverage**: Enable full utilization of the 16,000+ indexed chunks in the vector database
- **Workflow Optimization**: Provide clear decision trees and patterns for different query types

---

## User Stories

- As an AI agent, I want clear RAG usage guidelines so that I can quickly find relevant context
- As an AI agent, I want optimized query patterns so that I can maximize search accuracy
- As an AI agent, I want PRD creation standards so that I can generate compliant documentation
- As a developer using AI assistance, I want consistent response quality regardless of the query type
- As a project maintainer, I want AI agents to follow established patterns and contribute quality content

---

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                         |
| -------- | --------------------------- | ------------------------------------------------------------------- |
| P1       | RAG Query Decision Tree     | Automated decision-making for when and how to use vector search     |
| P1       | Query Optimization Patterns | High-success query templates and techniques                         |
| P1       | Vector Search Integration   | Standardized methods for accessing and filtering the knowledge base |
| P1       | PRD Creation Standards      | Guidelines for generating compliant Product Requirements Documents  |
| P2       | Performance Monitoring      | Tracking and optimization of query effectiveness                    |
| P2       | Context Integration         | Patterns for combining RAG results with other information sources   |
| P3       | Advanced Query Techniques   | Specialized approaches for complex scenarios                        |

---

## Functional Requirements

### 1. RAG Query Decision Tree (P1)

**Core Decision Logic:**

```text
User query contains "How", "Why", "What", "Where", "Which"? → USE RAG
User requests examples or references? → USE RAG
User mentions unfamiliar terms? → USE RAG
When in doubt? → USE RAG FIRST
```

**Implementation Requirements:**

- Default to RAG for any informational queries
- Use RAG before manual file exploration
- Query RAG when encountering unknown terminology
- Always attempt RAG for architecture and design questions

**Success Metrics:**

- 2-second average query response time
- 62.5%+ success rate for finding correct sources
- 15x speed improvement over manual exploration

### 2. Query Optimization Patterns (P1)

**High-Success Query Templates:**

**For Implementation Questions:**

- Include file types: "JSON structure", "CSS styling", "JavaScript function"
- Add context: "configuration", "data format", "UI component"
- Use technical terms: "implementation", "validation", "guidelines"

**Examples:**

```text
❌ Poor: "How do I add tooltips?"
✅ Good: "tooltip implementation data structure JSON format"

❌ Poor: "CSS styling help"
✅ Good: "navigation bar button transition duration styling"

❌ Poor: "Battle system logic"
✅ Good: "classic battle mode game timer phases scoreboard"
```

**Category-Specific Optimization:**

**Design Questions:**

- Use product terms: "PRD", "design guidelines", "user experience"
- Include specific features: "tooltip system", "battle mode", "navigation"
- Add context: "character design", "UI theme", "accessibility"

**Architecture Questions:**

- Include technical terms: "component factory", "module structure", "API design"
- Add system context: "state management", "event handling", "data flow"

**Performance Targets:**

- Strong matches (≥0.6 similarity score) for optimized queries
- 95% accuracy for design document retrieval
- 85% accuracy for architectural information

### 3. Vector Search Integration (P1)

**Core Integration Methods:**

```javascript
import vectorSearch from "../../src/helpers/vectorSearch/index.js";

// Basic query with semantic expansion
const vec = await vectorSearch.expandQueryWithSynonyms("tooltip implementation data structure");
const matches = await vectorSearch.findMatches(vec, 5);

// Filtered query for specific content types
const prdMatches = await vectorSearch.findMatches(vec, 8, ["prd", "design-doc"]);

// Test-specific search
const testMatches = await vectorSearch.findMatches(vec, 5, ["test", "function"]);
```

**Tag Filtering System:**

- **Construct type**: `function`, `class`, `variable`, `test`
- **Role**: `component`, `config`, `utility`, `test`
- **Source/topic**: `prd`, `data`, `design-doc`, `judoka-data`, `tooltip`

**Best Practices:**

- Always use semantic expansion for better synonym matching
- Apply appropriate tag filters to narrow results
- Combine multiple tag types for precise targeting
- Use exact quotes for literal term matching (0.1 bonus score)

**Data Format Requirements:**

```json
{
  "id": "unique-identifier",
  "text": "content-snippet",
  "qaContext": "one-sentence-summary",
  "embedding": [0.12, -0.04, 0.33],
  "source": "content-origin",
  "tags": ["category", "type", "intent"],
  "version": 1
}
```

### 4. PRD Creation Standards (P1)

**Required PRD Structure:**

- **Title/Overview (TL;DR)**: Brief feature summary and purpose
- **Problem Statement**: Clear user problem or gap being addressed
- **Goals/Success Metrics**: Quantitative and qualitative objectives
- **User Stories**: Persona-driven scenarios with "As a [user], I want [action] so that [outcome]" format
- **Prioritized Functional Requirements**: Table with Priority, Feature, Description columns
- **Acceptance Criteria**: Specific, testable conditions for each requirement
- **Non-Functional Requirements**: Performance, accessibility, UX considerations
- **Dependencies and Open Questions**: External dependencies and pending decisions

**Functional Requirements Table Format:**

```markdown
| Priority | Feature           | Description                                       |
| -------- | ----------------- | ------------------------------------------------- |
| P1       | Core Feature Name | Clear description of must-have functionality      |
| P2       | Important Feature | Description of important but not critical feature |
| P3       | Nice-to-Have      | Description of optional enhancement               |
```

**Acceptance Criteria Standards:**

- One testable criterion per requirement or scenario
- Measurable terms with specific numbers or UI actions
- Coverage of both success and failure cases
- Present-tense imperative format (e.g., "Cards are revealed...", "Player can quit...")

**Quality Requirements:**

- All P1/P2 features must have corresponding acceptance criteria
- Use precise wording with no vague terms
- Reference related PRDs for dependencies
- Maintain consistency with existing PRD formatting

### 5. Performance Monitoring (P2)

**Query Performance Metrics:**

- Response time tracking for different query types
- Success rate monitoring for context retrieval
- Accuracy assessment for generated recommendations

**Quality Assessment:**

- Regular evaluation of RAG query effectiveness
- Tracking of false positive and false negative rates
- Monitoring of user satisfaction with AI responses

**Optimization Triggers:**

- Automated identification of low-performing query patterns
- Alerts for degraded search accuracy
- Recommendations for query refinement

### 6. Context Integration (P2)

**Multi-Source Information Combining:**

- RAG results as primary context source
- Targeted file reading for specific details
- Code inspection for implementation verification
- Cross-referencing between related documents

**Workflow Pattern:**

1. Primary RAG query for broad context
2. Secondary queries for specific details if needed
3. Targeted file reading only when RAG results insufficient
4. Synthesis of information from multiple sources

**Provenance Requirements:**

- Source tracking for all information used
- Confidence level indication for recommendations
- Clear attribution to original documents

---

## Acceptance Criteria

- [ ] AI agents default to RAG for all informational queries
- [ ] Query optimization patterns achieve target success rates
- [ ] Vector search integration follows established tag filtering standards
- [ ] Generated PRDs include all required sections and formatting
- [ ] Performance monitoring tracks and improves query effectiveness
- [ ] Context integration workflows minimize manual exploration time
- [ ] All generated content includes proper source attribution
- [ ] Workflow decision trees are programmatically implementable
- [ ] Documentation provides clear examples for all patterns
- [ ] Integration with existing project standards is seamless

---

## Non-Functional Requirements

**Performance:**

- RAG queries complete in under 2 seconds average
- Strong match retrieval (≥0.6 similarity) for optimized queries
- 15x speed improvement over manual exploration approaches

**Accuracy:**

- 62.5%+ success rate for finding correct sources
- 95% accuracy for design document queries
- 85% accuracy for architectural information retrieval

**Reliability:**

- Consistent query patterns across different agent instances
- Reproducible results for similar query types
- Graceful degradation when vector search unavailable

**Maintainability:**

- Workflows easily updated as project evolves
- Clear documentation for adding new query patterns
- Integration with existing development tools and standards

---

## Edge Cases / Failure States

**RAG Query Failures:**

- Fallback to targeted file search when no relevant matches found
- Alternative query formulations for poor initial results
- Manual exploration as last resort with time tracking

**Vector Database Unavailability:**

- Lexical fallback search against offline corpus
- Clear indication of degraded service quality
- Automatic retry mechanisms with exponential backoff

**Quality Degradation:**

- Detection of declining query effectiveness
- Automated alerts for performance issues
- Remediation workflows for common failure patterns

---

## Dependencies and Open Questions

**Dependencies:**

- Vector database infrastructure and embeddings
- Search indexing system for lexical fallback
- Integration with existing development workflows
- Access to project documentation and code repositories

**Open Questions:**

- What is the optimal balance between RAG usage and direct file access?
- How frequently should query patterns be evaluated and updated?
- What level of automation is appropriate for PRD generation?
- How to handle conflicts between RAG results and current code state?

---

## Tasks

- [x] Consolidate existing agent workflow documentation into unified PRD
- [ ] Implement automated query pattern evaluation system
- [ ] Create agent workflow templates for common scenarios
- [ ] Develop performance monitoring dashboard for RAG usage
- [ ] Establish quality metrics for AI-generated content
- [ ] Create integration guide for new agent implementations
- [ ] Set up automated workflow compliance checking

---

## Source Files Consolidated

This PRD consolidates content from the following design/agentWorkflows files:

- `ragUsageGuide.md` - RAG usage patterns, decision trees, and optimization techniques
- `exampleVectorQueries.md` - Vector search examples, embedding formats, and query templates
- `RAG_QUERY_GUIDE.md` - Tag filtering systems and advanced query techniques
- `prdRulesForAgents.md` - PRD creation standards and quality requirements
