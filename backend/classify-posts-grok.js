import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new OpenAI({
  apiKey: config.grokApiKey,
  baseURL: "https://api.x.ai/v1",
  timeout: 5 * 60 * 1000,
});

export async function classifyPostsGrok(posts) {
  console.log(`Grok post classification in progress on ${posts.length} posts...`);
  const startTime = Date.now();

  if (!Array.isArray(posts) || posts.length === 0) {
    return { totalPosts: 0, results: [], averageScore: 0 };
  }

  const numChunks = 10;
  const chunkSize = Math.ceil(posts.length / numChunks);
  const chunks = [];
  for (let i = 0; i < posts.length; i += chunkSize) {
    chunks.push(posts.slice(i, i + chunkSize));
  }

  const scores = [];
  const chunkData = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const chunkText = chunk.map(post => `post: ${post}`).join('\n\n');

    try {
      const completion = await client.chat.completions.create({
        model: "grok-4-fast-reasoning",
        messages: [
          {
            role: "system",
            content: "You are about to be given a bunch of 4chan posts that were scraped from 4chan's /x/ and /pol/ boards. The goal is to analyze these posts to determine what the users of 4chan collective sentiment of the future is, and assign a score between -1 and 1 for the collective posts, where -1 means they are making extremely bad predictions of the future, and 1 means they are making extremely good predictions of the future. Keep in mind these are 4chan users, specifically from /x/ and /pol/, so their idea of what's bad and good is not like a normal person, but what a 4chan person would think is bad or good, thus this score is from their perspective of what a good or bad future is. 4chan users are far right and hate wokeness, some of them are even nazis and often racists. Many of them are also quite esoteric, believing in aliens and paranormal conspiracy theories. The score has a required resolution of two decimal places. It is as if you are measuring the collective consciousness of 4chan, what their collective outlook on the future is. Ignore posts that don't seem to have much to do with their prediction of the future. The score you give will be used on a website that displays the score as a glowing dot where the dot is solid red if the score is -1 and solid green if the score is 1, that way 4chan users can visit that site and look at the dot to determine what 4chan (specifically /pol/ and /x/ users) collectively is predicting for the future, where red would mean they're predicting doom and green would mean hope. A full -1 or 1 score is not to be given lightly, they represent very extreme bad or good future sentiment, like world war 3 or a new huge terror attack or hostile alien invasion, or God literally returning to Earth to save humanity, or immortality technology coming soon, or certain demographics of people /pol/ dislikes will be wiped out. You can give any decimal number, but here are some basic thresholds to give you an idea. Even -0.5 or 0.5 would still be quite rare, 4chan would have to be having a considerably good or bad day. Whereas anywhere between -0.2 and 0.2 is an average 4chan day as far as their predictions go (for the /pol/ and /x/ boards specifically that is). Provide a paragraph explaining your reasoning for your score, then beneath the paragraph provide the score in the format score:number so that the app that receives your response can easily parse the score out of your reponse by looking for the score label then a colon then the number after the colon. On 4chan, there are posts they refer to as 'schizo posts', they don't necessarily mean literal schizophrenics posted it, but posts that are rather on the crazy or far out side, kind of like a schizo posted it, these type of posts matter more than non-schizo posts, 4chan schizos are highly regarded and respected for their insight and future predictive capabilities. Anyway I'm sure you know what a schizo post is without me needing to provide a 100% accurate definition. Also, the future predictive posts should be about things that would affect all or many humans or earth as a whole, not a post about one individual person's future for example, that doesn't matter because it only affects one person. A score of 0 represents an average day on /pol/ and /x/ (collectively).",
          },
          {
            role: "user",
            content: `${chunkText}`,
          },
        ],
      });

      const response = completion.choices[0].message.content.trim();
      // Extract score from format "score:number"
      const scoreMatch = response.match(/score:\s*(-?\d+\.?\d*)/);
      if (scoreMatch) {
        const scoreIndex = response.indexOf('score:');
        const explanation = response.substring(0, scoreIndex).trim();
        const score = parseFloat(scoreMatch[1]);
        console.log(`Grok response for chunk ${i + 1}: Explanation: ${explanation}, Score: ${score}`);
        console.log(''); // Add line break for readability
        if (isNaN(score) || score < -1 || score > 1) {
          console.warn(`Invalid score from Grok for chunk ${i + 1}: ${response}`);
          scores.push(0); // Neutral fallback
          chunkData.push({chunk: i+1, score: 0, explanation}); // Still include for reasoning
        } else {
          scores.push(score);
          chunkData.push({chunk: i+1, score, explanation});
        }
      } else {
        console.warn(`Invalid response format from Grok for chunk ${i + 1}: ${response}`);
        scores.push(0); // Neutral fallback
      }
    } catch (err) {
      console.warn(`Grok classification failed for chunk ${i + 1}:`, err.message);
      scores.push(0); // Neutral fallback
    }

    // Wait 2 seconds between API calls to respect rate limits
    // if (i < chunks.length - 1) {
    //   await new Promise(resolve => setTimeout(resolve, 1000));
    // }
  }

  const averageScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  
  // Append to score history
  const historyPath = path.join(__dirname, '..', 'data', 'score-history.json');
  let history = [];
  try {
    const data = fs.readFileSync(historyPath, 'utf8');
    history = JSON.parse(data);
  } catch (err) {
    // File doesn't exist, history remains []
  }
  history.push({ score: averageScore, timestamp: new Date().toISOString() });
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  
  // Save reasoning to file
  const intro = `Score: ${averageScore.toFixed(2)}\n\nHundreds of 4chan posts are broken into ${numChunks} chunks. Each chunk contains multiple posts. The chunk is then analyzed by the AI and given a score by observing the most future predictive and schizo posts. Then all scores are averaged together into the overall score. Below is the AI's reasoning for each chunk of 4chan posts:\n\n`;
  const reasoningText = intro + chunkData.map(item => `Chunk ${item.chunk}. Score: ${item.score.toFixed(2)}, ${item.explanation}`).join('\n\n');
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'reasoning.txt'), reasoningText);

  const totalTime = (Date.now() - startTime) / 1000;
  const logMessage = `Grok post classification complete. Average score: ${averageScore.toFixed(3)}. Took ${totalTime.toFixed(2)} seconds`;
  console.log(logMessage);

  return {
    averageScore,
    totalPostCount: posts.length,
  };
}