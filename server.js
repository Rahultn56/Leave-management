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
// MongoDB Connection with Auto In-Memory Fallback
// ==========================================
async function connectDB() {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/leave_management";
  try {
    console.log(`📡 Connecting to MongoDB: ${uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@")}`);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    console.log("✅ MongoDB connected successfully!");
    return;
  } catch (err) {
    console.warn(`⚠️  Could not connect to configured MongoDB: ${err.message}`);
  }
  console.log("🔄 Starting In-Memory MongoDB fallback...");
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log(`✅ Connected to In-Memory MongoDB! URI: ${memUri}`);
    console.log("👉 Tip: Set MONGODB_URI in .env to persist data to Atlas or local MongoDB.");
  } catch (memErr) {
    console.error("❌ All MongoDB connection attempts failed:", memErr.message);
  }
}

connectDB();

// ==========================================
// Schemas & Models
// ==========================================

// Employee / User Schema
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

const Employee = mongoose.model("Employee", employeeSchema);

// Leave Application Schema
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

const Leave = mongoose.model("Leave", leaveSchema);

// ==========================================
// Helper: Calculate working days
// ==========================================
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
  res.json({
    status: "online",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    dbName: mongoose.connection.name || "leave_management",
    dbHost: mongoose.connection.host || "unknown",
  });
});

// --- EMPLOYEES ---
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ name: 1 });
    res.json({ success: true, data: employees });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/employees", async (req, res) => {
  try {
    const emp = new Employee(req.body);
    const saved = await emp.save();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete("/api/employees/:id", async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- LEAVE APPLICATIONS ---
app.get("/api/leaves", async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.email) filter.employeeEmail = req.query.email.toLowerCase();
    if (req.query.department) filter.department = req.query.department;
    const leaves = await Leave.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, data: leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/leaves/:id", async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/leaves", async (req, res) => {
  try {
    const { employeeName, employeeEmail, department, leaveType, startDate, endDate, reason } = req.body;
    if (!employeeName || !employeeEmail || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    const totalDays = calcWorkingDays(startDate, endDate);
    const leave = new Leave({ employeeName, employeeEmail, department, leaveType, startDate, endDate, totalDays, reason });
    const saved = await leave.save();
    console.log(`📥 Leave application saved: ${saved._id} (${employeeName} - ${leaveType})`);
    res.status(201).json({ success: true, message: "Leave application submitted successfully!", data: saved });
  } catch (err) {
    console.error("Error creating leave:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Approve / Reject leave
app.patch("/api/leaves/:id", async (req, res) => {
  try {
    const { status, reviewedBy, reviewComment } = req.body;
    const updates = {};
    if (status) updates.status = status;
    if (reviewedBy) updates.reviewedBy = reviewedBy;
    if (reviewComment !== undefined) updates.reviewComment = reviewComment;
    if (status === "Approved" || status === "Rejected") updates.reviewedAt = new Date();

    const updated = await Leave.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ success: false, message: "Leave not found." });
    console.log(`✏️ Leave ${req.params.id} updated to ${status}`);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete("/api/leaves/:id", async (req, res) => {
  try {
    const deleted = await Leave.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Leave not found." });
    res.json({ success: true, message: "Leave application deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Summary / stats
app.get("/api/stats", async (req, res) => {
  try {
    const [total, pending, approved, rejected] = await Promise.all([
      Leave.countDocuments(),
      Leave.countDocuments({ status: "Pending" }),
      Leave.countDocuments({ status: "Approved" }),
      Leave.countDocuments({ status: "Rejected" }),
    ]);
    res.json({ success: true, data: { total, pending, approved, rejected } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// Start Server
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`👉 Open http://localhost:${PORT} to manage employee leaves!`);
});
