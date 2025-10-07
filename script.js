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

// دیکشنری ترجمه خطاهای Firebase به پارسی (رایج‌ترین‌ها)
const errorTranslations = {
    'auth/invalid-email': 'فرمت ایمیل نامعتبر است.',
    'auth/user-not-found': 'کاربر با این ایمیل یافت نشد.',
    'auth/wrong-password': 'رمز عبور اشتباه است.',
    'auth/weak-password': 'رمز عبور خیلی ضعیف است (حداقل ۶ کاراکتر).',
    'auth/email-already-in-use': 'این ایمیل قبلاً استفاده شده است.',
    'auth/too-many-requests': 'تعداد درخواست‌ها زیاد است. بعداً امتحان کنید.',
    'auth/network-request-failed': 'مشکل اتصال به اینترنت.',
    'auth/operation-not-allowed': 'عملیات مجاز نیست. با مدیر تماس بگیرید.',
    'auth/invalid-api-key': 'کلید API نامعتبر است.'  // برای خطای قبلی
};

// تابع ترجمه خطا
function translateError(error) {
    return errorTranslations[error.code] || error.message;  // اگر ترجمه نبود، انگلیسی بده
}

// عناصر DOM (همون قبلی + برای reply)
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

// متغیرهای جدید برای reply
let currentReplyTo = null;  // {id: messageId, name: senderName}
let messagesListener = null;

// setup listener پیام‌ها (با parentId برای reply)
function setupMessagesListener() {
    if (messagesListener) database.ref('messages').off('child_added', messagesListener);
    messagesListener = database.ref('messages').on('child_added', (snapshot) => {
        const msg = snapshot.val();
        const msgId = snapshot.key;  // کلید unique در Firebase
        const div = document.createElement('div');
        div.className = 'message';
        // indentation برای replies
        const indent = msg.parentId ? 'ml-4' : '';  // Bootstrap margin-left
        div.innerHTML = `
            <div class="${indent}">
                <strong>${msg.name}:</strong> ${msg.text} 
                <small>(${msg.timestamp})</small>
                <button class="btn btn-sm btn-outline-secondary reply-btn" data-id="${msgId}" data-name="${msg.name}">پاسخ</button>
            </div>
        `;
        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        // event listener برای دکمه reply
        const replyBtn = div.querySelector('.reply-btn');
        replyBtn.addEventListener('click', () => {
            currentReplyTo = { id: msgId, name: msg.name };
            messageInput.placeholder = `پاسخ به ${msg.name}...`;
            messageInput.focus();
            // اختیاری: دکمه cancel reply اضافه کن
            if (!document.getElementById('cancel-reply')) {
                const cancelBtn = document.createElement('button');
                cancelBtn.id = 'cancel-reply';
                cancelBtn.className = 'btn btn-sm btn-outline-danger ms-2';
                cancelBtn.textContent = 'لغو';
                cancelBtn.addEventListener('click', () => {
                    currentReplyTo = null;
                    messageInput.placeholder = 'پیام خود را بنویسید...';
                });
                sendBtn.parentNode.insertBefore(cancelBtn, sendBtn.nextSibling);
            }
        });
    });
}

// ثبت‌نام (با ترجمه خطا)
signupBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!name || !email || !password) return errorMsg.textContent = 'همه فیلدها را پر کنید';

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            userCredential.user.updateProfile({ displayName: name });
            database.ref('users/' + userCredential.user.uid).set({ name: name });
            errorMsg.textContent = '';  // پاک کردن خطا
            showChat(userCredential.user);
        })
        .catch((error) => errorMsg.textContent = translateError(error));
});

// ورود (با ترجمه خطا)
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
    authSection.style.display = 'none';
    chatSection.style.display = 'block';
    userNameSpan.textContent = user.displayName || 'کاربر';
    messagesDiv.innerHTML = '';
    currentReplyTo = null;  // reset reply
    messageInput.placeholder = 'پیام خود را بنویسید...';
    // پاک کردن cancel btn اگر وجود داره
    const cancelBtn = document.getElementById('cancel-reply');
    if (cancelBtn) cancelBtn.remove();
    setupMessagesListener();
}

// ارسال پیام (با reply و ترجمه خطا)
sendBtn.addEventListener('click', () => {
    const text = messageInput.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    if (!user) return errorMsg.textContent = 'لطفاً وارد شوید';

    const messageData = {
        name: user.displayName,
        text: text,
        timestamp: new Date().toLocaleString('fa-IR'),
        parentId: currentReplyTo ? currentReplyTo.id : null  // برای reply
    };

    database.ref('messages').push(messageData)
        .then(() => {
            messageInput.value = '';
            currentReplyTo = null;
            messageInput.placeholder = 'پیام خود را بنویسید...';
            const cancelBtn = document.getElementById('cancel-reply');
            if (cancelBtn) cancelBtn.remove();
        })
        .catch((error) => {
            // نمایش خطا در بخش چت (جدید)
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = translateError(error);
            messagesDiv.appendChild(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000);  // پاک کردن بعد ۵ ثانیه
        });
});

// خروج
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => {
        authSection.style.display = 'block';
        chatSection.style.display = 'none';
        if (messagesListener) {
            database.ref('messages').off('child_added', messagesListener);
            messagesListener = null;
        }
        messagesDiv.innerHTML = '';
        errorMsg.textContent = '';
        currentReplyTo = null;
    });
});

// چک کردن وضعیت لاگین
auth.onAuthStateChanged((user) => {
    if (user) {
        showChat(user);
    } else {
        authSection.style.display = 'block';
        chatSection.style.display = 'none';
        setupMessagesListener();  // listener رو نگه دار برای realtime
    }
});

// listener اولیه
setupMessagesListener();
