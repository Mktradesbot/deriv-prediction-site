// Fetch historical candles for higher timeframes like 30s, 1m, 2m
async function fetchCandles(market, granularity = 60, count = 50) {
  const response = await fetch("https://api.deriv.com/api/v1/price/candles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticks_history: market,
      style: "candles",
      count,
      end: "latest",
      granularity,
      subscribe: 0,
    }),
  });

  const data = await response.json();
  return data.candles || [];
}

// Analyze candles for basic trend (OHLC)
function analyzeCandleTrends(candles) {
  let up = 0,
    down = 0;

  candles.forEach((candle) => {
    if (candle.close > candle.open) up++;
    else if (candle.close < candle.open) down++;
  });

  const trend = up > down ? "RISE" : down > up ? "FALL" : "NEUTRAL";

  return { trend, confidence: (Math.abs(up - down) / candles.length) * 100 };
}
// ---- CONTINUATION: Analyze using OHLC candles for higher timeframes ----
async function analyzeUsingCandles(selectedMarket, timeframe) {
  const candleGranularity = {
    "30s": 30,
    "1m": 60,
    "2m": 120,
  };

  const granularity = candleGranularity[timeframe];
  if (!granularity) return;

  const socket = new WebSocket(
    "wss://ws.binaryws.com/websockets/v3?app_id=1089"
  );

  socket.onopen = function () {
    socket.send(
      JSON.stringify({
        ticks_history: selectedMarket,
        adjust_start_time: 1,
        count: 15,
        end: "latest",
        style: "candles",
        granularity: granularity,
      })
    );
  };

  socket.onmessage = function (msg) {
    const data = JSON.parse(msg.data);
    if (data.candles) {
      const candles = data.candles;
      let bullish = 0,
        bearish = 0;

      candles.forEach((candle) => {
        if (candle.close > candle.open) bullish++;
        else bearish++;
      });

      const total = bullish + bearish;
      const bullishPercent = ((bullish / total) * 100).toFixed(1);
      const bearishPercent = ((bearish / total) * 100).toFixed(1);

      const signalBox = document.getElementById("signal-box");

      if (bullish > bearish && bullishPercent > 55) {
        signalBox.innerText = `📈 Trade RISE – ${bullishPercent}% confidence`;
      } else if (bearish > bullish && bearishPercent > 55) {
        signalBox.innerText = `📉 Trade FALL – ${bearishPercent}% confidence`;
      } else {
        signalBox.innerText = "⚠️ Wait for a clear signal (No strong trend)";
      }
    }
    socket.close();
  };

  socket.onerror = function (e) {
    document.getElementById("signal-box").innerText =
      "❌ WebSocket error (candles)";
  };
}
// --- EXISTING FUNCTIONALITY (Rise/Fall prediction with digits) ---
const socket = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");

let tickData = [];
let market = "R_100";

function subscribeTicks(selectedMarket) {
  socket.send(
    JSON.stringify({
      ticks: selectedMarket,
    })
  );
}

function handleTickData(tick) {
  if (tickData.length >= 20) tickData.shift();
  tickData.push(tick);
  displayTickData();
}

function displayTickData() {
  const tickDisplay = document.getElementById("tick-data");
  tickDisplay.innerText = tickData.map((t) => t.quote.toFixed(5)).join("\n");
}

function predictRiseFall() {
  const signalBox = document.getElementById("signal-box");
  if (tickData.length < 15) {
    signalBox.innerText = "⚠️ Not enough data to analyze.";
    return;
  }

  let evens = 0,
    odds = 0;
  tickData.slice(-15).forEach((tick) => {
    const lastDigit = parseInt(tick.quote.toString().slice(-1));
    if (lastDigit % 2 === 0) evens++;
    else odds++;
  });

  const confidence = Math.round((Math.max(evens, odds) / 15) * 100);

  if (evens > odds) {
    signalBox.innerText = `📈 Trade RISE – ${confidence}% confidence`;
  } else if (odds > evens) {
    signalBox.innerText = `📉 Trade FALL – ${confidence}% confidence`;
  } else {
    signalBox.innerText = "⚠️ Wait for a clear signal.";
  }
}

// --- NEW FUNCTIONALITY: Candle analysis for 30s, 1m, 2m ---
function analyzeUsingCandles(selectedMarket, timeframe) {
  const candleGranularity = {
    "30s": 30,
    "1m": 60,
    "2m": 120,
  };

  const granularity = candleGranularity[timeframe];
  if (!granularity) return;

  const candleSocket = new WebSocket(
    "wss://ws.binaryws.com/websockets/v3?app_id=1089"
  );

  candleSocket.onopen = function () {
    candleSocket.send(
      JSON.stringify({
        ticks_history: selectedMarket,
        adjust_start_time: 1,
        count: 15,
        end: "latest",
        style: "candles",
        granularity: granularity,
      })
    );
  };

  candleSocket.onmessage = function (msg) {
    const data = JSON.parse(msg.data);
    if (data.candles) {
      const candles = data.candles;
      let bullish = 0,
        bearish = 0;

      candles.forEach((candle) => {
        if (candle.close > candle.open) bullish++;
        else bearish++;
      });

      const total = bullish + bearish;
      const bullishPercent = ((bullish / total) * 100).toFixed(1);
      const bearishPercent = ((bearish / total) * 100).toFixed(1);

      const signalBox = document.getElementById("signal-box");

      if (bullish > bearish && bullishPercent > 55) {
        signalBox.innerText = `📈 Trade RISE – ${bullishPercent}% confidence`;
      } else if (bearish > bullish && bearishPercent > 55) {
        signalBox.innerText = `📉 Trade FALL – ${bearishPercent}% confidence`;
      } else {
        signalBox.innerText = "⚠️ Wait for a clear signal (No strong trend)";
      }
    }
    candleSocket.close();
  };

  candleSocket.onerror = function () {
    document.getElementById("signal-box").innerText =
      "❌ WebSocket error (candles)";
  };
}

// --- COMBINED CLICK HANDLER ---
document
  .getElementById("analyze-button")
  .addEventListener("click", function () {
    const selectedMarket = document.getElementById("market-select").value;
    const selectedTimeframe = document.getElementById("timeframe-select").value;

    if (["30s", "1m", "2m"].includes(selectedTimeframe)) {
      analyzeUsingCandles(selectedMarket, selectedTimeframe);
    } else {
      predictRiseFall();
    }
  });

// --- INITIALIZE ---
document
  .getElementById("market-select")
  .addEventListener("change", function (e) {
    market = e.target.value;
    socket.send(JSON.stringify({ forget_all: "ticks" }));
    tickData = [];
    subscribeTicks(market);
  });

socket.onmessage = function (msg) {
  const data = JSON.parse(msg.data);
  if (data.tick) {
    handleTickData(data.tick);
  }
};
// ✅ CONTINUATION: Final, Stable Analysis Enhancer for script.js

// Ensure WebSocket connection to Deriv API (no need to reinitialize)
let socket;
if (!socket || socket.readyState !== 1) {
  socket = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");
}

// Global variables to track ticks
let tickHistory = [];
let currentMarket = "R_100";
let currentTimeframe = "1 tick";

// Listen to dropdowns only if they exist
const marketSelect = document.getElementById("market");
const timeframeSelect = document.getElementById("timeframe");
const analyzeButton = document.getElementById("analyze");
const signalBox = document.getElementById("signal");
const tickDisplay = document.getElementById("tick-history");

if (marketSelect && timeframeSelect) {
  marketSelect.addEventListener("change", (e) => {
    currentMarket = e.target.value;
    subscribeToMarket(currentMarket);
  });

  timeframeSelect.addEventListener("change", (e) => {
    currentTimeframe = e.target.value;
  });
}

if (analyzeButton) {
  analyzeButton.addEventListener("click", () => {
    if (tickHistory.length < 20) {
      signalBox.innerText = "⏳ Not enough data to analyze. Please wait...";
      return;
    }

    const result = analyzeMarket(tickHistory.slice(-20), currentTimeframe);
    signalBox.innerText = result.message;
  });
}

function subscribeToMarket(symbol) {
  if (socket.readyState !== 1) {
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ forget_all: "ticks" }));
      socket.send(JSON.stringify({ ticks: symbol }));
    });
  } else {
    socket.send(JSON.stringify({ forget_all: "ticks" }));
    socket.send(JSON.stringify({ ticks: symbol }));
  }
}

socket.onmessage = (msg) => {
  const data = JSON.parse(msg.data);
  if (data.tick) {
    const lastDigit = parseInt(data.tick.quote.toString().slice(-1));
    tickHistory.push({
      epoch: data.tick.epoch,
      quote: data.tick.quote,
      digit: lastDigit,
    });
    if (tickHistory.length > 100) tickHistory.shift();

    if (tickDisplay) {
      const sequence = tickHistory
        .slice(-20)
        .map((t) => t.digit)
        .join(" - ");
      tickDisplay.innerText = `Last 20 digits: ${sequence}`;
    }
  }
};

function analyzeMarket(ticks, timeframe) {
  let message = "⏳ Wait for a clear signal...";

  const evens = ticks.filter((t) => t.digit % 2 === 0).length;
  const odds = ticks.length - evens;

  // Rise/Fall logic by trend of digits
  if (evens >= 15 && ticks[ticks.length - 1].digit % 2 !== 0) {
    message = `📈 Trade RISE (Even Breakout) - Confidence: ${(
      (evens / ticks.length) *
      100
    ).toFixed(0)}%`;
  } else if (odds >= 15 && ticks[ticks.length - 1].digit % 2 === 0) {
    message = `📉 Trade FALL (Odd Breakout) - Confidence: ${(
      (odds / ticks.length) *
      100
    ).toFixed(0)}%`;
  }

  // Candlestick logic only for higher timeframes
  if (["30s", "1m", "2m"].includes(timeframe)) {
    const closes = ticks.map((t) => t.quote);
    const direction = closes[closes.length - 1] > closes[0] ? "RISE" : "FALL";
    const avgChange = (closes[closes.length - 1] - closes[0]) / closes.length;
    if (Math.abs(avgChange) > 0.05) {
      message = `🔍 ${
        direction === "RISE" ? "📈" : "📉"
      } Trade ${direction} - Candlestick Confidence: ${(
        Math.abs(avgChange) * 100
      ).toFixed(1)}%`;
    }
  }

  return { message };
}

// Initialize default market on load
subscribeToMarket(currentMarket);
