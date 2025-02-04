class StockWidget {
  constructor() {
    this.widget = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.initialize();
  }

  initialize() {
    this.createWidget();
    this.setupEventListeners();
    this.loadInitialData();
  }

  createWidget() {
    this.widget = document.createElement('div');
    this.widget.id = 'vns-stock-widget'; // Updated ID with vns prefix
    this.widget.innerHTML = `
      <div class="widget-header">
        <div class="widget-title">VN Stocks</div>
        <div class="widget-controls">
          <button class="widget-minimize">_</button>
          <button class="widget-close">×</button>
        </div>
      </div>
      <div class="widget-content-wrapper">
        <div class="widget-content"></div>
      </div>
    `;
    document.body.appendChild(this.widget);

    // Improved drag handling
    const header = this.widget.querySelector(".widget-header");

    header.addEventListener("mousedown", (e) => {
      if (!e.target.closest(".widget-controls")) {
        this.isDragging = true;
        const rect = this.widget.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        // Prevent text selection while dragging
        e.preventDefault();

        // Add dragging class for styling
        this.widget.classList.add("dragging");
      }
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        const x = Math.max(
          0,
          Math.min(
            e.clientX - this.dragOffset.x,
            window.innerWidth - this.widget.offsetWidth
          )
        );
        const y = Math.max(
          0,
          Math.min(
            e.clientY - this.dragOffset.y,
            window.innerHeight - this.widget.offsetHeight
          )
        );

        this.widget.style.left = `${x}px`;
        this.widget.style.top = `${y}px`;
        this.widget.style.right = "auto";
        this.widget.style.bottom = "auto";
      }
    });

    document.addEventListener("mouseup", () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.widget.classList.remove("dragging");
      }
    });
  }

  setupEventListeners() {
    // Close button
    this.widget.querySelector(".widget-close").addEventListener("click", () => {
      chrome.storage.local.set({ showWidget: false });
      this.widget.classList.add("hidden");
    });

    // Minimize button
    let isMinimized = false;
    this.widget
      .querySelector(".widget-minimize")
      .addEventListener("click", () => {
        const content = this.widget.querySelector(".widget-content");
        if (isMinimized) {
          content.style.display = "block";
          this.widget.querySelector(".widget-minimize").textContent = "_";
        } else {
          content.style.display = "none";
          this.widget.querySelector(".widget-minimize").textContent = "□";
        }
        isMinimized = !isMinimized;
      });

    // Listen for storage changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.stockData) {
        this.updateWidget(changes.stockData.newValue);
      }
      if (changes.showWidget) {
        this.widget.classList.toggle("hidden", !changes.showWidget.newValue);
      }
    });
  }

  async loadInitialData() {
    const { stockData, showWidget } = await chrome.storage.local.get([
      "stockData",
      "showWidget",
    ]);
    if (stockData) {
      this.updateWidget(stockData);
    }
    this.widget.classList.toggle("hidden", showWidget === false);
  }

  updateWidget(stockData) {
    const content = this.widget.querySelector(".widget-content");
    content.innerHTML = Object.entries(stockData)
      .map(([code, data]) => {
        const changeClass =
          data.change > 0
            ? "positive"
            : data.change < 0
            ? "negative"
            : "neutral";
        const changeText = data.change > 0 ? `+${data.change}` : data.change;

        return `
          <div class="widget-stock-item ${changeClass}">
            <div class="widget-stock-header">
              <span class="widget-stock-code">${code}</span>
              <span class="widget-stock-price">${new Intl.NumberFormat(
                "vi-VN"
              ).format(data.price)}</span>
            </div>
            <div class="widget-stock-change">${changeText}%</div>
          </div>
        `;
      })
      .join("");
  }
}

// Initialize the widget
new StockWidget();
