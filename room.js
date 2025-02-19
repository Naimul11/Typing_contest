import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAt2IUIJ7k_UKmBbfU-qTzxaWu1moC2w0A",
    authDomain: "typingtest-7d91e.firebaseapp.com",
    databaseURL: "https://typingtest-7d91e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "typingtest-7d91e",
    storageBucket: "typingtest-7d91e.firebasestorage.app",
    messagingSenderId: "527312928803",
    appId: "1:527312928803:web:4e77e0ae826778dda67196",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const serverTimeOffset = {
    offset: 0
};

// Get server time offset
const timeRef = ref(db, '.info/serverTimeOffset');
onValue(timeRef, (snapshot) => {
    serverTimeOffset.offset = snapshot.val();
});

function getServerTime() {
    return Date.now() + serverTimeOffset.offset;
}

let currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = 'create-user.html';
}

const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('id');
const roomRef = ref(db, `rooms/${roomId}`);

let startTime;
let isRunning = false;
let wordIndex = 0;
let totalCharactersTyped = 0;

let roomData = null;
let currentSnapshot = null;

onValue(roomRef, (snapshot) => {
    const currentInput = document.getElementById('input-box');
    const wasFocused = document.activeElement === currentInput;
    
    currentSnapshot = snapshot;
    roomData = snapshot.val();
    if (!roomData) return;

    document.getElementById('room-name').textContent = roomData.name;
    updateWordBox(roomData.text.split(' '), false);
    document.getElementById('input-box').disabled = true;

    startTime = roomData.startTime;
    updateGameState();
    
    if (wasFocused) {
        currentInput.focus();
    }

    if (Date.now() < roomData.startTime) {
        document.getElementById('word-box').classList.add('text-blur');
    }
});

function updateGameState() {
    const serverNow = getServerTime();
    const input = document.getElementById('input-box');
    const timer = document.getElementById('timer');
    const wordBox = document.getElementById('word-box');

    if (serverNow < roomData.startTime) {
        const timeLeft = Math.ceil((roomData.startTime - serverNow) / 1000);
        timer.textContent = `Starting in: ${timeLeft}s`;
        input.disabled = true;
        input.placeholder = "Wait for race to start...";
        wordBox.classList.add('text-blur');
        requestAnimationFrame(updateGameState);
    } else if (serverNow > roomData.endTime) {
        timer.textContent = 'Race ended';
        input.disabled = true;
        input.placeholder = "Race is over";
        isRunning = false;
        wordBox.classList.remove('text-blur');
        // Add delay before redirect to show final state
        setTimeout(() => {
            window.location.href = `leaderboard.html?roomId=${roomId}`;
        }, 2000);
    } else {
        const timeRemaining = Math.ceil((roomData.endTime - serverNow) / 1000);
        timer.textContent = `Time remaining: ${timeRemaining}s`;
        wordBox.classList.remove('text-blur');
        if (!isRunning) {
            input.disabled = false;
            input.placeholder = "Start typing...";
            startTime = roomData.startTime; // Use server start time
            startTest();
        }
    }
}

function startTest() {
    if (isRunning) return;
    isRunning = true;
    inputBox.focus();
    const timerInterval = setInterval(() => {
        if (!isRunning || Date.now() > roomData.endTime) {
            clearInterval(timerInterval);
            return;
        }
        updateGameState();
    }, 1000);
}

function updateWPM() {
    if (!isRunning) return;
    const serverNow = getServerTime();
    const elapsed = (serverNow - startTime) / 1000 / 60; // minutes
    const wpm = Math.round((totalCharactersTyped / 5) / elapsed);

    // Only update database if WPM is valid
    if (wpm >= 0 && wpm < 500) {  // reasonable WPM range
        update(ref(db, `rooms/${roomId}/users/${currentUser.id}`), {
            name: currentUser.name,
            wpm: wpm,
            profilePic: currentUser.profilePic,
            startedAt: startTime // Add start time to track when user began
        });
    }
}

function updateWordBox(words, isError) {
    const wordBox = document.getElementById('word-box');
    const currentInput = document.getElementById('input-box');
    const wasFocused = document.activeElement === currentInput;
    
    wordBox.innerHTML = words.map((word, index) =>
        `<span class="${index === wordIndex ? (isError ? 'current-word incorrect' : 'current-word') : ''}">${word}</span>`
    ).join(" ");
    
    // Scroll to keep current word visible
    const currentWordElement = wordBox.querySelector('.current-word');
    if (currentWordElement) {
        const wordBoxRect = wordBox.getBoundingClientRect();
        const wordRect = currentWordElement.getBoundingClientRect();
        const relativeTop = wordRect.top - wordBoxRect.top;
        
        if (relativeTop > wordBoxRect.height - 40) {
            wordBox.scrollTop += relativeTop - (wordBoxRect.height / 2);
        }
    }
    
    if (wasFocused) {
        currentInput.focus();
    }
}

document.getElementById('input-box').addEventListener('input', function (e) {
    if (!isRunning) return;
    
    const words = roomData.text.split(' ');
    const currentWord = words[wordIndex];
    const currentInput = e.target.value;

    if (currentInput.endsWith(' ')) {
        const inputWord = currentInput.trim();
        if (inputWord === currentWord) {
            wordIndex++;
            totalCharactersTyped += inputWord.length + 1;
            updateWordBox(words, false);
            // Only update WPM after completing a word
            updateWPM();
        }
        e.target.value = '';
    } else {
        updateWordBox(words, !currentWord.startsWith(currentInput));
    }
});

// Add user interface handling
function updateUserInterface() {
    const userInfo = document.getElementById('user-info');
    const userAvatar = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');

    if (currentUser) {
        logoutBtn.style.display = 'block';
        if (currentUser.profilePic) {
            userAvatar.style.backgroundImage = `url(${currentUser.profilePic})`;
        } else {
            userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
        }
        userAvatar.style.display = 'block';
    }
}

// Add logout functionality
document.getElementById('logout-btn')?.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});

// Update room.html to include user info section
document.body.insertAdjacentHTML('afterbegin', `
    <div id="user-info" class="user-info">
        <div id="user-avatar" class="avatar"></div>
        <button id="logout-btn" style="display: none;">Logout</button>
    </div>
`);

updateUserInterface();

const inputBox = document.getElementById('input-box');
const wordBox = document.getElementById('word-box');
const roomName = document.getElementById('room-name');

onValue(roomRef, (snapshot) => {
    const room = snapshot.val();
    if (!room) {
        window.location.href = 'rooms.html';
        return;
    }

    roomName.textContent = room.name;
    
    const now = Date.now();
    if (now >= room.startTime && now <= room.endTime) {
        inputBox.disabled = false;
        inputBox.placeholder = "Type here...";
        if (!wordBox.textContent) {
            wordBox.textContent = room.text || "Sample text to type...";
        }
    } else if (now < room.startTime) {
        inputBox.placeholder = "Race hasn't started yet...";
    } else {
        inputBox.placeholder = "Race has ended";
    }
});

inputBox.addEventListener('input', (e) => {
    const currentText = e.target.value;
    // Here you can add logic to check typing progress
    // and update the user's position in the race
});

inputBox.addEventListener('blur', () => {
    // Refocus input if game is running
    if (isRunning && Date.now() <= roomData.endTime) {
        setTimeout(() => inputBox.focus(), 0);
    }
});
