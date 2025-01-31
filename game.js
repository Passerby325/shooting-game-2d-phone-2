let animationFrameId; 
// 防止图片被拖拽
window.addEventListener('load', function() {
    const images = document.getElementsByTagName('img');
    for (let i = 0; i < images.length; i++) {
        images[i].addEventListener('dragstart', function(e) {
            e.preventDefault();
        });
        images[i].style.webkitUserSelect = 'none';
        images[i].style.userSelect = 'none';
        images[i].setAttribute('draggable', 'false');
    }
});

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const timeDisplay = document.getElementById('time');
const killCountDisplay = document.getElementById('killCount');
const playButton = document.getElementById('playButton');
const winConditions = document.getElementById('winConditions');
const replayButton = document.getElementById('replayButton');
const groundColor = 'brown';
let groundHeight = 50;

const playerImg = new Image();
playerImg.src = 'player.png';

const enemyImg = new Image();
enemyImg.src = 'enemy.png';

const player = {
    x: 400,
    y: 0,
    width: 25,
    height: 25,
    baseSpeed: 3.5,
    speed: 3.5,
    speedGrowthRate: 0.01,
    isJumping: false,
    jumpSpeed: 0,
    gravity: 0.5,
    jumpHeight: -10,
    ground: 0,
    direction: 'right',
    shield: null
};

const bullets = [];
const enemies = [];
const shields = [];
const dropHints = [];
let bulletSpeed = 5;
let enemySpeed = 1.75;
let enemySpawnInterval = 1000;
let gameOver = false;
let gameStarted = false;
let startTime = null;
let killCount = 0;

let platform = null;
let platformFlashInterval = null;
let platformTimeout = null;

let enemySpawnTimer;
let platformSpawnTimer;
let shieldSpawnTimer;


document.addEventListener('keydown', movePlayer);
document.addEventListener('keyup', stopPlayer);
document.addEventListener('keydown', shootBullet);

document.getElementById('leftButton').addEventListener('touchstart', () => {
    keys['ArrowLeft'] = true;
    player.direction = 'left';
});
document.getElementById('leftButton').addEventListener('touchend', () => keys['ArrowLeft'] = false);
document.getElementById('rightButton').addEventListener('touchstart', () => {
    keys['ArrowRight'] = true;
    player.direction = 'right';
});
document.getElementById('rightButton').addEventListener('touchend', () => keys['ArrowRight'] = false);
document.getElementById('jumpButton').addEventListener('touchstart', () => {
    if (!player.isJumping) {
        player.isJumping = true;
        player.jumpSpeed = player.jumpHeight;
    }
});
document.getElementById('shootButton').addEventListener('touchstart', shootBullet);

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundHeight = canvas.height * 0.1;
    player.ground = canvas.height - groundHeight - player.height;
    player.y = player.ground;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let keys = {};

function movePlayer(e) {
    keys[e.key] = true;
    if (e.key === 'ArrowUp' && !player.isJumping) {
        player.isJumping = true;
        player.jumpSpeed = player.jumpHeight;
    } else if (e.key === 'ArrowLeft') {
        player.direction = 'left';
    } else if (e.key === 'ArrowRight') {
        player.direction = 'right';
    }
}

function stopPlayer(e) {
    keys[e.key] = false;
}

function shootBullet(e) {
    if (e.type === 'touchstart' || e.key === ' ') {
        bullets.push({
            x: player.direction === 'left' ? player.x : player.x + player.width,
            y: player.y + player.height / 2 - 2.5,
            width: 10,
            height: 5,
            color: 'red',
            direction: player.direction
        });
    }
}

function spawnEnemy() {
    const spawnFromTop = Math.random() < 0.5;
    let x, y, direction, type;

    if (spawnFromTop) {
        x = Math.random() * (canvas.width - 25);
        y = 0;
        direction = 'down';
        type = 'wd';

        // 添加掉落提示信息
        dropHints.push({
            x: x,
            y: player.ground,
            time: Date.now()
        });
    } else {
        x = Math.random() < 0.5 ? 0 : canvas.width - 25;
        y = player.ground;
        direction = x === 0 ? 'right' : 'left';
        type = 'hj';
    }

    enemies.push({
        x: x,
        y: y,
        width: 25,
        height: 25,
        speed: enemySpeed,
        direction: direction,
        lastDirection: 'right',
        type: type
    });
}

function spawnShield() {
    const x = Math.random() * (canvas.width - 50);
    const y = player.ground - 25;
    shields.push({
        x: x,
        y: y,
        radius: 25,
        active: true
    });
}

function update() {
    if (!gameStarted) return;

    const currentTime = Date.now();
    const elapsedTime = Math.floor((currentTime - startTime) / 1000);
    timeDisplay.textContent = `Time: ${elapsedTime}s`;

    if (elapsedTime >= 90 && killCount >= 15) {
        gameOver = true;
        ctx.fillStyle = 'green';  // 使用绿色表示胜利
        ctx.font = '48px sans-serif';
        ctx.fillText('You Win!', canvas.width / 2 - 100, canvas.height / 2);
        replayButton.style.display = 'block';
        return;
    }

    if (gameOver) return;


    player.speed = player.baseSpeed + elapsedTime * player.speedGrowthRate;
    enemySpeed = 1.75 * (1 + elapsedTime * 0.2);
    bulletSpeed = 5;
    enemySpawnInterval = Math.max(500, 1000 - elapsedTime * 100);

    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }

    if (player.isJumping) {
        player.y += player.jumpSpeed;
        player.jumpSpeed += player.gravity;
        if (player.y >= player.ground) {
            player.y = player.ground;
            player.isJumping = false;
        }
    }

    bullets.forEach((bullet, index) => {
        if (bullet.direction === 'right') {
            bullet.x += bulletSpeed;
        } else {
            bullet.x -= bulletSpeed;
        }
        if (bullet.x < 0 || bullet.x > canvas.width) {
            bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, index) => {
        if (enemy.direction === 'down') {
            enemy.y += enemy.speed;
            if (enemy.y >= player.ground) {
                enemy.y = player.ground;
                enemy.direction = enemy.x < canvas.width / 2 ? 'right' : 'left';
            }
        } else {
            if (enemy.direction === 'right') {
                enemy.x += enemy.speed;
                enemy.lastDirection = 'right';
            } else {
                enemy.x -= enemy.speed;
                enemy.lastDirection = 'left';
            }
        }

        const collisionBuffer = 15;
        if (enemy.x + collisionBuffer < player.x + player.width &&
            enemy.x + enemy.width - collisionBuffer > player.x &&
            enemy.y + collisionBuffer < player.y + player.height &&
            enemy.y + enemy.height - collisionBuffer > player.y) {
            if (player.shield && player.shield.active) {
                player.shield.active = false;
                enemies.splice(index, 1);
            } else {
                gameOver = true;
            }
        }

        bullets.forEach((bullet, bIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                bullets.splice(bIndex, 1);
                enemies.splice(index, 1);
                killCount++;
                // 更新显示的敌人数量
                killCountDisplay.textContent = `Enemies Killed: ${killCount}`;
            }
        });

        if (enemy.y > canvas.height || enemy.x < -50 || enemy.x > canvas.width + 50) {
            enemies.splice(index, 1);
        }
    });

    // 更新掉落提示信息
    dropHints.forEach((hint, index) => {
        if (currentTime - hint.time >= 500) {
            dropHints.splice(index, 1);
        }
    });

    if (platform) {
        if (player.y + player.height <= platform.y &&
            player.y + player.height + player.jumpSpeed >= platform.y &&
            player.x + player.width > platform.x &&
            player.x < platform.x + platform.width) {
            player.y = platform.y - player.height;
            player.isJumping = false;
        }

        enemies.forEach(enemy => {
            if (enemy.y + enemy.height <= platform.y &&
                enemy.y + enemy.height + enemy.speed >= platform.y &&
                enemy.x + enemy.width > platform.x &&
                enemy.x < platform.x + platform.width) {
                enemy.y = platform.y - enemy.height;
                enemy.direction = enemy.x < player.x ? 'right' : 'left';
            }
        });
    }

    shields.forEach((shield, index) => {
        if (player.x + player.width > shield.x - shield.radius &&
            player.x < shield.x + shield.radius &&
            player.y + player.height > shield.y - shield.radius &&
            player.y < shield.y + shield.radius) {
            player.shield = shield;
            shields.splice(index, 1);
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = groundColor;
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

    if (player.direction === 'right') {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(playerImg, -player.x - player.width, player.y, player.width, player.height);
        ctx.restore();
    }

    if (player.shield && player.shield.active) {
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width, 0, Math.PI * 2);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 5;
        ctx.stroke();
    }

    bullets.forEach(bullet => {
        ctx.fillStyle = bullet.color;
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });

    enemies.forEach(enemy => {
        if (enemy.lastDirection === 'right') {
            ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(enemyImg, -enemy.x - enemy.width, enemy.y, enemy.width, enemy.height);
            ctx.restore();
        }
        
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(enemy.type, enemy.x + enemy.width / 4, enemy.y - 10);
    });

    shields.forEach(shield => {
        ctx.beginPath();
        ctx.arc(shield.x, shield.y, shield.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'blue';
        ctx.fill();
    });

    // 绘制掉落提示信息
    dropHints.forEach(hint => {
        ctx.fillStyle = 'red';
        ctx.fillRect(hint.x, hint.y, 25, 25);
    });

    if (platform) {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    }

 if (gameOver) {
        ctx.fillStyle = 'red';
        ctx.font = '48px sans-serif';
        // 将游戏结束文本向下移动一些，避免与按钮重叠
        ctx.fillText('Game Over', canvas.width / 2 - 100, canvas.height / 2);
        // 显示 replay 按钮
        document.getElementById('replayButton').style.display = 'block';
    }
}

function gameLoop() {
    if (!gameOver) {
        update();
        draw();
        animationFrameId = requestAnimationFrame(gameLoop);
    } else {
        replayButton.style.display = 'block';
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    }
}

function startSpawningEnemies() {
    if (enemySpawnTimer) clearInterval(enemySpawnTimer);
    enemySpawnTimer = setInterval(spawnEnemy, enemySpawnInterval);
}


function startSpawningPlatforms() {
    if (platformSpawnTimer) clearInterval(platformSpawnTimer);
    platformSpawnTimer = setInterval(spawnPlatform, 20000);
}

function spawnPlatform() {
    if (platformFlashInterval) {
        clearInterval(platformFlashInterval);
    }
    if (platformTimeout) {
        clearTimeout(platformTimeout);
    }
    platform = {
        x: Math.random() * (canvas.width - 100),
        y: 550,
        width: 100,
        height: 10,
        color: 'yellow',
    };

    platformTimeout = setTimeout(() => {
        let flashCount = 0;
        platformFlashInterval = setInterval(() => {
            platform.color = flashCount % 2 === 0 ? 'yellow' : 'transparent';
            flashCount++;
            if (flashCount >= 6) {
                clearInterval(platformFlashInterval);
                if (player.y + player.height <= platform.y) {
                    player.isJumping = true;
                    player.jumpSpeed = player.gravity;
                }
                platform = null;
            }
        }, 500);
    }, 7000);
}


function startSpawningShields() {
    if (shieldSpawnTimer) clearInterval(shieldSpawnTimer);
    shieldSpawnTimer = setInterval(spawnShield, 10000);
}
function resetGame() {
        if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    // 清除所有定时器
    if (enemySpawnTimer) clearInterval(enemySpawnTimer);
    if (platformSpawnTimer) clearInterval(platformSpawnTimer);
    if (shieldSpawnTimer) clearInterval(shieldSpawnTimer);
    if (platformFlashInterval) clearInterval(platformFlashInterval);
    if (platformTimeout) clearTimeout(platformTimeout);
    // 重置游戏状态
    gameOver = false;
    gameStarted = false;
    startTime = null;
    killCount = 0;
    
    // 重置玩家位置和状态
    player.x = 400;
    player.y = player.ground;
    player.speed = player.baseSpeed;
    player.isJumping = false;
    player.jumpSpeed = 0;
    player.shield = null;
    
    // 清空数组
    bullets.length = 0;
    enemies.length = 0;
    shields.length = 0;
    dropHints.length = 0;
    
    // 重置显示
    timeDisplay.textContent = 'Time: 0s';
    killCountDisplay.textContent = 'Enemies Killed: 0';
    
    // 隐藏 replay 按钮
    replayButton.style.display = 'none';
    
    // 重新启动生成器
    startSpawningEnemies();
    startSpawningPlatforms();
    startSpawningShields();
    
    // 启动游戏
    gameStarted = true;
    startTime = Date.now();
    gameLoop();
}


playButton.addEventListener('click', () => {
    gameStarted = true;
    startTime = Date.now();
    winConditions.style.display = 'none';
    playButton.style.display = 'none';
    replayButton.style.display = 'none'; // 确保开始新游戏时隐藏 replay 按钮
    startSpawningEnemies();
    startSpawningPlatforms();
    startSpawningShields();
    gameLoop();
});
replayButton.addEventListener('click', resetGame);
replayButton.addEventListener('touchstart', resetGame);

// 禁用长按选择和上下文菜单

document.addEventListener('DOMContentLoaded', (event) => {
    const elements = document.querySelectorAll('body, .button');

    elements.forEach(element => {
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        let touchTimeout;

        element.addEventListener('touchstart', (e) => {
            touchTimeout = setTimeout(() => {
                e.preventDefault();
            }, 50); // 500ms长按
        });

        element.addEventListener('touchend', () => {
            clearTimeout(touchTimeout);
        });
    });
});
     
