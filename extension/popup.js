async function authenticate() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError || !token) {
        console.error("Auth error:", chrome.runtime.lastError);
        reject(chrome.runtime.lastError);
        return;
      }
      console.log("✅ Token acquired:", token);
      resolve(token);
    });
  });
}

async function getEvents(token) {
  const now = new Date().toISOString();

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=10&orderBy=startTime&singleEvents=true&timeMin=${now}`,
    {
      headers: { Authorization: "Bearer " + token },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error("❌ Google API error:", response.status, text);
    throw new Error("Google API request failed");
  }

  const data = await response.json();
  console.log("Fetched events:", data);
  return data.items || [];
}

document.addEventListener("DOMContentLoaded", () => {
  const checkSlotsBtn = document.getElementById("checkSlots");
  const eventsUl = document.getElementById("events");
  const statusDiv = document.getElementById("status");

  checkSlotsBtn.addEventListener("click", async () => {
    eventsUl.innerHTML = "";
    statusDiv.textContent = "Fetching upcoming events...";
    statusDiv.className = "loading";
    checkSlotsBtn.disabled = true;

    try {
      const token = await authenticate();
      const events = await getEvents(token);

      if (events.length === 0) {
        eventsUl.innerHTML = `<p class="empty">No upcoming events 🎉</p>`;
        statusDiv.textContent = "";
        return;
      }

      eventsUl.innerHTML = events
        .map(
          (e) => `
          <li>
            <strong>${e.summary || "(No title)"}</strong>
            <small>${formatDate(e.start)} - ${formatDate(e.end)}</small>
          </li>`
        )
        .join("");
      statusDiv.textContent = `Showing ${events.length} upcoming events.`;
    } catch (err) {
      console.error("Error:", err);
      statusDiv.innerHTML =
        "<span style='color:red;'>❌ Authentication or fetch failed. Check console.</span>";
    } finally {
      checkSlotsBtn.disabled = false;
    }
  });
});

function formatDate(dateObj) {
  if (!dateObj) return "";
  const date = new Date(dateObj.dateTime || dateObj.date);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
