const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const db = require('./database');

// Initialize Firebase Admin (Mocked initialization for prototype)
// In a real app, you would load the serviceAccountKey.json
admin.initializeApp({
    projectId: "booksdev-3de79",
});

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to check user from cookies
app.use((req, res, next) => {
    res.locals.userId = req.cookies.userId || null;
    res.locals.userPlan = 'free';

    if (req.cookies.userId) {
        db.get('SELECT plan FROM users WHERE id = ?', [req.cookies.userId], (err, row) => {
            if (row) {
                res.locals.userPlan = row.plan;
            }
            next();
        });
    } else {
        next();
    }
});

// Middleware to protect routes
const requireAuth = (req, res, next) => {
    if (!res.locals.userId) {
        return res.redirect('/');
    }
    next();
};

// Routes
app.get('/', (req, res) => {
    if (res.locals.userId) {
        return res.redirect('/dashboard');
    }
    res.render('index');
});

app.post('/api/auth', async (req, res) => {
    const { idToken, email } = req.body;
    if (!idToken) return res.status(400).send('ID Token missing');

    try {
        // We mock verification to bypass the need for a real service account in this prototype environment.
        // In production: const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = "mock_user_123";

        db.get('SELECT * FROM users WHERE id = ?', [uid], (err, row) => {
            if (!row) {
                db.run('INSERT INTO users (id, email) VALUES (?, ?)', [uid, email], (err) => {
                    if(err) console.error(err);
                });
            }
        });

        res.cookie('userId', uid, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }); // 1 day
        res.json({ success: true });
    } catch(err) {
        console.error(err);
        res.status(401).send('Unauthorized');
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('userId');
    res.json({ success: true });
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard');
});

app.get('/segmentation', requireAuth, (req, res) => {
    res.render('segmentation');
});

app.get('/advanced', requireAuth, (req, res) => {
    res.render('advanced');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
