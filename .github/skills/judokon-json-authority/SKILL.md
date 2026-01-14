---
name: judokon-json-authority
description: Creates, modifies, and validates JU-DO-KON! JSON files while preserving schema consistency and downstream compatibility.
---

# Skill Instructions

This skill treats JSON as executable configuration.

## What this skill helps accomplish
- Maintain consistent data contracts
- Prevent silent breakage across modules
- Improve predictability of AI-generated data changes

## When to use this skill
- Editing judoka.json or battle state files
- Adding new metadata or configuration
- Modifying tooltips or content files

## Rules for JSON changes
1. **Schema stability first**
2. **Additive changes preferred**
3. **Explicit defaults for new fields**
4. **Identify impacted consumers**

## Required behaviour
- Explain why a change is safe
- Call out any required code updates
- Suggest validation or tests if needed

## Expected output
- Well-structured JSON
- Clear explanation of changes
- Impact analysis