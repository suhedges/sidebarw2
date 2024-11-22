// backend.js
const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
app.use(bodyParser.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Set your API key in the environment variable
});

const assistantId = "asst_BvrFPSsSNhed6wOdnjwjH2GK"; // Bert's assistant ID

app.post('/chat', async (req, res) => {
  const { message, threadId } = req.body;

  try {
    // Create or retrieve the thread
    let thread = threadId ? { id: threadId } : await openai.beta.threads.create();

    // Add the user's message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });

    // Run the thread and stream the response
    let responseText = "";
    await openai.beta.threads.runs.stream(thread.id, {
      assistant_id: assistantId
    })
      .on('textDelta', (textDelta) => {
        responseText += textDelta.value;
      })
      .on('end', () => {
        res.json({ threadId: thread.id, response: responseText });
      });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to communicate with assistant." });
  }
});

app.listen(3000, () => console.log('Server running on port 3000'));


