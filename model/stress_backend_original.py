import pandas as pd
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

# ---------- Progress tracking (removed - using randomization instead) ----------
# Progress tracking functions removed since we now use random question selection

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
    
    emotional_df = pd.read_csv("datasets/emotional.csv")
    safety_df = pd.read_csv("datasets/safety.csv")
    confidence_df = pd.read_csv("datasets/confidence.csv")
    social_df = pd.read_csv("datasets/social_support.csv")
    time_df = pd.read_csv("datasets/time_management.csv")

    if role == "student":
        role_df = pd.read_csv("datasets/student.csv")
    elif role == "working_women":
        role_df = pd.read_csv("datasets/working_women.csv")
    else:
        role_df = pd.read_csv("datasets/housewife.csv")

    # Get random indices for each category
    emotional_idx = random.randint(0, len(emotional_df) - 1)
    safety_idx = random.randint(0, len(safety_df) - 1)
    confidence_idx = random.randint(0, len(confidence_df) - 1)
    social_idx = random.randint(0, len(social_df) - 1)
    time_idx = random.randint(0, len(time_df) - 1)

    # Get random questions from universal categories
    universal_questions = pd.concat([
        emotional_df.iloc[[emotional_idx]],
        safety_df.iloc[[safety_idx]],
        confidence_df.iloc[[confidence_idx]],
        social_df.iloc[[social_idx]],
        time_df.iloc[[time_idx]]
    ])

    # Get 3 random questions from role-specific categories
    # Each category has 50 questions, so we pick random ones from each section
    role_q1_idx = random.randint(0, 49)      # from rows 0–49
    role_q2_idx = random.randint(50, 99)     # from rows 50–99  
    role_q3_idx = random.randint(100, 149)  # from rows 100–149

    q1 = role_df.iloc[role_q1_idx]
    q2 = role_df.iloc[role_q2_idx]
    q3 = role_df.iloc[role_q3_idx]

    role_questions = pd.DataFrame([q1, q2, q3])

    questions = pd.concat([universal_questions, role_questions]).reset_index(drop=True)
    
    # Shuffle the questions to randomize order
    questions = questions.sample(frac=1).reset_index(drop=True)
    
    return questions, 0  # Return 0 as index since we're not tracking sequential progress anymore

#-------------------Evaluate-Stress--------------------------------
def evaluate_stress(role, answers):
    questions_df, _ = get_questions(role)
    score = sum(answers)
    level = calculate_stress_level(score)
    stressed_categories = analyze_subcategory_stress(questions_df, answers)
    detailed_feedback = generate_detailed_feedback(stressed_categories)

    return {
        "stress_level": level.title() + " Stress",
        "score": score,
        "subcategory_analysis": list(stressed_categories),
        "tips": detailed_feedback
    }

#-------------------Sub-Category stress detection -------------------------
def analyze_subcategory_stress(questions_df, answers):
    stressed_categories = set()
    
    for i, response in enumerate(answers):
        if response >= 4:
            raw_category = questions_df.iloc[i]['Category']
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
    for i, row in questions.iterrows():
        print(f"\nQ{i+1}: {row['Question']}")
        for j in range(1, 6):
            print(f"  {j}. {row[f'Option{j}']}")
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
