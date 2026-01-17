# Marketplace Negotiator Extenson Walkthrough

I have built the "Marketplace Negotiator" Chrome Extension. This tool allows you to:

1. **Scrape** product details from any marketplace page.
2. **Generate** negotiation messages using OpenAI's GPT-3.5, with an aggressive "Michael Reeves" style option.

## installation Instructions

1. Open Chrome and navigate to `chrome://extensions`.
2. Toggle **Developer mode** in the top right.
3. Click **Load unpacked**.
4. Select the `extension` folder inside this directory:
    `C:\Users\DELL\.gemini\antigravity\brain\ab269225-0d3e-47aa-9f8a-0f2fc34cde44\extension`

## Usage

1. **Navigate** to a product page (e.g., Facebook Marketplace, eBay, Craigslist).
2. **Click** the extension icon.
3. **Enter** your OpenAI API Key (first time only).
4. **Select** "Aggressive Lowball" for the full Michael Reeves experience.
5. **Click** "Generate Negotiation".
6. **Copy** the result and send it to the seller.

## Files Created

- [manifest.json](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/manifest.json) - Extension configuration.
- [popup.html](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/popup.html) - The user interface.
- [popup.js](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/popup.js) - Logic for API calls and UI handling.
- [content.js](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/content.js) - Script that reads product info from the page.

## Safety & Troubleshooting
>
> [!WARNING]
> **Account Safety**: Using automated tools on Facebook can trigger "Suspicious Activity" checks.
> To minimize risk:
>
> 1. Do not use the extension incorrectly/excessively in a short period.
> 2. If you encounter a "Confirm your identity" or "Video Selfie" checkpoint:
>     - **Disable** all extensions (including this one) temporarily.
>     - **Clear** your browser cache.
>     - **Retry** the verification. Ad-blockers and privacy extensions often break the "Upload" buttons on these verification forms.
