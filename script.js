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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// دیکشنری ترجمه خطاها
const errorTranslations = {
    'auth/invalid-email': 'فرمت ایمیل نامعتبر است.',
    'auth/user-not-found': 'کاربر با این ایمیل یافت نشد.',
    'auth/wrong-password': 'رمز عبور اشتباه است.',
    'auth/weak-password': 'رمز عبور خیلی ضعیف است (حداقل ۶ کاراکتر).',
    'auth/email-already-in-use': 'این ایمیل قبلاً استفاده شده است.',
    'auth/too-many-requests': 'تعداد درخواست‌ها زیاد است. بعداً امتحان کنید.',
    'auth/network-request-failed': 'مشکل اتصال به اینترنت.',
    'auth/invalid-api-key': 'کلید API نامعتبر است.'
};

function translateError(error) {
    return errorTranslations[error.code] || error.message;
}

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
const onlineCountSpan = document.getElementById('online-count');
const typingIndicator = document.getElementById('typing-indicator');

let messagesListener = null;
let currentUser = null;

// Presence (کاربران آنلاین)
function setupPresence() {
    if (!currentUser) return;
    const onlineRef = database.ref(`online/${currentUser.uid}`);
    onlineRef.set(true).onDisconnect().remove();  // پاک کردن موقع خروج

    database.ref('online').on('value', (snapshot) => {
        const count = snapshot.numChildren();
        onlineCountSpan.textContent = count;
    });
}

// Typing Indicators
function setupTyping() {
    if (!currentUser) return;
    const typingRef = database.ref(`typing/${currentUser.uid}`);
    let typingTimer;

    messageInput.addEventListener('input', () => {
        typingRef.set(true);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            typingRef.set(false);
        }, 1500);  // ۱.۵ ثانیه بعد از توقف تایپ
    });

    database.ref('typing').on('value', (snapshot) => {
        let typingUsers = [];
        const now = Date.now();
        snapshot.forEach((child) => {
            const data = child.val();
            if (data && (now - data.timestamp) < 1500) {
                database.ref(`users/${child.key}`).once('value').then((snap) => {
                    if (snap.exists()) typingUsers.push(snap.val().name);
                    updateTyping(typingUsers);
                });
            }
        });
        if (typingUsers.length === 0) updateTyping([]);
    });
}

function updateTyping(typingUsers) {
    if (typingUsers.length > 0) {
        typingIndicator.textContent = `${typingUsers.join(', ')} داره تایپ می‌کنه...`;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

// setup listener پیام‌ها
function setupMessagesListener() {
    if (messagesListener) database.ref('messages').off('child_added', messagesListener);
    messagesListener = database.ref('messages').on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const div = document.createElement('div');
        div.className = 'message';
        div.innerHTML = `
            <strong>${msg.name}:</strong> ${msg.text} 
            <small>(${msg.timestamp})</small>
        `;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// ثبت‌نام
signupBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!name || !email || !password) return errorMsg.textContent = 'همه فیلدها را پر کنید';

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            userCredential.user.updateProfile({ displayName: name });
            database.ref('users/' + userCredential.user.uid).set({ name: name });
            errorMsg.textContent = '';
            showChat(userCredential.user);
        })
        .catch((error) => errorMsg.textContent = translateError(error));
});

// ورود
loginBtn.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) return errorMsg.textContent = 'ایمیل و رمز عبور را وارد کنید';

    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            errorMsg.textContent = '';
            showChat(userCredential.user);
        })
        .catch((error) => errorMsg.textContent = translateError(error));
});

// نمایش بخش چت
function showChat(user) {
    currentUser = user;
    authSection.classList.add('d-none');
    chatSection.classList.remove('d-none');
    userNameSpan.textContent = user.displayName || 'کاربر';
    messagesDiv.innerHTML = '';
    setupMessagesListener();
    setupPresence();
    setupTyping();
}

// ارسال پیام
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    if (!currentUser) return;

    const messageData = {
        name: currentUser.displayName,
        text: text,
        timestamp: new Date().toLocaleString('fa-IR')
    };

    database.ref('messages').push(messageData)
        .then(() => {
            messageInput.value = '';
        })
        .catch((error) => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger p-2 m-2';
            errorDiv.textContent = translateError(error);
            messagesDiv.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        });
}

sendBtn.addEventListener('click', sendMessage);

// ارسال با Enter
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// خروج
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        chatSection.classList.add('d-none');
        authSection.classList.remove('d-none');
        if (messagesListener) {
            database.ref('messages').off('child_added', messagesListener);
            messagesListener = null;
        }
        messagesDiv.innerHTML = '';
        errorMsg.textContent = '';
        nameInput.value = emailInput.value = passwordInput.value = '';
        typingIndicator.style.display = 'none';
        onlineCountSpan.textContent = '0';
    });
});

// چک وضعیت لاگین
auth.onAuthStateChanged((user) => {
    if (user) {
        showChat(user);
    } else {
        authSection.classList.remove('d-none');
        chatSection.classList.add('d-none');
    }
});

// listener اولیه
setupMessagesListener();
