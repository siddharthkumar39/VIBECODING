import requests
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
url = "https://api.groq.com/openai/v1/models"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

print("\n--- All Active Models on Groq ---\n")

if "data" in data:
    for model in data["data"]:
        print(f"✅ {model['id']}")
else:
    print("Error aagaya:", data)