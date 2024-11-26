const express = require("express");
const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const program = new Command();

program
    .requiredOption('-h, --host <host>', 'Server Address')
    .requiredOption('-p, --port <port>', 'Server Port')
    .requiredOption('-c, --cache <cache>', 'Cache directory path');

program.parse(process.argv);

const options = program.opts();

const cacheDirectory = path.resolve(options.cache);
if (!fs.existsSync(cacheDirectory)) {
    console.error(`Directory cache path is invalid`);
    process.exit(1);
}

const notesFilePath = path.join(cacheDirectory, 'notes.json');

function saveNotesToFile() {
    fs.writeFileSync(notesFilePath, JSON.stringify(notes, null, 2));
}

function loadNotesFromFile() {
    if (fs.existsSync(notesFilePath)) {
        const data = fs.readFileSync(notesFilePath);
        return JSON.parse(data);
    }
    return [];
}

let notes = loadNotesFromFile();

const app = express();
app.use(express.json());
const upload = multer();


const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: 'Notes API',
            version: '1.0.0',
            description: 'API for managing notes',
        },
        servers: [
            {
                url: `http://${options.host}:${options.port}`,
            },
        ],
    },
    apis: ['./main.js'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));


app.get('/', (req, res) => {
    res.send("сервер працює дуже касно юху");
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Retrieve all notes
 *     responses:
 *       200:
 *         description: Successfully retrieved list of notes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   text:
 *                     type: string
 */
app.get('/notes', (req, res) => {
    res.status(200).send(notes);
});

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Retrieve a note by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the note to retrieve
 *     responses:
 *       200:
 *         description: Successfully retrieved note
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *       404:
 *         description: Note not found
 */
app.get(`/notes/:name`, (req, res) => {
    const name = req.params.name;
    const note = notes.find(note => note.name === name);

    if (!note) {
        console.log(`Note not found: ${name}`);
        return res.status(404).send("Note not found!");
    }
    res.send(note.text);
});

/**
 * @swagger
 * /notes/write:
 *   post:
 *     summary: Create a new note
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: note_name
 *         required: true
 *         type: string
 *         description: Name of the note
 *       - in: formData
 *         name: note
 *         type: string
 *         required: false
 *         description: Content of the note
 *     responses:
 *       201:
 *         description: Note successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                 text:
 *                   type: string
 *       400:
 *         description: Note already exists or invalid input
 */
app.post('/notes/write', upload.fields([{ name: 'note_name' }, { name: 'note' }]), (req, res) => {
    const name = req.body.note_name;
    const text = req.body.note;

    if (!name) {
        return res.status(400).send("Name parameter is required.");
    }

    const existingNote = notes.find(note => note.name === name);
    if (existingNote) {
        return res.status(400).send("Note already exists!");
    }

    const newNote = { name, text: text || "No text provided" };
    notes.push(newNote);
    saveNotesToFile();

    return res.status(201).send(newNote);
});

/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Update an existing note
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the note to update
 *       - in: body
 *         name: text
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             text:
 *               type: string
 *         description: Updated text of the note
 *     responses:
 *       201:
 *         description: Note successfully updated
 *       404:
 *         description: Note not found
 */
app.put("/notes/:name", (req, res) => {
    const newText = req.body.text;
    const name = req.params.name;
    const note = notes.find(note => note.name === name);

    if (!note) {
        return res.status(404).send(`Note ${name} not found!`);
    }

    note.text = newText;
    saveNotesToFile();
    res.status(201).send(`Note ${name} updated successfully!`);
});

/**
 * @swagger
 * /delete/{name}:
 *   delete:
 *     summary: Delete a note by name
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the note to delete
 *     responses:
 *       200:
 *         description: Note successfully deleted
 *       404:
 *         description: Note not found
 */
app.delete('/delete/:name', (req, res) => {
    const name = req.params.name;
    const noteIndex = notes.findIndex(note => note.name === name);

    if (noteIndex === -1) {
        return res.status(404).send("Note not found!");
    }

    const deletedNote = notes.splice(noteIndex, 1)[0];
    saveNotesToFile();
    res.send(`Note ${deletedNote.name} deleted successfully!`);
});

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Serve the upload form
 *     responses:
 *       200:
 *         description: HTML form served successfully
 */
app.get("/UploadForm.html", (req, res) => {
    res.sendFile(path.join(__dirname, "UploadForm.html"));
});

const server = app.listen(options.port, options.host, () => {
    console.log(`Server started at http://${options.host}:${options.port}`);
});

server.on('error', (err) => {
    console.error("Server error: ", err);
});
