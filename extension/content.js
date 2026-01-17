// Basic scraper for generic usage, optimized for Facebook Marketplace structure as seen in video
// Note: Selectors are fragile and may need updates.

console.log("Marketplace Negotiator content script loaded.");

function scrapeProductDetails() {
    let product = {
        title: "Unknown Item",
        price: null,
        description: "",
        imageUrls: [],
        scraped: false
    };

    // 1. Get Title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const h1 = document.querySelector('h1');
    if (ogTitle) product.title = ogTitle.content;
    else if (h1) product.title = h1.innerText;

    // 2. Get Description
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) product.description = ogDesc.content;

    // Fallback: Look for the specifically named "Description" section usually found in marketplaces
    if (!product.description) {
        // Find elements containing "Description" or "Seller's description"
        const headers = Array.from(document.querySelectorAll('h2, h3, span, div'));
        const descHeader = headers.find(e => {
            const text = e.innerText.trim().toLowerCase();
            return text === 'description' || text === "seller's description" || text === 'details';
        });

        if (descHeader && descHeader.nextElementSibling) {
            product.description = descHeader.nextElementSibling.innerText;
        }
    }

    // 3. Get Price (Improved)
    // Approach: Look for currency symbols in text nodes, prioritizing those near the title.
    // Facebook Marketplace specifically often keeps price in the same container or near the title.

    // Try to find price via common JSON-LD first (most reliable if present)
    const jsonLd = document.querySelector('script[type="application/ld+json"]');
    if (jsonLd) {
        try {
            const data = JSON.parse(jsonLd.innerText);
            if (data.offers && data.offers.price) {
                product.price = data.offers.price + (data.offers.priceCurrency || "");
            }
        } catch (e) { }
    }

    if (!product.price) {
        // Regex search in visible text
        // Added support for Rupee (₹) and generic symbols
        const priceRegex = /^[\s₹$£€]*([\d,]+(\.\d{2})?)[\s]*$/;

        // OPTIMIZED: Search only specific text-likely elements instead of '*' to avoid CPU spikes/bot detection
        const potentialPrices = Array.from(document.querySelectorAll('span, div, p, h1, h2, h3, h4'))
            .filter(el => {
                // Check if it has direct text content matching regex
                return el.children.length === 0 && el.innerText && priceRegex.test(el.innerText);
            })
            .map(el => ({ el, txt: el.innerText.trim() }));

        // Heuristic: The correct price is usually the one with the largest font size or closest to the top/title
        if (potentialPrices.length > 0) {
            // Sort by font size (largest first) then by vertical position
            potentialPrices.sort((a, b) => {
                const rectA = a.el.getBoundingClientRect();
                const rectB = b.el.getBoundingClientRect();
                const sizeA = parseFloat(window.getComputedStyle(a.el).fontSize);
                const sizeB = parseFloat(window.getComputedStyle(b.el).fontSize);

                if (Math.abs(sizeA - sizeB) > 2) return sizeB - sizeA; // Larger font wins
                return rectA.top - rectB.top; // Higher up wins
            });
            product.price = potentialPrices[0].txt;
        }
    }

    if (!product.price) product.price = "Unknown Price";

    // 4. Get Images (Multi-image support)
    // Logic: Find all large images on the page.
    const allImages = Array.from(document.querySelectorAll('img'))
        .filter(img => {
            // Filter out small icons/avatars
            return img.width > 200 && img.height > 200;
        })
        .map(img => img.src);

    // Deduplicate and limit to top 5 images to avoid token overload
    product.imageUrls = [...new Set(allImages)].slice(0, 5);

    product.scraped = !!(product.title);

    return product;
}

// Listen for messages from Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scrape_page") {
        const data = scrapeProductDetails();
        sendResponse(data);
    }
});
