from typing import List
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
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from dotenv import load_dotenv

# Naye imports add karo
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel

# Password hashing context (Bcrypt apne aap SALTING handle karta hai)
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
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
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
async def get_dashboard_stats(batch_id: str = None): # NAYA: Optional batch_id param
    try:
        # NAYA LOGIC: Agar batch_id aayi hai, toh sirf uska data dhoondo. Nahi toh kuch mat do.
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

from typing import List # Top par yeh import zaroor add karna

# ... (tumhara baaki ka purana code) ...

@app.post("/upload-batch")
async def upload_batch_invoices(
    files: List[UploadFile] = File(...),
    batch_id: str = Form(...)  # NAYA: Frontend se batch_id aayega
):
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    successful_uploads = []
    failed_uploads = []

    for file in files:
        if file.content_type not in allowed_types:
            failed_uploads.append({"filename": file.filename, "reason": "Invalid file type"})
            continue
            
        try:
            contents = await file.read()
            invoice_text = extract_text_from_file(contents, file.content_type)
            ai_extracted_data = analyze_invoice_with_groq(invoice_text)
            
            db_document = ai_extracted_data.copy()
            db_document["uploaded_at"] = datetime.utcnow()
            db_document["source_file"] = file.filename
            db_document["batch_id"] = batch_id # NAYA: DB me batch_id save kar rahe hain
            
            await collection.insert_one(db_document)
            successful_uploads.append({"filename": file.filename, "data": ai_extracted_data})
        except Exception as e:
            failed_uploads.append({"filename": file.filename, "reason": str(e)})

    return {
        "message": f"Batch process complete! {len(successful_uploads)} success.",
        "successful_uploads": successful_uploads,
        "failed_uploads": failed_uploads
    }
@app.post("/signup")
async def signup(user: UserCreate):
    # 1. Check karo email pehle se toh nahi hai
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # 2. Password ko Hash aur Salt karo
    hashed_password = pwd_context.hash(user.password)

    # 3. Database me save karo (Plain password kabhi save nahi hota)
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
    # 1. User find karo
    db_user = await db.users.find_one({"email": user.email})
    
    # 2. Verify Password (pwd_context automatic salt check karke verify karega)
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # 3. Generate JWT Token (Taki user logged in rahe)
    expiration = datetime.utcnow() + timedelta(hours=24) # 24 hours expiry
    token_payload = {"sub": user.email, "exp": expiration}
    token = jwt.encode(token_payload, SECRET_KEY, algorithm=ALGORITHM)

    return {
        "message": "Login successful", 
        "access_token": token, 
        "name": db_user["name"]
    }