/**
 * FC Barcelona Dashboard - Frontend JavaScript
 * Handles API calls and dynamic content loading
 */

// ====== Configuration ======
const API_BASE = 'http://localhost:5000/api';
const CACHE_TIME = 300000; // 5 minutes cache (in milliseconds)

// Global state
let dataCache = {
    club: null,
    squad: null,
    news: null,
    matches: null,
    trophies: null,
    lastFetch: {}
};

// ====== Utility Functions ======

/**
 * Fetch data from API with error handling
 * @param {string} endpoint - API endpoint (e.g., '/club')
 * @returns {Promise<Object>} - API response data
 */
async function fetchData(endpoint) {
    try {
        // Check cache first
        const now = Date.now();
        if (dataCache[endpoint] && 
            (now - (dataCache.lastFetch[endpoint] || 0)) < CACHE_TIME) {
            console.log(`Using cached data for ${endpoint}`);
            return dataCache[endpoint];
        }

        // Show loading spinner
        showLoading(endpoint);

        // Fetch from API
        const response = await fetch(`${API_BASE}/${endpoint}`);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
        // Normalize payload for matches endpoint
        let payload = result.data;

        if (!payload && endpoint === 'matches') {
            payload = {
            upcoming: result.upcoming || [],
            recent: result.recent || []
          };
        }

        if (!payload) throw new Error(result.error || 'Unknown error');

        // Cache the data
        dataCache[endpoint] = payload;
        dataCache.lastFetch[endpoint] = now;

        console.log(`Loaded ${endpoint} data successfully`);
        return payload;
    } else {
    throw new Error(result.error || 'Unknown error');
    }

    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        showError(endpoint, error.message);
        return null;
    }
}

/**
 * Show loading spinner for a section
 * @param {string} section - Section identifier
 */
function showLoading(section) {
    const loadingElement = document.getElementById(`${section}Loading`);
    if (loadingElement) {
        loadingElement.classList.remove('hidden');
    }
}

/**
 * Hide loading spinner for a section
 * @param {string} section - Section identifier
 */
function hideLoading(section) {
    const loadingElement = document.getElementById(`${section}Loading`);
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
}

/**
 * Show error message for a section
 * @param {string} section - Section identifier
 * @param {string} error - Error message
 */
function showError(section, error) {
    hideLoading(section);
    console.error(`Error in ${section}: ${error}`);
    // In production, you might want to display this to the user
}

/**
 * Format date string (YYYY-MM-DD to more readable format)
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date
 */
function formatDate(dateString) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
}

// ====== Club Info Section ======

/**
 * Load and display club information
 */
async function loadClubInfo() {
    const data = await fetchData('club');
    
    if (!data) {
        hideLoading('club');
        return;
    }

    // Populate club information
    document.getElementById('clubName').textContent = data.name || '-';
    document.getElementById('clubFounded').textContent = data.founded || '-';
    document.getElementById('clubStadium').textContent = data.stadium || '-';
    document.getElementById('clubCapacity').textContent = data.capacity || '-';
    document.getElementById('clubManager').textContent = data.manager || '-';
    document.getElementById('clubColors').textContent = data.colors || '-';
    document.getElementById('clubCity').textContent = data.city || '-';
    document.getElementById('clubNickname').textContent = data.nickname || '-';

    hideLoading('club');
}

// ====== Squad Section ======

/**
 * Load and display squad players
 */
async function loadSquad() {
    const players = await fetchData('squad');
    
    if (!players || !Array.isArray(players)) {
        hideLoading('squad');
        return;
    }

    const squadContent = document.getElementById('squadContent');
    squadContent.innerHTML = '';

    // Create player cards
    players.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        
        playerCard.innerHTML = `
            <div class="player-number">${player.number || '?'}</div>
            <div class="player-name">${player.name || 'Unknown'}</div>
            <div class="player-position">${player.position || 'Unknown'}</div>
            <div class="player-nationality">🌍 ${player.nationality || 'Unknown'}</div>
        `;
        
        squadContent.appendChild(playerCard);
    });

    hideLoading('squad');
}

// ====== Matches Section ======

/**
 * Load and display upcoming matches and recent results
 */
async function loadMatches() {
    const matchData = await fetchData('matches');
    
    if (!matchData) {
        hideLoading('matches');
        return;
    }

    // Load upcoming matches
    const upcomingMatches = matchData.upcoming || [];
    const upcomingTableBody = document.getElementById('upcomingMatches');
    upcomingTableBody.innerHTML = '';

    upcomingMatches.forEach(match => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(match.date)}</td>
            <td><strong>${match.opponent}</strong></td>
            <td>${match.competition}</td>
            <td>${match.venue}</td>
        `;
        upcomingTableBody.appendChild(row);
    });

    // Load recent results
    const recentMatches = matchData.recent || [];
    const recentTableBody = document.getElementById('recentMatches');
    recentTableBody.innerHTML = '';

    recentMatches.forEach(match => {
        const row = document.createElement('tr');
        const resultClass = match.result ? 'text-primary' : '';
        row.innerHTML = `
            <td>${formatDate(match.date)}</td>
            <td><strong>${match.opponent}</strong></td>
            <td><strong class="${resultClass}">${match.result || 'N/A'}</strong></td>
            <td>${match.competition}</td>
            <td>${match.venue}</td>
        `;
        recentTableBody.appendChild(row);
    });

    hideLoading('matches');
}

// ====== Trophies Section ======

/**
 * Load and display trophies
 */
async function loadTrophies() {
    const trophies = await fetchData('trophies');
    
    if (!trophies || !Array.isArray(trophies)) {
        hideLoading('trophies');
        return;
    }

    const trophiesContent = document.getElementById('trophiesContent');
    trophiesContent.innerHTML = '';

    // Create trophy cards
    trophies.forEach(trophy => {
        const trophyCard = document.createElement('div');
        trophyCard.className = 'trophy-card';
        
        // Select emoji based on trophy color
        const emoji = trophy.color === 'gold' ? '🏆' : '🥈';
        
        trophyCard.innerHTML = `
            <div class="trophy-emoji">${emoji}</div>
            <div class="trophy-name">${trophy.name || 'Trophy'}</div>
            <div class="trophy-count">${trophy.count || 0} Titles</div>
            <div class="trophy-year">Last Won: ${trophy.lastWon || 'N/A'}</div>
        `;
        
        trophiesContent.appendChild(trophyCard);
    });

    hideLoading('trophies');
}

// ====== News Section ======

/**
 * Load and display latest news
 */
async function loadNews() {
    const news = await fetchData('news');
    
    if (!news || !Array.isArray(news)) {
        hideLoading('news');
        return;
    }

    const newsContent = document.getElementById('newsContent');
    newsContent.innerHTML = '';

    // Create news cards
    news.forEach(article => {
        const newsCard = document.createElement('div');
        newsCard.className = 'news-card';
        
        newsCard.innerHTML = `
            <div class="news-category">${article.category || 'News'}</div>
            <div class="news-title">${article.title || 'No title'}</div>
            <div class="news-date">${formatDate(article.date)}</div>
            <div class="news-source">📰 ${article.source || 'Unknown Source'}</div>
        `;
        
        newsContent.appendChild(newsCard);
    });

    hideLoading('news');
}

// ====== Page Load & Initialization ======

/**
 * Initialize dashboard by loading all sections
 */
async function initializeDashboard() {
    console.log('Initializing FC Barcelona Dashboard...');
    
    // Load all sections in parallel
    Promise.all([
        loadClubInfo(),
        loadSquad(),
        loadMatches(),
        loadTrophies(),
        loadNews()
    ]).then(() => {
        console.log('Dashboard loaded successfully!');
    }).catch(error => {
        console.error('Error initializing dashboard:', error);
    });
}

/**
 * Refresh all data manually
 */
function refreshDashboard() {
    console.log('Refreshing dashboard data...');
    
    // Clear cache
    dataCache = {
        club: null,
        squad: null,
        news: null,
        matches: null,
        trophies: null,
        lastFetch: {}
    };
    
    // Reload all sections
    initializeDashboard();
}

/**
 * Setup smooth scrolling for navigation links
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Add keyboard shortcut for refresh (Ctrl+R or Cmd+R still works normally)
 * Add F5 as refresh shortcut
 */
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // F5 key to refresh dashboard
        if (e.key === 'F5') {
            e.preventDefault();
            refreshDashboard();
        }
    });
}

// ====== Page Visibility API ======

/**
 * Refresh data when page becomes visible again
 * (Useful when user switches to another tab and comes back)
 */
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        console.log('Page is visible again, checking for data updates...');
        // Could optionally refresh here
    }
});

// ====== Main Execution ======

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing dashboard...');
    
    // Setup event listeners
    setupNavigation();
    setupKeyboardShortcuts();
    
    // Initialize the dashboard
    initializeDashboard();
    
    // Optional: Auto-refresh every 30 minutes (1800000 ms)
    // setInterval(refreshDashboard, 1800000);
});

// ====== Error Handling ======

/**
 * Global error handler
 */
window.addEventListener('error', function(e) {
    console.error('Global JavaScript error:', e.error);
});

/**
 * Handle fetch errors globally
 */
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});
