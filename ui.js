// --- ТЕМЫ & TELEGRAM INTEGRATION ---
// Внимание: getCssVar() должен быть определен в token.js или index.html
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const root = document.documentElement;
let isTelegramApp = window.Telegram && window.Telegram.WebApp;
let currentThemeMode = 'dark'; 

function setTheme(mode, save = true) {
    currentThemeMode = mode;
    if (mode === 'light') {
        document.body.classList.remove('dark');
        document.body.classList.add('light');
        themeIcon.textContent = '🌙';
    } else {
        document.body.classList.remove('light');
        document.body.classList.add('dark');
        themeIcon.textContent = '☀️';
    }
    
    if (save) {
        localStorage.setItem('cw_theme', mode);
    }
}

// --- Функция применения Telegram Theme ---
function applyTelegramTheme(params) {
    if (!params || !params.bg_color) return;

    // Определяем тему на основе цвета текста (белый/светлый -> темная тема)
    const isDarkTelegram = params.text_color.toLowerCase().includes('fff') || 
                           params.text_color.toLowerCase().includes('f4f4f4');
    
    setTheme(isDarkTelegram ? 'dark' : 'light', false); 

    // Перезапись CSS переменных значениями из Telegram
    root.style.setProperty('--bg', params.bg_color || '#020617');
    root.style.setProperty('--card-bg', params.secondary_bg_color || params.bg_color || '#111827');
    root.style.setProperty('--shop-bg', params.secondary_bg_color || params.bg_color || '#111827');
    root.style.setProperty('--shop-item-bg', params.secondary_bg_color || params.bg_color || '#111827');
    root.style.setProperty('--text-main', params.text_color || '#e5e7eb');
    root.style.setProperty('--text-muted', params.hint_color || '#9ca3af');
    root.style.setProperty('--accent', params.button_color || '#facc15');
    root.style.setProperty('--button-bg', params.secondary_bg_color || '#111827');
    root.style.setProperty('--button-bg-hover', params.secondary_bg_color || '#1f2937');
}

// --- Инициализация логики темы и интеграции ---
function initializeThemeLogic() {
    if (isTelegramApp) {
        const WebApp = window.Telegram.WebApp;
        WebApp.ready();
        applyTelegramTheme(WebApp.themeParams);
        
        WebApp.onEvent('themeChanged', () => { applyTelegramTheme(WebApp.themeParams); });
        
        // Обработка кнопки НАЗАД
        WebApp.onEvent('backButtonClicked', () => {
            // Используем глобальный объект игры (определен в index.html)
            if (window.GAME && (window.GAME.gameState === 'playing' || window.GAME.gameState === 'paused')) {
                window.GAME.togglePause();
            } else {
                WebApp.close();
            }
        });
        WebApp.BackButton.show(); 
    } else {
        // Fallback: загрузка сохраненной темы
        const savedTheme = localStorage.getItem('cw_theme') || 'dark';
        setTheme(savedTheme);
    }

    // Обработчик для кнопки переключения темы
    themeToggle.addEventListener('click', () => {
        const newMode = currentThemeMode === 'light' ? 'dark' : 'light';
        
        // Сброс CSS-переменных, установленных Telegram, чтобы применились стили body.dark/body.light
        root.style.removeProperty('--bg');
        root.style.removeProperty('--card-bg');
        root.style.removeProperty('--shop-bg');
        root.style.removeProperty('--shop-item-bg');
        root.style.removeProperty('--text-main');
        root.style.removeProperty('--text-muted');
        root.style.removeProperty('--accent');
        root.style.removeProperty('--button-bg');
        root.style.removeProperty('--button-bg-hover');
        
        setTheme(newMode, true);
    });
}