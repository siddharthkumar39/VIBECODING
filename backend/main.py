from motor.motor_asyncio import AsyncIOMotorClient
import pandas as pd
from datetime import datetime
import os
import json
import io
import fitz  # PyMuPDF for PDF Text Extraction
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()

MONGO_URI = os.getenv("MONGO_URI")
db_client = AsyncIOMotorClient(MONGO_URI)
db = db_client.invoice_analyzer  # Database ka naam
collection = db.invoices         # Collection ka naam
# -------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_file(contents: bytes, content_type: str) -> str:
    extracted_text = ""
    
    # Logic 1: Agar file PDF hai
    if content_type == "application/pdf":
        try:
            doc = fitz.open(stream=contents, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text("text")
        except Exception as e:
            raise Exception(f"PDF se text nikalne mein error: {str(e)}")
            
    # Logic 2: Agar file Image hai
    elif content_type in ["image/jpeg", "image/png", "image/webp"]:
        try:
            # Bytes ko image mein convert karke OCR lagana
            image = Image.open(io.BytesIO(contents))
            extracted_text = pytesseract.image_to_string(image)
        except Exception as e:
            raise Exception(f"Image se OCR karne mein error: {str(e)}")
    
    if not extracted_text.strip():
        raise Exception("File mein koi readable text nahi mila.")
        
    return extracted_text

def analyze_invoice_with_groq(invoice_text: str):
    prompt = """
    You are an expert FinTech AI. Analyze the following text extracted from an invoice/receipt.
    Extract the following details:
    - merchant_name (string)
    - date (string, format YYYY-MM-DD if possible)
    - total_amount (number)
    - tax_amount (number)
    - items (list of objects with 'item_name' and 'price')
    - category (String. Strictly choose ONLY ONE from: Food, Travel, Medical, Utilities, Shopping, Entertainment, Others)

    Return the output STRICTLY as a valid JSON object.
    """
    
    # 70B model ko sirf extracted text bhej rahe hain
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": prompt
            },
            {
                "role": "user",
                "content": f"Here is the invoice text: \n\n{invoice_text}"
            }
        ],
        model="llama-3.3-70b-versatile", 
        response_format={"type": "json_object"}, # Text model ke sath JSON mode perfectly kaam karta hai
        temperature=0.0 
    )
    
    return json.loads(chat_completion.choices[0].message.content)

@app.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Upload PDF, JPG, PNG, or WEBP only.")

    try:
        contents = await file.read()
        
        # 1. Tesseract ya PyMuPDF se Text nikalo
        invoice_text = extract_text_from_file(contents, file.content_type)
        
        # 2. Text ko Groq 70B model ke paas bhejo
        ai_extracted_data = analyze_invoice_with_groq(invoice_text)
        db_document = ai_extracted_data.copy()
        db_document["uploaded_at"] = datetime.utcnow()
        
        await collection.insert_one(db_document)
        return {
            "message": "Invoice analyzed successfully by 70B Versatile!",
            "filename": file.filename,
            "extracted_data": ai_extracted_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

@app.get("/dashboard-stats")
async def get_dashboard_stats():
    try:
        # DB se saare records fetch karo (bina _id ke kyunki _id JSON serializable nahi hota)
        cursor = collection.find({}, {"_id": 0})
        invoices = await cursor.to_list(length=None)
        
        # Agar DB empty hai toh default zero values return karo
        if not invoices:
            return {
                "total_expense": 0,
                "category_summary": {},
                "merchant_summary": {}
            }
            
        # MongoDB data ko seedha Pandas DataFrame mein load karo
        df = pd.DataFrame(invoices)
        
        # Data Cleaning: Agar amount ya category missing ho toh drop/fill kardo
        df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce').fillna(0)
        df['category'] = df['category'].fillna("Others")
        df['merchant_name'] = df['merchant_name'].fillna("Unknown")
        
        # Calculations (Groupby Magic)
        total_expense = float(df['total_amount'].sum())
        
        # Category-wise sum: { "Food": 2000, "Travel": 500 }
        category_sum = df.groupby('category')['total_amount'].sum().to_dict()
        
        # Merchant-wise count: { "Zomato": 3, "Uber": 2 }
        merchant_count = df['merchant_name'].value_counts().to_dict()
        
        return {
            "total_expense": total_expense,
            "category_summary": category_sum,
            "merchant_summary": merchant_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats generate karne mein error: {str(e)}")
    
@app.get("/")
def read_root():
    return {"message": "AI Invoice Analyzer Backend is Live!"}