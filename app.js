/**
 * ECL English Level Test — Application Logic
 * Single Page App with Full Exam & Simulated Exam modes
 */

/* ══════════════════════════════════════════════════════
   STATE
══════════════════════════════════════════════════════ */
const state = {
  mode: null,            // 'full' | 'simulated'
  questions: [],         // questions for current session
  currentIndex: 0,       // 0-based index of current question
  answers: {},           // { questionId: { selected, checked } }
  examStarted: false,
};

/* ══════════════════════════════════════════════════════
   MENU
══════════════════════════════════════════════════════ */
function openMenu() {
  document.getElementById('side-menu').classList.add('open');
  document.getElementById('menu-overlay').classList.add('active');
  document.getElementById('burger-btn').setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  document.getElementById('side-menu').classList.remove('open');
  document.getElementById('menu-overlay').classList.remove('active');
  document.getElementById('burger-btn').setAttribute('aria-expanded', 'false');
}

/* ══════════════════════════════════════════════════════
   EXAM START
══════════════════════════════════════════════════════ */
function startExam(mode) {
  closeMenu();

  state.mode = mode;
  state.answers = {};
  state.currentIndex = 0;
  state.examStarted = true;

  if (mode === 'full') {
    // All questions in PDF order
    state.questions = [...ALL_QUESTIONS];
    document.getElementById('exam-mode-label').textContent = 'Full Exam';
  } else {
    // Simulated: 100 random questions, graduated by difficulty
    // We divide the 379 questions into 3 tiers and pick proportionally
    state.questions = buildSimulatedExam();
    document.getElementById('exam-mode-label').textContent = 'Simulated Exam';
  }

  // Show exam screen
  document.getElementById('welcome-screen').classList.add('hidden');
  document.getElementById('exam-screen').classList.remove('hidden');

  buildNavigator();
  renderQuestion();
  updateProgressDisplay();
}

/**
 * Build 100-question simulated exam.
 * Strategy: shuffle and pick to simulate graduating difficulty.
 * Questions 1–120   → "Easy"
 * Questions 121–260 → "Medium"
 * Questions 261–379 → "Hard"
 * Pick 40 easy + 35 medium + 25 hard, then sort by original id.
 */
function buildSimulatedExam() {
  const all = [...ALL_QUESTIONS];

  const easy   = shuffle(all.filter(q => q.id <= 120));
  const medium = shuffle(all.filter(q => q.id > 120 && q.id <= 260));
  const hard   = shuffle(all.filter(q => q.id > 260));

  const picked = [
    ...easy.slice(0, 40),
    ...medium.slice(0, 35),
    ...hard.slice(0, 25),
  ];

  // Sort by original id to maintain natural difficulty gradient
  picked.sort((a, b) => a.id - b.id);

  return picked;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════
   NAVIGATOR SIDEBAR
══════════════════════════════════════════════════════ */
function buildNavigator() {
  const grid = document.getElementById('navigator-grid');
  grid.innerHTML = '';

  state.questions.forEach((q, idx) => {
    const box = document.createElement('button');
    box.className = 'nav-box';
    box.id = `nav-${idx}`;
    box.textContent = idx + 1;
    box.setAttribute('aria-label', `Go to question ${idx + 1}`);
    box.onclick = () => jumpToQuestion(idx);
    grid.appendChild(box);
  });

  document.getElementById('nav-count').textContent = state.questions.length;
  updateNavigator();
}

function updateNavigator() {
  state.questions.forEach((q, idx) => {
    const box = document.getElementById(`nav-${idx}`);
    if (!box) return;

    box.className = 'nav-box';

    const ans = state.answers[q.id];
    if (ans && ans.checked) box.classList.add('answered');
    if (idx === state.currentIndex) box.classList.add('current');
  });

  // Scroll current nav box into view
  const currentBox = document.getElementById(`nav-${state.currentIndex}`);
  if (currentBox) {
    currentBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function jumpToQuestion(idx) {
  state.currentIndex = idx;
  renderQuestion();
  updateProgressDisplay();
  updateNavigator();
}

/* ══════════════════════════════════════════════════════
   RENDER QUESTION
══════════════════════════════════════════════════════ */
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  const ans = state.answers[q.id] || {};
  const isLast = state.currentIndex === state.questions.length - 1;
  const isChecked = !!(ans.checked);

  // Header
  document.getElementById('question-number-badge').textContent =
    `Question ${state.currentIndex + 1}`;

  // Question text
  document.getElementById('question-text').textContent = q.question;

  // Options
  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';

  const letters = ['a', 'b', 'c', 'd'];
  letters.forEach(letter => {
    if (!q.options[letter]) return;

    const item = document.createElement('div');
    item.className = 'option-item';
    item.id = `opt-${letter}`;
    item.setAttribute('role', 'radio');
    item.setAttribute('aria-checked', ans.selected === letter ? 'true' : 'false');
    item.setAttribute('tabindex', '0');

    // Apply states
    if (isChecked) {
      item.classList.add('locked');
      if (letter === q.correct) {
        item.classList.add('correct-answer');
      } else if (letter === ans.selected && ans.selected !== q.correct) {
        item.classList.add('wrong-answer');
      }
    } else if (ans.selected === letter) {
      item.classList.add('selected');
    }

    // Letter badge
    const letterEl = document.createElement('div');
    letterEl.className = 'option-letter';
    letterEl.textContent = letter;

    // Text
    const textEl = document.createElement('div');
    textEl.className = 'option-text';
    textEl.textContent = q.options[letter];

    // Icon (check/x)
    const iconEl = document.createElement('div');
    iconEl.className = 'option-icon';
    if (isChecked) {
      if (letter === q.correct) {
        iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      } else if (letter === ans.selected) {
        iconEl.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      }
    }

    item.appendChild(letterEl);
    item.appendChild(textEl);
    item.appendChild(iconEl);

    if (!isChecked) {
      item.onclick = () => selectOption(letter);
      item.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectOption(letter); }
      };
    }

    optionsList.appendChild(item);
  });

  // Action buttons
  const checkBtn = document.getElementById('check-btn');
  const nextBtn  = document.getElementById('next-btn');
  const endBtn   = document.getElementById('end-btn');

  checkBtn.disabled = !ans.selected || isChecked;

  // Show End Exam button only on last question
  if (isLast) {
    endBtn.classList.remove('hidden');
    nextBtn.classList.add('hidden');
  } else {
    endBtn.classList.add('hidden');
    nextBtn.classList.remove('hidden');
  }

  // Feedback
  renderFeedback(q, ans);
}

function renderFeedback(q, ans) {
  const fb = document.getElementById('answer-feedback');
  fb.className = 'answer-feedback';
  fb.classList.add('hidden');

  if (!ans || !ans.checked) return;

  fb.classList.remove('hidden');

  const isCorrect = ans.selected === q.correct;
  const correctText = q.options[q.correct];

  if (isCorrect) {
    fb.classList.add('correct-fb');
    fb.innerHTML = `<span class="fb-label">✓ Correct!</span> "${correctText}" is the right answer.`;
  } else {
    fb.classList.add('wrong-fb');
    fb.innerHTML = `<span class="fb-label">✗ Incorrect.</span> The correct answer is: <strong>"${correctText}"</strong>`;
  }
}

/* ══════════════════════════════════════════════════════
   SELECT OPTION
══════════════════════════════════════════════════════ */
function selectOption(letter) {
  const q = state.questions[state.currentIndex];
  const ans = state.answers[q.id] || {};

  if (ans.checked) return; // Locked after checking

  // Toggle: if same letter, deselect
  if (ans.selected === letter) {
    state.answers[q.id] = { ...ans, selected: null };
  } else {
    state.answers[q.id] = { ...ans, selected: letter };
  }

  // Re-render options only
  renderQuestion();
}

/* ══════════════════════════════════════════════════════
   CHECK ANSWER
══════════════════════════════════════════════════════ */
function checkAnswer() {
  const q = state.questions[state.currentIndex];
  const ans = state.answers[q.id];

  if (!ans || !ans.selected) return;
  if (ans.checked) return;

  state.answers[q.id] = { ...ans, checked: true };

  renderQuestion();
  updateNavigator();
}

/* ══════════════════════════════════════════════════════
   NEXT QUESTION
══════════════════════════════════════════════════════ */
function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
    updateProgressDisplay();
    updateNavigator();
    // Smooth scroll to top on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ══════════════════════════════════════════════════════
   PROGRESS DISPLAY
══════════════════════════════════════════════════════ */
function updateProgressDisplay() {
  document.getElementById('progress-text').textContent =
    `Q ${state.currentIndex + 1} / ${state.questions.length}`;
}

/* ══════════════════════════════════════════════════════
   END EXAM
══════════════════════════════════════════════════════ */
function endExam() {
  // Count stats
  const total = state.questions.length;
  const answered = Object.values(state.answers).filter(a => a.checked).length;
  const skipped = total - answered;

  if (skipped > 0) {
    Swal.fire({
      title: 'Unanswered Questions',
      html: `You still have <strong>${skipped}</strong> unanswered question${skipped > 1 ? 's' : ''}.<br>
             Do you want to end the exam anyway?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'End Exam',
      cancelButtonText: 'Go Back',
      confirmButtonColor: '#D97B3A',
      cancelButtonColor: '#8B6F4E',
      reverseButtons: true,
    }).then(result => {
      if (result.isConfirmed) showResults();
    });
  } else {
    showResults();
  }
}

/* ══════════════════════════════════════════════════════
   RESULTS
══════════════════════════════════════════════════════ */
function showResults() {
  const total = state.questions.length;
  let correct = 0;
  let answered = 0;

  state.questions.forEach(q => {
    const ans = state.answers[q.id];
    if (ans && ans.checked) {
      answered++;
      if (ans.selected === q.correct) correct++;
    }
  });

  const unanswered = total - answered;
  const wrong = answered - correct;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Grade label
  let grade, gradeColor;
  if (pct >= 90)      { grade = 'Excellent';   gradeColor = '#2A6B3C'; }
  else if (pct >= 75) { grade = 'Good';        gradeColor = '#4CAF72'; }
  else if (pct >= 60) { grade = 'Average';     gradeColor = '#D97B3A'; }
  else if (pct >= 45) { grade = 'Below Avg';   gradeColor = '#E57373'; }
  else                { grade = 'Needs Work';  gradeColor = '#8B2020'; }

  // Donut SVG
  const radius = 54;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  const donutSVG = `
    <svg width="140" height="140" viewBox="0 0 140 140" style="margin-bottom:12px;">
      <circle cx="70" cy="70" r="${radius}" fill="none" stroke="#EDE3D0" stroke-width="12"/>
      <circle cx="70" cy="70" r="${radius}" fill="none" stroke="${gradeColor}" stroke-width="12"
        stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${circ * 0.25}"
        stroke-linecap="round" transform="rotate(-90 70 70)"
        style="transition: stroke-dasharray 1s ease;"/>
      <text x="70" y="65" text-anchor="middle" font-size="22" font-weight="700" fill="${gradeColor}" font-family="Merriweather, serif">${pct}%</text>
      <text x="70" y="83" text-anchor="middle" font-size="11" fill="#9E8A72" font-family="Inter, sans-serif">${grade}</text>
    </svg>`;

  Swal.fire({
    title: 'Exam Complete!',
    html: `
      <div style="font-family:'Inter',sans-serif; text-align:center;">
        ${donutSVG}
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-top:4px;">
          <div style="background:#EBF7ED;border-radius:10px;padding:12px 8px;">
            <div style="font-size:1.4rem;font-weight:700;color:#2A6B3C;">${correct}</div>
            <div style="font-size:0.72rem;color:#6B5A44;margin-top:2px;">Correct</div>
          </div>
          <div style="background:#FDECEA;border-radius:10px;padding:12px 8px;">
            <div style="font-size:1.4rem;font-weight:700;color:#8B2020;">${wrong}</div>
            <div style="font-size:0.72rem;color:#6B5A44;margin-top:2px;">Wrong</div>
          </div>
          <div style="background:#F5EFE3;border-radius:10px;padding:12px 8px;">
            <div style="font-size:1.4rem;font-weight:700;color:#8B6F4E;">${unanswered}</div>
            <div style="font-size:0.72rem;color:#6B5A44;margin-top:2px;">Skipped</div>
          </div>
        </div>
        <p style="margin-top:16px;font-size:0.83rem;color:#9E8A72;">
          ${total} questions total &nbsp;|&nbsp; ${state.mode === 'full' ? 'Full Exam' : 'Simulated Exam'}
        </p>
      </div>`,
    showCancelButton: true,
    confirmButtonText: '🔄 Restart Exam',
    cancelButtonText: '📋 Review Answers',
    confirmButtonColor: '#D97B3A',
    cancelButtonColor: '#8B6F4E',
    reverseButtons: false,
    allowOutsideClick: false,
    customClass: {
      popup: 'swal-results-popup',
    }
  }).then(result => {
    if (result.isConfirmed) {
      startExam(state.mode);
    }
    // Cancel = stay on exam screen to review
  });
}

/* ══════════════════════════════════════════════════════
   KEYBOARD NAVIGATION
══════════════════════════════════════════════════════ */
document.addEventListener('keydown', (e) => {
  if (!state.examStarted) return;

  switch (e.key) {
    case '1': case 'a': case 'A': selectOption('a'); break;
    case '2': case 'b': case 'B': selectOption('b'); break;
    case '3': case 'c': case 'C': selectOption('c'); break;
    case '4': case 'd': case 'D': selectOption('d'); break;
    case 'Enter': {
      const q = state.questions[state.currentIndex];
      const ans = state.answers[q.id];
      if (ans && ans.selected && !ans.checked) {
        checkAnswer();
      } else if (ans && ans.checked && state.currentIndex < state.questions.length - 1) {
        nextQuestion();
      }
      break;
    }
    case 'ArrowRight': case 'ArrowDown': {
      if (e.altKey) nextQuestion();
      break;
    }
    case 'Escape': closeMenu(); break;
  }
});
