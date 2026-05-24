from typing import List
from motor.motor_asyncio import AsyncIOMotorClient
import pandas as pd
from datetime import datetime, timedelta
import os
import json
import io
import fitz  # PyMuPDF for PDF Text Extraction
import pytesseract
import asyncio
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

# Smart Fix: Windows aur Linux (Render) ke liye Tesseract path
if os.name == 'nt':  
    pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

from passlib.context import CryptContext
import jwt
from pydantic import BaseModel

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic Models for Data Validation
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
     allow_origins=["https://vibecoding-pow1.onrender.com", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
MONGO_URI = os.getenv("MONGO_URI")
db_client = AsyncIOMotorClient(MONGO_URI)
db = db_client.invoice_analyzer  
collection = db.invoices         

def extract_text_from_file(contents: bytes, content_type: str) -> str:
    extracted_text = ""
    
    if content_type == "application/pdf":
        try:
            doc = fitz.open(stream=contents, filetype="pdf")
            for page in doc:
                extracted_text += page.get_text("text")
        except Exception as e:
            raise Exception(f"PDF se text nikalne mein error: {str(e)}")
            
    elif content_type in ["image/jpeg", "image/png", "image/webp"]:
        try:
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
    
    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": f"Here is the invoice text: \n\n{invoice_text}"}
        ],
        model="llama-3.3-70b-versatile", 
        response_format={"type": "json_object"}, 
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
        invoice_text = extract_text_from_file(contents, file.content_type)
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
async def get_dashboard_stats(batch_id: str = None): 
    try:
        if not batch_id:
            return {"total_expense": 0, "total_tax": 0, "category_summary": {}, "merchant_summary": {}}

        query = {"batch_id": batch_id}
        cursor = collection.find(query, {"_id": 0})
        invoices = await cursor.to_list(length=None)
        
        if not invoices:
            return {"total_expense": 0, "total_tax": 0, "category_summary": {}, "merchant_summary": {}}
            
        df = pd.DataFrame(invoices)
        df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce').fillna(0)
        df['tax_amount'] = pd.to_numeric(df['tax_amount'], errors='coerce').fillna(0)
        df['category'] = df['category'].fillna("Others")
        df['merchant_name'] = df['merchant_name'].fillna("Unknown")
        
        total_expense = float(df['total_amount'].sum())
        total_tax = float(df['tax_amount'].sum())
        category_sum = df.groupby('category')['total_amount'].sum().to_dict()
        merchant_count = df['merchant_name'].value_counts().to_dict()
        
        return {
            "total_expense": total_expense,
            "total_tax": total_tax,
            "category_summary": category_sum,
            "merchant_summary": merchant_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
 
@app.get("/")
def read_root():
    return {"message": "AI Invoice Analyzer Backend is Live!"}

# SIRF EK BAAR FUNCTION: Ye function theek se error print karega ab!
async def process_single_file(file: UploadFile, batch_id: str, sem: asyncio.Semaphore):
    async with sem: 
        try:
            contents = await file.read()
            
            invoice_text = await asyncio.to_thread(extract_text_from_file, contents, file.content_type)
            ai_extracted_data = await asyncio.to_thread(analyze_invoice_with_groq, invoice_text)
            
            db_document = ai_extracted_data.copy()
            db_document["uploaded_at"] = datetime.utcnow()
            db_document["source_file"] = file.filename
            db_document["batch_id"] = batch_id 
            
            await collection.insert_one(db_document)
            return {"status": "success", "filename": file.filename, "data": ai_extracted_data}
            
        except Exception as e:
            # YAHAN ERROR PRINT HOGA
            print(f"❌ ASLI ERROR '{file.filename}' MEIN YE HAI: {str(e)}")
            return {"status": "failed", "filename": file.filename, "reason": str(e)}

@app.post("/upload-batch")
async def upload_batch_invoices(
    files: List[UploadFile] = File(...),
    batch_id: str = Form(...)
):
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    successful_uploads = []
    failed_uploads = []
    valid_files = []

    for file in files:
        if file.content_type not in allowed_types:
            failed_uploads.append({"filename": file.filename, "reason": "Invalid file type"})
        else:
            valid_files.append(file)

    sem = asyncio.Semaphore(10) 
    
    tasks = [process_single_file(file, batch_id, sem) for file in valid_files]
    results = await asyncio.gather(*tasks)

    for res in results:
        if res["status"] == "success":
            successful_uploads.append({"filename": res["filename"], "data": res["data"]})
        else:
            failed_uploads.append({"filename": res["filename"], "reason": res["reason"]})

    return {
        "message": f"Batch process complete! {len(successful_uploads)} success.",
        "successful_uploads": successful_uploads,
        "failed_uploads": failed_uploads
    }

@app.post("/signup")
async def signup(user: UserCreate):
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(user.password)

    new_user = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(new_user)
    return {"message": "User created successfully"}

@app.post("/login")
async def login(user: UserLogin):
    db_user = await db.users.find_one({"email": user.email})
    
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    expiration = datetime.utcnow() + timedelta(hours=24) 
    token_payload = {"sub": user.email, "exp": expiration}
    token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "message": "Login successful", 
        "access_token": token, 
        "name": db_user["name"]
    }

@app.get("/insights")
async def get_financial_insights(batch_id: str = None):
    if not batch_id:
        return {"summary": "", "insights": [], "recommendations": []}
    
    try:
        query = {"batch_id": batch_id}
        cursor = collection.find(query, {"_id": 0})
        invoices = await cursor.to_list(length=None)
        
        if not invoices:
            return {"summary": "No data found.", "insights": [], "recommendations": []}
            
        df = pd.DataFrame(invoices)
        df['total_amount'] = pd.to_numeric(df['total_amount'], errors='coerce').fillna(0)
        df['category'] = df['category'].fillna("Others")
        category_sum = df.groupby('category')['total_amount'].sum().to_dict()
        
        prompt = f"""
        Act as an expert financial advisor. Based on the following spending summary of a user:
        {json.dumps(category_sum)}
        
        Provide your analysis in exactly 3 distinct sections:
        1. 'summary': A brief 2-sentence overall summary of their spending behavior.
        2. 'insights': A list of 3 specific, data-driven observations (e.g., "70% of your budget went to Food").
        3. 'recommendations': A brief list of 2 highly actionable, practical tips to save money tailored to this pattern.
        
        Return the output STRICTLY as a valid JSON object with the keys 'summary' (string), 'insights' (list of strings), and 'recommendations' (list of strings).
        """
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "system", "content": prompt}],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},
            temperature=0.7 
        )
        
        insights_data = json.loads(chat_completion.choices[0].message.content)
        return insights_data
        
    except Exception as e:
        print(f"Error: {e}") 
        return {"summary": "Error generating analysis.", "insights": [], "recommendations": []} 