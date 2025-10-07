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

// دیکشنری ترجمه خطاها (همون قبلی)
const errorTranslations = {
    'auth/invalid-email': 'فرمت ایمیل نامعتبر است.',
    'auth/user-not-found': 'کاربر با این ایمیل یافت نشد.',
    'auth/wrong-password': 'رمز عبور اشتباه است.',
    'auth/weak-password': 'رمز عبور خیلی ضعیف است (حداقل ۶ کاراکتر).',
    'auth/email-already-in-use': 'این ایمیل قبلاً استفاده شده است.',
    'auth/too-many-requests': 'تعداد درخواست‌ها زیاد است. بعداً امتحان کنید.',
    'auth/network-request-failed': 'مشکل اتصال به اینترنت.',
    'auth/operation-not-allowed': 'عملیات مجاز نیست. با مدیر تماس بگیرید.',
    'auth/invalid-api-key': 'کلید API نامعتبر است.'
};

function translateError(error) {
    return errorTranslations[error.code] || error.message;
}

// عناصر DOM (بدون upload)
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
const searchInput = document.getElementById('search-input');
const darkModeToggle = document.getElementById('dark-mode-toggle');
const exportChatBtn = document.getElementById('export-chat');
const onlineUsersSpan = document.getElementById('online-users');
const typingIndicator = document.getElementById('typing-indicator');

// متغیرهای reply و ادمین
let currentReplyTo = null;
let messagesListener = null;
let typingListeners = {};
let isAdmin = false;
let currentUser = null;
let bannedUsers = {};

// تایپینگ indicator
function updateTypingIndicator(typingUsers) {
    if (typingUsers.length > 0) {
        typingIndicator.textContent = `${typingUsers.join(', ')} داره تایپ می‌کنه...`;
        typingIndicator.style.display = 'block';
    } else {
        typingIndicator.style.display = 'none';
    }
}

// listener تایپینگ
function setupTypingListener() {
    const userRef = database.ref(`presence/${currentUser.uid}`);
    let typingTimer;
    messageInput.addEventListener('input', () => {
        userRef.set({ typing: true, timestamp: firebase.database.ServerValue.TIMESTAMP });
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            userRef.set({ typing: false });
        }, 2000);
    });

    database.ref('presence').on('value', (snapshot) => {
        const typingUsers = [];
        const now = Date.now();
        snapshot.forEach((child) => {
            const data = child.val();
            if (data.typing && (now - data.timestamp) < 2000) {
                database.ref(`users/${child.key}`).once('value').then((snap) => {
                    if (snap.exists()) {
                        typingUsers.push(snap.val().name);
                        updateTypingIndicator([...new Set(typingUsers)]);  // unique
                    }
                });
            }
        });
        if (typingUsers.length === 0) updateTypingIndicator([]);
    });
}

// آنلاین کاربران
function setupOnlineUsers() {
    const userRef = database.ref(`online/${currentUser.uid}`);
    userRef.set(true).onDisconnect().remove();

    database.ref('online').on('value', (snapshot) => {
        const count = snapshot.numChildren();
        onlineUsersSpan.textContent = `کاربران آنلاین: ${count}`;
    });
}

// چک ادمین
function checkAdmin(user) {
    currentUser = user;
    if (user.email === 'admin@example.com') {  // عوض کن با ایمیل خودت
        isAdmin = true;
        database.ref('admins').child(user.uid).set({ role: 'admin' });
    } else {
        database.ref('admins/' + user.uid).once('value').then((snap) => {
            isAdmin = snap.exists();
        });
    }
    userNameSpan.innerHTML = (user.displayName || 'کاربر');
    if (isAdmin) userNameSpan.innerHTML += ' <span class="badge bg-danger">ادمین</span>';
}

// setup listener پیام‌ها (با حذف برای ادمین، بن چک)
function setupMessagesListener() {
    if (messagesListener) database.ref('messages').off('child_added', messagesListener);
    messagesListener = database.ref('messages').on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const msgId = snapshot.key;
        if (bannedUsers[msg.name]) return;  // اگر بن شده، نمایش نده

        const div = document.createElement('div');
        div.className = 'message';
        div.setAttribute('data-id', msgId);
        const isReply = msg.parentId;
        const indentClass = isReply ? 'reply-thread' : '';
        let html = `
            <div class="${indentClass}">
                <strong>${msg.name}:</strong> ${msg.text} 
                <small>(${msg.timestamp})</small>
                <button class="btn btn-sm btn-outline-secondary reply-btn" data-id="${msgId}" data-name="${msg.name}">پاسخ</button>
        `;
        if (isAdmin) {
            html += `<button class="btn btn-sm btn-outline-danger delete-btn" data-id="${msgId}">حذف</button>
                     <button class="btn btn-sm btn-outline-warning ban-btn" data-name="${msg.name}">بن</button>`;
        }
        html += '</div>';
        div.innerHTML = html;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // event reply
        const replyBtn = div.querySelector('.reply-btn');
        replyBtn.addEventListener('click', () => {
            if (currentReplyTo) {
                const prevDiv = document.querySelector(`[data-id="${currentReplyTo.id}"]`);
                if (prevDiv) prevDiv.classList.remove('highlighted');
            }
            currentReplyTo = { id: msgId, name: msg.name };
            messageInput.placeholder = `پاسخ به ${msg.name}...`;
            messageInput.focus();
            div.classList.add('highlighted');
            if (!document.getElementById('cancel-reply')) {
                const cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancel-reply';
                cancelBtn.className = 'btn btn-sm btn-outline-danger ms-2';
                cancelBtn.textContent = 'لغو';
                cancelBtn.addEventListener('click', () => {
                    currentReplyTo = null;
                    messageInput.placeholder = 'پیام خود را بنویسید...';
                    div.classList.remove('highlighted');
                    cancelBtn.remove();
                });
                sendBtn.parentNode.insertBefore(cancelBtn, sendBtn.nextSibling);
            }
        });

        // حذف پیام (ادمین)
        if (isAdmin) {
            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => {
                if (confirm('حذف پیام؟')) {
                    database.ref('messages/' + msgId).remove();
                }
            });

            // بن کاربر
            const banBtn = div.querySelector('.ban-btn');
            banBtn.addEventListener('click', () => {
                if (confirm('بن کاربر ' + msg.name + '؟')) {
                    database.ref('banned/' + msg.name).set(true);
                    bannedUsers[msg.name] = true;
                    // حذف پیام‌های بن‌شده
                    document.querySelectorAll('.message').forEach(el => {
                        if (el.textContent.includes(msg.name + ':')) el.remove();
                    });
                }
            });
        }
    });
}

// جستجو
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    messagesDiv.querySelectorAll('.message').forEach(msg => {
        const text = msg.textContent.toLowerCase();
        if (query && text.includes(query)) {
            msg.classList.add('search-highlight');
        } else {
            msg.classList.remove('search-highlight');
        }
    });
});

// دارک مود
darkModeToggle.addEventListener('change', () => {
    document.body.classList.toggle('dark');
    document.querySelectorAll('.card, .chat-messages').forEach(el => el.classList.toggle('dark'));
    localStorage.setItem('darkMode', darkModeToggle.checked);
});

// لود دارک مود
if (localStorage.getItem('darkMode') === 'true') {
    darkModeToggle.checked = true;
    document.body.classList.add('dark');
    document.querySelectorAll('.card, .chat-messages').forEach(el => el.classList.add('dark'));
}

// export چت (ادمین)
exportChatBtn.addEventListener('click', () => {
    if (!isAdmin) return alert('فقط ادمین می‌تونه دانلود کنه');
    database.ref('messages').once('value').then((snapshot) => {
        let chatText = '';
        snapshot.forEach((child) => {
            const msg = child.val();
            chatText += `${msg.name}: ${msg.text} (${msg.timestamp})\n`;
        });
        const blob = new Blob([chatText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chat.txt';
        a.click();
    });
});

// ثبت‌نام
signupBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!name || !email || !password) return errorMsg.textContent = 'همه فیلدها را پر کنید';

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            userCredential.user.updateProfile({ displayName: name });
            database.ref('users/' + userCredential.user.uid).set({ name: name, email: email });
            errorMsg.textContent = '';
            checkAdmin(userCredential.user);
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
            checkAdmin(userCredential.user);
            showChat(userCredential.user);
        })
        .catch((error) => errorMsg.textContent = translateError(error));
});

// showChat
function showChat(user) {
    authSection.style.display = 'none';
    chatSection.style.display = 'block';
    messagesDiv.innerHTML = '';
    currentReplyTo = null;
    messageInput.placeholder = 'پیام خود را بنویسید...';
    const cancelBtn = document.getElementById('cancel-reply');
    if (cancelBtn) cancelBtn.remove();
    setupMessagesListener();
    setupTypingListener();
    setupOnlineUsers();
    // لود بن‌ها
    database.ref('banned').once('value').then((snap) => {
        bannedUsers = snap.val() || {};
    });
}

// ارسال
sendBtn.addEventListener('click', () => {
    if (bannedUsers[currentUser.displayName]) return alert('شما بن شدید!');
    const text = messageInput.value.trim();
    if (!text) return;

    const messageData = {
        name: currentUser.displayName,
        text: text,
        timestamp: new Date().toLocaleString('fa-IR'),
        parentId: currentReplyTo ? currentReplyTo.id : null
    };

    database.ref('messages').push(messageData)
        .then(() => {
            messageInput.value = '';
            currentReplyTo = null;
            messageInput.placeholder = 'پیام خود را بنویسید...';
            const cancelBtn = document.getElementById('cancel-reply');
            if (cancelBtn) cancelBtn.remove();
            document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
        })
        .catch((error) => {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = translateError(error);
            messagesDiv.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        });
});

// خروج
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        authSection.style.display = 'block';
        chatSection.style.display = 'none';
        if (messagesListener) database.ref('messages').off('child_added', messagesListener);
        messagesListener = null;
        messagesDiv.innerHTML = '';
        errorMsg.textContent = '';
        currentReplyTo = null;
        isAdmin = false;
        currentUser = null;
        bannedUsers = {};
    });
});

// onAuthStateChanged
auth.onAuthStateChanged((user) => {
    if (user) {
        checkAdmin(user);
        showChat(user);
    } else {
        authSection.style.display = 'block';
        chatSection.style.display = 'none';
    }
});

// listener اولیه
setupMessagesListener();
