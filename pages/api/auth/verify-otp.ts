import { createClient } from "@supabase/supabase-js";

// Use global variable to persist otpStore across serverless warm starts
const globalForOtp = global as any;
if (!globalForOtp.otpStore) {
  globalForOtp.otpStore = new Map<string, any>();
}
const otpStore = globalForOtp.otpStore;

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

    // Get lazily initialized Supabase client
    let supabase;
    try {
      supabase = getSupabase();
    } catch (dbErr: any) {
      return res.status(503).json({
        error: `Database is not available: ${dbErr.message || "Please check your Supabase configuration."}`
      });
    }

    if (mode === "signup") {
      // 1. Sign up the user in Supabase Auth to get a real Auth User ID (UUID)
      let authUserId: string | null = null;
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: searchEmail,
          password: entry.password,
          options: {
            data: {
              name: entry.name || ""
            }
          }
        });

        if (authError) {
          if (authError.message.includes("already registered") || authError.status === 400 || authError.status === 422) {
            // Attempt to sign in to retrieve their existing auth user ID
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: searchEmail,
              password: entry.password
            });
            if (!signInError && signInData?.user) {
              authUserId = signInData.user.id;
            } else {
              return res.status(400).json({ 
                error: `Macaamiilkan mar horey ayaa loo diiwaangeliyey Auth laakiin ma geli karno: ${signInError?.message || authError.message}` 
              });
            }
          } else {
            return res.status(400).json({ error: `Diiwaangelinta Supabase Auth waa fashilantay: ${authError.message}` });
          }
        } else {
          authUserId = authData.user?.id || null;
        }
      } catch (authErr: any) {
        console.error("Supabase Auth signUp exception:", authErr);
        return res.status(500).json({ error: `Cilad ku dhacday dhismaha account-ka: ${authErr.message || authErr}` });
      }

      if (!authUserId) {
        return res.status(500).json({ error: "Ma helin ID-ga guud ee aqoonsiga! / Failed to retrieve user ID from Auth." });
      }

      const createdAt = new Date().toISOString();

      const newUser = {
        id: authUserId,
        email: searchEmail,
        password: entry.password,
        name: entry.name || "",
        createdAt
      };

      try {
        const { error } = await supabase.from("users").insert({
          id: newUser.id,
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          created_at: newUser.createdAt
        });

        if (error) {
          return res.status(500).json({ error: `Supabase public.users insertion failed: ${error.message}` });
        }

        return res.status(200).json({ success: true, user: { id: newUser.id, email: newUser.email, name: newUser.name } });
      } catch (err: any) {
        return res.status(500).json({ error: `Database error: ${err.message || err}` });
      }
    } else {
      // login mode - Fetch and return user info
      let foundUser: any = null;

      try {
        const { data, error } = await supabase.from("users").select("*").eq("email", searchEmail).maybeSingle();
        if (error) {
          return res.status(500).json({ error: `Supabase login failed: ${error.message}` });
        }
        if (data) {
          foundUser = data;
        }
      } catch (err: any) {
        return res.status(500).json({ error: `Database error: ${err.message || err}` });
      }

      if (!foundUser && (searchEmail === "admin" || searchEmail === "admin@dugsiga.com")) {
        foundUser = { id: "admin", email: "admin@dugsiga.com", name: "Admin" };
      }

      if (foundUser) {
        return res.status(200).json({ success: true, user: { id: foundUser.id, email: foundUser.email, name: foundUser.name } });
      }

      return res.status(404).json({ error: "User not found!" });
    }
  } catch (error: any) {
    console.error("CRITICAL unhandled error in Next.js verify-otp API route:", error);
    return res.status(500).json({
      error: `Server error: ${error.message || "An unexpected error occurred during OTP verification."}`
    });
  }
}
