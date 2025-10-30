// content.js - lightweight extractor that runs in page context.
// It extracts structured event data (JSON-LD, microdata) and falls back to heuristics.
// The script stores candidates in chrome.storage and notifies the background script.

(function () {
    // Notify that content script is loaded
    console.log('[CalAIder] Content script loaded and initialized');

    // Register script load with background
    try {
        chrome.runtime.sendMessage({
            type: 'CONTENT_SCRIPT_LOADED',
            tabId: window.location.href
        });
    } catch (err) {
        console.error('[CalAIder] Failed to notify background script:', err);
    }

    // Set up message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('[CalAIder] Received message:', request.type);

        // Handle ping to check if content script is alive
        if (request.type === 'PING') {
            console.log('[CalAIder] Responding to ping');
            sendResponse({ status: 'content_script_ready' });
            return true;
        }

        // Handle text extraction
        if (request.type === 'EXTRACT_TEXT') {
            // Extract and send back the text content
            const textContent = extractPageContent();
            sendResponse({ text: textContent });
            return true; // Required for async response
        }
    });

    function extractPageContent() {
        // First try to get structured data
        const structuredEvents = extractJsonLdEvents();
        if (structuredEvents.length > 0) {
            return JSON.stringify(structuredEvents);
        }

        // Fallback to extracting page text
        return document.body.innerText;
    }

    function extractJsonLdEvents() {
        const nodes = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        const parsed = [];
        for (const n of nodes) {
            try {
                const data = JSON.parse(n.innerText);
                if (!data) continue;
                const arr = Array.isArray(data) ? data : [data];
                for (const item of arr) {
                    if (!item) continue;
                    if (item['@type'] === 'Event' || (Array.isArray(item['@type']) && item['@type'].includes('Event'))) {
                        parsed.push(item);
                    } else if (item['@graph']) {
                        const graph = Array.isArray(item['@graph']) ? item['@graph'] : [item['@graph']];
                        for (const g of graph) {
                            if (g['@type'] === 'Event') parsed.push(g);
                        }
                    }
                }
            } catch (e) {
                // ignore parse errors
            }
        }
        return parsed;
    }

    function extractMicrodataEvents() {
        const els = Array.from(document.querySelectorAll('[itemtype]'));
        const out = [];
        for (const el of els) {
            const it = el.getAttribute('itemtype') || '';
            if (it.toLowerCase().includes('schema.org/event') || it.toLowerCase().includes('/event')) {
                const obj = {};
                const props = el.querySelectorAll('[itemprop]');
                props.forEach(p => {
                    const name = p.getAttribute('itemprop');
                    let val = '';
                    if (p.tagName === 'META') val = p.getAttribute('content') || '';
                    else if (p.tagName === 'TIME') val = p.getAttribute('datetime') || p.textContent || '';
                    else val = p.textContent || '';
                    if (name) obj[name] = val.trim();
                });
                out.push(obj);
            }
        }
        return out;
    }

    function heuristicExtract() {
        const candidates = [];
        const selectors = ['[class*="event"]', '[class*="Event"]', '[id*="event"]', '[id*="Event"]', 'article', 'main', '[role="article"]'];
        const seen = new Set();
        const nodes = document.querySelectorAll(selectors.join(','));
        nodes.forEach(n => {
            if (!n) return;
            const txt = n.innerText ? n.innerText.trim().slice(0, 4000) : '';
            if (txt && !seen.has(txt)) {
                seen.add(txt);
                const title = (n.querySelector('h1,h2,h3')?.innerText || '').trim();
                candidates.push({
                    title: title || guessTitleFromText(txt),
                    text: txt,
                    snippet: txt.slice(0, 800)
                });
            }
        });
        if (candidates.length === 0) {
            const bodyText = (document.body && document.body.innerText) ? document.body.innerText.trim().slice(0, 4000) : '';
            if (bodyText) candidates.push({ title: document.title, text: bodyText, snippet: bodyText.slice(0, 800) });
        }
        return candidates;
    }

    function guessTitleFromText(txt) {
        const lines = txt.split('\n').map(l => l.trim()).filter(Boolean);
        return lines[0] || document.title || '';
    }

    function normalizeEvent(item) {
        const out = { title: '', startTime: null, endTime: null, location: '', description: '' };
        if (!item) return out;

        if (item['@type'] === 'Event' || item.type === 'Event' || item.name) {
            out.title = item.name || item.title || out.title;
            out.description = item.description || item.summary || out.description;
            if (item.startDate) out.startTime = item.startDate;
            if (item.endDate) out.endTime = item.endDate;
            if (item.location) {
                if (typeof item.location === 'string') out.location = item.location;
                else out.location = item.location.name || item.location.address || JSON.stringify(item.location);
            }
            return out;
        }

        if (item.name || item.title || item.summary || item.date || item.start) {
            out.title = item.name || item.title || item.summary || out.title;
            out.startTime = item.startDate || item.date || item.start || null;
            out.endTime = item.endDate || item.end || null;
            out.location = item.location || item.venue || out.location;
            out.description = item.description || item.text || (item.snippet && item.snippet) || out.description;
            return out;
        }

        if (item.text) {
            out.title = item.title || item.snippet?.split('\n')[0] || document.title || '';
            out.description = item.snippet || item.text || '';
            return out;
        }

        return out;
    }

    function extractEvents() {
        const results = [];
        const jsonLd = extractJsonLdEvents();
        jsonLd.forEach(j => results.push(normalizeEvent(j)));
        const micro = extractMicrodataEvents();
        micro.forEach(m => results.push(normalizeEvent(m)));
        if (results.length === 0) {
            const heur = heuristicExtract();
            heur.forEach(h => results.push(normalizeEvent(h)));
        }
        const seen = new Map();
        const deduped = [];
        results.forEach(r => {
            const key = (r.title || '').slice(0, 200) + '|' + (r.startTime || '');
            if (!seen.has(key)) {
                seen.set(key, true);
                deduped.push(r);
            }
        });
        return deduped;
    }

    // Save and notify background
    function persistAndNotify(events) {
        try {
            const payload = { events, url: location.href, title: document.title, capturedAt: new Date().toISOString() };
            if (chrome && chrome.storage && chrome.storage.local) {
                // store last-extracted per-origin
                chrome.storage.local.set({ lastExtracted: payload }, () => {
                    // notify background
                    try { chrome.runtime.sendMessage({ type: 'EVENTS_EXTRACTED', payload }); } catch (e) { /* ignore */ }
                });
            } else {
                try { localStorage.setItem('lastExtracted', JSON.stringify(payload)); } catch (e) { }
            }
        } catch (e) {
            // swallow
        }
    }

    // Listen for broadcast messages to run extraction on demand
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (!msg || !msg.type) return;

        // Handle text extraction for AI processing
        if (msg.type === 'EXTRACT_TEXT') {
            try {
                const candidates = heuristicExtract();
                let text = candidates.map(c => c.text).join('\n\n');

                // Add structured data
                const jsonLd = extractJsonLdEvents();
                if (jsonLd.length) {
                    text += '\n\nStructured Data:\n' + JSON.stringify(jsonLd, null, 2);
                }

                const micro = extractMicrodataEvents();
                if (micro.length) {
                    text += '\n\nMicrodata:\n' + JSON.stringify(micro, null, 2);
                }

                sendResponse({ success: true, text });
            } catch (e) {
                sendResponse({ success: false, error: String(e) });
            }
            return true; // async
        }

        // Handle legacy event extraction
        if (msg.type === 'EXTRACT_EVENTS') {
            try {
                const events = extractEvents();
                persistAndNotify(events);
                sendResponse({ success: true, payload: events });
            } catch (e) {
                sendResponse({ success: false, error: String(e) });
            }
            return true; // async
        }
    });

    // Run extraction automatically on page load (behind the scenes)
    try {
        const auto = extractEvents();
        if (auto && auto.length) persistAndNotify(auto);
    } catch (e) {
        // ignore
    }
})();
