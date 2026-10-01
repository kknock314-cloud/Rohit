// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg error:', err));
}

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyB7bi_YlW0_HAqzkTlEZS-phoQpak1iB_w",
  authDomain: "pitch-stats.firebaseapp.com",
  projectId: "pitch-stats",
  storageBucket: "pitch-stats.firebasestorage.app",
  messagingSenderId: "753464692599",
  appId: "1:753464692599:web:cfa7df86c4c1888e1ddb72",
  measurementId: "G-0QCCNTHD2W"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let defaultOptions = {
    stadium: ['M. Chinnaswamy Stadium', 'Eden Gardens', 'Wankhede Stadium'],
    pitchNo: ['Pitch 1', 'Pitch 2', 'Pitch 3', 'Pitch 4'],
    pitchType: ['Red Clay', 'Black Soil', 'Green Grass', 'Hard Pitch']
};

let matches = JSON.parse(localStorage.getItem('pitchstats_matches')) || [];
let options = JSON.parse(localStorage.getItem('pitchstats_options')) || defaultOptions;

// Firebase Auth State Listener
auth.onAuthStateChanged(user => {
    currentUser = user;
    const authBtn = document.getElementById('authBtn');
    const userStatus = document.getElementById('userStatus');
    const syncStatus = document.getElementById('syncStatus');

    if (user) {
        if (authBtn) {
            authBtn.innerText = "Logout";
            authBtn.style.background = "#ef4444";
        }
        if (userStatus) userStatus.innerText = user.displayName ? user.displayName.toUpperCase() : "LOGGED IN";
        if (syncStatus) {
            syncStatus.innerText = "☁️ Cloud Synced";
            syncStatus.className = "text-green";
        }
        loadDataFromCloud();
    } else {
        if (authBtn) {
            authBtn.innerText = "Google Login";
            authBtn.style.background = "#4285F4";
        }
        if (userStatus) userStatus.innerText = "GUEST MODE • LOCAL DATA";
        if (syncStatus) {
            syncStatus.innerText = "🔒 Local Records";
        }
        populateDropdowns();
        filterData();
    }
});

function handleAuth() {
    if (currentUser) {
        auth.signOut();
    } else {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider).catch(err => alert("Login Error: " + err.message));
    }
}

async function loadDataFromCloud() {
    if (!currentUser) return;
    try {
        const docRef = db.collection('users').doc(currentUser.uid);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            matches = data.matches || [];
            options = data.options || defaultOptions;
            saveLocalBackup();
        } else {
            saveAllData();
        }
        populateDropdowns();
        filterData();
    } catch (e) {
        console.error("Error loading cloud data: ", e);
    }
}

function saveAllData() {
    saveLocalBackup();
    if (currentUser) {
        db.collection('users').doc(currentUser.uid).set({
            matches: matches,
            options: options,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
}

function saveLocalBackup() {
    localStorage.setItem('pitchstats_matches', JSON.stringify(matches));
    localStorage.setItem('pitchstats_options', JSON.stringify(options));
}

function populateDropdowns(selectedValues = {}) {
    ['stadium', 'pitchNo', 'pitchType'].forEach(key => {
        const select = document.getElementById(key + 'Select');
        if (!select) return;
        const currVal = selectedValues[key] !== undefined ? selectedValues[key] : select.value;
        const titleName = key === 'stadium' ? 'Stadiums' : key === 'pitchNo' ? 'Pitches' : 'Types';
        
        select.innerHTML = `<option value="">All ${titleName}</option>`;
        (options[key] || []).forEach(opt => {
            select.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
        select.value = currVal;
    });

    ['Stadium', 'PitchNo', 'PitchType'].forEach(key => {
        const optKey = key.charAt(0).toLowerCase() + key.slice(1);
        const modalSelect = document.getElementById('modal' + key);
        if (modalSelect) {
            const currVal = selectedValues[optKey] !== undefined ? selectedValues[optKey] : modalSelect.value;
            modalSelect.innerHTML = '';
            (options[optKey] || []).forEach(item => {
                modalSelect.innerHTML += `<option value="${item}">${item}</option>`;
            });
            if (currVal && options[optKey].includes(currVal)) {
                modalSelect.value = currVal;
            }
        }
    });
}

function addOption(key) {
    let labelName = key === 'stadium' ? 'Stadium' : key === 'pitchNo' ? 'Pitch No' : 'Pitch Type';
    let val = prompt(`Add New ${labelName}:`);
    if (val && val.trim() !== '') {
        val = val.trim();
        if (!options[key].includes(val)) {
            options[key].push(val);
            saveAllData();
            let selObj = {};
            selObj[key] = val;
            populateDropdowns(selObj);
            filterData();
        }
    }
}

function editOption(key) {
    let labelName = key === 'stadium' ? 'Stadium' : key === 'pitchNo' ? 'Pitch No' : 'Pitch Type';
    let currentSelect = document.getElementById(key + 'Select');
    let selectedVal = currentSelect ? currentSelect.value : '';

    if (!selectedVal) {
        alert(`Pehle main dropdown se wo ${labelName} select kijiye jise aap edit/rename karna chahte hain.`);
        return;
    }

    let newVal = prompt(`Rename ${labelName}:`, selectedVal);
    if (newVal !== null) {
        newVal = newVal.trim();
        if (newVal === '') {
            if (confirm(`Kya aap "${selectedVal}" ko delete karna chahte hain?`)) {
                options[key] = options[key].filter(item => item !== selectedVal);
                saveAllData();
                populateDropdowns();
                filterData();
            }
        } else {
            let idx = options[key].indexOf(selectedVal);
            if (idx !== -1) {
                options[key][idx] = newVal;
                matches.forEach(m => {
                    if (key === 'stadium' && m.stadium === selectedVal) m.stadium = newVal;
                    if (key === 'pitchNo' && m.pitchNo === selectedVal) m.pitchNo = newVal;
                    if (key === 'pitchType' && m.pitchType === selectedVal) m.pitchType = newVal;
                });
                saveAllData();
                let selObj = {};
                selObj[key] = newVal;
                populateDropdowns(selObj);
                filterData();
            }
        }
    }
}

function toggleModal(show) {
    const modal = document.getElementById('addMatchModal');
    if (!modal) return;
    if (show) {
        populateDropdowns();
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function saveMatch(e) {
    e.preventDefault();

    let stadium = document.getElementById('modalStadium').value;
    let pitchNo = document.getElementById('modalPitchNo').value;
    let pitchType = document.getElementById('modalPitchType').value;
    let team1 = document.getElementById('modalTeam1').value || 'Team 1';
    let team2 = document.getElementById('modalTeam2').value || 'Team 2';

    let inn1 = parseInt(document.getElementById('modalRuns1').value) || 0;
    let wkts1 = document.getElementById('modalWickets1').value || '10';
    let overs1 = document.getElementById('modalOvers1').value || '20.0';

    let inn2 = parseInt(document.getElementById('modalRuns2').value) || 0;
    let wkts2 = document.getElementById('modalWickets2').value || '10';
    let overs2 = document.getElementById('modalOvers2').value || '20.0';

    let winner = parseInt(document.getElementById('modalWinner').value);

    matches.push({
        id: Date.now(),
        stadium,
        pitchNo,
        pitchType,
        team1,
        team2,
        inn1,
        wkts1,
        overs1,
        inn2,
        wkts2,
        overs2,
        winner,
        date: new Date().toLocaleDateString()
    });

    saveAllData();
    toggleModal(false);
    filterData();
}

function deleteMatch(id) {
    if (confirm("Kya aap is scorecard ko delete karna chahte hain?")) {
        matches = matches.filter(m => m.id !== id);
        saveAllData();
        filterData();
    }
}

function filterData() {
    let stadiumSelect = document.getElementById('stadiumSelect');
    let pitchNoSelect = document.getElementById('pitchNoSelect');
    let pitchTypeSelect = document.getElementById('pitchTypeSelect');
    let searchInput = document.getElementById('searchInput');

    let stadium = stadiumSelect ? stadiumSelect.value : '';
    let pitchNo = pitchNoSelect ? pitchNoSelect.value : '';
    let pitchType = pitchTypeSelect ? pitchTypeSelect.value : '';
    let query = searchInput ? searchInput.value.toLowerCase() : '';

    let filtered = matches.filter(m => {
        let matchS = !stadium || m.stadium === stadium;
        let matchP = !pitchNo || m.pitchNo === pitchNo;
        let matchT = !pitchType || m.pitchType === pitchType;
        let matchQ = !query || m.stadium.toLowerCase().includes(query) || 
                     (m.pitchNo && m.pitchNo.toLowerCase().includes(query)) || 
                     (m.pitchType && m.pitchType.toLowerCase().includes(query)) || 
                     (m.team1 && m.team1.toLowerCase().includes(query)) || 
                     (m.team2 && m.team2.toLowerCase().includes(query)) || 
                     m.date.includes(query) || m.inn1.toString().includes(query) || m.inn2.toString().includes(query);
        return matchS && matchP && matchT && matchQ;
    });

    renderDashboard(filtered);
}

function renderDashboard(list) {
    const totalCount = document.getElementById('totalMatchesCount');
    const winCount = document.getElementById('winMatchesCount');
    if (totalCount) totalCount.innerText = list.length;
    if (winCount) winCount.innerText = list.length;

    if (list.length === 0) {
        if (document.getElementById('avg1st')) document.getElementById('avg1st').innerText = '0';
        if (document.getElementById('avg2nd')) document.getElementById('avg2nd').innerText = '0';
        if (document.getElementById('win1stVal')) document.getElementById('win1stVal').innerText = '0%';
        if (document.getElementById('win2ndVal')) document.getElementById('win2ndVal').innerText = '0%';
        if (document.getElementById('win1stBar')) document.getElementById('win1stBar').style.width = '0%';
        if (document.getElementById('win2ndBar')) document.getElementById('win2ndBar').style.width = '0%';
        if (document.getElementById('historyList')) {
            document.getElementById('historyList').innerHTML = `<p class="empty-msg">No match scorecards saved yet.</p>`;
        }
        return;
    }

    let sum1 = 0, sum2 = 0, win1 = 0, win2 = 0;
    let html = '';

    list.forEach(m => {
        sum1 += m.inn1;
        sum2 += m.inn2;
        if (m.winner === 1) win1++; else win2++;

        html += `
            <div class="history-item">
                <div>
                    <p class="history-title">${m.stadium} <span style="color:#94a3b8; font-weight:normal;">(${m.pitchNo} • ${m.pitchType})</span></p>
                    <p class="history-sub">${m.team1 || '1st'} vs ${m.team2 || '2nd'} • ${m.date}</p>
                </div>
                <div style="display:flex; align-items:center;">
                    <div class="history-scores">
                        <p class="text-green">1st: ${m.inn1}/${m.wkts1 || 10} (${m.overs1 || 20})</p>
                        <p class="text-blue">2nd: ${m.inn2}/${m.wkts2 || 10} (${m.overs2 || 20})</p>
                    </div>
                    <button type="button" onclick="deleteMatch(${m.id})" class="delete-btn">🗑️</button>
                </div>
            </div>
        `;
    });

    let win1Pct = Math.round((win1 / list.length) * 100);
    let win2Pct = Math.round((win2 / list.length) * 100);

    if (document.getElementById('avg1st')) document.getElementById('avg1st').innerText = Math.round(sum1 / list.length);
    if (document.getElementById('avg2nd')) document.getElementById('avg2nd').innerText = Math.round(sum2 / list.length);

    if (document.getElementById('win1stVal')) document.getElementById('win1stVal').innerText = win1Pct + '%';
    if (document.getElementById('win2ndVal')) document.getElementById('win2ndVal').innerText = win2Pct + '%';
    if (document.getElementById('win1stBar')) document.getElementById('win1stBar').style.width = win1Pct + '%';
    if (document.getElementById('win2ndBar')) document.getElementById('win2ndBar').style.width = win2Pct + '%';

    if (document.getElementById('historyList')) document.getElementById('historyList').innerHTML = html;
}

function exportData() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ matches, options }));
    let a = document.createElement('a');
    a.href = dataStr;
    a.download = 'pitchstats_backup.json';
    a.click();
}

function importData() {
    let input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.onload = event => {
            let imported = JSON.parse(event.target.result);
            if (imported.matches) matches = imported.matches;
            if (imported.options) options = imported.options;
            saveAllData();
            populateDropdowns();
            filterData();
        };
        reader.readAsText(file);
    }
    input.click();
}

// Initial Call
populateDropdowns();
filterData();
