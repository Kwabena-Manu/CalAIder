chrome.runtime.onInstalled.addListener(() => {
  console.log("CalAIder installed and ready!");
});

chrome.action.onClicked.addListener(() => {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      console.error("Access failed:", chrome.runtime.lastError);
      alert("Access failed: " + (chrome.runtime.lastError.message || chrome.runtime.lastError));
      return;
    }
    console.log("Access token received:", token);
    // Proceed with further API calls if needed
  });
});


