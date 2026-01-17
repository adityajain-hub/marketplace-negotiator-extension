# Marketplace Negotiator Extension Implementation Plan (Updated)

## Goal Description

Refactor the extension to use **Google's Gemini API** (via AI Studio) instead of OpenAI. Additionally, enhance the scraper to capture **multiple product images** to give the AI a full visual context of the item.

## User Review Required

- **API Key**: User must provide a Google AI Studio API Key.
- **Model**: Will use `gemini-1.5-flash` for speed and cost-efficiency (free tier available).

## Proposed Changes

### Extension Structure

#### [MODIFY] [manifest.json](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/manifest.json)

- No major changes, just ensuring permissons.

#### [MODIFY] [popup.html](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/popup.html)

- Update "OpenAI API Key" label to "Google Gemini API Key".
- Update placeholder.

#### [MODIFY] [content.js](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/content.js)

- **Multi-Image Logic**: Instead of finding one `imageUrl`, find an array `imageUrls`.
- **Strategy**: Look for common gallery patterns (filmstrips, thumbnails, or the main carousel container). On FB, we might need to look for `img` tags within the specific parent container for the listing.

#### [MODIFY] [popup.js](file:///C:/Users/DELL/.gemini/antigravity/brain/ab269225-0d3e-47aa-9f8a-0f2fc34cde44/extension/popup.js)

- **API Endpoint**: Change to `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`.
- **Payload Construction**:

    ```json
    {
      "contents": [{
        "parts": [
          { "text": "..." },
          { "inline_data": { "mime_type": "image/jpeg", "data": "BASE64..." } } // Gemini prefers base64 or file uri, but for extension, we might need to fetch and base64 encode or pass URLs if supported?
        ]
      }]
    }
    ```

    *Note*: Gemini API often requires Base64 for images if not using Google Cloud Storage. Passing direct public URLs is not always supported in the `inline_data` field directly without downloading.
    *Refined Plan*: The extension will need to `fetch` the image URLs in `popup.js` (or `background.js` to avoid CORS), convert them to Base64, and then send them to Gemini.

## Verification Plan

1. **Test Scraper**: Run updated scraper on the Royal Enfield page and check if it gets multiple distinct image URLs.
2. **Test API**: Mock the "Generate" click and verify the payload sent to Google matches their API spec.
