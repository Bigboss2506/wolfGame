// --- ИНИЦИАЛИЗАЦИЯ CANVAS (Используются глобальные переменные W, H из этого файла) ---
const canvas = document.getElementById('game');
const W = 550;
const H = 350;
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const MAX_LIVES = 5;
const BONUS_TIME = 60 * 10; // 10 секунд при 60 FPS

// ===============================================
// КЛАСС WOLF (ИГРОК)
// ===============================================

class Wolf {
    constructor(W, H) {
        this.W = W;
        this.H = H;
        this.baseWidth = 48;
        this.width = this.baseWidth;
        this.height = 48;
        this.y = H - 55; 
        this.x = W / 2 - this.width / 2;
    }

    move(x) {
        this.x = x - this.width / 2;

        if (this.x < 0) this.x = 0;
        if (this.x + this.width > this.W) this.x = this.W - this.width;
    }

    setMagnet(active) {
        this.width = active ? this.baseWidth * 2 : this.baseWidth;
    }

    draw(ctx, magnetDuration) {
        const wolfColor = getCssVar('--canvas-wolf-color');
        const tokenColor = getCssVar('--canvas-token-color');

        // Визуализация Магнита
        if (magnetDuration > 0) {
            ctx.fillStyle = 'rgba(56,189,248,0.25)';
            ctx.fillRect(this.x, this.y - 15, this.width, this.height + 30); 
        }

        // Тело волка
        ctx.fillStyle = wolfColor;
        const rx = this.x;
        const ry = this.y;
        const rw = this.width;
        const rh = this.height;
        const r = 8;
        
        ctx.beginPath();
        ctx.moveTo(rx + r, ry);
        ctx.lineTo(rx + rw - r, ry);
        ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
        ctx.lineTo(rx + rw, ry + rh - r);
        ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - r, ry + rh);
        ctx.lineTo(rx + r, ry + rh);
        ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - r);
        ctx.lineTo(rx, ry + r);
        ctx.quadraticCurveTo(rx, ry, rx + r, ry);
        ctx.fill();

        // "Портфель"
        ctx.fillStyle = tokenColor;
        ctx.fillRect(this.x + this.width * 0.1, this.y + 15, this.width * 0.8, 12);
    }
}


// ===============================================
// КЛАСС CRYPTOWOLF GAME (ОСНОВНАЯ ЛОГИКА)
// ===============================================

class CryptoWolfGame {
    constructor() {
        this.gameState = 'menu';
        this.score = 0;
        this.lives = 0;
        this.balance = 0;
        this.bestScore = 0;
        this.slowTimeDuration = 0;
        this.magnetDuration = 0;
        this.comboCount = 0;

        this.wolf = new Wolf(W, H);
        this.fallingObjects = [];
        this.tokenSpawnCounter = 0;
        this.initialTokenSpeed = 1.5;
        
        // Элементы UI (убедитесь, что они существуют в index.html)
        this.statusTextEl = document.getElementById('statusText');
        this.balanceValueEl = document.getElementById('balanceValue');
        this.bestScoreEl = document.getElementById('bestScore');
        this.multiplierEl = document.getElementById('multiplierValue');
        this.startButtonLabel = document.getElementById('startButtonLabel');
        this.pauseButton = document.getElementById('pauseButton');
        this.pauseIcon = document.getElementById('pauseIcon');
        this.livesContainer = document.getElementById('livesContainer');
        this.buyLifeBtn = document.getElementById('buyLife');
        
        // NEW: Аудиоэлементы и управление звуком
        this.bgm = document.getElementById('bgm');
        this.sfxCatch = document.getElementById('sfx-catch');
        this.sfxMiss = document.getElementById('sfx-miss');
        this.sfxGameOver = document.getElementById('sfx-gameover');
        this.soundIconEl = document.getElementById('soundToggleButton').querySelector('span'); // Находим span внутри кнопки

        this.isSoundEnabled = this.loadSoundState(); 

        this.updateSoundIcon(); // Обновление иконки при запуске

        this.loadState();
        this.updateUI();
        this.setupControls();
    }
    
    // NEW: Загрузка/Сохранение состояния звука
    loadSoundState() {
        // По умолчанию звук включен, если нет сохраненного состояния
        const savedState = localStorage.getItem('cw_sound_enabled');
        return savedState === null ? true : savedState === 'true';
    }

    saveSoundState() {
        localStorage.setItem('cw_sound_enabled', this.isSoundEnabled);
    }

    updateSoundIcon() {
        this.soundIconEl.textContent = this.isSoundEnabled ? '🔊' : '🔇';
    }
    
    toggleSound = () => {
        this.isSoundEnabled = !this.isSoundEnabled;
        this.saveSoundState();
        this.updateSoundIcon();
        this.handleMusic(); 
    }

    loadState() {
        this.bestScore = parseInt(localStorage.getItem('cw_bestScore') || 0);
        this.balance = parseInt(localStorage.getItem('cw_balance') || 0);
    }

    saveState() {
        localStorage.setItem('cw_bestScore', this.bestScore);
        localStorage.setItem('cw_balance', this.balance);
    }
    
    updateLivesDisplay() {
        this.livesContainer.innerHTML = ''; 
        for (let i = 0; i < MAX_LIVES; i++) {
            const icon = document.createElement('span');
            icon.classList.add('life-icon');
            icon.textContent = '❤️';
            if (i >= this.lives) {
                icon.style.opacity = '0.3';
            } else {
                icon.style.opacity = '1';
            }
            this.livesContainer.appendChild(icon);
        }
    }

    updateUI() {
        this.bestScoreEl.textContent = Math.floor(this.bestScore);
        this.balanceValueEl.textContent = this.balance;
        
        const mult = 1 + Math.min(this.comboCount, 20) * 0.05;
        this.multiplierEl.textContent = mult.toFixed(1);
        
        // Обновление состояния кнопки жизни
        if (this.buyLifeBtn) {
            const lifeCost = parseInt(this.buyLifeBtn.dataset.cost);
            this.buyLifeBtn.disabled = this.balance < lifeCost || this.lives >= MAX_LIVES; 
        }
        
        this.updateLivesDisplay();
    }
    
    // NEW: Метод для управления фоновой музыкой
    handleMusic() {
        if (!this.bgm) return;

        if (this.gameState === 'playing' && this.isSoundEnabled) {
            // Если звук включен и игра идет, пытаемся воспроизвести
            if (this.bgm.paused) {
                 this.bgm.play().catch(e => {
                    // Игнорируем ошибку, если пользователь не кликнул
                });
            }
        } else {
            // Если игра не идет или звук выключен
            this.bgm.pause();
        }
    }
    
    // NEW: Воспроизведение SFX
    playSfx(sfxElement) {
        if (this.isSoundEnabled && sfxElement) {
            sfxElement.currentTime = 0;
            sfxElement.play().catch(e => {
                // Игнорируем ошибку, если пользователь не кликнул
                if (e.name === 'NotAllowedError') return;
            });
        }
    }


    togglePause = () => {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            this.pauseIcon.textContent = '▶';
            this.statusTextEl.textContent = '⏸ Игра на паузе. Нажмите, чтобы продолжить.';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.pauseIcon.textContent = '⏸';
            this.statusTextEl.textContent = 'Игра возобновлена.';
        }
        this.updateUI();
        this.handleMusic(); 
    }

    purchaseItem(item, cost) {
        if (this.balance >= cost) {
            this.balance -= cost;
            this.saveState();
            
            if (item === 'life') {
                this.lives = Math.min(this.lives + 1, MAX_LIVES);
                this.statusTextEl.textContent = `❤️ +1 жизнь куплена!`;
            }
            
            if (item === 'life' && this.gameState === 'gameover') {
                this.startGame();
            }
            this.updateUI();
            return true;
        } else {
            this.statusTextEl.textContent = `Недостаточно токенов (нужно ${cost} TOK)`;
            return false;
        }
    }


    setupControls() {
        const moveHandler = (e) => {
            if (this.gameState !== 'playing') return;
            const rect = canvas.getBoundingClientRect();
            const scaleX = W / rect.width; 
            const clientX = e.clientX || (e.touches && e.touches[0].clientX);
            if (!clientX) return;
            const mouseX = (clientX - rect.left) * scaleX;
            this.wolf.move(mouseX);
        }

        canvas.addEventListener('mousemove', moveHandler);
        canvas.addEventListener('touchstart', (e) => { e.preventDefault(); moveHandler(e); }, { passive: false });
        canvas.addEventListener('touchmove', (e) => { e.preventDefault(); moveHandler(e); }, { passive: false });
        
        document.getElementById('startButton').addEventListener('click', () => {
          if (this.gameState === 'playing') return;
          this.startGame();
        });
        canvas.addEventListener('click', () => {
            if (this.gameState === 'paused') {
                this.togglePause();
            } else if (this.gameState !== 'playing') {
                this.startGame();
            }
        });
        this.pauseButton.addEventListener('click', this.togglePause);
        
        // NEW: Добавление обработчика для кнопки звука
        document.getElementById('soundToggleButton').addEventListener('click', this.toggleSound);
    }

    startGame() {
      this.score = 0;
      this.lives = 3;
      this.comboCount = 0;
      this.fallingObjects = [];

      this.slowTimeDuration = 0;
      this.magnetDuration = 0;
      this.wolf.setMagnet(false);

      this.wolf.x = W / 2 - this.wolf.width / 2;

      this.gameState = 'playing';
      this.statusTextEl.textContent = 'Лови токены, не дай им упасть';
      this.startButtonLabel.textContent = 'Идёт игра...';
      this.pauseButton.style.display = 'inline-flex';
      this.pauseIcon.textContent = '⏸';
      this.updateUI();
      
      // Активация музыки
      this.handleMusic();
    }

    spawnObject() {
        // Плавное увеличение скорости
        const currentSpeed = this.initialTokenSpeed + Math.min(this.score / 2, 2.5); 

        let newObject = null;
        let rand = Math.random();
        
        // 1. Попытка создания бонуса (если не активны и набран минимальный счет)
        if (this.score >= 20 && this.slowTimeDuration === 0 && rand < 0.015) { // 1.5% шанс
            newObject = new SlowTimeBonus(W, H, currentSpeed * 0.8);
        }
        else if (this.score >= 30 && this.magnetDuration === 0 && rand >= 0.015 && rand < 0.03) { // 1.5% шанс
            newObject = new MagnetBonus(W, H, currentSpeed * 0.8);
        }

        // 2. Если бонус не создан, выбираем токен/череп
        if (!newObject) {
            rand = Math.random(); // Новый случайный выбор
            
            // 10% для Золотого Токена (после 10 очков)
            if (this.score >= 10 && rand < 0.10) { 
                newObject = new GoldenToken(W, H, currentSpeed * 0.9);
            } 
            // 10% для Черепа (после 5 очков)
            else if (this.score >= 5 && rand < 0.20) { 
                newObject = new SkullToken(W, H, currentSpeed * 1.2);
            } 
            // Остальное - Обычный Токен (80% шанса)
            else { 
                newObject = new CoinToken(W, H, currentSpeed);
            }
        }
        
        this.fallingObjects.push(newObject);
    }

    updateGame() {
      if (this.gameState !== 'playing') {
        return;
      }

      let slowFactor = 1;
      if (this.slowTimeDuration > 0) {
        this.slowTimeDuration--;
        slowFactor = 0.5;
        if (this.slowTimeDuration === 0) {
            this.statusTextEl.textContent = `Замедление закончилось. Скорость восстановлена.`;
        }
      }
      if (this.magnetDuration > 0) {
        this.magnetDuration--;
        if (this.magnetDuration === 0) {
            this.wolf.setMagnet(false);
            this.statusTextEl.textContent = `Магнит закончился. Область захвата уменьшена.`;
        }
      }

      this.tokenSpawnCounter++;
      // Уменьшаем интервал спауна с ростом счета (минимальный интервал 30)
      const spawnRate = 90 - Math.min(this.score / 3, 60); 
      if (this.tokenSpawnCounter >= spawnRate) {
          this.spawnObject();
          this.tokenSpawnCounter = 0;
      }

      this.fallingObjects = this.fallingObjects.filter(obj => {
          obj.update(slowFactor);

          if (obj.y - obj.radius > H) {
              this.handleObjectMissed(obj);
              return false;
          }

          if (obj.checkCollision(this.wolf)) {
              this.handleObjectCaught(obj);
              return false;
          }

          return true;
      });
    }
    
    handleObjectMissed(obj) {
        this.comboCount = 0; 
        
        if (obj.type === 'coin' || obj.type === 'golden') {
            this.lives -= 1;
            this.statusTextEl.textContent = `Упущен токен! Осталось жизней: ${this.lives}`;
            this.playSfx(this.sfxMiss);

        } else if (obj.type === 'skull') {
            this.statusTextEl.textContent = `💀 Опасный токен прошел мимо. Повезло.`; 
        } else if (obj.type === 'slowtime' || obj.type === 'magnet') {
            this.statusTextEl.textContent = `Упущен бонус.`; 
        }

        this.updateUI();

        if (this.lives <= 0) {
            this.endGame();
        }
    }

    handleObjectCaught(obj) {
        this.comboCount++;
        const multiplier = 1 + Math.min(this.comboCount, 20) * 0.05;
        let sfxToPlay = this.sfxCatch; // По умолчанию - звук поимки

        if (obj.type === 'coin') {
            this.score += 1 * multiplier;
            this.balance += 1;
            this.statusTextEl.textContent = `Токен пойман! Комбо x${multiplier.toFixed(1)}`;
        } else if (obj.type === 'golden') {
            this.score += 10 * multiplier;
            this.balance += 10;
            this.statusTextEl.textContent = `✨ ЗОЛОТО! +10 TOK, +10 очков! Комбо x${multiplier.toFixed(1)}`;
        } else if (obj.type === 'skull') {
            // --- ГЛАВНОЕ ИСПРАВЛЕНИЕ: МИНУС ЖИЗНЬ ---
            this.balance = Math.max(0, this.balance - 20);
            this.lives -= 1; 
            this.comboCount = 0;
            this.statusTextEl.textContent = `💀 Опасность! Потеряно 20 TOK и 1 жизнь!`; 
            sfxToPlay = this.sfxMiss; // Звук промаха
        } else if (obj.type === 'slowtime') { 
            this.slowTimeDuration = BONUS_TIME;
            this.comboCount = 0;
            this.statusTextEl.textContent = `🐢 Активировано замедление (10с) от бонуса!`;
        } else if (obj.type === 'magnet') { 
            this.magnetDuration = BONUS_TIME;
            this.wolf.setMagnet(true);
            this.comboCount = 0;
            this.statusTextEl.textContent = `🧲 Активирован магнит (10с) от бонуса!`;
        }
        
        this.playSfx(sfxToPlay); // Воспроизводим выбранный SFX
        this.updateUI();

        // Проверяем, не закончилась ли игра после потери жизни
        if (this.lives <= 0) {
            this.endGame();
        }
    }

    endGame() {
      this.gameState = 'gameover';
      this.startButtonLabel.textContent = 'Играть снова';
      this.statusTextEl.textContent = `Игра окончена. Поймано: ${Math.floor(this.score)} токенов`;
      
      const finalScore = Math.floor(this.score);
      if (finalScore > this.bestScore) {
        this.bestScore = finalScore;
      }
      this.pauseButton.style.display = 'none';
      this.saveState(); 
      this.updateUI(); 
      
      this.handleMusic(); 
      this.playSfx(this.sfxGameOver);
    }

    drawGame() {
        const groundLineColor = getCssVar('--canvas-ground-line');
        const uiColor = getCssVar('--canvas-ui-color');
        const bgTop = getCssVar('--canvas-bg-top');
        const bgBottom = getCssVar('--canvas-bg-bottom');

        // Фон
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, bgTop);
        grad.addColorStop(0.4, bgBottom);
        grad.addColorStop(1, bgTop);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);

        // Псевдо-неоновые линии (земля)
        ctx.strokeStyle = groundLineColor;
        ctx.lineWidth = 1;
        for (let y = H - 50; y < H; y += 8) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Отрисовка объектов и волка
        this.fallingObjects.forEach(obj => obj.draw(ctx));
        this.wolf.draw(ctx, this.magnetDuration);

        // HUD (Бонусы)
        ctx.font = '14px monospace'; 
        let bonusCount = (this.slowTimeDuration > 0 ? 1 : 0) + (this.magnetDuration > 0 ? 1 : 0);
        
        if (bonusCount > 0) {
            // Фон для таймеров
            ctx.fillStyle = 'rgba(0,0,0,0.85)'; 
            ctx.fillRect(W - (60 * bonusCount) - 10, 5, 60 * bonusCount + 10, 30); 
        }

        let bonusX = W - 50 * bonusCount;
        
        if (this.slowTimeDuration > 0) {
            ctx.fillStyle = uiColor; 
            ctx.fillText(`🐢 ${Math.ceil(this.slowTimeDuration / 60)}s`, bonusX - 50, 27);
        }
        if (this.magnetDuration > 0) {
            ctx.fillStyle = uiColor;
            ctx.fillText(`🧲 ${Math.ceil(this.magnetDuration / 60)}s`, bonusX, 27);
        }


        // NEW: Переработанный блок сообщений
        if (this.gameState !== 'playing') {
            const centerX = W / 2;
            const centerY = H / 2;
            const boxWidth = 280;
            const boxHeight = 110;

            // Фон сообщения
            ctx.fillStyle = 'rgba(15,23,42,0.9)';
            ctx.fillRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);
            
            // Рамка
            ctx.strokeStyle = uiColor;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);

            ctx.textAlign = 'center'; // Выравнивание текста по центру

            // Заголовок
            ctx.font = '24px monospace';
            ctx.fillStyle = getCssVar('--canvas-token-color');
            let title = '';
            let subtitle1 = '';
            let subtitle2 = '';

            if (this.gameState === 'menu') {
                title = 'CRYPTO WOLF';
                subtitle1 = 'Нажми "Старт" или кликни по экрану';
            } else if (this.gameState === 'gameover') {
                title = 'GAME OVER';
                subtitle1 = `Поймано токенов: ${Math.floor(this.score)}`;
                subtitle2 = 'Нажми "Играть снова"';
            } else if (this.gameState === 'paused') {
                title = 'ПАУЗА';
                subtitle1 = 'Нажми ▶ или кликни, чтобы продолжить';
            }
            
            ctx.fillText(title, centerX, centerY - 20);

            // Подзаголовки
            ctx.fillStyle = uiColor;
            ctx.font = '12px monospace';
            ctx.fillText(subtitle1, centerX, centerY + 10);
            if (subtitle2) {
                ctx.fillText(subtitle2, centerX, centerY + 35);
            }
        }
    }

    loop() {
      this.updateGame();
      this.drawGame();
      requestAnimationFrame(() => this.loop());
    }
}