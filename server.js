import express from "express";
import cors from "cors";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 Stripe init
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// 🔥 TEST ROUTE
app.get("/", (req, res) => {
  res.send("BookLocal Stripe backend is running");
});

// 🔥 CREATE PAYMENT INTENT (SODDA VERSION)
app.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount, bookingId } = req.body;

    if (!amount || amount < 1) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // Stripe cents ishlatadi
    const amountInCents = amount * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",

      // 🔥 MUHIM — HOLD SYSTEM
      capture_method: "manual",

      automatic_payment_methods: {
        enabled: true,
      },

      metadata: {
        bookingId: bookingId || "",
      },
    });

    console.log("✅ PaymentIntent created:", paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error("❌ Stripe error:", error.message);

    res.status(500).json({
      error: error.message,
    });
  }
});

// 🔥 PORT
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 BookLocal backend running on port ${PORT}`);
});