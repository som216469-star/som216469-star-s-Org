import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Use global variable to persist otpStore across serverless warm starts
const globalForOtp = global as any;
if (!globalForOtp.otpStore) {
  globalForOtp.otpStore = new Map<string, any>();
}
const otpStore = globalForOtp.otpStore;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmailAddress(email: string): boolean {
  return emailRegex.test(email);
}

let supabaseClient: any = null;
function getSupabase() {
  if (!supabaseClient) {
    let SUPABASE_URL = (
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      ""
    ).trim().replace(/^["']|["']$/g, "").trim();

    let SUPABASE_KEY = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      ""
    ).trim().replace(/^["']|["']$/g, "").trim();

    if (SUPABASE_URL && !SUPABASE_URL.startsWith("http://") && !SUPABASE_URL.startsWith("https://")) {
      if (/^[a-z0-9]{10,40}$/i.test(SUPABASE_URL)) {
        SUPABASE_URL = `https://${SUPABASE_URL}.supabase.co`;
      }
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Supabase is not configured. Online database strictly required!");
    }

    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

async function sendOtpEmail(
  email: string,
  otp: string,
  mode: "login" | "signup",
  name?: string
): Promise<{ sent: boolean; error?: string }> {
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

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed! Fadlan isticmaal POST." });
  }

  try {
    if (!req.body) {
      return res.status(400).json({ error: "Codsiga wuxuu u baahan yahay body! / Request body is required!" });
    }

    const { email, password, name, mode } = req.body;
    
    if (!email || !password || !mode) {
      return res.status(400).json({ error: "Email, password, iyo mode waa muhiim! / Email, password, and mode are required!" });
    }

    if (typeof email !== "string" || typeof password !== "string" || typeof mode !== "string") {
      return res.status(400).json({ error: "Nooca macluumaadka la soo diray waa khalad! / Invalid request parameters format!" });
    }

    const searchEmail = email.trim().toLowerCase();

    // Validate email format
    if (!isValidEmailAddress(searchEmail) && searchEmail !== "admin") {
      return res.status(400).json({ error: "Fadlan geli email sax ah! / Please enter a valid email address!" });
    }

    // Get lazily initialized Supabase client
    let supabase;
    try {
      supabase = getSupabase();
    } catch (dbErr: any) {
      return res.status(503).json({
        error: `Database is not available: ${dbErr.message || "Please check your Supabase configuration."}`
      });
    }

    // Check user existence in Supabase
    let userExists = false;
    let correctPassword = false;
    let existingUser: any = null;

    try {
      const { data, error } = await supabase.from("users").select("*").eq("email", searchEmail).maybeSingle();
      if (error) {
        return res.status(500).json({ error: `Supabase database error: ${error.message}` });
      }
      if (data) {
        userExists = true;
        existingUser = data;
        correctPassword = data.password === password;
      }
    } catch (err: any) {
      return res.status(500).json({ error: `Supabase request failed: ${err.message || err}` });
    }

    // Special Admin check for development/demo (if they want an admin option)
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
    } else {
      return res.status(400).json({ error: "Nooca habka xaqiijinta waa khalad! / Invalid auth mode specified!" });
    }

    // Generate 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(searchEmail, {
      otp,
      password,
      name: name && typeof name === "string" ? name.trim() : (existingUser ? existingUser.name : ""),
      expiresAt,
      mode: mode as "login" | "signup"
    });

    // Send email
    let emailResult: { sent: boolean; error?: string } = { sent: false, error: "" };
    try {
      emailResult = await sendOtpEmail(searchEmail, otp, mode as "login" | "signup", name);
    } catch (mailErr: any) {
      console.error("Failed to execute sendOtpEmail helper:", mailErr);
      emailResult = { sent: false, error: mailErr.message || "Email sending library error" };
    }

    const smtpConfigured = emailResult.sent;

    return res.status(200).json({
      success: true,
      message: smtpConfigured 
        ? "Code-ka xaqiijinta ayaa loo diray emailkaaga! / Verification code sent to your email!" 
        : "Code-ka xaqiijinta ayaa la soo saaray! (Habka tijaabada) / Verification code generated! (Dev mode)",
      smtpConfigured,
      devOtp: smtpConfigured ? undefined : otp
    });
  } catch (error: any) {
    console.error("CRITICAL unhandled error in Next.js send-otp API route:", error);
    return res.status(500).json({
      error: `Server error: ${error.message || "An unexpected error occurred during OTP generation."}`
    });
  }
}
