from flask import Flask, request

app = Flask(__name__)


@app.route('/hello/<name>')
def hello_name(name):
    return 'Hello %s!' % name


@app.route('/')
def hello():
    return 'Hello World!'


@app.route('/users/login', methods=['POST'])
def users_login():
    content = request.json
    email = content.get('email')
    password = content.get('password')
    return email + password

@app.route('/admins/login', methods=['POST'])
def admins_login():
    content = request.json
    email = content.get('email')
    password = content.get('password')
    return email + password


if __name__ == '__main__':
    app.run()
