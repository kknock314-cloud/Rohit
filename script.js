let ytPlayer = null;
let currentVideoId = '';

// YouTube API Ready Callback
function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready");
}

// Universal Stream Loader
function loadYouTubeLive() {
    const inputVal = document.getElementById('yt-link-input').value.trim();
    const container = document.getElementById('yt-player-container');
    
    if (!inputVal) {
        alert('Kripya koi valid stream URL ya link dalein!');
        return;
    }

    container.classList.remove('hidden');

    // Check agar direct video link ya HLS (.m3u8 / .mp4) hai
    if (inputVal.includes('.m3u8') || inputVal.includes('.mp4') || inputVal.includes('stream')) {
        container.querySelector('.flex-1.relative').innerHTML = `<video id="native-video-player" src="${inputVal}" controls autoplay playsinline class="w-full h-full object-contain bg-black"></video>`;
        return;
    }

    // YouTube URL Parser
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
        const playerArea = container.querySelector('.flex-1.relative');
        if (!document.getElementById('player')) {
            playerArea.innerHTML = `<div id="player" class="w-full h-full"></div>`;
            ytPlayer = null;
        }

        if (ytPlayer && typeof ytPlayer.loadVideoById === 'function') {
            ytPlayer.loadVideoById(videoId);
        } else {
            ytPlayer = new YT.Player('player', {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: { 'autoplay': 1, 'playsinline': 1 },
                events: {
                    'onReady': (event) => event.target.playVideo()
                }
            });
        }
    } else {
        // General Iframe Fallback for embedded pages
        container.querySelector('.flex-1.relative').innerHTML = `<iframe src="${inputVal}" class="w-full h-full border-0" allowfullscreen></iframe>`;
    }
}

// Close Player
function closePlayer() {
    const container = document.getElementById('yt-player-container');
    container.classList.add('hidden');
    container.querySelector('.flex-1.relative').innerHTML = `<div id="player" class="w-full h-full"></div>`;
    ytPlayer = null;
}

// Native Picture-in-Picture Trigger
async function togglePiP() {
    const video = document.getElementById('native-video-player');
    if (video) {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                await video.requestPictureInPicture();
            }
        } catch (error) {
            console.log("PiP Error:", error);
        }
    } else {
        alert("Native PiP sirf direct video links (.mp4 / HTML5) par perfectly kaam karta hai. YouTube ke liye aap browser ka full PiP use kar sakte hain.");
    }
}

// Draggable Floating Window Logic (Touch & Mouse Support)
const floatContainer = document.getElementById('yt-player-container');
const dragHandle = document.getElementById('drag-handle');

let isDragging = false;
let startX, startY, initialX, initialY;

dragHandle.addEventListener('mousedown', startDrag);
dragHandle.addEventListener('touchstart', startDrag, {passive: true});

document.addEventListener('mousemove', drag);
document.addEventListener('touchmove', drag, {passive: true});

document.addEventListener('mouseup', stopDrag);
document.addEventListener('touchend', stopDrag);

function startDrag(e) {
    isDragging = true;
    startX = e.clientX || e.touches[0].clientX;
    startY = e.clientY || e.touches[0].clientY;
    
    const rect = floatContainer.getBoundingClientRect();
    initialX = rect.left;
    initialY = rect.top;
    
    floatContainer.style.bottom = 'auto';
    floatContainer.style.right = 'auto';
    floatContainer.style.left = `${initialX}px`;
    floatContainer.style.top = `${initialY}px`;
}

function drag(e) {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches[0].clientX;
    const clientY = e.clientY || e.touches[0].clientY;
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    floatContainer.style.left = `${initialX + dx}px`;
    floatContainer.style.top = `${initialY + dy}px`;
}

function stopDrag() {
    isDragging = false;
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log("Service Worker Registered Successfully"))
            .catch((err) => console.log("Service Worker Registration Failed:", err));
    });
}
