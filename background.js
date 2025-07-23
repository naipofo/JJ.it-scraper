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

    const imageUrl = getElementAttribute("img#offerCardCompanyLogo", "src");
    const companyName = getElementText("h2.mui-7mkjdj");
    const companyLocation = getElementText("span.mui-1o4wo1x");
    const jobRole = getElementText("h1.mui-qnzs6x");
    const jobLink = window.location.href;

    let bottomBracket = "";
    let topBracket = "";

    // Find all salary elements and iterate through them
    const salaryElements = document.querySelectorAll(".mui-1km0bek");

    for (const element of salaryElements) {
      const textContent = element.textContent;
      if (!textContent) continue;

      // Regex to find numbers and period (h, day, month)
      const salaryRegex = /(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*PLN\/(h|day|month)/i;
      const match = textContent.match(salaryRegex);

      if (match) {
        let val1 = parseFloat(match[1].replace(/\s/g, ""));
        let val2 = parseFloat(match[2].replace(/\s/g, ""));
        const period = match[3].toLowerCase();

        if (period === "day") {
          val1 *= 20; // 20 working days/month
          val2 *= 20;
        } else if (period === "h") {
          val1 *= 160; // 160 working hours/month (40h/week * 4 weeks)
          val2 *= 160;
        }
        // No conversion needed for 'month'

        bottomBracket = val1.toString();
        topBracket = val2.toString();
        break; // Stop after finding the first valid salary
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
