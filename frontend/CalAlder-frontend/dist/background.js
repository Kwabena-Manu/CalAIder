chrome.runtime.onInstalled.addListener(()=>{console.log("CalAIder installed and ready!")});chrome.action.onClicked.addListener(()=>{chrome.identity.getAuthToken({interactive:!0},e=>{if(chrome.runtime.lastError){console.error("Access failed:",chrome.runtime.lastError),alert("Access failed: "+(chrome.runtime.lastError.message||chrome.runtime.lastError));return}console.log("Access token received:",e)})});

// Function to extract web text
async function extractPage(tabId) {
    const [{ result }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
            // This function runs in the web page itself
            try {
                const text = document.body.innerText || "";
                const cleaned = text.replace(/\s+/g, " ").trim().slice(0, 100000);
                return cleaned;
            } catch (e) {
                return "";
            }
        },
    });
    return result;
}