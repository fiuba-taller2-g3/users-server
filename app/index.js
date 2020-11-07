const express = require('express');
const { Client } = require('pg');

const app = express();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  query_timeout: 1000,
  statement_timeout: 1000
});

const CREATE_USERS_TABLE_CMD = "\
CREATE TABLE IF NOT EXISTS users (\
   id int NOT NULL AUTO_INCREMENT,\
   email VARCHAR(50) PRIMARY KEY,\
   password VARCHAR(50) NOT NULL,\
   name VARCHAR(15) NOT NULL,\
   surname VARCHAR(20) NOT NULL,\
   dni VARCHAR(10) NOT NULL,\
   type VARCHAR(10) NOT NULL\
);\
";

const CREATE_ADMINS_TABLE_CMD = "\
CREATE TABLE IF NOT EXISTS admins (\
   id int NOT NULL AUTO_INCREMENT,\
   email VARCHAR(50) PRIMARY KEY,\
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
  return 'INSERT INTO users(email, password, name, surname, dni, type)\nVALUES (\'' + username + '\', \'' + password + '\', \'' + name + '\', \'' + surname + '\', \'' + dni + '\', \'' + type + '\');'
}

function add_admin(email, password, name, surname, dni) {
  return 'INSERT INTO admins(email, password, name, surname, dni)\nVALUES (\'' + username + '\', \'' + password + '\', \'' + name + '\', \'' + surname + '\', \'' + dni + '\');'
}

client.connect();
client.query(INIT_CMD);

app.use(express.urlencoded());
app.use(express.json());

app.get('/ping', (req, res) => res.send('Pong!\n'));

app.get('/status', (req, res) =>
    client.query('SELECT NOW();', (err) => res.send({ db_admin_service: 'UP', db: err ? 'DOWN' : 'UP'}))
);

app.delete('/reset', (req, res) =>
    client.query(RESET_CMD, (err) => res.send(err ? err.stack : 'DB reseted correctly\n'))
);

app.post('/users', (req, res) =>
   client.query(add_user(req.body.email, req.body.password, req.body.name, req.body.surname, req.body.dni, req.body.type), (err, db_res) => res.send(err ? err.stack : db_res.rows[0]))
);

app.post('/admins', (req, res) =>
   client.query(add_admin(req.body.email, req.body.password, req.body.name, req.body.surname, req.body.dni), (err, db_res) => res.send(err ? err.stack : db_res.rows[0]))
);

app.post('/users/login', (req, res) => {
      const query = 'SELECT * FROM users WHERE username = $1 AND password = $2;'
      const values = [req.body.username, req.body.password]
      client.query(query, values, (err, db_res) => {
        if (err) {
          res.send(err.stack)
        } else if (db_res.rows.length == 0) {
          res.status(404).send("Not found")
        } else res.send(db_res.rows[0])
      })
    }
);

app.post('/admins/login', (req, res) => {
      const query = 'SELECT * FROM admins WHERE username = $1 AND password = $2;'
      const values = [req.body.username, req.body.password]
      client.query(query, values, (err, db_res) => {
        if (err) {
          res.send(err.stack)
        } else if (db_res.rows.length == 0) {
          res.status(404).send("Not found")
        } else res.send(db_res.rows[0])
      })
    }
);

app.listen(process.env.PORT, () => {
    console.log(`App running on port ${process.env.PORT}`);
});
