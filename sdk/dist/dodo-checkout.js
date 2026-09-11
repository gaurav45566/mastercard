"use strict";
const CHECKOUT_ORIGIN = window.__DODO_CHECKOUT_ORIGIN__ || "http://localhost:5174";
const CHECKOUT_PATH = window.__DODO_CHECKOUT_PATH__ || "/index.html";
const CHECKOUT_URL = `${CHECKOUT_ORIGIN}${CHECKOUT_PATH}`;
let isOpen = false;
function buildOverlay() {
    const overlay = document.createElement("div");
    overlay.setAttribute("data-dodo-overlay", "true");
    Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(15, 15, 20, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: "999999",
        opacity: "0",
        transition: "opacity 160ms ease",
    });
    const iframe = document.createElement("iframe");
    iframe.src = CHECKOUT_URL;
    iframe.title = "Dodo Checkout";
    iframe.setAttribute("allow", "payment");
    Object.assign(iframe.style, {
        width: "420px",
        maxWidth: "94vw",
        height: "600px",
        maxHeight: "92vh",
        border: "0",
        borderRadius: "16px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        background: "#fff",
        transform: "translateY(12px) scale(0.98)",
        transition: "transform 200ms ease",
    });
    overlay.appendChild(iframe);
    return { overlay, iframe };
}
function openCheckout(options) {
    var _a;
    if (!options || !options.productId) {
        (_a = options === null || options === void 0 ? void 0 : options.onError) === null || _a === void 0 ? void 0 : _a.call(options, { code: "invalid_options", message: "productId is required." });
        return;
    }
    if (isOpen) {
        return;
    }
    isOpen = true;
    const { overlay, iframe } = buildOverlay();
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
        overlay.style.opacity = "1";
        iframe.style.transform = "translateY(0) scale(1)";
    });
    let closed = false;
    function cleanup() {
        if (closed)
            return;
        closed = true;
        isOpen = false;
        window.removeEventListener("message", onMessage);
        document.removeEventListener("keydown", onKeydown);
        overlay.style.opacity = "0";
        document.body.style.overflow = "";
        setTimeout(() => overlay.remove(), 160);
    }
    function onMessage(event) {
        var _a, _b, _c, _d;
        if (event.origin !== CHECKOUT_ORIGIN)
            return;
        if (event.source !== iframe.contentWindow)
            return;
        const data = event.data;
        if (!data || typeof data.type !== "string")
            return;
        switch (data.type) {
            case "DODO_READY": {
                const init = { type: "DODO_INIT", productId: options.productId };
                (_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.postMessage(init, CHECKOUT_ORIGIN);
                break;
            }
            case "DODO_SUCCESS":
                (_b = options.onSuccess) === null || _b === void 0 ? void 0 : _b.call(options, { sessionId: data.sessionId });
                cleanup();
                break;
            case "DODO_CLOSE":
                (_c = options.onClose) === null || _c === void 0 ? void 0 : _c.call(options, { reason: data.reason });
                cleanup();
                break;
            case "DODO_ERROR":
                (_d = options.onError) === null || _d === void 0 ? void 0 : _d.call(options, { code: data.code, message: data.message });
                break;
            case "DODO_RESIZE":
                iframe.style.height = `${data.height}px`;
                break;
        }
    }
    function onKeydown(e) {
        var _a;
        if (e.key === "Escape") {
            (_a = options.onClose) === null || _a === void 0 ? void 0 : _a.call(options, { reason: "user_escape" });
            cleanup();
        }
    }
    overlay.addEventListener("click", (e) => {
        var _a;
        if (e.target === overlay) {
            (_a = options.onClose) === null || _a === void 0 ? void 0 : _a.call(options, { reason: "backdrop_click" });
            cleanup();
        }
    });
    window.addEventListener("message", onMessage);
    document.addEventListener("keydown", onKeydown);
}
window.DodoCheckout = { open: openCheckout };
