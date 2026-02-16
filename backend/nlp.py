import re
from fuzzywuzzy import process

class NLPProcessor:
    def parse_command(self, text: str, available_exercises: list[str]):
        """
        Parses natural language command into structured data.
        Returns: strictured dict or None if exercise not found.
        """
        text = text.lower()
        
        # 1. Find exercise
        best_match, score = process.extractOne(text, available_exercises)
        if score < 60: # Threshold
            return None, "Exercise not found"
            
        exercise_name = best_match
        
        # 2. Extract numbers
        # Remove exercise name roughly from text (not perfect but okay)
        # We assume numbers are distinct from exercise name
        
        # Use regex to find weight and reps
        # patterns: 
        # "100 kg 5 reps"
        # "100 for 5"
        # "5 reps at 100"
        
        weight = 0
        reps = 0
        
        # Explicit units
        kg_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilos|lbs|pounds)', text)
        if kg_match:
            weight = float(kg_match.group(1))
            
        reps_match = re.search(r'(\d+)\s*(?:reps|repetitions)', text)
        if reps_match:
            reps = int(reps_match.group(1))
            
        # If both found, great.
        if weight > 0 and reps > 0:
            return {"exercise": exercise_name, "weight": weight, "reps": reps}, None
            
        # Implicit "X for Y" or "X x Y"
        # "100 x 5"
        x_match = re.search(r'(\d+(?:\.\d+)?)\s*[xX*]\s*(\d+)', text)
        if x_match:
            return {"exercise": exercise_name, "weight": float(x_match.group(1)), "reps": int(x_match.group(2))}, None
            
        # "100 for 5"
        for_match = re.search(r'(\d+(?:\.\d+)?)\s*for\s*(\d+)', text)
        if for_match:
            return {"exercise": exercise_name, "weight": float(for_match.group(1)), "reps": int(for_match.group(2))}, None
            
        # Fallback: Just 2 numbers in the string
        numbers = re.findall(r'\d+(?:\.\d+)?', text)
        numbers = [float(n) for n in numbers]
        
        # Filter out numbers that might be part of exercise name (e.g. "Sim 2")? 
        # Hard to know without specific logic.
        # Assuming exercise names don't have numbers usually.
        
        if len(numbers) >= 2:
            # Assume first is weight, second is reps. heavy first.
            if numbers[0] > numbers[1]:
                 weight = numbers[0]
                 reps = int(numbers[1])
            else:
                 # "12 reps 20 kg" -> 12, 20. 
                 # Usually weight > reps? Not always (lateral raises).
                 # Default logic: Weight, Reps.
                 weight = numbers[0]
                 reps = int(numbers[1])
            return {"exercise": exercise_name, "weight": weight, "reps": reps}, None

        if len(numbers) == 1:
             # Assume text contains only one number?
             # Could be reps? Or weight?
             # "12 reps" (handled above)
             # "20 kg" (handled above)
             # Just "20"? Ambiguous.
             return None, f"Could not extract both weight and reps from '{text}'"
             
        return None, "No numbers found"

