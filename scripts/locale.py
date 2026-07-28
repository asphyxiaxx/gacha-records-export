import json
import csv

def flatten_json(data, prefix=''):
    """Recursively flattens the nested dictionary into a list of (key, value) pairs."""
    items = {}
    for key, value in data.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            # Recurse if the value is another dictionary
            items.update(flatten_json(value, new_key))
        else:
            items[new_key] = value
    return items

# 1. Load your JSON file
# Replace 'i18n.json' with your actual filename
with open('i18n.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 2. Flatten the data
flattened_data = flatten_json(data)

# 3. Write to CSV
# Column 1: Key, Column 2: Base (English), Column 3: Translation
output_file = 'i18n_translation.csv'
with open(output_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['Key', 'en-US (Base)', 'New Language'])
    
    for key, value in flattened_data.items():
        writer.writerow([key, value, ''])

print(f"Successfully created {output_file}!")