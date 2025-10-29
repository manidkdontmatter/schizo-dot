import fs from 'fs-extra';
import path from 'path';
import { deHtml } from './utils.js';

// Rate limiting delay (ms)
const RATE_LIMIT_DELAY = 1000;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCatalog(board) {
  try {
    console.log(`Fetching catalog for /${board}/...`);
    const response = await fetch(`https://a.4cdn.org/${board}/catalog.json`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Filter out pinned threads
    const threads = [];
    data.forEach(page => {
      page.threads.forEach(thread => {
        if (!thread.sticky) {
          threads.push(thread);
        }
      });
    });

    // Save to file
    const filePath = path.join(__dirname, '..', 'data', `${board}-catalog.json`);
    fs.writeFileSync(filePath, JSON.stringify(threads, null, 2));
    console.log(`Saved ${threads.length} threads to ${board}-catalog.json`);

    // Create processed version
    const processed = threads.map(thread => ({
      text: deHtml((thread.sub || '') + ' ' + (thread.com || ''))
    }));
    const processedFilePath = path.join(__dirname, '..', 'data', `${board}-catalog-processed.json`);
    fs.writeFileSync(processedFilePath, JSON.stringify(processed, null, 2));
    console.log(`Saved ${processed.length} processed threads to ${board}-catalog-processed.json`);

    return threads;
  } catch (error) {
    console.error(`Error fetching /${board}/ catalog:`, error.message);
    return [];
  }
}

async function fetchAllCatalogs() {
  const dataDir = path.join(__dirname, '..', 'data');
  fs.ensureDirSync(dataDir);

  // Cleanup old catalogs
  ['x', 'pol'].forEach(board => {
    const file = path.join(dataDir, `${board}-catalog.json`);
    if (fs.existsSync(file)) fs.removeSync(file);
    const processedFile = path.join(dataDir, `${board}-catalog-processed.json`);
    if (fs.existsSync(processedFile)) fs.removeSync(processedFile);
  });

  const boards = ['x', 'pol'];
  for (const board of boards) {
    await fetchCatalog(board);
    await delay(RATE_LIMIT_DELAY);
  }
  console.log('All catalogs fetched.');
}

// Run if called directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllCatalogs();
}

export { fetchCatalog, fetchAllCatalogs };