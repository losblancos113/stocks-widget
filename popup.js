// Utility functions
const formatPrice = (price) => new Intl.NumberFormat("vi-VN").format(price);
const formatPercentage = (percent) =>
  `${percent > 0 ? "+" : ""}${percent.toFixed(2)}%`;
const getColorClass = (value) =>
  value > 0 ? "positive" : value < 0 ? "negative" : "neutral";

// Stock list management
class StockManager {
  constructor() {
    this.initialize();
  }

  async initialize() {
    this.setupEventListeners();
    await this.loadStocks();
    this.loadWidgetPreference();
  }

  setupEventListeners() {
    document
      .getElementById("addStock")
      .addEventListener("click", () => this.addStock());
    document
      .getElementById("clearStocks")
      .addEventListener("click", () => this.clearStocks());
    document.getElementById("stockInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.addStock();
    });
    document.getElementById("widgetToggle").addEventListener("change", (e) => {
      chrome.storage.local.set({ showWidget: e.target.checked });
    });
  }

  async loadStocks() {
    const { stocks, stockData } = await chrome.storage.local.get([
      "stocks",
      "stockData",
    ]);
    if (stocks) {
      this.renderStockList(stocks, stockData || {});
    }
  }

  loadWidgetPreference() {
    chrome.storage.local.get("showWidget", (data) => {
      document.getElementById("widgetToggle").checked =
        data.showWidget !== false;
    });
  }

  async addStock() {
    const input = document.getElementById("stockInput");
    const stockCode = input.value.trim().toUpperCase();

    if (!stockCode) return;

    const { stocks = [] } = await chrome.storage.local.get("stocks");
    if (!stocks.includes(stockCode)) {
      const newStocks = [...stocks, stockCode];
      await chrome.storage.local.set({ stocks: newStocks });
      input.value = "";

      // Trigger immediate data fetch
      await chrome.runtime.sendMessage({
        action: "fetchStockData",
        stocks: newStocks,
      });
      this.loadStocks();
    }
  }

  async removeStock(stockCode) {
    const { stocks } = await chrome.storage.local.get("stocks");
    const newStocks = stocks.filter((code) => code !== stockCode);
    await chrome.storage.local.set({ stocks: newStocks });
    this.loadStocks();
  }

  async clearStocks() {
    await chrome.storage.local.set({ stocks: [], stockData: {} });
    document.getElementById("stockList").innerHTML = "";
  }

  renderStockList(stocks, stockData) {
    const stockList = document.getElementById("stockList");
    stockList.innerHTML = stocks
      .map((code) => {
        const data = stockData[code] || {};
        const changeClass = getColorClass(data.change || 0);

        return `
        <div class="stock-item ${changeClass}">
          <div class="stock-header">
            <span class="stock-code">${code}</span>
            <button class="remove-button" data-stock-code="${code}">×</button>
          </div>
          <div class="stock-details">
            <div class="price">${
              data.price ? formatPrice(data.price) : "---"
            }</div>
            <div class="change ${changeClass}">
              ${data.change ? formatPercentage(data.change) : "---"}
            </div>
          </div>
          <div class="stock-info">
            <div>Vol: ${data.volume ? formatPrice(data.volume) : "---"}</div>
            <div>${data.tradingTime || "--:--:--"}</div>
          </div>
        </div>
      `;
      })
      .join("");

    // Attach event listeners to remove buttons
    this.attachRemoveButtonListeners();
  }

  attachRemoveButtonListeners() {
    const removeButtons = document.querySelectorAll(".remove-button");
    removeButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const stockCode = e.target.getAttribute("data-stock-code");
        this.removeStock(stockCode);
      });
    });
  }
}

// Initialize the stock manager
const stockManager = new StockManager();

// Update market status
function updateMarketStatus() {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const marketTime = hour * 60 + minute;

  const morningStart = 9 * 60;
  const morningEnd = 11 * 60 + 30;
  const afternoonStart = 13 * 60;
  const afternoonEnd = 14 * 60 + 45;

  const status = document.getElementById("marketStatus");

  if (
    (marketTime >= morningStart && marketTime <= morningEnd) ||
    (marketTime >= afternoonStart && marketTime <= afternoonEnd)
  ) {
    status.textContent = "🟢 Market Open";
    status.className = "market-status open";
  } else {
    status.textContent = "🔴 Market Closed";
    status.className = "market-status closed";
  }
}

updateMarketStatus();
setInterval(updateMarketStatus, 60000);