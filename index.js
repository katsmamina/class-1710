const express = require('express');
const app = express();
const fs = require('fs');
const util = require('util');
const read = util.promisify(fs.readFile);
const write = util.promisify(fs.writeFile);
const bodyParser = require('body-parser');
const crypto = require('crypto');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(bodyParser.text());

// logging date/time
let demoLogger = async (req, res, next) => {
    let current_datetime = new Date();
    let formatted_date =
    current_datetime.getFullYear() +
    "-" +
    (current_datetime.getMonth() + 1) +
    "-" +
    current_datetime.getDate() +
    " " +
    current_datetime.getHours() +
    ":" +
    current_datetime.getMinutes() +
    ":" +
    current_datetime.getSeconds();
    let method = req.method;
    let url = req.url;
    let log = `[${formatted_date}] ${method}:${url} \n`;
    await write('log.txt', log, {flag: 'a'})
    console.log(log);
    next();
};
app.use(demoLogger);

//POST NEW FILE

// app.post('/:name', function (req, res) {
// const path = `/Users/mau/HackYourFuture/project-api/${req.params.name}.txt`;
// console.log('The file exists: ',fs.existsSync(path) );
// if (!fs.existsSync(path)) {
//     console.log(path);
//     fs.writeFile(`${req.params.name}.txt`, `${req.body}`, function (err) {
//         res.status(200).send({ok: true, message: "file created successfully"})
//     })
//     } else {
//         console.log('already exists');
//         res.status(500).send({ok: false, message: 'the file already exists'})
// }})


// POST NEW USER
const users = [];
// when you log in: send username and password once
// generate unique number => send to the client
// user has to pass this unique number on every request
const sessions = [];

app.post('/login', (req, res) => {
    const body = JSON.parse(req.body);
    const username = body.username;
    const password = body.password;
    const user = users.find(u => u.username === username && u.password === password);
    if(user === undefined) {
        res.status(400).send({ok: false, message: "Incorrect username or password"});
        return;
    }

    const sessionId = crypto.randomBytes(128).toString('hex');
    sessions.push({
        username: username, 
        password: password, 
        sessionId: sessionId
    });
    res.send({ok: true, sessionToken: sessionId});
});

app.post('/register', (req, res) => {
    const body = JSON.stringify(req.body); // JSON.parse ??
    const username = body.username;
    const password = body.password;
    const email = body.email;
    users.push({username, password, email});
    res.send({ok: true, message: `User ${username} was added`});
    console.log(users);
});

app.use('/files/*', (req, res, next) => {
    const authHeader = req.get('Authorization');
    console.log(authHeader);
    if(authHeader == undefined) {
        res.status(400).send({ok: false, message: "Please provide a valid authorization header"})
        return;
    }
    // REMOVED AFTER ADDING CRYPTO
    // const parts = authHeader.split(':');
    // if(parts.length !== 2) {
    //     res.status(400).send({ok: false, message: "Please provide a valid authorization header"});
    //     return;
    // }

    // const username = parts[0];
    // const password = parts[1];
    
    // const user = users.find(u => u.username === username && u.password === password);
    const session = sessions.find(s => s.sessionId === authHeader);
    if(session === undefined) {
        res.status(400).send({ok: false, message: "Invalid session, please sign in!"});
        return;
    }
    req.user = users.find(u => u.username === session.username); 
    next();
})

app.get('/:name', async (req, res, next) => {
    console.log(`this endpoint was called by user ${req.user.username}`)
    try {
        console.log(req.get('header'));
        const content = await read(`./${req.params.name}.txt`, 'utf8');
        res.send(content);
    } catch (error) {
    next(error);
    }
});

// GET
// app.get('/:name', function (req, res, next) {
//     const path = `./${req.params.name}.txt`;
//     if (fs.existsSync(path)) {
//         fs.readFile(path, 'utf8' , (err, data, next) => {
//             if (err) {
//             console.error(err);
//             res.status(404).send({ok: false, message: 'the file does not exist'})
//             next(err);
//             } res.send(data);
//         })
//     } else {
//         res.status(404).send({ok: false, message: 'the file does not exist'});
//         next(err);
//     }
//     });

app.use(async (error, req, res, next) => {
    res.status(500).send({ ok: false, message: `An error occurred.` });
    await write('log.txt', error.message + '\n', { flag: 'a' });
    console.log(error.message);
});

app.put('/:name', function (req, res) {
        const path = `./${req.params.name}.txt`;
        if (fs.existsSync(path)) {
            console.log(req.body.text);
            fs.writeFileSync(path, req.body.text, 'utf8');
            res.status(200).send({ok: true, message: 'the text is updated!'})
        } else {
            res.status(404).send({ok: false, message: 'the file does not exists'})
        }
        });

app.listen(4000);