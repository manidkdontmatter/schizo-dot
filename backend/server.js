import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Worker } from 'worker_threads';
import { fetchAllCatalogs } from './fetch-catalogs.js';
import { fetchAllReplies } from './fetch-replies.js';
import { processReplies } from './process-replies.js';
import { BOARDS } from './utils.js';
import config from './config.js';
import { classifyPostsGrok } from './classify-posts-grok.js';
import { getChartData } from './chart.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist'))); // Serve frontend static files

// Basic route (optional—consider removing if static index.html handles root)
app.get('/', (req, res) => {
  res.send('Schizo Dot Backend - 4chan collective consciousness');
});

// Sentiment route (with file check for robustness)
app.get('/sentiment', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'sentiment-results.json');
    if (!fs.existsSync(filePath)) {
      console.log('Sentiment file not found—task may not have run yet');
      return res.status(404).json({ error: 'Sentiment data not ready yet—refresh in a bit' });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ average: data.averageScore });
  } catch (error) {
    console.error('Sentiment route error:', error);
    res.status(500).json({ error: 'Sentiment data not available' });
  }
});

// Reasoning route (with file check for robustness; sends plain text as before)
app.get('/reasoning', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'data', 'reasoning.txt');
    if (!fs.existsSync(filePath)) {
      console.log('Reasoning file not found—check data dir or scheduled task');
      return res.status(404).json({ error: 'Reasoning data not ready yet—refresh in a bit' });
    }
    const data = fs.readFileSync(filePath, 'utf8');
    res.type('text/plain').send(data);
  } catch (error) {
    console.error('Reasoning route error:', error);
    res.status(500).json({ error: 'Reasoning data not available' });
  }
});

// Chart data route
app.get('/api/chart-data', async (req, res) => {
 try {
   const data = await getChartData();
   res.json(data);
 } catch (error) {
   console.error('Chart data route error:', error);
   res.status(500).json({ error: 'Chart data not available' });
 }
});


// Scheduled task function
async function runScheduledTask() {
  console.log('Running scheduled data collection...');
  try {
    await fetchAllCatalogs();
    if (config.classificationMode == 'all') {
      await fetchAllReplies();
      await processReplies();
    }

    // Ensure data dir exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Perform sentiment analysis
    const boards = BOARDS;
    let posts = [];
    if (config.classificationMode === 'catalog') {
      const polData = JSON.parse(fs.readFileSync(path.join(dataDir, 'pol-catalog-processed.json'), 'utf8'));
      const xData = JSON.parse(fs.readFileSync(path.join(dataDir, 'x-catalog-processed.json'), 'utf8'));
      posts = [...xData, ...polData].map(item => item.text);
    } else {
      for (const board of boards) {
        const repliesDir = path.join(dataDir, `${board}-replies-processed`);
        if (!fs.existsSync(repliesDir)) continue;
        const files = fs.readdirSync(repliesDir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;
          const filePath = path.join(repliesDir, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          posts.push(...data.map(item => item.text));
        }
      }
    }
    let sentimentResults;
    if (config.classification === 'grok') {
      sentimentResults = await classifyPostsGrok(posts);
    } else {
      sentimentResults = await new Promise((resolve, reject) => {
        const worker = new Worker('./sentiment-worker.js', { workerData: null });

        worker.postMessage(posts);

        worker.on('message', (message) => {
          worker.terminate();
          if (message.success) {
            const { logMessage, ...dataToSave } = message.result;
            console.log(logMessage);
            resolve(dataToSave);
          } else {
            reject(new Error(message.error));
          }
        });

        worker.on('error', (err) => {
          worker.terminate();
          reject(err);
        });
      });
    }
    const { logMessage, ...dataToSave } = sentimentResults;
    if (logMessage) console.log(logMessage);
    fs.writeFileSync(path.join(dataDir, 'sentiment-results.json'), JSON.stringify(sentimentResults, null, 2));
    console.log('Data collection and sentiment analysis complete.');
  } catch (error) {
    console.error('Error in scheduled task:', error);
  }

  setTimeout(runScheduledTask, 30 * 60 * 1000);
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  runScheduledTask(); // Start the loop
});