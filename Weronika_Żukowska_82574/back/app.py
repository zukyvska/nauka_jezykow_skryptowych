from flask import Flask, jsonify, request
import json
import os
import time

app = Flask(__name__)


@app.after_request
def after_request(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
PYTHON_DATA = os.path.join(DATA_DIR, "python.json")
JS_DATA = os.path.join(DATA_DIR, "JS.json")
QUIZ_DATA = os.path.join(DATA_DIR, "quiz.json")
USERS_FILE = os.path.join(BASE_DIR, "users.json")


def load_data(filename):
    try:
        with open(filename, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def save_data(filename, data):
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except (IOError, TypeError):
        return False


if not os.path.exists(USERS_FILE):
    save_data(USERS_FILE, [])


@app.route("/")
def home():
    return jsonify({"app": "Learn Scripting API", "status": "działa", "version": "2.0"})


@app.route("/api/python/lessons")
def get_python_lessons():
    data = load_data(PYTHON_DATA)
    return jsonify(data)


@app.route("/api/javascript/lessons")
def get_javascript_lessons():
    data = load_data(JS_DATA)
    return jsonify(data)


@app.route("/api/quiz/<language>")
def get_quiz(language):
    all_quizzes = load_data(QUIZ_DATA)
    if language in all_quizzes:
        return jsonify(all_quizzes[language])
    return jsonify({"error": "Nie ma quizu dla " + language}), 404


@app.route("/api/check-exercise", methods=["POST"])
def check_exercise():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Brak danych"}), 400

        language = data.get("language")
        lesson_id = data.get("lesson_id")
        answer = data.get("answer", "").strip()

        if not language or not lesson_id:
            return jsonify({"error": "Brakuje language lub lesson_id"}), 400

        if language == "python":
            lessons = load_data(PYTHON_DATA)
        elif language == "javascript":
            lessons = load_data(JS_DATA)
        else:
            return jsonify({"error": "Zły język"}), 400

        for lesson in lessons:
            if lesson.get("id") == lesson_id:
                correct = lesson.get("exercise", {}).get("answer", "")
                is_correct = answer.lower() == correct.lower()

                return jsonify(
                    {
                        "correct": is_correct,
                        "message": "Dobrze!"
                        if is_correct
                        else f"Źle! Poprawna: {correct}",
                        "correct_answer": correct,
                    }
                )

        return jsonify({"error": "Nie ma takiej lekcji"}), 404

    except (KeyError, ValueError, TypeError) as e:
        return jsonify({"error": f"Błąd danych: {str(e)}"}), 400
    except Exception as _e:
        return jsonify({"error": "Wewnętrzny błąd serwera"}), 500


@app.route("/api/check-quiz", methods=["POST"])
def check_quiz():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Brak danych"}), 400

        language = data.get("language")
        answers = data.get("answers", {})

        if not language:
            return jsonify({"error": "Brakuje języka"}), 400

        quizzes = load_data(QUIZ_DATA)
        if language not in quizzes:
            return jsonify({"error": f"Nie ma quizu dla {language}"}), 404

        quiz = quizzes[language]
        score = 0
        total = len(quiz)
        results = []

        for i, question in enumerate(quiz):
            user_answer = answers.get(str(i))
            correct = question.get("correct")

            if user_answer is not None and correct is not None:
                is_correct = int(user_answer) == int(correct)
            else:
                is_correct = False

            if is_correct:
                score += 1

            results.append(
                {
                    "question": i + 1,
                    "correct": is_correct,
                    "correct_answer": correct,
                    "user_answer": user_answer,
                }
            )

        percent = int((score / total) * 100) if total > 0 else 0

        return jsonify(
            {
                "score": score,
                "total": total,
                "percent": percent,
                "passed": percent >= 70,
                "results": results,
                "message": "Świetnie!"
                if percent >= 90
                else "Dobrze!"
                if percent >= 70
                else "Spróbuj jeszcze raz!",
            }
        )

    except (KeyError, ValueError, TypeError) as e:
        return jsonify({"error": f"Błąd danych quizu: {str(e)}"}), 400
    except Exception as _e:
        return jsonify({"error": "Wewnętrzny błąd serwera"}), 500


@app.route("/api/register", methods=["POST"])
def register_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Brak danych"}), 400

        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        if not username:
            return jsonify({"error": "Podaj nazwę użytkownika"}), 400

        if len(username) < 3:
            return jsonify({"error": "Nazwa musi mieć minimum 3 znaki"}), 400

        users = load_data(USERS_FILE)

        for user in users:
            if user.get("username") == username:
                return jsonify({"error": "Nazwa już zajęta"}), 400

        new_user = {
            "id": len(users) + 1,
            "username": username,
            "email": email,
            "password": password,
            "created": time.time(),
            "last_login": time.time(),
            "progress": {
                "python": {"lessons": [], "quizzes": []},
                "javascript": {"lessons": [], "quizzes": []},
            },
        }

        users.append(new_user)
        success = save_data(USERS_FILE, users)

        if not success:
            return jsonify({"error": "Błąd zapisu użytkownika"}), 500

        return jsonify(
            {
                "success": True,
                "user": {
                    "id": new_user["id"],
                    "username": new_user["username"],
                    "email": new_user["email"],
                },
            }
        )

    except (KeyError, ValueError, TypeError) as e:
        return jsonify({"error": f"Błąd danych: {str(e)}"}), 400
    except Exception as _e:
        return jsonify({"error": "Wewnętrzny błąd serwera"}), 500


@app.route("/api/login", methods=["POST"])
def login_user():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Brak danych"}), 400

        username = data.get("username", "").strip()
        password = data.get("password", "").strip()

        if not username or not password:
            return jsonify({"error": "Podaj nazwę i hasło"}), 400

        users = load_data(USERS_FILE)

        for user in users:
            if user.get("username") == username and user.get("password") == password:
                user["last_login"] = time.time()
                save_data(USERS_FILE, users)

                return jsonify(
                    {
                        "success": True,
                        "user": {
                            "id": user["id"],
                            "username": user["username"],
                            "email": user["email"],
                        },
                    }
                )

        return jsonify({"error": "Błędne dane logowania"}), 401

    except (KeyError, ValueError, TypeError) as e:
        return jsonify({"error": f"Błąd danych: {str(e)}"}), 400
    except Exception as _e:
        return jsonify({"error": "Wewnętrzny błąd serwera"}), 500


@app.route("/api/user/<int:user_id>/stats")
def get_user_stats(user_id):
    try:
        users = load_data(USERS_FILE)

        for user in users:
            if user.get("id") == user_id:
                stats = {
                    "username": user["username"],
                    "python": {
                        "lessons_completed": len(user["progress"]["python"]["lessons"]),
                        "quizzes_taken": len(user["progress"]["python"]["quizzes"]),
                        "average_score": 0,
                    },
                    "javascript": {
                        "lessons_completed": len(
                            user["progress"]["javascript"]["lessons"]
                        ),
                        "quizzes_taken": len(user["progress"]["javascript"]["quizzes"]),
                        "average_score": 0,
                    },
                }

                for lang in ["python", "javascript"]:
                    quizzes = user["progress"][lang]["quizzes"]
                    if quizzes:
                        total = sum(q.get("percent", 0) for q in quizzes)
                        stats[lang]["average_score"] = round(total / len(quizzes), 1)

                return jsonify(stats)

        return jsonify({"error": "Użytkownik nie znaleziony"}), 404

    except Exception as _e:
        return jsonify({"error": "Wewnętrzny błąd serwera"}), 500


@app.route("/api/stats")
def get_system_stats():
    try:
        python_lessons = load_data(PYTHON_DATA)
        js_lessons = load_data(JS_DATA)
        users = load_data(USERS_FILE)

        active_users = 0
        current_time = time.time()
        for user in users:
            if current_time - user.get("last_login", 0) < 86400:
                active_users += 1

        stats = {
            "python_lessons": len(python_lessons),
            "javascript_lessons": len(js_lessons),
            "total_users": len(users),
            "active_today": active_users,
            "total_quizzes": 6,
        }

        return jsonify(stats)

    except Exception as _e:
        return jsonify(
            {
                "python_lessons": 3,
                "javascript_lessons": 3,
                "total_users": 1,
                "active_today": 1,
                "total_quizzes": 6,
            }
        )


@app.route("/api/ranking")
def get_ranking():
    try:
        users = load_data(USERS_FILE)

        ranked_users = []
        for user in users:
            python_score = (
                len(user["progress"]["python"]["lessons"]) * 10
                + len(user["progress"]["python"]["quizzes"]) * 5
            )
            js_score = (
                len(user["progress"]["javascript"]["lessons"]) * 10
                + len(user["progress"]["javascript"]["quizzes"]) * 5
            )
            total_score = python_score + js_score

            ranked_users.append(
                {
                    "id": user["id"],
                    "username": user["username"],
                    "score": total_score,
                    "python_progress": len(user["progress"]["python"]["lessons"]),
                    "js_progress": len(user["progress"]["javascript"]["lessons"]),
                }
            )

        ranked_users.sort(key=lambda x: x["score"], reverse=True)
        return jsonify(ranked_users[:10])

    except Exception as _e:
        dummy_ranking = [
            {"id": 1, "username": "MistrzKodu", "score": 450},
            {"id": 2, "username": "PythonGuru", "score": 420},
            {"id": 3, "username": "JSExpert", "score": 380},
            {"id": 4, "username": "NowyUżytkownik", "score": 150},
        ]
        return jsonify(dummy_ranking)


@app.route("/api/health")
def health_check():
    return jsonify(
        {
            "status": "ok",
            "timestamp": time.time(),
            "files": {
                "python_lessons": os.path.exists(PYTHON_DATA),
                "javascript_lessons": os.path.exists(JS_DATA),
                "quizzes": os.path.exists(QUIZ_DATA),
                "users": os.path.exists(USERS_FILE),
            },
        }
    )


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Nie znaleziono"}), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({"error": "Metoda niedozwolona"}), 405


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Wewnętrzny błąd serwera"}), 500


if __name__ == "__main__":
    print("=" * 50)
    print("BACKEND URUCHOMIONY")
    print(f"Python: {PYTHON_DATA}")
    print(f"JavaScript: {JS_DATA}")
    print(f"Quiz: {QUIZ_DATA}")
    print(f"Users: {USERS_FILE}")
    print("API: http://localhost:5000")
    print("=" * 50)

    for filepath in [PYTHON_DATA, JS_DATA, QUIZ_DATA]:
        if not os.path.exists(filepath):
            print(f"Ostrzeżenie: {filepath} nie istnieje!")

    app.run(debug=True, port=5000)
