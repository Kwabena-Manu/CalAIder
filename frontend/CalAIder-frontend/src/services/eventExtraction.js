// eventExtraction.js
import { EVENT_SCHEMA } from './schema';

// --- Original variable for session caching ---
let _sessionPromise = null;
let _session = null;
let _warmupStatus = null; // Track warmup status across tab sessions

// --- Helper to check if Prompt API is available ---
export function promptApiSupported() {
    return typeof globalThis.LanguageModel !== "undefined";
}

// --- Get current warmup status ---
export function getWarmupStatus() {
    return _warmupStatus;
}

// --- Session creator for Chrome's LanguageModel API ---
// Returns a single cached session per tab.
// Also supports optional download progress monitoring.
export async function getSession(monitorHandlers) {
    if (_session) {
        console.log("[prompt_ai] Reusing existing model session");
        return _session;
    }
    if (_sessionPromise) {
        console.log("[prompt_ai] Waiting for session creation in progress");
        return _sessionPromise;
    }

    _sessionPromise = (async () => {
        if (!promptApiSupported()) {
            const err = new Error("Chrome Prompt API is unavailable on this device/browser.");
            err.code = "UNAVAILABLE";
            throw err;
        }

        const availability = await LanguageModel.availability();
        if (availability === "unavailable") {
            const err = new Error("Chrome Prompt API is unavailable on this device/browser.");
            err.code = "UNAVAILABLE";
            throw err;
        }

        const monitor = monitorHandlers
            ? (m) => {
                let started = false;
                m.addEventListener("downloadprogress", (e) => {
                    if (!started) {
                        started = true;
                        monitorHandlers.onStart?.();
                    }
                    monitorHandlers.onProgress?.(e.loaded); // 0..1 progress
                    if (e.loaded >= 1) monitorHandlers.onDone?.();
                });
            }
            : undefined;

        console.log("[prompt_ai] Creating new model session...");

        // --- Create the model session once ---
        // The session stays alive for the lifetime of the tab.
        _session = await LanguageModel.create({
            expectedInputs: [{ type: "text", languages: ["en"] }],
            expectedOutputs: [{ type: "text", languages: ["en"] }],
            temperature: 0.1, // Lower temperature for more deterministic outputs
            topK: 1, // Reduce to 1 for fastest inference
            monitor,
            fastInference: true, // Enable fast inference mode
        });

        console.log("[prompt_ai] Model session created successfully");

        return _session;
    })();

    return _sessionPromise;
}

// --- Preload / prewarm model to download it early ---
// This is called before first use to hide the long initial load time.
export async function prewarmModel(monitorHandlers) {
    // If already warm or warming, skip
    if (_warmupStatus === 'ready' || _warmupStatus === 'warming') {
        return _sessionPromise;
    }

    _warmupStatus = 'warming';
    try {
        const session = await getSession({
            onStart: () => {
                _warmupStatus = 'warming';
                monitorHandlers?.onStart?.();
            },
            onProgress: (p) => {
                monitorHandlers?.onProgress?.(p);
            },
            onDone: () => {
                _warmupStatus = 'ready';
                monitorHandlers?.onDone?.();
            }
        });
        _warmupStatus = 'ready';
        return session;
    } catch (e) {
        _warmupStatus = 'failed';
        throw e;
    }
}

// --- Reset the session manually (rarely needed) ---
export function resetSession() {
    _session = null;
    _sessionPromise = null;
}

/**
 * Extracts event info (title, date, time, place, etc.) from a web page's text.
 * @param {string} pageText - The text content pulled from a page.
 * @returns {Promise<{events: Array<{
 *   title: string, startDate: string, startTime: string|null,
 *   endDate: string|null, endTime: string|null, timezone: string|null,
 *   venue: string|null, address: string|null, city: string|null, country: string|null,
 *   url: string|null, notes: string|null
 * }>>}>}
 */
export async function extractEvents(pageText, monitorHandlers = null) {
    if (typeof pageText !== "string" || !pageText.trim()) {
        return { events: [] };
    }
    // If running inside the extension and a background worker exists, route the prompt
    // through the background service worker so the LanguageModel session can be cached
    // in one long-lived context (avoids re-instantiation on popup/content loads).
    // Route prompts through the background worker ONLY when running in a
    // document context (popup or content script). In a background/service
    // worker `window` is undefined; routing there would cause the worker to
    // re-send messages to itself and drop the prompt. Ensure we only use
    // chrome.runtime.sendMessage routing when `window` exists.
    if (typeof window !== 'undefined' && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        // Use a request/response via chrome.runtime messages with a unique requestId.
        const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

        console.log("[prompt_ai] Routing prompt via background", { requestId });
        return new Promise((resolve, reject) => {
            // Listen for progress / result messages for this request
            const onMessage = (msg, sender) => {
                try {
                    if (!msg || msg.requestId !== requestId) return;
                    if (msg.type === 'PROMPT_PROGRESS') {
                        // msg.progress is 0..1
                        monitorHandlers?.onStart?.();
                        monitorHandlers?.onProgress?.(msg.progress);
                        if (msg.progress >= 1) monitorHandlers?.onDone?.();
                        return;
                    }
                    if (msg.type === 'PROMPT_RESULT') {
                        chrome.runtime.onMessage.removeListener(onMessage);
                        if (msg.error) return resolve({ events: [] });
                        // msg.result is expected to be an object { events: [...] }
                        return resolve(msg.result || { events: [] });
                    }
                } catch (e) {
                    // ignore handler errors
                }
            };

            chrome.runtime.onMessage.addListener(onMessage);

            // Send the request to background worker and also provide a callback to
            // receive the final sendResponse result (background uses sendResponse()).
            // We keep the onMessage listener to receive progress updates.
            try {
                chrome.runtime.sendMessage({ type: 'PROMPT_EXTRACT', requestId, text: pageText }, (resp) => {
                    try {
                        // Remove the progress listener once we get the final response
                        chrome.runtime.onMessage.removeListener(onMessage);
                    } catch (e) { }

                    if (chrome.runtime.lastError) {
                        return resolve({ events: [] });
                    }

                    // Background sends the final payload via sendResponse as an object
                    // shaped like { type: 'PROMPT_RESULT', requestId, result } or { type: 'PROMPT_RESULT', requestId, error }
                    if (!resp) return resolve({ events: [] });

                    if (resp.type === 'PROMPT_RESULT' && resp.requestId === requestId) {
                        if (resp.error) return resolve({ events: [] });
                        return resolve(resp.result || { events: [] });
                    }

                    // Fallback: resolve empty
                    return resolve({ events: [] });
                });
            } catch (e) {
                try { chrome.runtime.onMessage.removeListener(onMessage); } catch (e) { }
                return resolve({ events: [] });
            }
        });
    }

    // Fallback to local/session prompt in this context
    const session = await getSession(monitorHandlers);

    // Structure the message to be very explicit about the task
    const messages = [
        {
            role: "system",
            content: GUIDANCE_PROMPT
        },
        {
            role: "user",
            content: `TEXT TO ANALYZE:
---START---
${pageText}
---END---

REQUIRED: Extract any events from the above text and return them in valid JSON format matching the schema exactly.
If no valid events are found, return {"events":[]}.
Return ONLY the JSON, no other text.`
        }
    ];

    let raw;
    try {
        console.log("[prompt_ai] Preparing to call model with:", {
            textLength: pageText.length,
            preview: pageText.slice(0, 100) + "...",
            timestamp: new Date().toISOString()
        });

        // Track start time for performance monitoring
        const startTime = performance.now();

        // --- Call the local model to generate JSON per EVENT_SCHEMA ---
        // NOTE: removed the hard 30s timeout to avoid prematurely aborting
        // longer-running model inferences. The caller may implement its own
        // cancellation if desired via session-level APIs.
        console.log('[prompt_ai] Invoking session.prompt (no hard timeout)');
        raw = await session.prompt(messages, {
            responseConstraint: EVENT_SCHEMA,
            // Explicitly tell the model to return JSON only
            outputFormat: "json",
            // Set required output language to avoid warnings
            expectedOutputs: [{ type: "text", languages: ["en"] }],
            // Keeps the schema enforced without injecting it into the model's input
            omitResponseConstraintInput: true,
            // Use fast inference with lower temperature for more focused responses
            fastInference: true,
            temperature: 0.01 // Very low temperature to ensure consistent, focused responses
        });

        const duration = performance.now() - startTime;
        console.log("[prompt_ai] Model response received:", {
            duration: `${duration.toFixed(2)}ms`,
            responseLength: raw?.length || 0,
            preview: raw?.slice(0, 100) + "...",
            timestamp: new Date().toISOString()
        });

    } catch (e) {
        // --- If model fails to return valid JSON, return empty result ---
        console.error("[prompt_ai] Prompt error:", {
            error: e.message,
            stack: e.stack,
            timestamp: new Date().toISOString()
        });
        return { events: [] };
    }

    try {
        const data = JSON.parse(raw);
        console.log("[prompt_ai] Parsed response:", {
            hasEvents: !!data?.events,
            eventCount: data?.events?.length || 0,
            timestamp: new Date().toISOString()
        });

        // --- Sanity check: ensure result matches expected structure ---
        if (!data || typeof data !== "object" || !Array.isArray(data.events)) {
            console.warn("[prompt_ai] Invalid response structure:", {
                rawResponse: raw,
                timestamp: new Date().toISOString()
            });
            return { events: [] };
        }
        return data;
    } catch (e) {
        console.error("[prompt_ai] JSON parse error:", {
            error: e.message,
            rawResponse: raw,
            timestamp: new Date().toISOString()
        });
        return { events: [] };
    }
}

/**
 * Combines warm-up and extraction in one call.
 * Equivalent to: await ensureModelReady(); then await extractEvents(text);
 */
export async function extractEventsReady(pageText, monitorHandlers = null) {
    await prewarmModel(monitorHandlers);
    return extractEvents(pageText, monitorHandlers);
}

export const GUIDANCE_PROMPT = `TASK: Extract calendar event details from the given text and format them as structured JSON.

INSTRUCTIONS:
1. Look for event information including:
   - Event title/name
   - Date(s) and time(s)
   - Location details
   - Additional details like description/URL

2. For each event found, format the data according to this exact schema:
{
    "events": [
        {
            "title": "(required) event name/title",
            "startDate": "(required) YYYY-MM-DD format",
            "startTime": "HH:MM format or null",
            "endDate": "YYYY-MM-DD format or null",
            "endTime": "HH:MM format or null",
            "timezone": "IANA timezone (e.g., America/Los_Angeles) or null",
            "venue": "location name or null",
            "address": "street address or null",
            "city": "city name or null",
            "country": "country name or null",
            "url": "event URL or null",
            "notes": "additional details or null"
        }
    ]
}

3. Data Requirements:
   - title and startDate are REQUIRED
   - Other fields can be null if not found
   - Dates must be YYYY-MM-DD format
   - Times must be HH:MM format
   - Return {"events":[]} if no valid events found

IMPORTANT:
- Focus ONLY on extracting events
- Return ONLY valid JSON matching the schema exactly
- Do not add explanations or extra text
- Do not create fictional data; use only information present in the text`.trim();