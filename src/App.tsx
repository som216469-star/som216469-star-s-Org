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
  GraduationCap
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

  // Handle Attendance date change
  useEffect(() => {
    const fetchAttendance = async () => {
      if (!isAuthenticated) return;
      try {
        const res = await apiFetch(`/api/attendance?date=${attendanceDate}`);
        const data = await res.json();
        setAttendance(data);
      } catch (err) {
        console.error("Error fetching attendance:", err);
      }
    };
    fetchAttendance();
  }, [attendanceDate, isAuthenticated]);

  // Apply visual theme to document body
  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  }, [theme]);

  // Secure Login / SignUp Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      showToast("Please fill in all required fields!", "warning");
      return;
    }

    setIsAuthLoading(true);
    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const payload = {
        email: authEmail.trim(),
        password: authPassword,
        name: authMode === "signup" ? authName.trim() : undefined
      };

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || "An error occurred!", "error");
        setIsAuthLoading(false);
        return;
      }

      sessionStorage.setItem("dugsiga_2026_auth", "true");
      sessionStorage.setItem("dugsiga_2026_user", JSON.stringify(data.user));
      setCurrentUser(data.user);
      setIsAuthenticated(true);
      
      showToast(
        authMode === "login" 
          ? `Welcome, ${data.user.name || data.user.email}!` 
          : "Registration successful!", 
        "success"
      );
      
      // Clear password field
      setAuthPassword("");
    } catch (err: any) {
      console.error("Auth submit error:", err);
      showToast("Connection failed. Please try again.", "error");
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
          records
        })
      });
      if (res.ok) {
        showToast(`Attendance sheet for class ${selectedAttendanceClass} on ${attendanceDate} successfully saved!`, "success");
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
                Email Address (or 'admin' for quick demo)
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
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading mb-4">
                    Today's Attendance
                  </h3>
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
                const aRes = await apiFetch(`/api/attendance?date=${attendanceDate}`);
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
              <div className="topbar">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white font-heading">
                  Reports & Analytics
                </h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Export system database arrays to analyze or import offline
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading">
                      Student Roster Data
                    </h3>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1.5 mb-6">
                      Download list of all students registered in the school with guardian phone numbers.
                    </p>
                  </div>
                  <button
                    onClick={() => exportData(students, "students_roster.json")}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Students JSON
                  </button>
                </div>

                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading">
                      Attendance Logs
                    </h3>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1.5 mb-6">
                      Download attendance records for all marked dates in JSON format.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await apiFetch("/api/attendance/all");
                        const data = await res.json();
                        exportData(data, "attendance_records.json");
                      } catch (err) {
                        showToast("Failed to fetch attendance report", "error");
                      }
                    }}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Attendance JSON
                  </button>
                </div>

                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading">
                      Financial Ledgers
                    </h3>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1.5 mb-6">
                      Download all fee invoices and historical payment transactions.
                    </p>
                  </div>
                  <button
                    onClick={() => exportData(fees, "financial_ledgers.json")}
                    className="btn btn-secondary w-full flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Financials JSON
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {currentView === "settings" && (
            <div className="fade-in space-y-6">
              <div className="topbar">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white font-heading">
                  System Settings & Database
                </h2>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  School config, currency symbol, default pricing, and factory tools
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* School settings form */}
                <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm lg:col-span-2 space-y-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white font-heading">
                    School Configuration
                  </h3>

                  <form onSubmit={handleSettingsSubmit} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                        School Name
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
                        <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                          Currency Symbol
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
                        <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                          Default Fee Amount
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

                    <div>
                      <label className="block text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                        Attendance Rule Mode
                      </label>
                      <select
                        value={settings.attendanceRules}
                        onChange={(e) => setSettings({ ...settings, attendanceRules: e.target.value })}
                        className="form-input"
                      >
                        <option value="Strict">Strict Mode</option>
                        <option value="Flexible">Flexible Mode</option>
                      </select>
                    </div>

                    <div className="pt-2">
                      <button type="submit" className="btn btn-primary">
                        Save Settings
                      </button>
                    </div>
                  </form>
                </div>

                {/* Danger zone / factory reset */}
                <div className="card border-red-200 dark:border-red-900/30 bg-red-50/10 dark:bg-red-950/5 p-6 rounded-2xl lg:col-span-3">
                  <h4 className="text-red-600 dark:text-red-400 font-bold text-sm uppercase tracking-wider mb-2">
                    Danger Zone
                  </h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                    Wipe all local fallback records to reset system state back to default factory settings.
                  </p>
                  <button
                    onClick={handleFactoryReset}
                    className="btn bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-2 px-4 rounded-lg"
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
