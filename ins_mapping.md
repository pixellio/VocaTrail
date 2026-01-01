Promotion → Concept Mapping Library

AAC-Safe Instruction & Implementation Guide

Purpose

This document defines how to implement a Promotion → Concept Mapping Library for an AAC (Augmentative and Alternative Communication) application.

The goal is to convert real-world promotional phrases into AAC-friendly, concrete semantic concepts that can be represented as symbol-based cards.

This layer exists to:

Reduce reliance on LLMs (Google Gemini)

Ensure consistency and predictability for AAC users

Support low cognitive load and explainability

Core Principle

Do not map words.
Map meaning.
Meaning must be concrete, countable, and visual.

What This Library Is (and Is Not)
✅ This library IS:

A controlled semantic dictionary

Deterministic and predictable

Language-agnostic at the concept level

Safe for AAC cognition

❌ This library IS NOT:

A sentence generator

A marketing text interpreter

A replacement for the AAC user’s expression

A free-form NLP system

Where This Fits in the System
Processing Order (Mandatory)

Try Promotion → Concept Mapping Library

If no match → call Gemini AI

Validate Gemini output

Convert concepts into AAC cards

Generate temporary AAC board

🚫 Never call Gemini first for known promotions.

Data Model

Each promotion mapping must follow this structure:

{
  "promotion_id": "BOGO",
  "patterns": [
    "buy one get one free",
    "buy 1 get 1 free",
    "bogo"
  ],
  "concepts": [
    { "type": "action", "value": "buy" },
    { "type": "quantity", "value": 2 },
    { "type": "payment", "value": "pay_for_one" },
    { "type": "benefit", "value": "second_item_free" }
  ],
  "aac_priority": "high",
  "visual_hints": [
    "two_items",
    "pay_once",
    "free_item"
  ]
}

Allowed Concept Types

Only the following concept types are allowed:

Type	Examples
action	buy, get, pay
quantity	1, 2, 3
payment	pay_for_one, pay_less
benefit	free, discount
item	item, product
modifier	second, extra

🚫 Do not introduce new types without review.

AAC Safety Rules (Critical)
Rule 1: Avoid Abstract Language

❌ “Get one free”
✅ “Second item free”

Rule 2: Quantities Must Be Explicit

❌ “Extra”
✅ quantity: 2

Rule 3: No Full Sentences

❌ "Buy two items and get one free"
✅ Separate concepts:

buy

quantity: 2

free item

Rule 4: Concepts Must Be Visualizable

If a concept cannot be shown as:

a symbol

a number

a simple icon

👉 It does not belong in the mapping.

Example Mappings
Buy One Get One Free
{
  "promotion_id": "BOGO",
  "patterns": ["buy one get one free"],
  "concepts": [
    { "type": "action", "value": "buy" },
    { "type": "quantity", "value": 2 },
    { "type": "payment", "value": "pay_for_one" },
    { "type": "benefit", "value": "second_item_free" }
  ]
}

50% Off
{
  "promotion_id": "HALF_PRICE",
  "patterns": ["50% off", "half price"],
  "concepts": [
    { "type": "benefit", "value": "discount" },
    { "type": "modifier", "value": "half_price" }
  ]
}

3 for the Price of 2
{
  "promotion_id": "THREE_FOR_TWO",
  "patterns": ["3 for 2", "three for the price of two"],
  "concepts": [
    { "type": "quantity", "value": 3 },
    { "type": "payment", "value": "pay_for_two" }
  ]
}

Matching Logic (Implementation Guidance)
Step 1: Normalize Input

Lowercase

Trim spaces

Remove punctuation

Step 2: Match Patterns

Exact match first

Then fuzzy match (edit distance / contains)

Step 3: Confidence Threshold

If confidence < threshold → do NOT use mapping

Fall back to Gemini

Interaction with Gemini AI
When Gemini Is Allowed

Promotion phrase is unknown

Phrase is ambiguous

No mapping found

Gemini Output Requirements

Gemini must output only structured JSON:

{
  "intent": "purchase",
  "concepts": [
    { "type": "quantity", "value": 2 },
    { "type": "payment", "value": "pay_for_one" }
  ]
}


🚫 Reject Gemini responses that:

Contain sentences

Contain idioms

Contain emotional language

Temporary AAC Card Generation

For each concept:

Try to map to existing user vocabulary

If missing:

Create temporary card

Mark temporary: true

Do not persist automatically

Example temporary card:

{
  "label": "Pay for 1",
  "category": "payment",
  "temporary": true
}

Review & Ethics

All new mappings must be:

Reviewed by developer

Ideally reviewed by AAC specialist

Never auto-persist Gemini-generated mappings

Log mapping source (library vs gemini)

Key Reminder

AAC users are expressing intent, not repeating marketing language.
This library exists to protect that intent.

Next Steps (Optional Enhancements)

Add localization support

Add therapist approval workflow

Add confidence scoring

Add analytics on failed mappings