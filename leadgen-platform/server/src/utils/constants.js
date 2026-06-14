'use strict';

/**
 * Application-wide constants for the lead generation platform.
 */

// ---------------------------------------------------------------------------
// Lead categories supported by the platform
// These MUST match the enum in Lead.model.js
// ---------------------------------------------------------------------------
const CATEGORIES = [
  'restaurant',
  'retail',
  'salon',
  'gym',
  'clinic',
  'hotel',
  'school',
  'real_estate',
  'automobile',
  'electronics',
  'grocery',
  'pharmacy',
  'clothing',
  'jewellery',
  'hardware',
  'travel',
  'photography',
  'event',
  'coaching',
  'other',
];

// ---------------------------------------------------------------------------
// Data sources from which leads can be scraped
// ---------------------------------------------------------------------------
const SOURCES = [
  'google_maps',
  'justdial',
  'sulekha',
  'indiamart',
  'tradeindia',
  'yellowpages_india',
  'linkedin',
  'other',
];

// ---------------------------------------------------------------------------
// Lifecycle statuses for a lead record
// ---------------------------------------------------------------------------
const LEAD_STATUSES = [
  'new',
  'processing',
  'good_lead',
  'not_interested',
  'bounced',
];

// ---------------------------------------------------------------------------
// 15 major Indian cities targeted for scraping
// ---------------------------------------------------------------------------
const TARGET_CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Ahmedabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Jaipur',
  'Surat',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Chandigarh',
];

// ---------------------------------------------------------------------------
// Search keywords per category used when querying scraping sources
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS = {
  restaurant: [
    'restaurants',
    'restaurant',
    'food restaurant',
    'dine in restaurant',
    'cafe',
    'dhaba',
    'hotel restaurant',
    'fast food',
    'biryani restaurant',
  ],
  retail: [
    'retail shop',
    'retail store',
    'general store',
    'kirana store',
    'supermarket',
    'convenience store',
    'wholesale retail',
  ],
  salon: [
    'salon',
    'beauty salon',
    'hair salon',
    'unisex salon',
    'beauty parlour',
    'parlour',
    'spa and salon',
    'ladies salon',
  ],
  gym: [
    'gym',
    'fitness center',
    'health club',
    'fitness studio',
    'gymnasium',
    'crossfit gym',
    'yoga center',
    'aerobics center',
  ],
  clinic: [
    'clinic',
    'medical clinic',
    'doctor clinic',
    'dental clinic',
    'skin clinic',
    'health clinic',
    'multispeciality clinic',
    'diagnostic center',
  ],
  hotel: [
    'hotel',
    'budget hotel',
    'lodge',
    'guest house',
    'inn',
    'resort',
    'service apartment',
    'homestay',
  ],
  school: [
    'school',
    'coaching classes',
    'tuition center',
    'education center',
    'play school',
    'nursery school',
    'cbse school',
  ],
  real_estate: [
    'real estate',
    'property dealer',
    'real estate agent',
    'property consultant',
    'flat broker',
    'housing agent',
    'real estate broker',
  ],
  automobile: [
    'car dealer',
    'automobile dealer',
    'car service center',
    'auto parts',
    'bike dealer',
    'vehicle showroom',
    'car accessories',
  ],
  electronics: [
    'electronics store',
    'consumer electronics',
    'mobile accessories',
    'gadgets store',
    'earphones shop',
    'smart home devices',
    'laptop accessories',
  ],
  grocery: [
    'grocery store',
    'grocery shop',
    'vegetable shop',
    'fruit shop',
    'kirana',
    'provision store',
    'fresh grocery',
  ],
  pharmacy: [
    'pharmacy',
    'medical store',
    'chemist',
    'drug store',
    'medicine shop',
    'ayurvedic pharmacy',
    'health pharmacy',
  ],
  clothing: [
    'clothing store',
    'clothes shop',
    'garments',
    'fashion store',
    'readymade garments',
    'boutique',
    'textile shop',
    'mens wear',
    'ladies wear',
  ],
  jewellery: [
    'jewellery',
    'jewelry store',
    'gold jewellery',
    'silver jewellery',
    'artificial jewellery',
    'imitation jewellery',
    'bridal jewellery',
  ],
  hardware: [
    'hardware store',
    'hardware shop',
    'building materials',
    'plumbing supplies',
    'electrical hardware',
    'tools shop',
    'iron hardware',
  ],
  travel: [
    'travel agency',
    'tour operator',
    'travel agent',
    'holiday packages',
    'cab service',
    'tour and travel',
    'ticketing agent',
  ],
  photography: [
    'photography studio',
    'photographer',
    'photo studio',
    'wedding photographer',
    'event photographer',
    'commercial photographer',
  ],
  event: [
    'event management',
    'event planner',
    'wedding planner',
    'event organizer',
    'catering service',
    'decoration service',
    'tent house',
  ],
  coaching: [
    'coaching classes',
    'coaching center',
    'tuition classes',
    'training institute',
    'competitive exam coaching',
    'ias coaching',
    'entrance coaching',
  ],
  other: [
    'retail shop',
    'local business',
    'small business',
    'wholesale dealer',
    'distributor',
    'service provider',
  ],
};

// ---------------------------------------------------------------------------
// Pagination / scraping defaults
// ---------------------------------------------------------------------------
const SCRAPING_DEFAULTS = {
  MAX_RESULTS_PER_QUERY: 100,
  REQUEST_DELAY_MIN_MS: 1500,
  REQUEST_DELAY_MAX_MS: 4000,
  DEFAULT_RETRY_COUNT: 3,
  DEFAULT_RETRY_DELAY_MS: 1000,
  DEFAULT_RETRY_BACKOFF: 2,
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = {
  CATEGORIES,
  SOURCES,
  LEAD_STATUSES,
  TARGET_CITIES,
  CATEGORY_KEYWORDS,
  SCRAPING_DEFAULTS,
};
