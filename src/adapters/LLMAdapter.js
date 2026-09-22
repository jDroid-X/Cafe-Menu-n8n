// ==========================================================
// WHATSAPP RESTAURANT MENU AI AGENT - DEMO v0.1
// Adapter: LLMAdapter (Mock Reasoning & Gemini Provider)
// Strict Rule Alignment: Images 1 & 2 (Rules 1 to 6)
// Brand: jDroid-X- CafeMenu
// ==========================================================

const RestaurantModel = require('../models/RestaurantModel');

class LLMAdapter {
    constructor(config = {}) {
        this.mode = config.mode || 'MOCK';
        this.apiKey = config.api_key || process.env.GEMINI_API_KEY || '';
        this.model = config.model || 'gemini-1.5-flash';
        this.temperature = config.temperature || 0.2;
        this.restaurantModel = new RestaurantModel();
    }

    getBrandName() {
        try {
            const conf = this.restaurantModel.getConfig();
            return conf?.restaurant_name || 'jDroid-X- CafeMenu';
        } catch (e) {
            return 'jDroid-X- CafeMenu';
        }
    }

    getOwnerPhone() {
        try {
            const conf = this.restaurantModel.getConfig();
            return conf?.contact_number || '+95 1224567890';
        } catch (e) {
            return '+95 1224567890';
        }
    }

    async generateResponse({ systemPrompt, historyText, userMessage, tools, session }) {
        if (this.mode === 'REAL' && this.apiKey) {
            try {
                return await this.callGemini({ systemPrompt, historyText, userMessage, tools });
            } catch (err) {
                console.warn('[LLMAdapter] Gemini API call failed, falling back to mock reasoning:', err.message);
            }
        }

        // Deterministic Agentic Engine executing Rules 1 - 6 from Images 1 & 2
        return this.executeMockAgenticEngine({ systemPrompt, historyText, userMessage, tools, session });
    }

    async callGemini({ systemPrompt, historyText, userMessage }) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
        const prompt = `${systemPrompt}\n\n### CONVERSATION HISTORY\n${historyText}\n\nCustomer: ${userMessage}\nAssistant:`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: this.temperature,
                    maxOutputTokens: 500
                }
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Gemini API Error: ${data.error?.message || response.statusText}`);
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return {
            reply: reply || 'Welcome to jDroid-X- CafeMenu 🍽️ How can I help you today?',
            decision: 'GEMINI_INFERENCE',
            toolsCalled: [],
            toolResults: []
        };
    }

    executeMockAgenticEngine({ systemPrompt, historyText, userMessage, tools, session }) {
        const text = userMessage.trim().toLowerCase();
        const toolsCalled = [];
        const toolResults = [];

        // ==========================================================
        // RULE 5: CANCEL ORDER (Image 1 & 2)
        // If user wants *cancel order*: Reply politely directing to owner
        // ==========================================================
        const isCancelIntent = /cancel|cancellation|stop\s+order|withdraw/i.test(text);
        if (isCancelIntent) {
            return {
                reply: `Sorry 🙏 I cannot cancel orders directly.\nPlease call the restaurant owner first and inform them.\nOwner Contact: ${this.getOwnerPhone()}`,
                decision: 'CANCEL_ORDER_REFUSED',
                toolsCalled,
                toolResults
            };
        }

        // ==========================================================
        // RULE 1: FIRST MESSAGE GREETING (Image 1)
        // When a user sends their first message (like hi, hello)
        // ==========================================================
        const isGreeting = /^(hi|hello|hey|namaste|good\s(morning|afternoon|evening)|start|yo|sup)\b/i.test(text);
        if (isGreeting && text.split(/\s+/).length <= 4) {
            return {
                reply: `Welcome to *${this.getBrandName()}* 🍽️\nHow can I help you today?\n- 🛒 *Place an order*\n- ℹ️ *FAQ / Information*\n- 📦 *Check order / stock*`,
                decision: 'RULE_1_GREETING',
                toolsCalled,
                toolResults
            };
        }

        // ==========================================================
        // RULE 4: CHECK ORDER OR CHECK STOCK (Image 1)
        // ==========================================================
        const isCheckOrder = /check\s+order|order\s+status|track\s+order|where\s+is\s+my\s+order|ord-\d+/i.test(text);
        const isCheckStock = /check\s+stock|available\s+quantity|how\s+much\s+stock|in\s+stock/i.test(text);

        if (isCheckOrder) {
            toolsCalled.push('Get Orders');
            // Extract order code if present
            const codeMatch = userMessage.match(/ORD-?\d+/i);
            const lookupQuery = codeMatch ? codeMatch[0] : (session?.customer_name || userMessage);

            let orderResult = null;
            if (tools.lookupOrder) {
                orderResult = tools.lookupOrder(lookupQuery);
            }

            if (orderResult) {
                toolResults.push({ tool: 'Get Orders', match: true, order: orderResult });
                return {
                    reply: `Your order *#${orderResult.order_code}* for *${orderResult.quantity} x ${orderResult.item_name}* is currently *${orderResult.status}*.\nPayment: *${orderResult.payment_status}*\nStatus note: ${orderResult.description || 'Order in progress'}`,
                    decision: 'CHECK_ORDER_FOUND',
                    toolsCalled,
                    toolResults
                };
            }

            return {
                reply: `Please provide your *Order ID* (e.g. *ORD-882101*) or your name so I can check your order status for you.`,
                decision: 'CHECK_ORDER_PROMPT_ID',
                toolsCalled,
                toolResults
            };
        }

        if (isCheckStock) {
            toolsCalled.push('Get Inventory');
            // Check specific item stock
            let targetFood = null;
            if (/vada\s*pav/i.test(text)) targetFood = 'Vada Pav';
            else if (/misal\s*pav/i.test(text)) targetFood = 'Misal Pav';
            else if (/paneer\s*tikka/i.test(text)) targetFood = 'Paneer Tikka Pav';
            else if (/chai|tea/i.test(text)) targetFood = 'Cutting Chai';
            else if (/mango\s*lassi|lassi/i.test(text)) targetFood = 'Mango Lassi';
            else if (/pav\s*bhaji/i.test(text)) targetFood = 'Butter Pav Bhaji';

            if (targetFood) {
                const stockCheck = tools.checkAvailability(targetFood);
                toolResults.push({ tool: 'Get Inventory', item: targetFood, result: stockCheck });
                if (stockCheck.available) {
                    return {
                        reply: `Stock check: We have *${stockCheck.item.quantity}* portions of *${targetFood}* available at *₹${stockCheck.item.price}* ✅`,
                        decision: 'CHECK_STOCK_ITEM_FOUND',
                        toolsCalled,
                        toolResults
                    };
                } else {
                    return {
                        reply: `Sorry, *${targetFood}* is currently *out of stock* ❌ (Available: 0).`,
                        decision: 'CHECK_STOCK_OUT_OF_STOCK',
                        toolsCalled,
                        toolResults
                    };
                }
            }

            // List all available food items with quantity if requested
            const availableItems = tools.getAvailableItems();
            toolResults.push({ tool: 'Get Inventory', count: availableItems.length, items: availableItems });
            const listText = availableItems.map(i => `• *${i.item_name}*: ${i.quantity} available (₹${i.price})`).join('\n');
            return {
                reply: `Current available stock at *${this.getBrandName()}*:\n${listText}\n\nTo order, say: *"[Your Name], [Quantity] [Item]"*`,
                decision: 'CHECK_STOCK_ALL_ITEMS',
                toolsCalled,
                toolResults
            };
        }

        // ==========================================================
        // RULE 3: FAQ (Image 1)
        // Short and clear: delivery time, payment method, restaurant hours
        // ==========================================================
        const isFAQQuery = /hour|time|timing|open|close|delivery|deliver|pay|payment|cod|upi|location|address|where|veg|vegetarian/i.test(text);
        if (isFAQQuery && !/order|want\s+\d+|two\s+|one\s+|three\s+/i.test(text)) {
            toolsCalled.push('Get FAQ');
            const faqMatch = tools.getFAQ(userMessage);
            if (faqMatch) {
                toolResults.push({ tool: 'Get FAQ', matchFound: true, question: faqMatch.question });
                return {
                    reply: `ℹ️ ${faqMatch.answer}\n\nWould you like to *place an order* or check our *menu*?`,
                    decision: 'FAQ_LOOKUP',
                    toolsCalled,
                    toolResults
                };
            }
        }

        // General Menu query
        const isMenuQuery = /menu|available|food|what\s+do\s+you\s+have|options|items|list/i.test(text);
        if (isMenuQuery && !/order|want|give|send/i.test(text)) {
            toolsCalled.push('Get Inventory');
            const availableItems = tools.getAvailableItems();
            toolResults.push({ tool: 'Get Inventory', count: availableItems.length, items: availableItems });

            let reply = `🍽️ *${this.getBrandName()} Available Menu*:\n\n`;
            availableItems.forEach(item => {
                reply += `• *${item.item_name}* - ₹${item.price} (${item.category})\n  _${item.description}_\n\n`;
            });
            reply += `To place an order, tell me your name and item, for example:\n*"John, 2 Vada Pav"*`;

            return {
                reply,
                decision: 'MENU_INVENTORY_QUERY',
                toolsCalled,
                toolResults
            };
        }

        // ==========================================================
        // RULE 2: ORDER FLOW (Image 1)
        // Ask step by step: name, food item, quantity
        // Verify inventory before confirming
        // Only confirmed orders go into Orders sheet / DB
        // ==========================================================
        const isOrderIntent = /order|want|give|buy|send|pack|parcel|pav|chai|lassi|bhaji/i.test(text);

        if (isOrderIntent) {
            // Customer Name detection from message or memory
            let customerName = session?.customer_name || '';

            const namePrefixMatch = userMessage.match(/(?:my name is|i am|name:)\s*([A-Za-z0-9\s]+?)(?:,|\.|\band\b|two|one|three|\d+|$)/i);
            if (namePrefixMatch && namePrefixMatch[1]) {
                customerName = namePrefixMatch[1].trim();
            } else {
                const commaMatch = userMessage.match(/^([A-Za-z0-9\s]{2,20}),\s*(.+)/i);
                if (commaMatch && !/^(hi|hello|please|i want)/i.test(commaMatch[1].trim())) {
                    customerName = commaMatch[1].trim();
                }
            }

            if (!customerName && historyText) {
                const histMatch = historyText.match(/(?:my name is|i am|Customer:)\s*([A-Za-z0-9\s]+?)(?:,|\.|\n|$)/i);
                if (histMatch && histMatch[1] && histMatch[1].trim().length > 1 && !/^(here|ready|ordering)/i.test(histMatch[1].trim())) {
                    customerName = histMatch[1].trim();
                }
            }

            // Food item detection
            let requestedItem = '';
            if (/vada\s*pav/i.test(text)) requestedItem = 'Vada Pav';
            else if (/misal\s*pav/i.test(text)) requestedItem = 'Misal Pav';
            else if (/paneer\s*tikka/i.test(text)) requestedItem = 'Paneer Tikka Pav';
            else if (/chai|tea/i.test(text)) requestedItem = 'Cutting Chai';
            else if (/mango\s*lassi|lassi/i.test(text)) requestedItem = 'Mango Lassi';
            else if (/pav\s*bhaji/i.test(text)) requestedItem = 'Butter Pav Bhaji';

            // Quantity detection
            let quantity = 0;
            const digitMatch = text.match(/\b(\d+)\b/);
            if (digitMatch) {
                quantity = parseInt(digitMatch[1], 10);
            } else if (/\bone\b/i.test(text)) quantity = 1;
            else if (/\btwo\b/i.test(text)) quantity = 2;
            else if (/\bthree\b/i.test(text)) quantity = 3;
            else if (/\bfour\b/i.test(text)) quantity = 4;
            else if (/\bfive\b/i.test(text)) quantity = 5;

            // Missing item step
            if (!requestedItem) {
                return {
                    reply: `Which item would you like to order? We currently have *Vada Pav*, *Misal Pav*, *Butter Pav Bhaji*, and *Cutting Chai* available!`,
                    decision: 'ORDER_UNKNOWN_ITEM',
                    toolsCalled,
                    toolResults
                };
            }

            // Tool: Check Inventory
            toolsCalled.push('Get Inventory');
            const stockCheck = tools.checkAvailability(requestedItem);
            toolResults.push({ tool: 'Get Inventory', item: requestedItem, result: stockCheck });

            // OUT OF STOCK REJECTION (Image 1 Rule 2)
            if (!stockCheck.available) {
                const alternatives = tools.getAvailableItems().map(i => `• *${i.item_name}* (₹${i.price})`).join('\n');
                return {
                    reply: `Sorry, *${requestedItem}* is out of stock ❌.\nAvailable options:\n${alternatives}`,
                    decision: 'ITEM_OUT_OF_STOCK_REFUSED',
                    toolsCalled,
                    toolResults
                };
            }

            // Missing Quantity step
            if (!quantity || quantity <= 0) {
                return {
                    reply: `How many *${requestedItem}* would you like to order? Please specify the quantity.`,
                    decision: 'ORDER_MISSING_QUANTITY',
                    toolsCalled,
                    toolResults
                };
            }

            // Missing Name step
            if (!customerName) {
                return {
                    reply: `Got it: ${quantity} x *${requestedItem}*. What is your name for the order?`,
                    decision: 'ORDER_MISSING_NAME',
                    toolsCalled,
                    toolResults
                };
            }

            // CONFIRMED ORDER (Image 1 Rule 2)
            toolsCalled.push('Post Orders');
            const orderResult = tools.postOrder({
                customer_name: customerName,
                customer_phone: session?.customer_phone || session?.customerPhone || '+91 9876543210',
                item_name: stockCheck.item.item_name,
                quantity: quantity,
                unit_price: stockCheck.item.price,
                total_amount: stockCheck.item.price * quantity,
                status: 'Confirmed',
                payment_status: 'Pending',
                description: 'Order accepted (item available)',
                source: 'MOCK'
            });
            toolResults.push({ tool: 'Post Orders', order: orderResult });

            return {
                reply: `Your order for *${requestedItem}* (${quantity} quantity) is confirmed ✅\nOrder Code: *#${orderResult.order_code}*\nTotal: *₹${orderResult.total_amount}*\nDescription: Order accepted (item available)\n\nThank you, *${customerName}*! We are preparing your fresh food right away.`,
                decision: 'ORDER_CONFIRMED_AND_SAVED',
                toolsCalled,
                toolResults
            };
        }

        // Default friendly fallback
        return {
            reply: `Welcome to *${this.getBrandName()}*! How can I assist you?\n- 🛒 Place an order\n- ℹ️ FAQ / Information\n- 📦 Check order / stock`,
            decision: 'DEFAULT_CONVERSATION',
            toolsCalled,
            toolResults
        };
    }
}

module.exports = LLMAdapter;
