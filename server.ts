import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const PORT = 3000;

// In-memory OTP store for email verification
interface OtpEntry {
  otp: string;
  password?: string;
  name?: string;
  expiresAt: number;
  mode: "login" | "signup";
}
const otpStore = new Map<string, OtpEntry>();

// Helper to send email with OTP
async function sendOtpEmail(email: string, otp: string, mode: "login" | "signup", name?: string): Promise<{ sent: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "School Manager Pro <no-reply@schoolmanagerpro.com>";

  const displayModeName = mode === "signup" ? "Sajilaad (Registration)" : "Galaangal (Login)";
  const somaliMessage = mode === "signup"
    ? `Ku soo dhawaada School Manager Pro, ${name || "Macallin"}. Fadlan isticmaal code-ka hoose si aad u xaqiijiso email-kaaga oo aad u dhammaystirto diiwaangelinta.`
    : `Fadlan isticmaal code-ka hoose si aad u xaqiijiso aqoonsigaaga oo aad u gasho nidaamka.`;

  const englishMessage = mode === "signup"
    ? `Welcome to School Manager Pro, ${name || "Teacher"}. Please use the code below to verify your email and complete your registration.`
    : `Please use the code below to verify your identity and access the system.`;

  const htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 16px; border-radius: 8px; font-weight: bold; font-size: 20px;">
          🏫 School Manager Pro
        </div>
      </div>
      
      <h2 style="color: #0f172a; text-align: center; font-size: 22px; margin-bottom: 8px;">Xaqiijinta Emailka / Email Verification</h2>
      <p style="color: #475569; text-align: center; font-size: 14px; margin-top: 0;">Habka: <strong>${displayModeName}</strong></p>
      
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
      
      <!-- Somali Version -->
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #4f46e5;">
        <p style="color: #1e293b; font-size: 15px; line-height: 1.5; margin: 0;">
          <strong>Soomaali:</strong><br/>
          ${somaliMessage}
        </p>
      </div>

      <!-- English Version -->
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #6366f1;">
        <p style="color: #1e293b; font-size: 15px; line-height: 1.5; margin: 0;">
          <strong>English:</strong><br/>
          ${englishMessage}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background-color: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 12px 30px;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4f46e5;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 8px;">Muddada uu shaqaynayo waa 10 daqiiqo / Valid for 10 minutes</p>
      </div>
      
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
      
      <p style="color: #64748b; font-size: 12px; text-align: center; line-height: 1.5; margin: 0;">
        Haddii aadan adigu codsan, fadlan iska indho-tir email-kan.<br/>
        If you did not request this, please ignore this email.
      </p>
    </div>
  `;

  const textContent = `
    School Manager Pro - Email Verification
    Mode / Habka: ${displayModeName}
    
    SOMALI:
    ${somaliMessage}
    Code: ${otp}
    
    ENGLISH:
    ${englishMessage}
    Code: ${otp}
    
    This code is valid for 10 minutes.
  `;

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      await transporter.sendMail({
        from,
        to: email,
        subject: `[School Manager Pro] Verification Code: ${otp}`,
        text: textContent,
        html: htmlContent
      });

      console.log(`Successfully sent OTP email to ${email}`);
      return { sent: true };
    } catch (err: any) {
      console.error("Error sending real SMTP email:", err);
      return { sent: false, error: err.message || "SMTP sending failed" };
    }
  } else {
    console.log(`[DEV MODE] SMTP not configured. OTP for ${email} is ${otp}`);
    return { sent: false, error: "SMTP not configured" };
  }
}


app.use(express.json());

// Path to persistent data storage fallback
const DATA_FILE = path.join(process.cwd(), "data.json");

// Define interface for local data
interface LocalData {
  users?: any[];
  students: any[];
  attendance: { [date: string]: any[] };
  fees: { [studentId: string]: any[] };
  settings: {
    schoolName: string;
    currency: string;
    feeAmount: number;
    attendanceRules: string;
    systemTheme: string;
  };
  schoolSettings?: {
    [tenantId: string]: {
      schoolName: string;
      currency: string;
      feeAmount: number;
      attendanceRules: string;
      systemTheme: string;
    };
  };
}

// Default initial mock data
const defaultData: LocalData = {
  users: [],
  students: [
    { id: "s-1", fullName: "Axmed Maxamed Cilmi", class: "Form 1-A", gender: "Male", guardianPhone: "+252615551234", status: "active", createdAt: "2026-06-01" },
    { id: "s-2", fullName: "Fadumo Axmed Cali", class: "Form 2-B", gender: "Female", guardianPhone: "+252615555678", status: "active", createdAt: "2026-06-02" },
    { id: "s-3", fullName: "Mustafe Jaamac Cumar", class: "Form 1-A", gender: "Male", guardianPhone: "+252615559012", status: "active", createdAt: "2026-06-03" }
  ],
  attendance: {
    "2026-06-24": [
      { studentId: "s-1", status: "Present", timestamp: "2026-06-24T08:00:00.000Z" },
      { studentId: "s-2", status: "Present", timestamp: "2026-06-24T08:00:00.000Z" },
      { studentId: "s-3", status: "Absent", timestamp: "2026-06-24T08:05:00.000Z" }
    ]
  },
  fees: {
    "s-1": [
      { id: "f-1", month: "June", year: "2026", amount: 50, paidAmount: 50, status: "paid", createdAt: "2026-06-05T10:00:00.000Z", updatedAt: "2026-06-05T10:00:00.000Z", history: [{ action: "created", amount: 50, date: "2026-06-05T10:00:00.000Z" }] }
    ],
    "s-2": [
      { id: "f-2", month: "June", year: "2026", amount: 50, paidAmount: 20, status: "partial", createdAt: "2026-06-06T11:00:00.000Z", updatedAt: "2026-06-06T11:00:00.000Z", history: [{ action: "created & partial payment", amount: 20, date: "2026-06-06T11:00:00.000Z" }] }
    ]
  },
  settings: {
    schoolName: "School Pro 2026",
    currency: "USD",
    feeAmount: 50,
    attendanceRules: "Strict",
    systemTheme: "light"
  }
};

// Initialize or load local data
function loadLocalData(): LocalData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Error loading local data file:", error);
  }
  
  // Write default data if file doesn't exist or is corrupted
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing default local data file:", error);
  }
  return defaultData;
}

function saveLocalData(data: LocalData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving local data file:", error);
  }
}

// Initialize Supabase Client if env is available
let SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "").trim();
let SUPABASE_KEY = (process.env.SUPABASE_KEY || "").trim().replace(/^["']|["']$/g, "").trim();

// Additional validation to prevent "Invalid supabaseUrl" errors
const isValidUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_) {
    return false;
  }
};

let supabase: any = null;
let isSupabaseConfigured = false;

if (SUPABASE_URL && SUPABASE_KEY && isValidUrl(SUPABASE_URL) && SUPABASE_URL !== "undefined" && SUPABASE_URL !== "null" && SUPABASE_KEY !== "undefined" && SUPABASE_KEY !== "null") {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    isSupabaseConfigured = true;
    console.log("Supabase client initialized successfully with URL:", SUPABASE_URL);
  } catch (err) {
    console.error("Failed to initialize Supabase client:", err);
  }
} else {
  console.log("Supabase not configured or invalid URL. Falling back to local data.json storage. URL:", SUPABASE_URL);
}

// SQL Script for setup to display in UI
const SQL_SCHEMA = `-- Create Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  created_at TEXT
);

-- Create Students table with multi-tenancy user_id
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  full_name TEXT NOT NULL,
  class TEXT NOT NULL,
  gender TEXT,
  guardian_phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT
);

-- Create Attendance table with multi-tenancy user_id
CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  date TEXT NOT NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  timestamp TEXT
);

-- Create Fees table with multi-tenancy user_id
CREATE TABLE IF NOT EXISTS fees (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  paid_amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT,
  updated_at TEXT,
  history JSONB
);

-- Create Settings table (id is the user_id / tenant_id)
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  school_name TEXT NOT NULL,
  currency TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL,
  attendance_rules TEXT,
  system_theme TEXT
);

-- Seed default settings for backward compatibility
INSERT INTO settings (id, school_name, currency, fee_amount, attendance_rules, system_theme)
VALUES ('default', 'School Pro 2026', 'USD', 50, 'Strict', 'light')
ON CONFLICT (id) DO NOTHING;`;

// API routes
app.get("/api/status", async (req, res) => {
  let dbWorking = false;
  let dbError: string | null = null;
  
  if (isSupabaseConfigured && supabase) {
    try {
      // Test the query
      const { data, error } = await supabase.from("settings").select("*").limit(1);
      if (error) {
        dbError = error.message;
        dbWorking = false;
      } else {
        dbWorking = true;
      }
    } catch (err: any) {
      dbError = err.message || "Unknown database error";
      dbWorking = false;
    }
  }

  res.json({
    supabaseConfigured: isSupabaseConfigured,
    supabaseUrl: SUPABASE_URL || null,
    supabaseWorking: dbWorking,
    databaseError: dbError,
    sqlSchema: SQL_SCHEMA
  });
});

// Helper to validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmailAddress(email: string): boolean {
  return emailRegex.test(email);
}

// POST Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email, password, name, mode } = req.body;
  
  if (!email || !password || !mode) {
    return res.status(400).json({ error: "Email, password, and mode are required!" });
  }

  const searchEmail = email.trim().toLowerCase();

  // Validate email format
  if (!isValidEmailAddress(searchEmail) && searchEmail !== "admin") {
    return res.status(400).json({ error: "Fadlan geli email sax ah! / Please enter a valid email address!" });
  }

  // Check user existence
  let userExists = false;
  let correctPassword = false;
  let existingUser: any = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("email", searchEmail).maybeSingle();
      if (!error && data) {
        userExists = true;
        existingUser = data;
        correctPassword = data.password === password;
      }
    } catch (err) {
      console.error("Supabase check user failed:", err);
    }
  }

  // Local fallback check
  if (!userExists) {
    const local = loadLocalData();
    const found = (local.users || []).find(u => u.email === searchEmail);
    if (found) {
      userExists = true;
      existingUser = found;
      correctPassword = found.password === password;
    }
  }

  // Special Admin check for development/demo
  if (!userExists && (searchEmail === "admin" || searchEmail === "admin@dugsiga.com")) {
    userExists = true;
    correctPassword = password === "123";
    existingUser = { id: "admin", email: "admin@dugsiga.com", name: "Admin", password: "123" };
  }

  // Validation based on mode
  if (mode === "signup") {
    if (userExists) {
      return res.status(400).json({ error: "Email-kan mar horey ayaa loo diiwaangeliyey! / This email is already registered!" });
    }
  } else if (mode === "login") {
    if (!userExists) {
      return res.status(400).json({ error: "Email-kan ma diiwaangashna! / No user registered with this email!" });
    }
    if (!correctPassword) {
      return res.status(400).json({ error: "Erayga sirta ah waa khalad! / Incorrect password!" });
    }
  }

  // Generate 6-digit OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(searchEmail, {
    otp,
    password,
    name: name ? name.trim() : (existingUser ? existingUser.name : ""),
    expiresAt,
    mode
  });

  // Send email
  const emailResult = await sendOtpEmail(searchEmail, otp, mode, name);
  const smtpConfigured = emailResult.sent;

  res.json({
    success: true,
    message: smtpConfigured 
      ? "Code-ka xaqiijinta ayaa loo diray emailkaaga! / Verification code sent to your email!" 
      : "Code-ka xaqiijinta ayaa la soo saaray! (Habka tijaabada) / Verification code generated! (Dev mode)",
    smtpConfigured,
    devOtp: smtpConfigured ? undefined : otp
  });
});

// POST Verify OTP and complete Auth
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, otp, mode } = req.body;

  if (!email || !otp || !mode) {
    return res.status(400).json({ error: "Email, OTP code, and mode are required!" });
  }

  const searchEmail = email.trim().toLowerCase();
  const entry = otpStore.get(searchEmail);

  if (!entry) {
    return res.status(400).json({ error: "Ma jiro code loo diray email-kan! / No code was sent to this email!" });
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(searchEmail);
    return res.status(400).json({ error: "Code-kii xaqiijinta wuu dhacay! / Verification code has expired!" });
  }

  if (entry.otp !== otp.trim()) {
    return res.status(400).json({ error: "Code-ku waa khalad! / Incorrect verification code!" });
  }

  // Clean up the OTP store
  otpStore.delete(searchEmail);

  // If we reach here, OTP is correct! Now complete the action.
  if (mode === "signup") {
    const id = "u-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString(36);
    const createdAt = new Date().toISOString();

    const newUser = {
      id,
      email: searchEmail,
      password: entry.password,
      name: entry.name || "",
      createdAt
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from("users").insert({
          id: newUser.id,
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          created_at: newUser.createdAt
        });

        if (!error) {
          return res.json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
        }
        console.warn("Supabase auth signup insert error:", error);
      } catch (err) {
        console.error("Supabase auth signup failed:", err);
      }
    }

    // Local fallback
    const local = loadLocalData();
    if (!local.users) local.users = [];
    local.users.push(newUser);
    saveLocalData(local);
    return res.json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
  } else {
    // login mode - Fetch and return user info
    let foundUser: any = null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from("users").select("*").eq("email", searchEmail).maybeSingle();
        if (!error && data) {
          foundUser = data;
        }
      } catch (err) {
        console.error("Supabase login fetch failed:", err);
      }
    }

    if (!foundUser) {
      const local = loadLocalData();
      foundUser = (local.users || []).find(u => u.email === searchEmail);
    }

    if (!foundUser && (searchEmail === "admin" || searchEmail === "admin@dugsiga.com")) {
      foundUser = { id: "admin", email: "admin@dugsiga.com", name: "Admin" };
    }

    if (foundUser) {
      return res.json({ success: true, user: { id: foundUser.id, email: foundUser.email, name: foundUser.name } });
    }

    return res.status(404).json({ error: "User not found!" });
  }
});

// Helper to extract Tenant/User ID from Request Headers for Multi-tenancy
function getTenantId(req: express.Request): string {
  const userId = req.headers["x-user-id"];
  if (typeof userId === "string" && userId) {
    return userId;
  }
  return "default";
}

// GET Students
app.get("/api/students", async (req, res) => {
  const tenantId = getTenantId(req);
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("students").select("*").eq("user_id", tenantId).order("full_name", { ascending: true });
      if (!error) {
        // Map Supabase columns to camelCase expected by front-end
        const mapped = (data || []).map((s: any) => ({
          id: s.id,
          fullName: s.full_name,
          class: s.class,
          gender: s.gender,
          guardianPhone: s.guardian_phone,
          status: s.status,
          createdAt: s.created_at
        }));
        return res.json(mapped);
      }
      console.warn("Supabase query error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase request failed, falling back to local:", err);
    }
  }
  
  const local = loadLocalData();
  const filtered = (local.students || []).filter((s: any) => s.userId === tenantId || s.user_id === tenantId);
  res.json(filtered);
});

// POST Student
app.post("/api/students", async (req, res) => {
  const tenantId = getTenantId(req);
  const { fullName, class: className, gender, guardianPhone, status } = req.body;
  
  const normalizedName = String(fullName || "").trim().replace(/\s+/g, " ");
  const normalizedClass = String(className || "").trim().replace(/\s+/g, " ");

  if (!normalizedName || !normalizedClass) {
    return res.status(400).json({ error: "Student name and class are required." });
  }

  // Check for duplicate student
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", tenantId)
        .ilike("full_name", normalizedName)
        .ilike("class", normalizedClass);
      
      if (!checkError && existing && existing.length > 0) {
        return res.status(400).json({ error: `A student named "${normalizedName}" already exists in class "${normalizedClass}".` });
      }
    } catch (err) {
      console.error("Supabase duplicate check failed:", err);
    }
  }

  const local = loadLocalData();
  const isDuplicate = (local.students || []).some((s: any) => 
    (s.userId === tenantId || s.user_id === tenantId) &&
    s.fullName.toLowerCase().trim() === normalizedName.toLowerCase() &&
    s.class.toLowerCase().trim() === normalizedClass.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: `A student named "${normalizedName}" already exists in class "${normalizedClass}".` });
  }

  const id = "s-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString(36);
  const createdAt = new Date().toISOString().split("T")[0];

  const newStudent = {
    id,
    userId: tenantId,
    fullName: normalizedName,
    class: normalizedClass,
    gender,
    guardianPhone,
    status: status || "active",
    createdAt
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("students").insert({
        id: newStudent.id,
        user_id: tenantId,
        full_name: newStudent.fullName,
        class: newStudent.class,
        gender: newStudent.gender,
        guardian_phone: newStudent.guardianPhone,
        status: newStudent.status,
        created_at: newStudent.createdAt
      });
      if (!error) {
        return res.json(newStudent);
      }
      console.warn("Supabase insert error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase insert failed, falling back to local:", err);
    }
  }

  local.students.push(newStudent);
  saveLocalData(local);
  res.json(newStudent);
});

// PUT Student
app.put("/api/students/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;
  const { fullName, class: className, gender, guardianPhone, status } = req.body;

  const normalizedName = String(fullName || "").trim().replace(/\s+/g, " ");
  const normalizedClass = String(className || "").trim().replace(/\s+/g, " ");

  if (!normalizedName || !normalizedClass) {
    return res.status(400).json({ error: "Student name and class are required." });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", tenantId)
        .ilike("full_name", normalizedName)
        .ilike("class", normalizedClass)
        .neq("id", id);
      
      if (!checkError && existing && existing.length > 0) {
        return res.status(400).json({ error: `A student named "${normalizedName}" already exists in class "${normalizedClass}".` });
      }

      const { error } = await supabase.from("students").update({
        full_name: normalizedName,
        class: normalizedClass,
        gender,
        guardian_phone: guardianPhone,
        status
      }).eq("id", id).eq("user_id", tenantId);

      if (!error) {
        return res.json({ id, fullName: normalizedName, class: normalizedClass, gender, guardianPhone, status });
      }
      console.warn("Supabase update error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase update failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  const isDuplicate = (local.students || []).some((s: any) => 
    (s.userId === tenantId || s.user_id === tenantId) &&
    s.id !== id &&
    s.fullName.toLowerCase().trim() === normalizedName.toLowerCase() &&
    s.class.toLowerCase().trim() === normalizedClass.toLowerCase()
  );
  if (isDuplicate) {
    return res.status(400).json({ error: `A student named "${normalizedName}" already exists in class "${normalizedClass}".` });
  }

  const idx = local.students.findIndex(s => s.id === id && (s.userId === tenantId || s.user_id === tenantId));
  if (idx > -1) {
    local.students[idx] = { ...local.students[idx], fullName: normalizedName, class: normalizedClass, gender, guardianPhone, status };
    saveLocalData(local);
    return res.json(local.students[idx]);
  }
  res.status(404).json({ error: "Student not found" });
});

// DELETE Student
app.delete("/api/students/:id", async (req, res) => {
  const tenantId = getTenantId(req);
  const { id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("students").delete().eq("id", id).eq("user_id", tenantId);
      if (!error) {
        return res.json({ success: true, message: "Student deleted from Supabase" });
      }
      console.warn("Supabase delete error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase delete failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  local.students = local.students.filter(s => !(s.id === id && (s.userId === tenantId || s.user_id === tenantId)));
  // Clean fees and attendance matching this student belonging to this tenant
  if (local.fees[id]) {
    delete local.fees[id];
  }
  Object.keys(local.attendance).forEach(date => {
    local.attendance[date] = local.attendance[date].filter(a => a.studentId !== id);
  });
  saveLocalData(local);
  res.json({ success: true, message: "Student and all records deleted locally" });
});

// GET Attendance for a specific date and optional session
app.get("/api/attendance", async (req, res) => {
  const tenantId = getTenantId(req);
  const rawDate = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const session = (req.query.session as string) || "";
  
  // Combine date and session if session is provided to support multiple attendances per day
  const date = session ? `${rawDate}_${session}` : rawDate;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("attendance").select("*").eq("date", date).eq("user_id", tenantId);
      if (!error) {
        const mapped = (data || []).map((a: any) => ({
          studentId: a.student_id,
          status: a.status,
          timestamp: a.timestamp
        }));
        return res.json(mapped);
      }
      console.warn("Supabase attendance fetch error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase attendance fetch failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  const dayRecords = local.attendance[date] || [];
  const filtered = dayRecords.filter((a: any) => a.userId === tenantId || a.user_id === tenantId);
  res.json(filtered);
});

// GET All Attendance (for reports)
app.get("/api/attendance/all", async (req, res) => {
  const tenantId = getTenantId(req);
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("attendance").select("*").eq("user_id", tenantId);
      if (!error) {
        // Group by date
        const grouped: { [date: string]: any[] } = {};
        (data || []).forEach((a: any) => {
          if (!grouped[a.date]) grouped[a.date] = [];
          grouped[a.date].push({
            studentId: a.student_id,
            status: a.status,
            timestamp: a.timestamp
          });
        });
        return res.json(grouped);
      }
      console.warn("Supabase all attendance error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase all attendance failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  const filteredGrouped: { [date: string]: any[] } = {};
  Object.keys(local.attendance || {}).forEach(date => {
    const list = local.attendance[date] || [];
    const filteredList = list.filter((a: any) => a.userId === tenantId || a.user_id === tenantId);
    if (filteredList.length > 0) {
      filteredGrouped[date] = filteredList.map((a: any) => ({
        studentId: a.studentId,
        status: a.status,
        timestamp: a.timestamp
      }));
    }
  });
  res.json(filteredGrouped);
});

// POST Save Batch Attendance
app.post("/api/attendance/batch", async (req, res) => {
  const tenantId = getTenantId(req);
  const { date: rawDate, session, records } = req.body; // records: [{ studentId, status }]
  const timestamp = new Date().toISOString();

  // Combine date and session to support taking attendance twice a day
  const date = session ? `${rawDate}_${session}` : rawDate;

  // Deduplicate records array to prevent multiple entries for the same student on the same day
  const seenStudents = new Set<string>();
  const uniqueRecords: any[] = [];
  for (const r of (records || [])) {
    if (r.studentId && !seenStudents.has(r.studentId)) {
      seenStudents.add(r.studentId);
      uniqueRecords.push(r);
    }
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // First delete existing records for this date and tenant to overwrite cleanly
      await supabase.from("attendance").delete().eq("date", date).eq("user_id", tenantId);
      
      const rows = uniqueRecords.map((r: any) => ({
        id: `att-${date}-${r.studentId}-${Math.random().toString(36).substring(2, 6)}`,
        user_id: tenantId,
        date,
        student_id: r.studentId,
        status: r.status,
        timestamp
      }));

      const { error } = await supabase.from("attendance").insert(rows);
      if (!error) {
        return res.json({ success: true, date, count: uniqueRecords.length });
      }
      console.warn("Supabase batch attendance insert error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase batch attendance failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  const currentList = local.attendance[date] || [];
  const otherTenantsList = currentList.filter((r: any) => r.userId !== tenantId && r.user_id !== tenantId);
  
  const newTenantList = uniqueRecords.map((r: any) => ({
    studentId: r.studentId,
    status: r.status,
    timestamp,
    userId: tenantId
  }));

  local.attendance[date] = [...otherTenantsList, ...newTenantList];
  saveLocalData(local);
  res.json({ success: true, date, count: uniqueRecords.length });
});

// GET Fees
app.get("/api/fees", async (req, res) => {
  const tenantId = getTenantId(req);
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("fees").select("*").eq("user_id", tenantId);
      if (!error) {
        // Format to keyed object expected by frontend
        const grouped: { [studentId: string]: any[] } = {};
        (data || []).forEach((f: any) => {
          if (!grouped[f.student_id]) grouped[f.student_id] = [];
          grouped[f.student_id].push({
            id: f.id,
            month: f.month,
            year: String(f.year),
            amount: Number(f.amount),
            paidAmount: Number(f.paid_amount),
            status: f.status,
            createdAt: f.created_at,
            updatedAt: f.updated_at,
            history: Array.isArray(f.history) ? f.history : (typeof f.history === 'string' ? JSON.parse(f.history) : [])
          });
        });
        return res.json(grouped);
      }
      console.warn("Supabase fees query error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase fees failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  const tenantStudentIds = new Set(
    (local.students || [])
      .filter((s: any) => s.userId === tenantId || s.user_id === tenantId)
      .map((s: any) => s.id)
  );

  const filteredFees: { [studentId: string]: any[] } = {};
  Object.keys(local.fees || {}).forEach(studentId => {
    if (tenantStudentIds.has(studentId)) {
      filteredFees[studentId] = local.fees[studentId];
    }
  });

  res.json(filteredFees);
});

// POST Fee Record
app.post("/api/fees", async (req, res) => {
  const tenantId = getTenantId(req);
  const { studentId, month, year, amount, paidAmount, status } = req.body;
  const fMonth = String(month || "").trim();
  const fYear = String(year || "").trim();

  // Check for duplicate fee invoice
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from("fees")
        .select("id")
        .eq("user_id", tenantId)
        .eq("student_id", studentId)
        .eq("month", fMonth)
        .eq("year", Number(fYear));
      
      if (!checkError && existing && existing.length > 0) {
        return res.status(400).json({ error: `An invoice already exists for this student in ${fMonth} ${fYear}.` });
      }
    } catch (err) {
      console.error("Supabase duplicate check for fee failed:", err);
    }
  }

  const local = loadLocalData();
  const studentFees = local.fees[studentId] || [];
  const isDuplicate = studentFees.some((f: any) => 
    f.month.toLowerCase() === fMonth.toLowerCase() &&
    String(f.year) === fYear
  );
  if (isDuplicate) {
    return res.status(400).json({ error: `An invoice already exists for this student in ${fMonth} ${fYear}.` });
  }

  const id = "f-" + Math.random().toString(36).substring(2, 11) + "-" + Date.now().toString(36);
  const createdAt = new Date().toISOString();
  
  const newFee = {
    id,
    userId: tenantId,
    month: fMonth,
    year: fYear,
    amount: Number(amount),
    paidAmount: Number(paidAmount),
    status,
    createdAt,
    updatedAt: createdAt,
    history: [{ action: "created", amount: Number(amount), date: createdAt }]
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("fees").insert({
        id,
        user_id: tenantId,
        student_id: studentId,
        month: fMonth,
        year: Number(fYear),
        amount: Number(amount),
        paid_amount: Number(paidAmount),
        status,
        created_at: createdAt,
        updated_at: createdAt,
        history: newFee.history
      });
      if (!error) {
        return res.json(newFee);
      }
      console.warn("Supabase insert fee error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase insert fee failed, falling back to local:", err);
    }
  }

  if (!local.fees[studentId]) local.fees[studentId] = [];
  local.fees[studentId].push(newFee);
  saveLocalData(local);
  res.json(newFee);
});

// PUT Fee Record
app.put("/api/fees/:studentId/:feeId", async (req, res) => {
  const tenantId = getTenantId(req);
  const { studentId, feeId } = req.params;
  const { month, year, amount, paidAmount, status, actionDesc } = req.body;
  const fMonth = String(month || "").trim();
  const fYear = String(year || "").trim();
  const updatedAt = new Date().toISOString();

  // Check for duplicate fee invoice
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing, error: checkError } = await supabase
        .from("fees")
        .select("id")
        .eq("user_id", tenantId)
        .eq("student_id", studentId)
        .eq("month", fMonth)
        .eq("year", Number(fYear))
        .neq("id", feeId);
      
      if (!checkError && existing && existing.length > 0) {
        return res.status(400).json({ error: `An invoice already exists for this student in ${fMonth} ${fYear}.` });
      }
    } catch (err) {
      console.error("Supabase duplicate check for fee update failed:", err);
    }
  }

  const local = loadLocalData();
  const studentFees = local.fees[studentId] || [];
  const isDuplicate = studentFees.some((f: any) => 
    f.id !== feeId &&
    f.month.toLowerCase() === fMonth.toLowerCase() &&
    String(f.year) === fYear
  );
  if (isDuplicate) {
    return res.status(400).json({ error: `An invoice already exists for this student in ${fMonth} ${fYear}.` });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // To update history, first get the current invoice
      const { data: existingFee } = await supabase.from("fees").select("history").eq("id", feeId).eq("user_id", tenantId).single();
      let historyList = [];
      if (existingFee && existingFee.history) {
        historyList = Array.isArray(existingFee.history) ? existingFee.history : (typeof existingFee.history === 'string' ? JSON.parse(existingFee.history) : []);
      }
      historyList.push({
        action: actionDesc || "edited",
        amount: Number(amount),
        date: updatedAt
      });

      const { error } = await supabase.from("fees").update({
        month: fMonth,
        year: Number(fYear),
        amount: Number(amount),
        paid_amount: Number(paidAmount),
        status,
        updated_at: updatedAt,
        history: historyList
      }).eq("id", feeId).eq("user_id", tenantId);

      if (!error) {
        return res.json({ id: feeId, month: fMonth, year: fYear, amount, paidAmount, status, updatedAt, history: historyList });
      }
      console.warn("Supabase update fee error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase update fee failed, falling back to local:", err);
    }
  }

  if (local.fees[studentId]) {
    const idx = local.fees[studentId].findIndex(f => f.id === feeId);
    if (idx > -1) {
      const current = local.fees[studentId][idx];
      const historyList = [...(current.history || [])];
      historyList.push({
        action: actionDesc || "edited",
        amount: Number(amount),
        date: updatedAt
      });

      const updated = {
        ...current,
        month: fMonth,
        year: fYear,
        amount: Number(amount),
        paidAmount: Number(paidAmount),
        status,
        updatedAt,
        history: historyList
      };

      local.fees[studentId][idx] = updated;
      saveLocalData(local);
      return res.json(updated);
    }
  }
  res.status(404).json({ error: "Fee record not found" });
});

// DELETE Fee Record
app.delete("/api/fees/:studentId/:feeId", async (req, res) => {
  const tenantId = getTenantId(req);
  const { studentId, feeId } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("fees").delete().eq("id", feeId).eq("user_id", tenantId);
      if (!error) {
        return res.json({ success: true });
      }
      console.warn("Supabase delete fee error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase delete fee failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  if (local.fees[studentId]) {
    local.fees[studentId] = local.fees[studentId].filter(f => f.id !== feeId);
    saveLocalData(local);
    return res.json({ success: true });
  }
  res.status(404).json({ error: "Fee record not found" });
});

// GET Settings
app.get("/api/settings", async (req, res) => {
  const tenantId = getTenantId(req);
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.from("settings").select("*").eq("id", tenantId).maybeSingle();
      if (!error && data) {
        return res.json({
          schoolName: data.school_name,
          currency: data.currency,
          feeAmount: Number(data.fee_amount),
          attendanceRules: data.attendance_rules,
          systemTheme: data.system_theme
        });
      }
      
      // If query succeeded but no record yet, seed default record and return
      if (!error) {
        const defaultSettings = {
          id: tenantId,
          school_name: "School Pro 2026",
          currency: "USD",
          fee_amount: 50,
          attendance_rules: "Strict",
          system_theme: "light"
        };
        await supabase.from("settings").insert(defaultSettings);
        return res.json({
          schoolName: defaultSettings.school_name,
          currency: defaultSettings.currency,
          feeAmount: defaultSettings.fee_amount,
          attendanceRules: defaultSettings.attendance_rules,
          systemTheme: defaultSettings.system_theme
        });
      }
      console.warn("Supabase settings error or missing default settings row, falling back to local:", error);
    } catch (err) {
      console.error("Supabase settings failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  if (!local.schoolSettings) local.schoolSettings = {};
  if (!local.schoolSettings[tenantId]) {
    local.schoolSettings[tenantId] = {
      schoolName: local.settings?.schoolName || "School Pro 2026",
      currency: local.settings?.currency || "USD",
      feeAmount: local.settings?.feeAmount || 50,
      attendanceRules: local.settings?.attendanceRules || "Strict",
      systemTheme: local.settings?.systemTheme || "light"
    };
    saveLocalData(local);
  }
  res.json(local.schoolSettings[tenantId]);
});

// POST/PUT Settings
app.post("/api/settings", async (req, res) => {
  const tenantId = getTenantId(req);
  const { schoolName, currency, feeAmount, attendanceRules, systemTheme } = req.body;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("settings").upsert({
        id: tenantId,
        school_name: schoolName,
        currency,
        fee_amount: Number(feeAmount),
        attendance_rules: attendanceRules,
        system_theme: systemTheme
      });
      if (!error) {
        return res.json({ schoolName, currency, feeAmount, attendanceRules, systemTheme });
      }
      console.warn("Supabase upsert settings error, falling back to local:", error);
    } catch (err) {
      console.error("Supabase upsert settings failed, falling back to local:", err);
    }
  }

  const local = loadLocalData();
  if (!local.schoolSettings) local.schoolSettings = {};
  local.schoolSettings[tenantId] = { schoolName, currency, feeAmount, attendanceRules, systemTheme };
  saveLocalData(local);
  res.json(local.schoolSettings[tenantId]);
});

// POST Send Test SMTP Email
app.post("/api/settings/test-email", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required!" });
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || "School Manager Pro <no-reply@schoolmanagerpro.com>";

  if (!host || !user || !pass) {
    return res.status(400).json({ 
      error: "SMTP server is not configured in .env variables yet! Please set SMTP_HOST, SMTP_USER, and SMTP_PASS first.",
      smtpConfigured: false 
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">📬 Email-ka Tijaabada SMTP (Test SMTP Email)</h2>
        <p>Hambalyo! Isku xirkaaga SMTP ee School Pro wuu guulaystay.</p>
        <p>Congratulations! Your SMTP email service is successfully configured and working correctly in <strong>School Pro</strong>.</p>
        <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="font-size: 11px; color: #94a3b8;">School Pro Service Alert • ${new Date().toLocaleString()}</p>
      </div>
    `;

    await transporter.sendMail({
      from,
      to: email,
      subject: `[School Pro] SMTP Email Test: Successful!`,
      html: htmlContent
    });

    res.json({ success: true, message: "Email-ka tijaabada ah si guul leh ayaa loo soo diray! / Test email sent successfully!" });
  } catch (err: any) {
    console.error("Test SMTP failed:", err);
    res.status(500).json({ error: err.message || "Failed to send SMTP email." });
  }
});

// Vite middleware setup for Development vs Production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Dugsiga Manager Server] running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
