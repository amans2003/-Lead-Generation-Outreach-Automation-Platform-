// ─── Lead Categories ──────────────────────────────────────────────────────────
export const CATEGORIES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'retail', label: 'Retail' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'automotive', label: 'Automotive' },
  { value: 'beauty_salon', label: 'Beauty & Salon' },
  { value: 'gym_fitness', label: 'Gym & Fitness' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'travel_tourism', label: 'Travel & Tourism' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'finance', label: 'Finance & Insurance' },
  { value: 'construction', label: 'Construction' },
  { value: 'it_services', label: 'IT Services' },
  { value: 'other', label: 'Other' },
];

// ─── Lead Sources ─────────────────────────────────────────────────────────────
export const SOURCES = [
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'justdial', label: 'JustDial' },
  { value: 'indiamart', label: 'IndiaMART' },
  { value: 'sulekha', label: 'Sulekha' },
  { value: 'manual', label: 'Manual Entry' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
];

// ─── Lead Statuses ────────────────────────────────────────────────────────────
export const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'converted', label: 'Converted' },
  { value: 'rejected', label: 'Rejected' },
];

// ─── Status Colors (Tailwind CSS classes for badges) ─────────────────────────
export const STATUS_COLORS = {
  new:       'bg-blue-100 text-blue-800 border border-blue-200',
  contacted: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  qualified: 'bg-purple-100 text-purple-800 border border-purple-200',
  converted: 'bg-green-100 text-green-800 border border-green-200',
  rejected:  'bg-red-100 text-red-800 border border-red-200',
  default:   'bg-gray-100 text-gray-800 border border-gray-200',
};

// ─── WhatsApp Connection States ───────────────────────────────────────────────
export const WHATSAPP_STATUSES = {
  disconnected: { label: 'Disconnected', color: 'text-gray-500' },
  connecting:   { label: 'Connecting…',  color: 'text-yellow-500' },
  qr_ready:     { label: 'Scan QR',      color: 'text-blue-500' },
  connected:    { label: 'Connected',    color: 'text-green-500' },
};

// ─── Pagination defaults ──────────────────────────────────────────────────────
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 25;

// ─── Date range presets ───────────────────────────────────────────────────────
export const DATE_PRESETS = [
  { value: 'today',    label: 'Today' },
  { value: 'week',     label: 'Last 7 days' },
  { value: 'month',    label: 'Last 30 days' },
  { value: 'quarter',  label: 'Last 3 months' },
  { value: 'custom',   label: 'Custom range' },
];
