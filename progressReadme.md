# Design Document Analysis and Recommendations

This document outlines the analysis of the `/design/` directory and provides recommendations for consolidating design documents into a single source of truth within the Product Requirements Documents (PRDs).

## Analysis

The `/design/` directory contains a mix of documents, including:

-   High-level design and architecture documents.
-   Code and documentation standards.
-   Character design documents.
-   Technical audits and testing notes.
-   Specific feature design documents.

Many of these documents are candidates for consolidation into PRDs to create a single source of truth.

## Recommendations

### 1. Consolidate Agent and Code Standards into a new PRD

The files in `design/agentWorkflows` and `design/codeStandards` define the standards for code, documentation, testing, and AI agent interaction. These should be consolidated into a single new PRD: `design/productRequirementsDocuments/prdAgentAndCodeStandards.md`.

**Files to consolidate:**

-   `design/agentWorkflows/exampleVectorQueries.md`
-   `design/agentWorkflows/ragUsageGuide.md`
-   `design/agentWorkflows/RAG_QUERY_GUIDE.md`
-   `design/codeStandards/codeJSDocStandards.md`
-   `design/codeStandards/codeNamingPatterns.md`
-   `design/codeStandards/codePseudocodeStandards.md`
-   `design/codeStandards/codeUIDesignStandards.md`
-   `design/codeStandards/evaluatingPlaywrightTests.md`
-   `design/codeStandards/evaluatingUnitTests.md`
-   `design/codeStandards/prdRulesForAgents.md`
-   `design/codeStandards/settingsPageDesignGuidelines.md`
-   `design/codeStandards/testNamingStandards.md`

### 2. Create a new PRD for Character Design

The files in `design/characterDesign` describe the character "KG". This is a perfect candidate for a new PRD: `design/productRequirementsDocuments/prdCharacterDesign.md`.

**Files to consolidate:**

-   `design/characterDesign/kgCharacterDesignDocument.md`
-   `design/characterDesign/kgCharacterPromptSheet.md`

### 3. Merge Battle CLI Document

The document `design/battleCLI-legacy-alignment.md` contains updates to the Battle CLI. This document should be merged into the existing `design/productRequirementsDocuments/prdBattleCLI.md`.

### 4. Create a new PRD for UI Theme

The document `design/retroThemeContrast.md` describes a color palette and theme. This suggests the need for a new PRD to centralize all UI theme and styling guidelines: `design/productRequirementsDocuments/prdUITheme.md`.

### 5. Relocate Technical Documents

The following documents are highly technical and are better suited for a general documentation folder. It is recommended to move them to a new `docs/technical/` directory.

-   `design/architecture.md`
-   `design/battleMarkup.md`
-   `design/eventNamingAudit.md`
-   `design/stateHandlerAudit.md`
-   `design/testing/classicBattleTesting.md`
-   `design/dataSchemas/README.md`

## Missing PRDs

Based on the analysis, the following PRDs are likely missing and should be created:

-   **prdAgentAndCodeStandards.md**: As recommended above.
-   **prdCharacterDesign.md**: As recommended above.
-   **prdUITheme.md**: As recommended above.

## Next Steps

1.  Review and approve the recommendations in this document.
2.  Create the new PRDs and consolidate the content as described above.
3.  Merge the Battle CLI document.
4.  Move the technical documents to the new `docs/technical/` directory.
