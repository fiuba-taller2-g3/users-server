from flask import Flask

app = Flask(__name__)
    

@app.route('/hello/<name>')
def hello_name(name):
   return 'Hello %s!' % name

@app.route('/')
def hello_name(name):
   return 'Hello World!' % name


if __name__ == '__main__':
    app.run()
