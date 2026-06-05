/* ============================================================
   WALKERS WOOD — LOG CALCULATOR (IKEA Effect)
   Homepage interactive configurator
   ============================================================ */
(function() {
  'use strict';
  const calc = document.getElementById('logCalc');
  if (!calc) return;

  const steps = calc.querySelectorAll('.calc-step');
  const resultEl = document.getElementById('calcResult');
  let scores = [];
  let currentStep = 0;

  // Recommendations by total score
  const recs = {
    3:  { vol: '1m³',  price: '£190',    link: '/firewood.html', msg: 'Perfect for occasional use — keeps your fire going for a good few weeks of cosy evenings' },
    4:  { vol: '1m³',  price: '£190',    link: '/firewood.html', msg: 'Perfect for occasional use — keeps your fire going for a good few weeks of cosy evenings' },
    5:  { vol: '2m³',  price: '£361',    link: '/firewood.html', msg: 'Our most popular choice. Enough to burn through autumn and well into winter' },
    6:  { vol: '3m³',  price: '£542',    link: '/firewood.html', msg: 'Great value for regular burners. Less than £11 a week to keep your home warm all season' },
    7:  { vol: '4m³',  price: '£722',    link: '/firewood.html', msg: 'The ultimate winter supply. One delivery, sorted for the season' },
    8:  { vol: '6m³',  price: '£1,083',  link: '/firewood.html', msg: 'Maximum value for heavy burners. Complete peace of mind all year' },
    9:  { vol: '6m³',  price: '£1,083',  link: '/firewood.html', msg: 'Maximum value for heavy burners. Complete peace of mind all year' },
  };

  steps.forEach((step, i) => {
    step.querySelectorAll('.calc-opt').forEach(btn => {
      btn.addEventListener('click', function() {
        // Mark selected
        step.querySelectorAll('.calc-opt').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');

        scores[i] = parseInt(this.dataset.score);

        // Next step or show result
        setTimeout(() => {
          step.classList.remove('active');
          if (i < steps.length - 1) {
            steps[i + 1].classList.add('active');
            currentStep = i + 1;
          } else {
            showResult();
          }
        }, 300);
      });
    });
  });

  function showResult() {
    const total = scores.reduce((a, b) => a + b, 0);
    const clamped = Math.max(3, Math.min(9, total));
    const rec = recs[clamped];

    resultEl.innerHTML = `
      <div class="calc-result-inner">
        <div class="calc-result-badge">${rec.vol}</div>
        <h3>Based on your answers, we'd recommend <strong>${rec.vol}</strong></h3>
        <p>${rec.msg}</p>
        <div class="calc-result-price">${rec.price} <small>inc VAT</small></div>
        <a href="${rec.link}" class="btn-primary">Order my ${rec.vol} →</a>
        <button class="calc-restart" id="calcRestart">Start again</button>
      </div>
    `;
    resultEl.style.display = 'block';

    document.getElementById('calcRestart').addEventListener('click', () => {
      scores = [];
      currentStep = 0;
      resultEl.style.display = 'none';
      resultEl.innerHTML = '';
      steps.forEach((s, j) => {
        s.classList.toggle('active', j === 0);
        s.querySelectorAll('.calc-opt').forEach(b => b.classList.remove('selected'));
      });
    });
  }
})();
