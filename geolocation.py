from flask import Flask, render_template, jsonify

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/location', methods=['POST'])
def location():
    return jsonify({'status': 'success'})

if __name__ == '__main__':
    app.run(debug=True)
