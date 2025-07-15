# Building Management System

A simple web application for managing buildings using Flask and SQLite.

## Setup

1. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Open your browser and navigate to `http://localhost:5000`

## Features

- Add new buildings with name and address
- View list of all buildings
- Modern UI using Tailwind CSS
- RESTful API endpoints for building management

## API Endpoints

- GET `/api/buildings` - Get all buildings
- POST `/api/buildings` - Create a new building 