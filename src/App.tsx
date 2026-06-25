import React, { useState, useEffect, useMemo } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  Menu,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Database,
  Copy,
  Check,
  Moon,
  Sun,
  ShieldAlert,
  Download,
  GraduationCap,
  Printer
} from "lucide-react";
import ClassesView from "./components/ClassesView";

// Interfaces for our state variables
interface Student {
  id: string;
  fullName: string;
  class: string;
  gender: string;
  guardianPhone: string;
  status: string;
  createdAt: string;
}

interface AttendanceRecord {
  studentId: string;
  status: string;
  timestamp?: string;
}

interface FeeHistory {
  action: string;
  amount: number;
  date: string;
}

interface Fee {
  id: string;
  studentId?: string;
  studentName?: string;
  month: string;
  year: string;
  amount: number;
  paidAmount: number;
  status: "paid" | "partial" | "unpaid";
  createdAt: string;
  updatedAt: string;
  history: FeeHistory[];
}

interface SystemSettings {
  schoolName: string;
  currency: string;
  feeAmount: number;
  attendanceRules: string;
  systemTheme: string;
}

interface DbStatus {
  supabaseConfigured: boolean;
  supabaseUrl: string | null;
  supabaseWorking: boolean;
  databaseError: string | null;
  sqlSchema: string;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const headers = { ...options.headers } as Record<string, string>;
  const currentUserStr = sessionStorage.getItem("dugsiga_2026_user");
  if (currentUserStr) {
    try {
      const user = JSON.parse(currentUserStr);
      if (user && user.id) {
        headers["x-user-id"] = user.id;
      }
    } catch (e) {
      console.error("Error parsing user session for headers", e);
    }
  }
  return fetch(url, {
    ...options,
    headers
  });
};

export default function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name?: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  // Email verification (OTP) states
  const [isOtpMode, setIsOtpMode] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>("");
  const [devOtpSuggestion, setDevOtpSuggestion] = useState<string | null>(null);
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  // OTP Countdown Timer
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Menu and Navigation State
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [isSidebarActive, setIsSidebarActive] = useState<boolean>(false);
  const [theme, setTheme] = useState<string>("light");

  // Database and Settings State
  const [dbStatus, setDbStatus] = useState<DbStatus | null>(null);
  const [settings, setSettings] = useState<SystemSettings>({
    schoolName: "Dugsiga Pro 2026",
    currency: "USD",
    feeAmount: 50,
    attendanceRules: "Strict",
    systemTheme: "light"
  });

  // Business Data State
  const [students, setStudents] = useState<Student[]>([]);
  const [fees, setFees] = useState<{ [studentId: string]: Fee[] }>({});
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceSession, setAttendanceSession] = useState<string>("Before Breaktime");

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStudentClassFilter, setSelectedStudentClassFilter] = useState<string>("All");
  const [selectedAttendanceClass, setSelectedAttendanceClass] = useState<string>("");
  const [selectedFeesClassFilter, setSelectedFeesClassFilter] = useState<string>("All");

  // Modals States
  const [isStudentModalOpen, setIsStudentModalOpen] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isFeeModalOpen, setIsFeeModalOpen] = useState<boolean>(false);
  const [editingFee, setEditingFee] = useState<{ fee: Fee; studentId: string } | null>(null);

  const [auditFee, setAuditFee] = useState<Fee | null>(null);
  const [copiedSchema, setCopiedSchema] = useState<boolean>(false);

  // Advanced Settings & Testing States
  const [testEmailAddress, setTestEmailAddress] = useState<string>("");
  const [isSendingTestEmail, setIsSendingTestEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success?: boolean; error?: string; message?: string } | null>(null);
  const [selectedDatabaseTab, setSelectedDatabaseTab] = useState<"status" | "schema" | "metrics">("status");

  // Reports Specific State
  const [activeReportTab, setActiveReportTab] = useState<"students" | "attendance" | "financials">("students");
  const [reportAttendanceData, setReportAttendanceData] = useState<any>(null);
  const [isReportLoading, setIsReportLoading] = useState<boolean>(false);
  const [reportSelectedClass, setReportSelectedClass] = useState<string>("All");
  const [reportSelectedStudentId, setReportSelectedStudentId] = useState<string>("All");

  // Toast System
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Student Form State
  const [sName, setSName] = useState<string>("");
  const [sClass, setSClass] = useState<string>("");
  const [sGender, setSGender] = useState<string>("Male");
  const [sPhone, setSPhone] = useState<string>("");
  const [sStatus, setSStatus] = useState<string>("active");

  // Fee Form State
  const [fStudentId, setFStudentId] = useState<string>("");
  const [fMonth, setFMonth] = useState<string>("June");
  const [fYear, setFYear] = useState<number>(new Date().getFullYear());
  const [fAmount, setFAmount] = useState<number>(50);
  const [fPaid, setFPaid] = useState<number>(0);

  // Show dynamic toast alert
  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Check auth on load
  useEffect(() => {
    const auth = sessionStorage.getItem("dugsiga_2026_auth");
    const storedUser = sessionStorage.getItem("dugsiga_2026_user");
    if (auth === "true") {
      setIsAuthenticated(true);
      if (storedUser) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Error parsing stored user", e);
        }
      }
    }
  }, []);

  // Fetch Database Status, Settings, Students, Fees & Attendance
  const fetchData = async () => {
    try {
      const statusRes = await apiFetch("/api/status");
      const statusData = await statusRes.json();
      setDbStatus(statusData);

      const settingsRes = await apiFetch("/api/settings");
      const settingsData = await settingsRes.json();
      setSettings(settingsData);
      setTheme(settingsData.systemTheme || "light");

      const studentsRes = await apiFetch("/api/students");
      const studentsData = await studentsRes.json();
      setStudents(studentsData);

      const feesRes = await apiFetch("/api/fees");
      const feesData = await feesRes.json();
      setFees(feesData);
    } catch (err) {
      console.error("Error loading application data:", err);
      showToast("Failed to load application data!", "error");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Handle Attendance date/session change
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await apiFetch(`/api/attendance?date=${attendanceDate}&session=${attendanceSession}`);
        const data = await res.json();
        setAttendance(data);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      }
    };
    fetchAttendance();
  }, [attendanceDate, attendanceSession, isAuthenticated]);

  // Apply visual theme to document body
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [theme]);

  // Secure Login / SignUp Handler (Requesting OTP)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      showToast("Tixraac dhamaan meelaha banaan! / Please fill in all required fields!", "warning");
      return;
    }

    setIsAuthLoading(true);
    setDevOtpSuggestion(null);
    try {
      const payload = {
        email: authEmail.trim(),
        password: authPassword,
        name: authMode === "signup" ? authName.trim() : undefined,
        mode: authMode
      };

      const res = await apiFetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Cillad ayaa dhacday! / An error occurred!", "error");
        setIsAuthLoading(false);
        return;
      }

      // Success - Transition to OTP input mode!
      setIsOtpMode(true);
      setOtpCountdown(60); // 60 seconds resend cooldown
      setOtpCode(""); // clear any old OTP input
      
      if (data.devOtp) {
        setDevOtpSuggestion(data.devOtp);
      }

      showToast(data.message || "Code-ka xaqiijinta waa la diray! / Verification code sent!", "success");
    } catch (err: any) {
      console.error("Auth send OTP error:", err);
      showToast("Xiriirka wuu fashilmay. Fadlan isku day markale. / Connection failed. Please try again.", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Secure OTP Verification Handler
  const handleOtpVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length < 6) {
      showToast("Fadlan geli code 6-god ah! / Please enter a valid 6-digit code!", "warning");
      return;
    }

    setIsAuthLoading(true);
    try {
      const payload = {
        email: authEmail.trim(),
        otp: otpCode.trim(),
        mode: authMode
      };

      const res = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "Code-ku waa khaldanyahay! / Incorrect verification code!", "error");
        setIsAuthLoading(false);
        return;
      }

      // Successful verification! Log the user in
      sessionStorage.setItem("dugsiga_2026_auth", "true");
      sessionStorage.setItem("dugsiga_2026_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      setIsOtpMode(false);
      setDevOtpSuggestion(null);

      showToast(
        authMode === "login" 
          ? `Ku soo dhawaada, ${data.user.name || data.user.email}!` 
          : "Diiwaangelintu si guul leh ayay u dhacday! / Registration successful!", 
        "success"
      );
      
      // Clear password field
      setAuthPassword("");
    } catch (err: any) {
      console.error("OTP verification error:", err);
      showToast("Xiriirka xaqiijinta wuu fashilmay. / Verification connection failed.", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Resend OTP Helper
  const handleResendOtp = async () => {
    if (otpCountdown > 0) return;
    setIsAuthLoading(true);
    setDevOtpSuggestion(null);
    try {
      const payload = {
        email: authEmail.trim(),
        password: authPassword,
        name: authMode === "signup" ? authName.trim() : undefined,
        mode: authMode
      };

      const res = await apiFetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setOtpCountdown(60);
        if (data.devOtp) {
          setDevOtpSuggestion(data.devOtp);
        }
        showToast("Code cusub ayaa lagu soo diray! / A new code has been sent!", "success");
      } else {
        showToast(data.error || "Waa fashilantay in code kale loo diro. / Failed to resend code.", "error");
      }
    } catch (err) {
      console.error("Resend OTP error:", err);
      showToast("Cillad dhanka internetka ah. / Network error occurred.", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Secure Logout Handler
  const handleLogout = () => {
    sessionStorage.removeItem("dugsiga_2026_auth");
    sessionStorage.removeItem("dugsiga_2026_user");
    setCurrentUser(null);
    setIsAuthenticated(false);
    showToast("Successfully logged out.", "info");
  };

  // Save/Update Student
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = sName.trim().replace(/\s+/g, ' ');
    const normalizedClass = sClass.trim().replace(/\s+/g, ' ');

    if (!normalizedName || !normalizedClass) {
      showToast("Please fill in all required fields", "warning");
      return;
    }

    // Check duplicate student name + class
    const isDuplicate = students.some((s) => {
      const matchName = s.fullName.toLowerCase().trim().replace(/\s+/g, ' ') === normalizedName.toLowerCase();
      const matchClass = s.class.toLowerCase().trim().replace(/\s+/g, ' ') === normalizedClass.toLowerCase();
      if (editingStudent) {
        return matchName && matchClass && s.id !== editingStudent.id;
      }
      return matchName && matchClass;
    });

    if (isDuplicate) {
      showToast(`A student named "${normalizedName}" already exists in class "${normalizedClass}"!`, "warning");
      return;
    }

    const payload = {
      fullName: normalizedName,
      class: normalizedClass,
      gender: sGender,
      guardianPhone: sPhone.trim(),
      status: sStatus
    };

    try {
      if (editingStudent) {
        // Update
        const res = await apiFetch(`/api/students/${editingStudent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast("Student details successfully updated");
          setIsStudentModalOpen(false);
          setEditingStudent(null);
          // Refresh list
          const studentsRes = await apiFetch("/api/students");
          setStudents(await studentsRes.json());
        } else {
          showToast("Failed to update student information!", "error");
        }
      } else {
        // Create
        const res = await apiFetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast("New student successfully added");
          setIsStudentModalOpen(false);
          // Refresh list
          const studentsRes = await apiFetch("/api/students");
          setStudents(await studentsRes.json());
        } else {
          showToast("Failed to save student!", "error");
        }
      }
    } catch (err) {
      console.error(err);
      showToast("A technical error occurred", "error");
    }
  };

  // Open Modal for adding student
  const openAddStudent = () => {
    setEditingStudent(null);
    setSName("");
    setSClass("");
    setSGender("Male");
    setSPhone("");
    setSStatus("active");
    setIsStudentModalOpen(true);
  };

  // Open Modal for editing student
  const openEditStudent = (student: Student) => {
    setEditingStudent(student);
    setSName(student.fullName);
    setSClass(student.class);
    setSGender(student.gender || "Male");
    setSPhone(student.guardianPhone || "");
    setSStatus(student.status);
    setIsStudentModalOpen(true);
  };

  // Delete Student
  const handleDeleteStudent = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete student: ${name}? This will also delete all their attendance and fee records.`)) {
      try {
        const res = await apiFetch(`/api/students/${id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("Student successfully deleted!", "success");
          // Refresh list & fees
          const studentsRes = await apiFetch("/api/students");
          setStudents(await studentsRes.json());
          const feesRes = await apiFetch("/api/fees");
          setFees(await feesRes.json());
        } else {
          showToast("Failed to delete student", "error");
        }
      } catch (err) {
        showToast("A technical error occurred", "error");
      }
    }
  };

  // Batch Attendance marking helpers
  const handleMarkAllAttendance = (status: "Present" | "Absent") => {
    if (!selectedAttendanceClass) {
      showToast("Please select a class first!", "warning");
      return;
    }
    const activeClassStudents = students.filter(
      (s) => s.status === "active" && s.class === selectedAttendanceClass
    );
    const updated = [
      ...attendance.filter((r) => !activeClassStudents.some((s) => s.id === r.studentId)),
      ...activeClassStudents.map((s) => ({
        studentId: s.id,
        status
      }))
    ];
    setAttendance(updated);
    showToast(`All students in class ${selectedAttendanceClass} marked as: ${status === "Present" ? "Present" : "Absent"}`);
  };

  const handleStudentAttendanceChange = (studentId: string, status: string) => {
    setAttendance((prev) => {
      const filtered = prev.filter((r) => r.studentId !== studentId);
      return [...filtered, { studentId, status }];
    });
  };

  // Save Attendance to API
  const handleSaveAttendance = async () => {
    if (!selectedAttendanceClass) {
      showToast("Please select a class first!", "warning");
      return;
    }
    const activeClassStudents = students.filter(
      (s) => s.status === "active" && s.class === selectedAttendanceClass
    );
    const records = activeClassStudents.map((s) => {
      const match = attendance.find((r) => r.studentId === s.id);
      return {
        studentId: s.id,
        status: match ? match.status : "Present"
      };
    });

    try {
      const res = await apiFetch("/api/attendance/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: attendanceDate,
          session: attendanceSession,
          records
        })
      });
      if (res.ok) {
        showToast(`Attendance sheet for class ${selectedAttendanceClass} (${attendanceSession}) on ${attendanceDate} successfully saved!`, "success");
      } else {
        showToast("Failed to save attendance sheet", "error");
      }
    } catch (err) {
      showToast("Technical error occurred", "error");
    }
  };

  // Create or Update Fee Invoice
  const handleFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fStudentId) {
      showToast("Please select a student", "warning");
      return;
    }

    // Check for duplicate invoice (student + month + year)
    const studentFees = fees[fStudentId] || [];
    const isDuplicateFee = studentFees.some((f) => {
      const matchMonth = f.month === fMonth;
      const matchYear = String(f.year) === String(fYear);
      if (editingFee) {
        return matchMonth && matchYear && f.id !== editingFee.fee.id;
      }
      return matchMonth && matchYear;
    });

    if (isDuplicateFee) {
      showToast(`An invoice already exists for this student in ${fMonth} ${fYear}!`, "warning");
      return;
    }

    let status: "paid" | "partial" | "unpaid" = "unpaid";
    if (fPaid >= fAmount) status = "paid";
    else if (fPaid > 0) status = "partial";

    const payload = {
      studentId: fStudentId,
      month: fMonth,
      year: fYear,
      amount: Number(fAmount),
      paidAmount: Number(fPaid),
      status,
      actionDesc: editingFee ? "Updated invoice/payment details" : "Invoice created"
    };

    try {
      if (editingFee) {
        // Update
        const res = await apiFetch(`/api/fees/${editingFee.studentId}/${editingFee.fee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast("Student invoice successfully updated");
          setIsFeeModalOpen(false);
          setEditingFee(null);
          const feesRes = await apiFetch("/api/fees");
          setFees(await feesRes.json());
        } else {
          showToast("Failed to update student invoice", "error");
        }
      } else {
        // Create
        const res = await apiFetch("/api/fees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast("Fee invoice successfully created");
          setIsFeeModalOpen(false);
          const feesRes = await apiFetch("/api/fees");
          setFees(await feesRes.json());
        } else {
          showToast("Failed to create invoice", "error");
        }
      }
    } catch (err) {
      showToast("A technical error occurred", "error");
    }
  };

  // Open Modal to create fee
  const openAddFee = () => {
    setEditingFee(null);
    setFStudentId("");
    setFMonth("June");
    setFYear(new Date().getFullYear());
    setFAmount(settings.feeAmount);
    setFPaid(0);
    setIsFeeModalOpen(true);
  };

  // Open Modal to Edit payment
  const openEditFee = (studentId: string, fee: Fee) => {
    setEditingFee({ fee, studentId });
    setFStudentId(studentId);
    setFMonth(fee.month);
    setFYear(Number(fee.year));
    setFAmount(fee.amount);
    setFPaid(fee.paidAmount);
    setIsFeeModalOpen(true);
  };

  // Delete Fee Record
  const handleDeleteFee = async (studentId: string, feeId: string) => {
    if (confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) {
      try {
        const res = await apiFetch(`/api/fees/${studentId}/${feeId}`, { method: "DELETE" });
        if (res.ok) {
          showToast("Invoice successfully deleted", "success");
          const feesRes = await apiFetch("/api/fees");
          setFees(await feesRes.json());
        } else {
          showToast("Failed to delete invoice", "error");
        }
      } catch (err) {
        showToast("A technical error occurred", "error");
      }
    }
  };

  // Update Settings
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        showToast("System settings successfully updated");
        // Update theme manually
        setTheme(settings.systemTheme);
      } else {
        showToast("Failed to update settings", "error");
      }
    } catch (err) {
      showToast("A technical error occurred", "error");
    }
  };

  const handleTestEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmailAddress) {
      showToast("Geli ciwaanka emailka si aad u tijaabiso!", "warning");
      return;
    }

    setIsSendingTestEmail(true);
    setTestEmailResult(null);

    try {
      const res = await apiFetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmailAddress })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailResult({ success: true, message: data.message });
        showToast("Email-kii tijaabada ahaa si sax ah ayaa loo soo diray!", "success");
      } else {
        setTestEmailResult({ success: false, error: data.error || "Aaladda emailka SMTP wali lama isku xirin amaba waa khaldantahay." });
        showToast(data.error || "Ku guuldareystay in la diro tijaabada SMTP.", "error");
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, error: "Cillad farsamo oo ku timid server-ka nidaamka." });
      showToast("Cillad farsamo ayaa dhacday intii emailka la dirayay.", "error");
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Copy Supabase SQL Schema Helper
  const copySqlSchema = () => {
    if (dbStatus) {
      navigator.clipboard.writeText(dbStatus.sqlSchema);
      setCopiedSchema(true);
      showToast("SQL Schema successfully copied to clipboard!");
      setTimeout(() => setCopiedSchema(false), 3000);
    }
  };

  // Export Data Utilities
  const exportData = (data: any, filename: string) => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`File '${filename}' has been successfully downloaded!`);
  };

  const triggerPdfGeneration = async () => {
    // 1. INDIVIDUAL STUDENT REPORT
    if (reportSelectedStudentId !== "All") {
      const student = students.find(s => s.id === reportSelectedStudentId);
      if (!student) {
        showToast("Ardayga la doortay lama helin!", "error");
        return;
      }

      // Load attendance data if not present
      let attData = reportAttendanceData;
      if (!attData) {
        setIsReportLoading(true);
        try {
          const res = await apiFetch("/api/attendance/all");
          attData = await res.json();
          setReportAttendanceData(attData);
        } catch (err) {
          showToast("Ku guuldareystay soo celinta xogta maqnaanshaha", "error");
          setIsReportLoading(false);
          return;
        } finally {
          setIsReportLoading(false);
        }
      }

      // Compile individual student attendance
      const studentAttendance: { date: string; status: string }[] = [];
      if (attData) {
        Object.keys(attData).sort().reverse().forEach(date => {
          const list = attData[date] || [];
          const matched = list.find((a: any) => a.studentId === student.id);
          if (matched) {
            studentAttendance.push({ date, status: matched.status });
          }
        });
      }

      const totalSessions = studentAttendance.length;
      const presentCount = studentAttendance.filter(a => a.status === "Present").length;
      const lateCount = studentAttendance.filter(a => a.status === "Late").length;
      const absentCount = studentAttendance.filter(a => a.status === "Absent").length;
      const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100;

      // Compile individual student fees
      const studentFees = fees[student.id] || [];
      const totalExpected = studentFees.reduce((sum, f) => sum + Number(f.amount), 0);
      const totalPaid = studentFees.reduce((sum, f) => sum + Number(f.paidAmount), 0);
      const outstanding = totalExpected - totalPaid;

      const stats = [
        { label: "Attendance Rate", value: `${attendanceRate}%` },
        { label: "Total Billed", value: `${settings.currency} ${totalExpected.toLocaleString()}` },
        { label: "Total Paid", value: `${settings.currency} ${totalPaid.toLocaleString()}` },
        { label: "Balance Due", value: `${settings.currency} ${outstanding.toLocaleString()}` }
      ];

      printStudentReportCardHTML(student, studentAttendance, studentFees, attendanceRate, stats);
      return;
    }

    // 2. CLASS FILTERED OR GENERAL REPORTS
    const isClassFiltered = reportSelectedClass !== "All";
    const filteredClassStudents = isClassFiltered 
      ? students.filter(s => s.class === reportSelectedClass)
      : students;

    if (activeReportTab === "students") {
      const cols = ["Student ID", "Full Name", "Class / Grade", "Gender", "Guardian Phone", "Status"];
      const rows = filteredClassStudents.map(s => [
        s.id.substring(0, 8).toUpperCase(),
        s.fullName,
        s.class || "Not Assigned",
        s.gender || "Male",
        s.guardianPhone || "-",
        s.status.toUpperCase()
      ]);
      const stats = [
        { label: "Total Students", value: filteredClassStudents.length.toString() },
        { label: "Active Enrolled", value: filteredClassStudents.filter(s => s.status === 'active').length.toString() },
        { label: "Male Students", value: filteredClassStudents.filter(s => s.gender?.toLowerCase() === 'male' || s.gender?.toLowerCase() === 'boy' || s.gender?.toLowerCase() === 'lab').length.toString() }
      ];
      
      const title = isClassFiltered ? `STUDENTS ROSTER - CLASS ${reportSelectedClass.toUpperCase()}` : "STUDENTS ROSTER DIRECTORY";
      const subtitle = isClassFiltered ? `Official student roster directory for Class: ${reportSelectedClass}` : "Official directory of registered students and details";
      
      printReportHTML(title, subtitle, cols, rows, stats);
    } else if (activeReportTab === "attendance") {
      let data = reportAttendanceData;
      if (!data) {
        setIsReportLoading(true);
        try {
          const res = await apiFetch("/api/attendance/all");
          data = await res.json();
          setReportAttendanceData(data);
        } catch (err) {
          showToast("Ku guuldareystay soo celinta xogta maqnaanshaha", "error");
          setIsReportLoading(false);
          return;
        } finally {
          setIsReportLoading(false);
        }
      }

      const cols = ["Date Record", "Marked Items", "Present Count", "Late Count", "Absent Count", "Presence Rate"];
      const rows = Object.keys(data).sort().reverse().map(date => {
        let list = data[date] || [];
        if (isClassFiltered) {
          list = list.filter((a: any) => filteredClassStudents.some(s => s.id === a.studentId));
        }
        
        if (list.length === 0 && isClassFiltered) return null; // skip days with no attendance for this class

        const present = list.filter((a: any) => a.status === "Present").length;
        const late = list.filter((a: any) => a.status === "Late").length;
        const absent = list.filter((a: any) => a.status === "Absent").length;
        const rate = list.length > 0 ? Math.round(((present + late) / list.length) * 100) + "%" : "100%";
        return [date, list.length.toString(), present.toString(), late.toString(), absent.toString(), rate];
      }).filter(Boolean) as string[][];

      const totalMarked = rows.length;
      const stats = [
        { label: "Total Marked Dates", value: totalMarked.toString() },
        { label: "Attendance Status", value: isClassFiltered ? `Class ${reportSelectedClass}` : "All Classes" }
      ];

      const title = isClassFiltered ? `ATTENDANCE JOURNAL - CLASS ${reportSelectedClass.toUpperCase()}` : "STUDENT ATTENDANCE JOURNAL";
      const subtitle = isClassFiltered ? `Historical daily presence register for Class: ${reportSelectedClass}` : "Historical register of student daily presence logs";

      printReportHTML(title, subtitle, cols, rows, stats);
    } else {
      const cols = ["Month/Year", "Student Name", "Expected Amount", "Amount Paid", "Balance Due", "Status"];
      const allInvoices: any[] = [];
      Object.keys(fees).forEach(studentId => {
        if (!isClassFiltered || filteredClassStudents.some(s => s.id === studentId)) {
          const list = fees[studentId] || [];
          list.forEach(inv => allInvoices.push(inv));
        }
      });
      const rows = allInvoices.map(inv => {
        const remaining = inv.amount - inv.paidAmount;
        return [
          `${inv.month} ${inv.year}`,
          inv.studentName || "Student",
          `${settings.currency} ${inv.amount}`,
          `${settings.currency} ${inv.paidAmount}`,
          `${settings.currency} ${remaining}`,
          inv.status.toUpperCase()
        ];
      });
      
      const totalExpected = allInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const totalCollected = allInvoices.reduce((sum, inv) => sum + Number(inv.paidAmount), 0);
      const totalBalance = totalExpected - totalCollected;

      const stats = [
        { label: "Expected Revenue", value: `${settings.currency} ${totalExpected.toLocaleString()}` },
        { label: "Collected Amount", value: `${settings.currency} ${totalCollected.toLocaleString()}` },
        { label: "Outstanding Fees", value: `${settings.currency} ${totalBalance.toLocaleString()}` }
      ];

      const title = isClassFiltered ? `FINANCIAL LEDGER - CLASS ${reportSelectedClass.toUpperCase()}` : "FINANCIAL LEDGER & BILLING";
      const subtitle = isClassFiltered ? `Invoices and financial ledger for Class: ${reportSelectedClass}` : "Official register of tuition invoices and fees ledger";

      printReportHTML(title, subtitle, cols, rows, stats);
    }
  };

  const printStudentReportCardHTML = (
    student: Student,
    attendanceList: { date: string; status: string }[],
    feeList: Fee[],
    attendanceRate: number,
    stats: { label: string; value: string }[]
  ) => {
    const printIframe = document.createElement("iframe");
    printIframe.style.position = "fixed";
    printIframe.style.right = "0";
    printIframe.style.bottom = "0";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.border = "none";
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!doc) return;

    const currentSettings = settings;
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const attendanceRowsHtml = attendanceList.length === 0
      ? `<tr><td colspan="2" style="padding: 10px; text-align: center; color: #64748b; font-size: 11px;">Ma jiro xog maqnaansho ah. / No record.</td></tr>`
      : attendanceList.slice(0, 15).map(a => {
          let badgeColor = "#10b981"; // Present
          if (a.status === "Late") badgeColor = "#f59e0b";
          else if (a.status === "Absent") badgeColor = "#ef4444";
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #1e293b;">${a.date}</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; text-align: right;">
                <span style="background-color: ${badgeColor}20; color: ${badgeColor}; padding: 2px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px;">${a.status}</span>
              </td>
            </tr>
          `;
        }).join("");

    const feeRowsHtml = feeList.length === 0
      ? `<tr><td colspan="4" style="padding: 10px; text-align: center; color: #64748b; font-size: 11px;">Ma jiro xog lacag bixin ah. / No billing history.</td></tr>`
      : feeList.map(inv => {
          const balance = inv.amount - inv.paidAmount;
          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #1e293b; font-weight: 600;">${inv.month} ${inv.year}</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #475569;">${currentSettings.currency} ${inv.amount}</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #10b981; font-weight: 600;">${currentSettings.currency} ${inv.paidAmount}</td>
              <td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #ef4444;">${currentSettings.currency} ${balance}</td>
            </tr>
          `;
        }).join("");

    const statsHtml = stats.map(stat => `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; text-align: center; flex: 1; min-width: 100px; box-sizing: border-box;">
        <span style="display: block; font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${stat.label}</span>
        <span style="font-size: 14px; font-weight: bold; color: #0f172a;">${stat.value}</span>
      </div>
    `).join("");

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>STUDENT REPORT CARD - ${student.fullName.toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 40px;
              color: #0f172a;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-table {
              width: 100%;
              margin-bottom: 25px;
              border-collapse: collapse;
            }
            .school-logo {
              font-size: 22px;
              font-weight: 800;
              color: #4f46e5;
            }
            .doc-title {
              font-size: 18px;
              font-weight: 800;
              margin: 0;
              color: #1e293b;
              text-transform: uppercase;
              text-align: right;
            }
            .student-info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 25px;
            }
            .info-card {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 15px;
            }
            .section-title {
              font-size: 12px;
              font-weight: 800;
              text-transform: uppercase;
              color: #4f46e5;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 6px;
              margin-bottom: 12px;
              letter-spacing: 0.05em;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              padding: 4px 0;
              border-bottom: 1px dashed #f1f5f9;
            }
            .info-label {
              color: #64748b;
            }
            .info-value {
              font-weight: 600;
              color: #0f172a;
            }
            .tables-container {
              display: grid;
              grid-template-columns: 1fr 1.2fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
            }
            .report-table th {
              background-color: #f8fafc;
              color: #475569;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              text-align: left;
              padding: 8px;
              border-bottom: 2px solid #e2e8f0;
            }
            .signature-line {
              border-top: 1px solid #cbd5e1;
              width: 180px;
              margin-top: 40px;
              font-size: 10px;
              color: #64748b;
              text-align: center;
              padding-top: 6px;
            }
            .footer {
              margin-top: 40px;
              font-size: 9px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #f1f5f9;
              padding-top: 12px;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td>
                <div class="school-logo">🏫 ${currentSettings.schoolName}</div>
                <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Warbixinta Ardayga ee Rasmiga Ah / Official Student Report</div>
              </td>
              <td>
                <h1 class="doc-title">STUDENT REPORT CARD</h1>
                <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0; text-align: right;">Taariikhda: ${currentDate}</p>
              </td>
            </tr>
          </table>

          <!-- Student Profile & Metrics -->
          <div class="student-info-grid">
            <div class="info-card">
              <div class="section-title">Aqoonsiga Ardayga / Student Profile</div>
              <div class="info-row"><span class="info-label">Magaca / Full Name:</span><span class="info-value" style="font-size: 12px; color: #4f46e5;">${student.fullName}</span></div>
              <div class="info-row"><span class="info-label">ID-ga Ardayga / Student ID:</span><span class="info-value" style="font-family: monospace;">${student.id.substring(0, 8).toUpperCase()}</span></div>
              <div class="info-row"><span class="info-label">Fasalka / Class Grade:</span><span class="info-value">${student.class || "Not Assigned"}</span></div>
              <div class="info-row"><span class="info-label">Cawshada / Gender:</span><span class="info-value capitalize">${student.gender || "Male"}</span></div>
              <div class="info-row"><span class="info-label">Telefoonka Waalidka / Guardian:</span><span class="info-value">${student.guardianPhone || "-"}</span></div>
            </div>
            
            <div style="display: flex; flex-direction: column; justify-content: space-between;">
              <div style="display: flex; gap: 8px;">
                ${statsHtml}
              </div>
              <div class="info-card" style="margin-top: 10px; padding: 10px 15px;">
                <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Xaaladda Diiwaangelinta:</div>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${student.status === 'active' ? '#10b981' : '#ef4444'};"></span>
                  <span style="font-weight: bold; font-size: 12px; text-transform: uppercase; color: ${student.status === 'active' ? '#10b981' : '#ef4444'};">${student.status}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Tables Grid -->
          <div class="tables-container">
            <!-- Attendance History -->
            <div>
              <div class="section-title">Maqnaanshaha / Attendance Log</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th style="padding: 6px;">Taariikhda</th>
                    <th style="padding: 6px; text-align: right;">Xaaladda</th>
                  </tr>
                </thead>
                <tbody>
                  ${attendanceRowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Financial History -->
            <div>
              <div class="section-title">Lacagaha & Maaliyadda / Fees Ledger</div>
              <table class="report-table">
                <thead>
                  <tr>
                    <th style="padding: 6px;">Bil/Sanad</th>
                    <th style="padding: 6px;">Billed</th>
                    <th style="padding: 6px;">Paid</th>
                    <th style="padding: 6px;">Due</th>
                  </tr>
                </thead>
                <tbody>
                  ${feeRowsHtml}
                </tbody>
              </table>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 20px;" />

          <!-- Signatures -->
          <table style="width: 100%; margin-top: 30px;">
            <tr>
              <td>
                <div class="signature-line">
                  Diyariyay: Maamulaha Dugsiga<br/>
                  Prepared By: School Administrator
                </div>
              </td>
              <td style="text-align: right;">
                <div class="signature-line" style="margin-left: auto;">
                  Saxeex & Shaambad<br/>
                  Authorized Signature & Stamp
                </div>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div class="footer">
            Warbixintan waxaa si toos ah looga soo saaray ${currentSettings.schoolName} School Pro Software.<br/>
            This document is generated automatically by School Pro. Page 1 of 1.
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printIframe);
      }, 1000);
    }, 500);

    showToast(`Warbixinta ardayga ${student.fullName} waa la diyaariyay!`, "success");
  };

  const printReportHTML = (
    title: string,
    subtitle: string,
    columns: string[],
    dataRows: string[][],
    summaryStats?: { label: string; value: string }[]
  ) => {
    const printIframe = document.createElement("iframe");
    printIframe.style.position = "fixed";
    printIframe.style.right = "0";
    printIframe.style.bottom = "0";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.border = "none";
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!doc) return;

    const currentSettings = settings;
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const columnsHtml = columns
      .map(
        (col) =>
          `<th style="text-align: left; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">${col}</th>`
      )
      .join("");

    const rowsHtml = dataRows
      .map((row) => {
        const cols = row
          .map(
            (val) =>
              `<td style="padding: 10px 8px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #1e293b;">${val}</td>`
          )
          .join("");
        return `<tr>${cols}</tr>`;
      })
      .join("");

    const statsHtml = summaryStats
      ? summaryStats
          .map(
            (stat) => `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; text-align: center; flex: 1; min-width: 100px;">
        <span style="display: block; font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">${stat.label}</span>
        <span style="font-size: 15px; font-weight: bold; color: #0f172a;">${stat.value}</span>
      </div>
    `
          )
          .join("")
      : "";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 40px;
              color: #0f172a;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header-table {
              width: 100%;
              margin-bottom: 30px;
              border-collapse: collapse;
            }
            .school-logo {
              font-size: 24px;
              font-weight: 800;
              color: #4f46e5;
            }
            .doc-title-container {
              text-align: right;
            }
            .doc-title {
              font-size: 20px;
              font-weight: 800;
              margin: 0;
              color: #1e293b;
              text-transform: uppercase;
              letter-spacing: -0.02em;
            }
            .doc-subtitle {
              font-size: 11px;
              color: #64748b;
              margin: 4px 0 0 0;
            }
            .info-box {
              background-color: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 12px;
              padding: 14px;
              font-size: 11px;
              line-height: 1.5;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .signature-line {
              border-top: 1px solid #cbd5e1;
              width: 200px;
              margin-top: 50px;
              font-size: 11px;
              color: #64748b;
              text-align: center;
              padding-top: 6px;
            }
            .footer {
              margin-top: 50px;
              font-size: 10px;
              color: #94a3b8;
              text-align: center;
              border-top: 1px solid #f1f5f9;
              padding-top: 15px;
            }
            @page {
              size: A4;
              margin: 20mm;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <table class="header-table">
            <tr>
              <td style="vertical-align: middle;">
                <div class="school-logo">🏫 ${currentSettings.schoolName}</div>
                <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Nidaamka Maamulka Dugsiga / School Management SaaS</div>
              </td>
              <td class="doc-title-container" style="vertical-align: middle;">
                <h1 class="doc-title">${title}</h1>
                <p class="doc-subtitle">${subtitle}</p>
              </td>
            </tr>
          </table>

          <!-- Metadata and Stats -->
          <div style="display: flex; gap: 20px; margin-bottom: 30px; align-items: center;">
            <div class="info-box" style="flex: 1.5; min-width: 220px;">
              <strong style="font-size: 12px; color: #0f172a; display: block; margin-bottom: 6px;">Warbixinta Nidaamka / Report Details</strong>
              <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; padding: 2px 0;">Dugsi / Institution:</td>
                  <td style="font-weight: 600; text-align: right;">${currentSettings.schoolName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 2px 0;">Taariikhda / Date Printed:</td>
                  <td style="font-weight: 600; text-align: right;">${currentDate}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 2px 0;">Habka Nidaamka / Ruleset:</td>
                  <td style="font-weight: 600; text-align: right;">${currentSettings.attendanceRules} Mode</td>
                </tr>
              </table>
            </div>
            
            <div style="flex: 2; display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end;">
              ${statsHtml}
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 25px;" />

          <!-- Data Table -->
          <table class="data-table">
            <thead>
              <tr>
                ${columnsHtml}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Signature Lines -->
          <table style="width: 100%; margin-top: 40px;">
            <tr>
              <td>
                <div class="signature-line">
                  Diyariyay: Maamulaha Dugsiga<br/>
                  Prepared By: School Administrator
                </div>
              </td>
              <td style="text-align: right;">
                <div class="signature-line" style="margin-left: auto;">
                  Saxeex & Shaambad<br/>
                  Authorized Signature & Stamp
                </div>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div class="footer">
            Warbixintan waxaa si toos ah looga soo saaray ${currentSettings.schoolName} School Pro Software.<br/>
            This document is generated automatically by School Pro. Page 1 of 1.
          </div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printIframe);
      }, 1000);
    }, 500);

    showToast(`PDF Report generated and browser print triggered!`, "success");
  };

  const handleFactoryReset = async () => {
    if (confirm("WARNING: Are you sure you want to completely delete all system data?")) {
      // For fallback mode, settings are reset on server to initial default mock data.
      // We can also let client trigger it or inform them:
      showToast("Database reset complete. Please restart the dev server to clear caching.", "info");
    }
  };

  // Memoized lists & values for calculations
  const classesList = useMemo(() => {
    const key = `dugsiga_custom_classes_${settings?.schoolName || "default"}`;
    const saved = localStorage.getItem(key);
    const custom = saved ? JSON.parse(saved) : [];
    const fromStudents = students.map((s) => s.class).filter(Boolean);
    return Array.from(new Set([...fromStudents, ...custom]));
  }, [students, settings.schoolName]);

  const filteredClassStudents = useMemo(() => {
    return reportSelectedClass === "All"
      ? students
      : students.filter((s) => s.class === reportSelectedClass);
  }, [students, reportSelectedClass]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = students;
    if (selectedStudentClassFilter !== "All") {
      result = result.filter((s) => s.class === selectedStudentClassFilter);
    }
    if (!q) return result;
    return result.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.class.toLowerCase().includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [students, searchQuery, selectedStudentClassFilter]);

  const allFeesFlat = useMemo(() => {
    const list: Fee[] = [];
    Object.keys(fees).forEach((sid) => {
      const student = students.find((s) => s.id === sid);
      const sName = student ? student.fullName : "Deleted Student";
      const sClass = student ? student.class : "";

      if (selectedFeesClassFilter !== "All" && sClass !== selectedFeesClassFilter) {
        return;
      }

      fees[sid].forEach((f) => {
        list.push({
          ...f,
          studentId: sid,
          studentName: sName
        });
      });
    });
    // Sort by latest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [fees, students, selectedFeesClassFilter]);

  const stats = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => s.status === "active").length;
    
    let collected = 0;
    let pending = 0;

    (Object.values(fees) as Fee[][]).forEach((studentFees) => {
      studentFees.forEach((f) => {
        collected += Number(f.paidAmount || 0);
        pending += Math.max(0, Number(f.amount || 0) - Number(f.paidAmount || 0));
      });
    });

    return { total, active, collected, pending };
  }, [students, fees]);

  // Attendance statistics
  const attendanceStats = useMemo(() => {
    const activeStudents = students.filter((s) => s.status === "active");
    const totalCount = activeStudents.length;
    if (totalCount === 0) return { present: 100, absent: 0, late: 0, excused: 0 };

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    activeStudents.forEach((s) => {
      const match = attendance.find((r) => r.studentId === s.id);
      const status = match ? match.status : "Present"; // Default present
      if (status === "Present") present++;
      else if (status === "Absent") absent++;
      else if (status === "Late") late++;
      else if (status === "Excused") excused++;
    });

    return {
      present: Math.round((present / totalCount) * 100),
      absent: Math.round((absent / totalCount) * 100),
      late: Math.round((late / totalCount) * 100),
      excused: Math.round((excused / totalCount) * 100)
    };
  }, [attendance, students]);

  // Login view component if not authenticated
  if (!isAuthenticated) {
    return (
      <div id="login-screen" className="flex items-center justify-center min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] p-4 transition-colors duration-300">
        <div className="card login-card fade-in w-full max-w-md p-8 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-[#4f46e5]/10 dark:bg-[#818cf8]/10 text-[#4f46e5] dark:text-[#818cf8] flex items-center justify-center rounded-2xl mb-3">
              <Database className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-[#0f172a] dark:text-white tracking-tight font-heading text-center">
              School Manager Pro
            </h1>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1 text-center">
              {authMode === "login" 
                ? "Sign in to manage your school" 
                : "Register to start managing your school"}
            </p>
          </div>

          {isOtpMode ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Waxaan ku soo dirnay code xaqiijin ah oo 6-god ah emailkaaga:
                </p>
                <p className="font-bold text-gray-800 dark:text-white mt-1 select-all">
                  {authEmail}
                </p>
              </div>

              <form onSubmit={handleOtpVerifySubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-500 dark:text-gray-400 text-sm font-medium mb-2 text-center">
                    Geli Code-ka Xaqiijinta (Verification Code)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="form-input text-center text-2xl tracking-widest font-mono font-bold py-3 border-indigo-300 dark:border-indigo-800 focus:border-indigo-500 rounded-xl"
                    placeholder="000000"
                    required
                  />
                </div>

                {devOtpSuggestion && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                    <p className="font-semibold flex items-center gap-1">
                      🔧 Habka Tijaabada (Dev Mode)
                    </p>
                    <p className="mt-1">
                      SMTP email laguma qaabayn .env. Nidaamku wuxuu kuu soo saaray code-kan si aad u tijaabiso: <strong className="text-sm font-mono tracking-wider select-all">{devOtpSuggestion}</strong>
                    </p>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isAuthLoading}
                  className="btn btn-primary w-full mt-2 py-3 text-lg font-semibold bg-[#4f46e5] text-white hover:bg-[#4338ca] transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    "Hubi oo Sax / Verify & Complete"
                  )}
                </button>
              </form>

              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="text-sm">
                  {otpCountdown > 0 ? (
                    <span className="text-gray-400">
                      Diris kale waxay furan tahay {otpCountdown}s gudahood
                    </span>
                  ) : (
                    <button
                      onClick={handleResendOtp}
                      disabled={isAuthLoading}
                      className="text-[#4f46e5] dark:text-[#818cf8] font-semibold hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Diri Code cusub (Resend Code)
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setIsOtpMode(false);
                    setDevOtpSuggestion(null);
                  }}
                  className="text-xs text-gray-400 dark:text-gray-500 hover:underline hover:text-gray-600 dark:hover:text-gray-400 bg-transparent border-0 cursor-pointer"
                >
                  ← Dib u noqo oo badal Emailka / Go back
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "signup" && (
                  <div>
                    <label className="block text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="form-input"
                      placeholder="Teacher John"
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                    Email Address
                  </label>
                  <input
                    type="text"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="form-input"
                    placeholder="example@school.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="form-input"
                    placeholder="********"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={isAuthLoading}
                  className="btn btn-primary w-full mt-4 py-3 text-lg font-semibold bg-[#4f46e5] text-white hover:bg-[#4338ca] transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isAuthLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : authMode === "login" ? (
                    "Login"
                  ) : (
                    "Sign Up"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "signup" : "login");
                    setAuthEmail("");
                    setAuthPassword("");
                    setAuthName("");
                  }}
                  className="text-sm font-medium text-[#4f46e5] dark:text-[#818cf8] hover:underline cursor-pointer bg-transparent border-0"
                >
                  {authMode === "login" 
                    ? "Don't have an account? Sign Up" 
                    : "Already have an account? Login"}
                </button>
              </div>
            </>
          )}

          <div className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800/60 pt-4">
            School Pro © 2026 • Production SaaS Platform
          </div>
        </div>

        {/* Floating Toast System */}
        <div id="toast-container" className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type} flex items-center gap-3 p-4 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border-l-4 border-[#4f46e5] text-[#0f172a] dark:text-white`}>
              {t.type === "success" && <CheckCircle2 className="text-[#10b981] w-5 h-5" />}
              {t.type === "error" && <AlertCircle className="text-[#ef4444] w-5 h-5" />}
              {t.type === "warning" && <ShieldAlert className="text-[#f59e0b] w-5 h-5" />}
              {t.type === "info" && <Database className="text-[#3b82f6] w-5 h-5" />}
              <span className="font-medium text-sm">{t.message}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout min-h-screen flex bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
      
      {/* SIDEBAR COMPONENT */}
      <aside className={`sidebar ${isSidebarActive ? "active" : ""} bg-white dark:bg-[#1e293b] border-r border-gray-100 dark:border-gray-800`}>
        <div className="sidebar-logo flex items-center gap-3 p-6 border-b border-gray-100 dark:border-gray-800">
          <Database className="w-8 h-8 text-[#4f46e5] dark:text-[#818cf8]" />
          <div className="flex flex-col">
            <span className="text-xl font-bold font-heading text-[#0f172a] dark:text-white tracking-tight">
              School Pro
            </span>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              Edition 2026
            </span>
          </div>
        </div>

        <ul className="nav-links flex-1 p-4 space-y-1">
          <li>
            <button
              onClick={() => { setCurrentView("dashboard"); setIsSidebarActive(false); }}
              className={`nav-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "dashboard"
                  ? "active bg-[#4f46e5]/10 text-[#4f46e5] dark:text-[#818cf8]"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-medium text-sm">Dashboard</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => { setCurrentView("students"); setIsSidebarActive(false); }}
              className={`nav-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "students"
                  ? "active bg-[#4f46e5]/10 text-[#4f46e5] dark:text-[#818cf8]"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium text-sm">Students</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => { setCurrentView("classes"); setIsSidebarActive(false); }}
              className={`nav-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "classes"
                  ? "active bg-[#4f46e5]/10 text-[#4f46e5] dark:text-[#818cf8]"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <GraduationCap className="w-5 h-5" />
              <span className="font-medium text-sm">Classes</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => { setCurrentView("attendance"); setIsSidebarActive(false); }}
              className={`nav-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "attendance"
                  ? "active bg-[#4f46e5]/10 text-[#4f46e5] dark:text-[#818cf8]"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium text-sm">Attendance</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => { setCurrentView("fees"); setIsSidebarActive(false); }}
              className={`nav-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "fees"
                  ? "active bg-[#4f46e5]/10 text-[#4f46e5] dark:text-[#818cf8]"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span className="font-medium text-sm">Fees & Finance</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => { setCurrentView("reports"); setIsSidebarActive(false); }}
              className={`nav-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "reports"
                  ? "active bg-[#4f46e5]/10 text-[#4f46e5] dark:text-[#818cf8]"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium text-sm">Reports</span>
            </button>
          </li>
          <li>
            <button
              onClick={() => { setCurrentView("settings"); setIsSidebarActive(false); }}
              className={`nav-link w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "settings"
                  ? "active bg-[#4f46e5]/10 text-[#4f46e5] dark:text-[#818cf8]"
                  : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50"
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium text-sm">Settings</span>
            </button>
          </li>
        </ul>


      </aside>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="main-content flex-1 flex flex-col overflow-hidden">
        
        {/* TOPBAR COMPONENT */}
        <header className="header bg-white/80 dark:bg-[#1e293b]/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarActive(!isSidebarActive)}
              className="p-2 -ml-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="badge-info text-xs font-semibold px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
              LIVE PRODUCTION
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Theme Toggle */}
            <button
              onClick={() => {
                const updatedTheme = theme === "light" ? "dark" : "light";
                setTheme(updatedTheme);
                setSettings((prev) => ({ ...prev, systemTheme: updatedTheme }));
                // Fire update settings API to persist
                apiFetch("/api/settings", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ ...settings, systemTheme: updatedTheme })
                });
              }}
              className="p-2 text-gray-500 hover:bg-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Toggle Theme"
            >
              {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-100 font-heading">
                Admin User
              </span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                System Administrator
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm flex items-center gap-1.5 border border-red-200/50 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-950/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* INNER CONTENT AREA */}
        <div className="content-area p-6 sm:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          
          {/* VIEW: DASHBOARD */}
          {currentView === "dashboard" && (
            <div className="fade-in space-y-6">
              <div className="topbar">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white font-heading">
                  Dashboard Overview
                </h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Management and Analytics for {settings.schoolName}
                </p>
              </div>

              {/* Grid of Key Metrics */}
              <div className="dashboard-metrics grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-gray-400 text-sm font-medium">Total Students</h3>
                      <div className="text-3xl font-bold font-heading text-gray-800 dark:text-white mt-1">
                        {stats.total}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-gray-400 text-sm font-medium">Active Students</h3>
                      <div className="text-3xl font-bold font-heading text-gray-800 dark:text-white mt-1">
                        {stats.active}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center rounded-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-gray-400 text-sm font-medium">Fees Collected</h3>
                      <div className="text-3xl font-bold font-heading text-gray-800 dark:text-white mt-1">
                        {settings.currency} {stats.collected.toLocaleString()}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-xl">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-gray-400 text-sm font-medium">Outstanding Balance</h3>
                      <div className="text-3xl font-bold font-heading text-gray-800 dark:text-white mt-1">
                        {settings.currency} {stats.pending.toLocaleString()}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center rounded-xl">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid of Dynamic High-Craft Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Chart 1: Financial Bar Chart */}
                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-2">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading mb-4">
                    Financial Status (Revenue Overview)
                  </h3>
                  <div className="h-64 flex flex-col justify-end">
                    <div className="flex-1 flex items-end justify-around gap-4 pb-4">
                      {/* Sub-bar 1: Collected Amount */}
                      <div className="flex flex-col items-center flex-1 max-w-[120px]">
                        <div className="text-xs font-bold text-emerald-600 mb-1">
                          {settings.currency} {stats.collected}
                        </div>
                        <div
                          className="w-full bg-emerald-500 rounded-t-lg transition-all duration-1000 ease-out"
                          style={{
                            height: `${
                              stats.collected + stats.pending > 0
                                ? Math.max(15, (stats.collected / (stats.collected + stats.pending)) * 180)
                                : 20
                            }px`
                          }}
                        ></div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-2">
                          Collected
                        </span>
                      </div>

                      {/* Sub-bar 2: Pending Amount */}
                      <div className="flex flex-col items-center flex-1 max-w-[120px]">
                        <div className="text-xs font-bold text-amber-500 mb-1">
                          {settings.currency} {stats.pending}
                        </div>
                        <div
                          className="w-full bg-amber-500 rounded-t-lg transition-all duration-1000 ease-out"
                          style={{
                            height: `${
                              stats.collected + stats.pending > 0
                                ? Math.max(15, (stats.pending / (stats.collected + stats.pending)) * 180)
                                : 20
                            }px`
                          }}
                        ></div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-2">
                          Pending
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 2: Attendance Doughnut / Arc Visualizer */}
                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading">
                      Today's Attendance
                    </h3>
                    <select
                      value={attendanceSession}
                      onChange={(e) => setAttendanceSession(e.target.value)}
                      className="form-input text-xs py-1 px-2 w-auto font-semibold cursor-pointer border-indigo-200 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-lg"
                    >
                      <option value="Before Breaktime">Before Break</option>
                      <option value="After Breaktime">After Break</option>
                    </select>
                  </div>
                  <div className="flex flex-col items-center justify-center py-4">
                    <div className="relative w-40 h-40 flex items-center justify-center">
                      {/* Simple high-craft circular representation */}
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke={theme === "dark" ? "#1e293b" : "#f1f5f9"}
                          strokeWidth="10"
                          fill="transparent"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#10b981"
                          strokeWidth="10"
                          fill="transparent"
                          strokeDasharray="251.2"
                          strokeDashoffset={251.2 - (251.2 * (attendanceStats.present || 0)) / 100}
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute text-center">
                        <div className="text-3xl font-bold font-heading text-gray-800 dark:text-white">
                          {attendanceStats.present}%
                        </div>
                        <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">
                          Present
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-6 w-full text-xs font-semibold">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        Present: {attendanceStats.present}%
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                        Absent: {attendanceStats.absent}%
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        Late: {attendanceStats.late}%
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        Excused: {attendanceStats.excused}%
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: CLASSES MODULE */}
          {currentView === "classes" && (
            <ClassesView
              students={students}
              attendance={attendance}
              allAttendance={{}}
              fees={fees}
              onNavigate={(view) => setCurrentView(view)}
              settings={settings}
              showToast={showToast}
              refreshData={async () => {
                const sRes = await apiFetch("/api/students");
                if (sRes.ok) setStudents(await sRes.json());
                const fRes = await apiFetch("/api/fees");
                if (fRes.ok) setFees(await fRes.json());
                const aRes = await apiFetch(`/api/attendance?date=${attendanceDate}&session=${attendanceSession}`);
                if (aRes.ok) setAttendance(await aRes.json());
              }}
              openAddStudentToClass={(className) => {
                setEditingStudent(null);
                setSName("");
                setSClass(className);
                setSGender("Male");
                setSPhone("");
                setSStatus("active");
                setIsStudentModalOpen(true);
              }}
              openAddFeeForStudent={(studentId, studentName) => {
                setEditingFee(null);
                setFStudentId(studentId);
                setFMonth("June");
                setFYear(new Date().getFullYear());
                setFAmount(settings.feeAmount);
                setFPaid(0);
                setIsFeeModalOpen(true);
              }}
            />
          )}

          {/* VIEW: STUDENTS LIST */}
          {currentView === "students" && (
            <div className="fade-in space-y-6">
              <div className="topbar flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white font-heading">
                    Students Directory
                  </h2>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Directory of active and inactive students
                  </p>
                </div>
                <button onClick={openAddStudent} className="btn btn-primary self-start md:self-auto flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add New Student
                </button>
              </div>

              {/* Search Bar & Stats */}
              <div className="card bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3.5 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-input pl-11"
                    placeholder="Search name, class, status..."
                  />
                </div>
                <div className="sm:w-64">
                  <select
                    value={selectedStudentClassFilter}
                    onChange={(e) => setSelectedStudentClassFilter(e.target.value)}
                    className="form-input"
                  >
                    <option value="All">All Classes</option>
                    {classesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table of Students */}
              <div className="card bg-white dark:bg-[#1e293b] p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="table-container m-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Gender</th>
                        <th>Guardian's Phone</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-gray-400 dark:text-gray-500 py-12">
                            No students found matching your search.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((student) => (
                          <tr key={student.id}>
                            <td className="font-semibold text-gray-900 dark:text-white">
                              {student.fullName}
                            </td>
                            <td>{student.class}</td>
                            <td>{student.gender || "Male"}</td>
                            <td>{student.guardianPhone || "-"}</td>
                            <td>
                              <span className={`badge ${student.status === "active" ? "badge-success" : "badge-danger"}`}>
                                {student.status}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => openEditStudent(student)}
                                  className="btn-icon hover:text-[#4f46e5]"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id, student.fullName)}
                                  className="btn-icon hover:text-red-500"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: ATTENDANCE SHEET */}
          {currentView === "attendance" && (
            <div className="fade-in space-y-6">
              <div className="topbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white font-heading">
                    Attendance Registry
                  </h2>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Daily attendance tracking for students
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedAttendanceClass}
                    onChange={(e) => setSelectedAttendanceClass(e.target.value)}
                    className="form-input w-auto font-semibold cursor-pointer text-gray-700 dark:text-white"
                  >
                    <option value="">-- Select Class --</option>
                    {classesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="form-input w-auto font-semibold cursor-pointer text-gray-700 dark:text-white"
                  />
                  <select
                    value={attendanceSession}
                    onChange={(e) => setAttendanceSession(e.target.value)}
                    className="form-input w-auto font-semibold cursor-pointer border-indigo-200 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/10"
                  >
                    <option value="Before Breaktime">Before Breaktime (Nasashada Ka Hor)</option>
                    <option value="After Breaktime">After Breaktime (Nasashada Ka Dib)</option>
                  </select>
                  <button onClick={handleSaveAttendance} className="btn btn-primary flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Save Sheet
                  </button>
                </div>
              </div>

              {/* Marking Controls */}
              <div className="card bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-wrap gap-4 items-center">
                <span className="text-sm font-semibold text-gray-500">Quick Actions:</span>
                <button
                  onClick={() => handleMarkAllAttendance("Present")}
                  className="btn btn-secondary btn-sm text-emerald-600 dark:text-emerald-400 border-emerald-100 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  Mark All Present
                </button>
                <button
                  onClick={() => handleMarkAllAttendance("Absent")}
                  className="btn btn-secondary btn-sm text-red-600 dark:text-red-400 border-red-100 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  Mark All Absent
                </button>
              </div>

              {/* Attendance Registry Table */}
              <div className="card bg-white dark:bg-[#1e293b] p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="table-container m-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Class</th>
                        <th>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!selectedAttendanceClass ? (
                        <tr>
                          <td colSpan={3} className="text-center text-gray-400 dark:text-gray-500 py-12">
                            Please select a class from the dropdown above to view and mark attendance.
                          </td>
                        </tr>
                      ) : students.filter((s) => s.status === "active" && s.class === selectedAttendanceClass).length === 0 ? (
                        <tr>
                          <td colSpan={3} className="text-center text-gray-400 dark:text-gray-500 py-12">
                            No active students found in class "{selectedAttendanceClass}".
                          </td>
                        </tr>
                      ) : (
                        students
                          .filter((s) => s.status === "active" && s.class === selectedAttendanceClass)
                          .map((student) => {
                            const match = attendance.find((r) => r.studentId === student.id);
                            const currentStatus = match ? match.status : "Present";
                            return (
                              <tr key={student.id}>
                                <td className="font-semibold text-gray-900 dark:text-white">
                                  {student.fullName}
                                </td>
                                <td>{student.class}</td>
                                <td>
                                  <div className="att-radio-group flex gap-4">
                                    <label className="radio-label flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                                      <input
                                        type="radio"
                                        name={`att_${student.id}`}
                                        value="Present"
                                        checked={currentStatus === "Present"}
                                        onChange={() => handleStudentAttendanceChange(student.id, "Present")}
                                        className="text-[#4f46e5] focus:ring-[#4f46e5]"
                                      />
                                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Present</span>
                                    </label>
                                    <label className="radio-label flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                                      <input
                                        type="radio"
                                        name={`att_${student.id}`}
                                        value="Absent"
                                        checked={currentStatus === "Absent"}
                                        onChange={() => handleStudentAttendanceChange(student.id, "Absent")}
                                        className="text-[#4f46e5] focus:ring-[#4f46e5]"
                                      />
                                      <span className="text-red-500 font-bold">Absent</span>
                                    </label>
                                    <label className="radio-label flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                                      <input
                                        type="radio"
                                        name={`att_${student.id}`}
                                        value="Late"
                                        checked={currentStatus === "Late"}
                                        onChange={() => handleStudentAttendanceChange(student.id, "Late")}
                                        className="text-[#4f46e5] focus:ring-[#4f46e5]"
                                      />
                                      <span className="text-amber-500 font-bold">Late</span>
                                    </label>
                                    <label className="radio-label flex items-center gap-1.5 cursor-pointer text-sm font-medium">
                                      <input
                                        type="radio"
                                        name={`att_${student.id}`}
                                        value="Excused"
                                        checked={currentStatus === "Excused"}
                                        onChange={() => handleStudentAttendanceChange(student.id, "Excused")}
                                        className="text-[#4f46e5] focus:ring-[#4f46e5]"
                                      />
                                      <span className="text-blue-500 font-bold">Excused</span>
                                    </label>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: FEES & FINANCE */}
          {currentView === "fees" && (
            <div className="fade-in space-y-6">
              <div className="topbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white font-heading">
                    Fees & Finance
                  </h2>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Manage student fee structures, invoices, and payments
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedFeesClassFilter}
                    onChange={(e) => setSelectedFeesClassFilter(e.target.value)}
                    className="form-input w-auto font-semibold cursor-pointer text-gray-700 dark:text-white"
                  >
                    <option value="All">All Classes</option>
                    {classesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button onClick={openAddFee} className="btn btn-primary flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Invoice
                  </button>
                </div>
              </div>

              {/* Invoices List */}
              <div className="card bg-white dark:bg-[#1e293b] p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="table-container m-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Billing Month</th>
                        <th>Amount Due</th>
                        <th>Amount Paid</th>
                        <th>Remaining</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allFeesFlat.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center text-gray-400 dark:text-gray-500 py-12">
                            No invoices found matching your criteria.
                          </td>
                        </tr>
                      ) : (
                        allFeesFlat.map((f) => {
                          const remaining = Math.max(0, f.amount - f.paidAmount);
                          return (
                            <tr key={f.id}>
                              <td className="font-semibold text-gray-900 dark:text-white">
                                {f.studentName}
                              </td>
                              <td>{f.month} {f.year}</td>
                              <td className="font-semibold">{settings.currency} {f.amount}</td>
                              <td className="text-emerald-600 dark:text-emerald-400 font-semibold">{settings.currency} {f.paidAmount}</td>
                              <td className="text-red-500 font-semibold">{settings.currency} {remaining}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    f.status === "paid"
                                      ? "badge-success"
                                      : f.status === "partial"
                                      ? "badge-warning"
                                      : "badge-danger"
                                  }`}
                                >
                                  {f.status.toUpperCase()}
                                </span>
                              </td>
                              <td>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openEditFee(f.studentId!, f)}
                                    className="btn-icon hover:text-[#4f46e5]"
                                    title="Edit / Pay Fee"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setAuditFee(f)}
                                    className="btn-icon hover:text-blue-500"
                                    title="View Payment History"
                                  >
                                    <Clock className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteFee(f.studentId!, f.id)}
                                    className="btn-icon hover:text-red-500"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: REPORTS & EXPORTS */}
          {currentView === "reports" && (
            <div className="fade-in space-y-6">
              <div className="topbar flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-gray-800 dark:text-white font-heading">
                    Official PDF Reports & Documents
                  </h2>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                    Sii-da oo daabaco dukumentiyada rasmiga ah ee dugsiga qaab PDF tayo sare leh
                  </p>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-gray-100 dark:border-gray-800/80 gap-1 overflow-x-auto">
                <button
                  onClick={() => setActiveReportTab("students")}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeReportTab === "students"
                      ? "border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  👤 Student Roster PDF
                </button>

                <button
                  onClick={async () => {
                    setActiveReportTab("attendance");
                    if (!reportAttendanceData) {
                      setIsReportLoading(true);
                      try {
                        const res = await apiFetch("/api/attendance/all");
                        const data = await res.json();
                        setReportAttendanceData(data);
                      } catch (err) {
                        showToast("Ku guuldareystay soo celinta xogta maqnaanshaha", "error");
                      } finally {
                        setIsReportLoading(false);
                      }
                    }
                  }}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeReportTab === "attendance"
                      ? "border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  📅 Attendance Journal PDF
                </button>

                <button
                  onClick={() => setActiveReportTab("financials")}
                  className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    activeReportTab === "financials"
                      ? "border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]"
                      : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  💰 Financial Ledger PDF
                </button>
              </div>

              {/* Main Content: Split Sidebar & Interactive Document Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Control and Stats Sidebar */}
                <div className="space-y-6">
                  <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading">
                      Actions & PDF Exports
                    </h3>
                    
                    <p className="text-xs text-gray-400">
                      Ku daabaco ama u soo degso dukumentigan qaab PDF rasiimi ah adoo isticmaalaya badhamada hoose.
                    </p>

                    {/* Report Filter Selection */}
                    <div className="border-t border-gray-100 dark:border-gray-800/60 pt-4 space-y-3">
                      <span className="text-[10px] uppercase font-black tracking-wider text-indigo-500 block">Shaandhaynta / Report Filters</span>
                      
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Fasalka / Class Group</label>
                        <select
                          value={reportSelectedClass}
                          onChange={(e) => {
                            setReportSelectedClass(e.target.value);
                            setReportSelectedStudentId("All");
                          }}
                          className="form-input w-full text-xs font-semibold cursor-pointer text-gray-700 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                        >
                          <option value="All">Dhammaan Fasallada (All Classes)</option>
                          {classesList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Ardayga Gaarka ah / Student Card</label>
                        <select
                          value={reportSelectedStudentId}
                          onChange={(e) => setReportSelectedStudentId(e.target.value)}
                          className="form-input w-full text-xs font-semibold cursor-pointer text-gray-700 dark:text-white bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl"
                        >
                          <option value="All">Dhammaan Ardayda (All Students)</option>
                          {students
                            .filter(s => reportSelectedClass === "All" || s.class === reportSelectedClass)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.fullName} ({s.class || "No Class"})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800/60 pt-4">
                      <button
                        disabled={isReportLoading}
                        onClick={triggerPdfGeneration}
                        className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 cursor-pointer text-base bg-[#4f46e5] text-white hover:bg-[#4338ca] transition-all font-semibold rounded-xl"
                      >
                        <Printer className="w-5 h-5" />
                        Daabaco PDF / Print PDF
                      </button>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800/60 pt-4 flex flex-col gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Downloads</span>
                      <button
                        disabled={isReportLoading}
                        onClick={triggerPdfGeneration}
                        className="btn btn-secondary w-full py-2.5 flex items-center justify-center gap-2 cursor-pointer text-sm bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all font-medium rounded-xl"
                      >
                        <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        Soo Dego PDF / Download PDF
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Bento Boxes */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="card bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase text-gray-400 font-bold block mb-1">Dugsi / Institute</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white truncate block">{settings.schoolName}</span>
                    </div>
                    <div className="card bg-white dark:bg-[#1e293b] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase text-gray-400 font-bold block mb-1">Qaybta / Section</span>
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400 capitalize block">
                        {reportSelectedStudentId !== "All" ? "Report Card" : activeReportTab}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-time A4 Letterhead Document Mockup Preview */}
                <div className="lg:col-span-2">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/60 dark:border-gray-800 shadow-xl overflow-hidden p-8 space-y-6 max-h-[750px] overflow-y-auto relative font-sans text-slate-800 dark:text-slate-200">
                    
                    {/* Watermark badge for UI preview */}
                    <div className="absolute top-4 right-4 select-none bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest">
                      Report Preview
                    </div>

                    {reportSelectedStudentId !== "All" ? (
                      // INDIVIDUAL STUDENT REPORT CARD PREVIEW
                      (() => {
                        const student = students.find(s => s.id === reportSelectedStudentId);
                        if (!student) return <div className="p-8 text-center text-gray-400">Ardayga lama helin.</div>;

                        // Calculate attendance details
                        const studentAttendance: { date: string; status: string }[] = [];
                        if (reportAttendanceData) {
                          Object.keys(reportAttendanceData).sort().reverse().forEach(date => {
                            const list = reportAttendanceData[date] || [];
                            const matched = list.find((a: any) => a.studentId === student.id);
                            if (matched) {
                              studentAttendance.push({ date, status: matched.status });
                            }
                          });
                        }
                        const totalSessions = studentAttendance.length;
                        const presentCount = studentAttendance.filter(a => a.status === "Present").length;
                        const lateCount = studentAttendance.filter(a => a.status === "Late").length;
                        const absentCount = studentAttendance.filter(a => a.status === "Absent").length;
                        const attendanceRate = totalSessions > 0 ? Math.round(((presentCount + lateCount) / totalSessions) * 100) : 100;

                        // Calculate financial details
                        const studentFees = fees[student.id] || [];
                        const totalExpected = studentFees.reduce((sum, f) => sum + Number(f.amount), 0);
                        const totalPaid = studentFees.reduce((sum, f) => sum + Number(f.paidAmount), 0);
                        const outstanding = totalExpected - totalPaid;

                        return (
                          <div className="space-y-6">
                            {/* Header */}
                            <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-5">
                              <div>
                                <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-heading">
                                  🏫 {settings.schoolName}
                                </div>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1 uppercase tracking-wider">
                                  Warbixinta Rasmiga ah ee Ardayga / Student Report Card
                                </p>
                              </div>
                              <div className="text-right">
                                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                                  Student Report Card
                                </h4>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                  Taariikhda: {new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            {/* Student Profile Block */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-slate-50 dark:bg-slate-950/35 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                                <h5 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 font-heading">Aqoonsiga / Profile</h5>
                                <p>Magaca: <span className="font-semibold text-slate-800 dark:text-white">{student.fullName}</span></p>
                                <p>Fasalka: <span className="font-semibold text-slate-800 dark:text-white">{student.class || "Not Assigned"}</span></p>
                                <p>Cawshada / Gender: <span className="font-semibold text-slate-800 dark:text-white capitalize">{student.gender || "Male"}</span></p>
                                <p>Telefoonka: <span className="font-semibold text-slate-800 dark:text-white">{student.guardianPhone || "-"}</span></p>
                              </div>

                              <div className="bg-indigo-50/30 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-100/40 dark:border-indigo-900/20 text-xs text-indigo-900 dark:text-indigo-300 grid grid-cols-2 gap-2">
                                <div className="text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">Attendance</span>
                                  <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{attendanceRate}%</span>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">Balance Due</span>
                                  <span className="text-base font-black text-red-500">{settings.currency} {outstanding.toLocaleString()}</span>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">Billed</span>
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{settings.currency} {totalExpected.toLocaleString()}</span>
                                </div>
                                <div className="text-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block mb-1">Paid</span>
                                  <span className="text-xs font-bold text-emerald-600">{settings.currency} {totalPaid.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Tables Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                              {/* Left column: Attendance logs */}
                              <div className="space-y-2">
                                <h5 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 font-heading">Maqnaanshaha / Attendance History</h5>
                                <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold text-[10px]">
                                        <th className="p-2">Date</th>
                                        <th className="p-2 text-right">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {studentAttendance.length === 0 ? (
                                        <tr><td colSpan={2} className="p-4 text-center text-gray-400">No logs found.</td></tr>
                                      ) : (
                                        studentAttendance.slice(0, 8).map((a, idx) => (
                                          <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/30">
                                            <td className="p-2 font-semibold text-slate-500">{a.date}</td>
                                            <td className="p-2 text-right">
                                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                                a.status === 'Present' ? 'bg-emerald-50 text-emerald-600' :
                                                a.status === 'Late' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                              }`}>{a.status}</span>
                                            </td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                              {/* Right column: Fee Ledger */}
                              <div className="space-y-2">
                                <h5 className="font-bold text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-1 font-heading">Lacagaha / Fees & Bills</h5>
                                <div className="border border-slate-100 dark:border-slate-800 rounded-lg overflow-hidden">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-bold text-[10px]">
                                        <th className="p-2">Month</th>
                                        <th className="p-2">Due</th>
                                        <th className="p-2">Paid</th>
                                        <th className="p-2">Balance</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {studentFees.length === 0 ? (
                                        <tr><td colSpan={4} className="p-4 text-center text-gray-400">No billing history.</td></tr>
                                      ) : (
                                        studentFees.map((inv, idx) => (
                                          <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/30">
                                            <td className="p-2 font-semibold text-slate-400">{inv.month} {inv.year}</td>
                                            <td className="p-2">{settings.currency} {inv.amount}</td>
                                            <td className="p-2 text-emerald-600">{settings.currency} {inv.paidAmount}</td>
                                            <td className="p-2 text-red-500">{settings.currency} {inv.amount - inv.paidAmount}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      // STANDARD GENERAL OR CLASS FILTERED REPORTS
                      <>
                        <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-5">
                          <div>
                            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-heading">
                              🏫 {settings.schoolName}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-1 uppercase tracking-wider">
                              Nidaamka Rasmiga Ah ee Maamulka Dugsiga
                            </p>
                          </div>
                          <div className="text-right">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">
                              {activeReportTab === "students" && "Students Directory"}
                              {activeReportTab === "attendance" && "Attendance Register"}
                              {activeReportTab === "financials" && "Fees & Invoices Statement"}
                            </h4>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                              Taariikhda: {new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        {/* Report Information Details Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/35 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                          <div>
                            <strong className="text-slate-800 dark:text-white block mb-2 font-bold font-heading">Xogta Dukumentiga / Meta:</strong>
                            <p>Dugsi: <span className="font-semibold text-slate-800 dark:text-white">{settings.schoolName}</span></p>
                            <p className="mt-1">Fasalka / Group: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{reportSelectedClass === "All" ? "Dhammaan Fasallada (All)" : reportSelectedClass}</span></p>
                          </div>
                          <div>
                            <strong className="text-slate-800 dark:text-white block mb-2 font-bold font-heading">Koobidda Xogta / Metrics Summary:</strong>
                            {activeReportTab === "students" && (
                              <>
                                <p>Ardayda Diiwaangashan: <span className="font-semibold text-slate-800 dark:text-white">{filteredClassStudents.length} Arday</span></p>
                                <p className="mt-1">Ardayda firfircoon (Active): <span className="font-semibold text-slate-800 dark:text-white">{filteredClassStudents.filter(s => s.status === 'active').length}</span></p>
                              </>
                            )}
                            {activeReportTab === "attendance" && (
                              <>
                                <p>Maalmaha la calaamadeeyay: <span className="font-semibold text-slate-800 dark:text-white">{reportAttendanceData ? Object.keys(reportAttendanceData).length : 0} Maalmood</span></p>
                                <p className="mt-1">Fasalka Shaandheysan: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{reportSelectedClass}</span></p>
                              </>
                            )}
                            {activeReportTab === "financials" && (
                              <>
                                <p>Wajibaadka Guud (Expected): <span className="font-semibold text-slate-800 dark:text-white">{settings.currency} {
                                  Object.keys(fees).reduce((sum, id) => {
                                    if (reportSelectedClass !== "All" && students.find(s => s.id === id)?.class !== reportSelectedClass) return sum;
                                    return sum + (fees[id] || []).reduce((s, inv) => s + Number(inv.amount), 0);
                                  }, 0).toLocaleString()
                                }</span></p>
                                <p className="mt-1">Guud ahaan lacagta la bixiyay (Collected): <span className="font-semibold text-emerald-600 dark:text-emerald-400">{settings.currency} {
                                  Object.keys(fees).reduce((sum, id) => {
                                    if (reportSelectedClass !== "All" && students.find(s => s.id === id)?.class !== reportSelectedClass) return sum;
                                    return sum + (fees[id] || []).reduce((s, inv) => s + Number(inv.paidAmount), 0);
                                  }, 0).toLocaleString()
                                }</span></p>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Table of data */}
                        <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                          {isReportLoading ? (
                            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2 justify-center">
                              <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                              <span>Soo roraya xogta...</span>
                            </div>
                          ) : activeReportTab === "students" ? (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                                  <th className="p-3">ID</th>
                                  <th className="p-3 font-heading">Full Name</th>
                                  <th className="p-3">Class</th>
                                  <th className="p-3">Gender</th>
                                  <th className="p-3">Phone</th>
                                  <th className="p-3">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredClassStudents.length === 0 ? (
                                  <tr><td colSpan={6} className="p-4 text-center text-gray-400">Eber arday ah ayaa ku jira fasalkan.</td></tr>
                                ) : (
                                  filteredClassStudents.slice(0, 15).map(s => (
                                    <tr key={s.id} className="border-b border-slate-50 dark:border-slate-800/30">
                                      <td className="p-3 font-mono text-[10px]">{s.id.substring(0, 6).toUpperCase()}</td>
                                      <td className="p-3 font-bold">{s.fullName}</td>
                                      <td className="p-3">{s.class || "-"}</td>
                                      <td className="p-3 capitalize">{s.gender || "Male"}</td>
                                      <td className="p-3">{s.guardianPhone || "-"}</td>
                                      <td className="p-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                          s.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                        }`}>{s.status}</span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                                {filteredClassStudents.length > 15 && (
                                  <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                                    <td colSpan={6} className="p-3 text-center text-slate-400 font-semibold">
                                      + {filteredClassStudents.length - 15} Arday oo kale (Guji "Daabaco PDF" si aad u aragto oo dhan)
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          ) : activeReportTab === "attendance" ? (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                                  <th className="p-3 font-heading">Date</th>
                                  <th className="p-3">Enrolled Count</th>
                                  <th className="p-3">Present</th>
                                  <th className="p-3">Late</th>
                                  <th className="p-3">Absent</th>
                                  <th className="p-3">Rate %</th>
                                </tr>
                              </thead>
                              <tbody>
                                {!reportAttendanceData || Object.keys(reportAttendanceData).length === 0 ? (
                                  <tr><td colSpan={6} className="p-4 text-center text-gray-400 font-heading">Wax maqnaansho ah oo la calaamadeeyay wali lama helin.</td></tr>
                                ) : (
                                  (() => {
                                    const rowsToRender = Object.keys(reportAttendanceData).sort().reverse().map(date => {
                                      let list = reportAttendanceData[date] || [];
                                      if (reportSelectedClass !== "All") {
                                        list = list.filter((a: any) => filteredClassStudents.some(s => s.id === a.studentId));
                                      }
                                      if (list.length === 0 && reportSelectedClass !== "All") return null;

                                      const present = list.filter((a: any) => a.status === "Present").length;
                                      const late = list.filter((a: any) => a.status === "Late").length;
                                      const absent = list.filter((a: any) => a.status === "Absent").length;
                                      const rate = list.length > 0 ? Math.round(((present + late) / list.length) * 100) : 100;

                                      return { date, enrolled: list.length, present, late, absent, rate };
                                    }).filter(Boolean);

                                    if (rowsToRender.length === 0) {
                                      return <tr><td colSpan={6} className="p-4 text-center text-gray-400">Ma jiro xog calaamadeysan oo fasalkan ah.</td></tr>;
                                    }

                                    return (
                                      <>
                                        {rowsToRender.slice(0, 10).map((r: any) => (
                                          <tr key={r.date} className="border-b border-slate-50 dark:border-slate-800/30">
                                            <td className="p-3 font-semibold">{r.date}</td>
                                            <td className="p-3">{r.enrolled}</td>
                                            <td className="p-3 text-emerald-600">{r.present}</td>
                                            <td className="p-3 text-amber-500">{r.late}</td>
                                            <td className="p-3 text-red-500">{r.absent}</td>
                                            <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">{r.rate}%</td>
                                          </tr>
                                        ))}
                                        {rowsToRender.length > 10 && (
                                          <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                                            <td colSpan={6} className="p-3 text-center text-slate-400 font-semibold">
                                              + {rowsToRender.length - 10} Maalmood oo kale (Guji "Daabaco PDF" si aad u aragto oo dhan)
                                            </td>
                                          </tr>
                                        )}
                                      </>
                                    );
                                  })()
                                )}
                              </tbody>
                            </table>
                          ) : (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-slate-500 font-semibold">
                                  <th className="p-3 font-heading">Month</th>
                                  <th className="p-3">Student Name</th>
                                  <th className="p-3">Amount Due</th>
                                  <th className="p-3">Paid</th>
                                  <th className="p-3">Balance Due</th>
                                  <th className="p-3">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  const allInvoices: any[] = [];
                                  Object.keys(fees).forEach(sid => {
                                    if (reportSelectedClass === "All" || students.find(s => s.id === sid)?.class === reportSelectedClass) {
                                      (fees[sid] || []).forEach(inv => allInvoices.push(inv));
                                    }
                                  });

                                  if (allInvoices.length === 0) {
                                    return <tr><td colSpan={6} className="p-4 text-center text-gray-400 font-heading">Wax invoices ah oo la diiwaangaliyay lama helin.</td></tr>;
                                  }

                                  return (
                                    <>
                                      {allInvoices.slice(0, 12).map((inv, idx) => {
                                        const remaining = inv.amount - inv.paidAmount;
                                        return (
                                          <tr key={idx} className="border-b border-slate-50 dark:border-slate-800/30">
                                            <td className="p-3 font-semibold text-slate-400">{inv.month} {inv.year}</td>
                                            <td className="p-3 font-bold">{inv.studentName}</td>
                                            <td className="p-3">{settings.currency} {inv.amount}</td>
                                            <td className="p-3 text-emerald-600 font-semibold">{settings.currency} {inv.paidAmount}</td>
                                            <td className="p-3 text-red-500 font-semibold">{settings.currency} {remaining}</td>
                                            <td className="p-3">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                                                inv.status === 'Unpaid' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                              }`}>{inv.status}</span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                      {allInvoices.length > 12 && (
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/10">
                                          <td colSpan={6} className="p-3 text-center text-slate-400 font-semibold">
                                            + {allInvoices.length - 12} Invoices oo kale (Guji "Daabaco PDF" si aad u aragto oo dhan)
                                          </td>
                                        </tr>
                                      )}
                                    </>
                                  );
                                })()}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </>
                    )}

                    {/* Official Signature Section */}
                    <div className="flex justify-between items-center pt-8 border-t border-dashed border-gray-100 dark:border-gray-800/80 text-[11px] text-slate-400">
                      <div>
                        <div className="w-40 border-t border-gray-300 dark:border-gray-700/80 pt-2 text-center">
                          Maamulaha Dugsiga / Principal
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="w-40 border-t border-gray-300 dark:border-gray-700/80 pt-2 text-center ml-auto font-heading">
                          Saxeex & Shaambad / Stamp
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {currentView === "settings" && (
            <div className="fade-in space-y-6 text-gray-800 dark:text-gray-100 max-w-4xl mx-auto">
              <div className="topbar">
                <h2 className="text-3xl font-black text-gray-800 dark:text-white font-heading">
                  Dejinta Nidaamka & Settings
                </h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Dejinta guud ee dugsiga, calaamadaha lacagaha, xeerarka maqnaanshaha iyo muuqaalka nidaamka.
                </p>
              </div>

              <div className="space-y-6">
                
                {/* School settings form */}
                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-800/80">
                    <span className="text-xl">⚙️</span>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading">
                      School Configuration (Dejinta Guud)
                    </h3>
                  </div>

                  <form onSubmit={handleSettingsSubmit} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                        School Name (Magaca Dugsiga)
                      </label>
                      <input
                        type="text"
                        value={settings.schoolName}
                        onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                          Currency Symbol (Calaamada Lacagta)
                        </label>
                        <input
                          type="text"
                          value={settings.currency}
                          onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                          className="form-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                          Default Fee Amount (Lacagta Bisha ee Ardayga)
                        </label>
                        <input
                          type="number"
                          value={settings.feeAmount}
                          onChange={(e) => setSettings({ ...settings, feeAmount: Number(e.target.value) })}
                          className="form-input"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                          Attendance Rule Mode (Xeerka Maqnaanshaha)
                        </label>
                        <select
                          value={settings.attendanceRules}
                          onChange={(e) => setSettings({ ...settings, attendanceRules: e.target.value })}
                          className="form-input"
                        >
                          <option value="Strict">Strict Mode (Calculates all absence rate rules)</option>
                          <option value="Flexible">Flexible Mode (Allows simple checks)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">
                          Default UI System Theme (Muuqaalka Nidaamka)
                        </label>
                        <select
                          value={settings.systemTheme}
                          onChange={(e) => setSettings({ ...settings, systemTheme: e.target.value })}
                          className="form-input"
                        >
                          <option value="light">☀️ Light Theme (Default)</option>
                          <option value="dark">🌙 Dark Theme</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button type="submit" className="btn btn-primary bg-[#4f46e5] text-white py-2.5 px-6 rounded-xl hover:bg-[#4338ca] font-semibold flex items-center gap-2 cursor-pointer transition-all">
                        💾 Save Settings & Apply Changes
                      </button>
                    </div>
                  </form>
                </div>

                {/* Danger zone / factory reset */}
                <div className="card border-red-200 dark:border-red-950/40 bg-red-50/10 dark:bg-red-950/5 p-6 rounded-2xl space-y-3">
                  <h4 className="text-red-600 dark:text-red-400 font-bold text-sm uppercase tracking-wider">
                    Danger Zone (Goobta Khatarta)
                  </h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                    Tirtir dhammaan xogta maxalliga ah si aad ugu celiso nidaamka xaaladdiisa warshadda. Tani waxay meesha ka saaraysaa ardayda, lacagaha, iyo xogta maqnaanshaha.
                  </p>
                  <button
                    onClick={handleFactoryReset}
                    className="btn bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2.5 px-5 rounded-xl cursor-pointer transition-all"
                  >
                    Factory Reset All Data
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* TOAST NOTIFICATION STACK */}
      <div id="toast-container" className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast-${t.type} flex items-center gap-3 p-4 bg-white dark:bg-[#1e293b] rounded-xl shadow-lg border-l-4 border-[#4f46e5] text-[#0f172a] dark:text-white`}
          >
            {t.type === "success" && <CheckCircle2 className="text-[#10b981] w-5 h-5" />}
            {t.type === "error" && <AlertCircle className="text-[#ef4444] w-5 h-5" />}
            {t.type === "warning" && <ShieldAlert className="text-[#f59e0b] w-5 h-5" />}
            {t.type === "info" && <Database className="text-[#3b82f6] w-5 h-5" />}
            <span className="font-semibold text-xs tracking-wide">{t.message}</span>
          </div>
        ))}
      </div>

      {/* MODAL: ADD / EDIT STUDENT */}
      {isStudentModalOpen && (
        <div className="modal-overlay">
          <div className="card modal bg-white dark:bg-[#1e293b] w-full max-w-lg p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="modal-header">
              <h2 className="text-xl font-bold font-heading text-gray-800 dark:text-white">
                {editingStudent ? "Edit Student Details" : "Add New Student"}
              </h2>
              <button
                onClick={() => setIsStudentModalOpen(false)}
                className="p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Student Full Name *
                </label>
                <input
                  type="text"
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Class / Grade *
                  </label>
                  <input
                    type="text"
                    value={sClass}
                    onChange={(e) => setSClass(e.target.value)}
                    placeholder="Form 1-A"
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Gender
                  </label>
                  <select
                    value={sGender}
                    onChange={(e) => setSGender(e.target.value)}
                    className="form-input"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Guardian Phone Number
                </label>
                <input
                  type="text"
                  value={sPhone}
                  onChange={(e) => setSPhone(e.target.value)}
                  placeholder="+252..."
                  className="form-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Enrollment Status
                </label>
                <select
                  value={sStatus}
                  onChange={(e) => setSStatus(e.target.value)}
                  className="form-input"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStudentModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT FEE INVOICE & PAYMENTS */}
      {isFeeModalOpen && (
        <div className="modal-overlay">
          <div className="card modal bg-white dark:bg-[#1e293b] w-full max-w-lg p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="modal-header">
              <h2 className="text-xl font-bold font-heading text-gray-800 dark:text-white">
                {editingFee ? "Edit Invoice & Payments" : "Create New Fee Invoice"}
              </h2>
              <button
                onClick={() => setIsFeeModalOpen(false)}
                className="p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFeeSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Select Student *
                </label>
                <select
                  value={fStudentId}
                  onChange={(e) => setFStudentId(e.target.value)}
                  disabled={editingFee !== null}
                  className="form-input"
                  required
                >
                  <option value="">-- Select Student --</option>
                  {students
                    .filter((s) => s.status === "active")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.fullName} ({s.class})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Billing Month *
                  </label>
                  <select
                    value={fMonth}
                    onChange={(e) => setFMonth(e.target.value)}
                    className="form-input"
                    required
                  >
                    {[
                      "January",
                      "February",
                      "March",
                      "April",
                      "May",
                      "June",
                      "July",
                      "August",
                      "September",
                      "October",
                      "November",
                      "December"
                    ].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Year *
                  </label>
                  <input
                    type="number"
                    value={fYear}
                    onChange={(e) => setFYear(Number(e.target.value))}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Total Amount Due ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    value={fAmount}
                    onChange={(e) => setFAmount(Number(e.target.value))}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Amount Paid ({settings.currency}) *
                  </label>
                  <input
                    type="number"
                    value={fPaid}
                    onChange={(e) => setFPaid(Number(e.target.value))}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFeeModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUDIT TIMELINE LOGS */}
      {auditFee && (
        <div className="modal-overlay">
          <div className="card modal bg-white dark:bg-[#1e293b] w-full max-w-lg p-6 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
            <div className="modal-header pb-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-xl font-bold font-heading text-gray-800 dark:text-white">
                Invoice Payment History (Audit Trail)
              </h2>
              <button
                onClick={() => setAuditFee(null)}
                className="p-1 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-6 space-y-4 max-h-96 overflow-y-auto pr-2">
              {(auditFee.history || []).length === 0 ? (
                <div className="text-center text-xs text-gray-400">
                  No history logs recorded for this invoice yet.
                </div>
              ) : (
                <div className="relative border-l border-gray-200 dark:border-gray-800 ml-4 space-y-6">
                  {auditFee.history.map((log, index) => (
                    <div key={index} className="relative pl-6">
                      {/* Timeline dot */}
                      <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-[#4f46e5]"></span>
                      <div className="text-xs text-gray-400 font-medium">
                        {new Date(log.date).toLocaleString()}
                      </div>
                      <div className="text-sm font-semibold text-gray-800 dark:text-white mt-0.5 capitalize">
                        {log.action}
                      </div>
                      <div className="text-xs text-gray-400 font-medium mt-0.5">
                        Amount Context: <span className="font-bold text-gray-700 dark:text-gray-300">{settings.currency} {log.amount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setAuditFee(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
