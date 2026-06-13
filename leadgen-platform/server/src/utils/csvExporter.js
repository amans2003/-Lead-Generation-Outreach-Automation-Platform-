'use strict';

/**
 * CSV export utility for leads using csv-writer.
 * Install dependency: npm install csv-writer
 */

const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');

/**
 * Ordered list of lead fields and their CSV column headers.
 * Add or remove fields here to match the Lead model.
 */
const LEAD_COLUMNS = [
  { id: '_id',              title: 'ID' },
  { id: 'businessName',     title: 'Business Name' },
  { id: 'ownerName',        title: 'Owner Name' },
  { id: 'email',            title: 'Email' },
  { id: 'phone',            title: 'Phone' },
  { id: 'alternatePhone',   title: 'Alternate Phone' },
  { id: 'website',          title: 'Website' },
  { id: 'address',          title: 'Address' },
  { id: 'city',             title: 'City' },
  { id: 'state',            title: 'State' },
  { id: 'pincode',          title: 'Pincode' },
  { id: 'category',         title: 'Category' },
  { id: 'source',           title: 'Source' },
  { id: 'status',           title: 'Status' },
  { id: 'rating',           title: 'Rating' },
  { id: 'reviewCount',      title: 'Review Count' },
  { id: 'description',      title: 'Description' },
  { id: 'tags',             title: 'Tags' },
  { id: 'instagramHandle',  title: 'Instagram Handle' },
  { id: 'facebookPage',     title: 'Facebook Page' },
  { id: 'notes',            title: 'Notes' },
  { id: 'isVerified',       title: 'Is Verified' },
  { id: 'createdAt',        title: 'Created At' },
  { id: 'updatedAt',        title: 'Updated At' },
];

/**
 * Serializes a lead record into a flat object suitable for CSV output.
 * Handles arrays (tags) by joining them with a pipe character.
 * @param {object} lead - A Mongoose document or plain object.
 * @returns {object}
 */
function flattenLead(lead) {
  const raw = lead.toObject ? lead.toObject() : { ...lead };
  const flat = {};

  for (const col of LEAD_COLUMNS) {
    const val = raw[col.id];

    if (val === null || val === undefined) {
      flat[col.id] = '';
    } else if (Array.isArray(val)) {
      flat[col.id] = val.join(' | ');
    } else if (val instanceof Date) {
      flat[col.id] = val.toISOString();
    } else {
      flat[col.id] = String(val);
    }
  }

  return flat;
}

/**
 * Exports an array of lead objects to a CSV file.
 *
 * @param {object[]} leads    - Array of lead documents or plain objects.
 * @param {string}   filePath - Absolute or relative path to the output CSV file.
 * @returns {Promise<string>} Resolves with the absolute path of the written CSV.
 */
async function exportLeadsToCSV(leads, filePath) {
  if (!Array.isArray(leads)) {
    throw new TypeError('exportLeadsToCSV: "leads" must be an array.');
  }
  if (!filePath || typeof filePath !== 'string') {
    throw new TypeError('exportLeadsToCSV: "filePath" must be a non-empty string.');
  }

  const absolutePath = path.resolve(filePath);

  const csvWriter = createObjectCsvWriter({
    path: absolutePath,
    header: LEAD_COLUMNS,
  });

  const records = leads.map(flattenLead);
  await csvWriter.writeRecords(records);

  return absolutePath;
}

module.exports = { exportLeadsToCSV, LEAD_COLUMNS };
