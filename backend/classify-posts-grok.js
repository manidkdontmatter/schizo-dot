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
  const model = 'grok-4-1-fast-non-reasoning'

  if (!Array.isArray(posts) || posts.length === 0) {
    return { totalPosts: 0, results: [], averageScore: 0 };
  }

  const numChunks = 20;
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
        model: model,
        messages: [
          {
            role: "system",
            content: `You are about to be given a bunch of 4chan posts scraped from the /x/ and /pol/ boards, mostly likely the batch of posts you will be given is from just one board or the other but sometimes it's both. You are to find the top 5 most important predictions of the future they made in their posts, if you can't find 5 that's okay sometimes there will be less or even zero predictions. At the very bottom of your reply give a score between -1 and 1 where -1 equals extreme doom and 1 equals extreme hope, for the future, based on the combined predictions you found. List each prediction as a bullet point, do not describe it just say the prediction and keep it somewhat short. The score you give is required to have 2 decimal places. Ignore posts that don't make a prediction about the future. A full -1 or 1 is not to be given lightly, it means extremes like ww3 or literal God coming to save humanity. Provide the score in the format score:number because my app which reads your response is going to look for that so it can parse out the overall score to use in my app. If you do not find any predictions, omit the score label entirely, for example do not say score:0.00, just omit it because no predictions were found, and only say "No predictions found", nothing else, but if predictions are found it is very important you include the score label. The posts you choose must explicitly predict the future. Only select predictions that are likely to affect the majority of humanity or the world, for example some local elections in some state don't mean anything at all. Also what constitutes a prediction being good or bad is from the perspective of /pol/ and /x/, not the perspective of a normal person, remember a lot of them are nazis and white nationalists and stuff, almost all of them are far right, so the score you give a prediction should be scored from their perspective, meaning what they think is good or bad. For example they are anti-Israel, anti-Jew, pro-China or at least neutral to it, pro-white, anti-woke, pro-traditionalism, anti-transhumanism, anti-degeneracy, and neither anti-Trump nor pro-Trump, they're mostly anti-America, meaning modern America that is, because they believe it's a jewish puppet state, but they love the original America and what it was founded for, they're anti-vax, pro-hitler, pro-nazi, neutral on russia and ukraine, anti-jew, anti-israel, neutral on muslims and some are pro-islam but they don't want them in western countries, they are opposed to brown immigration but pro-white immigration, they are anti-NPC, they are pro-extraterrestrial arrival as long as the extraterrestrials don't want to harm us, or if they extraterrestrials will only harm non-whites, extraterrestrials can also include cosmic entities and gods or other non-human intelligences, except alien created AIs which they generally consider nefarious, they are also against AI being put in charge of humans or gaining more control over humans, that includes human created AI or otherwise, they are against women's rights and women holding positions of authority. I can not make it clear enough you are giving these predictions the score they would, not what a normal person would. By the way the current date is ${getHumanReadableDate()}, I'm letting you know the current date because I noticed sometimes you will mistake posts of something someone said happened in the past as something that will happen in the future, for example once you said "Trump will win the 2024 election" when it is currently way beyond 2024 so what you said in that case made no sense, but now you know. One type of prediction you should exclude entirely are ones that are clearly a LARP. By the way there are a few 4chan inside jokes you need to be aware of so you know they are predicting something as a joke, and should exclude that prediction. The first is a joke about India becoming a superpower, they don't mean that literally it's sarcasm. Another is if they say something will happen in 2 more weeks, this joke means they actually don't think that thing will happen, it's sarcasm.`
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
  const intro = `Hundreds of 4chan posts are broken into ${numChunks} fragments. Each fragment contains multiple posts. The fragment is then analyzed by the AI and given a score by observing the most future predictive and schizo posts. Then all scores are averaged together into the overall score. Below is the AI's reasoning for each fragment of 4chan posts:\n\n`;
  const chunksText = chunkData.map(item => `Fragment ${item.chunk} - Score: ${item.score.toFixed(2)}\n${item.explanation}`).join('\n\n');

  let narrative
  try {
    narrative = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content: `you are about to receive a bunch of predictions made by random users on 4chan, they are in chunks and then each prediction is separated by a dash for the chunk. i want you to read all these predictions then create a coherent narrative using them that tells what will happen in the future, create a prophecy, a narrative that makes sense as far as the timeline goes. keep the narrative worded matter of factly, like someone who is just stating what will happen, don't embellish it like some novel because that's not what we are doing here, straightforward, but should also sound prophetic and interesting and form a coherent narrative where things tie together, creating a coherent story. this is for people to read easily. no internet lingo either. it's possible you have to omit some predictions to make the coherent narrative seem more coherent and one tactic for this is to omit the ones that matter the least, for example if you have multiple predictions of the world ending then one prediction that a democrat will win the virginia elections, obviously the dumb local election is so unimportant compared to the world ending that you should omit it from the narrative, not to mention it's lame and boring, so omitting lame and boring things is another tactic, keep it interesting. that's just an example, omit any of them you want to keep the narrative coherent and interesting. keep it all in one paragraph, preferably under 120 words but that's not a hard rule it's a soft target, you may have to leave out a significant amount of the lamest or most unimportant predictions to adhere to this word count. by the way the current date is ${getHumanReadableDate()} in case you need to know, because i notice sometimes you think a past event is yet to happen because you believe it is the wrong date currently. make sure your narrative sounds realistic, like something that could actually happen, and by that i don't mean exclude every paranormal prediction because paranormal things are real, i'm just saying that if there's 20 extremely improbable paranormal predictions don't say they're all going to happen at once because that's not believable to the reader, it's more believable if just a few are going to happen, like if they're extremely improbable then i think 2 of them could fit in the narrative. if they're paranormal but more probable then more could fit in the narrative. main thing is the narrative sounds believable, not like some far fetched fantasy scifi thing that could never happen in reality. and by keeping it believable and realistic i don't mean selecting predictions that are very obvious to everyone that it will happen, in fact it would be better for example to select predictions that are most unexpected and would come as a complete surprise to the reader but still are things that could definitely happen in reality, for example it would be unexpected for Trump to randomly die but it's completely in line with the rules of the real world, whereas Sonic the Hedgehog becoming real is also unexpected but not grounded in the rules of the reality we live in. unexpected yet plausible things are more interesting to the reader. In your coherent narrative, don't just spout off a series of unrelated events, you are telling a story of how these things transpire and are connected to each other. don't just say obvious things that everyone already knows is going to happen, the whole idea is saying things that people don't expect to happen but are still something that could happen in reality. you can add your own spin to the narrative too, meaning things not explicitly in the predictions. add your own new parts to the story to make it more interesting, like filling out the in betweens, where it makes sense at least.`
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
  // let fullText = 'AI Generated "Coherent Narrative":\n(Not as good as just reading the raw predictions below in my opinion. Can feel forced by the AI)\n\n' + narrativeText + '\n\n\n\nRaw Predictions:\n(May contain predictions not included in the "coherent narrative"):\n\n' + chunksText
  let fullText = 'Predictions found on 4chan:\n\n' + chunksText

  fs.writeFileSync(path.join(__dirname, '..', 'data', 'reasoning.txt'), fullText);

  const totalTime = (Date.now() - startTime) / 1000;
  const logMessage = `Grok post classification complete. Average score: ${averageScore.toFixed(3)}. Took ${totalTime.toFixed(2)} seconds`;
  console.log(logMessage);

  return {
    averageScore,
    totalPostCount: posts.length,
  };
}