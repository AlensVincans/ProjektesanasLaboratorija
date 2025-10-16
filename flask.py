from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/data')
def get_data():
    return jsonify({"message": "Привет, данные успешно полуены!"})

if __name__ == "__main__":
    app.run(debug=True)
