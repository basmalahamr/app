const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const bpmDisplay = document.getElementById('bpm');
const status = document.getElementById('status');
const timerEl = document.getElementById('timer');
const graph = document.getElementById('graph');
const graphCtx = graph.getContext('2d');

let brightnessData = [];
let peaks = [];
let lastPeak = 0;
let startTime;
let intervalId;

function startCamera() {
  navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false
  }).then((stream) => {
    video.srcObject = stream;
    video.play();
    startMeasurement();
  }).catch((e) => {
    status.textContent = "Camera access denied.";
    console.error(e);
  });
}

function getAverageBrightness() {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let sum = 0;
  for (let i = 0; i < frame.length; i += 4) {
    const r = frame[i], g = frame[i+1], b = frame[i+2];
    sum += (r + g + b) / 3;
  }
  return sum / (frame.length / 4);
}

function detectPeaks() {
  const windowSize = 5;
  const recent = brightnessData.slice(-windowSize);
  if (recent.length < windowSize) return;

  const [prev2, prev1, current, next1, next2] = recent.map(d => d.brightness);
  if (prev1 > prev2 && prev1 > current && prev1 > next1 && prev1 > next2) {
    const now = brightnessData[brightnessData.length - 3].time;
    if (now - lastPeak > 300) { // at least 300ms between peaks
      peaks.push(now);
      lastPeak = now;
    }
  }
}

function calculateBPM() {
  if (peaks.length < 2) return "--";
  const intervals = peaks.slice(1).map((t, i) => t - peaks[i]);
  const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.round(60000 / avgInterval);
}

function drawGraph() {
  const w = graph.width;
  const h = graph.height;
  graphCtx.clearRect(0, 0, w, h);

  graphCtx.strokeStyle = "#0f0";
  graphCtx.beginPath();
  const slice = brightnessData.slice(-w);
  for (let i = 0; i < slice.length; i++) {
    const val = slice[i].brightness;
    const y = h - (val / 255) * h;
    graphCtx.lineTo(i, y);
  }
  graphCtx.stroke();
}

function updateFrame() {
  const now = Date.now();
  const brightness = getAverageBrightness();
  brightnessData.push({ time: now, brightness });

  detectPeaks();
  drawGraph();

  // Calculate time left dynamically from startTime
  const elapsed = Math.floor((now - startTime) / 1000);
  const timeLeft = 60 - elapsed;

  if (timeLeft <= 0) {
    clearInterval(intervalId);
    const bpm = calculateBPM();
    bpmDisplay.textContent = bpm;
    status.textContent = "Measurement complete.";
    timerEl.textContent = "Time's up!";
  } else {
    timerEl.textContent = `${timeLeft} seconds remaining`;
    status.textContent = "Measuring... Hold still.";
  }
}

function startMeasurement() {
  brightnessData = [];
  peaks = [];
  lastPeak = 0;
  startTime = Date.now();
  bpmDisplay.textContent = "--";
  status.textContent = "Measuring...";
  timerEl.textContent = "60 seconds remaining";

  intervalId = setInterval(updateFrame, 100); // update every 100ms
}

function restartMeasurement() {
  clearInterval(intervalId);
  startMeasurement();
}

startCamera();
