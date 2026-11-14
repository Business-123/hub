// Minimal HTML-escaping for the couple of values still interpolated into the page
// (the destination URL, used only inside the meta-refresh / href attributes — never
// shown as visible text anymore).
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ICONS = {
  success: `<svg viewBox="0 0 80 80" class="icon"><circle class="ring" cx="40" cy="40" r="36"/><path class="mark" d="M24 41 L35 52 L57 28"/></svg>`,
  failed: `<svg viewBox="0 0 80 80" class="icon"><circle class="ring" cx="40" cy="40" r="36"/><path class="mark" d="M28 28 L52 52 M52 28 L28 52"/></svg>`,
  pending: `<svg viewBox="0 0 80 80" class="icon"><circle class="ring" cx="40" cy="40" r="36"/><path class="mark" d="M40 22 V42 L54 50"/></svg>`,
  redirect: `<svg viewBox="0 0 80 80" class="icon"><circle class="ring" cx="40" cy="40" r="36"/><path class="mark" d="M26 40 H50 M40 28 L52 40 L40 52"/></svg>`,
};

// Neutral palette — this hub serves many sites, so no site-specific branding.
const ACCENTS = {
  success: '#4caf84',
  failed: '#ef5a5a',
  pending: '#C78D10',
  redirect: '#DFA51A',
};

// Shared look for both interstitial pages — cream background, soft card, gold accent,
// Inter font. Deliberately carries no site name or logo.
const SHARED_HEAD = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<meta name="theme-color" content="#F8F5EF">`;

const SHARED_CSS = `
:root{
  --accent:#DFA51A;
  --background:#F8F5EF;--surface:#FFFDF9;--border:#E8E0D2;
  --text:#1E1B18;--text-secondary:#756F67;
}
*{margin:0;padding:0;box-sizing:border-box;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
html,body{height:100%}
body{
  min-height:100vh;display:flex;justify-content:center;align-items:center;padding:20px;
  background:var(--background);color:var(--text);-webkit-font-smoothing:antialiased;
}
.card{
  width:100%;max-width:360px;text-align:center;
  display:flex;flex-direction:column;align-items:center;gap:22px;
  padding:36px 28px 28px;
  background:var(--surface);border:1px solid var(--border);border-radius:20px;
  box-shadow:0 10px 24px rgba(68,52,30,.07);
  animation:rise .5s cubic-bezier(.4,0,.2,1) both;
}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
.icon-wrap{
  width:92px;height:92px;border-radius:50%;
  background:color-mix(in srgb,var(--status) 13%,transparent);
  display:flex;align-items:center;justify-content:center;
  animation:pop .5s cubic-bezier(.34,1.56,.64,1) both;
}
@supports not (background:color-mix(in srgb,red 10%,transparent)){.icon-wrap{background:rgba(223,165,26,.13)}}
@keyframes pop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}
.icon{width:60px;height:60px}
.ring{fill:none;stroke:var(--status);stroke-width:4;stroke-dasharray:226;stroke-dashoffset:226;
  animation:ring .5s ease-out .1s forwards}
@keyframes ring{to{stroke-dashoffset:0}}
.mark{fill:none;stroke:var(--status);stroke-width:5;stroke-linecap:round;stroke-linejoin:round;
  stroke-dasharray:60;stroke-dashoffset:60;animation:mark .35s ease-out .55s forwards}
@keyframes mark{to{stroke-dashoffset:0}}
h1{font-size:1.3rem;font-weight:700;letter-spacing:-.03em;color:var(--text);animation:fade .5s ease .5s both}
.dots{display:flex;gap:6px;animation:fade .5s ease .7s both}
.dots span{width:6px;height:6px;border-radius:50%;background:var(--accent);animation:bounce 1.1s ease-in-out infinite}
.dots span:nth-child(2){animation-delay:.15s}
.dots span:nth-child(3){animation-delay:.3s}
@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-6px);opacity:1}}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
a.fallback{
  font-size:.72rem;color:var(--text-secondary);text-decoration:underline;text-underline-offset:3px;
  animation:fade .5s ease 1.4s both;
}
a.fallback:hover{color:var(--text)}
`;


// A short, calm, single-message interstitial — no destination URL, host, or
// reference number shown. Just an animated status icon, one line of text, and an
// auto-continue a couple of seconds later (with an unobtrusive fallback link for
// no-JS/no-wait). Used both:
//   - BEFORE payment, handing the customer from the hub off to Paystack's checkout, and
//   - AFTER payment, handing the customer back from the hub to the merchant's redirectUrl.
function renderRedirectPage({ destinationUrl, icon, heading }) {
  const safeUrl = escapeHtml(destinationUrl);
  const accent = ACCENTS[icon] || ACCENTS.redirect;
  const svg = ICONS[icon] || ICONS.redirect;
  const safeHeading = escapeHtml(heading);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="refresh" content="2.5;url=${safeUrl}">
<title>${safeHeading}</title>
${SHARED_HEAD}
<style>
:root{--status:${accent}}${SHARED_CSS}</style>
</head>
<body>
<div class="card">
<div class="icon-wrap">${svg}</div>
<h1>${safeHeading}</h1>
<div class="dots"><span></span><span></span><span></span></div>
<a class="fallback" href="${safeUrl}">Tap here if you're not redirected</a>
</div>
</body>
</html>`;
}

// The BEFORE-payment page, specifically. Same visual shell as renderRedirectPage,
// but instead of a meta-refresh that navigates the browser away to Paystack's
// hosted checkout page, this one stays put and opens the Paystack Popup
// (InlineJS `resumeTransaction`) on top of itself after a short pause. Because
// it's a popup/modal rather than a navigation, this page never goes anywhere —
// it's still there underneath for the whole time the customer is on Paystack's
// checkout form, and only moves on once the popup reports the transaction is
// actually resolved (paid, closed, or errored).
//
// `accessCode` is the `access_code` Paystack returned when this transaction was
// initialized server-side — resumeTransaction() completes that exact same
// transaction in the browser, it doesn't start a new one. `fallbackUrl` is the
// authorization_url, used only if InlineJS fails to load or throws (slow
// network, ad-blocker, etc.) and for the visible no-JS link.
function renderCheckoutPopupPage({ accessCode, reference, fallbackUrl, heading }) {
  const safeFallback = escapeHtml(fallbackUrl);
  const accent = ACCENTS.redirect;
  const svg = ICONS.redirect;
  const safeHeading = escapeHtml(heading);

  // JSON.stringify (not escapeHtml) here — these three are embedded as JS string
  // literals inside the <script> block below, not as HTML/attribute text.
  const jsAccessCode = JSON.stringify(accessCode);
  const jsReturnPath = JSON.stringify(`/api/v1/transaction/return/${reference}`);
  const jsFallbackUrl = JSON.stringify(fallbackUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${safeHeading}</title>
${SHARED_HEAD}
<style>
:root{--status:${accent}}${SHARED_CSS}</style>
</head>
<body>
<div class="card">
<div class="icon-wrap">${svg}</div>
<h1>${safeHeading}</h1>
<div class="dots"><span></span><span></span><span></span></div>
<a class="fallback" href="${safeFallback}">Tap here if nothing happens</a>
</div>
<script>
(function () {
  var accessCode = ${jsAccessCode};
  var returnPath = ${jsReturnPath};
  var fallbackUrl = ${jsFallbackUrl};
  var MIN_DELAY_MS = 2500;

  var scriptReady = false;
  var delayElapsed = false;
  var launched = false;

  function goToReturn() {
    window.location.href = returnPath;
  }

  function goToFallback() {
    window.location.href = fallbackUrl;
  }

  function openPopup() {
    if (launched) return;
    launched = true;
    try {
      var popup = new PaystackPop();
      // resumeTransaction completes the SAME transaction this page already has
      // an access_code for — it doesn't start a new charge. This page is still
      // here underneath the whole time; we only navigate once InlineJS tells us
      // the transaction is actually done (paid, closed, or errored).
      popup.resumeTransaction(accessCode, {
        onSuccess: goToReturn,
        onClose: goToReturn,
        onError: goToFallback,
      });
    } catch (e) {
      goToFallback();
    }
  }

  function maybeLaunch() {
    if (scriptReady && delayElapsed) openPopup();
  }

  var s = document.createElement('script');
  s.src = 'https://js.paystack.co/v2/inline.js';
  s.async = true;
  s.onload = function () {
    scriptReady = true;
    maybeLaunch();
  };
  s.onerror = goToFallback;
  document.head.appendChild(s);

  setTimeout(function () {
    delayElapsed = true;
    maybeLaunch();
  }, MIN_DELAY_MS);

  // Last-resort safety net: if InlineJS never fires and the popup never opens
  // (e.g. blocked script, unexpected error swallowed somewhere), don't strand
  // the customer here forever.
  setTimeout(function () {
    if (!launched) goToFallback();
  }, MIN_DELAY_MS + 8000);
})();
</script>
</body>
</html>`;
}

module.exports = { escapeHtml, renderRedirectPage, renderCheckoutPopupPage };
