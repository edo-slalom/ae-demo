import express from "express";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(express.static(join(__dirname, "public")));

const now = Date.now();
const day = 86_400_000;

const orders = new Map([
  [
    "ORD-1001",
    {
      id: "ORD-1001",
      email: "alice@example.com",
      date: new Date(now - 10 * day),
      items: [
        { id: "ITEM-A", name: "Wireless Headphones", qty: 1, price: 89.99 },
        { id: "ITEM-B", name: "USB-C Cable", qty: 2, price: 12.99 },
      ],
      status: "delivered",
    },
  ],
  [
    "ORD-1002",
    {
      id: "ORD-1002",
      email: "bob@example.com",
      date: new Date(now - 45 * day),
      items: [{ id: "ITEM-C", name: "Phone Case", qty: 1, price: 24.99 }],
      status: "delivered",
    },
  ],
  [
    "ORD-1003",
    {
      id: "ORD-1003",
      email: "carol@example.com",
      date: new Date(now - 5 * day),
      items: [
        { id: "ITEM-D", name: "Laptop Stand", qty: 1, price: 49.99 },
        { id: "ITEM-E", name: "Mechanical Keyboard", qty: 1, price: 129.99 },
      ],
      status: "delivered",
    },
  ],
]);

const returns = new Map();

function daysOld(order) {
  return (Date.now() - new Date(order.date).getTime()) / day;
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.post("/returns/lookup", (req, res) => {
  const { orderNumber, email } = req.body ?? {};
  const order = orders.get(orderNumber);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.email !== email) return res.status(403).json({ error: "Email does not match order" });
  const age = daysOld(order);
  if (age > 30)
    return res.status(422).json({ error: "Return window has closed", daysOld: Math.floor(age) });
  res.json({ order, eligible: true, daysRemaining: Math.floor(30 - age) });
});

app.post("/returns", (req, res) => {
  const { orderNumber, email, items, reason } = req.body ?? {};
  const order = orders.get(orderNumber);
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.email !== email) return res.status(403).json({ error: "Email does not match order" });
  if (daysOld(order) > 30) return res.status(422).json({ error: "Return window has closed" });

  const id = "RA-" + randomUUID().slice(0, 8).toUpperCase();
  const record = {
    id,
    orderNumber,
    email,
    items,
    reason,
    status: "pending",
    shippingLabel: `https://shipping.example.com/label/${id}`,
    createdAt: new Date(),
  };
  returns.set(id, record);
  res.status(201).json(record);
});

app.get("/admin/returns", (req, res) => {
  res.json(Array.from(returns.values()));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
