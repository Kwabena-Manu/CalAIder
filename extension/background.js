chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");
});

chrome.action.onClicked.addListener(() => {
  chrome.identity.getAuthToken({ interactive: true }, () => {
    if (chrome.runtime.lastError) {
      console.log(
        JSON.stringify("Access failed", chrome.runtime.lastError, null, 2)
      );
    } else {
      console.log("Access received");
    }
  });
});
