#base python image
FROM python:3.11-slim

#prevent python from buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

#system packages needed for opencv and compiling native extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

#install python packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

#copy app source
COPY . .

EXPOSE 8000

#run uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
