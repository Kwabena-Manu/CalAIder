// prompt_ai.js
import { GUIDANCE_PROMPT } from "./guidancePrompt.js";
import { EVENT_SCHEMA, getSession, prewarmModel } from "./utils.js";

// --- Keeps your download monitor support for model loading feedback ---
let _monitorHandlers = null;
export function attachDownloadMonitor(h) { _monitorHandlers = h; }

// --- Checks for the model's availability and preloads it ---
export async function ensureModelReady() {
    await prewarmModel(_monitorHandlers);
}

/**
 * Extracts event info (title, date, time, place, etc.) from a web page’s text.
 * @param {string} pageText - The text content pulled from a page.
 * @returns {Promise<{events: Array<{
 *   title: string, startDate: string, startTime: string|null,
 *   endDate: string|null, endTime: string|null, timezone: string|null,
 *   venue: string|null, address: string|null, city: string|null, country: string|null,
 *   url: string|null, notes: string|null
 * }>>}>}
 */
export async function extractEvents(pageText) {
    if (typeof pageText !== "string" || !pageText.trim()) {
        return { events: [] };
    }

    // --- Get an existing (cached) model session ---
    const session = await getSession();

    const messages = [
        { role: "system", content: GUIDANCE_PROMPT },
        { role: "user", content: `Extract events from the following text:\n\n${pageText}` }
    ];

    let raw;
    try {
        // --- Call the local model to generate JSON per EVENT_SCHEMA ---
        raw = await session.prompt(messages, {
            responseConstraint: EVENT_SCHEMA,
            // Keeps the schema enforced without injecting it into the model’s input.
            omitResponseConstraintInput: true
        });
    } catch (e) {
        // --- If model fails to return valid JSON, return empty result ---
        console.warn("[prompt_ai] prompt() error:", e);
        return { events: [] };
    }

    try {
        const data = JSON.parse(raw);
        // --- Sanity check: ensure result matches expected structure ---
        if (!data || typeof data !== "object" || !Array.isArray(data.events)) {
            return { events: [] };
        }
        return data;
    } catch (e) {
        console.warn("[prompt_ai] JSON parse error:", e, "raw=", raw);
        return { events: [] };
    }
}

/**
 * Combines warm-up and extraction in one call.
 * Equivalent to: await ensureModelReady(); then await extractEvents(text);
 */
export async function extractEventsReady(pageText) {
    await ensureModelReady();
    return extractEvents(pageText);
}

// --- Example usage ---
// import { extractEvents, ensureModelReady } from './prompt_ai.js';
// await ensureModelReady();
// const data = await extractEvents(myPageText);
// console.log(data);
