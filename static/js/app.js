// ===== Global App JavaScript =====

// API helper
const api = {
    async request(url, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(url, { ...options, headers });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API error:', error);
            return { success: false, error: '网络错误，请稍后重试' };
        }
    },

    get(url) {
        return this.request(url, { method: 'GET' });
    },

    post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};

// Auth functions
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Mobile menu toggle
function toggleMobileMenu() {
    const nav = document.querySelector('.nav');
    nav.classList.toggle('open');
}

// Close mobile menu when clicking a link
document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            document.querySelector('.nav')?.classList.remove('open');
        });
    });

    // Check authentication on page load
    checkAuth();
});

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const result = await api.get('/api/user');
    if (result.success) {
        localStorage.setItem('user', JSON.stringify(result.user));
        return true;
    }

    // Token invalid, clear storage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return false;
}

// Get current user
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

// Format error message
function showError(message) {
    alert(message); // Simple alert, could be replaced with toast
}

// Card suit symbols
const cardSuits = {
    hearts: '?',
    diamonds: '?',
    clubs: '?',
    spades: '?',
    joker: ''
};

const suitColors = {
    hearts: 'red',
    diamonds: 'red',
    clubs: 'black',
    spades: 'black',
    joker: 'gold'
};

// Card display helpers
function getCardSymbol(suit) {
    return cardSuits[suit] || '';
}

function getSuitColor(suit) {
    return suitColors[suit] || 'black';
}

// Card values for sorting
const cardOrder = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getCardValue(value) {
    return cardOrder.indexOf(value);
}

function compareCards(a, b) {
    if (a.suit !== b.suit) {
        return a.suit.localeCompare(b.suit);
    }
    return getCardValue(b.value) - getCardValue(a.value);
}

// Sort cards by suit and value
function sortCards(cards) {
    return [...cards].sort(compareCards);
}

// Format cards for display
function formatCards(cards) {
    return cards.map(card => {
        const symbol = getCardSymbol(card.suit);
        const color = getSuitColor(card.suit);
        return `<span class="card" style="color: ${color}">${symbol}${card.value}</span>`;
    }).join(' ');
}

// Level progression
const levels = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getNextLevel(currentLevel) {
    const index = levels.indexOf(currentLevel);
    if (index < 0 || index >= levels.length - 1) {
        return currentLevel;
    }
    return levels[index + 1];
}

function getLevelsAfter(currentLevel, count) {
    const index = levels.indexOf(currentLevel);
    if (index < 0) return currentLevel;

    const newIndex = Math.min(index + count, levels.length - 1);
    return levels[newIndex];
}
