// Service Worker Registration for PWA
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

function applyFilters() {
    const venueVal = document.getElementById('filter-venue').value;
    const pitchVal = document.getElementById('filter-pitch').value;
    const formatVal = document.getElementById('filter-format').value;

    let filtered = allMatches.filter(m => {
        return (venueVal === 'all' || m.venue === venueVal) &&
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
            <div class="space-y-0.5">
                <div class="flex items-center space-x-2">
                    <span class="text-xs font-bold text-gray-100">${m.venue || 'Unknown Venue'}</span>
                    <span class="text-[10px] bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded">${m.format || 'T20'}</span>
                    <span class="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded">${m.leagueType || 'Domestic'}</span>
                </div>
                <p class="text-xs text-gray-400">${m.series || 'Series'} | <span class="text-gray-300">Pitch #${m.pitchNo || 'N/A'}</span></p>
                <p class="text-xs text-gray-300 font-mono pt-1">1st: <span class="text-emerald-400 font-bold">${m.score1 || 0}</span> | 2nd: <span class="text-blue-400 font-bold">${m.score2 || 0}</span></p>
                <p class="text-[10px] text-gray-400">Pacers Wkt: <span class="text-orange-400">${m.pacers || 0}</span> | Spin Wkt: <span class="text-purple-400">${m.spinners || 0}</span></p>
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
            document.getElementById('m-series').value = match.series || '';
            document.getElementById('m-venue').value = match.venue || '';
            document.getElementById('m-pitch-no').value = match.pitchNo || '';
            document.getElementById('m-score1').value = match.score1 || '';
            document.getElementById('m-score2').value = match.score2 || '';
            document.getElementById('m-pacers').value = match.pacers || '';
            document.getElementById('m-spinners').value = match.spinners || '';
            document.getElementById('m-winner').value = match.winner || '1st';
        }
    } else {
        document.getElementById('modal-title').innerText = 'Add Match Scorecard';
        document.getElementById('edit-doc-id').value = '';
        document.getElementById('m-series').value = '';
        document.getElementById('m-venue').value = '';
        document.getElementById('m-pitch-no').value = '';
        document.getElementById('m-score1').value = '';
        document.getElementById('m-score2').value = '';
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
    const series = document.getElementById('m-series').value;
    const venue = document.getElementById('m-venue').value;
    const pitchNo = document.getElementById('m-pitch-no').value;
    const score1 = Number(document.getElementById('m-score1').value);
    const score2 = Number(document.getElementById('m-score2').value);
    const pacers = Number(document.getElementById('m-pacers').value);
    const spinners = Number(document.getElementById('m-spinners').value);
    const winner = document.getElementById('m-winner').value;

    if (!venue || !score1 || !score2) {
        alert('Please fill Venue and both Innings scores!');
        return;
    }

    const payload = {
        leagueType, format, series, venue, pitchNo, score1, score2, pacers, spinners, winner,
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
