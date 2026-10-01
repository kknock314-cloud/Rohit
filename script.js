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
let allSchedule = [];

// App load hote hi bina login ke public data load karna shuru kar do
document.addEventListener("DOMContentLoaded", () => {
    loadPublicData();
});

// Auth State Listener (Sirf UI aur Admin status ke liye)
auth.onAuthStateChanged(user => {
    const btn = document.getElementById('auth-btn');
    const status = document.getElementById('user-status');
    if (user) {
        btn.innerText = 'Logout';
        btn.className = 'px-4 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg text-sm font-semibold transition border border-slate-700';
        status.innerText = 'ADMIN: ' + (user.displayName || user.email);
    } else {
        btn.innerText = 'Admin Login';
        btn.className = 'px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-semibold transition';
        status.innerText = 'PUBLIC VIEW (READ-ONLY)';
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

// Sabhi users/devices ke liye public data load hoga (Bina Login ke)
function loadPublicData() {
    // 1. Load Scorecards from Root 'matches' Collection
    db.collection('matches').orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            populateFilters(allMatches);
            applyFilters();
        }, err => {
            console.error("Firestore Match Error: ", err);
        });

    // 2. Load Schedule from Root 'schedule' Collection
    db.collection('schedule').orderBy('matchTime', 'asc')
        .onSnapshot(snapshot => {
            allSchedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderSchedule(allSchedule);
        }, err => {
            console.error("Firestore Schedule Error: ", err);
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

// Hide suggestion boxes on outside click
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

// ICS File Upload Handler (Sirf Admin ke liye restricted)
function handleICSUpload(event) {
    if (!auth.currentUser) {
        alert('⚠️ Access Denied: Schedule import karne ke liye pehle Admin Login karein!');
        event.target.value = '';
        handleAuth();
        return;
    }

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        parseICSData(text);
        event.target.value = '';
    };
    reader.readAsText(file);
}

function parseICSData(icsText) {
    const events = icsText.split('BEGIN:VEVENT');
    if (events.length <= 1) {
        alert('Invalid or empty .ics file format!');
        return;
    }

    let importedCount = 0;
    const batch = db.batch();
    const collectionRef = db.collection('schedule');

    for (let i = 1; i < events.length; i++) {
        const eventBlock = events[i];
        
        const summaryMatch = eventBlock.match(/SUMMARY:(.*?)(?:\r\n|\n)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : 'Scheduled Match';

        const locationMatch = eventBlock.match(/LOCATION:(.*?)(?:\r\n|\n)/);
        const venue = locationMatch ? locationMatch[1].trim() : 'Imported Venue';

        const dtstartMatch = eventBlock.match(/DTSTART[:;](.*?)(?:\r\n|\n)/);
        let matchTime = new Date().getTime();
        if (dtstartMatch) {
            let rawDate = dtstartMatch[1].replace(/[^0-9T]/g, '');
            if (rawDate.length >= 15) {
                let year = rawDate.substr(0, 4);
                let month = rawDate.substr(4, 2) - 1;
                let day = rawDate.substr(6, 2);
                let hour = rawDate.substr(9, 2);
                let min = rawDate.substr(11, 2);
                matchTime = new Date(year, month, day, hour, min).getTime();
            }
        }

        let team1 = 'Team A';
        let team2 = 'Team B';
        if (summary.includes(' vs ')) {
            const parts = summary.split(' vs ');
            team1 = parts[0].trim();
            team2 = parts[1].trim();
        } else if (summary.includes(' v ')) {
            const parts = summary.split(' v ');
            team1 = parts[0].trim();
            team2 = parts[1].trim();
        } else {
            team1 = summary;
        }

        const docRef = collectionRef.doc();
        batch.set(docRef, {
            team1: team1,
            team2: team2,
            venue: venue,
            matchTime: matchTime,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        importedCount++;
    }

    batch.commit().then(() => {
        alert(`Successfully imported ${importedCount} upcoming matches to public schedule!`);
    }).catch(err => {
        alert('Error importing schedule: ' + err.message);
    });
}

// Render Upcoming Schedule with Auto-Hide & Team Swap Option
function renderSchedule(scheduleList) {
    const container = document.getElementById('schedule-container');
    const listElem = document.getElementById('schedule-list');
    const currentTime = new Date().getTime();

    const upcoming = scheduleList.filter(s => s.matchTime && s.matchTime > currentTime);

    if (upcoming.length === 0) {
        container.classList.add('hidden');
        listElem.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    listElem.innerHTML = upcoming.map(s => {
        let dateObj = new Date(s.matchTime);
        let timeStr = dateObj.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

        return `
            <div class="card-bg p-3 rounded-xl flex justify-between items-center border border-slate-800">
                <div class="space-y-1">
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-bold text-gray-100">${s.team1 || 'Team A'} vs ${s.team2 || 'Team B'}</span>
                        ${auth.currentUser ? `<button onclick="swapScheduleTeams('${s.id}', '${s.team1}', '${s.team2}')" class="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded hover:bg-slate-700 transition">⇄ Swap</button>` : ''}
                    </div>
                    <p class="text-[11px] text-gray-400">📍 ${s.venue || 'Unknown Venue'}</p>
                    <p class="text-[10px] text-amber-400 font-mono">⏰ ${timeStr}</p>
                </div>
                <div>
                    ${auth.currentUser ? `<button onclick="deleteScheduleItem('${s.id}')" class="text-xs text-red-500 hover:bg-slate-800 p-1.5 rounded">🗑</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function swapScheduleTeams(id, team1, team2) {
    if (!auth.currentUser) return;
    db.collection('schedule').doc(id).update({
        team1: team2,
        team2: team1
    }).catch(err => console.error("Error swapping teams:", err));
}

function deleteScheduleItem(id) {
    if (!auth.currentUser) {
        alert('Admin login required!');
        return;
    }
    if (confirm('Remove this schedule item?')) {
        db.collection('schedule').doc(id).delete();
    }
}

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
            ${auth.currentUser ? `
            <div class="flex flex-col space-y-2">
                <button onclick="editMatch('${m.id}')" class="text-xs text-amber-400 hover:bg-slate-800 p-1 rounded">✏️</button>
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
   
