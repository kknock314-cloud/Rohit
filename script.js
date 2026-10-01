// Service Worker Registration for PWA & Cache update version
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

// Auth State Listener
auth.onAuthStateChanged(user => {
    const btn = document.getElementById('auth-btn');
    const status = document.getElementById('user-status');
    if (user) {
        btn.innerText = 'Logout';
        btn.className = 'px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-sm font-semibold transition border border-slate-700';
        status.innerText = user.displayName || user.email;
        loadMatches(user.uid);
    } else {
        btn.innerText = 'Login';
        btn.className = 'px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition';
        status.innerText = 'NOT LOGGED IN';
        allMatches = [];
        renderUI([]);
    }
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

function loadMatches(uid) {
    db.collection('users').doc(uid).collection('matches')
        .onSnapshot(snapshot => {
            allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateFilters(allMatches);
            applyFilters();
        }, err => {
            console.error("Firestore Error: ", err);
        });
}

function populateFilters(data) {
    const venueSelect = document.getElementById('filter-venue');
    const pitchSelect = document.getElementById('filter-pitch');

    const venues = [...new Set(data.map(m => m.venue).filter(Boolean))];
    const pitches = [...new Set(data.map(m => m.pitchNo).filter(Boolean))];

    venueSelect.innerHTML = `<option value="all">All Venues</option>` + venues.map(v => `<option value="${v}">${v}</option>`).join('');
    pitchSelect.innerHTML = `<option value="all">All Pitches</option>` + pitches.map(p => `<option value="${p}">${p}</option>`).join('');
}

// Main Search Bar Suggestion Handler
function handleSearchInput() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    const suggestionsBox = document.getElementById('search-suggestions');
    
    applyFilters();

    if (!query) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
        return;
    }

    let matchesFound = new Set();
    allMatches.forEach(m => {
        if (m.team1 && m.team1.toLowerCase().includes(query)) matchesFound.add(m.team1);
        if (m.team2 && m.team2.toLowerCase().includes(query)) matchesFound.add(m.team2);
        if (m.venue && m.venue.toLowerCase().includes(query)) matchesFound.add(m.venue);
        if (m.series && m.series.toLowerCase().includes(query)) matchesFound.add(m.series);
    });

    let suggestions = Array.from(matchesFound).slice(0, 5);

    if (suggestions.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    suggestionsBox.innerHTML = suggestions.map(item => `
        <div onclick="selectSearchSuggestion('${item}')" class="px-3 py-2 text-xs text-gray-300 hover:bg-slate-800 cursor-pointer border-b border-slate-800/50 last:border-none">
            🔍 ${item}
        </div>
    `).join('');
    
    suggestionsBox.classList.remove('hidden');
}

function selectSearchSuggestion(val) {
    document.getElementById('search-input').value = val;
    document.getElementById('search-suggestions').classList.add('hidden');
    applyFilters();
}

// Form Input Live Suggestion Handler
function handleFormInput(inputId, suggestionBoxId) {
    const query = document.getElementById(inputId).value.toLowerCase().trim();
    const suggestionsBox = document.getElementById(suggestionBoxId);

    if (!query) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
        return;
    }

    let uniqueValues = new Set();
    allMatches.forEach(m => {
        let fieldKey = inputId === 'm-team1' || inputId === 'm-team2' ? (inputId === 'm-team1' ? m.team1 : m.team2) :
                       inputId === 'm-series' ? m.series : m.venue;
        if (fieldKey && fieldKey.toLowerCase().includes(query)) {
            uniqueValues.add(fieldKey);
        }
    });

    let suggestions = Array.from(uniqueValues).slice(0, 5);

    if (suggestions.length === 0) {
        suggestionsBox.classList.add('hidden');
        return;
    }

    suggestionsBox.innerHTML = suggestions.map(item => `
        <div onclick="selectFormSuggestion('${inputId}', '${suggestionBoxId}', '${item}')" class="px-3 py-2 text-xs text-gray-300 hover:bg-slate-800 cursor-pointer border-b border-slate-800/50 last:border-none">
            💡 ${item}
        </div>
    `).join('');

    suggestionsBox.classList.remove('hidden');
}

function selectFormSuggestion(inputId, suggestionBoxId, val) {
    document.getElementById(inputId).value = val;
    document.getElementById(suggestionBoxId).classList.add('hidden');
}

// Hide all suggestion boxes when clicked outside
document.addEventListener('click', function(e) {
    const searchInput = document.getElementById('search-input');
    const searchSuggestions = document.getElementById('search-suggestions');
    if (searchInput && searchSuggestions && !searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
        searchSuggestions.classList.add('hidden');
    }
    ['m-team1', 'm-team2', 'm-series', 'm-venue'].forEach(id => {
        const inputElem = document.getElementById(id);
        const boxElem = document.getElementById(id + '-suggestions');
        if (inputElem && boxElem && !inputElem.contains(e.target) && !boxElem.contains(e.target)) {
            boxElem.classList.add('hidden');
        }
    });
});

function applyFilters() {
    const searchVal = document.getElementById('search-input').value.toLowerCase();
    const venueVal = document.getElementById('filter-venue').value;
    const pitchVal = document.getElementById('filter-pitch').value;
    const formatVal = document.getElementById('filter-format').value;

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
    document.getElementById('total-matches').innerText = matches.length;
    document.getElementById('pitch-avg-sub').innerText = avgSubText;
    
    let avg1 = 0, avg2 = 0, win1 = 0, win2 = 0, totalPacers = 0, totalSpinners = 0;
    if (matches.length > 0) {
        avg1 = Math.round(matches.reduce((acc, m) => acc + (Number(m.score1) || 0), 0) / matches.length);
        avg2 = Math.round(matches.reduce((acc, m) => acc + (Number(m.score2) || 0), 0) / matches.length);
        win1 = matches.filter(m => m.winner === '1st').length;
        win2 = matches.filter(m => m.winner === '2nd').length;
        totalPacers = (matches.reduce((acc, m) => acc + (Number(m.pacers) || 0), 0) / matches.length).toFixed(1);
        totalSpinners = (matches.reduce((acc, m) => acc + (Number(m.spinners) || 0), 0) / matches.length).toFixed(1);
    }

    document.getElementById('avg-1st').innerText = avg1;
    document.getElementById('avg-2nd').innerText = avg2;
    document.getElementById('avg-pacers').innerText = totalPacers;
    document.getElementById('avg-spinners').innerText = totalSpinners;

    const p1 = matches.length ? Math.round((win1 / matches.length) * 100) : 0;
    const p2 = matches.length ? Math.round((win2 / matches.length) * 100) : 0;

    document.getElementById('win-1st-percent').innerText = p1 + '%';
    document.getElementById('win-2nd-percent').innerText = p2 + '%';
    document.getElementById('bar-1st').style.width = p1 + '%';
    document.getElementById('bar-2nd').style.width = p2 + '%';

    const list = document.getElementById('scorecard-list');
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
            <div class="flex flex-col space-y-2">
                <button onclick="editMatch('${m.id}')" class="text-xs text-amber-400 hover:bg-slate-800 p-1 rounded">✏️</button>
                <button onclick="deleteMatch('${m.id}')" class="text-xs text-red-500 hover:bg-slate-800 p-1 rounded">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openModal(id = null) {
    if (!auth.currentUser) {
        alert('Pehle Login karo!');
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

    const collectionRef = db.collection('users').doc(auth.currentUser.uid).collection('matches');

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
    if (auth.currentUser && confirm('Delete this scorecard?')) {
        db.collection('users').doc(auth.currentUser.uid).collection('matches').doc(id).delete();
    }
                             }
                                     
