// Deriv Signal Bot - Fully Updated script.js

const connection = new WebSocket(
  "wss://ws.binaryws.com/websockets/v3?app_id=1089"
);

let ticks = [];
let cooldown = false;
let currentMarket = "R_100";
let currentTradeType = "even_odd";

const tickCountDisplay = document.getElementById("tickCount");
const evenOddPercentDisplay = document.getElementById("evenOddPercent");
const signalBox = document.getElementById("signalBox");
const lastDigitsBox = document.getElementById("lastDigitsBox");
const vowelBox = document.getElementById("vowelBox");
const analyzeBtn = document.getElementById("analyzeBtn");

const marketDropdown = document.getElementById("market");
const tradeTypeDropdown = document.getElementById("tradeType");

marketDropdown.addEventListener("change", () => {
  currentMarket = marketDropdown.value;
  updateChart();
  subscribeTicks();
});

tradeTypeDropdown.addEventListener("change", () => {
  currentTradeType = tradeTypeDropdown.value;
});

analyzeBtn.addEventListener("click", () => {
  if (!cooldown) {
    analyzeTicks();
  }
});

function updateChart() {
  const chartFrame = document.getElementById("chart");
  chartFrame.src = `https://charts.binary.com/?l=EN&market=${currentMarket}&theme=light`;
}

function subscribeTicks() {
  connection.send(JSON.stringify({ forget_all: "tick" }));
  connection.send(JSON.stringify({ ticks: currentMarket }));
  ticks = [];
}

connection.onopen = () => {
  console.log("Connected to Deriv WebSocket");
  subscribeTicks();
};

connection.onmessage = function (msg) {
  const data = JSON.parse(msg.data);
  if (data.tick) {
    const lastDigit = Number(data.tick.quote.toString().slice(-1));
    ticks.push(lastDigit);
    if (ticks.length > 15) ticks.shift();
    tickCountDisplay.textContent = `Ticks: ${ticks.length}`;
    updateLastDigits();
    if (!cooldown) analyzeTicks();
  }
};

function updateLastDigits() {
  lastDigitsBox.innerHTML = ticks.map((d) => `<span>${d}</span>`).join(" ");
  vowelBox.innerHTML = ticks
    .map((d) => `<span>${[0, 2, 4, 6, 8].includes(d) ? "E" : "O"}</span>`)
    .join(" ");
}

function analyzeTicks() {
  if (ticks.length < 10) return;

  const evenDigits = ticks.filter((d) => d % 2 === 0).length;
  const oddDigits = ticks.length - evenDigits;

  const evenPercent = Math.round((evenDigits / ticks.length) * 100);
  const oddPercent = Math.round((oddDigits / ticks.length) * 100);
  evenOddPercentDisplay.textContent = `Even: ${evenPercent}% | Odd: ${oddPercent}%`;

  if (currentTradeType === "even_odd") {
    detectEvenOddSignal(evenPercent, oddPercent);
  }
}

function detectEvenOddSignal(evenPercent, oddPercent) {
  const pattern = ticks.map((d) => (d % 2 === 0 ? "E" : "O")).join("");

  if (/O{4,}E/.test(pattern) && evenPercent >= 11) {
    showSignal("TRADE EVEN");
  } else if (/E{4,}O/.test(pattern) && oddPercent >= 11) {
    showSignal("TRADE ODD");
  }
}

function showSignal(message) {
  signalBox.textContent = message;
  signalBox.style.backgroundColor = "gold";
  cooldown = true;
  setTimeout(() => {
    cooldown = false;
    signalBox.textContent = "No signal yet";
    signalBox.style.backgroundColor = "";
  }, 10000); // 10 second cooldown
}
// Update chart based on selected market
document.getElementById("market").addEventListener("change", () => {
  const market = document.getElementById("market").value;
  const chartFrame = document.getElementById("chart");
  chartFrame.src = `https://charts.binary.com/?l=EN&market=${market}&theme=light&type=candle&style=colored_bar&interval=60`;
});
