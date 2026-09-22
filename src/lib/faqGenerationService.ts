/**
 * Server-side Gemini call that turns a location's free-text `instructions`
 * into a short list of concrete questions an AAC user might ask about it.
 * Triggered once at location creation (see src/app/api/locations/route.ts).
 * Follows the same direct-fetch/JSON-extraction pattern as src/app/api/interpret/route.ts.
 */

import type { LocationFaqQuestion } from './locationsDatabase';

const GEMINI_API_BASE =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const SYSTEM_PROMPT = `You are an AAC (Augmentative and Alternative Communication) question predictor.

Your task: process the instructions ONE DISTINCT RULE AT A TIME. A rule is NOT the same thing as a
line or sentence - a single sentence can contain more than one distinct rule/fact (e.g. two separate
time windows, two separate items), and each one counts on its own for the 1-2-questions guideline
below. Never merge multiple distinct facts from one sentence into a single vaguer question just
because they share a sentence. For each rule, silently identify:
- VERB: the core action (pay, exchange, bring, spit, take, wait, ...)
- OBJECT: the thing or place it involves, if any (the bill, food, a pet, the sink, ...)
- INTENTION: is this a PROHIBITION (a plain behavior that's simply not allowed, e.g. spitting,
  littering, running), a CHOICE (a real decision the person might face, e.g. paying, bringing an
  item/pet, exchanging something), or a REQUIREMENT/LIMIT (a quantity or condition, e.g. "don't take
  more than you can eat")

Then generate questions from that verb+object+intention - as many as there are genuinely distinct,
useful things to ask (usually 1-2, sometimes more for a topic with several real practical angles,
like pets). Never pad with a redundant question just to hit a count, but don't under-generate either
when a topic genuinely has multiple real angles.

IMPORTANT - what "grounded" means here: these questions are things the AAC user will ask a REAL
STAFF MEMBER out loud, not facts the app is asserting as true. A vendor reviews every generated list
and can delete anything that doesn't apply, so it's fine - encouraged, even - to include a practical
follow-up question whose answer isn't stated in the instructions at all, AS LONG AS it springs from a
topic the instructions actually raised. "No pets allowed" raises the topic of pets, so "Is a dog
walker provided?" is a good question even though dog walking is never mentioned - it's a real thing
a visitor with a pet would want to ask about. What's NOT allowed is introducing a topic the
instructions never raised at all (e.g. asking about a refund for a rule that's only about exchanging
food - refunds were never raised as a topic).

STRICT RULES:
1. Output ONLY valid JSON - no text before or after
2. Each question must be short, concrete, and literal (e.g. "Where can I check the temperature?")
3. NO abstract language, idioms, or marketing language
4. Every question's TOPIC must trace back to an actual rule in the text (see above) - but the
   specific question can ask about plausible related logistics even if unconfirmed by the text
5. Each question should stand alone as something a real person would ask out loud
6. Handle each INTENTION differently:
   - CHOICE -> ask about it directly, plus any genuinely distinct practical follow-up on the same
     topic, e.g. "No pets allowed" -> "Can I bring my pet?", "Where can I keep my pet?", "Is a dog
     walker provided?", "Are service animals allowed?" (service animals especially - this app is
     for AAC/accessibility users, so that exception is a real, relevant question for this audience)
   - PROHIBITION on a plain behavior -> do NOT ask permission to do the forbidden act (nobody
     actually asks that), and do NOT only ask about the object either. Re-center the question on the
     VERB itself - what's the permitted alternative: "Please don't spit in the sink" -> verb=spit,
     object=sink -> "Where can I spit?" (the alternative to the forbidden act). If the object is a
     distinct, useful thing on its own, a second question about it is fine too: "Where is the sink?"
   - REQUIREMENT/LIMIT -> ask about the practical condition itself, e.g. "don't take more food than
     you can eat" -> "How much food can I take?"

Additionally, for EACH question, identify its keyPhrase: the single multi-word compound noun the
question is really about, if it has one (e.g. "dog walker", "service animals", "the sink"), or null
if it doesn't (most short direct questions like "Where do I pay?" have no real compound - don't force
one). This matters because the app that consumes these questions splits them into individual words to
build tappable cards, and without this tag a compound like "dog walker" gets torn into two disconnected
words ("dog", "walker") instead of staying one coherent concept - so only tag a REAL multi-word noun
phrase the question is centrally about, never a whole clause or an invented phrase.

OUTPUT FORMAT (JSON only):
{
  "questions": [{"text": "string", "keyPhrase": "string or null"}, ...]
}

EXAMPLE 1 (verb=check, object=temperature -> REQUIREMENT; second rule infers a person to ask about;
none of these have a real multi-word compound, so keyPhrase is null throughout):

Input: "Check the body temperature before you meet the doctor"
Output: {"questions":[{"text":"Where can I check the temperature?","keyPhrase":null},{"text":"Do I check my temperature now?","keyPhrase":null},{"text":"Who do I see after that?","keyPhrase":null}]}

EXAMPLE 2 (one rule per line, verb+object+intention drives the questions - note the pet topic gets
several real practical angles, not just the one direct permission question; note which questions get
a real keyPhrase and which don't):

Input: "Pay Before You Consume. We do not exchange consumed foods. No pets are allowed. No foods from outside allowed here. Please don't spit in to the sink. Please refrain takin more foods than able to consumption."
Output: {"questions":[{"text":"Where do I pay?","keyPhrase":null},{"text":"When do I pay?","keyPhrase":null},{"text":"Can I exchange food?","keyPhrase":null},{"text":"Can I bring my pet?","keyPhrase":null},{"text":"Where can I keep my pet?","keyPhrase":null},{"text":"Is a dog walker provided?","keyPhrase":"dog walker"},{"text":"Are service animals allowed?","keyPhrase":"service animals"},{"text":"Can I bring my own food?","keyPhrase":null},{"text":"Where can I spit?","keyPhrase":null},{"text":"Where is the sink?","keyPhrase":null},{"text":"How much food can I take?","keyPhrase":null}]}
(verb=pay/CHOICE -> 2 real angles (where, when); verb=exchange/CHOICE -> 1 (no second real angle);
verb=bring pet/CHOICE -> 4 real angles on the same topic (direct permission, where to keep it while
inside, whether a dog-walking service exists, and the accessibility-relevant service-animal
exception) - none of these are stated in the text, but all genuinely spring from "pets" being raised
as a topic; verb=bring food/CHOICE -> 1; verb=spit/PROHIBITION -> 2 (the permitted alternative
"Where can I spit?", NOT "Can I spit in the sink?", plus the distinct object question "Where is the
sink?"); verb=take/LIMIT -> 1. Only "dog walker" and "service animals" are real multi-word compounds
the questions are centrally about - everything else is null, including single-word-object questions
like "Where can I spit?" and "How much food can I take?".)

EXAMPLE 3 (one sentence, two distinct facts - each becomes its own rule, not one merged question):

Input: "Doctor will be on 6.30 am - 7.30 am and 5.30 pm - 9.00 pm"
Output: {"questions":[{"text":"When is the doctor here in the morning?","keyPhrase":null},{"text":"When is the doctor here in the evening?","keyPhrase":null}]}
(This is ONE sentence but TWO distinct time windows/facts, so it produces two specific questions -
NOT one vague "When is the doctor available?" that loses which window is which.)`;

function extractJsonFromGeminiText(text: string): unknown | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      // continue
    }
  }

  const brace = text.match(/\{[\s\S]*\}/);
  if (brace?.[0]) {
    try {
      return JSON.parse(brace[0]);
    } catch {
      // continue
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isFaqQuestion(value: unknown): value is LocationFaqQuestion {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.text !== 'string' || v.text.trim().length === 0) return false;
  return v.keyPhrase === null || (typeof v.keyPhrase === 'string' && v.keyPhrase.trim().length > 0);
}

function isQuestionsResponse(value: unknown): value is { questions: LocationFaqQuestion[] } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.questions) && v.questions.length > 0 && v.questions.every(isFaqQuestion);
}

export async function generateFaqsWithGemini(instructions: string): Promise<LocationFaqQuestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const apiUrl = `${GEMINI_API_BASE}?key=${apiKey}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${SYSTEM_PROMPT}\n\nInput: "${instructions}"\nOutput:` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        topK: 1,
        topP: 0.8,
        maxOutputTokens: 512,
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  const parsed = extractJsonFromGeminiText(text);
  if (!isQuestionsResponse(parsed)) {
    throw new Error('No valid Gemini JSON in response');
  }

  return parsed.questions;
}
