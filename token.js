// --- Утилита для чтения CSS переменных ---
function getCssVar(name) {
    // Внимание: эта функция должна быть доступна глобально или импортирована
    // В данном случае она будет доступна, так как этот файл импортируется в index.html
    return getComputedStyle(document.body).getPropertyValue(name).trim(); 
}

// ===============================================
// БАЗОВЫЙ КЛАСС ДЛЯ ВСЕХ ПАДАЮЩИХ ОБЪЕКТОВ
// ===============================================

class FallingObject {
    constructor(W, H, speed, radius, color, icon) {
        this.W = W;
        this.H = H;
        this.radius = radius;
        this.speed = speed;
        this.color = color;
        this.icon = icon; 
        this.reset();
    }

    reset() {
        this.x = Math.random() * (this.W - this.radius * 2) + this.radius; 
        this.y = -this.radius * 2;
    }

    update(slowFactor = 1) {
        this.y += this.speed * slowFactor;
    }
    
    // Проверка столкновения с волком
    checkCollision(wolf) {
        return (
            this.y + this.radius >= wolf.y &&
            this.x >= wolf.x &&
            this.x <= wolf.x + wolf.width
        );
    }
    
    draw(ctx) {
        const tokenColor = this.color;
        const tokenRingColor = getCssVar('--canvas-token-ring');
        const tokenStripeColor = getCssVar('--canvas-token-stripe');

        // Кольцо
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = tokenRingColor;
        ctx.fill();

        // Основной объект
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = tokenColor;
        ctx.fill();

        // Значок (полоска)
        ctx.strokeStyle = tokenStripeColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x - 4, this.y);
        ctx.lineTo(this.x + 4, this.y);
        ctx.stroke();

        // Отрисовка кастомной иконки (для Skull/Golden)
        if (this.icon !== 'TOK') {
            ctx.fillStyle = getCssVar('--canvas-ui-color');
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.icon, this.x, this.y + 3);
        }
    }
}

// ===============================================
// ОБЫЧНЫЙ ТОКЕН (+1 TOK, +1 Score)
// ===============================================
class CoinToken extends FallingObject {
    constructor(W, H, initialSpeed) {
        super(
            W, H, initialSpeed, 8, getCssVar('--canvas-token-color'), 'TOK'
        );
        this.type = 'coin';
    }
}


// ===============================================
// НЕГАТИВНЫЙ ТОКЕН (-20 TOK, 0 Score)
// ===============================================
class SkullToken extends FallingObject {
    constructor(W, H, initialSpeed) {
        super(
            W, H, initialSpeed * 1.2, 8, '#ef4444', '💀'
        );
        this.type = 'skull';
    }
}

// ===============================================
// ЗОЛОТОЙ ТОКЕН (+10 TOK, +10 Score)
// ===============================================
class GoldenToken extends FallingObject {
    constructor(W, H, initialSpeed) {
        super(
            W, 
            H, 
            initialSpeed * 0.9, 
            10, 
            '#FFD700', 
            '✨' 
        );
        this.type = 'golden';
    }
}

// ===============================================
// БОНУС: ЗАМЕДЛЕНИЕ (SlowTime) - NEW
// ===============================================
class SlowTimeBonus extends FallingObject {
    constructor(W, H, initialSpeed) {
        super(
            W, 
            H, 
            initialSpeed * 0.8, 
            10, 
            getCssVar('--canvas-bonus-color-slow'), 
            '🐢' 
        );
        this.type = 'slowtime';
    }
    // Переопределяем метод draw для отображения бонуса иначе (квадрат)
    draw(ctx) {
        const color = getCssVar('--canvas-bonus-color-slow');
        const ringColor = getCssVar('--canvas-token-ring');
        const uiColor = getCssVar('--canvas-ui-color');

        // Квадратное кольцо 
        ctx.fillStyle = ringColor;
        ctx.fillRect(this.x - this.radius - 3, this.y - this.radius - 3, this.radius * 2 + 6, this.radius * 2 + 6);

        // Основной объект
        ctx.fillStyle = color;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);

        // Иконка
        ctx.fillStyle = uiColor;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.icon, this.x, this.y + 5);
    }
}


// ===============================================
// БОНУС: МАГНИТ (Magnet) - NEW
// ===============================================
class MagnetBonus extends FallingObject {
    constructor(W, H, initialSpeed) {
        super(
            W, 
            H, 
            initialSpeed * 0.8, 
            10, 
            getCssVar('--canvas-bonus-color-magnet'), 
            '🧲' 
        );
        this.type = 'magnet';
    }
    // Переопределяем метод draw для отображения бонуса иначе (квадрат)
    draw(ctx) {
        const color = getCssVar('--canvas-bonus-color-magnet');
        const ringColor = getCssVar('--canvas-token-ring');
        const uiColor = getCssVar('--canvas-ui-color');

        // Квадратное кольцо
        ctx.fillStyle = ringColor;
        ctx.fillRect(this.x - this.radius - 3, this.y - this.radius - 3, this.radius * 2 + 6, this.radius * 2 + 6);

        // Основной объект
        ctx.fillStyle = color;
        ctx.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);

        // Иконка
        ctx.fillStyle = uiColor;
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.icon, this.x, this.y + 5);
    }
}