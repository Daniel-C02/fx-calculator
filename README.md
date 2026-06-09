# Forex Lot Size Calculator

An offline-first, high-performance client-side Forex Position Sizing and Risk Management application built entirely using modern Vanilla JS, HTML5, and CSS3.

---

## 📊 Overview

Effective risk management is the single most critical factor separating professional currency traders from amateurs. This tool automates optimal position-size management by assessing real-time pricing and calculating standard lot adjustments based on customizable capital boundaries.

This application is **entirely single-page and serverless**, engineered to run locally in any browser sandbox environment without installation configurations, compiling layers, or API tokens.

---

## ⚡ Core Features

* **Advanced Position-Sizing Engine**: Calculates exact position lot recommendations derived dynamically from live cross-currency components.
* **Live FX Integration Sync**: Connects to open global market registries using the public `Frankfurter API` via native client-side asynchronous fetch arrays.
* **Persistent Cache Fail-safes**: Persists custom git add .
* structural metrics (`Account Balance`, `Stop Loss`, `Preferred Pairs`) into client-side `localStorage`, maintaining calculation continuity when users refresh or close the browser window.
* **Cross-Pair Conversions**: Accurately computes true USD values per pip for exotic and minor pairs (such as `EUR/GBP` or `GBP/JPY`) by cross-referencing quote assets directly against current USD base coefficients.
* **Responsive Dark Theme UI**: Clean dashboard optimized for readability on desktop and mobile viewports.

---

## 🛠️ Calculation Methodology

Position sizing operations are processed live inside the framework core using the following automated steps:

### Step 1: Capital Sizing at Risk
$$Risk\ Amount\ (USD) = Account\ Balance \times \left(\frac{Risk\ Percentage}{100}\right)$$

### Step 2: Implied Pip Value per Standard Lot
For standard currency accounts, a single lot comprises 100,000 units of the base asset. The value of a pip change fluctuates based on the pair's quote asset:
* **USD Quote Asset Pairs**: Fixed at **\$10.00 USD** per pip.
* **JPY Quote Asset Pairs**: Base standard value changes to **1,000 JPY**.
* **Cross Currency Pairs**: Convert quote values to USD equivalents using live exchange data:
$$\text{Pip Value (USD)} = \frac{\text{Base Pip Unit (10 or 1,000)}}{\text{Exchange Rate of USD/Quote}}$$

### Step 3: Recommended Lot Sizing Allocation
$$\text{Position Lot Size} = \frac{\text{Risk Amount (USD)}}{\text{Stop Loss (Pips)} \times \text{Pip Value per Lot (USD)}}$$

---

## 🧩 Supported Assets

The platform initializes natively with the following global currency options:
* `EUR/USD` (Euro / US Dollar)
* `AUD/USD` (Australian Dollar / US Dollar)
* `GBP/USD` (Great British Pound / US Dollar)
* `EUR/GBP` (Euro / Great British Pound)
* `EUR/JPY` (Euro / Japanese Yen)
* `EUR/CAD` (Euro / Canadian Dollar)
* `GBP/JPY` (Great British Pound / Japanese Yen)
* `GBP/AUD` (Great British Pound / Australian Dollar)
* `GBP/NZD` (Great British Pound / New Zealand Dollar)

---

## 🚀 Adding New Currency Pairs

The engine is engineered for instant horizontal scaling. To activate support for additional currency markets, append a new configuration item to the global array declaration inside `app.js`:

```js
const CURRENCY_PAIRS = [
    { label: "EUR/USD", base: "EUR", quote: "USD", isJpy: false },
    // To register a new asset, simply inject its structural attributes below:
    { label: "CHF/JPY", base: "CHF", quote: "JPY", isJpy: true }
];
# fx-calculator
