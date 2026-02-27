from flask import Flask, request, jsonify
from flask_cors import CORS
import stress_backend_simple
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route("/get-questions", methods=["POST"])
def get_questions():
    try:
        data = request.get_json()
        role = data.get("role")
        print(f"Received request for role: {role}")
        
        if role not in ["student", "working_women", "housewife"]:
            print(f"Invalid role: {role}")
            return jsonify({"error": "Invalid role"}), 400

        print(f"Getting questions for role: {role}")
        questions_list, _ = stress_backend_simple.get_questions(role)
        
        # Temporarily disable data cleaning to debug
        print(f"Returning {len(questions_list)} questions")
        return jsonify({"questions": questions_list})
    except Exception as e:
        print(f"Error in get_questions: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/submit-answers", methods=["POST"])
def submit_answers():
    try:
        data = request.get_json()
        role = data.get("role")
        answers = data.get("answers")
        print(f"Received answers for role: {role}, answers: {answers}")

        if role not in ["student", "working_women", "housewife"]:
            print(f"Invalid role: {role}")
            return jsonify({"error": "Invalid role"}), 400
        if not isinstance(answers, list) or len(answers) != 8:
            print(f"Invalid answers: {answers}")
            return jsonify({"error": "Answers must be a list of 8 integers"}), 400

        print(f"Evaluating stress for role: {role}")
        result = stress_backend_simple.evaluate_stress(role, answers)
        print(f"Stress evaluation result: {result}")
        return jsonify(result)
    except Exception as e:
        print(f"Error in submit_answers: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "message": "Stress model API is running"})

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug, host='0.0.0.0', port=port)


