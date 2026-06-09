/* ============================================================
   WALKERS WOOD — SITE CONFIGURATION
   ============================================================
   Ed: This file controls all the key settings for the website.
   You can edit this file from the Admin page at /admin.html
   or directly here. Save and push to update the live site.
   ============================================================ */

const SITE_CONFIG = {

  // ── PRODUCT PRICES (inc VAT) ──
  products: {
    '1m3':  { name: '1m³ Firewood', price: 190,    stacking: 30,  badge: '' },
    '2m3':  { name: '2m³ Firewood', price: 361,    stacking: 60,  badge: 'Most popular' },
    '3m3':  { name: '3m³ Firewood', price: 542,    stacking: 90,  badge: 'Best value' },
    '4m3':  { name: '4m³ Firewood', price: 722,    stacking: 120, badge: 'Full season supply' },
    '5m3':  { name: '5m³ Firewood', price: 902.50, stacking: 150, badge: 'Multi-season' },
    '6m3':  { name: '6m³ Firewood', price: 1083,   stacking: 180, badge: 'Maximum value' },
  },

  // ── KINDLING ──
  kindlingPrice: 8, // per bag, inc VAT
  kindlingInStock: false, // Set to true when kindling is back in stock

  // ── DELIVERY ──
  delivery: {
    freeWithinMiles: 10,
    pricePerMile: 2.00,
    maxMiles: 20,
    basePostcode: 'WR66DT',
  },

  // ── BLOCKED DELIVERY DATES ──
  // Add dates in YYYY-MM-DD format when you can't deliver
  // Sundays and Mondays are automatically blocked
  blockedDates: [
    // '2026-12-25',
    // '2026-12-26',
    // '2026-01-01',
  ],

  // ── CONTACT ──
  phone: '07583338879',
  email: 'edwardwalkerfarms@gmail.com',
  whatsapp: '447583338879',

  // ── SOCIAL PROOF ──
  customerCount: 47, // "X happy customers this season"
  
  // ── SEASONAL BANNER ──
  // Set to '' to hide the summer banner
  seasonalBanner: 'Order in summer, thank yourself in November — beat the winter rush and guarantee your supply',
};

// Make available globally
if (typeof window !== 'undefined') {
  window.SITE_CONFIG = SITE_CONFIG;
}
if (typeof module !== 'undefined') {
  module.exports = SITE_CONFIG;
}
