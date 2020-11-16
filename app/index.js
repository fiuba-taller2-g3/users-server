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
   id SERIAL,\
   email VARCHAR(50) NOT NULL PRIMARY KEY,\
   password VARCHAR(50) NOT NULL,\
   name VARCHAR(15) NOT NULL,\
   surname VARCHAR(20) NOT NULL,\
   type VARCHAR(10) NOT NULL,\
   phone_number VARCHAR(10) NOT NULL,\
   gender VARCHAR(10) NOT NULL,\
   birth_date DATE NOT NULL,\
   is_blocked BOOLEAN DEFAULT false\
);\
";

const CREATE_ADMINS_TABLE_CMD = "\
CREATE TABLE IF NOT EXISTS admins (\
   id SERIAL,\
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


function add_user_query(email, password, name, surname, type, phone_number, gender, birth_date) {
    return 'INSERT INTO users(email, password, name, surname, type, phone_number, gender, birth_date)\nVALUES (\'' + email + '\', \'' + password + '\', \'' + name + '\', \'' + surname + '\', \'' + type + '\', \'' + phone_number + '\', \'' + gender + '\', \'' + birth_date + '\');'
}

function add_admin_query(email, password, name, surname, dni) {
    return 'INSERT INTO admins(email, password, name, surname, dni)\nVALUES (\'' + email + '\', \'' + password + '\', \'' + name + '\', \'' + surname + '\', \'' + dni + '\');'
}

function manage_register_response(query, res, type) {
    client.query(query, (err, db_res) => {
        if (err)
            if (err.code == 23505) {
                res.status(409).json({"error": `El ${type} ya esta registrado en el sistema`})
            } else
                res.status(500).json({"error": err.stack})
        else
            res.json({"msg": `${type} registrado exitosamente`})
    })
}

function manage_login_response(query, values, res, type) {
    client.query(query, values, (err, db_res) => {
        if (err) {
            res.status(500).send(err.messageerror)
        } else if (db_res.rows.length == 0) {
            res.status(404).json({"error": "Email y/o contraseña invalidos"})
        } else {
            if (db_res.rows[0].is_blocked) {
                res.status(403).json({"error": "El usuario está bloqueado"})
            } else {
                res.json({"msg": `${type} logueado exitosamente`, "exp": "", "id": db_res.rows[0].id})
            }
        }
    })
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
    const query = add_user_query(req.body.email, req.body.password, req.body.name, req.body.surname, req.body.type,
        req.body.phone_number, req.body.gender, req.body.birth_date)
    manage_register_response(query, res, "Usuario");
});

app.post('/admins', (req, res) => {
    const query = add_admin_query(req.body.email, req.body.password, req.body.name, req.body.surname, req.body.dni)
    manage_register_response(query, res, "Administrador");
});

app.post('/users/login', (req, res) => {
    const query = 'SELECT * FROM users WHERE email = $1 AND password = $2;'
    const values = [req.body.email, req.body.password]
    manage_login_response(query, values, res, "Usuario");
});

app.post('/admins/login', (req, res) => {
    const query = 'SELECT * FROM admins WHERE email = $1 AND password = $2;'
    const values = [req.body.email, req.body.password]
    manage_login_response(query, values, res, "Administrador");
});

app.get('/users/:user_id', (req, res) => {
    const query = 'SELECT * FROM users WHERE id = $1;'
    const values = [req.params.user_id]
    client.query(query, values, (err, db_res) => {
        if (err) {
            res.status(500).send(err.messageerror)
        }
        if (db_res.rows.length == 0) {
            res.status(404).json({"error": "Usuario no encontrado"})
        } else {
            const user = db_res.rows[0]
            res.json({
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "surname": user.surname,
                "type": user.type,
                "phone_number": user.phone_number,
                "gender": user.gender,
                "birth_date": user.birth_date
            })
        }
    })
});

app.get('/users', (req, res) => {
    const query = 'SELECT id, email FROM users;'
    client.query(query, (err, db_res) => {
        if (err) {
            res.status(500).send(err.messageerror)
        }
        if (db_res.rows.length == 0) {
            res.status(404).json({"error": "No hay usuarios para mostrar"})
        } else {
            var users = []
            db_res.rows.forEach(user => users.push(new User(user.id, user.email, user.name, user.surname, user.type)))
            res.json(users)
        }
    })
});

app.patch('/users/:user_id', (req, res) => {
    const query = 'UPDATE users SET is_blocked = $1 WHERE id = $2;'
    const values = [req.body.is_blocked, req.params.user_id]
    client.query(query, values, (err, db_res) => {
        console.log(db_res)
        if (err) {
            res.status(500).send(err.messageerror)
        } else {
            res.json({"msg": "El usuario fue actualizado"})
        }
    })
});

app.put('/users/:user_id', (req, res) => {
    const query = 'UPDATE users SET email = $1, password = $2, name = $3, surname = $4, phone_number = $5, gender = $6, birth_date = $7 WHERE id = $8;'
    const values = [req.body.email, req.body.password, req.body.name, req.body.surname, req.body.phone_number, req.body.gender, req.body.birth_date, req.params.user_id]
    console.log(query)
    console.log(values)
    client.query(query, values, (err, db_res) => {
        console.log(db_res)
        if (err) {
            res.status(500).send(err.messageerror)
        } else {
            res.json({"msg": "El usuario fue actualizado"})
        }
    })
});

app.listen(process.env.PORT, () => {
    console.log(`App running on port ${process.env.PORT}`);
});

class User {
    constructor(id, email, name, surname, type, phone_number, gender, birth_date) {
        this.id = id;
        this.email = email;
        this.name = name;
        this.surname = surname;
        this.type = type;
        this.phone_number = phone_number;
        this.gender = gender;
        this.birth_date = birth_date;
    }
}