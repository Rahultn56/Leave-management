require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ==========================================
// MongoDB Connection (Serverless & Standard)
// ==========================================
let isConnecting = false;

async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  if (isConnecting) return;
  isConnecting = true;

  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/leave_management";

  try {
    console.log(`📡 Connecting to MongoDB: ${uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@")}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
      bufferCommands: false
    });
    console.log("✅ MongoDB connected successfully!");
    isConnecting = false;
    return;
  } catch (err) {
    console.warn(`⚠️  Could not connect to configured MongoDB: ${err.message}`);
    isConnecting = false;
  }

  // On Vercel serverless, do not spawn binary MongoMemoryServer
  if (process.env.VERCEL) {
    console.log("ℹ️  Running in Vercel Serverless environment. Set MONGODB_URI in Vercel project settings to connect to MongoDB Atlas.");
    return;
  }

  // In-Memory MongoDB fallback for local development
  try {
    console.log("🔄 Starting In-Memory MongoDB fallback...");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log(`✅ Connected to In-Memory MongoDB! URI: ${memUri}`);
  } catch (memErr) {
    console.error("❌ In-memory MongoDB failed:", memErr.message);
  }
}

// Auto-connect on startup and ensure connection per request on serverless
connectDB().catch(() => {});

app.use(async (req, res, next) => {
  if (mongoose.connection.readyState < 1 && process.env.MONGODB_URI) {
    try { await connectDB(); } catch {}
  }
  next();
});

// ==========================================
// In-Memory Array Fallback Store (for Vercel without Atlas URI)
// ==========================================
let fallbackEmployees = [
  { _id: 'emp_1', name: 'Rahul Sharma', email: 'rahul@example.com', department: 'Engineering', role: 'Full Stack Developer', leaveBalance: { casual: 10, medical: 8, annual: 14 } },
  { _id: 'emp_2', name: 'Priya Patel', email: 'priya@example.com', department: 'HR', role: 'HR Lead', leaveBalance: { casual: 12, medical: 10, annual: 15 } },
  { _id: 'emp_3', name: 'Amit Verma', email: 'amit@example.com', department: 'Design', role: 'UI/UX Designer', leaveBalance: { casual: 9, medical: 10, annual: 12 } },
  { _id: 'emp_4', name: 'Sneha Reddy', email: 'sneha@example.com', department: 'Marketing', role: 'Growth Specialist', leaveBalance: { casual: 11, medical: 9, annual: 13 } }
];

let fallbackLeaves = [
  { _id: 'leave_1', employeeName: 'Rahul Sharma', employeeEmail: 'rahul@example.com', department: 'Engineering', leaveType: 'Casual', startDate: new Date('2026-11-20'), endDate: new Date('2026-11-21'), totalDays: 2, reason: 'Family function in hometown', status: 'Pending', createdAt: new Date() },
  { _id: 'leave_2', employeeName: 'Amit Verma', employeeEmail: 'amit@example.com', department: 'Design', leaveType: 'Annual', startDate: new Date('2026-11-25'), endDate: new Date('2026-11-28'), totalDays: 4, reason: 'Annual vacation trip', status: 'Approved', reviewedBy: 'HR Admin', reviewComment: 'Approved, enjoy your trip!', createdAt: new Date(Date.now() - 86400000) },
  { _id: 'leave_3', employeeName: 'Sneha Reddy', employeeEmail: 'sneha@example.com', department: 'Marketing', leaveType: 'Medical', startDate: new Date('2026-11-15'), endDate: new Date('2026-11-16'), totalDays: 2, reason: 'Viral fever recovery', status: 'Approved', reviewedBy: 'HR Admin', reviewComment: 'Take care and rest well', createdAt: new Date(Date.now() - 259200000) },
  { _id: 'leave_4', employeeName: 'Priya Patel', employeeEmail: 'priya@example.com', department: 'HR', leaveType: 'Casual', startDate: new Date('2026-11-10'), endDate: new Date('2026-11-11'), totalDays: 2, reason: 'Personal errands', status: 'Rejected', reviewedBy: 'Director', reviewComment: 'Quarterly review meetings scheduled', createdAt: new Date(Date.now() - 400000000) }
];

// ==========================================
// Schemas & Models
// ==========================================
const employeeSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, unique: true, trim: true, lowercase: true },
  department: { type: String, default: "General", trim: true },
  role:       { type: String, enum: ["Employee", "Manager", "HR", "Admin"], default: "Employee" },
  leaveBalance: {
    casual:   { type: Number, default: 12 },
    medical:  { type: Number, default: 10 },
    annual:   { type: Number, default: 15 },
  },
}, { timestamps: true });

const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema);

const leaveSchema = new mongoose.Schema({
  employeeName:  { type: String, required: true, trim: true },
  employeeEmail: { type: String, required: true, trim: true, lowercase: true },
  department:    { type: String, default: "General", trim: true },
  leaveType:     { type: String, enum: ["Casual", "Medical", "Annual", "Maternity", "Paternity", "Unpaid"], required: true },
  startDate:     { type: Date, required: true },
  endDate:       { type: Date, required: true },
  totalDays:     { type: Number, required: true, min: 1 },
  reason:        { type: String, required: true, trim: true },
  status:        { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewedBy:    { type: String, default: null },
  reviewComment: { type: String, default: null },
  reviewedAt:    { type: Date, default: null },
}, { timestamps: true });

const Leave = mongoose.models.Leave || mongoose.model("Leave", leaveSchema);

function calcWorkingDays(start, end) {
  let count = 0;
  const cur = new Date(start);
  const endDate = new Date(end);
  while (cur <= endDate) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count || 1;
}

// ==========================================
// API Routes
// ==========================================

// Health check
app.get("/api/health", (req, res) => {
  const isDb = mongoose.connection.readyState === 1;
  res.json({
    status: "ok",
    database: isDb ? "Connected" : "In-Memory / Vercel Serverless Store",
    databaseType: isDb ? (process.env.MONGODB_URI ? "MongoDB Atlas" : "Local MongoDB") : "Vercel Mock Store",
    dbName: mongoose.connection.name || "leave_management",
    platform: process.env.VERCEL ? "Vercel Serverless" : "Node.js Server"
  });
});

// --- EMPLOYEES ---
app.get("/api/employees", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const employees = await Employee.find().sort({ name: 1 });
      return res.json({ success: true, data: employees });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  res.json({ success: true, data: fallbackEmployees });
});

app.post("/api/employees", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const emp = new Employee(req.body);
      const saved = await emp.save();
      return res.status(201).json({ success: true, data: saved });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }
  const newEmp = { _id: 'emp_' + Date.now(), ...req.body };
  fallbackEmployees.push(newEmp);
  res.status(201).json({ success: true, data: newEmp });
});

app.delete("/api/employees/:id", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      await Employee.findByIdAndDelete(req.params.id);
      return res.json({ success: true, message: "Employee deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  fallbackEmployees = fallbackEmployees.filter(e => String(e._id) !== String(req.params.id));
  res.json({ success: true, message: "Employee deleted" });
});

// --- LEAVE APPLICATIONS ---
app.get("/api/leaves", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const filter = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.email) filter.employeeEmail = req.query.email.toLowerCase();
      if (req.query.department) filter.department = req.query.department;
      const leaves = await Leave.find(filter).sort({ createdAt: -1 });
      return res.json({ success: true, count: leaves.length, data: leaves });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  let leaves = fallbackLeaves;
  if (req.query.status && req.query.status !== 'All') {
    leaves = leaves.filter(l => l.status === req.query.status);
  }
  res.json({ success: true, count: leaves.length, data: leaves });
});

app.get("/api/leaves/:id", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const leave = await Leave.findById(req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
      return res.json({ success: true, data: leave });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  const leave = fallbackLeaves.find(l => String(l._id) === String(req.params.id));
  if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
  res.json({ success: true, data: leave });
});

app.post("/api/leaves", async (req, res) => {
  const { employeeName, employeeEmail, department, leaveType, startDate, endDate, reason } = req.body;
  if (!employeeName || !employeeEmail || !leaveType || !startDate || !endDate || !reason) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }
  const totalDays = calcWorkingDays(startDate, endDate);

  if (mongoose.connection.readyState === 1) {
    try {
      const leave = new Leave({ employeeName, employeeEmail, department, leaveType, startDate, endDate, totalDays, reason });
      const saved = await leave.save();
      return res.status(201).json({ success: true, message: "Leave application submitted successfully!", data: saved });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  }

  const newLeave = {
    _id: 'leave_' + Date.now(),
    employeeName,
    employeeEmail,
    department: department || 'Engineering',
    leaveType,
    startDate,
    endDate,
    totalDays,
    reason,
    status: 'Pending',
    createdAt: new Date()
  };
  fallbackLeaves.unshift(newLeave);
  res.status(201).json({ success: true, message: "Leave application submitted successfully!", data: newLeave });
});

app.patch("/api/leaves/:id", async (req, res) => {
  const { status, reviewedBy, reviewComment } = req.body;

  if (mongoose.connection.readyState === 1) {
    try {
      const updates = {};
      if (status) updates.status = status;
      if (reviewedBy) updates.reviewedBy = reviewedBy;
      if (reviewComment !== undefined) updates.reviewComment = reviewComment;
      if (status === "Approved" || status === "Rejected") updates.reviewedAt = new Date();

      const updated = await Leave.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
      if (!updated) return res.status(404).json({ success: false, message: "Leave not found." });
      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  const idx = fallbackLeaves.findIndex(l => String(l._id) === String(req.params.id));
  if (idx === -1) return res.status(404).json({ success: false, message: "Leave not found." });
  if (status) fallbackLeaves[idx].status = status;
  if (reviewedBy) fallbackLeaves[idx].reviewedBy = reviewedBy;
  if (reviewComment !== undefined) fallbackLeaves[idx].reviewComment = reviewComment;
  if (status === "Approved" || status === "Rejected") fallbackLeaves[idx].reviewedAt = new Date();
  res.json({ success: true, data: fallbackLeaves[idx] });
});

app.delete("/api/leaves/:id", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const deleted = await Leave.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ success: false, message: "Leave not found." });
      return res.json({ success: true, message: "Leave application deleted." });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  fallbackLeaves = fallbackLeaves.filter(l => String(l._id) !== String(req.params.id));
  res.json({ success: true, message: "Leave application deleted." });
});

app.get("/api/stats", async (req, res) => {
  if (mongoose.connection.readyState === 1) {
    try {
      const [total, pending, approved, rejected] = await Promise.all([
        Leave.countDocuments(),
        Leave.countDocuments({ status: "Pending" }),
        Leave.countDocuments({ status: "Approved" }),
        Leave.countDocuments({ status: "Rejected" }),
      ]);
      return res.json({ success: true, data: { total, pending, approved, rejected } });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
  const total = fallbackLeaves.length;
  const pending = fallbackLeaves.filter(l => l.status === "Pending").length;
  const approved = fallbackLeaves.filter(l => l.status === "Approved").length;
  const rejected = fallbackLeaves.filter(l => l.status === "Rejected").length;
  res.json({ success: true, data: { total, pending, approved, rejected } });
});

// ==========================================
// Start Server (when run directly)
// ==========================================
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`👉 Open http://localhost:${PORT} to manage employee leaves!`);
  });
}

module.exports = app;
