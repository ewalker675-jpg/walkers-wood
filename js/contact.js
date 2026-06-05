/* =================================================================
   WALKERS WOOD — CONTACT FORM JS
   Handles form validation and mailto submission.
   ================================================================= */

(function () {
  'use strict';

  const btn = document.getElementById('cfBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const fn = document.getElementById('cfFn').value.trim();
    const ln = document.getElementById('cfLn').value.trim();
    const em = document.getElementById('cfEm').value.trim();
    const sb = document.getElementById('cfSb').value;
    const ms = document.getElementById('cfMs').value.trim();
    const ph = document.getElementById('cfPh').value.trim();

    // Validate required fields
    if (!fn || !ln || !em || !sb || !ms) {
      alert('Please fill in all required fields.');
      return;
    }
    if (!em.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    // Build email body
    const body = [
      'New enquiry — Walkers Wood website',
      '---',
      'Name: ' + fn + ' ' + ln,
      'Email: ' + em,
      ph ? 'Phone: ' + ph : '',
      'Enquiry type: ' + sb,
      '---',
      ms
    ].filter(Boolean).join('\n');

    // Open mailto
    window.location.href = 'mailto:edwardwalkerfarms@gmail.com?subject=' +
      encodeURIComponent('Website enquiry — ' + sb + ' — ' + fn + ' ' + ln) +
      '&body=' + encodeURIComponent(body);

    // Show success after short delay
    setTimeout(() => {
      const success = document.getElementById('cfSuccess');
      if (success) success.style.display = 'block';
    }, 800);
  });

})();
