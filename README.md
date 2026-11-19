# Leave Management System with MongoDB Integration

A full-stack Leave Management application built with **Node.js**, **Express**, and **MongoDB (Mongoose)**, featuring a complete employee and leave tracking system.

---

## 🚀 Features

- **MongoDB Integration**: All employees and leave applications are persisted in MongoDB.
- **Automatic Fallback**: If MongoDB is offline, the server automatically uses an in-memory database so the app works out of the box without any setup.
- **Employee Management**: Add and manage employees with leave balance tracking.
- **Leave Applications**: Submit, approve, reject, and track leave requests.
- **Dashboard**: Real-time stats (Total, Pending, Approved, Rejected).
- **Leave Types**: Casual, Medical, Annual, Maternity, Paternity, Unpaid.
- **Working Days Calculator**: Automatically excludes weekends when counting leave days.
- **Status Filters**: Filter leave applications by status.

---

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Fallback DB | mongodb-memory-server |
| Frontend | Vanilla HTML/CSS/JS (no build required) |
| Utilities | CORS, dotenv, nodemon |

---

## 🛠️ Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Rahultn56/Leave-management.git
cd Leave-management
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables (Optional)
Create a `.env` file (see `.env.example`):
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/leave_management
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/leave_management?retryWrites=true&w=majority
```

> **No .env needed!** The server auto-starts an in-memory MongoDB if none is configured.

### 4. Run the Server
```bash
node server.js
```
Then open **http://localhost:5000** in your browser.

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/health | Server & DB status |
| GET | /api/stats | Leave count stats |
| GET | /api/employees | List all employees |
| POST | /api/employees | Add new employee |
| DELETE | /api/employees/:id | Remove employee |
| GET | /api/leaves | List all leave applications |
| POST | /api/leaves | Submit a new leave application |
| PATCH | /api/leaves/:id | Approve / Reject leave |
| DELETE | /api/leaves/:id | Delete leave application |

---

## 🗄️ MongoDB Schemas

### Employee Schema
```js
{ name, email, department, role, leaveBalance: { casual, medical, annual } }
```

### Leave Schema
```js
{ employeeName, employeeEmail, department, leaveType, startDate, endDate, totalDays, reason, status, reviewedBy, reviewComment, reviewedAt }
```


## ☁️ Deploy Backend Online (Render.com - 100% Free 24/7)

Deploy your backend online in 2 minutes so your deployed GitHub Pages frontend connects to MongoDB 24/7!

### Step 1: Deploy on Render
1. Go to **[Render.com](https://render.com)** and log in with your GitHub account.
2. Click **New +** > **Web Service**.
3. Select your repository: **`Rahultn56/Leave-management`**.
4. Render will auto-fill from `render.yaml`:
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Under **Environment Variables**, add:
   - `MONGODB_URI`: Your MongoDB Atlas URI (or leave blank to use automatic In-Memory MongoDB)
6. Click **Deploy Web Service**.
7. Copy your public service URL (e.g. `https://leave-management-xxxx.onrender.com`).

### Step 2: Connect Frontend
1. Open your live site: **[https://rahultn56.github.io/Leave-management/](https://rahultn56.github.io/Leave-management/)**
2. Click **🔗 Connect Cloud Backend** in the top-right corner.
3. Paste your Render URL and click **Test & Save**.
4. Your site is now live with real-time MongoDB database persistence!
