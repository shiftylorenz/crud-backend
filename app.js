var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const jwt = require('jsonwebtoken');
const mysql = require('mysql-await');
const cors = require('cors');
const { createHash } = require('crypto');

var http = require('http');
var https = require('https');

const JWT_SECRET = 'DEIKCRUDProject';


/*
    SSL support
    Remove on test
*/
var fs = require('fs');

var privateKey = fs.readFileSync('sslcert/private.key');
var certificate = fs.readFileSync('sslcert/certificate.crt');

var credentials = {key: privateKey, cert: certificate};



const connection = mysql.createConnection({
    host: 'localhost',
    port: '3306',
    user: 'root',
    password: ''
    database: 'crud'
});

connection.connect(function (err) {
    if (!err)
    {
        console.log('SQL connected');
    }
    else
    {
        console.log('SQL failed to connect. ' + err);
        process.exit(1);
    }
})




let app = express();
let httpServer = http.createServer(app);
let httpsServer = https.createServer(credentials, app);


app.use(cors());
app.use(express.json());

app.post('/login', (req, res) => {
    let username = req.body.username;
    let password = req.body.password;

    if (username?.length > 0 && password?.length > 0)
    {
        let hash = createHash('sha256').update(password).digest('hex');

        connection.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, hash],
            (err, row) => {
                if (!err)
                {
                    if (row && (row.length > 0)) {
                        const userId = row[0].userId;

                        const token = jwt.sign({userId: userId}, JWT_SECRET, {
                            expiresIn: '1d'
                        });

                        console.log('Token issued for user: ' + userId + ' (' + token + ')');

                        res.json({
                            token: token,
                            userId: userId,
                            role: row[0].role
                        });
                    }
                    else
                    {
                        res.json({
                            error: 'Invalid username and/or password!'
                        });
                    }
                }
            });
    }
    else
    {
        res.json({
            error: 'Too short username or password!'
        });
    }
});

app.post('/members', (req, res) => {
    const token = req.header('Authorization');
    if (token)
    {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            connection.query("SELECT userId, username, role FROM users", (err, rows) => {
                if (!err)
                {
                    //res.json({'username': 'a', 'role': 3})
                    res.json(rows);
                }
            })
        } catch (ex) {
            res.sendStatus(403);
        }
    }
    else
    {
        res.sendStatus(403);
    }
})

function roleToInt(r)
{
    switch (r)
    {
        case "admin":
            return 3;
        case "management":
            return 2;
        case "user":
            return 1;
    }

    return 1;
}

app.post("/add", async (req, res) => {
    const token = req.header('Authorization');
    const data = req.body;

    if (!(data?.username?.length > 0 && data?.password?.length > 0))
    {
        res.json({
            error: 'Username and password must be at least 1 character long!'
        });

        return;
    }

    if (token)
    {
        try
        {
            const decoded = jwt.verify(token, JWT_SECRET);

            if (decoded)
            {
                let userId = decoded.userId;

                const role = await connection.awaitQuery("SELECT role FROM users WHERE userId = ?", [userId]);

                if (role[0].role <= roleToInt(req.body.role))
                {
                    //Admin hozzáadhat admint, de manager nem adhat hozzá managert.
                    if (role[0].role != 3)
                    {
                        res.json({
                            error: 'Can not add with this role'
                        });

                        return;
                    }
                }

                const exists = await connection.awaitQuery("SELECT COUNT(*) as c FROM users WHERE username LIKE ?", [data.username]);

                if (exists[0].c > 0)
                {
                    res.json({
                        error: 'Username already exists'
                    });

                    return;
                }

                const hash = createHash('sha256').update(data.password).digest('hex');

                const insertId = await connection.awaitQuery("INSERT INTO users(username, password, role) VALUES (?, ?, ?)", [
                    data.username,
                    hash,
                    roleToInt(data.role)
                ]);

                res.json({
                    action: 'add',
                    userId: insertId.insertId
                })
            }
        } catch (ex)
        {
            console.log('Access denied');
            res.sendStatus(403);
        }
    }
})

app.post('/update', async (req, res) => {
    const token = req.header('Authorization');

    if (token)
    {
        try
        {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.userId;

            if (decoded)
            {
                const roleData = await connection.awaitQuery("SELECT role FROM users WHERE userId = ?", [userId]);
                const memberRole = await connection.awaitQuery("SELECT role FROM users WHERE userId = ?", [req.body.id]);
                const role = roleData[0].role;

                if (role < memberRole[0].role)
                {
                    res.json({
                        error: 'Can not edit this member'
                    });

                    return;
                }

                const assignedRole = roleToInt(req.body.role);
                if (assignedRole > role)
                {
                    res.json({
                        error: 'Can not assign this role'
                    });

                    return;
                }

                if (req.body.username?.length <= 0)
                {
                    res.json({
                        error: 'Username must be at least 1 character'
                    });

                    return;
                }

                const exists = await connection.awaitQuery("SELECT userId FROM users WHERE username LIKE ?", [req.body.username]);

                if (exists.length > 0)
                {
                    if (exists[0].userId !== req.body.id)
                    {
                        res.json({
                            error: 'Username already exists'
                        });

                        return;
                    }
                }

                const ok = await connection.awaitQuery("UPDATE users SET username = ?, role = ? WHERE userId LIKE ?", [req.body.username, roleToInt(req.body.role), req.body.id]);

                res.json({
                    action: 'update',
                    userId: req.body.id
                });
            }
        }
        catch (e)
        {
            res.sendStatus(403);
        }
    }
    else
    {
        res.sendStatus(403);
    }
})


app.post('/delete', async (req, res) => {
    const token = req.header('Authorization');

    if (token)
    {
        try
        {
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.userId;

            if (decoded)
            {
                const roleData = await connection.awaitQuery("SELECT role FROM users WHERE userId = ?", [userId]);
                const role = roleData[0].role;

                const memberRole = await connection.awaitQuery("SELECT role FROM users WHERE userId = ?", [req.body.id]);

                if (role >= memberRole[0].role)
                {
                    await connection.awaitQuery("DELETE FROM users WHERE userId = ?", [req.body.id]);

                    console.log("delete user" + req.body.id);

                    res.json({
                        action: 'delete',
                        userId: req.body.id
                    })
                }
                else
                {
                    res.json({
                        error: 'Can not delete this member'
                    })
                }
            }
        }
        catch (e)
        {
            res.sendStatus(403);
        }
    }
    else
    {
        res.sendStatus(403);
    }
})

app.get('/hello', (req, res) => {
    res.send('Hello!');
})

//app.listen(8080, () => console.log('Backend is running on port 8080'));

httpServer.listen(8080);
httpsServer.listen(8081);