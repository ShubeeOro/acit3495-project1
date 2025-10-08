# analytics_service/Dockerfile
FROM python:3.11.9

WORKDIR /app

COPY requirements.txt .
# Upgrade pip --no-cache-dir is used to avoid caching the package index
RUN pip install --no-cache-dir --upgrade pip
# Create a virtual environment and install dependencies
RUN python -m venv venv

# Activate the virtual environment
RUN . venv/bin/activate
# Install the dependencies into the virtual environment
RUN pip install --no-cache-dir -r requirements.txt

EXPOSE 5003
COPY . .
CMD ["python", "server.py"]

