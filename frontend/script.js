/**
 * FC Barcelona Dashboard - Frontend JavaScript
 * Handles API calls and dynamic content loading
 */

// ====== Configuration ======
const API_BASE = 'https://barcalona.onrender.com/api'; // Base URL for API endpoints
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
 * Resolve country info and build a flag image
 */
function getNationalityInfo(countryName) {
    const raw = String(countryName || '').trim();
    if (!raw) {
        return { iso2: null, label: 'Unknown', flagHtml: '' };
    }

    const normalized = raw.toLowerCase();
    const cleaned = normalized.replace(/[^a-z]/g, '');
    const codeRaw = raw.replace(/[^A-Za-z]/g, '').toLowerCase();

    const countryData = {
        es: { iso2: 'ES', label: 'Spain' },
        esp: { iso2: 'ES', label: 'Spain' },
        spain: { iso2: 'ES', label: 'Spain' },
        de: { iso2: 'DE', label: 'Germany' },
        ger: { iso2: 'DE', label: 'Germany' },
        germany: { iso2: 'DE', label: 'Germany' },
        nl: { iso2: 'NL', label: 'Netherlands' },
        ned: { iso2: 'NL', label: 'Netherlands' },
        netherlands: { iso2: 'NL', label: 'Netherlands' },
        holland: { iso2: 'NL', label: 'Netherlands' },
        pl: { iso2: 'PL', label: 'Poland' },
        pol: { iso2: 'PL', label: 'Poland' },
        poland: { iso2: 'PL', label: 'Poland' },
        fr: { iso2: 'FR', label: 'France' },
        fra: { iso2: 'FR', label: 'France' },
        france: { iso2: 'FR', label: 'France' },
        br: { iso2: 'BR', label: 'Brazil' },
        bra: { iso2: 'BR', label: 'Brazil' },
        brazil: { iso2: 'BR', label: 'Brazil' },
        pt: { iso2: 'PT', label: 'Portugal' },
        por: { iso2: 'PT', label: 'Portugal' },
        portugal: { iso2: 'PT', label: 'Portugal' },
        uy: { iso2: 'UY', label: 'Uruguay' },
        uru: { iso2: 'UY', label: 'Uruguay' },
        uruguay: { iso2: 'UY', label: 'Uruguay' },
        dk: { iso2: 'DK', label: 'Denmark' },
        den: { iso2: 'DK', label: 'Denmark' },
        denmark: { iso2: 'DK', label: 'Denmark' },
        ar: { iso2: 'AR', label: 'Argentina' },
        arg: { iso2: 'AR', label: 'Argentina' },
        argentina: { iso2: 'AR', label: 'Argentina' },
        ci: { iso2: 'CI', label: 'Ivory Coast' },
        civ: { iso2: 'CI', label: 'Ivory Coast' },
        ivorycoast: { iso2: 'CI', label: 'Ivory Coast' },
        cotedivoire: { iso2: 'CI', label: 'Ivory Coast' },
        sn: { iso2: 'SN', label: 'Senegal' },
        sen: { iso2: 'SN', label: 'Senegal' },
        senegal: { iso2: 'SN', label: 'Senegal' },
        us: { iso2: 'US', label: 'United States' },
        usa: { iso2: 'US', label: 'United States' },
        unitedstates: { iso2: 'US', label: 'United States' },
        unitedstatesofamerica: { iso2: 'US', label: 'United States' },
        gb: { iso2: 'GB', label: 'United Kingdom' },
        uk: { iso2: 'GB', label: 'United Kingdom' },
        greatbritain: { iso2: 'GB', label: 'United Kingdom' },
        unitedkingdom: { iso2: 'GB', label: 'United Kingdom' },
        eng: { iso2: 'GB', label: 'England' },
        england: { iso2: 'GB', label: 'England' },
        it: { iso2: 'IT', label: 'Italy' },
        ita: { iso2: 'IT', label: 'Italy' },
        italy: { iso2: 'IT', label: 'Italy' },
        hr: { iso2: 'HR', label: 'Croatia' },
        cro: { iso2: 'HR', label: 'Croatia' },
        croatia: { iso2: 'HR', label: 'Croatia' },
        ma: { iso2: 'MA', label: 'Morocco' },
        mar: { iso2: 'MA', label: 'Morocco' },
        morocco: { iso2: 'MA', label: 'Morocco' },
        be: { iso2: 'BE', label: 'Belgium' },
        bel: { iso2: 'BE', label: 'Belgium' },
        belgium: { iso2: 'BE', label: 'Belgium' },
        se: { iso2: 'SE', label: 'Sweden' },
        swe: { iso2: 'SE', label: 'Sweden' },
        sweden: { iso2: 'SE', label: 'Sweden' },
        rs: { iso2: 'RS', label: 'Serbia' },
        srb: { iso2: 'RS', label: 'Serbia' },
        serbia: { iso2: 'RS', label: 'Serbia' },
        gn: { iso2: 'GN', label: 'Guinea' },
        gui: { iso2: 'GN', label: 'Guinea' },
        guinea: { iso2: 'GN', label: 'Guinea' },
        ml: { iso2: 'ML', label: 'Mali' },
        mli: { iso2: 'ML', label: 'Mali' },
        mali: { iso2: 'ML', label: 'Mali' },
        co: { iso2: 'CO', label: 'Colombia' },
        col: { iso2: 'CO', label: 'Colombia' },
        colombia: { iso2: 'CO', label: 'Colombia' },
        mx: { iso2: 'MX', label: 'Mexico' },
        mex: { iso2: 'MX', label: 'Mexico' },
        mexico: { iso2: 'MX', label: 'Mexico' },
        gh: { iso2: 'GH', label: 'Ghana' },
        gha: { iso2: 'GH', label: 'Ghana' },
        ghana: { iso2: 'GH', label: 'Ghana' },
        cm: { iso2: 'CM', label: 'Cameroon' },
        cmr: { iso2: 'CM', label: 'Cameroon' },
        cameroon: { iso2: 'CM', label: 'Cameroon' },
        jp: { iso2: 'JP', label: 'Japan' },
        jpn: { iso2: 'JP', label: 'Japan' },
        japan: { iso2: 'JP', label: 'Japan' },
        kr: { iso2: 'KR', label: 'South Korea' },
        kor: { iso2: 'KR', label: 'South Korea' },
        southkorea: { iso2: 'KR', label: 'South Korea' },
        republicofkorea: { iso2: 'KR', label: 'South Korea' },
        korea: { iso2: 'KR', label: 'South Korea' },
        no: { iso2: 'NO', label: 'Norway' },
        nor: { iso2: 'NO', label: 'Norway' },
        norway: { iso2: 'NO', label: 'Norway' },
        at: { iso2: 'AT', label: 'Austria' },
        aut: { iso2: 'AT', label: 'Austria' },
        austria: { iso2: 'AT', label: 'Austria' },
        ch: { iso2: 'CH', label: 'Switzerland' },
        sui: { iso2: 'CH', label: 'Switzerland' },
        switzerland: { iso2: 'CH', label: 'Switzerland' },
        cl: { iso2: 'CL', label: 'Chile' },
        chi: { iso2: 'CL', label: 'Chile' },
        chile: { iso2: 'CL', label: 'Chile' },
        tr: { iso2: 'TR', label: 'Turkey' },
        tur: { iso2: 'TR', label: 'Turkey' },
        turkey: { iso2: 'TR', label: 'Turkey' }
    };

    let entry = countryData[normalized] || countryData[cleaned] || countryData[codeRaw] || null;
    if (!entry) {
        for (const [key, value] of Object.entries(countryData)) {
            if (key.length > 2 && cleaned.includes(key)) {
                entry = value;
                break;
            }
        }
    }

    let iso2 = entry ? entry.iso2 : null;
    let label = entry ? entry.label : raw;

    if (!iso2 && codeRaw.length === 2) {
        iso2 = codeRaw.toUpperCase();
    }

    const flagHtml = iso2
        ? `<img class="flag-icon" src="https://flagcdn.com/24x18/${iso2.toLowerCase()}.png" alt="${label} flag" loading="lazy">`
        : '';

    return { iso2, label, flagHtml };
}

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

/**
 * Build initials from a full name
 * @param {string} name - Player name
 * @returns {string} - Initials
 */
function getPlayerInitials(name) {
    return (name || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join('');
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
        const photo = player.photo || '';
        const initials = getPlayerInitials(player.name);
        const nationality = getNationalityInfo(player.nationality);
        const nationalityHTML = nationality.flagHtml
            ? `${nationality.flagHtml}<span class="nationality-label">${nationality.label}</span>`
            : `<span class="nationality-label">${nationality.label}</span>`;

        const photoHTML = photo
            ? `<div class="player-photo"><img src="${photo}" alt="${player.name}" loading="lazy"></div>`
            : `<div class="player-photo"><div class="player-photo-fallback">${initials}</div></div>`;

        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.setAttribute('role', 'button');
        playerCard.setAttribute('tabindex', '0');
        playerCard.setAttribute('aria-label', `View details for ${player.name || 'player'}`);

        playerCard.innerHTML = `
            ${photoHTML}
            <div class="player-number">${player.number || '?'}</div>
            <div class="player-name">${player.name || 'Unknown'}</div>
            <div class="player-position">${player.position || 'Unknown'}</div>
            <div class="player-nationality">${nationalityHTML}</div>
        `;

        playerCard.addEventListener('click', () => openPlayerModal(player));
        playerCard.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openPlayerModal(player);
            }
        });

        squadContent.appendChild(playerCard);
    });

    hideLoading('squad');
}

// ====== Player Modal ======

/**
 * Open the player detail modal
 * @param {Object} player - Player data
 */
function openPlayerModal(player) {
    const modal = document.getElementById('playerModal');
    if (!modal || !player) return;

    const name = player.name || 'Unknown Player';
    const position = player.position || 'Unknown Position';
    const number = player.number !== null && player.number !== undefined && player.number !== '' ? player.number : '-';
    const nationality = getNationalityInfo(player.nationality);
    const nationalityHTML = nationality.flagHtml
        ? `${nationality.flagHtml}<span class="nationality-label">${nationality.label}</span>`
        : `<span class="nationality-label">${nationality.label}</span>`;
    const initials = getPlayerInitials(name);

    const modalPhoto = document.getElementById('playerModalPhoto');
    if (modalPhoto) {
        if (player.photo) {
            modalPhoto.innerHTML = `<img src="${player.photo}" alt="${name}" loading="lazy">`;
        } else {
            modalPhoto.innerHTML = `<div class="player-modal-fallback">${initials}</div>`;
        }
    }

    const modalName = document.getElementById('playerModalName');
    const modalPosition = document.getElementById('playerModalPosition');
    const modalNumber = document.getElementById('playerModalNumber');
    const modalNationality = document.getElementById('playerModalNationality');

    if (modalName) modalName.textContent = name;
    if (modalPosition) modalPosition.textContent = position;
    if (modalNumber) modalNumber.textContent = number;
    if (modalNationality) modalNationality.innerHTML = nationalityHTML;

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

/**
 * Close the player detail modal
 */
function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
}

/**
 * Setup player modal close actions
 */
function setupPlayerModal() {
    const modal = document.getElementById('playerModal');
    if (!modal) return;

    modal.addEventListener('click', (event) => {
        const target = event.target;
        if (target && target.hasAttribute('data-modal-close')) {
            closePlayerModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closePlayerModal();
        }
    });
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
        link.addEventListener('click', function (e) {
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
    document.addEventListener('keydown', function (e) {
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
document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
        console.log('Page is visible again, checking for data updates...');
        // Could optionally refresh here
    }
});

// ====== Main Execution ======

// Run when DOM is fully loaded
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM loaded, initializing dashboard...');

    // Setup event listeners
    setupNavigation();
    setupKeyboardShortcuts();
    setupPlayerModal();

    // Initialize the dashboard
    initializeDashboard();

    // Optional: Auto-refresh every 30 minutes (1800000 ms)
    // setInterval(refreshDashboard, 1800000);
});

// ====== Error Handling ======

/**
 * Global error handler
 */
window.addEventListener('error', function (e) {
    console.error('Global JavaScript error:', e.error);
});

/**
 * Handle fetch errors globally
 */
window.addEventListener('unhandledrejection', function (event) {
    console.error('Unhandled promise rejection:', event.reason);
});



