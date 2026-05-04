const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");


const app = express();
app.use(cors());
app.use(express.json());

console.log("ENV KEY:", process.env.STRIPE_SECRET_KEY);
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
console.log("STRIPE KEY EXISTS:", !!process.env.STRIPE_SECRET_KEY);

// Test
app.get("/", (req, res) => {
  res.send("BookLocal Stripe backend is running");
});

// 1) Tourist payment: HOLD money
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, bookingId, guideStripeAccountId } = req.body;

    if (!amount || amount < 50) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    if (!guideStripeAccountId) {
      return res.status(400).json({ error: "Missing guide Stripe account ID" });
    }

    const amountInCents = amount * 100;
    const platformFee = Math.round(amountInCents * 0.20);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      capture_method: "manual",
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: platformFee,
      transfer_data: {
        destination: guideStripeAccountId,
      },
      metadata: {
        bookingId: bookingId || "",
        platformFee: platformFee.toString(),
        guideShare: (amountInCents - platformFee).toString(),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("create-payment-intent error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 2) Complete service: CAPTURE money
app.post("/capture-payment", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Missing paymentIntentId" });
    }

    const captured = await stripe.paymentIntents.capture(paymentIntentId);

    res.json({
      success: true,
      status: captured.status,
      paymentIntentId: captured.id,
    });
  } catch (error) {
    console.error("capture-payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

// 3) Cancel/refund hold
app.post("/cancel-payment", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: "Missing paymentIntentId" });
    }

    const canceled = await stripe.paymentIntents.cancel(paymentIntentId);

    res.json({
      success: true,
      status: canceled.status,
      paymentIntentId: canceled.id,
    });
  } catch (error) {
    console.error("cancel-payment error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`BookLocal backend running on port ${PORT}`);
});