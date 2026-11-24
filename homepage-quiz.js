// 2-minute property-match quiz: six quick questions, then a contact capture
// step. Submits as a lead (lead_type 'quiz') with the answers stored in
// search_criteria, same table as enquiries/valuations/saved searches, so it
// shows up in the admin Leads tab alongside everything else.
//
// Honesty note: this does NOT run any real matching logic against live
// inventory — it's a lead-capture funnel. The copy says so plainly ("an
// advisor will match you") rather than claiming the system already found
// specific matches, since it hasn't.
(function () {
  const card = document.getElementById('quizCard');
  if (!card) return;

  const QUESTIONS = [
    { key: 'need', label: 'What are you looking for?', options: ['Buy a ready home', 'Rent a home', 'Invest off-plan'] },
    { key: 'budget', label: "What's your budget?", options: ['Under AED 1M', 'AED 1M – 2M', 'AED 2M – 5M', 'AED 5M+'] },
    { key: 'bedrooms', label: 'How many bedrooms?', options: ['Studio', '1 bedroom', '2 bedrooms', '3+ bedrooms'] },
    { key: 'areaType', label: 'Which kind of area suits you?', options: ['Waterfront', 'City centre', 'Family community', 'Open to suggestions'] },
    { key: 'purpose', label: "What's it for?", options: ['To live in', 'Rental income', 'Golden Visa', 'Holiday home'] },
    { key: 'timeline', label: 'When do you want to move forward?', options: ['Within a month', 'In 1–3 months', 'In 3–6 months', 'Just exploring'] }
  ];

  let step = 0;
  const answers = {};

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function render() {
    const progressPct = Math.round((Math.min(step, QUESTIONS.length) / QUESTIONS.length) * 100);
    const progressHtml = `<div class="quiz-progress-track"><div class="quiz-progress-bar" style="width:${progressPct}%"></div></div>`;

    if (step < QUESTIONS.length) {
      const q = QUESTIONS[step];
      card.innerHTML = `
        ${progressHtml}
        <p class="quiz-step-label">Question ${step + 1} of ${QUESTIONS.length}</p>
        <h3 class="quiz-question">${esc(q.label)}</h3>
        <div class="quiz-options">
          ${q.options.map(o => `<button type="button" class="quiz-opt" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}
        </div>`;
      card.querySelectorAll('.quiz-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          answers[q.key] = btn.dataset.opt;
          step++;
          render();
        });
      });
    } else {
      card.innerHTML = `
        ${progressHtml}
        <p class="quiz-step-label">Last step</p>
        <h3 class="quiz-result-heading">Great — we've got what we need</h3>
        <p class="quiz-result-sub">Tell us where to send your shortlist and a HomesPartner advisor will match you to current listings and follow up on WhatsApp.</p>
        <form class="quiz-form" id="quizContactForm">
          <label>Your name <input type="text" id="quiz_name" autocomplete="name" required></label>
          <label>WhatsApp number <input type="tel" id="quiz_phone" autocomplete="tel" placeholder="+971 or +44" required></label>
          <label>Email <input type="email" id="quiz_email" autocomplete="email"></label>
          <button type="submit" class="btn btn-navy" id="quizSubmitBtn">Get My Shortlist</button>
          <button type="button" class="quiz-restart" id="quizRestartBtn">Start again</button>
        </form>
        <p class="quiz-note" id="quizNote"></p>`;

      document.getElementById('quizRestartBtn').addEventListener('click', () => {
        step = 0;
        Object.keys(answers).forEach(k => delete answers[k]);
        render();
      });

      document.getElementById('quizContactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const note = document.getElementById('quizNote');
        const submitBtn = document.getElementById('quizSubmitBtn');
        note.textContent = '';
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
        try {
          if (!window.SUPABASE_URL || !window.supabase) throw new Error('not configured');
          const client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
          const { error } = await client.from('leads').insert({
            lead_type: 'quiz',
            name: document.getElementById('quiz_name').value,
            phone: document.getElementById('quiz_phone').value,
            email: document.getElementById('quiz_email').value,
            search_criteria: answers
          });
          if (error) throw error;
          showSuccess();
        } catch (err) {
          note.textContent = 'Something went wrong — please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Get My Shortlist';
        }
      });
    }
  }

  function showSuccess() {
    card.innerHTML = `
      <div class="quiz-success">
        <div class="quiz-success-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"></path></svg>
        </div>
        <h3 class="quiz-result-heading">Thanks — we've got your answers</h3>
        <p class="quiz-result-sub">A HomesPartner advisor will review them and WhatsApp you a shortlist shortly.</p>
        <button type="button" class="quiz-restart" id="quizRestartBtn2" style="margin:0 auto;text-align:center;">Start a new search</button>
      </div>`;
    document.getElementById('quizRestartBtn2').addEventListener('click', () => {
      step = 0;
      Object.keys(answers).forEach(k => delete answers[k]);
      render();
    });
  }

  render();
})();
