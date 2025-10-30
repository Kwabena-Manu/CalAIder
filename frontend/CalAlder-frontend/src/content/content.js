// content.js - Event extractor that runs in page context
// Extracts structured event data and formats it for AI processing

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

    function cleanText(text) {
        if (!text) return '';
        // Remove template placeholders
        text = text.replace(/\[[a-zA-Z_]+\]/g, '');
        // Remove excessive whitespace
        text = text.replace(/\s+/g, ' ');
        // Remove empty lines
        text = text.split('\n').filter(line => line.trim()).join('\n');
        return text.trim();
    }

    function extractStructuredData() {
        const events = [];

        // Extract JSON-LD
        const jsonLdNodes = document.querySelectorAll('script[type="application/ld+json"]');
        jsonLdNodes.forEach(node => {
            try {
                const data = JSON.parse(node.textContent);
                if (data && (data['@type'] === 'Event' || (Array.isArray(data) && data.some(item => item['@type'] === 'Event')))) {
                    events.push(data);
                }
            } catch (e) {
                console.warn('[CalAIder] Failed to parse JSON-LD:', e);
            }
        });

        // Extract Schema.org Microdata
        const microDataNodes = document.querySelectorAll('[itemtype*="Event"]');
        microDataNodes.forEach(node => {
            const event = {
                title: node.querySelector('[itemprop="name"]')?.content || node.querySelector('[itemprop="name"]')?.textContent,
                startDate: node.querySelector('[itemprop="startDate"]')?.content,
                endDate: node.querySelector('[itemprop="endDate"]')?.content,
                location: node.querySelector('[itemprop="location"]')?.textContent,
                description: node.querySelector('[itemprop="description"]')?.textContent
            };
            if (event.title) events.push(event);
        });

        return events;
    }

    function extractEventContent() {
        const eventSections = document.querySelectorAll(
            '.event, .events, [class*="event-"], [class*="calendar-"], ' +
            'article, .article, .post, [role="article"], ' +
            '[class*="event_"], [id*="event-"]'
        );

        return Array.from(eventSections).map(section => {
            const titleEl = section.querySelector('h1,h2,h3,h4,[class*="title"],[class*="heading"]');
            const dateEl = section.querySelector('time,[class*="date"],[class*="time"],[datetime]');
            const locationEl = section.querySelector('[class*="location"],[class*="venue"],[class*="place"],[class*="address"]');

            return {
                title: cleanText(titleEl?.textContent),
                date: cleanText(dateEl?.textContent || dateEl?.getAttribute('datetime')),
                location: cleanText(locationEl?.textContent),
                description: cleanText(section.textContent)
            };
        });
    }

    function extractPageContent() {
        console.log('[CalAIder] Starting content extraction...');

        // Priority 1: Try structured data first
        const structuredEvents = extractStructuredData();
        if (structuredEvents.length > 0) {
            const data = {
                type: 'structured',
                content: structuredEvents
            };
            console.log('[CalAIder] Found structured data:', data);
            return JSON.stringify(data);
        }

        // Priority 2: Look for specific event sections
        const eventSections = document.querySelectorAll(
            '.event, .events, [class*="event-"], [class*="calendar-"]'
        );

        if (eventSections.length > 0) {
            const eventTexts = Array.from(eventSections).map(section => ({
                title: section.querySelector('h1,h2,h3')?.innerText?.trim() || '',
                date: section.querySelector('time,[class*="date"],[class*="time"]')?.innerText?.trim() || '',
                location: section.querySelector('[class*="location"],[class*="venue"]')?.innerText?.trim() || '',
                description: section.innerText?.trim() || ''
            })).filter(event => event.title || event.date);

            const data = {
                type: 'extracted',
                content: eventTexts,
                size: JSON.stringify(eventTexts).length
            };

            console.log('[CalAIder] Found event sections:', data);

            // Limit size to avoid quota errors (50KB limit)
            if (data.size > 50000) {
                console.warn('[CalAIder] Content exceeds 50KB, truncating...');
                data.content = data.content.slice(0, 3); // Keep only first 3 events
            }

            return JSON.stringify(data);
        }

        // Priority 3: Get main content area
        const mainContent = document.querySelector('main,article,#content,#main');
        if (mainContent) {
            const text = mainContent.innerText.trim();
            const data = {
                type: 'main_content',
                content: text.slice(0, 50000), // Limit to 50KB
                size: text.length
            };
            console.log('[CalAIder] Using main content:', data);
            return JSON.stringify(data);
        }

        // Last resort: Get minimal body text
        const minimalText = document.body.innerText.slice(0, 25000); // Even smaller limit
        const data = {
            type: 'body_text',
            content: minimalText,
            size: minimalText.length
        };
        console.log('[CalAIder] Falling back to body text:', data);
        return JSON.stringify(data);
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
            const content = extractPageContent();
            console.log('[CalAIder] Extracted content');

            // Persist the extracted page content for debugging/inspection
            try {
                // Try to parse structured JSON if possible so storage is structured
                let parsed = null;
                try {
                    parsed = JSON.parse(content);
                } catch (e) {
                    // not JSON, leave parsed null
                }

                const payload = parsed && (parsed.type && parsed.content)
                    ? { type: parsed.type, items: parsed.content }
                    : { type: 'raw', text: typeof content === 'string' ? content.slice(0, 20000) : String(content) };

                chrome.storage.local.set({
                    lastPageExtraction: {
                        payload,
                        raw: typeof content === 'string' ? content.slice(0, 20000) : String(content),
                        timestamp: Date.now()
                    }
                }, () => {
                    console.log('[CalAIder] Saved page extraction to chrome.storage.local');
                });
            } catch (e) {
                console.error('[CalAIder] Failed to save page extraction to storage:', e);
            }

            sendResponse({ text: content });
            return true;
        }
    });
})();