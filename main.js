const swaggerJsdoc = require('swagger-jsdoc'); 
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const express = require("express");
const { Command } = require('commander');


const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Документація',
      version: '1.0.0',
      description: 'Лаб 6 документація на ендпоінт /docs',
    },
  },
  apis: [path.join(__dirname, 'main.js')], 
};
const specs = swaggerJsdoc(swaggerOptions);
module.exports = { swaggerUi, specs };


const program = new Command();

program
    .requiredOption('-h, --host <host>', 'Server Address')
    .requiredOption('-p, --port <port>', 'Server Port')
    .requiredOption('-c, --cache <cache>', 'Cache directory path');

program.parse(process.argv);

const options = program.opts();
const cacheDirectory = path.resolve(options.cache);


if (!fs.existsSync(cacheDirectory)) {
    console.log(`Cache directory does not exist. Creating directory: ${cacheDirectory}`);
    fs.mkdirSync(cacheDirectory, { recursive: true });
}


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const upload = multer();

/**
 * @swagger
 * /:
 *   get:
 *     summary: Головна сторінка сервера
 *     responses:
 *       200:
 *         description: Сервер працює
 */
app.get('/', (req, res) => {
    res.send("Сервер працює!");
});

/**
 * @swagger
 * /notes/{name}:
 *   get:
 *     summary: Отримати нотатку за іменем
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Назва нотатки
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Успішне отримання нотатки
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *       404:
 *         description: Нотатку не знайдено
 */
app.get('/notes/:name', (req, res) => {
    const noteFile = path.join(cacheDirectory, `${req.params.name}.txt`);

    if (!fs.existsSync(noteFile)) {
        return res.status(404).send("Note not found!");
    }

    const noteContent = fs.readFileSync(noteFile, 'utf8');
    res.send(noteContent);
});

/**
 * @swagger
 * /notes/write:
 *   post:
 *     summary: Створити нову нотатку
 *     requestBody:
 *       required: true
 *       description: Дані для створення нотатки
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               note_name:
 *                 type: string
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Нотатку створено
 *       400:
 *         description: Нотатка з такою назвою вже існує
 */
app.post('/notes/write', upload.none(), (req, res) => {
    const name = req.body.note_name;
    const text = req.body.note;
    const notePath = path.join(cacheDirectory, `${name}.txt`);

    if (fs.existsSync(notePath)) {
        return res.status(400).send("Note already exists!");
    }

    fs.writeFileSync(notePath, text || "No text provided");
    res.status(201).send(`Note ${name} created successfully!`);
});

/**
 * @swagger
 * /notes:
 *   get:
 *     summary: Отримати всі нотатки
 *     responses:
 *       200:
 *         description: Список нотаток
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
    const files = fs.readdirSync(cacheDirectory).filter(file => file.endsWith('.txt'));

    const notes = files.map(file => {
        const filePath = path.join(cacheDirectory, file);
        const text = fs.readFileSync(filePath, 'utf8');
        return {
            name: path.basename(file, '.txt'),
            text: text
        };
    });

    res.status(200).json(notes);
});

/**
 * @swagger
 * /notes/{name}:
 *   put:
 *     summary: Оновити нотатку за іменем
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Назва нотатки
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       description: Новий текст нотатки
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *     responses:
 *       201:
 *         description: Нотатку оновлено
 *       404:
 *         description: Нотатку не знайдено
 */
app.put('/notes/:name', (req, res) => {
    const newText = req.body.text;
    const name = req.params.name;
    const noteFile = path.join(cacheDirectory, `${name}.txt`);

    if (!fs.existsSync(noteFile)) {
        return res.status(404).send(`Note ${name} not found!`);
    }

    fs.writeFileSync(noteFile, newText || "No text provided");
    res.status(201).send(`Note ${name} updated successfully!`);
});

/**
 * @swagger
 * /notes/{name}:
 *   delete:
 *     summary: Видалити нотатку за іменем
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         description: Назва нотатки
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Нотатку видалено
 *       404:
 *         description: Нотатку не знайдено
 */
app.delete('/notes/:name', (req, res) => {
    const name = req.params.name;
    const noteFile = path.join(cacheDirectory, `${name}.txt`);

    if (!fs.existsSync(noteFile)) {
        return res.status(404).send("Note not found!");
    }

    fs.unlinkSync(noteFile);
    res.send(`Note ${name} deleted successfully!`);
});

/**
 * @swagger
 * /UploadForm.html:
 *   get:
 *     summary: Отримати форму для завантаження нотаток
 *     responses:
 *       200:
 *         description: Форма успішно отримана
 *       404:
 *         description: Форму не знайдено
 */
app.get("/UploadForm.html", (req, res) => {
    const formPath = path.join(__dirname, "UploadForm.html");
    if (fs.existsSync(formPath)) {
        res.sendFile(formPath);
    } else {
        res.status(404).send("Form not found!");
    }
});


app.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}/`);
});
