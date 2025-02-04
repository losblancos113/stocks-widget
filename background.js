const API_URL = 'https://iboard-query.ssi.com.vn/v2/stock/multiple';

// Fetch stock data
async function fetchStockData(stockCodes) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stocks: stockCodes
      })
    });

    const result = await response.json();
    
    if (result.code === 'SUCCESS' && result.data) {
      // Convert array to object with stock symbols as keys
      return result.data.reduce((acc, stock) => {
        acc[stock.ss] = {
          symbol: stock.ss,
          price: stock.lmp,           // Current price
          change: stock.cp,         // Change percentage
          high: stock.h,            // High price
          low: stock.l,             // Low price
          open: stock.o,            // Open price
          volume: stock.mtq,        // Market trade quantity
          tradingTime: stock.td,    // Trading time
          companyName: stock.ce     // Company name in English
        };
        return acc;
      }, {});
    }
    
    throw new Error(result.message || 'Failed to fetch stock data');
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return {};
  }
}

// Update stock data every 5 minutes
chrome.alarms.create('updateStocks', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateStocks') {
    try {
      console.log('Updating stock data...');
      const { stocks } = await chrome.storage.local.get('stocks');
      if (stocks && stocks.length > 0) {
        // Fetch all stocks in a single API call
        const stockData = await fetchStockData(stocks);
        await chrome.storage.local.set({ stockData });
        
        // Optional: Update badge or notification
        updateExtensionBadge(stockData);
      }
    } catch (error) {
      console.error('Error in alarm listener:', error);
    }
  }
});

// Optional: Function to update extension badge with latest stock info
function updateExtensionBadge(stockData) {
  if (Object.keys(stockData).length > 0) {
    // Example: Show the change percentage of the first stock
    const firstStock = Object.values(stockData)[0];
    const changeText = firstStock.change > 0 ? `+${firstStock.change}` : `${firstStock.change}`;
    chrome.action.setBadgeText({ text: changeText });
    chrome.action.setBadgeBackgroundColor({ 
      color: firstStock.change > 0 ? '#4CAF50' : '#F44336'
    });
  }
}

// Optional: Initial load when extension starts
chrome.runtime.onStartup.addListener(async () => {
  const { stocks } = await chrome.storage.local.get('stocks');
  if (stocks && stocks.length > 0) {
    const stockData = await fetchStockData(stocks);
    await chrome.storage.local.set({ stockData });
    updateExtensionBadge(stockData);
  }
});

// Add message listener for immediate fetch requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchStockData') {
    fetchStockData(message.stocks)
      .then(stockData => {
        chrome.storage.local.set({ stockData });
      })
      .catch(error => console.error('Error fetching stock data:', error));
  }
  return true; // Required for async response
});