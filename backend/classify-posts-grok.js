import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { getHumanReadableDate } from './utils.js';

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

  const numChunks = 12;
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
            content: `You are about to be given a bunch of 4chan posts scraped from the /x/ and /pol/ boards, mostly likely the batch of posts you will be given is from just one board or the other but sometimes it's both. You are to find the top 5 most important predictions of the future they made in their posts, if you can't find 5 that's okay sometimes there will be less or even zero predictions. At the very bottom of your reply give a score between -1 and 1 where -1 equals extreme doom and 1 equals extreme hope, for the future, based on the combined predictions you found. Ignore predictions that are likely to take more than 1 year at most to come true. List each prediction as a bullet point, do not describe it just say the prediction and keep it somewhat short. The score you give is required to have 2 decimal places. Ignore posts that don't make a prediction about the future. A full -1 or 1 is not to be given lightly, it means extremes like ww3 or literal God coming to save humanity. Provide the score in the format score:number because my app which reads your response is going to look for that so it can parse out the overall score to use in my app. If you do not find any predictions, omit the score label entirely, for example do not say score:0.00, just omit it because no predictions were found. The posts you choose must explicitly predict the future. Only select predictions that are likely to affect the majority of humanity or the world, for example some local elections in some state don't mean anything at all. Also what constitutes a prediction being good or bad is from the perspective of /pol/ and /x/, not the perspective of a normal person, remember a lot of them are nazis and white nationalists and stuff, almost all of them are far right, so the score you give a prediction should be from their perspective. By the way the current date is ${getHumanReadableDate()}, I'm letting you know the current date because I noticed sometimes you will mistake posts of something someone said happened in the past as something that will happen in the future, for example once you said "Trump will win the 2024 election" when it is currently way beyond 2024 so what you said in that case made no sense, but now you know.`

            // content: "You are about to be given a bunch of 4chan posts that were scraped from 4chan's /x/ and/or /pol/ boards. Most often every post will be from one board but sometimes it's from both. The goal is to analyze these posts to determine 4chan user's collective sentiment of the future, and assign a score between -1 and 1 for the collective posts, where -1 means they are making extremely bad predictions of the future, and 1 means they are making extremely good predictions of the future. Keep in mind these are 4chan users, specifically from /x/ and /pol/, so their idea of what's bad and good is not like a normal person, but what a 4chan person would think is bad or good, thus this score is from their perspective of what a good or bad future is. 4chan users are far right and hate wokeness, some of them are even nazis and often racists. Many of them are also quite esoteric, believing in aliens and paranormal conspiracy theories. The score has a required resolution of two decimal places. It is as if you are measuring the collective consciousness of 4chan, what their collective outlook on the future is. Ignore posts that don't seem to have much to do with their prediction of the future. The score you give will be used on a website that displays the score as a glowing dot where the dot is solid red if the score is -1 and solid green if the score is 1, that way 4chan users can visit that site and look at the dot to determine what 4chan (specifically /pol/ and /x/ users) collectively is predicting for the future, where red would mean they're predicting doom and green would mean hope. A full -1 or 1 score is not to be given lightly, they represent very extreme bad or good future sentiment, like world war 3 or a new huge terror attack or hostile alien invasion, or God literally returning to Earth to save humanity, or immortality technology coming soon, or certain demographics of people /pol/ dislikes will be wiped out, just to give you some examples. You can give any decimal number, but here are some basic thresholds to give you an idea. Even -0.5 or 0.5 would still be quite rare, 4chan would have to be having a considerably good or bad day. Whereas anywhere between -0.2 and 0.2 is an average 4chan day as far as their predictions go (for the /pol/ and /x/ boards specifically that is). Provide up to 5 bullet points showing the top things that were explicit predictions of the future in the posts, if there were any, then beneath that provide the score in the format score:number so that the app that receives your response can easily parse the score out of your reponse by looking for the score label then a colon then the number after the colon. On 4chan, there are posts they refer to as 'schizo posts', they don't necessarily mean literal schizophrenics posted it, but posts that are rather on the crazy or far out side, kind of like a schizo posted it, these type of posts matter more than non-schizo posts, 4chan schizos are highly regarded and respected for their insight and future predictive capabilities, they have a decent track record of being right. Anyway I'm sure you know what a schizo post is without me needing to provide a 100% accurate definition. Also, the future predictive posts should be about things that would affect all or many humans or earth as a whole, not a post about one individual person's future for example, that doesn't matter because it only affects one person. A score of 0 represents an average day on /pol/ and /x/ (collectively). Posts that don't have anything to do with predicting the future should not affect the score, it is as if they don't exist. I need to make this painfully clear: If the post doesn't explicitly predict the future, don't count it, don't make a bullet point out of it. The predictions must affect the fate of the world or humanity as a whole, affecting some localized area doesn't count for much. Also, the predictions they make should be something that is predicted to happen within the next year at most, if for example they were to say aging will be cured in 60 years, yeah that's a prediction but it's 60 years away, it doesn't count for what we are doing.",

            // content: "You are about to be given a bunch of 4chan posts that were scraped from 4chan's /x/ and/or /pol/ boards. Most often every post will be from one board but sometimes it's from both. The goal is to analyze these posts to determine 4chan user's collective sentiment of the future, and assign a score between -1 and 1 for the collective posts, where -1 means they are making extremely bad predictions of the future, and 1 means they are making extremely good predictions of the future. Keep in mind these are 4chan users, specifically from /x/ and /pol/, so their idea of what's bad and good is not like a normal person, but what a 4chan person would think is bad or good, thus this score is from their perspective of what a good or bad future is. 4chan users are far right and hate wokeness, some of them are even nazis and often racists. Many of them are also quite esoteric, believing in aliens and paranormal conspiracy theories. The score has a required resolution of two decimal places. It is as if you are measuring the collective consciousness of 4chan, what their collective outlook on the future is. Ignore posts that don't seem to have much to do with their prediction of the future. The score you give will be used on a website that displays the score as a glowing dot where the dot is solid red if the score is -1 and solid green if the score is 1, that way 4chan users can visit that site and look at the dot to determine what 4chan (specifically /pol/ and /x/ users) collectively is predicting for the future, where red would mean they're predicting doom and green would mean hope. A full -1 or 1 score is not to be given lightly, they represent very extreme bad or good future sentiment, like world war 3 or a new huge terror attack or hostile alien invasion, or God literally returning to Earth to save humanity, or immortality technology coming soon, or certain demographics of people /pol/ dislikes will be wiped out, just to give you some examples. You can give any decimal number, but here are some basic thresholds to give you an idea. Even -0.5 or 0.5 would still be quite rare, 4chan would have to be having a considerably good or bad day. Whereas anywhere between -0.2 and 0.2 is an average 4chan day as far as their predictions go (for the /pol/ and /x/ boards specifically that is). Provide a paragraph explaining your reasoning for your score, then beneath the paragraph provide the score in the format score:number so that the app that receives your response can easily parse the score out of your reponse by looking for the score label then a colon then the number after the colon. On 4chan, there are posts they refer to as 'schizo posts', they don't necessarily mean literal schizophrenics posted it, but posts that are rather on the crazy or far out side, kind of like a schizo posted it, these type of posts matter more than non-schizo posts, 4chan schizos are highly regarded and respected for their insight and future predictive capabilities, they have a decent track record of being right. Anyway I'm sure you know what a schizo post is without me needing to provide a 100% accurate definition. Also, the future predictive posts should be about things that would affect all or many humans or earth as a whole, not a post about one individual person's future for example, that doesn't matter because it only affects one person. A score of 0 represents an average day on /pol/ and /x/ (collectively). Posts that don't have anything to do with predicting the future should not affect the score, it is as if they don't exist.",
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
          chunkData.push({ chunk: i + 1, score: 0, explanation }); // Still include for reasoning
        } else {
          scores.push(score);
          chunkData.push({ chunk: i + 1, score, explanation });
        }
      } else {
        console.warn(`Invalid response format from Grok for chunk ${i + 1}: ${response}`);
        // scores.push(0); // Neutral fallback
      }
    } catch (err) {
      console.warn(`Grok classification failed for chunk ${i + 1}:`, err.message);
      // scores.push(0); // Neutral fallback
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
  const intro = `Hundreds of 4chan posts are broken into ${numChunks} chunks. Each chunk contains multiple posts. The chunk is then analyzed by the AI and given a score by observing the most future predictive and schizo posts. Then all scores are averaged together into the overall score. Below is the AI's reasoning for each chunk of 4chan posts:\n\n`;
  const chunksText = chunkData.map(item => `Chunk ${item.chunk} - Score: ${item.score.toFixed(2)}\n${item.explanation}`).join('\n\n');

  let narrative
  try {
    narrative = await client.chat.completions.create({
      model: "grok-4-fast-reasoning",
      messages: [
        {
          role: "system",
          content: `you are about to receive a bunch of predictions made by random users on 4chan, they are in chunks and then each prediction is separated by a dash for the chunk. i want you to read all these predictions then create a coherent narrative using them that tells what will happen in the near future, create a prophecy sort of, a narrative that makes sense as far as the timeline goes, but notice by "make sense" i do not mean exclude paranormal predictions just because you think they sound implausibly far fetched. keep the narrative worded matter of factly, like someone who is just stating what will happen, don't embellish it like some novel because that's not what we are doing here, straightforward, but should also sound prophetic somewhat. this is for people to read easily. no internet lingo either. just serious straightforward saying what will happen in the near future in an easy to read format that makes sense for the near future. it's possible you have to omit some predictions to make the coherent narrative seem more coherent and one tactic for this is to omit the ones that matter the least, for example if you have multiple predictions of the world ending then one prediction that a democrat will win the virginia elections, obviously the dumb local election is so unimportant compared to the world ending that you should omit it from the narrative. that's just an example, omit any of them you want to keep the narrative coherent. keep it all in one paragraph, preferably under 250 words but that's not a hard rule it's a soft target. by the way the current date is ${getHumanReadableDate()} in case you need to know, because i notice sometimes you think a past event is yet to happen because you believe it is the wrong date currently. make sure your narrative sounds realistic, like something that could actually happen, and by that i don't mean exclude every paranormal prediction because paranormal things are real, i'm just saying that if there's 20 extremely improbably paranormal predictions don't say they're all going to happen at once because that's completely unbelievable, it's more believable if just a few are going to happen, like if they're extremely improbable then i think 2 of them could fit in the narrative. if they're paranormal but more probably then more could fit in the narrative. main thing is the narrative sounds believable, not like some far fetched fantasy sci fi thing that could never happen in reality.`
        },
        {
          role: "user",
          content: `${chunksText}`,
        },
      ],
    });
  }
  catch (err) {
    console.log('creating narrative summary failed')
  }
  let narrativeText = narrative ? narrative.choices[0].message.content.trim() : 'No response from server'
  let fullText = 'AI Generated "Coherent Narrative" (Can often be retarded, see raw data below for individual predictions this narrative was created from)\n' + narrativeText + '\n\n\n\nRaw Data:\n(may contain predictions not included in the AI generated "coherent narrative" above):\n\n' + chunksText

  fs.writeFileSync(path.join(__dirname, '..', 'data', 'reasoning.txt'), fullText);

  const totalTime = (Date.now() - startTime) / 1000;
  const logMessage = `Grok post classification complete. Average score: ${averageScore.toFixed(3)}. Took ${totalTime.toFixed(2)} seconds`;
  console.log(logMessage);

  return {
    averageScore,
    totalPostCount: posts.length,
  };
}