import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getChartData() {
  const filePath = path.join(__dirname, '..', 'data', 'score-history.json');

  try {
    const data = await readFile(filePath, 'utf8');
    const scores = JSON.parse(data);

    if (!Array.isArray(scores) || scores.length === 0) {
      return { series: [{ name: 'Sentiment Score', data: [] }] };
    }

    // Group by hour
    const hourGroups = {};

    scores.forEach(entry => {
      if (entry.timestamp && typeof entry.score === 'number') {
        const date = new Date(entry.timestamp);
        const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();

        if (!hourGroups[hourKey]) {
          hourGroups[hourKey] = [];
        }
        hourGroups[hourKey].push(entry.score);
      }
    });

    // Calculate averages
    const chartData = Object.keys(hourGroups)
      .map(hour => {
        let scores = hourGroups[hour];
        let avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        avgScore = parseFloat(avgScore.toFixed(2));
        return [parseInt(hour), avgScore];
      })
      .sort((a, b) => a[0] - b[0]);

    return { series: [{ name: 'Sentiment Score', data: chartData }] };
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist
      return { series: [{ name: 'Sentiment Score', data: [] }] };
    }
    // Other errors (e.g., invalid JSON)
    console.error('Error reading score history:', error);
    return { series: [{ name: 'Sentiment Score', data: [] }] };
  }
}

export { getChartData };