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

// متغیرهای reply
let currentReplyTo = null;
let messagesListener = null;

// setup listener پیام‌ها (با فیکس reply)
function setupMessagesListener() {
    if (messagesListener) database.ref('messages').off('child_added', messagesListener);
    messagesListener = database.ref('messages').on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const msgId = snapshot.key;
        const div = document.createElement('div');
        div.className = 'message';
        div.setAttribute('data-id', msgId);
        const isReply = msg.parentId;
        const threadClass = isReply ? 'reply-thread' : '';
        div.innerHTML = `
            <div class="${threadClass}">
                <strong>${msg.name}:</strong> ${msg.text} 
                <small>(${msg.timestamp})</small>
                <button class="reply-btn" data-id="${msgId}" data-name="${msg.name}">پاسخ</button>
            </div>
        `;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // event reply (فیکس: highlight و thread)
        const replyBtn = div.querySelector('.reply-btn');
        replyBtn.addEventListener('click', () => {
            // پاک کردن highlight قبلی
            document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
            currentReplyTo = { id: msgId, name: msg.name };
            messageInput.placeholder = `پاسخ به ${msg.name}...`;
            messageInput.focus();
            div.classList.add('highlighted');

            // دکمه لغو (اختیاری)
            let cancelBtn = document.getElementById('cancel-reply');
            if (!cancelBtn) {
                cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancel-reply';
                cancelBtn.className = 'btn btn-sm btn-outline-danger ms-1';
                cancelBtn.textContent = 'لغو';
                cancelBtn.addEventListener('click', () => {
                    currentReplyTo = null;
                    messageInput.placeholder = 'پیام خود را بنویسید...';
                    document.querySelectorAll('.highlighted').forEach(el => el.classList.remove('highlighted'));
                    cancelBtn.remove();
                });
                sendBtn.parentNode.insertBefore(cancelBtn, sendBtn);
            }
        });
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
    authSection.classList.add('d-none');
    chatSection.classList.remove('d-none');
    userNameSpan.textContent = user.displayName || 'کاربر';
    messagesDiv.innerHTML = '';
    currentReplyTo = null;
    messageInput.placeholder = 'پیام خود را بنویسید...';
    const cancelBtn = document.getElementById('cancel-reply');
    if (cancelBtn) cancelBtn.remove();
    setupMessagesListener();
}

// ارسال پیام (با reply فیکس)
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return;

    const messageData = {
        name: user.displayName,
        text: text,
        timestamp: new Date().toLocaleString('fa-IR'),
        parentId: currentReplyTo ? currentReplyTo.id : null  // فیکس: parentId ست می‌شه
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
            errorDiv.className = 'alert alert-danger p-2 m-2';
            errorDiv.textContent = translateError(error);
            messagesDiv.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);
        });
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
        currentReplyTo = null;
        nameInput.value = emailInput.value = passwordInput.value = '';
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

