interface DodoCheckoutOptions {
  productId: string;
  onSuccess?: (data: { sessionId: string }) => void;
  onClose?: (data: { reason: string }) => void;
  onError?: (data: { code: string; message: string }) => void;
}

type InboundMessage =
  | { type: "DODO_READY" }
  | { type: "DODO_SUCCESS"; sessionId: string }
  | { type: "DODO_CLOSE"; reason: string }
  | { type: "DODO_ERROR"; code: string; message: string }
  | { type: "DODO_RESIZE"; height: number };

type OutboundMessage = { type: "DODO_INIT"; productId: string };

const CHECKOUT_ORIGIN = (window as any).__DODO_CHECKOUT_ORIGIN__ || "http://localhost:5174";
const CHECKOUT_PATH = (window as any).__DODO_CHECKOUT_PATH__ || "/index.html";
const CHECKOUT_URL = `${CHECKOUT_ORIGIN}${CHECKOUT_PATH}`;
let isOpen = false;

function buildOverlay(): { overlay: HTMLDivElement; iframe: HTMLIFrameElement } {
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
  } as CSSStyleDeclaration);

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
  } as CSSStyleDeclaration);

  overlay.appendChild(iframe);
  return { overlay, iframe };
}

function openCheckout(options: DodoCheckoutOptions): void {
  if (!options || !options.productId) {
    options?.onError?.({ code: "invalid_options", message: "productId is required." });
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

  function cleanup(): void {
    if (closed) return;
    closed = true;
    isOpen = false;
    window.removeEventListener("message", onMessage);
    document.removeEventListener("keydown", onKeydown);
    overlay.style.opacity = "0";
    document.body.style.overflow = "";
    setTimeout(() => overlay.remove(), 160);
  }

  function onMessage(event: MessageEvent): void {
    if (event.origin !== CHECKOUT_ORIGIN) return;
    if (event.source !== iframe.contentWindow) return;

    const data = event.data as InboundMessage;
    if (!data || typeof data.type !== "string") return;

    switch (data.type) {
      case "DODO_READY": {
        const init: OutboundMessage = { type: "DODO_INIT", productId: options.productId };
        iframe.contentWindow?.postMessage(init, CHECKOUT_ORIGIN);
        break;
      }
      case "DODO_SUCCESS":
        options.onSuccess?.({ sessionId: data.sessionId });
        cleanup();
        break;
      case "DODO_CLOSE":
        options.onClose?.({ reason: data.reason });
        cleanup();
        break;
      case "DODO_ERROR":
        options.onError?.({ code: data.code, message: data.message });
        break;
      case "DODO_RESIZE":
        iframe.style.height = `${data.height}px`;
        break;
    }
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      options.onClose?.({ reason: "user_escape" });
      cleanup();
    }
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      options.onClose?.({ reason: "backdrop_click" });
      cleanup();
    }
  });

  window.addEventListener("message", onMessage);
  document.addEventListener("keydown", onKeydown);
}

(window as any).DodoCheckout = { open: openCheckout };