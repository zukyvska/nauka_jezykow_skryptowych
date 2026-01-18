const API_URL = 'http://localhost:5000';

let currentUser = {
    id: localStorage.getItem('userId') || null,
    username: localStorage.getItem('username') || null,
    email: localStorage.getItem('userEmail') || null,
    isLoggedIn: localStorage.getItem('isLoggedIn') === 'true' || false
};

function loadProgress(key) {
    return JSON.parse(localStorage.getItem(key)) || {
        completedLessons: [],
        quizScores: [],
        lastActive: null
    };
}

let progress = {
    python: loadProgress('progress_python'),
    javascript: loadProgress('progress_javascript')
};

let currentLesson = null;
let currentLanguage = null;
let currentQuiz = null;
let currentQuizData = null;

function showTab(tabName) {

    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.style.display = 'none';
    });


    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.style.display = 'block';
    }


    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });


    if (event && event.target) {
        event.target.classList.add('active');
    }


    if (tabName === 'dashboard') {
        updateDashboard();
    }


    if (tabName === 'quiz') {
        document.getElementById('quizContainer').innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <div class="display-6 mb-3">
                        <i class="fas fa-brain text-info"></i>
                    </div>
                    <h5>Wybierz język aby rozpocząć quiz</h5>
                    <p>Każdy quiz zawiera pytania wielokrotnego wyboru</p>
                </div>
            </div>
        `;
        document.getElementById('checkQuizBtn').style.display = 'none';
        document.getElementById('quizResult').innerHTML = '';
    }


    if (tabName === 'home') {
        updateLiveStats();
    }
}

function checkLoginStatus() {
    if (currentUser.isLoggedIn && currentUser.username) {
        document.getElementById('authButtons').style.display = 'none';
        document.getElementById('userProfile').style.display = 'block';
        document.getElementById('userNameDisplay').textContent = currentUser.username;
    } else {
        document.getElementById('authButtons').style.display = 'block';
        document.getElementById('userProfile').style.display = 'none';
    }
}

function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

function showRegisterForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

function showRegisterFormInModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
    setTimeout(() => {
        showRegisterForm();
    }, 500);
}

async function login() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
        showMessage('Wpisz nazwę użytkownika i hasło', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            throw new Error('Błąd logowania');
        }
        const data = await response.json();
        loginUser(data.user);
        showMessage('Zalogowano pomyślnie', 'success');
    } catch (error) {
        handleLoginError(username, password, error);
    }
}

function loginUser(user) {
    currentUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        isLoggedIn: true
    };

    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('username', currentUser.username);
    localStorage.setItem('userEmail', currentUser.email);
    localStorage.setItem('isLoggedIn', 'true');

    checkLoginStatus();
    closeLoginModal();
    updateLiveStats();
}

function handleLoginError(username, password, error) {
    console.error(error);

    if (username === 'demo' && password === 'demo') {
        loginAsDemo();
        showMessage('Zalogowano jako użytkownik demo', 'info');
    } else {
        showMessage('Nie udało się zalogować', 'error');
    }
}

function closeLoginModal() {
    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (modal) modal.hide();
}

async function register() {
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confPassword = document.getElementById('registerConfPassword').value;

    if (!validateRegisterForm(username, email, password, confPassword)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        if (!response.ok) {
            throw new Error('Błąd rejestracji');
        }

        const data = await response.json();

        handleRegisterSuccess(data, username, email);
    } catch (error) {
        handleRegisterError(username, email, error);
    }
}

function validateRegisterForm(username, email, password, confPassword) {
    if (!username || !email || !password || !confPassword) {
        showMessage('Wypełnij wszystkie pola', 'warning');
        return false;
    }

    if (password !== confPassword) {
        showMessage('Hasła nie są identyczne', 'error');
        return false;
    }

    if (password.length < 6) {
        showMessage('Hasło musi mieć minimum 6 znaków', 'error');
        return false;
    }
    return true;
}

function handleRegisterSuccess(data, username, email) {
    if (data.success) {
        showMessage('Konto utworzone, możesz się zalogować', 'success');
        showLoginForm();

        document.getElementById('loginUsername').value = username;
        document.getElementById('loginPassword').value = '';
    } else {
        registerAsDemo(username, email);
        showMessage('Utworzono konto demo', 'info');
    }
}

function handleRegisterError(username, email, error) {
    console.error(error);

    registerAsDemo(username, email);
    showMessage('Backend niedostepny - konto demo', 'info');
}

function registerAsDemo(username, email) {
    currentUser = {
        id: DataView.now(),
        username: username,
        email: email,
        isLoggedIn: true
    };

    localStorage.setItem('userId', currentUser.id);
    localStorage.setItem('username', currentUser.username);
    localStorage.setItem('userEmail', currentUser.email);
    localStorage.setItem('isLoggedIn', 'true');

    checkLoginStatus();
    closeLoginModal();
    updateLiveStats();
}

function logout() {
    if (confirm('Czy na pewno chcesz się wylogować?')) {
        currentUser = { id: null, username: null, email: null, isLoggedIn: false };

        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('userEmail');
        localStorage.setItem('isLoggedIn', 'false');

        checkLoginStatus();
        showMessage('Wylogowano pomyślnie', 'info');
    }
}

function showUserProfile() {
    alert(`Profil użytkownika:\nNazwa: ${currentUser.username}\nEmail: ${currentUser.email}\nID: ${currentUser.id}`);
}

async function checkServerStatus() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');

    try {
        const response = await fetch(`${API_URL}/api/health`);
        if (response.ok) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Serwer online';
            updateLiveStats();
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Serwer ma problemy';
        }
    } catch (error) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Serwer offline';
    }


    setTimeout(checkServerStatus, 30000);
}

async function updateLiveStats() {
    try {

        const response = await fetch(`${API_URL}/api/stats`);
        const stats = await response.json();


        document.getElementById('totalPythonLessons').textContent = stats.python_lessons || 3;
        document.getElementById('totalJSLessons').textContent = stats.javascript_lessons || 3;
        document.getElementById('totalUsers').textContent = stats.total_users || (currentUser.isLoggedIn ? 1 : 0);
        document.getElementById('activeUsers').textContent = stats.active_today || 1;


        const pythonProgress = calculateProgress('python');
        const jsProgress = calculateProgress('javascript');

        document.getElementById('pythonProgressBarHome').style.width = pythonProgress + '%';
        document.getElementById('pythonProgressPercent').textContent = pythonProgress + '%';
        document.getElementById('jsProgressBarHome').style.width = jsProgress + '%';
        document.getElementById('jsProgressPercent').textContent = jsProgress + '%';

    } catch (error) {

        document.getElementById('totalPythonLessons').textContent = 3;
        document.getElementById('totalJSLessons').textContent = 3;
        document.getElementById('totalUsers').textContent = currentUser.isLoggedIn ? 1 : 0;
        document.getElementById('activeUsers').textContent = 1;


        const pythonProgress = calculateProgress('python');
        const jsProgress = calculateProgress('javascript');

        document.getElementById('pythonProgressBarHome').style.width = pythonProgress + '%';
        document.getElementById('pythonProgressPercent').textContent = pythonProgress + '%';
        document.getElementById('jsProgressBarHome').style.width = jsProgress + '%';
        document.getElementById('jsProgressPercent').textContent = jsProgress + '%';
    }
}

function calculateProgress(language) {
    const progressData = progress[language];
    const totalLessons = language === 'python' ? 3 : 3;
    const completed = progressData.completedLessons.length;
    return Math.round((completed / totalLessons) * 100);
}

async function loadPythonLessons() {
    try {
        const response = await fetch(`${API_URL}/api/python/lessons`);
        const lessons = await response.json();

        const container = document.getElementById('pythonLessonsList');
        container.innerHTML = '';

        lessons.forEach(lesson => {
            const isCompleted = progress.python.completedLessons.includes(lesson.id);
            const item = document.createElement('a');
            item.href = '#';
            item.className = `list-group-item list-group-item-action ${isCompleted ? 'list-group-item-success' : ''}`;
            item.innerHTML = `
                <strong>Lekcja ${lesson.id}:</strong> ${lesson.title}
                ${isCompleted ? ' <i class="fas fa-check float-end"></i>' : ''}
            `;
            item.onclick = () => loadPythonLesson(lesson);
            container.appendChild(item);
        });


        updatePythonProgress();

    } catch (error) {
        console.error('Błąd ładowania lekcji Pythona:', error);
        document.getElementById('pythonLessonsList').innerHTML = `
            <div class="alert alert-warning">
                Nie udało się załadować lekcji. Sprawdź połączenie z backendem.
            </div>
        `;
    }
}

function loadPythonLesson(lesson) {
    currentLesson = lesson;
    currentLanguage = 'python';

    const contentDiv = document.getElementById('pythonLessonContent');
    contentDiv.innerHTML = `
        <div class="card-body">
            <h4>${lesson.title}</h4>
            <p>${lesson.content}</p>
            <h6><i class="fas fa-code"></i> Przykład kodu:</h6>
            <pre><code class="language-python">${lesson.code}</code></pre>
            <p><strong><i class="fas fa-info-circle"></i> Wyjaśnienie:</strong> ${lesson.explanation || ''}</p>
            <button class="btn btn-python" onclick="showPythonExercise()">
                <i class="fas fa-pencil-alt"></i> Rozwiąż ćwiczenie
            </button>
        </div>`;

    if (window.Prism) {
        Prism.highlightAll();
    }


    document.getElementById('pythonExercise').style.display = 'none';
    document.getElementById('pythonExerciseResult').innerHTML = '';
}

function showPythonExercise() {
    const exerciseDiv = document.getElementById('pythonExercise');
    exerciseDiv.style.display = 'block';

    document.getElementById('exerciseQuestion').textContent = currentLesson.exercise.question;
    document.getElementById('exerciseTemplate').textContent = currentLesson.exercise.template;
    document.getElementById('pythonAnswer').value = '';
    document.getElementById('pythonExerciseResult').innerHTML = '';


    if (window.Prism) {
        Prism.highlightAll();
    }
}

function completePythonLesson() {
    if (progress.python.completedLessons.includes(currentLesson.id)) {
        return;
    }
    progress.python.completedLessons.push(currentLesson.id);
    progress.python.lastActive = new Date().toISOString();

    saveProgress();
    updatePythonProgress();
    updateLiveStats();
    loadPythonLessons();
}

function showPythonResult(isCorrect, message) {
    const resultsDiv = document.getElementById('pythonExerciseResult');

    if (isCorrect) {
        resultsDiv.innerHTML =
            `<div class="alert alert-success">
                <i class="fas fa-check-circle"></i> ${message}
                </div>`;
    } else {
        resultsDiv.innerHTML =
            `<div class="alert alert-danger">
                <i class="fas fa-times-circle"></i> ${message}
            </div>`;
    }
}

function checkPythonAnswerOffline(answer) {
    const correctAnswer = currentLesson.exercise?.answer || 'print';
    return answer.toLowerCase() === correctAnswer.toLowerCase();
}

async function checkPythonAnswer() {
    const answer = document.getElementById('pythonAnswer').value.trim();
    const resultDiv = document.getElementById('pythonExerciseResult');

    if (!answer) {
        resultDiv.innerHTML =
            '<div class="alert alert-warning">Wpisz odpowiedź!</div>';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/check-exercise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: 'python',
                lesson_id: currentLesson.id,
                answer: answer
            })
        });

        const result = await response.json();

        showPythonResult(result.correct, result.message);

        if (result.correct) {
            completePythonLesson();
        }

    } catch (error) {
        const isCorrect = checkPythonAnswerOffline(answer);

        if (isCorrect) {
            showPythonResult(true, 'Poprawna odpowiedź!');
            completePythonLesson();
        } else {
            const correctAnswer = currentLesson.exercise?.answer || 'print';
            showPythonResult(false, `Błąd! Poprawna odpowiedź: ${correctAnswer}`);
        }
    }
}


function updatePythonProgress() {
    const totalLessons = 3;
    const completed = progress.python.completedLessons.length;
    const percent = Math.round((completed / totalLessons) * 100);

    document.getElementById('pythonProgress').style.width = percent + '%';
    document.getElementById('pythonProgress').textContent = percent + '%';
}

async function loadJSLessons() {
    try {
        const response = await fetch(`${API_URL}/api/javascript/lessons`);
        const lessons = await response.json();

        const container = document.getElementById('jsLessonsList');
        container.innerHTML = '';

        lessons.forEach(lesson => {
            const isCompleted = progress.javascript.completedLessons.includes(lesson.id);
            const item = document.createElement('a');
            item.href = '#';
            item.className = `list-group-item list-group-item-action ${isCompleted ? 'list-group-item-warning' : ''}`;
            item.innerHTML = `
                <strong>Lekcja ${lesson.id}:</strong> ${lesson.title}
                ${isCompleted ? ' <i class="fas fa-check float-end"></i>' : ''}
            `;
            item.onclick = () => loadJSLesson(lesson);
            container.appendChild(item);
        });


        updateJSProgress();

    } catch (error) {
        console.error('Błąd ładowania lekcji JS:', error);
        document.getElementById('jsLessonsList').innerHTML = `
            <div class="alert alert-warning">
                Nie udało się załadować lekcji. Sprawdź połączenie z backendem.
            </div>
        `;
    }
}

function loadJSLesson(lesson) {
    currentLesson = lesson;
    currentLanguage = 'javascript';

    const contentDiv = document.getElementById('jsLessonContent');
    contentDiv.innerHTML = `
        <div class="card-body">
            <h4>${lesson.title}</h4>
            <p>${lesson.content}</p>
            <h6><i class="fas fa-code"></i> Przykład kodu:</h6>
            <pre><code class="language-javascript">${lesson.code}</code></pre>
            <p><strong><i class="fas fa-info-circle"></i> Wyjaśnienie:</strong> ${lesson.explanation || ''}</p>
            <button class="btn btn-js" onclick="showJSExercise()">
                <i class="fas fa-pencil-alt"></i> Rozwiąż ćwiczenie
            </button>
        </div>
    `;


    if (window.Prism) {
        Prism.highlightAll();
    }


    document.getElementById('jsExercise').style.display = 'none';
    document.getElementById('jsExerciseResult').innerHTML = '';
}

function showJSExercise() {
    const exerciseDiv = document.getElementById('jsExercise');
    exerciseDiv.style.display = 'block';

    document.getElementById('jsExerciseQuestion').textContent = currentLesson.exercise.question;
    document.getElementById('jsExerciseTemplate').textContent = currentLesson.exercise.template;
    document.getElementById('jsAnswer').value = '';
    document.getElementById('jsExerciseResult').innerHTML = '';


    if (window.Prism) {
        Prism.highlightAll();
    }
}

function completeJSLesson() {
    if (progress.javascript.completedLessons.includes(currentLesson.id)) {
        return;
    }
    progress.javascript.completedLessons.push(currentLesson.id);
    progress.javascript.lastActive = new Date().toISOString();

    saveProgress();
    updateJSProgress();
    updateLiveStats();
    loadJSLessons();
}

function showExerciseResult(containerId, isCorrect, message) {
    const resultDiv = document.getElementById(containerId);

    if (isCorrect) {
        resultDiv.innerHTML =
            `<div class="alert alert-success">
                <i class="fas fa-check-circle"></i> ${message}
            </div>`;
    } else {
        resultDiv.innerHTML =
            `<div class="alert alert-danger">
                <i class="fas fa-times-circle"></i> ${message}
            </div>`;
    }
}

function checkJSAnswerOffline(answer) {
    const correctAnswer = currentLesson.exercise?.answer || 'log';
    return answer.toLowerCase() === correctAnswer.toLowerCase();
}

async function checkJSAnswer() {
    const answer = document.getElementById('jsAnswer').value.trim();

    if (!answer) {
        showExerciseResult(
            'jsExerciseResult',
            false,
            'Wpisz odpowiedź!'
        );
        return;
    }

    try {
        const response = await fetch(`${API_URL}/api/check-exercise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: 'javascript',
                lesson_id: currentLesson.id,
                answer: answer
            })
        });

        const result = await response.json();

        showExerciseResult(
            'jsExerciseResult',
            result.correct,
            result.message
        );

        if (result.correct) {
            completeJSLesson();
        }

    } catch (error) {
        const isCorrect = checkJSAnswerOffline(answer);

        if (isCorrect) {
            showExerciseResult(
                'jsExerciseResult',
                true,
                'Poprawna odpowiedź!'
            );
            completeJSLesson();
        } else {
            const correctAnswer = currentLesson.exercise?.answer || 'log';
            showExerciseResult(
                'jsExerciseResult',
                false,
                `Błąd! Poprawna odpowiedź: ${correctAnswer}`
            );
        }
    }
}


function updateJSProgress() {
    const totalLessons = 3;
    const completed = progress.javascript.completedLessons.length;
    const percent = Math.round((completed / totalLessons) * 100);

    document.getElementById('jsProgress').style.width = percent + '%';
    document.getElementById('jsProgress').textContent = percent + '%';
}

function renderQuiz(language, quizData) {
    let quizHTML = `
        <h3 class="mb-4">${language === 'python' ? '<i class="fab fa-python python-color"></i> Python Quiz' : '<i class="fab fa-js-square js-color"></i> JavaScript Quiz'}</h3>
        <p class="mb-4"><i class="fas fa-info-circle"></i> Odpowiedz na ${quizData.length} pytań:</p>
    `;

    quizData.forEach((question, index) => {
        quizHTML += `
            <div class="card mb-3">
                <div class="card-body">
                    <h5><i class="fas fa-question-circle"></i> Pytanie ${index + 1}: ${question.question}</h5>
                    ${question.options.map((option, optIndex) => `
                        <div class="quiz-option" onclick="selectAnswer(${index}, ${optIndex})" id="q${index}o${optIndex}">
                            <span class="option-letter">${String.fromCharCode(65 + optIndex)})</span> ${option}
                        </div>
                    `).join('')}
                    <input type="hidden" id="answer${index}" value="">
                </div>
            </div>
        `;
    });

    document.getElementById('quizContainer').innerHTML = quizHTML;
    document.getElementById('checkQuizBtn').style.display = 'block';
    document.getElementById('quizResult').innerHTML = '';
}

function getDummyQuiz(language) {
    return language === 'python'
        ? [
            { question: "Jak wypisać tekst w Pythonie?", options: ["print()", "console.log()", "echo()", "printf()"], correct: 0 },
            { question: "Który typ danych jest mutowalny?", options: ["tuple", "string", "list", "int"], correct: 2 },
            { question: "Jak rozpocząć definicję funkcji?", options: ["function nazwa():", "def nazwa():", "func nazwa():", "def nazwa:"], correct: 1 }
        ]
        : [
            { question: "Jak wypisać tekst w konsoli?", options: ["print()", "console.log()", "alert.print()", "log()"], correct: 1 },
            { question: "Które słowo kluczowe tworzy stałą?", options: ["var", "let", "const", "static"], correct: 2 },
            { question: "Co wypisze: console.log(typeof null)?", options: ["null", "undefined", "object", "string"], correct: 2 }
        ];
}

async function loadQuiz(language) {
    let quizData;

    try {
        const response = await fetch(`${API_URL}/api/quiz/${language}`);
        quizData = await response.json();
    } catch (error) {
        quizData = getDummyQuiz(language);
    }

    currentQuiz = language;
    currentQuizData = quizData;

    renderQuiz(language, quizData);
}


function selectAnswer(questionIndex, optionIndex) {

    const quizOptions = document.querySelectorAll(`[id^="q${questionIndex}o"]`);
    quizOptions.forEach(option => {
        option.classList.remove('selected');
        option.style.backgroundColor = '';
        option.style.borderColor = '#dee2e6';
    });


    const selectedOption = document.getElementById(`q${questionIndex}o${optionIndex}`);
    selectedOption.classList.add('selected');
    selectedOption.style.backgroundColor = '#e7f1ff';
    selectedOption.style.borderColor = '#007bff';


    document.getElementById(`answer${questionIndex}`).value = optionIndex;
}

function markQuizAnswers(quizData, answers, results = null) {
    quizData.forEach((question, index) => {
        const correctIndex = results ? results[index].correct_answer : question.correct;
        const userIndex = answers[index];

        const correctOption = document.getElementById(`q${index}o${correctIndex}`);
        const userOption = document.getElementById(`q${index}o${userIndex}`);

        if (correctOption) correctOption.classList.add('correct');
        if (userOption && (!results ? userIndex !== correctIndex : !results[index].correct)) {
            userOption.classList.add('incorrect');
        }
    });
}

function calculateQuizScore(quizData, answers) {
    let score = 0;
    quizData.forEach((q, i) => {
        if (answers[i] === q.correct) score++;
    });
    const total = quizData.length;
    const percent = Math.round((score / total) * 100);
    const passed = percent >= 70;
    return { score, total, percent, passed };
}

function saveQuizScore(language, scoreData) {
    if (language === 'python') {
        progress.python.quizScores.push(scoreData);
    } else {
        progress.javascript.quizScores.push(scoreData);
    }
    saveProgress();
    updateDashboard();
}

async function checkQuiz() {
    if (!currentQuizData) return;

    const answers = {};
    currentQuizData.forEach((_, i) => {
        const val = document.getElementById(`answer${i}`).value;
        answers[i] = val !== '' ? parseInt(val) : null;
    });

    let scoreData;

    try {
        const response = await fetch(`${API_URL}/api/check-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: currentQuiz, answers })
        });

        const result = await response.json();

        markQuizAnswers(currentQuizData, answers, result.results);

        scoreData = {
            score: result.score,
            total: result.total,
            percent: result.percent,
            date: new Date().toISOString()
        };

        const resultHTML = `
            <div class="card ${result.passed ? 'border-success' : 'border-warning'}">
                <div class="card-body text-center">
                    <h4><i class="fas fa-chart-bar"></i> Twój wynik: ${result.score}/${result.total} (${result.percent}%)</h4>
                    <p class="lead">${result.message}</p>
                    ${result.passed
                ? '<i class="fas fa-trophy display-6 text-warning"></i><p class="mt-2">🎉 Gratulacje!</p>'
                : '<i class="fas fa-redo display-6 text-info"></i><p class="mt-2">💪 Spróbuj jeszcze raz!</p>'}
                </div>
            </div>
        `;

        document.getElementById('quizResult').innerHTML = resultHTML;
        document.getElementById('checkQuizBtn').style.display = 'none';

    } catch (error) {
        markQuizAnswers(currentQuizData, answers);

        const { score, total, percent, passed } = calculateQuizScore(currentQuizData, answers);
        scoreData = { score, total, percent, date: new Date().toISOString() };

        const resultHTML = `
            <div class="card ${passed ? 'border-success' : 'border-warning'}">
                <div class="card-body text-center">
                    <h4><i class="fas fa-chart-bar"></i> Twój wynik: ${score}/${total} (${percent}%)</h4>
                    <p class="lead">${passed ? 'Zdane!' : 'Spróbuj jeszcze raz!'}</p>
                    ${passed
                ? '<i class="fas fa-trophy display-6 text-warning"></i><p class="mt-2">🎉 Gratulacje!</p>'
                : '<i class="fas fa-redo display-6 text-info"></i><p class="mt-2">💪 Spróbuj jeszcze raz!</p>'}
                </div>
            </div>
        `;

        document.getElementById('quizResult').innerHTML = resultHTML;
        document.getElementById('checkQuizBtn').style.display = 'none';
    }

    if ((scoreData.percent >= 70)) {
        saveQuizScore(currentQuiz, scoreData);
    }
}

function renderRanking(users) {
    let html = '<table class="ranking-table">';

    users.forEach((user, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;

        html += `
            <tr class="ranking-row">
                <td width="50" class="ranking-position">${medal}</td>
                <td class="ranking-user">
                    <i class="fas fa-user"></i> ${user.username}
                    ${user.id === currentUser.id ? '<span class="badge bg-info ms-2">Ty</span>' : ''}
                </td>
                <td width="100" class="text-end ranking-score">
                    ${user.score} pkt
                </td>
            </tr>
        `;
    });

    html += '</table>';
    document.getElementById('rankingContent').innerHTML = html;
}

function getDummyRanking() {
    return [
        { id: 1, username: 'MistrzKodu', score: 450 },
        { id: 2, username: 'PythonGuru', score: 420 },
        { id: 3, username: 'JSExpert', score: 380 },
        { id: currentUser.id || 4, username: currentUser.username || 'NowyUżytkownik', score: 150 }
    ].sort((a, b) => b.score - a.score);
}

async function loadRanking() {
    let ranking;

    try {
        const response = await fetch(`${API_URL}/api/ranking`);
        ranking = await response.json();
    } catch (error) {
        ranking = getDummyRanking();
    }

    renderRanking(ranking);
}

function renderCompletedLessons(lessons, color) {
    if (!lessons.length) return '<em class="text-muted">Brak ukończonych lekcji</em>';
    return lessons.map(id => `<span class="badge bg-${color} me-1 mb-1">Lekcja ${id}</span>`).join('');
}

function renderQuizResults(quizzes) {
    if (!quizzes.length) return '<em class="text-muted">Brak wyników quizów</em>';
    return quizzes.map(q => `
        <div class="small mb-1">
            <i class="fas fa-question-circle"></i> Quiz: ${q.score}/${q.total} (${q.percent}%) - 
            <small class="text-muted">${new Date(q.date).toLocaleDateString()}</small>
        </div>
    `).join('');
}

function setProgressBar(elementId, percent) {
    const bar = document.getElementById(elementId);
    bar.style.width = percent + '%';
    bar.textContent = percent + '%';
}

function updateDashboard() {
    const languages = [
        { key: 'python', color: 'success' },
        { key: 'javascript', color: 'warning' }
    ];

    languages.forEach(lang => {
        const lessons = progress[lang.key].completedLessons;
        const quizzes = progress[lang.key].quizScores;

        document.getElementById(`${lang.key}Completed`).innerHTML = renderCompletedLessons(lessons, lang.color);
        document.getElementById(`${lang.key}QuizResults`).innerHTML = renderQuizResults(quizzes);

        const percent = calculateProgress(lang.key);
        setProgressBar(`dashboard${lang.key.charAt(0).toUpperCase() + lang.key.slice(1)}Progress`, percent);
    });

    const totalLessons = progress.python.completedLessons.length + progress.javascript.completedLessons.length;
    const totalQuizzes = progress.python.quizScores.length + progress.javascript.quizScores.length;

    let avgScore = 0;
    if (totalQuizzes > 0) {
        const totalPercent = progress.python.quizScores.reduce((sum, q) => sum + q.percent, 0) +
            progress.javascript.quizScores.reduce((sum, q) => sum + q.percent, 0);
        avgScore = Math.round(totalPercent / totalQuizzes);
    }

    document.getElementById('totalLessons').textContent = totalLessons;
    document.getElementById('totalQuizzes').textContent = totalQuizzes;
    document.getElementById('avgScore').textContent = avgScore + '%';
}


function resetProgress() {
    if (confirm('Czy na pewno chcesz zresetować wszystkie postępy? To nie może być cofnięte.')) {
        progress = {
            python: { completedLessons: [], quizScores: [], lastActive: null },
            javascript: { completedLessons: [], quizScores: [], lastActive: null }
        };
        saveProgress();
        updateDashboard();
        updateLiveStats();
        loadPythonLessons();
        loadJSLessons();
        showMessage('Postępy zostały zresetowane!', 'info');
    }
}

function exportData() {
    const data = {
        user: currentUser,
        progress: progress,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learn_scripting_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showMessage('Dane zostały wyeksportowane!', 'success');
}

function importData() {
    document.getElementById('importFile').click();
}

document.getElementById('importFile').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data.progress) {
                progress = data.progress;
                saveProgress();

                if (data.user) {
                    currentUser = data.user;
                    localStorage.setItem('userId', currentUser.id);
                    localStorage.setItem('username', currentUser.username);
                    localStorage.setItem('userEmail', currentUser.email);
                    localStorage.setItem('isLoggedIn', currentUser.isLoggedIn ? 'true' : 'false');
                    checkLoginStatus();
                }

                updateDashboard();
                updateLiveStats();
                loadPythonLessons();
                loadJSLessons();

                showMessage('Dane zostały zaimportowane pomyślnie!', 'success');
            } else {
                showMessage('Nieprawidłowy format pliku!', 'error');
            }
        } catch (error) {
            showMessage('Błąd podczas importowania danych: ' + error.message, 'error');
        }


        event.target.value = '';
    };
    reader.readAsText(file);
});

function initDarkMode() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    const isDarkMode = localStorage.getItem('darkMode') === 'true';

    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        darkModeToggle.checked = true;
    }

    darkModeToggle.addEventListener('change', function () {
        if (this.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
            showMessage('Tryb ciemny włączony', 'info');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
            showMessage('Tryb jasny włączony', 'info');
        }
    });
}

function saveProgress() {
    localStorage.setItem('pythonProgress', JSON.stringify(progress.python));
    localStorage.setItem('javascriptProgress', JSON.stringify(progress.javascript));
}

function showMessage(text, type = 'info') {

    const existingMessages = document.querySelectorAll('.custom-alert');
    existingMessages.forEach(msg => msg.remove());


    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert alert-${type === 'error' ? 'danger' : type}`;
    alertDiv.innerHTML = `
        ${text}
        <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
    `;
    alertDiv.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        animation: slideIn 0.3s ease;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;

    document.body.appendChild(alertDiv);


    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .option-letter {
        font-weight: bold;
        margin-right: 10px;
        color: #6c757d;
    }
    
    .quiz-option.selected .option-letter {
        color: #007bff;
    }
    
    .stats-number {
        font-size: 2.5rem;
        font-weight: bold;
        color: #3776ab;
    }
`;
document.head.appendChild(style);

window.showTab = showTab;
window.showLoginForm = showLoginForm;
window.showRegisterForm = showRegisterForm;
window.showRegisterFormInModal = showRegisterFormInModal;
window.login = login;
window.register = register;
window.logout = logout;
window.showUserProfile = showUserProfile;
window.loadPythonLessons = loadPythonLessons;
window.loadPythonLesson = loadPythonLesson;
window.showPythonExercise = showPythonExercise;
window.checkPythonAnswer = checkPythonAnswer;
window.loadJSLessons = loadJSLessons;
window.loadJSLesson = loadJSLesson;
window.showJSExercise = showJSExercise;
window.checkJSAnswer = checkJSAnswer;
window.loadQuiz = loadQuiz;
window.selectAnswer = selectAnswer;
window.checkQuiz = checkQuiz;
window.updateDashboard = updateDashboard;
window.resetProgress = resetProgress;
window.exportData = exportData;
window.importData = importData;

checkLoginStatus();
checkServerStatus();
initDarkMode();
loadPythonLessons();
loadJSLessons();
updateLiveStats();
updateDashboard();
