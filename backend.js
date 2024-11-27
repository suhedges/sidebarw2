require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const cors = require('cors'); 
const path = require('path');

const app = express();

app.use(cors({
    origin: 'https://suhedges.github.io', 
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY 
});

const defaultAssistantId = "asst_BvrFPSsSNhed6wOdnjwjH2GK";

app.post('/chat', async (req, res) => {
    const { message, threadId, assistantId } = req.body;
    console.log('Received assistantId:', assistantId);

    try {
        let thread;
        if (threadId) {
            // Retrieve the thread
            thread = await openai.beta.threads.retrieve(threadId);
            console.log('Retrieved thread:', thread);

            // Check if the assistantId matches
            if (thread.assistant_id !== assistantId) {
                // Assistant ID has changed, create a new thread
                thread = await openai.beta.threads.create({
                    assistant_id: assistantId || defaultAssistantId
                });
                console.log('Assistant ID changed, created new thread:', thread);
            }
        } else {
            // Create a new thread with the provided assistantId
            thread = await openai.beta.threads.create({
                assistant_id: assistantId || defaultAssistantId
            });
            console.log('Created thread:', thread);
        }

        // Add the user's message to the thread
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: message,
        });

        // Create a new run without assistantId since it's associated with the thread
        const run = await openai.beta.runs.create({
            thread_id: thread.id,
        });

        let responseText = "";
        await openai.beta.runs.stream(run.id, {})
            .on('textDelta', (textDelta) => {
                console.log('Received textDelta:', textDelta);
                if (typeof textDelta.value === 'string') {
                    responseText += textDelta.value;
                } else if (typeof textDelta.value === 'object' && textDelta.value.text) {
                    responseText += textDelta.value.text; 
                }
            })
            .on('end', () => {
                responseText = responseText.replace(/【.*?】/g, '');
                console.log('Assistant response:', responseText);
                res.json({ threadId: thread.id, response: responseText, assistantId: assistantId });
            });

    } catch (error) {
        console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
