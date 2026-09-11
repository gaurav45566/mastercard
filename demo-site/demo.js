const buyBtn = document.getElementById("buyBtn");
const logEl = document.getElementById("log");

function log(tag, message) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="log-time">${time}</span><span class="tag ${tag}">${tag}</span> — ${message}`;
  logEl.prepend(entry);
}

buyBtn.addEventListener("click", () => {
  DodoCheckout.open({
    productId: "prod_123",
    onSuccess: ({ sessionId }) => {
      log("success", `payment succeeded, sessionId=${sessionId}`);
    },
    onClose: ({ reason }) => {
      log("close", `checkout closed, reason=${reason}`);
    },
    onError: ({ code, message }) => {
      log("error", `${code}: ${message}`);
    },
  });
});

log("DODO_READY", "waiting for customer to click Buy…");