const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// Variables du jeu
let snake = [{ x: 10, y: 10 }];
let food = null;
let dx = 0;
let dy = 0;
let score = 0;
let gameStarted = false;
let gameOver = false;
let particles = [];
let gameInProgress = false;

// Éléments du DOM
const startMenu = document.getElementById('startMenu');
const startButton = document.getElementById('startButton');
const debug = document.getElementById('debug');

// Effets visuels
const colors = {
    snake: '#00ff88',
    food: '#ff0088',
    particle: '#00ff88',
    grid: 'rgba(0, 255, 136, 0.1)',
    text: '#00ff88'
};

// Audio Context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playEatSound() {
    // Créer les oscillateurs
    const osc1 = audioContext.createOscillator();
    const osc2 = audioContext.createOscillator();
    
    // Créer un gain pour contrôler le volume
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    // Configurer les oscillateurs
    osc1.type = 'sine';
    osc2.type = 'square';
    
    // Fréquences futuristes
    osc1.frequency.setValueAtTime(600, audioContext.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
    
    osc2.frequency.setValueAtTime(800, audioContext.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    
    // Connecter les oscillateurs au gain
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Jouer le son
    osc1.start();
    osc2.start();
    
    // Arrêter après 0.1 seconde
    osc1.stop(audioContext.currentTime + 0.1);
    osc2.stop(audioContext.currentTime + 0.1);
}

function playGameOverSound() {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    osc.start();
    osc.stop(audioContext.currentTime + 1);
}

// Classe pour les particules
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 3 + 2;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = (Math.random() - 0.5) * 4;
        this.life = 1;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
        this.size -= 0.1;
    }

    draw() {
        ctx.fillStyle = `rgba(0, 255, 136, ${this.life})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function createParticles(x, y, amount) {
    for (let i = 0; i < amount; i++) {
        particles.push(new Particle(x, y));
    }
}

function generateFood() {
    const x = Math.floor(Math.random() * tileCount);
    const y = Math.floor(Math.random() * tileCount);
    food = { x, y };
    createParticles(food.x * gridSize + gridSize/2, food.y * gridSize + gridSize/2, 20);
}

function drawSnake() {
    snake.forEach((segment, index) => {
        const glowSize = Math.sin(Date.now() * 0.01) * 2 + 4;
        
        // Glow effect
        ctx.shadowColor = colors.snake;
        ctx.shadowBlur = glowSize;
        
        if (index === 0) {
            // Tête du serpent
            ctx.fillStyle = colors.snake;
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
            
            // Yeux cybernétiques
            ctx.fillStyle = '#000';
            ctx.shadowBlur = 0;
            const eyeSize = 4;
            if (dx === 1) {
                ctx.fillRect(segment.x * gridSize + gridSize - 6, segment.y * gridSize + 4, eyeSize, eyeSize);
                ctx.fillRect(segment.x * gridSize + gridSize - 6, segment.y * gridSize + gridSize - 8, eyeSize, eyeSize);
            } else if (dx === -1) {
                ctx.fillRect(segment.x * gridSize + 2, segment.y * gridSize + 4, eyeSize, eyeSize);
                ctx.fillRect(segment.x * gridSize + 2, segment.y * gridSize + gridSize - 8, eyeSize, eyeSize);
            } else if (dy === 1) {
                ctx.fillRect(segment.x * gridSize + 4, segment.y * gridSize + gridSize - 6, eyeSize, eyeSize);
                ctx.fillRect(segment.x * gridSize + gridSize - 8, segment.y * gridSize + gridSize - 6, eyeSize, eyeSize);
            } else if (dy === -1) {
                ctx.fillRect(segment.x * gridSize + 4, segment.y * gridSize + 2, eyeSize, eyeSize);
                ctx.fillRect(segment.x * gridSize + gridSize - 8, segment.y * gridSize + 2, eyeSize, eyeSize);
            }
        } else {
            // Corps du serpent avec effet de gradient
            const gradient = ctx.createLinearGradient(
                segment.x * gridSize, 
                segment.y * gridSize,
                (segment.x + 1) * gridSize,
                (segment.y + 1) * gridSize
            );
            gradient.addColorStop(0, colors.snake);
            gradient.addColorStop(1, '#00aa66');
            ctx.fillStyle = gradient;
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        }
    });
    ctx.shadowBlur = 0;
}

function drawFood() {
    if (!food) return;
    
    const time = Date.now() * 0.003;
    const size = Math.sin(time) * 2 + gridSize - 2;
    const x = food.x * gridSize + gridSize/2;
    const y = food.y * gridSize + gridSize/2;
    
    // Glow effect
    ctx.shadowColor = colors.food;
    ctx.shadowBlur = 15;
    
    // Pulsating food
    ctx.fillStyle = colors.food;
    ctx.beginPath();
    ctx.arc(x, y, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Energy rings
    ctx.strokeStyle = colors.food;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
        const ringSize = (Math.sin(time + i) + 1) * gridSize/2;
        ctx.beginPath();
        ctx.arc(x, y, ringSize, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0 || particles[i].size <= 0) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => particle.draw());
}

function moveSnake() {
    if (!gameStarted || gameOver || !gameInProgress) return;
    
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    
    // Collision avec les murs
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        handleGameOver();
        return;
    }
    
    // Collision avec soi-même
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            handleGameOver();
            return;
        }
    }
    
    // Collision avec la nourriture
    if (food && head.x === food.x && head.y === food.y) {
        score += 10;
        document.getElementById('score').textContent = `Score: ${score}`;
        createParticles(head.x * gridSize + gridSize/2, head.y * gridSize + gridSize/2, 30);
        playEatSound(); // Jouer le son quand on mange
        generateFood();
    } else {
        snake.pop();
    }
    
    createParticles(head.x * gridSize + gridSize/2, head.y * gridSize + gridSize/2, 1);
}

function startGame() {
    console.log('Starting game...');
    startMenu.style.display = 'none';
    gameInProgress = true;
    gameStarted = false;
    gameOver = false;
    snake = [{ x: 10, y: 10 }];
    dx = 0;
    dy = 0;
    score = 0;
    particles = [];
    document.getElementById('score').textContent = `Score: ${score}`;
    debug.textContent = 'Appuyez sur une flèche pour commencer';
    debug.style.display = 'block'; // Affiche le message
    debug.classList.remove('game-over');
    generateFood();
}

function handleGameOver() {
    gameOver = true;
    gameInProgress = false;
    startMenu.style.display = 'block';
    debug.style.display = 'block'; // Affiche le message
    debug.textContent = 'Game Over! Appuyez sur Espace pour recommencer';
    debug.classList.add('game-over');
    createParticles(snake[0].x * gridSize + gridSize/2, snake[0].y * gridSize + gridSize/2, 50);
    playGameOverSound(); // Jouer le son de game over
}

function clearCanvas() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Gestionnaire du bouton de démarrage
startButton.addEventListener('click', startGame);

// Contrôles
document.addEventListener('keydown', (e) => {
    if (!gameInProgress && e.code === 'Space') {
        startGame();
        return;
    }
    
    if (gameOver && e.code === 'Space') {
        startGame();
        return;
    }
    
    if (!gameInProgress) return;
    
    switch(e.key) {
        case 'ArrowUp':
            if (!gameStarted) {
                gameStarted = true;
                dx = 0;
                dy = -1;
                debug.style.display = 'none'; // Cache le message
            } else if (dy === 0) {
                dx = 0;
                dy = -1;
            }
            break;
        case 'ArrowDown':
            if (!gameStarted) {
                gameStarted = true;
                dx = 0;
                dy = 1;
                debug.style.display = 'none'; // Cache le message
            } else if (dy === 0) {
                dx = 0;
                dy = 1;
            }
            break;
        case 'ArrowLeft':
            if (!gameStarted) {
                gameStarted = true;
                dx = -1;
                dy = 0;
                debug.style.display = 'none'; // Cache le message
            } else if (dx === 0) {
                dx = -1;
                dy = 0;
            }
            break;
        case 'ArrowRight':
            if (!gameStarted) {
                gameStarted = true;
                dx = 1;
                dy = 0;
                debug.style.display = 'none'; // Cache le message
            } else if (dx === 0) {
                dx = 1;
                dy = 0;
            }
            break;
    }
});

// Animation principale
function animate() {
    clearCanvas();
    
    // Dessiner la grille
    ctx.strokeStyle = colors.grid;
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
    
    updateParticles();
    drawParticles();
    drawFood();
    drawSnake();
    requestAnimationFrame(animate);
}

// Démarrage du jeu
animate();
setInterval(moveSnake, 100);
