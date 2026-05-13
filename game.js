const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Menu Elements
const menuScreen = document.getElementById('menuScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startGameBtn = document.getElementById('startGameBtn');
const restartBtn = document.getElementById('restartBtn');
const menuBtn = document.getElementById('menuBtn');
const playerNameInput = document.getElementById('playerNameInput');

// HUD Elements
const playerNameDisplay = document.getElementById('playerName');
const playerScoreDisplay = document.getElementById('playerScore');
const playerRankDisplay = document.getElementById('playerRank');
const leaderboardList = document.getElementById('leaderboardList');

// Game Variables
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;
const GRID_SIZE = 15;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

let gameState = {
    running: false,
    paused: false,
    player: null,
    bots: [],
    foods: [],
    playerName: 'Oyuncu',
    playerColor: '#00ff00',
    difficulty: 'easy',
    gameSpeed: 8
};

let gameLoopInterval;
let foodSpawnInterval;

// ===== PLAYER CLASS =====
class Snake {
    constructor(x, y, color, isBot = false, name = 'Bot') {
        this.segments = [{ x, y }];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.color = color;
        this.score = 0;
        this.isBot = isBot;
        this.name = name;
        this.alive = true;
    }

    update() {
        if (!this.alive) return;

        this.direction = this.nextDirection;
        const head = { x: this.segments[0].x + this.direction.x, y: this.segments[0].y + this.direction.y };

        // Harita etrafında dolanma
        head.x = (head.x + CANVAS_WIDTH / GRID_SIZE) % (CANVAS_WIDTH / GRID_SIZE);
        head.y = (head.y + CANVAS_HEIGHT / GRID_SIZE) % (CANVAS_HEIGHT / GRID_SIZE);

        // Kendine çarpışma
        if (this.segments.some(seg => seg.x === head.x && seg.y === head.y)) {
            this.alive = false;
            return;
        }

        this.segments.unshift(head);

        // Yiyecek yeme
        for (let i = 0; i < gameState.foods.length; i++) {
            const food = gameState.foods[i];
            if (head.x === food.x && head.y === food.y) {
                this.score += food.value;
                gameState.foods.splice(i, 1);
                break;
            } else {
                this.segments.pop();
            }
        }
    }

    draw(ctx) {
        if (!this.alive) return;

        // Gövde
        for (let i = 0; i < this.segments.length; i++) {
            const seg = this.segments[i];
            ctx.fillStyle = i === 0 ? this.color : adjustBrightness(this.color, -20);
            ctx.fillRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);

            // Glow Efekti
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(seg.x * GRID_SIZE + 1, seg.y * GRID_SIZE + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            ctx.shadowBlur = 0;
        }

        // Göz (başta)
        const head = this.segments[0];
        ctx.fillStyle = '#fff';
        const eyeOffsets = [
            { x: 3, y: 3 },
            { x: 10, y: 3 }
        ];
        
        eyeOffsets.forEach(offset => {
            ctx.beginPath();
            ctx.arc(head.x * GRID_SIZE + offset.x, head.y * GRID_SIZE + offset.y, 2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    botMove() {
        if (!this.isBot || !this.alive) return;

        // En yakın yiyecek bul
        let closest = null;
        let minDist = Infinity;

        gameState.foods.forEach(food => {
            const dist = Math.hypot(food.x - this.segments[0].x, food.y - this.segments[0].y);
            if (dist < minDist) {
                minDist = dist;
                closest = food;
            }
        });

        if (closest) {
            const head = this.segments[0];
            const dx = closest.x - head.x;
            const dy = closest.y - head.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0 && this.direction.x === 0) this.nextDirection = { x: 1, y: 0 };
                if (dx < 0 && this.direction.x === 0) this.nextDirection = { x: -1, y: 0 };
            } else {
                if (dy > 0 && this.direction.y === 0) this.nextDirection = { x: 0, y: 1 };
                if (dy < 0 && this.direction.y === 0) this.nextDirection = { x: 0, y: -1 };
            }
        }
    }

    getRank() {
        const allSnakes = [gameState.player, ...gameState.bots].filter(s => s.alive);
        const sorted = allSnakes.sort((a, b) => b.score - a.score);
        return sorted.findIndex(s => s === this) + 1;
    }
}

// ===== FOOD CLASS =====
class Food {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.value = type === 'normal' ? 10 : type === 'large' ? 25 : 50;
        this.colors = {
            normal: '#ff0000',
            large: '#ff8800',
            special: '#ffff00'
        };
        this.color = this.colors[type];
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x * GRID_SIZE + GRID_SIZE / 2, this.y * GRID_SIZE + GRID_SIZE / 2, GRID_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// ===== UTILITY FUNCTIONS =====
function adjustBrightness(color, percent) {
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);

    const newR = Math.max(0, Math.min(255, r + percent));
    const newG = Math.max(0, Math.min(255, g + percent));
    const newB = Math.max(0, Math.min(255, b + percent));

    return '#' + [newR, newG, newB].map(x => x.toString(16).padStart(2, '0')).join('');
}

function randomFood() {
    const x = Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE));
    const y = Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE));
    const types = ['normal', 'normal', 'normal', 'large', 'special'];
    const type = types[Math.floor(Math.random() * types.length)];
    return new Food(x, y, type);
}

function spawnFood() {
    if (gameState.foods.length < 30) {
        gameState.foods.push(randomFood());
    }
}

function updateLeaderboard() {
    const allSnakes = [gameState.player, ...gameState.bots];
    const sorted = allSnakes.sort((a, b) => b.score - a.score);

    let html = '';
    sorted.forEach((snake, index) => {
        const medal = ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
        html += `<div class="leaderboard-item ${snake === gameState.player ? 'active' : ''}">
                    <span class="medal">${medal}</span>
                    <span class="name">${snake.name}</span>
                    <span class="score">${snake.score}</span>
                </div>`;
    });
    leaderboardList.innerHTML = html;

    const playerRank = gameState.player.getRank();
    playerRankDisplay.textContent = `Sırası: ${playerRank}`;
}

function initGame() {
    // Oyuncu
    gameState.player = new Snake(
        Math.floor(CANVAS_WIDTH / GRID_SIZE / 2),
        Math.floor(CANVAS_HEIGHT / GRID_SIZE / 2),
        gameState.playerColor,
        false,
        gameState.playerName
    );

    // Botlar
    gameState.bots = [];
    const botCount = gameState.difficulty === 'easy' ? 3 : gameState.difficulty === 'medium' ? 7 : 15;
    const botColors = ['#ff0000', '#0099ff', '#ff00ff', '#ffff00', '#ff8800', '#00ffff', '#00ff00', '#ff69b4', '#00ff88', '#ff00ff', '#ffaa00', '#00aaff', '#ff0088', '#88ff00', '#0088ff'];

    for (let i = 0; i < botCount; i++) {
        const x = Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE));
        const y = Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE));
        const bot = new Snake(x, y, botColors[i % botColors.length], true, `Bot ${i + 1}`);
        gameState.bots.push(bot);
    }

    // Yiyecek
    gameState.foods = [];
    for (let i = 0; i < 20; i++) {
        gameState.foods.push(randomFood());
    }

    gameState.running = true;
    menuScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';

    gameLoopInterval = setInterval(gameLoop, 1000 / gameState.gameSpeed);
    foodSpawnInterval = setInterval(spawnFood, 2000);
}

function gameLoop() {
    if (!gameState.running) return;

    // Update
    gameState.player.update();
    gameState.bots.forEach(bot => {
        bot.botMove();
        bot.update();
    });

    // Draw
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= CANVAS_WIDTH / GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(i * GRID_SIZE, 0);
        ctx.lineTo(i * GRID_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i <= CANVAS_HEIGHT / GRID_SIZE; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH, i * GRID_SIZE);
        ctx.stroke();
    }

    // Draw Oyunlar
    gameState.foods.forEach(food => food.draw(ctx));
    gameState.player.draw(ctx);
    gameState.bots.forEach(bot => bot.draw(ctx));

    // Update HUD
    playerScoreDisplay.textContent = `Skor: ${gameState.player.score}`;
    updateLeaderboard();

    // Check Oyuncu Ölü
    if (!gameState.player.alive) {
        endGame();
    }
}

function endGame() {
    gameState.running = false;
    clearInterval(gameLoopInterval);
    clearInterval(foodSpawnInterval);

    document.getElementById('finalName').textContent = gameState.playerName;
    document.getElementById('finalScore').textContent = gameState.player.score;
    document.getElementById('finalRank').textContent = gameState.player.getRank();
    document.getElementById('finalLength').textContent = gameState.player.segments.length;

    gameOverScreen.style.display = 'flex';
}

// ===== EVENT LISTENERS =====
// Avatar Seçimi
document.querySelectorAll('.avatar-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.avatar-btn').forEach(b => b.style.border = 'none');
        this.style.border = '3px solid #fff';
        gameState.playerColor = this.dataset.color;
    });
});

// Zorluk Seçimi
document.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.style.background = 'transparent');
        this.style.background = 'rgba(0, 255, 0, 0.3)';
        gameState.difficulty = this.dataset.difficulty;
    });
});

// İsim Girdisi
playerNameInput.addEventListener('input', function() {
    gameState.playerName = this.value || 'Oyuncu';
});

// Başla Butonu
startGameBtn.addEventListener('click', () => {
    if (gameState.playerName.trim()) {
        initGame();
    }
});

// Restart Butonu
restartBtn.addEventListener('click', () => {
    if (gameState.playerName.trim()) {
        initGame();
    }
});

// Menu Butonu
menuBtn.addEventListener('click', () => {
    gameState.running = false;
    clearInterval(gameLoopInterval);
    clearInterval(foodSpawnInterval);
    menuScreen.style.display = 'flex';
});

// Klavye Kontrolleri
document.addEventListener('keydown', (e) => {
    if (!gameState.player || !gameState.running) return;

    const player = gameState.player;
    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (player.direction.y === 0) player.nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (player.direction.y === 0) player.nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (player.direction.x === 0) player.nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (player.direction.x === 0) player.nextDirection = { x: 1, y: 0 };
            break;
    }
});

// Touch Controls
let touchStartX = 0, touchStartY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchmove', (e) => {
    if (!gameState.player || !gameState.running) return;

    const diffX = e.touches[0].clientX - touchStartX;
    const diffY = e.touches[0].clientY - touchStartY;

    const player = gameState.player;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && player.direction.x === 0) player.nextDirection = { x: 1, y: 0 };
        if (diffX < 0 && player.direction.x === 0) player.nextDirection = { x: -1, y: 0 };
    } else {
        if (diffY > 0 && player.direction.y === 0) player.nextDirection = { x: 0, y: 1 };
        if (diffY < 0 && player.direction.y === 0) player.nextDirection = { x: 0, y: -1 };
    }

    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

// Başlangıç
playerNameInput.value = 'Oyuncu';
document.querySelector('.avatar-btn').style.border = '3px solid #fff';
document.querySelector('.difficulty-btn').style.background = 'rgba(0, 255, 0, 0.3)';
