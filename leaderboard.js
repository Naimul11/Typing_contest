import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAt2IUIJ7k_UKmBbfU-qTzxaWu1moC2w0A",
    authDomain: "typingtest-7d91e.firebaseapp.com",
    databaseURL: "https://typingtest-7d91e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "typingtest-7d91e",
    storageBucket: "typingtest-7d91e.firebasestorage.app",
    messagingSenderId: "527312928803",
    appId: "1:527312928803:web:4e77e0ae826778dda67196",
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function getUrlRoomId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('room');
}

function updateUrlWithRoom(roomId) {
    const newUrl = roomId
        ? `${window.location.pathname}?room=${roomId}`
        : window.location.pathname;
    window.history.pushState({ roomId }, '', newUrl);
}

class RaceTrack {
    constructor(container) {
        this.container = container;
        this.racers = new Map();
        this.maxWPM = 60; // Start with a more realistic WPM
        this.nameOccurrences = new Map();
        this.countdownInterval = null;
        this.padding = 150; // Padding for racer elements
        this.finalWPM = null; // Add tracking for final WPM
    }

    formatUserName(userId, name) {
        const suffix = userId.slice(-4);
        const count = this.nameOccurrences.get(name) || 0;
        this.nameOccurrences.set(name, count + 1);

        return count > 0 ? `${name} #${suffix}` : name;
    }

    createRacerElement(userData, userId, index) {
        const racer = document.createElement('div');
        racer.className = 'racer';
        racer.style.top = `${index * 60 + 15}px`;

        const avatar = document.createElement('div');
        avatar.className = 'racer-avatar';

        if (userData.profilePic) {
            avatar.style.backgroundImage = `url(${userData.profilePic})`;
        } else {
            avatar.textContent = userData.name.charAt(0).toUpperCase();
        }

        const nameContainer = document.createElement('div');
        nameContainer.className = 'racer-name';
        nameContainer.textContent = this.formatUserName(userId, userData.name);

        const wpm = document.createElement('span');
        wpm.className = 'racer-wpm';
        wpm.textContent = userData.wpm;

        nameContainer.appendChild(wpm);
        racer.appendChild(avatar);
        racer.appendChild(nameContainer);

        return racer;
    }

    createCountdown() {
        const countdown = document.createElement('div');
        countdown.className = 'countdown';
        countdown.id = 'countdown';
        this.container.appendChild(countdown);
    }

    updateCountdown(startTime, endTime) {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        clearInterval(this.countdownInterval);

        this.countdownInterval = setInterval(() => {
            const now = Date.now();
            let timeLeft;
            let text;

            if (now < startTime) {
                timeLeft = Math.ceil((startTime - now) / 1000);
                text = `Starting in: ${timeLeft}s`;
            } else if (now < endTime) {
                timeLeft = Math.ceil((endTime - now) / 1000);
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                text = `Time left: ${minutes}:${seconds.toString().padStart(2, '0')}`;
            } else {
                text = 'Race Complete';
                clearInterval(this.countdownInterval);
            }

            countdownElement.textContent = text;
        }, 1000);
    }

    updateMaxWPM(currentWPM, isRaceComplete) {
        if (isRaceComplete && this.finalWPM === null) {
            // On race completion, find the highest WPM among all racers
            let highestWPM = currentWPM;
            this.racers.forEach((element) => {
                const wpm = parseInt(element.querySelector('.racer-wpm').textContent);
                highestWPM = Math.max(highestWPM, wpm);
            });
            this.finalWPM = highestWPM;
            this.maxWPM = highestWPM * 1.1; // Add 10% margin
        } else if (!isRaceComplete) {
            // During race, dynamically adjust as before
            if (currentWPM > this.maxWPM * 0.8) {
                const newMaxWPM = Math.ceil(currentWPM * 1.2);
                this.maxWPM = Math.max(this.maxWPM, newMaxWPM);
            }
        }

        // Update all racers' positions with current maxWPM
        this.racers.forEach((element) => {
            const wpm = parseInt(element.querySelector('.racer-wpm').textContent);
            const position = (wpm / this.maxWPM) * (this.container.offsetWidth - this.padding);
            element.style.left = `${position}px`;
        });
    }

    updateRacer(userId, userData, isRaceComplete) {
        if (!this.racers.has(userId)) {
            const racerElement = this.createRacerElement(userData, userId, this.racers.size);
            this.container.appendChild(racerElement);
            this.racers.set(userId, racerElement);
        }

        const racerElement = this.racers.get(userId);
        racerElement.querySelector('.racer-wpm').textContent = userData.wpm;

        this.updateMaxWPM(userData.wpm, isRaceComplete);
    }

    reset() {
        clearInterval(this.countdownInterval);
        this.racers.clear();
        this.nameOccurrences.clear();
        this.finalWPM = null; // Reset finalWPM
        this.maxWPM = 60; // Reset to initial value
        this.container.innerHTML = '<div class="finish-line"></div>';
        this.createCountdown();
    }
}




const roomsRef = ref(db, 'rooms');


// Modify the hideRaceTrack function
function hideRaceTrack() {
    document.getElementById('room-list').style.display = 'grid';
    document.getElementById('race-track').style.display = 'none';
    updateUrlWithRoom(null);
}

window.hideRaceTrack = hideRaceTrack;
window.showRaceTrack = showRaceTrack;

// Update the createRoomList function to show all rooms
function createRoomList(rooms) {
    const roomList = document.getElementById('room-list');
    roomList.innerHTML = '';

    if (!rooms) return;

    // Convert rooms object to array and sort by startTime in descending order
    const sortedRooms = Object.entries(rooms)
        .map(([id, room]) => ({ id, ...room }))
        .sort((a, b) => b.startTime - a.startTime);

    sortedRooms.forEach((room) => {
        const card = document.createElement('div');
        card.className = 'room-card';

        const status = Date.now() > room.endTime ? 'Completed' : 'In Progress';
        const buttonText = Date.now() > room.endTime ? 'View Results' : 'View Race';

        card.innerHTML = `
            <h3>${room.name}</h3>
            <p>Status: ${status}</p>
            <button onclick="showRaceTrack('${room.id}')">${buttonText}</button>
        `;

        if (Date.now() > room.endTime) {
            card.classList.add('completed');
        }

        roomList.appendChild(card);
    });
}

// Update the onValue listener to use createRoomList
onValue(roomsRef, (snapshot) => {
    const rooms = snapshot.val();
    createRoomList(rooms);
});

// Modify the showRaceTrack function
function showRaceTrack(roomId) {
    const raceTrackElement = document.getElementById('race-track');
    const roomListElement = document.getElementById('room-list');

    roomListElement.style.display = 'none';
    raceTrackElement.style.display = 'block';
    updateUrlWithRoom(roomId);

    const raceTrack = new RaceTrack(raceTrackElement);
    raceTrack.reset();

    // Remove the separate status element since we'll use countdown for all status messages
    const existingStatus = document.getElementById('race-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    // Listen for real-time updates
    const roomRef = ref(db, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        if (!roomData || !roomData.users) return;

        const now = Date.now();
        const isRaceComplete = now > roomData.endTime;

        raceTrack.updateCountdown(roomData.startTime, roomData.endTime);

        Object.entries(roomData.users).forEach(([userId, userData]) => {
            raceTrack.updateRacer(userId, userData, isRaceComplete);
        });
    });
}

function toggleFullscreen() {
    const raceTrack = document.getElementById('race-track');
    const isFullscreen = raceTrack.classList.contains('fullscreen');

    if (!isFullscreen) {
        if (raceTrack.requestFullscreen) {
            raceTrack.requestFullscreen();
        } else if (raceTrack.webkitRequestFullscreen) {
            raceTrack.webkitRequestFullscreen();
        } else if (raceTrack.msRequestFullscreen) {
            raceTrack.msRequestFullscreen();
        }
        raceTrack.classList.add('fullscreen');
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
        raceTrack.classList.remove('fullscreen');
    }
}

// Add fullscreen change event listener
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('msfullscreenchange', handleFullscreenChange);

function handleFullscreenChange() {
    const raceTrack = document.getElementById('race-track');
    const fullscreenBtn = document.querySelector('.fullscreen-button');

    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
        raceTrack.classList.remove('fullscreen');
        fullscreenBtn.textContent = 'Fullscreen';
    } else {
        fullscreenBtn.textContent = 'Exit Fullscreen';
    }
}

// Make toggleFullscreen available globally
window.toggleFullscreen = toggleFullscreen;

// Add initialization code at the bottom of the file
function initialize() {
    const roomId = getUrlRoomId();
    if (roomId) {
        showRaceTrack(roomId);
    } else {
        hideRaceTrack();
    }
}

// Call initialize when the page loads
document.addEventListener('DOMContentLoaded', initialize);

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    const roomId = getUrlRoomId();
    if (roomId) {
        showRaceTrack(roomId);
    } else {
        hideRaceTrack();
    }
});



