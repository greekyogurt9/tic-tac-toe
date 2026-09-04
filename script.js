const cells = document.querySelectorAll('.cell');
const status = document.getElementById('status');
const restartBtn = document.getElementById('restart');
const board = document.getElementById('board');
const container = document.getElementById('container');
const overlay = document.getElementById('overlay');
const overlayEmoji = document.getElementById('overlay-emoji');
const overlayTitle = document.getElementById('overlay-title');
const overlaySubtitle = document.getElementById('overlay-subtitle');
const playAgainBtn = document.getElementById('play-again');
const diffBtns = document.querySelectorAll('.diff-btn');
const scoreYouEl = document.getElementById('score-you');
const scoreCpuEl = document.getElementById('score-cpu');
const scoreDrawsEl = document.getElementById('score-draws');

const HUMAN = 'X';
const CPU = 'O';

let gameState = Array(9).fill('');
let gameActive = true;
let computerThinking = false;
let difficulty = 'medium';
let scores = { you: 0, cpu: 0, draws: 0 };

const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

// ---------- Difficulty ----------
diffBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        difficulty = btn.dataset.diff;
        restartGame();
    });
});

// ---------- Game flow ----------
function handleCellClick(e) {
    const index = Number(e.target.dataset.index);
    if (!gameActive || computerThinking || gameState[index] !== '') return;

    placeMark(index, HUMAN);

    const winPattern = getWinningPattern(gameState);
    if (winPattern) {
        endGame('win', winPattern);
        return;
    }
    if (gameState.every(c => c !== '')) {
        endGame('draw', null);
        return;
    }

    // Computer turn
    computerThinking = true;
    gameActive = false;
    board.classList.add('locked');
    status.textContent = 'Computer is thinking... 🤔';
    status.className = 'status';

    setTimeout(() => {
        const cpuIndex = getComputerMove();
        if (cpuIndex !== -1) placeMark(cpuIndex, CPU);

        const cpuWin = getWinningPattern(gameState);
        computerThinking = false;
        board.classList.remove('locked');

        if (cpuWin) {
            gameActive = false;
            endGame('lose', cpuWin);
        } else if (gameState.every(c => c !== '')) {
            gameActive = false;
            endGame('draw', null);
        } else {
            gameActive = true;
            status.textContent = 'Your turn!';
            status.className = 'status';
        }
    }, 550);
}

function placeMark(index, player) {
    gameState[index] = player;
    const cell = cells[index];
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
}

function getWinningPattern(boardState) {
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
            return pattern;
        }
    }
    return null;
}

function endGame(result, winPattern) {
    gameActive = false;
    board.classList.add('locked');

    if (winPattern) {
        const cls = result === 'win' ? 'win-cell' : 'lose-cell';
        winPattern.forEach(i => cells[i].classList.add(cls));
    }

    if (result === 'win') {
        scores.you++;
        scoreYouEl.textContent = scores.you;
        status.textContent = '🎉 YOU WIN! 🎉';
        status.className = 'status status-win';
        document.body.classList.add('body-win');
        launchConfetti(3500);
        playWinSound();
        showOverlay('win', '🎉', 'YOU WIN!', 'You beat the computer. Legendary!');
    } else if (result === 'lose') {
        scores.cpu++;
        scoreCpuEl.textContent = scores.cpu;
        status.textContent = 'BOOOO! Computer wins 👎';
        status.className = 'status status-lose';
        document.body.classList.add('body-lose');
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 600);
        launchBooRain(3500);
        playLoseSound();
        showOverlay('lose', '👎', 'BOOOO! YOU LOSE!', 'The computer got you this time. Try again!');
    } else {
        scores.draws++;
        scoreDrawsEl.textContent = scores.draws;
        status.textContent = "It's a draw! 🤝";
        status.className = 'status';
        playDrawSound();
        showOverlay('draw', '🤝', "IT'S A DRAW!", 'Nobody wins this round.');
    }
}

function showOverlay(type, emoji, title, subtitle) {
    overlay.className = 'overlay ' + type;
    overlayEmoji.textContent = emoji;
    overlayTitle.textContent = title;
    overlaySubtitle.textContent = subtitle;
    // Small delay so board result is visible first
    setTimeout(() => overlay.classList.remove('hidden'), type === 'draw' ? 400 : 900);
}

function hideOverlay() {
    overlay.classList.add('hidden');
    overlay.className = 'overlay hidden';
}

function restartGame() {
    gameState = Array(9).fill('');
    gameActive = true;
    computerThinking = false;
    hideOverlay();
    document.body.classList.remove('body-win', 'body-lose');
    board.classList.remove('locked');
    status.textContent = 'Your turn!';
    status.className = 'status';
    cells.forEach(cell => {
        cell.textContent = '';
        cell.classList.remove('x', 'o', 'win-cell', 'lose-cell');
    });
}

cells.forEach(cell => cell.addEventListener('click', handleCellClick));
restartBtn.addEventListener('click', restartGame);
playAgainBtn.addEventListener('click', restartGame);

// ---------- Computer AI ----------
function getComputerMove() {
    const empty = gameState.map((v, i) => (v === '' ? i : null)).filter(v => v !== null);
    if (empty.length === 0) return -1;

    if (difficulty === 'easy') {
        return empty[Math.floor(Math.random() * empty.length)];
    }

    if (difficulty === 'hard') {
        return bestMinimaxMove();
    }

    // medium: win > block > center > corner > random
    const winMove = findWinningMove(CPU);
    if (winMove !== -1) return winMove;

    const blockMove = findWinningMove(HUMAN);
    if (blockMove !== -1) return blockMove;

    if (gameState[4] === '') return 4;

    const corners = [0, 2, 6, 8].filter(i => gameState[i] === '');
    if (corners.length && Math.random() < 0.7) {
        return corners[Math.floor(Math.random() * corners.length)];
    }

    return empty[Math.floor(Math.random() * empty.length)];
}

function findWinningMove(player) {
    for (const pattern of winPatterns) {
        const [a, b, c] = pattern;
        const line = [gameState[a], gameState[b], gameState[c]];
        const playerCount = line.filter(v => v === player).length;
        const emptyCount = line.filter(v => v === '').length;
        if (playerCount === 2 && emptyCount === 1) {
            const emptyIdx = pattern[line.indexOf('')];
            return emptyIdx;
        }
    }
    return -1;
}

function bestMinimaxMove() {
    let bestScore = -Infinity;
    let move = -1;
    for (let i = 0; i < 9; i++) {
        if (gameState[i] === '') {
            gameState[i] = CPU;
            const score = minimax(gameState, 0, false);
            gameState[i] = '';
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

function minimax(boardState, depth, isMax) {
    const winner = evaluateBoard(boardState);
    if (winner === CPU) return 10 - depth;
    if (winner === HUMAN) return depth - 10;
    if (boardState.every(c => c !== '')) return 0;

    if (isMax) {
        let best = -Infinity;
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === '') {
                boardState[i] = CPU;
                best = Math.max(best, minimax(boardState, depth + 1, false));
                boardState[i] = '';
            }
        }
        return best;
    } else {
        let best = Infinity;
        for (let i = 0; i < 9; i++) {
            if (boardState[i] === '') {
                boardState[i] = HUMAN;
                best = Math.min(best, minimax(boardState, depth + 1, true));
                boardState[i] = '';
            }
        }
        return best;
    }
}

function evaluateBoard(boardState) {
    const pattern = getWinningPattern(boardState);
    if (!pattern) return null;
    return boardState[pattern[0]];
}

// ---------- Confetti (win) ----------
const canvas = document.getElementById('confetti-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let particleAnimId = null;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function launchConfetti(duration = 3000) {
    cancelParticleLoop();
    particles = [];
    const colors = ['#ff0a54', '#ff8205', '#ffc300', '#2ec4b6', '#00bbf9', '#9b5de5', '#80ed99', '#ffffff'];
    for (let i = 0; i < 200; i++) {
        particles.push({
            type: 'confetti',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: 6 + Math.random() * 8,
            h: 8 + Math.random() * 10,
            color: colors[Math.floor(Math.random() * colors.length)],
            vy: 2 + Math.random() * 4,
            vx: -2 + Math.random() * 4,
            angle: Math.random() * Math.PI * 2,
            spin: -0.15 + Math.random() * 0.3
        });
    }
    runParticleLoop(duration);
}

// ---------- Boo rain (lose) ----------
function launchBooRain(duration = 3000) {
    cancelParticleLoop();
    particles = [];
    const emojis = ['👎', '😭', '💀', 'BOO'];
    for (let i = 0; i < 70; i++) {
        particles.push({
            type: 'boo',
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            text: emojis[Math.floor(Math.random() * emojis.length)],
            size: 24 + Math.random() * 36,
            vy: 1.5 + Math.random() * 3,
            vx: -1 + Math.random() * 2,
            angle: -0.3 + Math.random() * 0.6,
            spin: -0.03 + Math.random() * 0.06
        });
    }
    runParticleLoop(duration);
}

function runParticleLoop(duration) {
    const start = Date.now();
    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.angle += p.spin;
            if (p.y > canvas.height + 40) {
                p.y = -40;
                p.x = Math.random() * canvas.width;
            }
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            if (p.type === 'confetti') {
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            } else {
                ctx.font = `${p.size}px serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (p.text === 'BOO') {
                    ctx.font = `900 ${p.size}px Arial`;
                    ctx.fillStyle = '#ff2e2e';
                    ctx.fillText(p.text, 0, 0);
                } else {
                    ctx.fillText(p.text, 0, 0);
                }
            }
            ctx.restore();
        });
        if (Date.now() - start < duration) {
            particleAnimId = requestAnimationFrame(loop);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particleAnimId = null;
        }
    }
    loop();
}

function cancelParticleLoop() {
    if (particleAnimId) {
        cancelAnimationFrame(particleAnimId);
        particleAnimId = null;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// ---------- Sounds (Web Audio, no files needed) ----------
let audioCtx = null;
function getAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playTone(freq, startDelay, duration, type = 'sine', volume = 0.25) {
    try {
        const ac = getAudio();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        const t = ac.currentTime + startDelay;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.start(t);
        osc.stop(t + duration);
    } catch (e) { /* audio not available */ }
}

function playWinSound() {
    // Happy ascending arpeggio: C E G C
    playTone(523, 0, 0.25, 'triangle');
    playTone(659, 0.15, 0.25, 'triangle');
    playTone(784, 0.3, 0.25, 'triangle');
    playTone(1047, 0.45, 0.5, 'triangle');
}

function playLoseSound() {
    // Sad descending "wah wah waaaah" + low buzz
    playTone(300, 0, 0.3, 'sawtooth', 0.15);
    playTone(250, 0.3, 0.3, 'sawtooth', 0.15);
    playTone(180, 0.6, 0.8, 'sawtooth', 0.18);
}

function playDrawSound() {
    playTone(440, 0, 0.2, 'sine');
    playTone(440, 0.25, 0.2, 'sine');
}
