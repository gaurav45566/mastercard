"use strict";
const PRODUCTS = {
    prod_123: { name: "Pro Plan — Monthly", price: "$29.00", blurb: "Billed monthly. Cancel anytime." },
};
let trustedParentOrigin = null;
function post(msg) {
    const target = trustedParentOrigin !== null && trustedParentOrigin !== void 0 ? trustedParentOrigin : "*";
    window.parent.postMessage(msg, target);
}
const retryState = new Map();
function normalizeCard(raw) {
    return raw.replace(/\s+/g, "");
}
function chargeCard(cardNumber) {
    const card = normalizeCard(cardNumber);
    return new Promise((resolve) => {
        setTimeout(() => {
            var _a;
            if (card === "4242424242424242") {
                resolve({ ok: true, sessionId: `sess_${Math.random().toString(36).slice(2, 11)}` });
                return;
            }
            if (card === "4000000000000002") {
                resolve({ ok: false, code: "card_declined", message: "Your card was declined." });
                return;
            }
            if (card === "4000000000000341") {
                const attempts = ((_a = retryState.get(card)) !== null && _a !== void 0 ? _a : 0) + 1;
                retryState.set(card, attempts);
                if (attempts === 1) {
                    resolve({ ok: false, code: "processing_error", message: "Payment failed. Please try again." });
                }
                else {
                    resolve({ ok: true, sessionId: `sess_${Math.random().toString(36).slice(2, 11)}` });
                }
                return;
            }
            resolve({ ok: false, code: "invalid_card", message: "That card number isn't recognized in this demo." });
        }, 900);
    });
}
const root = document.getElementById("root");
let state = { step: "loading" };
let email = "";
let cardNumber = "";
let expiry = "";
let cvc = "";
function render() {
    root.innerHTML = "";
    if (state.step === "loading") {
        root.appendChild(el("div", "center-msg", "Loading checkout…"));
        return;
    }
    if (state.step === "fatal") {
        const wrap = el("div", "center-msg fatal");
        wrap.appendChild(el("p", "", state.message));
        const closeBtn = el("button", "btn btn-secondary", "Close");
        closeBtn.onclick = () => post({ type: "DODO_CLOSE", reason: "fatal_error" });
        wrap.appendChild(closeBtn);
        root.appendChild(wrap);
        return;
    }
    if (state.step === "success") {
        const wrap = el("div", "center-msg success");
        wrap.appendChild(el("div", "check-icon", "✓"));
        wrap.appendChild(el("h2", "", "Payment successful"));
        wrap.appendChild(el("p", "muted", `Session ${state.sessionId}`));
        root.appendChild(wrap);
        return;
    }
    const { product, submitting, error } = state;
    const header = el("div", "header");
    const closeX = el("button", "close-x", "×");
    closeX.setAttribute("aria-label", "Close checkout");
    closeX.onclick = () => post({ type: "DODO_CLOSE", reason: "user_closed" });
    header.appendChild(closeX);
    root.appendChild(header);
    const productCard = el("div", "product-card");
    productCard.appendChild(el("div", "product-name", product.name));
    productCard.appendChild(el("div", "product-price", product.price));
    productCard.appendChild(el("div", "product-blurb", product.blurb));
    root.appendChild(productCard);
    const form = document.createElement("form");
    form.className = "form";
    form.noValidate = true;
    form.appendChild(field("Email", "email", "you@example.com", email, (v) => (email = v), "email"));
    form.appendChild(field("Card number", "card", "4242 4242 4242 4242", cardNumber, (v) => (cardNumber = v), "text", "cc-number"));
    const row = el("div", "row");
    row.appendChild(field("Expiry", "expiry", "MM/YY", expiry, (v) => (expiry = v), "text", "cc-exp"));
    row.appendChild(field("CVC", "cvc", "123", cvc, (v) => (cvc = v), "text", "cc-csc"));
    form.appendChild(row);
    if (error) {
        const errBox = el("div", "error-box");
        errBox.appendChild(el("span", "", error));
        const retryBtn = el("button", "retry-link", "Try again");
        retryBtn.type = "button";
        retryBtn.onclick = () => {
            state = { step: "form", product, submitting: false, error: undefined };
            render();
        };
        errBox.appendChild(retryBtn);
        form.appendChild(errBox);
    }
    const payBtn = el("button", "btn btn-primary", submitting ? "Processing…" : `Pay ${product.price}`);
    payBtn.type = "submit";
    payBtn.disabled = submitting;
    form.appendChild(payBtn);
    form.onsubmit = async (e) => {
        e.preventDefault();
        if (submitting)
            return;
        const validationError = validate();
        if (validationError) {
            state = { step: "form", product, submitting: false, error: validationError };
            render();
            return;
        }
        state = { step: "form", product, submitting: true, error: undefined };
        render();
        try {
            const result = await chargeCard(cardNumber);
            if (result.ok) {
                state = { step: "success", sessionId: result.sessionId };
                render();
                post({ type: "DODO_SUCCESS", sessionId: result.sessionId });
            }
            else {
                post({ type: "DODO_ERROR", code: result.code, message: result.message });
                state = { step: "form", product, submitting: false, error: result.message };
                render();
            }
        }
        catch (_a) {
            const message = "Something went wrong. Check your connection and try again.";
            post({ type: "DODO_ERROR", code: "network_error", message });
            state = { step: "form", product, submitting: false, error: message };
            render();
        }
    };
    root.appendChild(form);
    const footer = el("div", "footer", "Test mode — no real charge will be made.");
    root.appendChild(footer);
}
function validate() {
    if (!email.includes("@"))
        return "Enter a valid email address.";
    const digits = normalizeCard(cardNumber);
    if (digits.length < 13)
        return "Enter a valid card number.";
    if (!/^\d{2}\/\d{2}$/.test(expiry))
        return "Enter expiry as MM/YY.";
    if (!/^\d{3,4}$/.test(cvc))
        return "Enter a valid CVC.";
    return undefined;
}
function field(label, id, placeholder, value, onInput, type = "text", autocomplete) {
    const wrap = el("div", "field");
    const lbl = el("label", "field-label", label);
    lbl.setAttribute("for", `dodo-${id}`);
    wrap.appendChild(lbl);
    const input = document.createElement("input");
    input.id = `dodo-${id}`;
    input.className = "field-input";
    input.type = type;
    input.placeholder = placeholder;
    input.value = value;
    if (autocomplete)
        input.autocomplete = autocomplete;
    input.oninput = () => onInput(input.value);
    wrap.appendChild(input);
    return wrap;
}
function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className)
        node.className = className;
    if (text !== undefined)
        node.textContent = text;
    return node;
}
window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "DODO_INIT")
        return;
    trustedParentOrigin = event.origin;
    const product = PRODUCTS[data.productId];
    if (!product) {
        state = { step: "fatal", message: `Unknown product "${data.productId}".` };
        render();
        return;
    }
    state = { step: "form", product, submitting: false };
    render();
});
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape")
        post({ type: "DODO_CLOSE", reason: "user_escape" });
});
render();
post({ type: "DODO_READY" });
