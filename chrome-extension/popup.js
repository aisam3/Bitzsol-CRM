// popup.js
document.getElementById("extractBtn").addEventListener("click", async () => {
  const statusDiv = document.getElementById("status");
  statusDiv.textContent = "⏳ Extracting contact info...";
  statusDiv.className = "";

  // Get current active tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;

  if (!url || !url.includes("linkedin.com/in/")) {
    statusDiv.textContent = "❌ Please open a LinkedIn profile page first.";
    statusDiv.className = "error";
    return;
  }

  // Send message to background script
  chrome.runtime.sendMessage(
    { action: "extractLinkedinLead", url: url },
    (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.textContent = `❌ Error: ${chrome.runtime.lastError.message}`;
        statusDiv.className = "error";
        return;
      }

      if (response && response.success) {
        const lead = response.data;
        statusDiv.innerHTML = `✅ Lead synced!<br>
          Name: ${lead.scraped.fullName || "N/A"}<br>
          Email: ${lead.enriched.email || lead.scraped.email || "N/A"}<br>
          Phone: ${lead.enriched.phone || lead.scraped.phone || "N/A"}<br>
          CRM Status: ${lead.crm?.message || "OK"}`;
        statusDiv.className = "success";
      } else {
        statusDiv.textContent = `❌ Failed: ${response?.error || "Unknown error"}`;
        statusDiv.className = "error";
      }
    },
  );
});
