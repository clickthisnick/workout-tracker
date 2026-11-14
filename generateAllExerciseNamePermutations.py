import json
import os
import re

"""
Description:
Prints out all the unique exercise names that we have our workout json
This is useful to help populate a dropdown instead of an input box if preferrable

Usage:

python3 generateAllExerciseNamePermutations.py

Input:
None

Output:
Prints a set of all exercise names contained in the json files
"""


def load_json_with_comments(path):
    """Workout files may contain // comment lines left by the email paste flow."""
    with open(path, encoding="utf-8") as handle:
        text = handle.read()
    stripped = re.sub(r"^[ \t]*//.*$", "", text, flags=re.MULTILINE)
    return json.loads(stripped)


exercise_names = set()
exercise_json_folder = "src/workouts"
for item in os.listdir(exercise_json_folder):
    if not item.endswith(".json"):
        continue

    exercise_json_path = os.path.join(exercise_json_folder, item)
    exercise_json = load_json_with_comments(exercise_json_path)
    workouts = exercise_json.get("workouts", [])
    if not isinstance(workouts, list):
        continue

    for workout in workouts:
        if not isinstance(workout, dict):
            continue

        for exercise in workout.get("exercises") or []:
            if not isinstance(exercise, dict):
                continue
            exercise_name = exercise.get("name")
            if exercise_name:
                exercise_names.add(exercise_name)

print(exercise_names)
