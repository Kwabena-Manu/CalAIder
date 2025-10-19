import { GUIDANCE_PROMPT } from "./guidancePrompt.js";
import { EVENT_SCHEMA, getSession } from "./utils.js";


let _monitorHandlers = null;
export function attachDownloadMonitor(h) { _monitorHandlers = h; }

// Checks for the model's availability
export async function ensureModelReady() {
    await getSession(_monitorHandlers);
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
    if (typeof pageText !== 'string' || !pageText.trim()) {
        return { events: [] };
    }

    const session = await getSession();

    const messages = [
        { role: 'system', content: GUIDANCE_PROMPT },
        { role: 'user', content: `Extract events from the following text:\n\n${pageText}` }
    ];

    let raw;
    try {
        raw = await session.prompt(messages, {
            responseConstraint: EVENT_SCHEMA,
            // Keeps the schema enforced without injecting it into the model’s input.
            omitResponseConstraintInput: true
        });
    } catch (e) {
        // If the model fails to return valid JSON, just return an empty result
        console.warn('[prompt_ai] prompt() error:', e);
        return { events: [] };
    }

    try {
        const data = JSON.parse(raw);
        // Checking if data is not in the expected format
        if (!data || typeof data !== 'object' || !Array.isArray(data.events)) {
            return { events: [] };
        }
        return data;
    } catch (e) {
        console.warn('[prompt_ai] JSON parse error:', e, 'raw=', raw);
        return { events: [] };
    }
}

/**
 * Combines warm-up and extraction in one call.
 */
export async function extractEventsReady(pageText) {
    await ensureModelReady();
    return extractEvents(pageText);
}

// Basic wrapper around Chrome’s Prompt API for extracting events.
// Example:
// import { extractEvents, ensureModelReady } from './prompt_ai.js';
// await ensureModelReady();
// const data = await extractEvents(myPageText);
// console.log(data); // -> { events: [ { title, startDate, startTime, endDate, endTime, timezone, venue, address, city, country, url, notes } ] }
