// Register Service Worker for PWA installability
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW reg error:', err));
}

// Initial Data Loading
let matches = JSON.parse(localStorage.getItem('pitchstats_matches')) || [];
let options = JSON.parse(localStorage.getItem('pitchstats_options')) || {
    stadium: ['M. Chinnaswamy Stadium', 'Eden Gardens', 'Wankhede Stadium'],
    pitchNo: ['Pitch 1', 'Pitch 2', 'Pitch 3', 'Pitch 4'],
    pitchType: ['Red Clay', 'Black Soil', 'Green Grass', 'Hard Pitch']
};

function saveOptions() {
    localStorage.setItem('pitchstats_options', JSON.stringify(options));
}

function populateDropdowns(selectedValues = {}) {
    // 1. Populate Filter Dropdowns
    ['stadium', 'pitchNo', 'pitchType'].forEach(key => {
        const select = document.getElementById(key + 'Select');
        const currVal = selectedValues[key] !== undefined ? selectedValues[key] : select.value;
        const titleName = key === 'stadium' ? 'Stadiums' : key === 'pitchNo' ? 'Pitches' : 'Types';
        
        select.innerHTML = `<option value="">All ${titleName}</option>`;
        options[key].forEach(opt => {
            select.innerHTML += `<option value="${opt}">${opt}</option>`;
        });
        select.value = currVal;
    });

    // 2. Populate Modal Dropdowns
    ['Stadium', 'PitchNo', 'PitchType'].forEach(key => {
        const optKey = key.charAt(0).toLowerCase() + key.slice(1);
        const modalSelect = document.getElementById('modal' + key);
        if (modalSelect) {
            const currVal = selectedValues[optKey] !== undefined ? selectedValues[optKey] : modalSelect.value;
            modalSelect.innerHTML = '';
            options[optKey].forEach(item => {
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
            saveOptions();
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
    let selectedVal = currentSelect.value;

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
                saveOptions();
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
                localStorage.setItem('pitchstats_matches', JSON.stringify(matches));
                saveOptions();
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

    localStorage.setItem('pitchstats_matches', JSON.stringify(matches));
    toggleModal(false);
    filterData();
}

function deleteMatch(id) {
    if (confirm("Kya aap is scorecard ko delete karna chahte hain?")) {
        matches = matches.filter(m => m.id !== id);
        localStorage.setItem('pitchstats_matches', JSON.stringify(matches));
        filterData();
    }
}

function filterData() {
    let stadium = document.getElementById('stadiumSelect').value;
    let pitchNo = document.getElementById('pitchNoSelect').value;
    let pitchType = document.getElementById('pitchTypeSelect').value;
    let query = document.getElementById('searchInput').value.toLowerCase();

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
    document.getElementById('totalMatchesCount').innerText = list.length;
    document.getElementById('winMatchesCount').innerText = list.length;

    if (list.length === 0) {
        document.getElementById('avg1st').innerText = '0';
        document.getElementById('avg2nd').innerText = '0';
        document.getElementById('win1stVal').innerText = '0%';
        document.getElementById('win2ndVal').innerText = '0%';
        document.getElementById('win1stBar').style.width = '0%';
        document.getElementById('win2ndBar').style.width = '0%';
        document.getElementById('historyList').innerHTML = `<p class="empty-msg">No match scorecards saved yet.</p>`;
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

    document.getElementById('avg1st').innerText = Math.round(sum1 / list.length);
    document.getElementById('avg2nd').innerText = Math.round(sum2 / list.length);

    document.getElementById('win1stVal').innerText = win1Pct + '%';
    document.getElementById('win2ndVal').innerText = win2Pct + '%';
    document.getElementById('win1stBar').style.width = win1Pct + '%';
    document.getElementById('win2ndBar').style.width = win2Pct + '%';

    document.getElementById('historyList').innerHTML = html;
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
            if (imported.matches) {
                matches = imported.matches;
                localStorage.setItem('pitchstats_matches', JSON.stringify(matches));
            }
            if (imported.options) {
                options = imported.options;
                saveOptions();
            }
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
                                                    
