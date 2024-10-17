// Get references to HTML elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gameMode = 'singleplayer'; // 'singleplayer' or 'multiplayer'
let currentPlayer = 'player1'; // 'player1' or 'player2'
let selectedTower = null;
let hoverTower = null;
let aiInterval;
let isPaused = false;

const vsAIButton = document.getElementById('vsAI');
const vsPlayerButton = document.getElementById('vsPlayer');
const difficultySelect = document.getElementById('difficulty');
const turnIndicator = document.getElementById('turnIndicator');
const gameInfo = document.getElementById('gameInfo');
const gameControls = document.getElementById('gameControls');
const pauseButton = document.getElementById('pauseButton');
const resumeButton = document.getElementById('resumeButton');
const restartButton = document.getElementById('restartButton');
const infoIcon = document.getElementById('infoIcon');
const gameLegend = document.getElementById('gameLegend');
const legendToggle = document.getElementById('legendToggle'); // Reference to the legend toggle button
const passButton = document.getElementById('passButton'); // Reference to the pass turn button
const undoButton = document.getElementById('undoButton'); // Reference to the undo button

let difficulty = 'medium';

// Game variables
const towers = [];
const obstacles = [];
const connections = [];
const units = [];
const playerPoints = {
  player1: 0,
  player2: 0,
};

let lastAction = null; // To store the last action for undo
let undoTimeout = null; // To store the undo timeout

// Load images
const towerImages = {
  player1: new Image(),
  player2: new Image(),
  ai: new Image(),
  neutral: new Image(),
};
towerImages.player1.src = 'images/player1_tower.png';
towerImages.player2.src = 'images/player2_tower.png';
towerImages.ai.src = 'images/ai_tower.png';
towerImages.neutral.src = 'images/neutral_tower.png';

const obstacleImage = new Image();
obstacleImage.src = 'images/obstacle.png';

// Event listeners for game mode selection
vsAIButton.addEventListener('click', () => {
  gameMode = 'singleplayer';
  startGame();
});

vsPlayerButton.addEventListener('click', () => {
  gameMode = 'multiplayer';
  startGame();
});

difficultySelect.addEventListener('change', (e) => {
  difficulty = e.target.value;
});

// Responsive canvas size
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);

// Tower Class
class Tower {
  constructor(x, y, owner = 'neutral', type = 'basic') {
    this.x = x;
    this.y = y;
    this.owner = owner; // 'player1', 'player2', 'ai', or 'neutral'
    this.strength = 10; // Start with some strength
    this.maxStrength = 20;
    this.type = type; // 'basic', 'archer', 'cannon', 'magic'
    this.isUnderAttack = false;
    this.incomingSupport = false;
  }

  draw() {
    const img =
      this.owner === 'player1' ? towerImages.player1 :
      this.owner === 'player2' ? towerImages.player2 :
      this.owner === 'ai' ? towerImages.ai : towerImages.neutral;

    ctx.drawImage(img, this.x - 20, this.y - 20, 40, 40);

    // Draw the strength text
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(this.strength), this.x, this.y);

    // Draw selection or hover ring
    if (this === selectedTower) {
      // Selection ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (this === hoverTower) {
      // Hover ring
      ctx.beginPath();
      ctx.arc(this.x, this.y, 25, 0, Math.PI * 2);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  recover() {
    // Base recovery rate
    let recoveryRate = 0.01;

    // Accelerate recovery if receiving support
    if (this.incomingSupport) {
      recoveryRate *= 2; // Adjust multiplier as needed
    }

    // Do not recover if under direct attack
    if (!this.isUnderAttack && this.strength < this.maxStrength) {
      this.strength += recoveryRate;
      if (this.strength > this.maxStrength) {
        this.strength = this.maxStrength;
      }
    }
  }
}

// Obstacle Class
class Obstacle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 40;
  }

  draw() {
    ctx.drawImage(obstacleImage, this.x, this.y, this.size, this.size);
  }
}

// Unit Class
class Unit {
  constructor(from, to, owner, isAttack) {
    this.from = from;
    this.to = to;
    this.owner = owner;
    this.isAttack = isAttack;
    this.progress = 0; // Value between 0 and 1
  }

  update() {
    this.progress += 0.01; // Adjust speed as needed
  }

  draw() {
    const x = this.from.x + (this.to.x - this.from.x) * this.progress;
    const y = this.from.y + (this.to.y - this.from.y) * this.progress;

    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle =
      this.owner === 'player1' ? 'blue' :
      this.owner === 'player2' ? 'green' : 'red';
    ctx.fill();
  }

  isAtDestination() {
    return this.progress >= 1;
  }
}

// Helper function to check for overlaps
function isOverlapping(x, y, radius, items) {
  for (let item of items) {
    let dx = x - item.x;
    let dy = y - item.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < radius + 30) {
      return true;
    }
  }
  return false;
}

// Initialize Towers and Obstacles
function initGame() {
  towers.length = 0;
  obstacles.length = 0;
  connections.length = 0;
  units.length = 0;
  playerPoints.player1 = 0;
  playerPoints.player2 = 0;
  currentPlayer = 'player1';
  lastAction = null;
  clearTimeout(undoTimeout);
  undoButton.style.display = 'none';

  // Adjust numbers based on difficulty
  let numNeutralTowers;
  let numObstacles;

  switch (difficulty) {
    case 'easy':
      numNeutralTowers = 13;
      numObstacles = 12;
      break;
    case 'medium':
      numNeutralTowers = 15;
      numObstacles = 13;
      break;
    case 'hard':
      numNeutralTowers = 18;
      numObstacles = 15;
      break;
    default:
      numNeutralTowers = 15;
      numObstacles = 13;
  }

  // Player towers
  towers.push(new Tower(100, canvas.height / 2, 'player1'));
  if (gameMode === 'singleplayer') {
    towers.push(new Tower(canvas.width - 100, canvas.height / 2, 'ai'));
  } else if (gameMode === 'multiplayer') {
    towers.push(new Tower(canvas.width - 100, canvas.height / 2, 'player2'));
  }

  // Neutral towers
  let attempts = 0;
  while (towers.length < numNeutralTowers + 2 && attempts < 100) {
    attempts++;
    const x = Math.random() * (canvas.width - 200) + 100;
    const y = Math.random() * (canvas.height - 200) + 100;
    if (!isOverlapping(x, y, 20, towers) && !isOverlappingWithObstacles(x, y, 20)) {
      const types = ['basic', 'archer', 'cannon', 'magic'];
      const type = types[Math.floor(Math.random() * types.length)];
      towers.push(new Tower(x, y, 'neutral', type));
    }
  }

  // Obstacles
  attempts = 0;
  while (obstacles.length < numObstacles && attempts < 100) {
    attempts++;
    const x = Math.random() * (canvas.width - 40);
    const y = Math.random() * (canvas.height - 40);
    if (!isOverlapping(x + 20, y + 20, 20, towers) && !isOverlappingRect(x, y, 40, obstacles)) {
      obstacles.push(new Obstacle(x, y));
    }
  }
}

// Helper function to check overlap with obstacles
function isOverlappingWithObstacles(x, y, radius) {
  for (let obstacle of obstacles) {
    if (circleIntersectsRect(x, y, radius, obstacle.x, obstacle.y, obstacle.size, obstacle.size)) {
      return true;
    }
  }
  return false;
}

// Helper function to check overlap between circles and rectangles
function circleIntersectsRect(cx, cy, radius, rx, ry, rw, rh) {
  let closestX = clamp(cx, rx, rx + rw);
  let closestY = clamp(cy, ry, ry + rh);

  let dx = cx - closestX;
  let dy = cy - closestY;

  return (dx * dx + dy * dy) < (radius * radius);
}

// Clamp function
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// Helper function to check rectangle overlaps
function isOverlappingRect(x, y, size, items) {
  for (let item of items) {
    if (
      x < item.x + item.size &&
      x + size > item.x &&
      y < item.y + item.size &&
      y + size > item.y
    ) {
      return true;
    }
  }
  return false;
}

// Start the Game
function startGame() {
  document.getElementById('menu').style.display = 'none';
  turnIndicator.style.display = 'block';
  gameControls.style.display = 'block';
  gameInfo.style.display = 'block';
  canvas.style.display = 'block';
  resizeCanvas();
  initGame();
  isPaused = false;
  pauseButton.style.display = 'inline-block';
  resumeButton.style.display = 'none';

  // Show the info icon, game legend, and legend toggle button
  infoIcon.style.display = 'block';
  gameLegend.style.display = 'block';
  legendToggle.style.display = 'inline-block'; // Show the legend toggle button
  legendToggle.textContent = 'Hide Legend'; // Set initial text

  passButton.style.display = 'inline-block'; // Show the pass turn button

  if (gameMode === 'singleplayer') {
    aiInterval = setInterval(aiTurn, 2000);
  } else {
    clearInterval(aiInterval);
    updateTurnIndicator();
  }

  gameLoop();
}

// Update Turn Indicator
function updateTurnIndicator() {
  if (gameMode === 'multiplayer') {
    turnIndicator.textContent = currentPlayer === 'player1' ? "Player 1's Turn" : "Player 2's Turn";
  } else {
    turnIndicator.textContent = '';
  }
}

// Update Game Information
function updateGameInfo() {
  const player1Towers = towers.filter(t => t.owner === 'player1').length;
  const player2Towers = towers.filter(t => t.owner === 'player2').length;
  const aiTowers = towers.filter(t => t.owner === 'ai').length;

  let infoText = '';

  if (gameMode === 'singleplayer') {
    infoText = `Your Towers: ${player1Towers} | AI Towers: ${aiTowers} | Your Points: ${playerPoints.player1}`;
  } else {
    infoText = `Player 1 Towers: ${player1Towers} | Player 2 Towers: ${player2Towers} | Player 1 Points: ${playerPoints.player1} | Player 2 Points: ${playerPoints.player2}`;
  }

  gameInfo.textContent = infoText;
}

// Adjust mouse coordinates relative to the canvas
function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX || e.touches[0].clientX) - rect.left,
    y: (e.clientY || e.touches[0].clientY) - rect.top
  };
}

// Event listeners for player interaction
canvas.addEventListener('mousedown', (e) => {
  const pos = getMousePos(e);
  handleMouseDown(pos.x, pos.y);
});

canvas.addEventListener('mouseup', (e) => {
  const pos = getMousePos(e);
  handleMouseUp(pos.x, pos.y);
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getMousePos(e);
  handleMouseMove(pos.x, pos.y);
});

function handleMouseDown(mouseX, mouseY) {
  let connectionClicked = false;

  // Check if the player clicked on a connection
  for (let i = 0; i < connections.length; i++) {
    const conn = connections[i];
    if (isPointOnLineSegment(mouseX, mouseY, conn.from.x, conn.from.y, conn.to.x, conn.to.y)) {
      // Remove the connection if it belongs to the current player
      if (conn.from.owner === currentPlayer || (gameMode === 'singleplayer' && conn.from.owner === 'player1')) {
        // Store the last action for undo
        lastAction = {
          type: 'removeConnection',
          connection: conn,
          index: i,
          player: currentPlayer,
        };

        connections.splice(i, 1);
        connectionClicked = true;

        // Show the undo button and set timeout
        showUndoOption();

        // Since removing a connection counts as a move, switch turns if in multiplayer mode
        if (gameMode === 'multiplayer') {
          currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
          updateTurnIndicator();
        }

        // In singleplayer mode, no need to switch currentPlayer, but we may need to trigger AI action
        break; // Exit the loop after removing the connection
      }
    }
  }

  if (connectionClicked) {
    return; // Do not proceed to select a tower if a connection was clicked
  }

  // Existing code to select towers
  towers.forEach((tower) => {
    if (tower.owner === currentPlayer || (gameMode === 'singleplayer' && tower.owner === 'player1')) {
      const dx = mouseX - tower.x;
      const dy = mouseY - tower.y;
      if (Math.sqrt(dx * dx + dy * dy) < 20) {
        selectedTower = tower;
      }
    }
  });
}

// Function to check if a point is on a line segment
function isPointOnLineSegment(px, py, x1, y1, x2, y2) {
  const tolerance = 5; // Adjust as needed for click detection sensitivity

  const dx = x2 - x1;
  const dy = y2 - y1;

  const lengthSquared = dx * dx + dy * dy;
  const dotProduct = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;

  if (dotProduct < 0 || dotProduct > 1) {
    return false;
  }

  const closestX = x1 + dotProduct * dx;
  const closestY = y1 + dotProduct * dy;

  const distanceSquared = (px - closestX) * (px - closestX) + (py - closestY) * (py - closestY);

  return distanceSquared < tolerance * tolerance;
}

function handleMouseUp(mouseX, mouseY) {
  if (selectedTower) {
    let connectionMade = false;
    towers.forEach((tower) => {
      if (tower !== selectedTower) {
        const dx = mouseX - tower.x;
        const dy = mouseY - tower.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
          if (!isObstacleBetween(selectedTower, tower)) {
            // Determine if the connection is an attack or support
            const isAttack = selectedTower.owner !== tower.owner;

            // Ensure towers have less than 2 connections and no existing connection
            const fromConnections = connections.filter(conn => conn.from === selectedTower).length;
            const existingConnection = connections.find(
              (conn) => conn.from === selectedTower && conn.to === tower
            );

            const MAX_CONNECTIONS_PER_TOWER = 3; // Adjust as needed

            if (fromConnections < MAX_CONNECTIONS_PER_TOWER && !existingConnection) {
              connections.push({
                from: selectedTower,
                to: tower,
                isAttack: isAttack,
              });
              connectionMade = true;

              // Since making a connection counts as a move, switch turns if in multiplayer mode
              if (gameMode === 'multiplayer') {
                currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
                updateTurnIndicator();
              }

              // Clear lastAction as a new action has been made
              lastAction = null;
              clearTimeout(undoTimeout);
              undoButton.style.display = 'none';
            }
          }
        }
      }
    });

    selectedTower = null;
  }
}

function handleMouseMove(mouseX, mouseY) {
  hoverTower = null;

  towers.forEach((tower) => {
    const dx = mouseX - tower.x;
    const dy = mouseY - tower.y;
    if (Math.sqrt(dx * dx + dy * dy) < 20) {
      hoverTower = tower;
    }
  });
}

// Touch event handlers
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent scrolling
  const pos = getMousePos(e);
  handleMouseDown(pos.x, pos.y);
});

canvas.addEventListener('touchend', (e) => {
  const pos = getMousePos(e);
  handleMouseUp(pos.x, pos.y);
});

// Obstacle detection
function isObstacleBetween(tower1, tower2) {
  for (let obstacle of obstacles) {
    if (lineIntersectsRect(tower1.x, tower1.y, tower2.x, tower2.y, obstacle.x, obstacle.y, obstacle.size, obstacle.size)) {
      return true;
    }
  }
  return false;
}

// Helper functions for obstacle detection
function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  return (
    lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
    lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
    lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry + rh, rx, ry + rh) ||
    lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx, ry)
  );
}

function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;

  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;

  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

// Game Loop
function gameLoop() {
  if (isPaused) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Reset isUnderAttack and incomingSupport flags for all towers
  towers.forEach((tower) => {
    tower.isUnderAttack = false;
    tower.incomingSupport = false;
  });

  // Process connections
  connections.forEach((conn) => {
    // Draw the connection line
    ctx.beginPath();
    ctx.moveTo(conn.from.x, conn.from.y);
    ctx.lineTo(conn.to.x, conn.to.y);
    ctx.strokeStyle =
      conn.from.owner === 'player1' ? 'blue' :
      conn.from.owner === 'player2' ? 'green' : 'red';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Determine if units should be sent along the connection
    const minStrength = 1; // Minimum strength to keep
    const sendRate = 0.1; // Send rate for units

    let shouldSendUnits = false;

    if (conn.isAttack) {
      shouldSendUnits = true; // Always send units for attack
    } else {
      // Support connection
      if (conn.to.strength < conn.to.maxStrength) {
        shouldSendUnits = true;
      } else {
        shouldSendUnits = false;
      }
    }

    if (shouldSendUnits && conn.from.strength > minStrength + sendRate) {
      // Send units
      conn.from.strength -= sendRate;
      units.push(new Unit(conn.from, conn.to, conn.from.owner, conn.isAttack));
    }

    // Mark the target tower as under attack or receiving support
    if (conn.isAttack) {
      conn.to.isUnderAttack = true;
    } else {
      if (shouldSendUnits) {
        conn.to.incomingSupport = true;
      }
    }
  });

  // Update and draw units
  for (let i = units.length - 1; i >= 0; i--) {
    let unit = units[i];
    unit.update();
    unit.draw();

    if (unit.isAtDestination()) {
      const targetTower = unit.to;

      if (unit.isAttack) {
        // Apply damage to the target tower
        const attackPower = 1; // Adjust as needed
        targetTower.strength -= attackPower;

        // Check for tower capture
        if (targetTower.strength <= 0) {
          targetTower.owner = unit.owner;
          targetTower.strength = 1;
          awardPoints(unit.owner);

          // Change connection to support if the tower was captured
          connections.forEach((conn) => {
            if (conn.to === targetTower && conn.from.owner === unit.owner) {
              conn.isAttack = false;
            }
          });
        }
      } else {
        // Support the target tower
        const supportPower = 1; // Adjust as needed
        if (targetTower.strength < targetTower.maxStrength) {
          targetTower.strength += supportPower;
        }
      }

      // Remove the unit from the array
      units.splice(i, 1);
    }
  }

  // Update, recover, and draw towers
  towers.forEach((tower) => {
    tower.recover();
    tower.draw();
  });

  // Draw obstacles
  obstacles.forEach((obstacle) => obstacle.draw());

  // Update game information
  updateGameInfo();

  // Check victory conditions
  checkVictory();

  requestAnimationFrame(gameLoop);
}

// Award points to players
function awardPoints(owner) {
  if (owner === 'player1' || owner === 'player2') {
    playerPoints[owner] += 10;
  }
}

// AI Behavior
function aiTurn() {
  const aiTowers = towers.filter((t) => t.owner === 'ai');
  const targetTowers = towers.filter((t) => t.owner !== 'ai');

  aiTowers.forEach((aiTower) => {
    if (aiTower.strength > aiTower.maxStrength * 0.5) {
      // Prioritize player's towers over neutral towers
      let potentialTargets = targetTowers.filter(t => t.owner === 'player1' || t.owner === 'player2');
      if (potentialTargets.length === 0) {
        potentialTargets = targetTowers;
      }

      // Find the best target based on strategy
      let bestTarget = null;
      let highestPriority = -Infinity;

      potentialTargets.forEach((targetTower) => {
        if (!isObstacleBetween(aiTower, targetTower)) {
          const distance = getDistance(aiTower, targetTower);
          const priority = (aiTower.strength - targetTower.strength) / distance;

          if (priority > highestPriority) {
            highestPriority = priority;
            bestTarget = targetTower;
          }
        }
      });

      if (bestTarget) {
        const existingConnection = connections.find(
          (conn) => conn.from === aiTower && conn.to === bestTarget
        );

        const fromConnections = connections.filter(conn => conn.from === aiTower).length;

        const MAX_CONNECTIONS_PER_TOWER = 3; // Adjust as needed

        if (fromConnections < MAX_CONNECTIONS_PER_TOWER && !existingConnection) {
          connections.push({
            from: aiTower,
            to: bestTarget,
            isAttack: aiTower.owner !== bestTarget.owner,
          });
        }
      }
    }
  });
}

function getDistance(tower1, tower2) {
  const dx = tower1.x - tower2.x;
  const dy = tower1.y - tower2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check Victory Conditions
function checkVictory() {
  const player1Towers = towers.filter(t => t.owner === 'player1');
  const player2Towers = towers.filter(t => t.owner === 'player2');
  const aiTowers = towers.filter(t => t.owner === 'ai');

  if (gameMode === 'singleplayer') {
    if (aiTowers.length === 0) {
      showGameOverPopup('You Win!');
    } else if (player1Towers.length === 0) {
      showGameOverPopup('AI Wins!');
    }
  } else if (gameMode === 'multiplayer') {
    if (player2Towers.length === 0) {
      showGameOverPopup('Player 1 Wins!');
    } else if (player1Towers.length === 0) {
      showGameOverPopup('Player 2 Wins!');
    }
  }
}

// Show Game Over Popup
function showGameOverPopup(message) {
  // Create the popup overlay
  const popupOverlay = document.createElement('div');
  popupOverlay.id = 'popupOverlay';
  popupOverlay.style.position = 'fixed';
  popupOverlay.style.top = '0';
  popupOverlay.style.left = '0';
  popupOverlay.style.width = '100%';
  popupOverlay.style.height = '100%';
  popupOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  popupOverlay.style.display = 'flex';
  popupOverlay.style.alignItems = 'center';
  popupOverlay.style.justifyContent = 'center';
  popupOverlay.style.zIndex = '1000';
  popupOverlay.style.cursor = 'pointer';

  // Create the popup content
  const popupContent = document.createElement('div');
  popupContent.style.backgroundColor = '#fff';
  popupContent.style.padding = '20px';
  popupContent.style.borderRadius = '10px';
  popupContent.style.textAlign = 'center';
  popupContent.style.fontSize = '24px';
  popupContent.style.color = '#333';
  popupContent.textContent = message;

  popupOverlay.appendChild(popupContent);
  document.body.appendChild(popupOverlay);

  // Add click event to remove the popup and reset the game
  popupOverlay.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent event from bubbling up
    document.body.removeChild(popupOverlay);
    resetGame();
  });
}

// Reset Game
function resetGame() {
  clearInterval(aiInterval);
  document.getElementById('menu').style.display = 'block';
  turnIndicator.style.display = 'none';
  gameControls.style.display = 'none';
  gameInfo.style.display = 'none';
  canvas.style.display = 'none';

  // Hide the info icon, game legend, and legend toggle button
  infoIcon.style.display = 'none';
  gameLegend.style.display = 'none';
  legendToggle.style.display = 'none'; // Hide the legend toggle button
  passButton.style.display = 'none'; // Hide the pass turn button
  undoButton.style.display = 'none'; // Hide the undo button
  lastAction = null;
  clearTimeout(undoTimeout);
}

// Pause and Resume Controls
pauseButton.addEventListener('click', () => {
  isPaused = true;
  pauseButton.style.display = 'none';
  resumeButton.style.display = 'inline-block';
});

resumeButton.addEventListener('click', () => {
  isPaused = false;
  resumeButton.style.display = 'none';
  pauseButton.style.display = 'inline-block';
  gameLoop();
});

restartButton.addEventListener('click', () => {
  resetGame();
  startGame();
});

// Legend Toggle Functionality
legendToggle.addEventListener('click', () => {
  if (gameLegend.style.display === 'block') {
    gameLegend.style.display = 'none';
    legendToggle.textContent = 'Show Legend';
  } else {
    gameLegend.style.display = 'block';
    legendToggle.textContent = 'Hide Legend';
  }
});

// Pass Turn Functionality
passButton.addEventListener('click', () => {
  if (gameMode === 'multiplayer') {
    currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
    updateTurnIndicator();
  }
});

// Undo Functionality
function showUndoOption() {
  undoButton.style.display = 'inline-block';

  // Clear any existing timeout
  clearTimeout(undoTimeout);

  // Set a timeout to hide the undo option after 5 seconds
  undoTimeout = setTimeout(() => {
    undoButton.style.display = 'none';
    lastAction = null;
  }, 5000);
}

undoButton.addEventListener('click', () => {
  undoLastAction();
});

function undoLastAction() {
  if (lastAction && lastAction.type === 'removeConnection') {
    // Restore the removed connection
    connections.splice(lastAction.index, 0, lastAction.connection);

    // Restore the player's turn if in multiplayer mode
    if (gameMode === 'multiplayer') {
      currentPlayer = lastAction.player;
      updateTurnIndicator();
    }

    // Clear lastAction and hide undo button
    lastAction = null;
    clearTimeout(undoTimeout);
    undoButton.style.display = 'none';
  }
}

// Keyboard shortcut for undo (Ctrl+Z or Cmd+Z)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    undoLastAction();
  }
});

// Prevent scrolling on mobile devices
document.body.addEventListener('touchmove', function(event) {
  event.preventDefault();
}, { passive: false });

// Start the game when the page loads
window.onload = () => {
  resizeCanvas();
  // Hide the info icon, game legend, legend toggle button, and pass button on load
  infoIcon.style.display = 'none';
  gameLegend.style.display = 'none';
  legendToggle.style.display = 'none';
  passButton.style.display = 'none';
  undoButton.style.display = 'none';
};
