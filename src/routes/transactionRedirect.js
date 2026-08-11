const express = require('express');
const prisma = require('../config/prisma');
const { renderCheckoutPopupPage } = require('../utils/redirectPage');

const router = express.Router();

// GET /api/v1/transaction/redirect/:reference
// The customer's browser lands here right after your site calls /initialize — this
// is the URL /initialize now returns as `checkoutUrl`. It shows a brief branded
// "taking you to checkout" page for ~2.5s, then opens Paystack's checkout as a
// Popup (InlineJS `resumeTransaction`) right on top of this same page — no
// navigation away to Paystack's own domain, now held for 10 seconds so the
// branded interstitial has time to be seen before the popup opens. The page
// stays exactly where it is for as long as the customer is on the popup, and
// only moves on to
// /return/:reference once the popup itself reports the transaction is resolved
// (paid, closed, or errored).
//
// Public and unauthenticated for the same reason /return/:reference is — it's a
// plain browser navigation, and a browser can't sign requests. It only ever hands
// the browser the access_code Paystack itself generated for this exact
// reference; it never accepts or exposes an arbitrary destination.
router.get('/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const txn = await prisma.transaction.findUnique({ where: { reference } });

    if (!txn || !txn.authorizationUrl || !txn.paystackAccessCode) {
      return res.status(404).send('Transaction not found.');
    }

    // Don't send a customer on to Paystack for a transaction that's already been
    // decided — send them straight through the normal return flow instead so they
    // see the correct success/failure state rather than reopening a stale checkout.
    if (txn.status !== 'PENDING') {
      return res.redirect(302, `/api/v1/transaction/return/${reference}`);
    }

    return res.status(200).send(
      renderCheckoutPopupPage({
        accessCode: txn.paystackAccessCode,
        reference,
        fallbackUrl: txn.authorizationUrl,
        heading: 'Redirecting to checkout',
      })
    );
  } catch (err) {
    console.error('Redirect handler error for', req.params.reference, err.message);
    res.status(500).send(
      `Something went wrong starting your payment. Please contact support with reference: ${req.params.reference}`
    );
  }
});

module.exports = router;
