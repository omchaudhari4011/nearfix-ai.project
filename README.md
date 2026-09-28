# NearFix AI - Intelligent Appliance Complaint Classifier & Geodesic Technician Allocator

> **Nearest technician, fastest fix.**  
> A full-stack AI SaaS platform that triages customer appliance complaints in natural language, predicts failure categories and authorized tariff bounds, and dispatches the nearest qualified specialist technician using spherical Haversine geodesic distance matching.

---

## 🚀 What It Does

NearFix AI automates electronic appliance service operations across major metropolitan areas (pre-configured with Bangalore regions: MG Road, Indiranagar, Koramangala, Jayanagar, Hebbal, and Whitefield).

When a customer submits an appliance issue in everyday language (e.g., *"AC compressor running but blowing warm air"* or *"Smart TV screen turns black but sound works"*):
1. **AI Text Classification**: Evaluates input text through a TF-IDF vectorizer and linear classifier to diagnose the exact failure category with confidence scores.
2. **Dynamic Tariff Lookup**: Calculates authorized minimum and maximum repair tariff boundaries in INR (₹).
3. **Haversine Geodesic Allocation**: Filters active technicians specializing in the specific appliance (Air Conditioner, Refrigerator, or Television) and allocates the closest technician within a 35 km field radius.
4. **Interactive Portals**: Provides real-time field consoles for customers, technicians, and administrators.

---

## ✨ Key Features

- **Multi-Appliance Triage**: Dedicated support and specialized field technicians for:
  - **Air Conditioners (AC)**: Cooling failure, gas leak, indoor water leakage, MCB tripping, noisy blower, remote faults, installation.
  - **Refrigerators**: Inverter compressor failure, excessive frost buildup, defrost drain issues, warm food compartment.
  - **Televisions (TV)**: Display/screen backlight failure, no picture with audio, HDMI/mainboard errors, remote sensor failure.
- **Intelligent Geodesic Dispatch**: Computes great-circle distances via the Haversine formula ($R = 6371\text{ km}$) to pair customers with the closest available specialist.
- **Search & Filter History**: Search customer complaints in real-time by appliance type (`AC`, `Fridge`, `TV`) or description keywords.
- **Technician Field Console**: Real-time dispatch queue, phone link to call customers, one-click job completion status update, and online/offline field availability toggle.
- **Admin Dashboard**: Live overview statistics, complete tickets database, custom category creation, tariff boundary editing, and technician fleet management.
- **AI Model Performance Auditing**: Transparent evaluation dashboard showcasing test set accuracy, per-class Precision/Recall/F1 scores, confusion matrix, top learned TF-IDF feature weights, and an interactive test sandbox.
- **Server-Side Gemini AI Integration**: Technical diagnosis and safety recommendations proxy generated securely on the server without client-side API key exposure.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Axios
- **Backend**: Node.js, Express, TypeScript (`tsx`)
- **Machine Learning & Geodesics**: TF-IDF Vectorizer with Sublinear Term Frequency, Linear SVM classifier, Platt scaling probability calibration, Haversine spherical distance algorithm
- **Bundler & Tooling**: Vite 8, TypeScript compiler (`tsc`)
- **Deployment**: Render Blueprint (`render.yaml`), Docker/Cloud Run ready

---

## 🔑 Demo Login Accounts

The system seeds sample data automatically on first start with no manual database setup required:

| Role | Email | Password | Details |
|---|---|---|---|
| **Customer** | `customer@test.com` | `customer123` | Rahul Sharma (Bangalore) |
| **Technician (AC)** | `tech.suresh@repair.com` | `tech123` | Suresh Kumar (MG Road / Central) |
| **Technician (Fridge)** | `tech.ramesh@repair.com` | `tech123` | Ramesh Patel (Jayanagar / South) |
| **Technician (TV)** | `tech.anil@repair.com` | `tech123` | Anil Verma (Indiranagar / East) |
| **Administrator** | `admin@repair.com` | `admin123` | Project Administrator |

*(You can also register new customer or technician accounts directly in the UI)*

---

## 💻 How to Run Locally

### 1. Prerequisites
- Node.js 20 or higher (`node -v`)
- npm 9 or higher (`npm -v`)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/nearfix-ai.git
cd nearfix-ai

# Install all dependencies
npm install
```

### 3. Environment Setup (Optional)
```bash
cp .env.example .env
```
Add your optional `GEMINI_API_KEY` in `.env` if you want generative repair diagnostics.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build & Start
```bash
npm run build
npm start
```

---

## 🌐 Deploy on Render

This repository includes a pre-configured `render.yaml` Blueprint file for automatic deployment.

Follow these exact steps:

1. **Push to GitHub**:
   Commit and push your project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "feat: NearFix AI production release"
   git remote add origin https://github.com/YOUR_USERNAME/nearfix-ai.git
   git push -u origin main
   ```

2. **Open Render Dashboard**:
   Go to [dashboard.render.com](https://dashboard.render.com).

3. **Create New Blueprint**:
   - In the top navigation bar, click **New +** > **Blueprint**.
   - Connect and select your GitHub repository (`nearfix-ai`).

4. **Configure Environment Variables**:
   - Render will detect the web service configuration from `render.yaml`.
   - When prompted for `GEMINI_API_KEY`, enter your Google Gemini API key (or leave empty if testing without generative diagnostics).

5. **Deploy**:
   - Click **Apply** or **Deploy**.
   - Render will run `npm install && npm run build` and launch `npm start`.
   - Once the health check passes on `/api/health`, Render will provide your live URL (e.g., `https://nearfix-ai.onrender.com`).

---

## 📡 API Endpoints

- `GET /api/health` — Health check endpoint for Render/uptime monitoring (`{ ok: true }`)
- `POST /auth/login` — JWT authentication with Bearer token & HttpOnly cookie
- `POST /auth/register` — Role-based customer or technician registration
- `POST /complaints/classify` — Live TF-IDF + SVM classification on plain English text
- `POST /complaints/submit` — Submit complaint, compute tariff, and allocate nearest technician
- `GET /complaints/customer/me` — Retrieve past complaints for the authenticated customer
- `GET /technician/jobs` — Retrieve assigned dispatch tickets for the authenticated technician
- `PUT /technician/jobs/:id/complete` — Mark service ticket as Resolved
- `PUT /technician/profile` — Toggle technician availability (Online / Offline)
- `GET /admin/overview` — Dashboard aggregate metrics
- `GET /admin/complaints` — Complete administrative complaints list
- `POST /admin/price-list` — Update authorized tariff price range
- `GET /ml/metrics` — Accuracy, confusion matrix, and feature weights
- `POST /api/ai/diagnose` — Server-side technical analysis via Gemini API
