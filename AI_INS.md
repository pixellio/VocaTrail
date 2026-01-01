Final Refined Prompt for Cursor (AAC + Gemini AI)
Context

I am building a prototype-level AAC (Augmentative and Alternative Communication) application.
The app allows AAC users to create and manage a personal vocabulary board made of cards (symbols + simple text).
Users communicate by selecting and arranging cards into meaningful sentences.

I want to experiment with AI-assisted semantic interpretation for complex real-world phrases (e.g., promotions), using Google Gemini API as the LLM.

Example system phrase:

“buy one get one free”

AAC users typically cannot process this as a single abstract sentence, so the system must convert it into concrete, visual, AAC-friendly concepts.

Goal

Use Google Gemini AI to:

Interpret the semantic meaning of a phrase

Convert it into structured, AAC-safe concepts

Generate a temporary, dynamic vocabulary board that helps the AAC user construct their own request, such as:

“I want to buy 2, pay for 1”

Critical LLM Usage Rules (Very Important)

❗ The LLM must NOT:

Generate free-form AAC sentences

Invent vocabulary unrelated to the user’s board

Produce complex grammar or abstract phrasing

Directly control UI behavior

✅ The LLM must ONLY:

Perform semantic decomposition

Output structured, deterministic JSON

Use simple, concrete concepts

The AAC system remains fully in control of:

Card creation

Symbol mapping

UI rendering

User interaction

User Understanding Levels (Design Constraint)
Level 1 – Conceptual understanding (most common)

User understands:

Two items

Pay for one

Second item is free

Demonstrated by:

Selecting two item cards

Selecting “pay” once

Selecting “free”

Level 2 – Symbol understanding

User understands when shown:

🧍🧍 (two items)

💰 → ❌ (no payment)

Required System Flow
Step 1: Load AAC User Vocabulary

Load user’s persisted vocabulary board from DB

Each card contains:

id

label

symbol

category (action, quantity, item, money, modifier)

Step 2: Gemini Semantic Interpretation (LLM Step)

Send Gemini only the system phrase, with a strict instruction:

“Convert this phrase into AAC-compatible semantic concepts.
Use concrete meanings. Avoid idioms.
Output structured JSON only.”

Example Gemini Input:
Phrase: "buy one get one free"
Task: Decompose into concrete AAC concepts suitable for symbol-based communication.

Expected Gemini Output:
{
  "intent": "purchase",
  "concepts": [
    { "type": "action", "value": "buy" },
    { "type": "quantity", "value": 2 },
    { "type": "payment", "value": "pay_for_one" },
    { "type": "benefit", "value": "second_item_free" }
  ]
}


❗ Gemini must never generate full sentences.

Step 3: Concept-to-Card Mapping (Non-LLM Logic)

For each concept:

Search user’s existing vocabulary board

If found → reuse existing card

If missing → create temporary AAC card

Temporary cards must:

Be visually concrete

Use simple text (e.g., “2 items”, “Pay for 1”)

Be marked temporary = true

Not saved permanently unless approved later

Step 4: Dynamic Context Board Generation

When user clicks a location/context icon (e.g., store):

Create a temporary dynamic board

Inherit:

User’s original vocabulary

Context-relevant cards

Promotion-related temporary cards

Keep board size minimal to reduce cognitive load

Step 5: AAC Sentence Construction

Allow the user to arrange cards into expressions like:

“I want”

“Buy”

“2 items”

“Pay for 1”

Resulting meaning:

“I want to buy two items and pay for one.”

Gemini Safety & Prompting Guidelines

Use low temperature for determinism

Enforce JSON schema validation

Reject responses that:

Contain sentences

Contain abstract language

Contain metaphors or idioms

Log Gemini output for explainability

Expected Output from AI Agent

Gemini prompt template

JSON schema for semantic output

Pseudocode for:

LLM call

Concept mapping

Temporary board generation

UX considerations for AAC users

Key Principle

AI interprets meaning.
AAC system controls expression.
User controls communication.