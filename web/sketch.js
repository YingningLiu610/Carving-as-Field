let socket;

let cols = 72;
let rows = 72;
let cellW, cellH;

let lowGrid = [];
let highGrid = [];
let high2Grid = [];

// Growth origins and current drawing positions
let lowCenter, highCenter, high2Center;
let lowCurrent, highCurrent, high2Current;

// Smoothed frequency band values from Max/MSP
let bassLevel = 0;
let highLevel = 0;
let high2Level = 0;

// Trigger thresholds
let bassThreshold = 0.03;
let highThreshold = 0.6;
let high2Threshold = 0.65;

// Active states for each layer
let lowActive = false;
let highActive = false;
let high2Active = false;

// Timing for each active drawing gesture
let lowStartTime = 0;
let highStartTime = 0;
let high2StartTime = 0;

let lowDuration = 0;
let highDuration = 0;
let high2Duration = 0;

let offsetX = 0;
let offsetY = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 255);
  noStroke();

  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";

  computeLayout();
  initGrids();
  initCenters();

  // Receive audio data from the local server
  socket = io();

  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("max-data", (data) => {
    bassLevel = lerp(bassLevel, data.bass || 0, 0.25);
    highLevel = lerp(highLevel, data.high || 0, 0.22);
    high2Level = lerp(high2Level, data.high2 || 0, 0.18);
  });
}

function draw() {
  background(40, 10, 95);

  updateLowBand();
  updateHighBand();
  updateHigh2Band();

  drawGrids();
}

// Calculate a responsive grid that fills the whole screen
function computeLayout() {
  let cellSize = min(windowWidth, windowHeight) / 72;

  cellW = cellSize;
  cellH = cellSize;

  cols = ceil(windowWidth / cellSize);
  rows = ceil(windowHeight / cellSize);

  offsetX = 0;
  offsetY = 0;
}

// Create three separate accumulation grids
function initGrids() {
  lowGrid = [];
  highGrid = [];
  high2Grid = [];

  for (let y = 0; y < rows; y++) {
    let lowRow = [];
    let highRow = [];
    let high2Row = [];

    for (let x = 0; x < cols; x++) {
      lowRow.push(0);
      highRow.push(0);
      high2Row.push(0);
    }

    lowGrid.push(lowRow);
    highGrid.push(highRow);
    high2Grid.push(high2Row);
  }
}

// Set three nearby but separate starting points
function initCenters() {
  let baseX = floor(random(20, cols - 20));
  let baseY = floor(random(20, rows - 20));

  lowCenter = {
    x: constrain(baseX - floor(random(6, 12)), 8, cols - 8),
    y: constrain(baseY - floor(random(4, 10)), 8, rows - 8)
  };

  highCenter = {
    x: constrain(baseX + floor(random(6, 12)), 8, cols - 8),
    y: constrain(baseY + floor(random(4, 10)), 8, rows - 8)
  };

  high2Center = {
    x: constrain(baseX + floor(random(-10, 10)), 8, cols - 8),
    y: constrain(baseY + floor(random(8, 14)), 8, rows - 8)
  };

  lowCurrent = { x: lowCenter.x, y: lowCenter.y };
  highCurrent = { x: highCenter.x, y: highCenter.y };
  high2Current = { x: high2Center.x, y: high2Center.y };
}

// Low-frequency layer: darker, heavier marks
function updateLowBand() {
  if (!lowActive && bassLevel > bassThreshold) {
    lowActive = true;
    lowStartTime = millis();
    lowCurrent = { x: lowCenter.x, y: lowCenter.y };
  }

  if (lowActive) {
    lowDuration = millis() - lowStartTime;
    showLowLayer();

    if (bassLevel < bassThreshold * 0.75) {
      lowActive = false;
      lowDuration = 0;
    }
  }
}

function showLowLayer() {
  let growCount = floor(map(lowDuration, 0, 4000, 1, 3, true));
  let density = floor(map(bassLevel, bassThreshold, 0.8, 1, 2, true));
  let alphaStep = floor(map(bassLevel, bassThreshold, 0.8, 4, 10, true));

  growLayer(lowCurrent, lowGrid, growCount, density, alphaStep, 1);
}

// First high-frequency layer: red marks
function updateHighBand() {
  if (!highActive && highLevel > highThreshold) {
    highActive = true;
    highStartTime = millis();
    highCurrent = { x: highCenter.x, y: highCenter.y };
  }

  if (highActive) {
    highDuration = millis() - highStartTime;
    showHighLayer();

    if (highLevel <= highThreshold * 0.82) {
      highActive = false;
      highDuration = 0;
    }
  }
}

function showHighLayer() {
  let growCount = floor(map(highDuration, 0, 4000, 1, 3, true));
  let density = floor(map(highLevel, highThreshold, 1.0, 1, 2, true));
  let alphaStep = floor(map(highLevel, highThreshold, 1.0, 4, 10, true));

  growLayer(highCurrent, highGrid, growCount, density, alphaStep, 2);
}

// Second high-frequency layer: smaller, brighter accents
function updateHigh2Band() {
  if (!high2Active && high2Level > high2Threshold) {
    high2Active = true;
    high2StartTime = millis();
    high2Current = { x: high2Center.x, y: high2Center.y };
  }

  if (high2Active) {
    high2Duration = millis() - high2StartTime;
    showHigh2Layer();

    if (high2Level <= high2Threshold * 0.8) {
      high2Active = false;
      high2Duration = 0;
    }
  }
}

function showHigh2Layer() {
  let growCount = floor(map(high2Duration, 0, 4000, 1, 2, true));
  let density = floor(map(high2Level, high2Threshold, 1.0, 1, 2, true));
  let alphaStep = floor(map(high2Level, high2Threshold, 1.0, 4, 10, true));

  growLayer(high2Current, high2Grid, growCount, density, alphaStep, 1);
}

// Shared growth function for all three layers
function growLayer(current, grid, growCount, densityCount, alphaStep, spread) {
  for (let i = 0; i < growCount; i++) {
    let nx = current.x + floor(random(-1, 2));
    let ny = current.y + floor(random(-1, 2));

    nx = constrain(nx, 1, cols - 2);
    ny = constrain(ny, 1, rows - 2);

    for (let k = 0; k < densityCount; k++) {
      let ox = nx + floor(random(-spread, spread + 1));
      let oy = ny + floor(random(-spread, spread + 1));

      if (inside(ox, oy)) {
        grid[oy][ox] += alphaStep;
        grid[oy][ox] = constrain(grid[oy][ox], 0, 255);
      }
    }

    current.x = nx;
    current.y = ny;
  }
}

// Draw the accumulated grid values as small rectangles
function drawGrids() {
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let px = offsetX + x * cellW;
      let py = offsetY + y * cellH;

      let aLow = lowGrid[y][x];
      if (aLow > 0) {
        drawCell(px, py, 0.6, color(8, 45, 25, aLow));
      }

      let aHigh = highGrid[y][x];
      if (aHigh > 0) {
        drawCell(px, py, 0.4, color(5, 85, 78, aHigh * 8));
      }

      let aHigh2 = high2Grid[y][x];
      if (aHigh2 > 0) {
        drawCell(px, py, 0.3, color(28, 85, 85, aHigh2));
      }
    }
  }
}

// Draw one centered rectangle inside a grid cell
function drawCell(px, py, scale, c) {
  fill(c);
  rect(
    px + cellW * (1 - scale) / 2,
    py + cellH * (1 - scale) / 2,
    cellW * scale,
    cellH * scale
  );
}

function inside(x, y) {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  computeLayout();
  initGrids();
  initCenters();
}