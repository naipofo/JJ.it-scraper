chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "scrape") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ error: "No active tab found." });
        return;
      }
      const tabId = tabs[0].id;

      if (!tabId) {
        sendResponse({ error: "Could not get active tab ID." });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tabId },
          function: scrapeJobDetails,
        },
        (injectionResults) => {
          if (chrome.runtime.lastError) {
            sendResponse({ error: chrome.runtime.lastError.message });
            return;
          }

          if (
            injectionResults &&
            injectionResults[0] &&
            injectionResults[0].result
          ) {
            sendResponse({ data: injectionResults[0].result });
          } else {
            sendResponse({
              error: "Scraping function did not return a result.",
            });
          }
        },
      );
    });

    return true;
  }
});

function scrapeJobDetails() {
  // Schema: image url\tcompany name\tcompany location\tbottom bracket\ttop bracket\tjob role\tjob link
  try {
    const getElementText = (selector) => {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : "";
    };

    const getElementAttribute = (selector, attribute) => {
      const element = document.querySelector(selector);
      return element ? element.getAttribute(attribute) : "";
    };

    const imageUrl = getElementAttribute("object#offerCardCompanyLogo", "data");
    const companyName = getElementText(".mui-3utbbt a p.mui-1vn2m4l");

    // The first p tag in this div is the address.
    const locationElement = document.querySelector(
      ".mui-3utbbt > p.mui-1vn2m4l",
    );
    const locationText = locationElement
      ? locationElement.textContent.trim()
      : "";
    const city = locationText.split(",").pop().trim();

    let remoteStatus = "";
    const detailElements = document.querySelectorAll(".mui-1hp3r0f");
    if (detailElements.length > 0) {
      // Last detail item is the work mode (Hybrid, Remote, etc.)
      remoteStatus =
        detailElements[detailElements.length - 1].textContent.trim();
      // The sample output uses "Fully remote" for "Remote"
      if (remoteStatus.toLowerCase() === "remote") {
        remoteStatus = "Fully remote";
      }
    }

    const companyLocation = [city, remoteStatus].filter(Boolean).join(", ");

    const jobRole = getElementText("h1.mui-5hfn3u");
    const jobLink = window.location.href;

    let bottomBracket = "";
    let topBracket = "";

    const salaryContainer = document.querySelector(".mui-lvf5qk");
    if (salaryContainer) {
      const salarySpans = salaryContainer.querySelectorAll("h6 > span");
      if (salarySpans.length >= 2) {
        let val1 = parseFloat(salarySpans[0].textContent.replace(/\s/g, ""));
        let val2 = parseFloat(salarySpans[1].textContent.replace(/\s/g, ""));

        const periodTextElement = salaryContainer.querySelector(".mui-ktaxaz");
        const periodText = periodTextElement
          ? periodTextElement.textContent.toLowerCase()
          : "";

        if (periodText.includes("day")) {
          val1 *= 20; // 20 working days/month
          val2 *= 20;
        } else if (periodText.includes("hour") || periodText.includes("/h")) {
          val1 *= 160; // 160 working hours/month
          val2 *= 160;
        }

        bottomBracket = val1.toString();
        topBracket = val2.toString();
      }
    }

    const data = [
      imageUrl,
      companyName,
      companyLocation,
      bottomBracket,
      topBracket,
      jobRole,
      jobLink,
    ];

    return data.join("\t");
  } catch (e) {
    return `Error during scraping: ${e.message}`;
  }
}
