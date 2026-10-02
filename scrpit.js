// YouTube Live & Video Player Integration (Optimized for Mobile)
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

        // Mobile browsers ke liye direct clean iframe embed jo native fullscreen support kare
        container.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=0&modestbranding=1&rel=0" 
                class="w-full h-full" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>
        `;
    } else {
        alert('YouTube link sahi nahi hai. Dobara check karein!');
    }
}

// In-App Floating PiP / Pop-out Toggle
function togglePiP() {
    const container = document.getElementById('yt-player-container');
    const pipBtn = document.getElementById('pip-btn');
    if (!container) return;

    if (container.classList.contains('pip-mode')) {
        container.classList.remove('pip-mode');
        pipBtn.innerText = '📌 Pop-out (PiP)';
    } else {
        container.classList.add('pip-mode');
        pipBtn.innerText = '❌ Close PiP';
    }
}
