document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('api-key');
    const saveKeyBtn = document.getElementById('save-key');
    const setupSection = document.getElementById('setup-section');
    const mainSection = document.getElementById('main-section');
    const generateBtn = document.getElementById('generate-btn');
    const resultText = document.getElementById('result-text');
    const statusMsg = document.getElementById('status-msg');
    const styleSelect = document.getElementById('negotiation-style');
    const copyBtn = document.getElementById('copy-btn');

    // Scraped data placeholders
    const itemNameSpan = document.getElementById('item-name');
    const itemPriceSpan = document.getElementById('item-price');
    const scrapedDataContainer = document.getElementById('scraped-data');

    let currentProduct = null;

    // Load saved key
    chrome.storage.sync.get(['openai_api_key'], (result) => {
        if (result.openai_api_key) {
            apiKeyInput.value = result.openai_api_key;
            showMainSection();
        }
    });

    saveKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            chrome.storage.sync.set({ openai_api_key: key }, () => {
                statusMsg.innerText = "API Key saved!";
                setTimeout(() => statusMsg.innerText = "", 2000);
                showMainSection();
            });
        }
    });

    const analyzeBtn = document.getElementById('analyze-btn');
    const generationControls = document.getElementById('generation-controls');

    function showMainSection() {
        setupSection.classList.add('hidden');
        mainSection.classList.remove('hidden');
        // Do NOT scrape automatically. Wait for user.
    }

    // The scraper function to be injected (SELF-CONTAINED)
    function domScraper() {
        let product = {
            title: "Unknown Item",
            price: null,
            description: "",
            imageUrls: [],
            scraped: false
        };

        // CRITICAL FIX: Target the Facebook Marketplace Modal (Dialog)
        // When you click an item, it opens in a popup overlay. We MUST Scrape only inside this.
        let scope = document;
        const dialog = document.querySelector('div[role="dialog"]');

        // If a dialog is open and looks like a product view (has an image or H1), use it.
        if (dialog && (dialog.querySelector('h1') || dialog.querySelector('img'))) {
            scope = dialog;
            // console.log("Marketplace Negotiator: Scoping to Dialog/Modal");
        }

        // 1. Get Title
        // Prioritize visible H1 (common in SPA/Modals)
        const h1 = scope.querySelector('h1');
        if (h1) {
            product.title = h1.innerText;
        } else {
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) product.title = ogTitle.content;
        }

        // Clean up title (remove "Marketplace - " prefix if present)
        product.title = product.title.replace(/^Marketplace\s?[–-]\s?/, '');

        // 2. Get Price
        // In the modal, price is usually close to H1.
        // We will look for <span> or <div> text that matches price regex within the scope.
        const priceRegex = /^[\s₹$£€]*([\d,]+(\.\d{2})?)[\s]*$/;

        // Get all text nodes in scope
        const allTextElems = Array.from(scope.querySelectorAll('span, div, h2, h3'));

        // Find elements that look like a price
        let potentialPrices = allTextElems
            .filter(el => el.children.length === 0 && el.innerText && priceRegex.test(el.innerText))
            .map(el => ({ el, txt: el.innerText.trim() }));

        // Filter out price if it IS the title (edge case) or empty
        potentialPrices = potentialPrices.filter(p => p.txt !== product.title);

        if (potentialPrices.length > 0) {
            if (h1) {
                // If we have a title, pick the price vertically closest to it
                const h1Rect = h1.getBoundingClientRect();
                potentialPrices.sort((a, b) => {
                    const rectA = a.el.getBoundingClientRect();
                    const rectB = b.el.getBoundingClientRect();
                    const distA = Math.abs(rectA.top - h1Rect.top) + Math.abs(rectA.left - h1Rect.left);
                    const distB = Math.abs(rectB.top - h1Rect.top) + Math.abs(rectB.left - h1Rect.left);
                    return distA - distB;
                });
            }
            product.price = potentialPrices[0].txt;
        }

        if (!product.price) {
            // Fallback to JSON-LD but ONLY if we are not in a modal (JSON-LD is usually for the background page)
            if (scope === document) {
                const jsonLd = document.querySelector('script[type="application/ld+json"]');
                if (jsonLd) {
                    try {
                        const data = JSON.parse(jsonLd.innerText);
                        if (data.offers && data.offers.price) {
                            product.price = data.offers.price + (data.offers.priceCurrency || "");
                        }
                    } catch (e) { }
                }
            }
        }

        if (!product.price) product.price = "Unknown Price";

        // 3. Get Description
        // Look for "Seller's description" header in the scope
        const headers = Array.from(scope.querySelectorAll('span, div, h2, h3'));
        const descHeader = headers.find(e => {
            const text = e.innerText.trim().toLowerCase();
            return text === 'description' || text === "seller's description" || text === 'details';
        });

        if (descHeader) {
            // The description is usually in the next significant sibling or container
            // Simple heuristic: sibling
            if (descHeader.nextElementSibling) {
                product.description = descHeader.nextElementSibling.innerText;
            } else if (descHeader.parentElement && descHeader.parentElement.nextElementSibling) {
                // sometimes header is wrapped in a div, and desc is in next div
                product.description = descHeader.parentElement.nextElementSibling.innerText;
            }
        }

        if (!product.description && scope === document) {
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) product.description = ogDesc.content;
        }

        // 4. Get Images
        const allImages = Array.from(scope.querySelectorAll('img'))
            .filter(img => img.width > 200 && img.height > 200)
            .map(img => img.src);
        product.imageUrls = [...new Set(allImages)].slice(0, 5);

        product.scraped = !!(product.title);
        return product;
    }

    analyzeBtn.addEventListener('click', async () => {
        statusMsg.innerText = "Analyzing page...";
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: domScraper
                });

                if (results && results[0] && results[0].result) {
                    const response = results[0].result;
                    if (response.scraped) {
                        currentProduct = response;
                        itemNameSpan.innerText = response.title.substring(0, 30) + "...";
                        itemPriceSpan.innerText = response.price;

                        // Reveal controls
                        scrapedDataContainer.classList.remove('hidden');
                        generationControls.classList.remove('hidden');
                        analyzeBtn.classList.add('hidden'); // Hide analyze button after success
                        statusMsg.innerText = "";
                    } else {
                        statusMsg.innerText = "Could not find product info. Is this a listing?";
                    }
                }
            } catch (err) {
                statusMsg.innerText = "Error injecting script: " + err.message;
            }
        });
    });

    generateBtn.addEventListener('click', async () => {
        // ... rest of generation logic remains the same ...
        // Ensure checking currentProduct
        if (!currentProduct) {
            statusMsg.innerText = "Please analyze the page first.";
            return;
        }
        // ...
        const style = styleSelect.value;
        const apiKey = apiKeyInput.value.trim();
        // ...


        statusMsg.innerText = "Generating negotiation...";
        generateBtn.disabled = true;

        try {
            const message = await callGemini(apiKey, style, currentProduct);
            resultText.value = message;
            copyBtn.classList.remove('hidden');
            statusMsg.innerText = "Done!";
        } catch (error) {
            statusMsg.innerText = "Error: " + error.message;
        } finally {
            generateBtn.disabled = false;
        }
    });

    copyBtn.addEventListener('click', () => {
        resultText.select();
        document.execCommand('copy');
        statusMsg.innerText = "Copied to clipboard!";
    });

    // Helper to fetch image and convert to Base64
    async function urlToBase64(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    // data:image/jpeg;base64,....
                    // We need just the base64 part for Gemini
                    const base64data = reader.result.split(',')[1];
                    const mimeType = reader.result.split(',')[0].split(':')[1].split(';')[0];
                    resolve({ mimeType, data: base64data });
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Failed to fetch image:", url, e);
            return null;
        }
    }

    async function callGemini(apiKey, style, product) {
        statusMsg.innerText = "Analyzing images & generating...";

        let userPrompt = `I want to buy "${product.title}" listed for ${product.price}. Description: "${product.description}". Write a negotiation message to the seller.`;

        if (style === 'aggressive') {
            userPrompt += " You are a unhinged, sarcastic, and ruthless negotiator. Channel the chaotic evil energy of Michael Reeves. Your goal is to rage-bait the seller with an insultingly low offer (30% of asking). Mock their photography and item condition creatively. Make personal attacks disguised as jokes (e.g., imply their parents are disappointed in them for owning this item). Gaslight them. Be funny, mean, and strictly between 50-150 words.";
        } else if (style === 'confused') {
            userPrompt += " You are a confused buyer who barely knows how to use the internet. Ask questions that don't make sense.";
        } else {
            userPrompt += " Be polite but firm on a lower price (approx 20% off).";
        }

        if (product.imageUrls && product.imageUrls.length > 0) {
            userPrompt += " I have attached images of the item. Use visual details from them (scratches, condition, color) to justify the price negotiation.";
        }

        // Language handling
        const language = document.getElementById('response-language').value;
        if (language !== 'Auto') {
            userPrompt += ` Write the response strictly in ${language}.`;
        } else {
            userPrompt += " Write the response in the same language as the listing description (default to English if unclear).";
        }

        // Prepare content parts
        const parts = [{ text: userPrompt }];

        // Fetch and attach images
        if (product.imageUrls) {
            for (const url of product.imageUrls) {
                const imgData = await urlToBase64(url);
                if (imgData) {
                    parts.push({
                        inline_data: {
                            mime_type: imgData.mimeType,
                            data: imgData.data
                        }
                    });
                }
            }
        }

        // Dynamic model selection to ensure compatibility
        async function getBestAvailableModel(apiKey) {
            try {
                const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                const listData = await listResponse.json();

                if (listData.models) {
                    // Look for gemini-1.5-flash variants first, then any gemini-1.5, then gemini-pro-vision
                    const availableModels = listData.models.filter(m =>
                        m.supportedGenerationMethods &&
                        m.supportedGenerationMethods.includes("generateContent")
                    );

                    const preferredOrder = [
                        "models/gemini-1.5-flash",
                        "models/gemini-1.5-flash-latest",
                        "models/gemini-1.5-flash-001",
                        "models/gemini-1.5-pro",
                        "models/gemini-pro-vision"
                    ];

                    for (const pref of preferredOrder) {
                        if (availableModels.find(m => m.name === pref)) {
                            return pref.replace('models/', ''); // API endpoint expects just name in some contexts, or full name? 
                            // The endpoint is .../models/{modelId}:generateContent
                            // formatted name is "models/gemini-1.5-flash"
                            // So we need just the "gemini-1.5-flash" part if we construct the URL as .../models/${modelId}...
                        }
                    }

                    // Fallback: take the first one that seems like a vision model or just the first one
                    const fallback = availableModels.find(m => m.name.includes('flash') || m.name.includes('vision'));
                    if (fallback) return fallback.name.replace('models/', '');

                    if (availableModels.length > 0) return availableModels[0].name.replace('models/', '');
                }
            } catch (e) {
                console.error("Failed to list models", e);
            }
            return "gemini-1.5-flash"; // Ultimate fallback
        }

        const modelId = await getBestAvailableModel(apiKey);
        statusMsg.innerText = `Generating using ${modelId}...`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts }]
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        return data.candidates[0].content.parts[0].text.trim();
    }
});
