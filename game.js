const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const levelDisplay = document.getElementById('level');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');

// Oyun Değişkenleri
const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [{ x: 10, y: 10 }];
let food = { x: 15, y: 15 };
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let score = 0;
let level = 1;
let gameRunning = false;
let gamePaused = false;
let gameSpeed = 100;

// Oyun Döngüsü
let gameLoopInterval;

function drawGame() {
    // Arka planı temizle
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yılanı çiz
    ctx.fillStyle = '#00ff00';
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = '#00ff00';
        } else {
            ctx.fillStyle = '#00cc00';
        }
        ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
    });

    // Elmayı çiz
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.arc(
        food.x * gridSize + gridSize / 2,
        food.y * gridSize + gridSize / 2,
        gridSize / 2 - 2,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Izgara çiz (opsiyonel)
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
}

function updateGame() {
    if (!gameRunning || gamePaused) return;

    direction = nextDirection;

    // Yeni başı hesapla
    const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };

    // Duvar Çarpışması Kontrolü
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        endGame();
        return;
    }

    // Kendine Çarpışma Kontrolü
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endGame();
        return;
    }

    snake.unshift(head);

    // Elma Yeme Kontrolü
    if (head.x === food.x && head.y === food.y) {
        score += 10 * level;
        scoreDisplay.textContent = score;
        generateFood();
        
        // Level Artış
        if (score % 50 === 0) {
            level++;
            levelDisplay.textContent = level;
            gameSpeed = Math.max(50, 100 - level * 5);
            clearInterval(gameLoopInterval);
            gameLoopInterval = setInterval(updateGame, gameSpeed);
        }
    } else {
        snake.pop();
    }

    drawGame();
}

function generateFood() {
    let newFood;
    let foodOnSnake = true;
    
    while (foodOnSnake) {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        foodOnSnake = snake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    
    food = newFood;
}

function startGame() {
    if (!gameRunning) {
        gameRunning = true;
        gamePaused = false;
        startBtn.textContent = 'Devam Et';
        pauseBtn.textContent = 'Duraklat';
        gameLoopInterval = setInterval(updateGame, gameSpeed);
    }
}

function pauseGame() {
    if (gameRunning) {
        gamePaused = !gamePaused;
        pauseBtn.textContent = gamePaused ? 'Devam Et' : 'Duraklat';
    }
}

function resetGame() {
    gameRunning = false;
    gamePaused = false;
    snake = [{ x: 10, y: 10 }];
    direction = { x: 1, y: 0 };
    nextDirection = { x: 1, y: 0 };
    score = 0;
    level = 1;
    gameSpeed = 100;
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    startBtn.textContent = 'Başla';
    pauseBtn.textContent = 'Duraklat';
    clearInterval(gameLoopInterval);
    generateFood();
    drawGame();
}

function endGame() {
    gameRunning = false;
    clearInterval(gameLoopInterval);
    alert(`Oyun Bitti! Skor: ${score}, Level: ${level}`);
    resetGame();
}

// Keyboard Kontrolü
document.addEventListener('keydown', (e) => {
    if (!gameRunning && e.key !== ' ') return;

    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (direction.y === 0) nextDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (direction.y === 0) nextDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (direction.x === 0) nextDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (direction.x === 0) nextDirection = { x: 1, y: 0 };
            break;
        case ' ':
            startGame();
            break;
    }
});

// Buton Event Listeners
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', resetGame);

// İlk Çizim
generateFood();
drawGame();