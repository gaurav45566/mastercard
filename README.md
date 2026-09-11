# Dodo Checkout — Take-home submission

A tiny embeddable checkout: one script a merchant drops on their site,
a hosted checkout app that opens in an iframe, and a demo store that
proves it all works end to end.

## Live demo
https://dodo-checkout-3new.vercel.app/demo-site/

## Folder structure

dodo-checkout/
├── sdk/                    The ONE file a merchant includes
│   ├── src/dodo-checkout.ts
│   └── dist/dodo-checkout.js
├── checkout-app/           Hosted separately, runs inside the iframe
│   ├── src/checkout.ts
│   ├── dist/checkout.js
│   ├── index.html
│   └── styles.css
├── demo-site/              A fake merchant store using the SDK
│   ├── index.html
│   └── demo.js
└── README.md

## How to run it locally

Two servers on two different ports — this makes the postMessage
security boundary real instead of pretend.

Terminal 1 (checkout app on its own origin):
    cd checkout-app
    npx http-server -p 5174

Terminal 2 (demo site + sdk on a different origin, from repo root):
    npx http-server -p 5173

Then open http://localhost:5173/demo-site/ and click Buy now.

## Test cards

| Card                  | Result                          |
|-----------------------|-----------------------------------|
| 4242 4242 4242 4242   | Succeeds                        |
| 4000 0000 0000 0002   | Declines                        |
| 4000 0000 0000 0341   | Fails once, succeeds on retry    |

## How the pieces talk to each other

merchant page                 iframe (Dodo's origin)
DodoCheckout.open({...})
  -> renders overlay + iframe
  -> iframe loads checkout-app
                               on load, posts DODO_READY
  <- receives DODO_READY
  -> replies with DODO_INIT { productId } via postMessage
                               <- receives DODO_INIT
                               -> looks up product, renders form
                               (customer fills email + card, hits Pay)
                               -> fake-charges card locally
                               -> posts DODO_SUCCESS / DODO_ERROR
  <- receives message, validates event.origin + event.source
  -> calls onSuccess / onError
  -> on success/close, removes iframe

1. The merchant's JS never touches card data. The card form lives
   entirely inside the iframe, served from a different origin. Only a
   productId goes in, and a sessionId/error code comes out.

2. Every message is origin-checked, both ways. The SDK only acts on
   messages whose event.origin matches the checkout app's known
   origin and whose event.source is the exact iframe it created. The
   checkout app pins trustedParentOrigin to whichever origin sent the
   first DODO_INIT, so it won't accept spoofed messages afterward.

productId travels via postMessage after a DODO_READY handshake, not
as a URL query param, so it never sits in browser history or logs.

## Decisions I went back and forth on

1. Should a declined card close the checkout, or let the customer
retry in place? I initially had every error also close the checkout.
I changed my mind: a decline isn't fatal, it's just information — so
the checkout stays open with an inline error and a "Try again" option,
and only closes for genuinely unrecoverable states. The merchant's
onError still fires every time either way.

2. How much should the merchant be able to customize the checkout? I
considered exposing a theme/locale option in open(). I decided against
it: every extra option is another way for a merchant to make the
checkout look inconsistent or untrustworthy. Kept the public API to
exactly productId + three callbacks, and noted theming as a
"what's next" instead.

## Weird states handled

- Double-click Buy -> isOpen flag, second open() call is a no-op
- Double-submit Pay -> button disabled + guarded while submitting
- Declined / retry-then-succeed cards -> inline error, not a dead end
- Unknown productId -> fatal state, but onClose/onError still fire
- User bails (Escape / backdrop / X button) -> onClose fires with a reason
- Background scroll locked while checkout is open, restored on close

## What I'd explore next

- Real focus trapping inside the iframe
- Wire up the stubbed DODO_RESIZE message to measure content height
- A session token per open() call so stale callbacks can't fire
- A real way to simulate a mid-payment network drop
- Theming/locale options, scoped tightly (signed merchant config)

## Time spent

Roughly within the 6-9 hour target.