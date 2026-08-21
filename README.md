# AuditIQ — SEO & AEO Website Audit Tool

AuditIQ is a complete, full-stack application that analyzes websites for Technical SEO, Answer Engine Optimization (AEO), and Generative Engine Optimization (GEO).

## Prerequisites
- Node.js v18+
- MongoDB instance running locally or via MongoDB Atlas

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd "SEO - AEO"
   ```

2. **MongoDB Setup:**
   Ensure MongoDB is running locally on port 27017, or obtain a connection URI from MongoDB Atlas. The application uses a database defined in the `MONGODB_URI`.

3. **Backend Setup:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```
   **Required Environment Variables (in `backend/.env`):**
   - `PORT`: The port your API server will run on (e.g., `5000`).
   - `MONGODB_URI`: The connection URI for your MongoDB.
   - `JWT_SECRET`: A secure randomly generated string for signing JWT tokens.
   - `FRONTEND_URL`: The origin URL of your frontend application (required for CORS setup).

4. **Frontend Setup:**
   Open a new terminal window at the project root:
   ```bash
   cd "SEO - AEO"
   npm install
   cp .env.example .env
   ```
   **Required Environment Variables (in root `.env`):**
   - `VITE_API_URL`: The URL of your API server backend.

## Development Commands

Run both the frontend and backend concurrently (in separate terminals):

1. **Start the Backend Server:**
   ```bash
   cd backend
   npm run dev
   ```
   (This runs the server using nodemon for hot-reloading).

2. **Start the Frontend Application:**
   ```bash
   cd "SEO - AEO"
   npm run dev
   ```
   (This starts the Vite React application).

## Production Deployment

This project is prepared for deployment using **Vercel** (Frontend), **Render** (Backend), and **MongoDB Atlas** (Database).

### 1. MongoDB Atlas Setup
1. Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Add your server's IP (or allow all IPs `0.0.0.0/0`) in Network Access.
3. Create a Database User.
4. Get your connection string (choose Node.js driver). It looks like:
   `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority`

### 2. Backend Deployment (Render)
When creating a Web Service on Render, supply the following:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `PORT`: Automatically set by Render.
  - `MONGODB_URI`: Your MongoDB Atlas connection string.
  - `JWT_SECRET`: A secure random string for JWT.
  - `FRONTEND_URL`: Your Vercel frontend URL (e.g., `https://your-frontend.vercel.app`).
  - `NODE_ENV`: `production`

### 3. Frontend Deployment (Vercel)
When creating a Project on Vercel, supply the following:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: Your Render backend URL (e.g., `https://your-backend.onrender.com/api`).
