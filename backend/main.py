from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS setup taaki frontend easily connect kar sake bina errors ke
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Production mein isko apne frontend URL se replace karna
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Invoice Analyzer API is running!"}

@app.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    # Yahan hum file ka naam aur type check kar rahe hain
    # Phase 2 mein hum is file ko Gemini API ko pass karenge
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "message": "File uploaded successfully! Ready for AI processing."
    }