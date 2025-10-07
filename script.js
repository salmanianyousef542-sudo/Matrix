// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBo-OGrEBEuRG36X6go0HNkdAJBKzGmmiA",
  authDomain: "mychatapp2-b15ca.firebaseapp.com",
  databaseURL: "https://mychatapp2-b15ca-default-rtdb.firebaseio.com",
  projectId: "mychatapp2-b15ca",
  storageBucket: "mychatapp2-b15ca.firebasestorage.app",
  messagingSenderId: "1073554057549",
  appId: "1:1073554057549:web:c62dc2b667148ea6d32f04",
  measurementId: "G-HQGJZR8DEW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// عناصر DOM
const authSection = document.getElementById('auth-section');
const chatSection = document.getElementById('chat-section');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');

// ثبت‌نام
signupBtn.addEventListener('click', () => {
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!name || !email || !password) return errorMsg.textContent = 'همه فیلدها را پر کنید';

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // ذخیره نام کاربر در profile
            userCredential.user.updateProfile({ displayName: name });
            // ذخیره در database
            database.ref('users/' + userCredential.user.uid).set({ name: name });
            showChat(userCredential.user);
        })
        .catch((error) => errorMsg.textContent = error.message);
});

// ورود
loginBtn.addEventListener('click', () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => showChat(userCredential.user))
        .catch((error) => errorMsg.textContent = error.message);
});

// نمایش بخش چت
function showChat(user) {
    authSection.style.display = 'none';
    chatSection.style.display = 'block';
    userNameSpan.textContent = user.displayName || 'کاربر';
    loadMessages();
}

// بارگیری پیام‌ها (realtime)
function loadMessages() {
    database.ref('messages').on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `<strong>${msg.name}:</strong> ${msg.text} <small>(${msg.timestamp})</small>`;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// ارسال پیام
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (!text) return;
    const user = auth.currentUser;
    if (user) {
        database.ref('messages').push({
            name: user.displayName,
            text: text,
            timestamp: new Date().toLocaleString('fa-IR')
        });
        messageInput.value = '';
    }
});

// خروج
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        authSection.style.display = 'block';
        chatSection.style.display = 'none';
        messagesDiv.innerHTML = '';
    });
});

// چک کردن وضعیت لاگین در لود صفحه
auth.onAuthStateChanged((user) => {
    if (user) showChat(user);

});
