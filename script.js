// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.log('SW error:', err));
}

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7bi_YlW0_HAqzkTlEZS-phoQpak1iB_w",
    authDomain: "pitch-stats.firebaseapp.com",
    projectId: "pitch-stats",
    storageBucket: "pitch-stats.firebasestorage.app",
    messagingSenderId: "753464692599",
    appId: "1:753464692599:web:cfa7df86c4c1888e1ddb72",
    measurementId: "G-0QCCNTHD2W"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
let allMatches = [];
let ytPlayer = null;
let currentVideoId = '';

// App load hote hi public data fetch karna aur drag functionality setup karna
document.addEventListener("DOMContentLoaded", () => {
    loadPublicData();
    setupDraggablePiP();
});

// Auth State Listener
auth.onAuthStateChanged(user => {
    const btn = document.getElementById('auth-btn');
    const status = document.getElementById('user-status');
    if (user) {
        if(btn) {
            btn.innerText = 'Logout';
            btn.className = 'px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-sm font-semibold transition border border-slate-700';
        }
        if(status) status.innerText = 'ADMIN: ' + (user.displayName || user.email);
    } else {
        if(btn) {
            btn.innerText = 'Admin Login';
            btn.className = 'px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition';
        }
        if(status) status.innerText = 'PUBLIC VIEW (READ-ONLY)';
    }
    applyFilters();
});

function handleAuth() {
    if (auth.currentUser) {
        auth.signOut();
    } else {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => {
            alert('Login Error: ' + err.message);
        });
    }
}

// Firestore Matches Data Load
function loadPublicData() {
    const status = document.getElementById('user-status');
    if(status) status.innerText = 'LOADING DATA...';

    db.collection('matches').orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateFilters(allMatches);
            applyFilters();
            if(status) status.innerText = auth.currentUser ? 'ADMIN MODE' : 'PUBLIC VIEW (READ-ONLY)';
        }, err => {
            console.error("Firestore Match Error: ", err);
            if(status) status.innerText = 'ERROR LOADING DATA';
        });
}

function populateFilters(data) {
    const venueSelect = document.getElementById('filter-venue');
    const pitchSelect = document.getElementById('filter-pitch');
    if (!venueSelect || !pitchSelect) return;

    const venues = [...new Set(data.map(m => m.venue).filter(Boolean))];
    const pitches = [...new Set(data.map(m => m.pitchNo).filter(Boolean))];

    venueSelect.innerHTML = `<option value="all">All Venues</option>` + venues.map(v => `<option value="${v}">${v}</option>`).join('');
    pitchSelect.innerHTML = `<option value="all">All Pitches</option>` + pitches.map(p => `<option value="${p}">${p}</option>`).join('');
}

function handleSearchInput() {
    applyFilters();
}

function applyFilters() {
    const searchInput = document.getElementById('search-input');
    const venueElem = document.getElementById('filter-venue');
    const pitchElem = document.getElementById('filter-pitch');
    const formatElem = document.getElementById('filter-format');

    const searchVal = searchInput ? searchInput.value.toLowerCase() : '';
    const venueVal = venueElem ? venueElem.value : 'all';
    const pitchVal = pitchElem ? pitchElem.value : 'all';
    const formatVal = formatElem ? formatElem.value : 'all';

    let filtered = allMatches.filter(m => {
        const venueText = (m.venue || '').toLowerCase();
        const seriesText = (m.series || '').toLowerCase();
        const team1Text = (m.team1 || '').toLowerCase();
        const team2Text = (m.team2 || '').toLowerCase();
        const pitchText = (m.pitchNo || '').toLowerCase();

        const matchesSearch = !searchVal || venueText.includes(searchVal) || seriesText.includes(searchVal) || team1Text.includes(searchVal) || team2Text.includes(searchVal) || pitchText.includes(searchVal);

        return matchesSearch &&
               (venueVal === 'all' || m.venue === venueVal) &&
               (pitchVal === 'all' || m.pitchNo === pitchVal) &&
               (formatVal === 'all' || m.format === formatVal);
    });

    renderUI(filtered, pitchVal !== 'all' ? `Pitch ${pitchVal} Average` : 'Overall Average');
}

function renderUI(matches, avgSubText = 'Overall Average') {
    const totalMatchesElem = document.getElementById('total-matches');
    const pitchAvgSubElem = document.getElementById('pitch-avg-sub');
    if (totalMatchesElem) totalMatchesElem.innerText = matches.length;
    if (pitchAvgSubElem) pitchAvgSubElem.innerText = avgSubText;
    
    let avg1 = 0, avg2 = 0, win1 = 0, win2 = 0, totalPacers = 0, totalSpinners = 0;
    if (matches.length > 0) {
        avg1 = Math.round(matches.reduce((acc, m) => acc + (Number(m.score1) || 0), 0) / matches.length);
        avg2 = Math.round(matches.reduce((acc, m) => acc + (Number(m.score2) || 0), 0) / matches.length);
        win1 = matches.filter(m => m.winner === '1st').length;
        win2 = matches.filter(m => m.winner === '2nd').length;
        totalPacers = (matches.reduce((acc, m) => acc + (Number(m.pacers) || 0), 0) / matches.length).toFixed(1);
        totalSpinners = (matches.reduce((acc, m) => acc + (Number(m.spinners) || 0), 0) / matches.length).toFixed(1);
    }

    if(document.getElementById('avg-1st')) document.getElementById('avg-1st').innerText = avg1;
    if(document.getElementById('avg-2nd')) document.getElementById('avg-2nd').innerText = avg2;
    if(document.getElementById('avg-pacers')) document.getElementById('avg-pacers').innerText = totalPacers;
    if(document.getElementById('avg-spinners')) document.getElementById('avg-spinners').innerText = totalSpinners;

    const p1 = matches.length ? Math.round((win1 / matches.length) * 100) : 0;
    const p2 = matches.length ? Math.round((win2 / matches.length) * 100) : 0;

    if(document.getElementById('win-1st-percent')) document.getElementById('win-1st-percent').innerText = p1 + '%';
    if(document.getElementById('win-2nd-percent')) document.getElementById('win-2nd-percent').innerText = p2 + '%';
    if(document.getElementById('bar-1st')) document.getElementById('bar-1st').style.width = p1 + '%';
    if(document.getElementById('bar-2nd')) document.getElementById('bar-2nd').style.width = p2 + '%';

    const list = document.getElementById('scorecard-list');
    if (!list) return;

    if (matches.length === 0) {
        list.innerHTML = `<p class="text-xs text-gray-500 text-center py-4">No matching scorecards found.</p>`;
        return;
    }

    list.innerHTML = matches.map(m => `
        <div class="card-bg p-3.5 rounded-xl flex justify-between items-center border-l-4 border-emerald-500">
            <div class="space-y-1">
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold text-gray-100">${m.team1 || 'Team A'} vs ${m.team2 || 'Team B'}</span>
                    <span class="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">${m.format || 'T20'}</span>
                </div>
                <p class="text-[11px] text-gray-400">${m.venue || 'Unknown Venue'} | <span class="text-gray-300">Pitch #${m.pitchNo || 'N/A'}</span></p>
                <div class="text-xs font-mono pt-0.5 space-y-0.5">
                    <p>1st Inn: <span class="text-emerald-400 font-bold">${m.score1 || 0}/${m.wkt1 || 0}</span> <span class="text-gray-500 text-[10px]">(${m.over1 || '20'} ov)</span></p>
                    <p>2nd Inn: <span class="text-blue-400 font-bold">${m.score2 || 0}/${m.wkt2 || 0}</span> <span class="text-gray-500 text-[10px]">(${m.over2 || '20'} ov)</span></p>
                </div>
                <p class="text-[10px] text-gray-400 pt-1">Pacers: <span class="text-orange-400">${m.pacers || 0}</span> | Spin: <span class="text-purple-400">${m.spinners || 0}</span> wkt</p>
            </div>
            ${auth.currentUser ? `
            <div class="flex flex-col space-y-2">
                <button onclick="editMatch('${m.id}')" class="text-xs text-amber-400 hover:bg-slate-800 p-1 rounded">✏</button>
                <button onclick="deleteMatch('${m.id}')" class="text-xs text-red-500 hover:bg-slate-800 p-1 rounded">🗑</button>
            </div>` : ''}
        </div>
    `).join('');
}

function openModal(id = null) {
    if (!auth.currentUser) {
        alert('⚠️ Access Denied: Match add karne ke liye pehle Admin Login karein!');
        handleAuth();
        return;
    }
    document.getElementById('match-modal').classList.remove('hidden');
    if (id) {
        document.getElementById('modal-title').innerText = 'Edit Match Scorecard';
        const match = allMatches.find(m => m.id === id);
        if (match) {
            document.getElementById('edit-doc-id').value = match.id;
            document.getElementById('m-league-type').value = match.leagueType || 'Domestic';
            document.getElementById('m-format').value = match.format || 'T20';
            document.getElementById('m-team1').value = match.team1 || '';
            document.getElementById('m-team2').value = match.team2 || '';
            document.getElementById('m-series').value = match.series || '';
            document.getElementById('m-venue').value = match.venue || '';
            document.getElementById('m-pitch-no').value = match.pitchNo || '';
            document.getElementById('m-score1').value = match.score1 || '';
            document.getElementById('m-wkt1').value = match.wkt1 || '';
            document.getElementById('m-over1').value = match.over1 || '';
            document.getElementById('m-score2').value = match.score2 || '';
            document.getElementById('m-wkt2').value = match.wkt2 || '';
            document.getElementById('m-over2').value = match.over2 || '';
            document.getElementById('m-pacers').value = match.pacers || '';
            document.getElementById('m-spinners').value = match.spinners || '';
            document.getElementById('m-winner').value = match.winner || '1st';
        }
    } else {
        document.getElementById('modal-title').innerText = 'Add Match Scorecard';
        document.getElementById('edit-doc-id').value = '';
        document.getElementById('m-team1').value = '';
        document.getElementById('m-team2').value = '';
        document.getElementById('m-series').value = '';
        document.getElementById('m-venue').value = '';
        document.getElementById('m-pitch-no').value = '';
        document.getElementById('m-score1').value = '';
        document.getElementById('m-wkt1').value = '';
        document.getElementById('m-over1').value = '';
        document.getElementById('m-score2').value = '';
        document.getElementById('m-wkt2').value = '';
        document.getElementById('m-over2').value = '';
        document.getElementById('m-pacers').value = '';
        document.getElementById('m-spinners').value = '';
    }
}

function closeModal() {
    document.getElementById('match-modal').classList.add('hidden');
}

function saveMatch() {
    if (!auth.currentUser) {
        alert('Admin login required!');
        return;
    }

    const id = document.getElementById('edit-doc-id').value;
    const leagueType = document.getElementById('m-league-type').value;
    const format = document.getElementById('m-format').value;
    const team1 = document.getElementById('m-team1').value;
    const team2 = document.getElementById('m-team2').value;
    const series = document.getElementById('m-series').value;
    const venue = document.getElementById('m-venue').value;
    const pitchNo = document.getElementById('m-pitch-no').value;
    const score1 = Number(document.getElementById('m-score1').value);
    const wkt1 = Number(document.getElementById('m-wkt1').value);
    const over1 = document.getElementById('m-over1').value;
    const score2 = Number(document.getElementById('m-score2').value);
    const wkt2 = Number(document.getElementById('m-wkt2').value);
    const over2 = document.getElementById('m-over2').value;
    const pacers = Number(document.getElementById('m-pacers').value);
    const spinners = Number(document.getElementById('m-spinners').value);
    const winner = document.getElementById('m-winner').value;

    if (!venue || !score1 || !score2) {
        alert('Please fill Venue and both Innings scores!');
        return;
    }

    const payload = {
        leagueType, format, team1, team2, series, venue, pitchNo, 
        score1, wkt1, over1, score2, wkt2, over2, pacers, spinners, winner,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const collectionRef = db.collection('matches');
    const promise = id ? collectionRef.doc(id).update(payload) : collectionRef.add({
        ...payload,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    promise.then(() => {
        closeModal();
    }).catch(err => alert('Error saving: ' + err.message));
}

function editMatch(id) {
    openModal(id);
}

function deleteMatch(id) {
    if (!auth.currentUser) {
        alert('Admin login required!');
        return;
    }
    if (confirm('Delete this scorecard?')) {
        db.collection('matches').doc(id).delete();
    }
}

// YouTube API Callback
function onYouTubeIframeAPIReady() {
    // API initialized
}

// YouTube Video / Live Player
function loadYouTubeLive() {
    const inputVal = document.getElementById('yt-link-input').value.trim();
    const container = document.getElementById('yt-player-container');
    const pipBtn = document.getElementById('pip-btn');
    
    if (!inputVal) {
        alert('Kripya valid YouTube link ya Video ID dalein!');
        return;
    }

    let videoId = '';
    if (inputVal.includes('youtu.be/')) {
        videoId = inputVal.split('youtu.be/')[1]?.split('?')[0];
    } else if (inputVal.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(inputVal).search);
        videoId = urlParams.get('v');
    } else if (inputVal.includes('youtube.com/live/')) {
        videoId = inputVal.split('youtube.com/live/')[1]?.split('?')[0];
    } else if (inputVal.includes('youtube.com/embed/')) {
        videoId = inputVal.split('youtube.com/embed/')[1]?.split('?')[0];
    } else {
        videoId = inputVal;
    }

    if (videoId) {
        currentVideoId = videoId;
        container.classList.remove('hidden');
        if(pipBtn) pipBtn.classList.remove('hidden');

        if (ytPlayer) {
            ytPlayer.loadVideoById(videoId);
        } else {
            ytPlayer = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'autoplay': 1,
                    'playsinline': 1,
                    'modestbranding': 1,
                    'rel': 0,
                    'fs': 1
                },
                events: {
                    'onReady': (event) => event.target.playVideo()
                }
            });
        }
    } else {
        alert('YouTube link sahi nahi hai. Dobara check karein!');
    }
}

// In-App Floating PiP Toggle
function togglePiP() {
    const container = document.getElementById('yt-player-container');
    const pipBtn = document.getElementById('pip-btn');
    if (!container) return;

    if (container.classList.contains('pip-mode')) {
        container.classList.remove('pip-mode');
        container.style.left = '';
        container.style.top = '';
        container.style.bottom = '20px';
        container.style.right = '20px';
        pipBtn.innerText = '📌 Pop-out (PiP)';
    } else {
        container.classList.add('pip-mode');
        pipBtn.innerText = '❌ Close PiP';
    }
}

// Draggable Floating PiP Logic (Touch & Mouse Support)
function setupDraggablePiP() {
    const container = document.getElementById('yt-player-container');
    if (!container) return;

    let isDragging = false;
    let startX, startY, initialX, initialY;

    // Touch start (Mobile)
    container.addEventListener('touchstart', (e) => {
        if (!container.classList.contains('pip-mode')) return;
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        initialX = container.offsetLeft;
        initialY = container.offsetTop;
    }, {passive: true});

    // Touch move (Mobile)
    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        
        container.style.left = `${initialX + dx}px`;
        container.style.top = `${initialY + dy}px`;
        container.style.bottom = 'auto';
        container.style.right = 'auto';
    }, {passive: true});

    // Touch end (Mobile)
    document.addEventListener('touchend', () => {
        isDragging = false;
    });

    // Mouse events for Desktop testing
    container.addEventListener('mousedown', (e) => {
        if (!container.classList.contains('pip-mode')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        initialX = container.offsetLeft;
        initialY = container.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        
        container.style.left = `${initialX + dx}px`;
        container.style.top = `${initialY + dy}px`;
        container.style.bottom = 'auto';
        container.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });
}
