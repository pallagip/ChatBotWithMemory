const express = require('express');
const {Configuration, OpenAIApi} = require("openai");
const app = express();
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer  = require('multer');
const { v4: uuidv4 } = require('uuid');
require("dotenv").config();
const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const conversationHistories = new Map();

app.use(cors());
app.use(express.json());
app.use('/', express.static(__dirname + '/client')); // Serves resources from client folder

// Set up Multer to handle file uploads
const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/')
        },
        filename: function (req, file, cb) {
            const extension = path.extname(file.originalname);
            const filename = uuidv4() + extension;
            cb(null, filename);
        }
    }),
    limits: { fileSize: 1024 * 1024 * 10 }, // 10 MB
    fileFilter: function (req, file, cb) {
        const allowedExtensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];
        const extension = path.extname(file.originalname);
        if (allowedExtensions.includes(extension)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type.'));
        }
    }
});

app.post('/get-prompt-result', async (req, res) => {
    const { prompt, model = 'gpt', conversationId } = req.body;

    if (!prompt) {
        return res.status(400).send({ error: 'Prompt is missing in the request' });
    }

    if (!conversationId) {
        return res.status(400).send({ error: 'Conversation ID is missing in the request' });
    }

    try {
        let messages;
        if (conversationHistories.has(conversationId)) {
            messages = conversationHistories.get(conversationId);
        } else {
            messages = [];
            conversationHistories.set(conversationId, messages);
        }

        messages.push({ role: "user", content: prompt });

        if (model === 'chatgpt') {
            const result = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                messages,
            });

            const botMessage = result.data.choices[0]?.message?.content;
            messages.push({ role: "assistant", content: botMessage });

            return res.send(botMessage);
        }

        // Handle other models if necessary
        // ...

    } catch (error) {
        const errorMsg = error.response ? error.response.data.error : `${error}`;
        console.error(errorMsg);
        return res.status(500).send(errorMsg);
    }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Listening on port ${port}`));
