import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { SquareClient, SquareEnvironment } from "square";
import { randomUUID } from "crypto";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN ?? "",
  environment: process.env.SQUARE_ENVIRONMENT === "production"
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Save a Square card on file — called at booking time to convert the nonce into a reusable card
  app.post("/api/square/save-card", async (req, res) => {
    try {
      const { nonce, name, email } = req.body as { nonce: string; name: string; email: string };
      if (!nonce || !name) {
        return res.status(400).json({ error: "nonce and name are required" });
      }

      const customerResult = await squareClient.customers.create({
        givenName: name,
        emailAddress: email ?? undefined,
        idempotencyKey: randomUUID(),
      });
      const customerId = customerResult.customer?.id;
      if (!customerId) throw new Error("Failed to create Square customer");

      const cardResult = await squareClient.cards.create({
        idempotencyKey: randomUUID(),
        sourceId: nonce,
        card: { customerId },
      });
      const cardId = cardResult.card?.id;
      if (!cardId) throw new Error("Failed to save card on file");

      res.json({ square_customer_id: customerId, square_card_id: cardId });
    } catch (err: any) {
      console.error("save-card error:", err);
      const message = err?.errors?.[0]?.detail ?? err?.message ?? "Failed to save card";
      res.status(400).json({ error: message });
    }
  });

  // Charge a stored card — called from the Staff Dashboard for late cancellation fees
  app.post("/api/square/charge", async (req, res) => {
    try {
      const { square_customer_id, square_card_id, party_size } = req.body as {
        square_customer_id: string;
        square_card_id: string;
        party_size: number;
      };
      if (!square_customer_id || !square_card_id || !party_size) {
        return res.status(400).json({ error: "square_customer_id, square_card_id, and party_size are required" });
      }

      const amountYen = party_size * 3000;
      const locationId = process.env.VITE_SQUARE_LOCATION_ID;
      if (!locationId) throw new Error("VITE_SQUARE_LOCATION_ID is not set");

      const result = await squareClient.payments.create({
        sourceId: square_card_id,
        idempotencyKey: randomUUID(),
        amountMoney: { amount: BigInt(amountYen), currency: "JPY" },
        customerId: square_customer_id,
        locationId,
      });

      const paymentId = result.payment?.id;
      res.json({ success: true, charge_id: paymentId, amount_yen: amountYen });
    } catch (err: any) {
      console.error("charge error:", err);
      const message = err?.errors?.[0]?.detail ?? err?.message ?? "Charge failed";
      res.status(400).json({ error: message });
    }
  });

  // Proxy route for weather
  app.get("/api/weather", async (req, res) => {
    try {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) {
        throw new Error("OPENWEATHER_API_KEY environment variable is missing.");
      }
      const city = req.query.city || "Niseko,jp";
      const lang = req.query.lang || "en";

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}&lang=${lang}`
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data.message || "Weather API error" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching weather:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
