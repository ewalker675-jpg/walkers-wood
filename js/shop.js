/* =================================================================
   WALKERS WOOD — SHOP JS
   Product selection, postcode calculator, order summary, Stripe checkout.
   Matched to firewood.html element IDs.
   ================================================================= */

(function () {
  'use strict';

  // ========== ED: ADD FULLY BOOKED DATES HERE ==========
  const BLOCKED_DATES = [
    // 'YYYY-MM-DD',
     '2026-06-05',
     '2026-06-06',
     '2026-06-07',
     '2026-06-08',
  ];

  // ========== STRIPE CONFIG ==========
  // Replace with your live publishable key when ready
  const STRIPE_PK = 'pk_live_51TdqJX2UUw1giO878rJUxh6VtZcgsIOjwdEHdno7fyfpCUwOZrgTgraYcnvS7C20yxngn0h3OwB2m3uNY3sg70ec004hVAakK6';

  // ── CONSTANTS ──
  const BASE_POSTCODE = 'WR66DT';
  const FREE_MILES = 8;
  const PPM = 1.20;
  const MAX_MILES = 20;

  // ── STATE ──
  let selected = null;
  let delCharge = null;
  let delMiles = null;
  let delBlocked = false;

  // ── HELPERS ──
  const $ = (id) => document.getElementById(id);
  const getQty = () => selected && selected.id === 'k' ? (parseInt($('kindlingQty')?.value) || 1) : 1;
  const getStack = () => selected && selected.id !== 'k' && $('stackingToggle')?.checked;

  // ── PRODUCT SELECTION ──
  document.querySelectorAll('.card[data-id]').forEach((card) => {
    const btn = card.querySelector('.sel-btn');
    if (!btn) return;

    const handler = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.card[data-id]').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      selected = {
        id: card.dataset.id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price),
        stacking: parseFloat(card.dataset.stacking),
      };
      const kr = $('kindlingRow');
      if (kr) kr.style.display = selected.id === 'k' ? 'block' : 'none';
      updateBar();
      updateSummary();
    };

    btn.addEventListener('click', handler);
    card.addEventListener('click', handler);
  });

  // Stacking checkbox
  const stackEl = $('stackingToggle');
  if (stackEl) stackEl.addEventListener('change', () => { updateSummary(); updateBar(); });

  // Kindling quantity
  const kindQty = $('kindlingQty');
  if (kindQty) kindQty.addEventListener('input', () => { updateSummary(); updateBar(); });

  // ── CHECKOUT BAR ──
  function updateBar() {
    const btn = $('openCheckout');
    const summ = $('orderSummaryText');
    if (!btn || !summ) return;
    if (!selected) {
      summ.innerHTML = 'Select a product above to get started';
      btn.disabled = true;
      return;
    }
    let label = selected.name;
    if (selected.id === 'k') label += ' × ' + getQty();
    if (getStack()) label += ' + stacking';
    const total = calcTotal(false);
    summ.innerHTML = '<strong>' + label + '</strong> — £' + total.toFixed(2) + ' + delivery';
    btn.disabled = false;
  }

  function calcTotal(inclDel) {
    if (!selected) return 0;
    const wood = selected.id === 'k' ? selected.price * getQty() : selected.price;
    const stack = getStack() ? selected.stacking : 0;
    const del = inclDel && delCharge !== null && !delBlocked ? delCharge : 0;
    return wood + stack + del;
  }

  // ── MODAL ──
  const modal = $('checkoutModal');
  const openBtn = $('openCheckout');
  const closeBtn = $('closeModal');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (!selected || !modal) return;
      updateSummary();
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Set min date to tomorrow
      const dateEl = $('deliveryDate');
      if (dateEl) {
        const tm = new Date();
        tm.setDate(tm.getDate() + 1);
        dateEl.min = tm.toISOString().split('T')[0];
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  function closeModal() {
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── ORDER SUMMARY ──
  function updateSummary() {
    if (!selected) return;
    const isK = selected.id === 'k';
    const qty = getQty();
    const wood = isK ? selected.price * qty : selected.price;
    const stack = getStack() ? selected.stacking : 0;
    const dc = delCharge !== null && !delBlocked ? delCharge : null;

    // Product row
    const prodRow = $('sumProduct');
    if (prodRow) {
      const spans = prodRow.querySelectorAll('span');
      if (spans[0]) spans[0].textContent = isK ? selected.name + ' × ' + qty : selected.name;
      if (spans[1]) spans[1].textContent = '£' + wood.toFixed(2);
    }

    // Stacking row
    const stackRow = $('sumStacking');
    if (stackRow) {
      if (getStack() && !isK) {
        stackRow.style.display = 'flex';
        const spans = stackRow.querySelectorAll('span');
        if (spans[1]) spans[1].textContent = '£' + stack.toFixed(2);
      } else {
        stackRow.style.display = 'none';
      }
    }

    // Kindling row
    const kindRow = $('sumKindling');
    if (kindRow) {
      kindRow.style.display = isK && qty > 1 ? 'flex' : 'none';
    }

    // Delivery row
    const delRow = $('sumDelivery');
    if (delRow) {
      const spans = delRow.querySelectorAll('span');
      if (spans[1]) {
        if (dc !== null) {
          spans[1].textContent = dc === 0 ? 'FREE' : '£' + dc.toFixed(2);
          spans[1].style.color = dc === 0 ? 'var(--green)' : '';
          spans[1].style.fontWeight = dc === 0 ? '600' : '';
        } else {
          spans[1].textContent = 'Enter postcode below';
          spans[1].style.color = '';
          spans[1].style.fontWeight = '';
        }
      }
    }

    // Total row
    const totalRow = $('sumTotal');
    if (totalRow) {
      const spans = totalRow.querySelectorAll('span');
      if (spans[1]) {
        if (dc !== null) {
          spans[1].textContent = '£' + (wood + stack + dc).toFixed(2) + ' inc VAT';
        } else {
          spans[1].textContent = '£' + (wood + stack).toFixed(2) + ' + delivery';
        }
      }
    }

    // Enable/disable pay button
    const payBtn = $('stripePayBtn');
    if (payBtn) {
      payBtn.disabled = delCharge === null || delBlocked;
    }
  }

  // ── POSTCODE CHECKER ──
  const checkBtn = $('checkPostcode');
  const pcInput = $('postcode');

  if (checkBtn) checkBtn.addEventListener('click', checkPostcode);
  if (pcInput) {
    pcInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') checkPostcode(); });
    pcInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
  }

  async function checkPostcode() {
    if (!pcInput) return;
    const raw = pcInput.value.trim().replace(/\s/g, '').toUpperCase();
    if (!raw) return;

    if (checkBtn) {
      checkBtn.disabled = true;
      checkBtn.innerHTML = '<span class="spinner"></span>Checking…';
    }

    // Hide all result badges
    ['delFree', 'delPaid', 'delBlocked', 'delError'].forEach(id => {
      const el = $(id);
      if (el) el.style.display = 'none';
    });
    const msgEl = $('delMsg');
    if (msgEl) msgEl.style.display = 'none';

    const dateSection = $('dateSection');
    const detailsSection = $('detailsSection');
    if (dateSection) dateSection.classList.remove('visible');
    if (detailsSection) detailsSection.classList.remove('visible');

    try {
      const [br, cr] = await Promise.all([
        fetch('https://api.postcodes.io/postcodes/' + BASE_POSTCODE),
        fetch('https://api.postcodes.io/postcodes/' + raw),
      ]);
      const bd = await br.json();
      const cd = await cr.json();

      if (bd.status !== 200 || cd.status !== 200) throw new Error('invalid');

      const mi = Math.round(
        haversine(bd.result.latitude, bd.result.longitude, cd.result.latitude, cd.result.longitude) * 10
      ) / 10;
      delMiles = mi;

      if (mi > MAX_MILES) {
        delBlocked = true; delCharge = null;
        const el = $('delBlocked');
        if (el) {
          el.textContent = 'You\'re ' + mi + ' miles away — outside our ' + MAX_MILES + '-mile delivery area. Please contact Ed on 07583 338879 to discuss.';
          el.style.display = 'block';
        }
      } else if (mi <= FREE_MILES) {
        delBlocked = false; delCharge = 0;
        const el = $('delFree');
        if (el) {
          el.innerHTML = '<strong>Free delivery!</strong> You\'re ' + mi + ' miles away — within our free delivery zone.';
          el.style.display = 'block';
        }
        if (dateSection) dateSection.classList.add('visible');
        if (detailsSection) detailsSection.classList.add('visible');
      } else {
        delBlocked = false;
        const ch = Math.round((mi - FREE_MILES) * PPM * 100) / 100;
        delCharge = ch;
        const el = $('delPaid');
        if (el) {
          const amountEl = $('delPaidAmount');
          if (amountEl) amountEl.textContent = '£' + ch.toFixed(2);
          el.innerHTML = 'You\'re ' + mi + ' miles away. Delivery: <strong>£' + ch.toFixed(2) + '</strong> (' + (mi - FREE_MILES).toFixed(1) + ' miles beyond free zone × £1.20/mile)';
          el.style.display = 'block';
        }
        if (msgEl) {
          msgEl.textContent = 'Free delivery within 8 miles of WR6 6DT. Beyond that, £1.20/mile up to 20 miles.';
          msgEl.style.display = 'block';
        }
        if (dateSection) dateSection.classList.add('visible');
        if (detailsSection) detailsSection.classList.add('visible');
      }

      updateSummary();
    } catch (e) {
      delBlocked = false; delCharge = null;
      const el = $('delError');
      if (el) {
        el.textContent = 'We couldn\'t find that postcode — please check and try again.';
        el.style.display = 'block';
      }
    } finally {
      if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'Check'; }
    }
  }

  // ── HAVERSINE ──
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const toR = (d) => d * Math.PI / 180;
    const a = Math.sin(toR(lat2 - lat1) / 2) ** 2 +
      Math.cos(toR(lat1)) * Math.cos(toR(lat2)) *
      Math.sin(toR(lon2 - lon1) / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ── BLOCKED DATE CHECK ──
  const dateEl = $('deliveryDate');
  if (dateEl) {
    dateEl.addEventListener('input', function () {
      if (BLOCKED_DATES.includes(this.value)) {
        alert('Sorry, that date is fully booked. Please choose another.');
        this.value = '';
      }
    });
  }

  // ── STRIPE CHECKOUT ──
  const payBtn = $('stripePayBtn');
  if (payBtn) {
    payBtn.addEventListener('click', async () => {
      const name = $('custName')?.value.trim();
      const email = $('custEmail')?.value.trim();
      const phone = $('custPhone')?.value.trim();
      const address = $('custAddress')?.value.trim();
      const delivDate = $('deliveryDate')?.value;
      const postcode = $('postcode')?.value.trim();
      const w3w = $('custW3W')?.value.trim() || '';
      const dropNote = $('custNotes')?.value.trim() || '';

      if (!name || !email || !phone || !address || !delivDate) {
        alert('Please fill in all required fields.');
        return;
      }
      if (!email.includes('@')) {
        alert('Please enter a valid email address.');
        return;
      }
      if (delBlocked || delCharge === null) {
        alert('Please check your postcode first.');
        return;
      }

      const isK = selected.id === 'k';
      const qty = getQty();
      const wood = isK ? selected.price * qty : selected.price;
      const stack = getStack() ? selected.stacking : 0;
      const total = wood + stack + (delCharge || 0);

      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="spinner"></span>Redirecting to payment…';

      try {
        const res = await fetch('/.netlify/functions/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: isK ? selected.name + ' × ' + qty : selected.name,
            productPrice: wood,
            stacking: getStack() ? stack : 0,
            delivery: delCharge,
            deliveryMiles: delMiles,
            total: total,
            customer: { name, email, phone, address, postcode, deliveryDate: delivDate, w3w, dropNote },
          }),
        });

        if (!res.ok) throw new Error('Failed');
        const { url } = await res.json();
        window.location.href = url;
      } catch (err) {
        alert('Sorry, there was a problem setting up payment. Please try again or call Ed on 07583 338879.');
        payBtn.disabled = false;
        payBtn.textContent = 'Pay with Stripe';
      }
    });
  }

})();
