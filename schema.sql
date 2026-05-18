DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  costPrice INTEGER NOT NULL,
  stock INTEGER NOT NULL,
  minStock INTEGER NOT NULL,
  image TEXT,
  barcode TEXT UNIQUE
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  customerName TEXT NOT NULL,
  total INTEGER NOT NULL,
  amountPaid INTEGER NOT NULL,
  change INTEGER NOT NULL,
  items TEXT NOT NULL
);

DROP TABLE IF EXISTS cash_flow;

CREATE TABLE cash_flow (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL
);
