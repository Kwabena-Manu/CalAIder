(function() {
  console.log("[CalAIder] Content script loaded and initialized");
  try {
    chrome.runtime.sendMessage({
      type: "CONTENT_SCRIPT_LOADED",
      tabId: window.location.href
    });
  } catch (err) {
    console.error("[CalAIder] Failed to notify background script:", err);
  }
  function extractStructuredData() {
    const events = [];
    const jsonLdNodes = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdNodes.forEach((node) => {
      try {
        const data = JSON.parse(node.textContent);
        if (data && (data["@type"] === "Event" || Array.isArray(data) && data.some((item) => item["@type"] === "Event"))) {
          events.push(data);
        }
      } catch (e) {
        console.warn("[CalAIder] Failed to parse JSON-LD:", e);
      }
    });
    const microDataNodes = document.querySelectorAll('[itemtype*="Event"]');
    microDataNodes.forEach((node) => {
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
  function extractPageContent() {
    console.log("[CalAIder] Starting content extraction...");
    const structuredEvents = extractStructuredData();
    if (structuredEvents.length > 0) {
      const data2 = {
        type: "structured",
        content: structuredEvents
      };
      console.log("[CalAIder] Found structured data:", data2);
      return JSON.stringify(data2);
    }
    const eventSections = document.querySelectorAll(
      '.event, .events, [class*="event-"], [class*="calendar-"]'
    );
    if (eventSections.length > 0) {
      const eventTexts = Array.from(eventSections).map((section) => ({
        title: section.querySelector("h1,h2,h3")?.innerText?.trim() || "",
        date: section.querySelector('time,[class*="date"],[class*="time"]')?.innerText?.trim() || "",
        location: section.querySelector('[class*="location"],[class*="venue"]')?.innerText?.trim() || "",
        description: section.innerText?.trim() || ""
      })).filter((event) => event.title || event.date);
      const data2 = {
        type: "extracted",
        content: eventTexts,
        size: JSON.stringify(eventTexts).length
      };
      console.log("[CalAIder] Found event sections:", data2);
      if (data2.size > 5e4) {
        console.warn("[CalAIder] Content exceeds 50KB, truncating...");
        data2.content = data2.content.slice(0, 3);
      }
      return JSON.stringify(data2);
    }
    const mainContent = document.querySelector("main,article,#content,#main");
    if (mainContent) {
      const text = mainContent.innerText.trim();
      const data2 = {
        type: "main_content",
        content: text.slice(0, 5e4),
        // Limit to 50KB
        size: text.length
      };
      console.log("[CalAIder] Using main content:", data2);
      return JSON.stringify(data2);
    }
    const minimalText = document.body.innerText.slice(0, 25e3);
    const data = {
      type: "body_text",
      content: minimalText,
      size: minimalText.length
    };
    console.log("[CalAIder] Falling back to body text:", data);
    return JSON.stringify(data);
  }
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[CalAIder] Received message:", request.type);
    if (request.type === "PING") {
      console.log("[CalAIder] Responding to ping");
      sendResponse({ status: "content_script_ready" });
      return true;
    }
    if (request.type === "EXTRACT_TEXT") {
      const content = extractPageContent();
      console.log("[CalAIder] Extracted content");
      try {
        let parsed = null;
        try {
          parsed = JSON.parse(content);
        } catch (e) {
        }
        const payload = parsed && (parsed.type && parsed.content) ? { type: parsed.type, items: parsed.content } : { type: "raw", text: typeof content === "string" ? content.slice(0, 2e4) : String(content) };
        chrome.storage.local.set({
          lastPageExtraction: {
            payload,
            raw: typeof content === "string" ? content.slice(0, 2e4) : String(content),
            timestamp: Date.now()
          }
        }, () => {
          console.log("[CalAIder] Saved page extraction to chrome.storage.local");
        });
      } catch (e) {
        console.error("[CalAIder] Failed to save page extraction to storage:", e);
      }
      sendResponse({ text: content });
      return true;
    }
  });
})();
//# sourceMappingURL=content.js.map
