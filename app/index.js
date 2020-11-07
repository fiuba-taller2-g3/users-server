const express = require('express');
const {Client} = require('pg');

const app = express();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    query_timeout: 1000,
    statement_timeout: 1000
});

const CREATE_USERS_TABLE_CMD = "\
CREATE TABLE IF NOT EXISTS users (\
   id SERIAL PRIMARY KEY,\
   email VARCHAR(50) NOT NULL,\
   password VARCHAR(50) NOT NULL,\
   name VARCHAR(15) NOT NULL,\
   surname VARCHAR(20) NOT NULL,\
   dni VARCHAR(10) NOT NULL,\
   type VARCHAR(10) NOT NULL\
);\
";

const CREATE_ADMINS_TABLE_CMD = "\
CREATE TABLE IF NOT EXISTS admins (\
   id SERIAL PRIMARY KEY,\
   email VARCHAR(50) NOT NULL,\
   password VARCHAR(50) NOT NULL,\
   name VARCHAR(15) NOT NULL,\
   surname VARCHAR(20) NOT NULL,\
   dni VARCHAR(10) NOT NULL\
);\
";

const DROP_ALL_CMD = "\
DROP SCHEMA public CASCADE;\
CREATE SCHEMA public;\
GRANT ALL ON SCHEMA public TO postgres;\
GRANT ALL ON SCHEMA public TO public;\
";

const INIT_CMD = CREATE_USERS_TABLE_CMD + CREATE_ADMINS_TABLE_CMD;

const RESET_CMD = DROP_ALL_CMD + INIT_CMD;

function add_user(email, password, name, surname, dni, type) {
    return 'INSERT INTO users(email, password, name, surname, dni, type)\nVALUES (\'' + email + '\', \'' + password + '\', \'' + name + '\', \'' + surname + '\', \'' + dni + '\', \'' + type + '\');'
}

function add_admin(email, password, name, surname, dni) {
    return 'INSERT INTO admins(email, password, name, surname, dni)\nVALUES (\'' + email + '\', \'' + password + '\', \'' + name + '\', \'' + surname + '\', \'' + dni + '\');'
}

client.connect();
client.query(INIT_CMD);

app.use(express.urlencoded());
app.use(express.json());

app.get('/ping', (req, res) => res.send('Pong!\n'));

app.get('/status', (req, res) =>
    client.query('SELECT NOW();', (err) => res.send({db_admin_service: 'UP', db: err ? 'DOWN' : 'UP'}))
);

app.delete('/reset', (req, res) =>
    client.query(RESET_CMD, (err) => res.send(err ? err.stack : 'DB reseted correctly\n'))
);

app.post('/users', (req, res) => {
        const query = 'SELECT * FROM users WHERE email = $1;'
        const values = [req.body.email]
        client.query(query, values, (err, db_res) => {
            if (db_res.rows.length == 0) {
                client.query(add_user(req.body.email, req.body.password, req.body.name, req.body.surname, req.body.dni, res.body.type), values, (err, db_res) => err ? res.send(err.stack) : res.json({"msg": "Usuario registrado exitosamente"}))
            } else {
                res.status(409).json({"error": "El usuario ya esta registrado en el sistema"})
            }
        })
    }
);

app.post('/admins', (req, res) => {
        const query = 'SELECT * FROM admins WHERE email = $1;'
        const values = [req.body.email]
        client.query(query, values, (err, db_res) => {
            if (db_res.rows.length == 0) {
                client.query(add_admin(req.body.email, req.body.password, req.body.name, req.body.surname, req.body.dni), values, (err, db_res) => err ? res.send(err.stack) : res.json({"msg": "Administrador registrado exitosamente"}))
            } else {
                res.status(409).json({"error": "El administrador ya esta registrado en el sistema"})
            }
        })
    }
);

app.post('/users/login', (req, res) => {
        const query = 'SELECT * FROM users WHERE email = $1 AND password = $2;'
        const values = [req.body.email, req.body.password]
        client.query(query, values, (err, db_res) => {
            if (err) {
                res.send(err.messageerror)
            } else if (db_res.rows.length == 0) {
                res.status(404).json({"error": "Email y/o contraseña invalidos"})
            } else {
                require('crypto').randomBytes(48, function (err, buffer) {
                    var token = buffer.toString('hex');
                    res.json({"msg": "Usuario logueado exitosamente", "api_token": token})
                });
            }
        })
    }
);

app.post('/admins/login', (req, res) => {
        const query = 'SELECT * FROM admins WHERE email = $1 AND password = $2;'
        const values = [req.body.email, req.body.password]
        client.query(query, values, (err, db_res) => {
            if (err) {
                res.send(err.messageerror)
            } else if (db_res.rows.length == 0) {
                res.status(404).json({"error": "Email y/o contraseña invalidos"})
            } else {
                require('crypto').randomBytes(48, function (err, buffer) {
                    var token = buffer.toString('hex');
                    res.json({"msg": "Administrador logueado exitosamente", "api_token": token})
                });
            }
        })
    }
);

app.listen(process.env.PORT, () => {
    console.log(`App running on port ${process.env.PORT}`);
});
