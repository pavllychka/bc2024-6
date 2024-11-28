const express = require("express");
const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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
const upload = multer();
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send("сервер працєю вав дуже касно юху");
});

const server = app.listen(options.port, options.host, () => {
    console.log(`Server started at http://${options.host}:${options.port}`);
});

server.on('error', (err) => {
    console.error("server error: ", err);
});

app.get(`/notes/:name`, (req, res) => {
    const noteFile = path.join(cacheDirectory, `${req.params.name}.txt`);

    if (!fs.existsSync(noteFile)) {
        console.log(`Note not found: ${req.params.name}`);
        return res.status(404).send("Note not found!");
    }

    const noteContent = fs.readFileSync(noteFile, 'utf8');
    res.send(noteContent);
});

app.post('/notes/write', upload.none(),(req, res) => {
    console.log("Request Body:", req.body);
    const name = req.body.note_name;
    const text = req.body.note;


    
    const notePath = path.join(cacheDirectory, `${name}.txt`);

    if (fs.existsSync(notePath)) {
        return res.status(400).send("Note already exists!");
    }

    fs.writeFileSync(notePath, text || "No text provided");
    console.log(`Note ${name} created successfully!`);

    res.status(201).send(`Note ${name} created successfully!`);
});

   


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
app.put("/notes/:name", (req, res) => {
    const newText = req.body.text;
    const name = req.params.name; 

    const noteFile = path.join(cacheDirectory, `${name}.txt`);
    if (!fs.existsSync(noteFile)) {
        return res.status(404).send(`Note ${name} not found!`);
    }

    fs.writeFileSync(noteFile, newText || "No text provided");
    console.log(`Note ${name} updated successfully!`);
    res.status(201).send(`Note ${name} updated successfully!`);
});

app.delete('/notes/:name', (req, res) => {
    const name = req.params.name;

    const noteFile = path.join(cacheDirectory, `${name}.txt`);

    if (!fs.existsSync(noteFile)) {
        return res.status(404).send("Note not found!");
    }

    fs.unlinkSync(noteFile);
    console.log(`Note ${name} deleted successfully!`);
    res.send(`Note ${name} deleted successfully!`);
});


app.get("/UploadForm.html", (req, res) => {
    const formPath = path.join(__dirname, "UploadForm.html");
    if (fs.existsSync(formPath)) {
        res.sendFile(formPath);
    } else {
        res.status(404).send("Form not found!");
    }
});