class StockWidget {
  constructor() {
    this.widget = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.initialize();
  }

  initialize() {
    try {
      this.createWidget();
      this.setupEventListeners();
      this.loadInitialData();
    } catch (error) {
      console.error('Failed to initialize widget:', error);
    }
  }

  createWidget() {
    this.widget = document.createElement('div');
    this.widget.id = 'vns-stock-widget';
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

    // Drag handling
    const header = this.widget.querySelector('.widget-header');

    header.addEventListener('mousedown', (e) => {
      if (!e.target.closest('.widget-controls')) {
        this.isDragging = true;
        const rect = this.widget.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        e.preventDefault();
        this.widget.classList.add('dragging');
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const x = Math.max(0, Math.min(e.clientX - this.dragOffset.x,
          window.innerWidth - this.widget.offsetWidth));
        const y = Math.max(0, Math.min(e.clientY - this.dragOffset.y,
          window.innerHeight - this.widget.offsetHeight));

        this.widget.style.left = `${x}px`;
        this.widget.style.top = `${y}px`;
        this.widget.style.right = 'auto';
        this.widget.style.bottom = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.widget.classList.remove('dragging');
      }
    });
  }

  setupEventListeners() {
    // Close button
    this.widget.querySelector('.widget-close').addEventListener('click', () => {
      this.hideWidget();
    });

    // Minimize button
    let isMinimized = false;
    this.widget.querySelector('.widget-minimize').addEventListener('click', () => {
      const content = this.widget.querySelector('.widget-content-wrapper');
      if (isMinimized) {
        content.style.display = 'block';
        this.widget.querySelector('.widget-minimize').textContent = '_';
      } else {
        content.style.display = 'none';
        this.widget.querySelector('.widget-minimize').textContent = '□';
      }
      isMinimized = !isMinimized;
    });

    // Storage changes listener
    try {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
          if (changes.stockData) {
            this.updateWidget(changes.stockData.newValue);
          }
          if (changes.showWidget) {
            this.toggleWidgetVisibility(changes.showWidget.newValue);
          }
        }
      });
    } catch (error) {
      console.error('Failed to set up storage listener:', error);
    }
  }

  async loadInitialData() {
    try {
      const { stockData, showWidget } = await chrome.storage.local.get(['stockData', 'showWidget']);
      if (stockData) {
        this.updateWidget(stockData);
      }
      this.toggleWidgetVisibility(showWidget !== false);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      // Set default state
      this.toggleWidgetVisibility(true);
    }
  }

  hideWidget() {
    try {
      chrome.storage.local.set({ showWidget: false });
    } catch (error) {
      console.error('Failed to update storage:', error);
      // Fallback: just hide the widget visually
      this.toggleWidgetVisibility(false);
    }
  }

  toggleWidgetVisibility(show) {
    if (this.widget) {
      this.widget.classList.toggle('hidden', !show);
    }
  }

  updateWidget(stockData) {
    if (!this.widget) return;

    const content = this.widget.querySelector('.widget-content');
    if (!content) return;

    content.innerHTML = Object.entries(stockData || {})
      .map(([code, data]) => {
        const changeClass = data.change > 0 ? 'positive' : data.change < 0 ? 'negative' : 'neutral';
        const changeText = data.change > 0 ? `+${data.change}` : data.change;

        return `
          <div class="widget-stock-item ${changeClass}">
            <div class="widget-stock-header">
              <span class="widget-stock-code">${code}</span>
              <span class="widget-stock-price">${new Intl.NumberFormat('vi-VN').format(data.price)}</span>
            </div>
            <div class="widget-stock-change">${changeText}%</div>
          </div>
        `;
      })
      .join('');
  }
}

// Initialize the widget
try {
  new StockWidget();
} catch (error) {
  console.error('Failed to initialize StockWidget:', error);
}
