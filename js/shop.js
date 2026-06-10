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
  const FREE_MILES = 10;
  const PPM = 2.00;
  const MAX_MILES = 20;
  const KINDLING_IN_STOCK = (typeof window !== 'undefined' && window.SITE_CONFIG && window.SITE_CONFIG.kindlingInStock !== undefined) ? window.SITE_CONFIG.kindlingInStock : false;

  // ── STATE ──
  let selected = null;
  let delCharge = null;
  let delMiles = null;
  let delBlocked = false;
  let kindlingBags = 0;
  let kindlingModalShown = false;

  // ── HELPERS ──
  const $ = (id) => document.getElementById(id);
  const getStack = () => selected && $('stackingToggle')?.checked;

  // ── PERSISTENT BASKET ──
  function saveBasket() {
    if (!selected) {
      localStorage.removeItem('ww_basket');
      window.dispatchEvent(new Event('cartUpdated'));
      return;
    }
    const basket = {
      selectedProduct: {
        id: selected.id,
        name: selected.name,
        price: selected.price,
        stacking: selected.stacking
      },
      stacking: getStack(),
      kindlingBags: kindlingBags,
      postcode: $('postcode')?.value.trim() || '',
      deliveryMiles: delMiles,
      deliveryCharge: delCharge,
      deliveryDate: dateEl?.value || '',
      customer: {
        name: $('custName')?.value.trim() || '',
        email: $('custEmail')?.value.trim() || '',
        phone: $('custPhone')?.value.trim() || '',
        address: $('custAddress')?.value.trim() || '',
        w3w: $('custW3W')?.value.trim() || '',
        notes: $('custNotes')?.value.trim() || ''
      }
    };
    localStorage.setItem('ww_basket', JSON.stringify(basket));
    window.dispatchEvent(new Event('cartUpdated'));
  }

  async function loadBasket() {
    const raw = localStorage.getItem('ww_basket');
    if (!raw) return;
    try {
      const basket = JSON.parse(raw);
      if (basket && basket.selectedProduct) {
        selected = {
          id: basket.selectedProduct.id,
          name: basket.selectedProduct.name,
          price: basket.selectedProduct.price,
          stacking: basket.selectedProduct.stacking
        };
        kindlingBags = basket.kindlingBags || 0;
        if (!KINDLING_IN_STOCK) kindlingBags = 0;
        
        document.querySelectorAll('.card[data-id]').forEach(card => {
          if (card.dataset.id === selected.id) {
            card.classList.add('selected');
          } else {
            card.classList.remove('selected');
          }
        });

        const stackEl = $('stackingToggle');
        if (stackEl) {
          stackEl.checked = !!basket.stacking;
        }

        if (basket.postcode) {
          const pcInput = $('postcode');
          if (pcInput) pcInput.value = basket.postcode;
          delMiles = basket.deliveryMiles;
          delCharge = basket.deliveryCharge;
          
          await checkPostcode();
        }

        if (basket.deliveryDate) {
          const dateEl = $('deliveryDate');
          if (dateEl) {
            dateEl.value = basket.deliveryDate;
            if (typeof renderCalendar === 'function') renderCalendar();
          }
        }

        if (basket.customer) {
          if ($('custName')) $('custName').value = basket.customer.name || '';
          if ($('custEmail')) $('custEmail').value = basket.customer.email || '';
          if ($('custPhone')) $('custPhone').value = basket.customer.phone || '';
          if ($('custAddress')) $('custAddress').value = basket.customer.address || '';
          if ($('custW3W')) $('custW3W').value = basket.customer.w3w || '';
          if ($('custNotes')) $('custNotes').value = basket.customer.notes || '';
        }

        updateBar();
        updateSummary();
      }
    } catch (e) {
      console.error('Failed to load basket', e);
    }
  }

  // ── VOLUME BLOCK VISUALISER ──
  document.querySelectorAll('.card[data-id]').forEach(card => {
    const id = card.dataset.id;
    if (id === 'k') return; // skip kindling
    const vol = parseInt(id) || 0;
    if (isNaN(vol) || vol < 1 || id === 'party') return;
    const imgWrap = card.querySelector('.card-img');
    if (!imgWrap) return;

    // Add dark overlay
    const darken = document.createElement('div');
    darken.className = 'vol-darken';
    imgWrap.appendChild(darken);

    // Add block overlay
    const overlay = document.createElement('div');
    overlay.className = 'vol-overlay' + (vol >= 5 ? ' vol-blocks-' + vol : '');
    for (let i = 0; i < vol; i++) {
      const block = document.createElement('div');
      block.className = 'vol-block';
      block.textContent = '1m³';
      block.style.animationDelay = (i * 80) + 'ms';
      overlay.appendChild(block);
    }
    imgWrap.appendChild(overlay);

    // Mobile info button
    const infoBtn = document.createElement('button');
    infoBtn.className = 'vol-info-btn';
    infoBtn.textContent = 'ⓘ';
    infoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      imgWrap.classList.toggle('vol-show');
      overlay.querySelectorAll('.vol-block').forEach(b => { b.classList.remove('animate'); void b.offsetWidth; b.classList.add('animate'); });
    });
    imgWrap.appendChild(infoBtn);

    // Hover animation trigger
    imgWrap.addEventListener('mouseenter', () => {
      overlay.querySelectorAll('.vol-block').forEach(b => { b.classList.remove('animate'); void b.offsetWidth; b.classList.add('animate'); });
    });
  });

  // ── KINDLING MODAL ──
  const kindlingModal = $('kindlingModal');
  const kindlingCountEl = $('kindlingCount');
  const kindlingTotalEl = $('kindlingTotal');
  const kindlingAddBtn = $('kindlingAddBtn');
  const KINDLING_PRICE = 8;
  let pendingSelection = null;

  function updateKindlingDisplay() {
    if (!kindlingCountEl) return;
    const c = parseInt(kindlingCountEl.textContent) || 1;
    const total = c * KINDLING_PRICE;
    if (kindlingTotalEl) kindlingTotalEl.textContent = 'Total: £' + total;
    if (kindlingAddBtn) kindlingAddBtn.textContent = 'YES, ADD KINDLING — £' + total;
  }

  if ($('kindlingMinus')) {
    $('kindlingMinus').addEventListener('click', () => {
      let c = parseInt(kindlingCountEl.textContent) || 1;
      if (c > 1) { kindlingCountEl.textContent = c - 1; updateKindlingDisplay(); }
    });
  }
  if ($('kindlingPlus')) {
    $('kindlingPlus').addEventListener('click', () => {
      let c = parseInt(kindlingCountEl.textContent) || 1;
      if (c < 20) { kindlingCountEl.textContent = c + 1; updateKindlingDisplay(); }
    });
  }
  if (kindlingAddBtn) {
    kindlingAddBtn.addEventListener('click', () => {
      kindlingBags = parseInt(kindlingCountEl.textContent) || 1;
      kindlingModal.classList.remove('visible');
      completeSelection();
    });
  }
  if ($('kindlingSkipBtn')) {
    $('kindlingSkipBtn').addEventListener('click', () => {
      kindlingBags = 0;
      kindlingModal.classList.remove('visible');
      completeSelection();
    });
  }

  function completeSelection() {
    if (!pendingSelection) return;
    selected = pendingSelection;
    pendingSelection = null;
    // Volume unlock milestone
    const unlock = $('volUnlock');
    if (unlock) {
      unlock.classList.toggle('visible', selected.id === '1');
    }
    updateBar();
    updateSummary();
    saveBasket();
  }

  // ── PRODUCT SELECTION ──
  document.querySelectorAll('.card[data-id]').forEach((card) => {
    const btn = card.querySelector('.sel-btn');
    if (!btn) return;
    if (card.dataset.id === 'k') return; // kindling removed as standalone

    const handler = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.card[data-id]').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      pendingSelection = {
        id: card.dataset.id,
        name: card.dataset.name,
        price: parseFloat(card.dataset.price),
        stacking: parseFloat(card.dataset.stacking),
      };

      // Show kindling modal
      if (KINDLING_IN_STOCK && kindlingModal && !kindlingModalShown) {
        kindlingModalShown = true;
        kindlingCountEl.textContent = '1';
        kindlingModal.classList.add('visible');
      } else {
        kindlingBags = 0;
        completeSelection();
      }
    };

    btn.addEventListener('click', handler);
    card.addEventListener('click', handler);
  });

  // Stacking checkbox
  const stackEl = $('stackingToggle');
  if (stackEl) stackEl.addEventListener('change', () => { updateSummary(); updateBar(); saveBasket(); });
 
  // Kindling quantity
  const kindQty = $('kindlingQty');
  if (kindQty) kindQty.addEventListener('input', () => { updateSummary(); updateBar(); saveBasket(); });

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
    if (getStack()) label += ' + stacking';
    if (kindlingBags > 0) label += ' + kindling (x' + kindlingBags + ')';
    const total = calcTotal(false);
    summ.innerHTML = '<strong>' + label + '</strong> — £' + total.toFixed(2) + ' + delivery';
    btn.disabled = false;
  }

  function calcTotal(inclDel) {
    if (!selected) return 0;
    const wood = selected.price;
    const stack = getStack() ? selected.stacking : 0;
    const kindlingCost = kindlingBags * 8;
    const del = inclDel && delCharge !== null && !delBlocked ? delCharge : 0;
    return wood + stack + kindlingCost + del;
  }

  // ── CHECKOUT PROGRESS BAR ──
  function updateProgress(stepNum) {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach(s => {
      const n = parseInt(s.dataset.step);
      s.classList.remove('active', 'done');
      if (n < stepNum) s.classList.add('done');
      else if (n === stepNum) s.classList.add('active');
    });
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
      updateProgress(2); // Product chosen, now need postcode
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
    if (!selected) {
      const prodRow = $('sumProduct');
      if (prodRow) {
        prodRow.innerHTML = '<span>Your basket is empty</span><span>—</span>';
      }
      const stackRow = $('sumStacking');
      if (stackRow) stackRow.style.display = 'none';
      const kindRow = $('sumKindling');
      if (kindRow) kindRow.style.display = 'none';
      const delRow = $('sumDelivery');
      if (delRow) {
        const spans = delRow.querySelectorAll('span');
        if (spans[1]) spans[1].textContent = 'Calculated at checkout';
      }
      const totalRow = $('sumTotal');
      if (totalRow) {
        const spans = totalRow.querySelectorAll('span');
        if (spans[1]) spans[1].textContent = '—';
      }
      const payBtn = $('stripePayBtn');
      if (payBtn) payBtn.disabled = true;
      return;
    }

    const wood = selected.price;
    const stack = getStack() ? selected.stacking : 0;
    const kindlingCost = kindlingBags * 8;
    const dc = delCharge !== null && !delBlocked ? delCharge : null;

    // Product row
    const prodRow = $('sumProduct');
    if (prodRow) {
      prodRow.innerHTML = '<span>' + selected.name + ' <button class="summary-remove-btn" id="removeProduct" type="button">Remove</button></span><span>£' + wood.toFixed(2) + '</span>';
      const removeProductBtn = $('removeProduct');
      if (removeProductBtn) {
        removeProductBtn.addEventListener('click', () => {
          selected = null;
          kindlingBags = 0;
          localStorage.removeItem('ww_basket');
          window.dispatchEvent(new Event('cartUpdated'));
          if ($('dateSection')) $('dateSection').classList.remove('visible');
          if ($('detailsSection')) $('detailsSection').classList.remove('visible');
          document.querySelectorAll('.card[data-id]').forEach(c => c.classList.remove('selected'));
          updateBar();
          updateSummary();
        });
      }
    }

    // Stacking row
    const stackRow = $('sumStacking');
    if (stackRow) {
      if (getStack()) {
        stackRow.style.display = 'flex';
        const displayVol = selected.id === 'party' ? '1m³' : selected.id + 'm³';
        stackRow.innerHTML = '<span>Stacking — ' + displayVol + ' <button class="summary-remove-btn" id="removeStacking" type="button">Remove</button></span><span>£' + stack.toFixed(2) + '</span>';
        const removeStackBtn = $('removeStacking');
        if (removeStackBtn) {
          removeStackBtn.addEventListener('click', () => {
            const toggle = $('stackingToggle');
            if (toggle) toggle.checked = false;
            updateSummary();
            updateBar();
            saveBasket();
          });
        }
      } else {
        stackRow.style.display = 'none';
      }
    }

    // Kindling row (add-on)
    const kindRow = $('sumKindling');
    if (kindRow) {
      if (kindlingBags > 0) {
        kindRow.style.display = 'flex';
        kindRow.innerHTML = '<span>Kindling × ' + kindlingBags + ' <button class="summary-remove-btn" id="removeKindling" type="button">Remove</button></span><span>£' + kindlingCost.toFixed(2) + '</span>';
        const removeBtn = $('removeKindling');
        if (removeBtn) {
          removeBtn.addEventListener('click', () => {
            kindlingBags = 0;
            kindlingModalShown = false; // allow re-prompt
            updateSummary();
            updateBar();
            saveBasket();
          });
        }
      } else {
        kindRow.style.display = 'none';
      }
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
          spans[1].textContent = '£' + (wood + stack + kindlingCost + dc).toFixed(2) + ' inc VAT';
        } else {
          spans[1].textContent = '£' + (wood + stack + kindlingCost).toFixed(2) + ' + delivery';
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
        updateProgress(3);
      } else {
        delBlocked = false;
        const ch = Math.round((mi - FREE_MILES) * PPM * 100) / 100;
        delCharge = ch;
        const el = $('delPaid');
        if (el) {
          const amountEl = $('delPaidAmount');
          if (amountEl) amountEl.textContent = '£' + ch.toFixed(2);
          el.innerHTML = 'You\'re ' + mi + ' miles away. Delivery: <strong>£' + ch.toFixed(2) + '</strong> (' + (mi - FREE_MILES).toFixed(1) + ' miles beyond free zone × £2/mile)';
          el.style.display = 'block';
        }
        if (msgEl) {
          msgEl.textContent = 'Free delivery within 10 miles of WR6 6DT. Beyond that, £2/mile up to 20 miles.';
          msgEl.style.display = 'block';
        }
        if (dateSection) dateSection.classList.add('visible');
        if (detailsSection) detailsSection.classList.add('visible');
        updateProgress(3);
      }

      updateSummary();
      saveBasket();
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

  // ── CUSTOM CALENDAR ──
  const dateEl = $('deliveryDate');
  const calWrap = document.getElementById('calendarWrap');

  if (dateEl && calWrap) {
    // Hide native input, show custom calendar
    dateEl.style.display = 'none';
    let calMonth = new Date();
    calMonth.setDate(1);
    // Start from tomorrow's month
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (calMonth < new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1)) {
      calMonth = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
    }

    function renderCalendar() {
      const yr = calMonth.getFullYear();
      const mo = calMonth.getMonth();
      const firstDay = new Date(yr, mo, 1).getDay(); // 0=Sun
      const daysInMonth = new Date(yr, mo + 1, 0).getDate();
      const today = new Date();
      today.setHours(0,0,0,0);
      const moNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      
      let html = '<div class="cal-header">';
      html += '<button type="button" class="cal-prev">&lsaquo;</button>';
      html += '<span class="cal-title">' + moNames[mo] + ' ' + yr + '</span>';
      html += '<button type="button" class="cal-next">&rsaquo;</button>';
      html += '</div>';
      html += '<div class="cal-grid">';
      dayNames.forEach(d => html += '<div class="cal-day-name">' + d + '</div>');
      
      // Offset for Monday start (0=Mon..6=Sun)
      const offset = (firstDay + 6) % 7;
      for (let i = 0; i < offset; i++) html += '<div class="cal-cell cal-empty"></div>';
      
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = yr + '-' + String(mo+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        const dateObj = new Date(yr, mo, d);
        const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon
        const isPast = dateObj <= today;
        const isNoDelivery = (dayOfWeek === 0 || dayOfWeek === 1); // Sun or Mon
        const bookings = window.bookedSlots ? (window.bookedSlots[dateStr] || 0) : 0;
        const isFullyBooked = bookings >= 4;
        const isBlocked = BLOCKED_DATES.includes(dateStr) || isFullyBooked;
        const isSelected = dateEl.value === dateStr;
        let cls = 'cal-cell';
        if (isPast) cls += ' cal-past';
        else if (isNoDelivery) cls += ' cal-nodelivery';
        else if (isBlocked) cls += ' cal-blocked';
        else cls += ' cal-available';
        if (isSelected) cls += ' cal-selected';

        let cellContent = '<span class="cal-date-num">' + d + '</span>';
        if (!isPast && !isNoDelivery && !BLOCKED_DATES.includes(dateStr)) {
          if (isFullyBooked) {
            cellContent += '<span class="cal-slots cal-slots-full">Fully booked</span>';
          } else if (bookings > 0) {
            const left = 4 - bookings;
            cellContent += '<span class="cal-slots cal-slots-left">' + left + ' left</span>';
          }
        }

        html += '<div class="' + cls + '" data-date="' + dateStr + '">' + cellContent + '</div>';
      }
      html += '</div>';
      html += '<div class="cal-legend"><span class="cal-leg-item"><span class="cal-dot cal-dot-green"></span> Available</span><span class="cal-leg-item"><span class="cal-dot cal-dot-orange"></span> Fully booked</span><span class="cal-leg-item"><span class="cal-dot cal-dot-red"></span> No delivery</span></div>';
      
      calWrap.innerHTML = html;
      
      // Events
      calWrap.querySelector('.cal-prev').addEventListener('click', () => {
        calMonth.setMonth(calMonth.getMonth() - 1);
        const minMonth = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
        if (calMonth < minMonth) calMonth = new Date(minMonth);
        renderCalendar();
      });
      calWrap.querySelector('.cal-next').addEventListener('click', () => {
        calMonth.setMonth(calMonth.getMonth() + 1);
        renderCalendar();
      });
      calWrap.querySelectorAll('.cal-available').forEach(cell => {
        cell.addEventListener('click', () => {
          dateEl.value = cell.dataset.date;
          renderCalendar();
          saveBasket();
        });
      });
      calWrap.querySelectorAll('.cal-blocked').forEach(cell => {
        cell.addEventListener('click', () => {
          alert('Sorry, that date is fully booked. Please choose another.');
        });
      });
      calWrap.querySelectorAll('.cal-nodelivery').forEach(cell => {
        cell.addEventListener('click', () => {
          alert('Sorry, we don\'t deliver on Sundays or Mondays. Please choose Tuesday – Saturday.');
        });
      });
    }
    renderCalendar();
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

      const wood = selected.price;
      const stack = getStack() ? selected.stacking : 0;
      const kindlingCost = kindlingBags * 8;
      const total = wood + stack + kindlingCost + (delCharge || 0);

      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="spinner"></span>Redirecting to payment…';

      try {
        const res = await fetch('/.netlify/functions/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product: selected.name,
            productPrice: wood,
            stacking: getStack() ? stack : 0,
            kindlingBags: kindlingBags,
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
  // Save customer input to basket in real-time
  ['custName', 'custEmail', 'custPhone', 'custAddress', 'custW3W', 'custNotes'].forEach(id => {
    const el = $(id);
    if (el) el.addEventListener('input', saveBasket);
  });

  // Fetch slot bookings on page load
  async function fetchBookings() {
    try {
      const res = await fetch('/.netlify/functions/get-bookings');
      if (res.ok) {
        window.bookedSlots = await res.json();
      }
    } catch (e) {
      console.error('Failed to fetch slot bookings', e);
      window.bookedSlots = {};
    }
    if (typeof renderCalendar === 'function') renderCalendar();
  }

  // Fetch slot bookings and load basket on page load
  fetchBookings();
  loadBasket();

  // Listen for storage events (updates across tabs)
  window.addEventListener('storage', () => {
    loadBasket();
  });

  // Open checkout modal if query parameter checkout=open is present
  const params = new URLSearchParams(window.location.search);
  if (params.get('checkout') === 'open') {
    // Wait slightly to ensure loadBasket postcode checker has started/completed
    setTimeout(() => {
      if (selected && modal) {
        updateSummary();
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
        updateProgress(delCharge !== null ? 3 : 2);
      }
    }, 400);
  }

  // Handle Stripe checkout redirects (success or cancelled)
  if (params.get('payment') === 'success') {
    const sessionId = params.get('session_id');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      // Hide all standard checkout sections
      if ($('checkoutProgress')) $('checkoutProgress').style.display = 'none';
      if ($('orderSummary')) $('orderSummary').style.display = 'none';
      if ($('postcodeSection')) $('postcodeSection').style.display = 'none';
      if ($('dateSection')) $('dateSection').style.display = 'none';
      if ($('detailsSection')) $('detailsSection').style.display = 'none';

      const successBox = $('successBox');
      if (successBox) {
        successBox.style.display = 'block';

        if (sessionId) {
          successBox.innerHTML = `
            <div class="spinner-large" style="margin: 2rem auto; border: 4px solid var(--c4); border-top: 4px solid var(--c6); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite;"></div>
            <h3>Confirming your order...</h3>
            <p>Please wait while we verify your payment and reserve your delivery slot.</p>
            <style>
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
          `;

          fetch('/.netlify/functions/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              // Clear basket
              localStorage.removeItem('ww_basket');
              window.dispatchEvent(new Event('cartUpdated'));

              successBox.innerHTML = `
                <svg style="width:60px; height:60px; stroke:#4caf50; fill:none; stroke-width:2; margin-bottom:1.5rem;" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3>Order confirmed!</h3>
                <p>Thank you for your order. We've sent a confirmation to your email address. We'll be in touch to confirm your delivery slot.</p>
                ${data.notificationFailed ? `
                  <div class="warning-box" style="background:#fff3cd; border:1px solid #ffeeba; color:#856404; padding:1rem; border-radius:8px; font-size:0.85rem; margin-top:1.5rem; text-align:left; line-height:1.5;">
                    <strong>Notice:</strong> We successfully received your payment, but we had trouble sending the automated email/SMS confirmation to Ed. Don't worry, your order is secured! Feel free to contact Ed directly on 07583 338879 if you have any questions.
                  </div>
                ` : ''}
                <a href="/" class="btn-primary" style="margin-top:1.5rem; display:inline-block;">Back to home</a>
              `;
            } else {
              successBox.innerHTML = `
                <svg style="width:60px; height:60px; stroke:#f44336; fill:none; stroke-width:2; margin-bottom:1.5rem;" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <h3>Verification failed</h3>
                <p>We couldn't verify this payment session. If you paid and believe this is an error, please contact Ed on 07583 338879.</p>
                <a href="/firewood.html" class="btn-primary" style="margin-top:1.5rem; display:inline-block;">Return to Shop</a>
              `;
            }
          })
          .catch(err => {
            console.error(err);
            successBox.innerHTML = `
              <svg style="width:60px; height:60px; stroke:#ff9800; fill:none; stroke-width:2; margin-bottom:1.5rem;" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <h3>Connection error</h3>
              <p>There was a connection issue verifying your order. Please don't worry — if your payment went through, your order has been received. Please call Ed on 07583 338879 to confirm.</p>
              <a href="/" class="btn-primary" style="margin-top:1.5rem; display:inline-block;">Back to home</a>
            `;
          });
        } else {
          localStorage.removeItem('ww_basket');
          window.dispatchEvent(new Event('cartUpdated'));
        }
      }
    }
  } else if (params.get('payment') === 'cancelled') {
    alert('Payment was cancelled. Your items are still in your basket.');
    if (modal && selected) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
      updateProgress(delCharge !== null ? 3 : 2);
    }
  }

})();
