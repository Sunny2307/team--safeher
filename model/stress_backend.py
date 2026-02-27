import csv
import os
import json
import re
import random

#----------Mapping----------------------
CATEGORY_FEEDBACK = {
    "emotional": {
        "title": "Emotional Well-being",
        "explanation": "You may be feeling overwhelmed, anxious, or emotionally drained.",
        "tip": "Try journaling or talking to someone you trust about your feelings."
    },
    "safety": {
        "title": "Sense of Safety",
        "explanation": "You may be experiencing discomfort or fear in your current environment.",
        "tip": "Consider setting boundaries or discussing concerns with someone in authority."
    },
    "confidence": {
        "title": "Self-Confidence",
        "explanation": "You may be struggling with self-doubt or low self-esteem.",
        "tip": "Celebrate small wins and avoid harsh self-judgment."
    },
    "social_support": {
        "title": "Social Support",
        "explanation": "You might be feeling isolated or lacking emotional connection.",
        "tip": "Reach out to friends, family, or communities you trust."
    },
    "time_management": {
        "title": "Time Management",
        "explanation": "You might be having trouble keeping up with tasks or deadlines.",
        "tip": "Try breaking large tasks into smaller ones and prioritize key actions."
    },
    "work_life_balance": {
        "title": "Work-Life Balance",
        "explanation": "You may be feeling stretched between your professional and personal responsibilities.",
        "tip": "Establish boundaries and give yourself permission to rest and recharge."
    },
    "career_growth_anxiety": {
        "title": "Career Growth Anxiety",
        "explanation": "Uncertainty or pressure about your career progress might be affecting your mental clarity.",
        "tip": "Focus on skills and progress, not just outcomes. A clear plan and small wins help."
    },
    "job_workload": {
        "title": "Job Workload & Deadlines",
        "explanation": "High work volume and time pressure might be leading to overwhelm.",
        "tip": "Break large tasks into smaller ones, delegate if possible, and pace your energy."
    },
    "peer_pressure": {
        "title": "Peer Stress / Social Comparison",
        "explanation": "You might be comparing yourself to peers or feeling pressure to meet external expectations.",
        "tip": "Stay grounded in your goals. Everyone's path is unique and valid."
    },
    "parental_expectations": {
        "title": "Parental Expectations",
        "explanation": "You may feel pressure to meet expectations set by your family or culture.",
        "tip": "Open communication can help manage expectations. Don't lose sight of your own dreams."
    },
    "academic_pressure": {
        "title": "Academic Pressure",
        "explanation": "Heavy academic demands or fear of underperforming might be stressing you.",
        "tip": "Try time-blocking and asking for academic help. Progress over perfection."
    },
    "domestic_workload": {
        "title": "Domestic Workload",
        "explanation": "Household responsibilities might be creating fatigue or lack of personal time.",
        "tip": "Ask for help, set routines, and carve out time for yourself without guilt."
    },
    "self_worth": {
        "title": "Recognition & Self-Worth",
        "explanation": "You might feel underappreciated or doubt your value.",
        "tip": "Acknowledge your contributions. Your worth is not defined by external approval."
    },
    "financial_dependency": {
        "title": "Financial Dependency",
        "explanation": "You may feel a lack of financial control or independence.",
        "tip": "Small financial steps and planning can improve both autonomy and peace of mind."
    }
}

def read_csv_to_list(filename):
    """Read CSV file and return as list of dictionaries"""
    questions = []
    try:
        with open(filename, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                questions.append(row)
    except FileNotFoundError:
        print(f"Warning: {filename} not found")
    return questions

# ---------- Stress calculation ----------
def calculate_stress_level(score):
    if score <= 16:
        return "low"
    elif score <= 27:
        return "medium"
    else:
        return "high"

# ---------- Question loading ----------
def get_questions(role):
    # Generate random indices for each category
    random.seed()  # Use current time as seed for true randomization
    
    # Read CSV files
    emotional_questions = read_csv_to_list("datasets/emotional.csv")
    safety_questions = read_csv_to_list("datasets/safety.csv")
    confidence_questions = read_csv_to_list("datasets/confidence.csv")
    social_questions = read_csv_to_list("datasets/social_support.csv")
    time_questions = read_csv_to_list("datasets/time_management.csv")

    if role == "student":
        role_questions = read_csv_to_list("datasets/student.csv")
    elif role == "working_women":
        role_questions = read_csv_to_list("datasets/working_women.csv")
    else:
        role_questions = read_csv_to_list("datasets/housewife.csv")

    # Get random questions from universal categories
    universal_questions = []
    
    if emotional_questions:
        universal_questions.append(random.choice(emotional_questions))
    if safety_questions:
        universal_questions.append(random.choice(safety_questions))
    if confidence_questions:
        universal_questions.append(random.choice(confidence_questions))
    if social_questions:
        universal_questions.append(random.choice(social_questions))
    if time_questions:
        universal_questions.append(random.choice(time_questions))

    # Get 3 random questions from role-specific categories
    role_selected = []
    if role_questions:
        # Ensure we have enough questions
        if len(role_questions) >= 3:
            role_selected = random.sample(role_questions, 3)
        else:
            role_selected = role_questions

    # Combine all questions
    all_questions = universal_questions + role_selected
    
    # Shuffle the questions to randomize order
    random.shuffle(all_questions)
    
    return all_questions, 0  # Return 0 as index since we're not tracking sequential progress anymore

#-------------------Evaluate-Stress--------------------------------
def evaluate_stress(role, answers):
    questions_list, _ = get_questions(role)
    score = sum(answers)
    level = calculate_stress_level(score)
    stressed_categories = analyze_subcategory_stress(questions_list, answers)
    detailed_feedback = generate_detailed_feedback(stressed_categories)

    return {
        "stress_level": level.title() + " Stress",
        "score": score,
        "subcategory_analysis": list(stressed_categories),
        "tips": detailed_feedback
    }

#-------------------Sub-Category stress detection -------------------------
def analyze_subcategory_stress(questions_list, answers):
    stressed_categories = set()
    
    for i, response in enumerate(answers):
        if response >= 4 and i < len(questions_list):
            raw_category = questions_list[i].get('Category', '')
            normalized = normalize_category_name(raw_category)
            stressed_categories.add(normalized)
    
    return stressed_categories

def normalize_category_name(raw_category):
    cat = raw_category.lower().strip()
    cat = re.sub(r'[^a-z0-9\s]', '', cat)  # removes /, -, etc.

    if "emotional" in cat:
        return "emotional"
    elif "safety" in cat:
        return "safety"
    elif "confidence" in cat:
        return "confidence"
    elif "peer" in cat or "comparison" in cat:
        return "peer_pressure"
    elif "social" in cat:
        return "social_support"
    elif "time" in cat:
        return "time_management"
    elif "academic" in cat:
        return "academic_pressure"
    elif "career growth" in cat:
        return "career_growth_anxiety"
    elif "job workload" in cat or "deadlines" in cat:
        return "job_workload"
    elif "work-life" in cat or "balance" in cat:
        return "work_life_balance"
    elif "domestic" in cat:
        return "domestic_workload"
    elif "recognition" in cat or "self worth" in cat:
        return "self_worth"
    elif "parental" in cat:
        return "parental_expectations"
    elif "financial" in cat:
        return "financial_dependency"
    else:
        return cat.replace(" ", "_")

def generate_detailed_feedback(stressed_categories):
    feedback = []
    
    for category in stressed_categories:
        data = CATEGORY_FEEDBACK.get(category)
        if data:
            feedback.append(
                f"⚠️ **{data['title']}**\n"
                f"{data['explanation']}\n"
                f"💡 _Tip_: {data['tip']}\n"
            )
        else:
            feedback.append(f"⚠️ Stress detected in: {category.replace('_', ' ').title()}")
    
    return "\n".join(feedback)

# ---------- Example usage for testing ----------
if __name__ == "__main__":
    role = input("Enter role (student, working_women, housewife): ").strip().lower()
    questions, index = get_questions(role)
    print(index)
    print(f"\nToday's Quiz for {role.capitalize()}:")
    answers = []
    for i, question in enumerate(questions):
        print(f"\nQ{i+1}: {question['Question']}")
        for j in range(1, 6):
            print(f"  {j}. {question[f'Option{j}']}")
        while True:
            try:
                val = int(input(f"Your answer for Q{i+1} (1-5): "))
                if val in [1,2,3,4,5]:
                    answers.append(val)
                    break
            except:
                continue

    score = sum(answers)
    level = calculate_stress_level(score)
    stressed_categories = analyze_subcategory_stress(questions, answers)
    detailed_feedback = generate_detailed_feedback(stressed_categories)
    print(f"\nYour Score: {score} — Stress Level: {level.upper()}")
    if detailed_feedback:
        print("\n🧠 Here's what we observed:\n")
        print(detailed_feedback)
    else:
        print("\n🎉 Great! No concerning stress patterns detected.")
