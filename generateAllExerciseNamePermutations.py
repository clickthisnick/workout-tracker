import os
import json

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


exercise_names = set()
exercise_json_folder = "src/workouts"
for item in os.listdir(exercise_json_folder):
    if not item.endswith(".json"):
        continue

    exercise_json_path = os.path.join(exercise_json_folder, item)
    with open(exercise_json_path) as f:
        contents = f.read()

    exercise_json = json.loads(contents)

    for workout in exercise_json["workouts"]:
        if "exercises" not in workout:
            continue

        for exercise in workout["exercises"]:
            exercise_name = exercise["name"]
            if exercise_name:
                exercise_names.add()
        
print(exercise_names)