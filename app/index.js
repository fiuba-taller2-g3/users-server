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
   username VARCHAR(50) PRIMARY KEY,\
   password VARCHAR(50) NOT NULL\
);\
";

const DROP_ALL_CMD = "\
DROP SCHEMA public CASCADE;\
CREATE SCHEMA public;\
GRANT ALL ON SCHEMA public TO postgres;\
GRANT ALL ON SCHEMA public TO public;\
";

const INIT_CMD = CREATE_USERS_TABLE_CMD;

const RESET_CMD = DROP_ALL_CMD + INIT_CMD;

function add_user(username, password) {
  return 'INSERT INTO users(username, password)\nVALUES (\'' + username + '\', \'' + password + '\');'
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
   client.query(add_user(req.body.username, req.body.password), (err, db_res) => res.send(err ? err.stack : db_res.rows[0]))
);

app.post('/users/login', (req, res) => {
      const query = 'SELECT * FROM users WHERE username = $1 AND password = $2;'
      const values = [req.body.username, req.body.password]
      client.query(query, values, (err, db_res) => res.send(err ? err.stack : db_res.rows[0]))
    }
);

app.listen(process.env.PORT, () => {
    console.log(`App running on port ${process.env.PORT}`);
});
