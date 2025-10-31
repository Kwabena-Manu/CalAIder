const EVENT_SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      minItems: 0,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 1 },
          startDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          startTime: { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}(:\\d{2})?$" },
          endDate: { type: ["string", "null"], pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          endTime: { type: ["string", "null"], pattern: "^\\d{2}:\\d{2}(:\\d{2})?$" },
          timezone: { type: ["string", "null"] },
          venue: { type: ["string", "null"] },
          address: { type: ["string", "null"] },
          city: { type: ["string", "null"] },
          country: { type: ["string", "null"] },
          url: { type: ["string", "null"] },
          notes: { type: ["string", "null"] }
        },
        required: ["title", "startDate"]
      }
    }
  },
  required: ["events"],
  additionalProperties: false
};
let _sessionPromise = null;
let _session = null;
let _warmupStatus = null;
function promptApiSupported() {
  return typeof globalThis.LanguageModel !== "undefined";
}
async function getSession(monitorHandlers) {
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
    const monitor = monitorHandlers ? (m) => {
      let started = false;
      m.addEventListener("downloadprogress", (e) => {
        if (!started) {
          started = true;
          monitorHandlers.onStart?.();
        }
        monitorHandlers.onProgress?.(e.loaded);
        if (e.loaded >= 1) monitorHandlers.onDone?.();
      });
    } : void 0;
    console.log("[prompt_ai] Creating new model session...");
    _session = await LanguageModel.create({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
      temperature: 0.1,
      // Lower temperature for more deterministic outputs
      topK: 1,
      // Reduce to 1 for fastest inference
      monitor,
      fastInference: true
      // Enable fast inference mode
    });
    console.log("[prompt_ai] Model session created successfully");
    return _session;
  })();
  return _sessionPromise;
}
async function prewarmModel(monitorHandlers) {
  if (_warmupStatus === "ready" || _warmupStatus === "warming") {
    return _sessionPromise;
  }
  _warmupStatus = "warming";
  try {
    const session = await getSession({
      onStart: () => {
        _warmupStatus = "warming";
        monitorHandlers?.onStart?.();
      },
      onProgress: (p) => {
        monitorHandlers?.onProgress?.(p);
      },
      onDone: () => {
        _warmupStatus = "ready";
        monitorHandlers?.onDone?.();
      }
    });
    _warmupStatus = "ready";
    return session;
  } catch (e) {
    _warmupStatus = "failed";
    throw e;
  }
}
async function extractEvents(pageText, monitorHandlers = null) {
  if (typeof pageText !== "string" || !pageText.trim()) {
    return { events: [] };
  }
  if (typeof window !== "undefined" && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    const requestId = `req_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    console.log("[prompt_ai] Routing prompt via background", { requestId });
    return new Promise((resolve, reject) => {
      const onMessage = (msg, sender) => {
        try {
          if (!msg || msg.requestId !== requestId) return;
          if (msg.type === "PROMPT_PROGRESS") {
            monitorHandlers?.onStart?.();
            monitorHandlers?.onProgress?.(msg.progress);
            if (msg.progress >= 1) monitorHandlers?.onDone?.();
            return;
          }
          if (msg.type === "PROMPT_RESULT") {
            chrome.runtime.onMessage.removeListener(onMessage);
            if (msg.error) return resolve({ events: [] });
            return resolve(msg.result || { events: [] });
          }
        } catch (e) {
        }
      };
      chrome.runtime.onMessage.addListener(onMessage);
      try {
        chrome.runtime.sendMessage({ type: "PROMPT_EXTRACT", requestId, text: pageText }, (resp) => {
          try {
            chrome.runtime.onMessage.removeListener(onMessage);
          } catch (e) {
          }
          if (chrome.runtime.lastError) {
            return resolve({ events: [] });
          }
          if (!resp) return resolve({ events: [] });
          if (resp.type === "PROMPT_RESULT" && resp.requestId === requestId) {
            if (resp.error) return resolve({ events: [] });
            return resolve(resp.result || { events: [] });
          }
          return resolve({ events: [] });
        });
      } catch (e) {
        try {
          chrome.runtime.onMessage.removeListener(onMessage);
        } catch (e2) {
        }
        return resolve({ events: [] });
      }
    });
  }
  const session = await getSession(monitorHandlers);
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
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const startTime = performance.now();
    console.log("[prompt_ai] Invoking session.prompt (no hard timeout)");
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
      temperature: 0.01
      // Very low temperature to ensure consistent, focused responses
    });
    const duration = performance.now() - startTime;
    console.log("[prompt_ai] Model response received:", {
      duration: `${duration.toFixed(2)}ms`,
      responseLength: raw?.length || 0,
      preview: raw?.slice(0, 100) + "...",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (e) {
    console.error("[prompt_ai] Prompt error:", {
      error: e.message,
      stack: e.stack,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { events: [] };
  }
  try {
    const data = JSON.parse(raw);
    console.log("[prompt_ai] Parsed response:", {
      hasEvents: !!data?.events,
      eventCount: data?.events?.length || 0,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (!data || typeof data !== "object" || !Array.isArray(data.events)) {
      console.warn("[prompt_ai] Invalid response structure:", {
        rawResponse: raw,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      return { events: [] };
    }
    return data;
  } catch (e) {
    console.error("[prompt_ai] JSON parse error:", {
      error: e.message,
      rawResponse: raw,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return { events: [] };
  }
}
async function extractEventsReady(pageText, monitorHandlers = null) {
  await prewarmModel(monitorHandlers);
  return extractEvents(pageText, monitorHandlers);
}
const GUIDANCE_PROMPT = `TASK: Extract calendar event details from the given text and format them as structured JSON.

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
const loadedTabs = /* @__PURE__ */ new Set();
chrome.runtime.onInstalled.addListener(() => {
  console.log("CalAIder installed and ready!");
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.startsWith("http")) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }).then(() => {
      loadedTabs.add(tabId);
      console.log(`Content script loaded in tab ${tabId}`);
    }).catch((err) => {
      console.error(`Failed to inject content script in tab ${tabId}:`, err);
    });
  }
});
chrome.tabs.onRemoved.addListener((tabId) => {
  loadedTabs.delete(tabId);
});
let sessionWarmedUp = false;
const tryPrewarmBackground = async () => {
  if (sessionWarmedUp) {
    console.log("[CalAIder] Session already warmed up, skipping prewarm");
    return;
  }
  try {
    console.log("[CalAIder] Background attempting to prewarm model...");
    await prewarmModel({
      onStart: () => console.log("[CalAIder] Model prewarm started"),
      onProgress: (p) => console.log("[CalAIder] Model prewarm progress", p),
      onDone: () => {
        console.log("[CalAIder] Model prewarm done");
        sessionWarmedUp = true;
      }
    });
    sessionWarmedUp = true;
    console.log("[CalAIder] Background model prewarm complete");
  } catch (e) {
    console.warn("[CalAIder] Background prewarm failed or not available:", e?.message || e);
  }
};
chrome.runtime.onInstalled.addListener(() => {
  tryPrewarmBackground();
});
if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => {
    tryPrewarmBackground();
  });
}
const activeAnalyses = /* @__PURE__ */ new Map();
let keepaliveInterval = null;
const startKeepalive = () => {
  if (keepaliveInterval) return;
  keepaliveInterval = setInterval(() => {
    console.log("[CalAIder BG] Keepalive ping");
  }, 2e4);
};
const stopKeepalive = () => {
  if (keepaliveInterval) {
    clearInterval(keepaliveInterval);
    keepaliveInterval = null;
  }
};
const correctPastDate = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const eventDate = new Date(dateStr);
  const now = /* @__PURE__ */ new Date();
  const daysDiff = Math.floor((now - eventDate) / (1e3 * 60 * 60 * 24));
  if (daysDiff > 30) {
    const currentYear = now.getFullYear();
    const [year, month, day] = dateStr.split("-");
    const correctedDate = `${currentYear}-${month}-${day}`;
    const correctedDateTime = new Date(correctedDate);
    if (correctedDateTime < now) {
      return `${currentYear + 1}-${month}-${day}`;
    }
    return correctedDate;
  }
  return dateStr;
};
const getEventKey = (ev) => `${ev?.title || ev?.summary || ""}|${ev?.startDate || ""}|${ev?.location || ev?.address || ""}`.toLowerCase();
const aggregateSessionEvents = (session) => {
  if (!session) return [];
  const all = [];
  const seen = /* @__PURE__ */ new Set();
  const sections = session.eventsPerSection || {};
  const completed = Array.isArray(session.completedIndices) ? new Set(session.completedIndices) : /* @__PURE__ */ new Set();
  for (const [idx, evts] of Object.entries(sections)) {
    if (!completed.has(Number(idx))) continue;
    (evts || []).forEach((ev) => {
      const key = getEventKey(ev);
      if (seen.has(key)) return;
      seen.add(key);
      all.push(ev);
    });
  }
  return all;
};
const broadcastProgress = (url, update) => {
  try {
    chrome.runtime.sendMessage({ type: "ANALYSIS_PROGRESS", url, ...update });
  } catch (e) {
  }
};
const runBackgroundAnalysis = async (url, items, forceRefresh = false) => {
  console.log(`[CalAIder BG] Starting analysis for ${url}, ${items.length} sections`);
  startKeepalive();
  const sessionData = await new Promise((resolve) => {
    chrome.storage.local.get(["analysisSessions"], (data) => {
      const sessions = data?.analysisSessions || {};
      resolve(sessions[url] || null);
    });
  });
  let session = sessionData;
  if (!session || forceRefresh) {
    session = {
      items,
      totalItems: items.length,
      completedIndices: [],
      eventsPerSection: {},
      isRunning: true,
      startedAt: Date.now()
    };
  } else {
    if (!Array.isArray(session.items) || session.items.length === 0) {
      session.items = items;
      session.totalItems = items.length;
    }
    session.isRunning = true;
  }
  await new Promise((resolve) => {
    chrome.storage.local.get(["analysisSessions"], (data) => {
      const sessions = data?.analysisSessions || {};
      sessions[url] = { ...session, lastUpdated: Date.now() };
      chrome.storage.local.set({ analysisSessions: sessions }, resolve);
    });
  });
  const abortController = new AbortController();
  const signal = abortController.signal;
  activeAnalyses.set(url, { cancel: abortController });
  broadcastProgress(url, {
    currentItem: session.completedIndices.length,
    totalItems: session.totalItems,
    status: "Starting analysis...",
    modelProgress: session.totalItems ? session.completedIndices.length / session.totalItems : 0
  });
  try {
    for (let i = 0; i < session.items.length; i++) {
      if (signal.aborted) throw new Error("Analysis cancelled");
      if (Array.isArray(session.completedIndices) && session.completedIndices.includes(i)) {
        continue;
      }
      const item = session.items[i] || {};
      broadcastProgress(url, {
        currentItem: i + 1,
        totalItems: session.totalItems,
        status: `Analyzing section ${i + 1} of ${session.totalItems}...`,
        modelProgress: i / Math.max(1, session.totalItems)
      });
      const inputText = typeof item === "string" ? item : item.title || item.description || item.text || JSON.stringify(item);
      if (i > 0) await new Promise((resolve) => setTimeout(resolve, 500));
      let result = null;
      try {
        result = await extractEventsReady(inputText, {
          onStart: () => console.log(`[CalAIder BG] Section ${i + 1} started`),
          onProgress: (p) => {
            broadcastProgress(url, {
              currentItem: i + 1,
              totalItems: session.totalItems,
              status: `Analyzing section ${i + 1} (${Math.round((p || 0) * 100)}%)...`,
              modelProgress: (i + (p || 0)) / session.totalItems
            });
          },
          onDone: () => console.log(`[CalAIder BG] Section ${i + 1} done`)
        });
      } catch (err) {
        console.error(`[CalAIder BG] Section ${i + 1} failed:`, err);
        continue;
      }
      if (result?.events?.length) {
        const correctedEvents = result.events.map((ev) => ({
          ...ev,
          startDate: correctPastDate(ev.startDate),
          endDate: ev.endDate ? correctPastDate(ev.endDate) : ev.endDate
        }));
        session.eventsPerSection = session.eventsPerSection || {};
        session.eventsPerSection[i] = correctedEvents;
        session.completedIndices = Array.from(/* @__PURE__ */ new Set([...session.completedIndices || [], i]));
        await new Promise((resolve) => {
          chrome.storage.local.get(["analysisSessions"], (data) => {
            const sessions = data?.analysisSessions || {};
            sessions[url] = { ...session, lastUpdated: Date.now() };
            chrome.storage.local.set({ analysisSessions: sessions }, resolve);
          });
        });
        const agg = aggregateSessionEvents(session);
        await new Promise((resolve) => {
          chrome.storage.local.get(["detectedEventsCache"], (data) => {
            const cache = data?.detectedEventsCache || {};
            cache[url] = { events: agg, timestamp: Date.now() };
            chrome.storage.local.set({ detectedEventsCache: cache }, resolve);
          });
        });
        broadcastProgress(url, {
          currentItem: i + 1,
          totalItems: session.totalItems,
          status: `Found ${result.events.length} events in section ${i + 1}`,
          modelProgress: (i + 1) / session.totalItems,
          detectedEvents: agg
        });
      }
    }
    const dedupedEvents = aggregateSessionEvents(session);
    if (dedupedEvents.length === 0) {
      broadcastProgress(url, { status: "No events in sections, trying full-page extraction..." });
      try {
        const fullText = session.items.map(
          (item) => typeof item === "string" ? item : item.title || item.description || item.text || JSON.stringify(item)
        ).join("\n\n");
        const fullResult = await extractEventsReady(fullText, {
          onStart: () => broadcastProgress(url, { status: "Running full-page extraction..." }),
          onProgress: (p) => broadcastProgress(url, { modelProgress: p }),
          onDone: () => {
          }
        });
        if (fullResult?.events?.length) {
          const correctedEvents = fullResult.events.map((ev) => ({
            ...ev,
            startDate: correctPastDate(ev.startDate),
            endDate: ev.endDate ? correctPastDate(ev.endDate) : ev.endDate
          }));
          session.eventsPerSection[-1] = correctedEvents;
          session.completedIndices.push(-1);
          const agg2 = aggregateSessionEvents(session);
          await new Promise((resolve) => {
            chrome.storage.local.get(["detectedEventsCache"], (data) => {
              const cache = data?.detectedEventsCache || {};
              cache[url] = { events: agg2, timestamp: Date.now() };
              chrome.storage.local.set({ detectedEventsCache: cache }, resolve);
            });
          });
          broadcastProgress(url, {
            status: `Found ${correctedEvents.length} events (full-page)`,
            detectedEvents: agg2
          });
        }
      } catch (e) {
        console.error("[CalAIder BG] Full-page extraction failed:", e);
      }
    }
    session.isRunning = false;
    await new Promise((resolve) => {
      chrome.storage.local.get(["analysisSessions"], (data) => {
        const sessions = data?.analysisSessions || {};
        sessions[url] = { ...session, lastUpdated: Date.now() };
        chrome.storage.local.set({ analysisSessions: sessions }, resolve);
      });
    });
    broadcastProgress(url, {
      status: "Analysis complete!",
      modelProgress: 1,
      isExtracting: false,
      detectedEvents: aggregateSessionEvents(session)
    });
  } catch (err) {
    if (!signal.aborted) {
      console.error("[CalAIder BG] Analysis error:", err);
      broadcastProgress(url, { status: `Error: ${err.message}`, isExtracting: false });
    }
  } finally {
    activeAnalyses.delete(url);
    if (activeAnalyses.size === 0) {
      stopKeepalive();
    }
  }
};
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "PING_CONTENT_SCRIPT") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      const tabId = tabs[0].id;
      try {
        if (!loadedTabs.has(tabId)) {
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ["content.js"]
          });
          loadedTabs.add(tabId);
        }
        chrome.tabs.sendMessage(tabId, { type: "PING" }, (response) => {
          if (chrome.runtime.lastError) {
            loadedTabs.delete(tabId);
            sendResponse({ error: "Content script not responding" });
          } else {
            sendResponse({ status: "content_script_ready" });
          }
        });
      } catch (err) {
        console.error("Error checking content script:", err);
        sendResponse({ error: err.message || "Failed to check content script" });
      }
    });
    return true;
  }
  if (request.type === "START_ANALYSIS") {
    const { url, items, forceRefresh } = request;
    if (activeAnalyses.has(url)) {
      sendResponse({ status: "already_running" });
      return true;
    }
    runBackgroundAnalysis(url, items, forceRefresh).catch((err) => {
      console.error("[CalAIder BG] Analysis failed:", err);
    });
    sendResponse({ status: "started" });
    return true;
  }
  if (request.type === "CANCEL_ANALYSIS") {
    const { url } = request;
    const active = activeAnalyses.get(url);
    if (active) {
      active.cancel.abort();
      activeAnalyses.delete(url);
      chrome.storage.local.get(["analysisSessions"], (data) => {
        const sessions = data?.analysisSessions || {};
        if (sessions[url]) {
          sessions[url].isRunning = false;
          chrome.storage.local.set({ analysisSessions: sessions });
        }
      });
      sendResponse({ status: "cancelled" });
    } else {
      sendResponse({ status: "not_running" });
    }
    return true;
  }
  if (request.type === "GET_ANALYSIS_STATUS") {
    const { url } = request;
    const isRunning = activeAnalyses.has(url);
    chrome.storage.local.get(["analysisSessions"], (data) => {
      const sessions = data?.analysisSessions || {};
      const session = sessions[url];
      sendResponse({
        isRunning,
        session: session || null,
        detectedEvents: session ? aggregateSessionEvents(session) : []
      });
    });
    return true;
  }
  if (request.type === "PROMPT_EXTRACT") {
    (async () => {
      const { requestId, text } = request;
      try {
        const monitor = {
          onStart: () => {
            try {
              chrome.runtime.sendMessage({ type: "PROMPT_PROGRESS", requestId, progress: 0 });
            } catch (e) {
            }
          },
          onProgress: (p) => {
            try {
              chrome.runtime.sendMessage({ type: "PROMPT_PROGRESS", requestId, progress: p });
            } catch (e) {
            }
          },
          onDone: () => {
            try {
              chrome.runtime.sendMessage({ type: "PROMPT_PROGRESS", requestId, progress: 1 });
            } catch (e) {
            }
          }
        };
        const result = await extractEvents(text, monitor);
        sendResponse({ type: "PROMPT_RESULT", requestId, result });
      } catch (e) {
        console.error("[CalAIder] Background prompt failed:", e);
        sendResponse({ type: "PROMPT_RESULT", requestId, error: e.message });
      }
    })();
    return true;
  }
});
//# sourceMappingURL=background.js.map
