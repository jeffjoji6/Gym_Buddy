import sqlite3

conn = sqlite3.connect('gym_buddy.db')
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE exercises ADD COLUMN split TEXT DEFAULT 'A'")
    print("Column 'split' added successfully.")
except sqlite3.OperationalError as e:
    print(f"Error: {e}")

conn.commit()
conn.close()
