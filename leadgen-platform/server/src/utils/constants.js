'use strict';

/**
 * Application-wide constants for the lead generation platform.
 */

// ---------------------------------------------------------------------------
// Lead categories supported by the platform
// ---------------------------------------------------------------------------
const CATEGORIES = [
  'shoes',
  'clothes',
  'skincare',
  'food',
  'jewellery',
  'supplements',
  'accessories',
  'home_decor',
  'sports_fitness',
  'electronics',
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
  shoes: [
    'shoes',
    'footwear',
    'shoe store',
    'chappal',
    'sandals',
    'sneakers',
    'boot store',
    'juta',
    'joota shop',
  ],
  clothes: [
    'clothes',
    'clothing store',
    'garments',
    'fashion store',
    'apparel',
    'readymade garments',
    'boutique',
    'textile shop',
    'kurta shop',
  ],
  skincare: [
    'skincare',
    'skin care products',
    'beauty products',
    'cosmetics store',
    'face cream',
    'derma products',
    'herbal skincare',
    'beauty salon products',
  ],
  food: [
    'food products',
    'food supplier',
    'packaged food',
    'snacks manufacturer',
    'food brand',
    'organic food store',
    'namkeen shop',
    'mithai shop',
    'bakery',
  ],
  jewellery: [
    'jewellery',
    'jewelry store',
    'gold jewellery',
    'silver jewellery',
    'artificial jewellery',
    'imitation jewellery',
    'bridal jewellery',
    'zari jewellery',
  ],
  supplements: [
    'supplements',
    'health supplements',
    'protein powder',
    'nutraceuticals',
    'ayurvedic supplements',
    'vitamin store',
    'gym supplements',
    'sports nutrition',
  ],
  accessories: [
    'accessories',
    'fashion accessories',
    'bags',
    'handbags',
    'belts',
    'wallets',
    'sunglasses store',
    'caps and hats',
    'watches',
  ],
  home_decor: [
    'home decor',
    'home decoration',
    'interior accessories',
    'furniture decor',
    'wall art',
    'home furnishings',
    'curtains store',
    'crockery store',
    'handicrafts',
  ],
  sports_fitness: [
    'sports equipment',
    'fitness equipment',
    'gym equipment',
    'sports goods',
    'yoga accessories',
    'cycling store',
    'outdoor sports',
    'cricket equipment',
  ],
  electronics: [
    'electronics store',
    'consumer electronics',
    'mobile accessories',
    'gadgets store',
    'earphones shop',
    'smart home devices',
    'laptop accessories',
    'charger shop',
  ],
  other: [
    'retail shop',
    'online seller',
    'ecommerce business',
    'D2C brand',
    'wholesale dealer',
    'distributor',
    'small business',
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
