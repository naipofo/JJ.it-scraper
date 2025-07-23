document.addEventListener("DOMContentLoaded", () => {
  const scrapeButton = document.getElementById("scrapeButton");
  const resultsArea = document.getElementById("results");

  scrapeButton.addEventListener("click", () => {
    scrapeButton.disabled = true;
    scrapeButton.textContent = "Scraping...";
    resultsArea.value = "";

    chrome.runtime.sendMessage({ action: "scrape" }, (response) => {
      const resetButton = (text) => {
        scrapeButton.textContent = text;
        setTimeout(() => {
          scrapeButton.disabled = false;
          scrapeButton.textContent = "Scrape Job";
        }, 2000);
      };

      if (chrome.runtime.lastError || (response && response.error)) {
        const errorMsg = chrome.runtime.lastError
          ? chrome.runtime.lastError.message
          : response.error;
        resultsArea.value = `Error: ${errorMsg}`;
        resetButton("Scrape Failed");
        return;
      }

      if (response && response.data) {
        resultsArea.value = response.data;
        navigator.clipboard
          .writeText(response.data)
          .then(() => {
            resetButton("Copied!");
          })
          .catch((err) => {
            console.error("Failed to copy text: ", err);
            resetButton("Copy Failed!");
          });
      } else {
        resultsArea.value = "Failed to get a response from the content script.";
        resetButton("Scrape Failed");
      }
    });
  });
});
