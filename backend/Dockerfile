
FROM python:3.11-slim 

# System me Tesseract OCR install kar rahe hain
RUN apt-get update && apt-get install -y tesseract-ocr && rm -rf /var/lib/apt/lists/*

# Working directory set kar rahe hain
WORKDIR /app
RUN apt-get update && apt-get install -y gcc build-essential

# Requirements copy karke install kia
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

#fastapi ko port 10000 pr run 
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]