import fs from 'fs-extra';
import path from 'path';

// Rate limiting delay (ms) - more conservative for thread fetches
const RATE_LIMIT_DELAY = 2000;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchThread(board, threadId) {
  const url = `https://a.4cdn.org/${board}/thread/${threadId}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status} for thread ${threadId}`);
  }
  return await response.json();
}

function countQuotes(posts) {
  const counts = {};
  posts.forEach(post => {
    if (post.com) {
      // Find all quoted post IDs
      const hrefMatches = post.com.match(/href="#p(\d+)"/g);
      if (hrefMatches) {
        hrefMatches.forEach(href => {
          const idMatch = href.match(/#p(\d+)/);
          if (idMatch) {
            const id = idMatch[1];
            counts[id] = (counts[id] || 0) + 1;
          }
        });
      }
    }
  });
  return counts;
}

async function fetchBoardReplies(board) {
  const catalogPath = path.join(__dirname, '..', 'data', `${board}-catalog.json`);
  if (!fs.existsSync(catalogPath)) {
    console.log(`Catalog for ${board} not found. Run fetch-catalogs.js first.`);
    return;
  }

  const threads = JSON.parse(fs.readFileSync(catalogPath));
  const repliesDir = path.join(__dirname, '..', 'data', `${board}-replies`);
  await fs.ensureDir(repliesDir);

  console.log(`Saving ${threads.length} threads for /${board}/...`);
  const boardStart = Date.now();

  for (const thread of threads.slice(0, 20)) { // Process first few threads for testing
  // for (const thread of threads) {
    try {
      const threadStart = Date.now();
      const threadData = await fetchThread(board, thread.no);
      const counts = countQuotes(threadData.posts);

      // Include OP and posts with 3+ quotes
      const importantPosts = threadData.posts.filter(post => {
        return post.no === thread.no || counts[post.no] >= 5;
      });

      const filePath = path.join(repliesDir, `${thread.no}.json`);
      fs.writeFileSync(filePath, JSON.stringify(importantPosts, null, 2));
      const threadEnd = Date.now();
      console.log(`Saved ${importantPosts.length} posts for thread ${thread.no} in /${board}/ (${threadEnd - threadStart} ms)`);

      await delay(RATE_LIMIT_DELAY - (threadEnd - threadStart));
    } catch (error) {
      console.error(`Error saving thread ${thread.no} in /${board}/:`, error.message);
    }
  }

  const boardEnd = Date.now();
  console.log(`Saving for /${board}/ completed in ${boardEnd - boardStart} ms`);
}

async function fetchAllReplies() {
  const dataDir = path.join(__dirname, '..', 'data');

  // Cleanup old replies
  ['x', 'pol'].forEach(board => {
    const dir = path.join(dataDir, `${board}-replies`);
    if (fs.existsSync(dir)) fs.emptyDirSync(dir);
  });

  const boards = ['x', 'pol'];
  const overallStart = Date.now();
  for (const board of boards) {
    await fetchBoardReplies(board);
  }
  const overallEnd = Date.now();
  console.log(`All replies fetched in ${overallEnd - overallStart} ms`);
}

// Run if called directly
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAllReplies();
}

export { fetchAllReplies };