import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-database.js";

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

function updateUserInterface() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'create-user.html';
        return;
    }

    const userAvatar = document.getElementById('user-avatar');
    const logoutBtn = document.getElementById('logout-btn');

    if (currentUser.profilePic) {
        userAvatar.style.backgroundImage = `url(${currentUser.profilePic})`;
    } else {
        userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
    }
    userAvatar.style.display = 'block';
    logoutBtn.style.display = 'block';
}

document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
});

function formatTimeLeft(startTime, endTime) {
    const now = Date.now();
    if (now < startTime) {
        const minutes = Math.floor((startTime - now) / 60000);
        return `Starts in ${minutes} minutes`;
    } else if (now > endTime) {
        return 'Ended';
    } else {
        const minutes = Math.floor((endTime - now) / 60000);
        return `${minutes} minutes left`;
    }
}

const roomsRef = ref(db, 'rooms');
onValue(roomsRef, (snapshot) => {
    const rooms = snapshot.val();
    const roomList = document.getElementById('room-list');
    roomList.innerHTML = '';

    if (rooms) {
        Object.entries(rooms).forEach(([roomId, room]) => {
            if (Date.now() <= room.endTime) {  // Only show active or upcoming rooms
                const timeLeft = formatTimeLeft(room.startTime, room.endTime);
                const card = document.createElement('div');
                card.className = 'room-card';
                card.innerHTML = `
                    <h3>${room.name}</h3>
                    <p>${timeLeft}</p>
                    <button onclick="window.location.href='room.html?id=${roomId}'">Join Room</button>
                `;
                roomList.appendChild(card);
            }
        });
    }
});

updateUserInterface();
