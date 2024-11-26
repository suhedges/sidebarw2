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
            thread = { id: threadId };
        } else {
            // Include assistantId when creating a new thread
            thread = await openai.beta.threads.create({
                assistant_id: assistantId || defaultAssistantId
            });
        }
        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: message
        });

        // Create a run with the assistant_id
        const run = await openai.beta.runs.create({
            thread_id: thread.id,
            assistant_id: assistantId || defaultAssistantId
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
                console.log('Generating response using Assistant ID:', assistantId || defaultAssistantId);
                console.log('Assistant response:', responseText);
                res.json({ threadId: thread.id, response: responseText, assistantId: assistantId });
            });

    } catch (error) {
        console.error('OpenAI API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
