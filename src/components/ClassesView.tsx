import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Users,
  Calendar,
  CreditCard,
  FileText,
  Search,
  Plus,
  ArrowLeft,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  UserCheck,
  DollarSign,
  TrendingDown,
  Info
} from "lucide-react";

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

interface ClassesViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  allAttendance: Record<string, AttendanceRecord[]>;
  fees: Record<string, any[]>;
  onNavigate: (view: string, payload?: any) => void;
  settings: {
    schoolName: string;
    currency: string;
    feeAmount: number;
    attendanceRules: string;
    systemTheme: string;
  };
  showToast: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  refreshData: () => Promise<void>;
  openAddStudentToClass: (className: string) => void;
  openAddFeeForStudent: (studentId: string, studentName: string) => void;
}

export default function ClassesView({
  students,
  attendance,
  allAttendance,
  fees,
  onNavigate,
  settings,
  showToast,
  refreshData,
  openAddStudentToClass,
  openAddFeeForStudent
}: ClassesViewProps) {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [classDetailTab, setClassDetailTab] = useState<"students" | "attendance" | "fees" | "reports">("students");
  const [searchClassQuery, setSearchClassQuery] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  
  // Custom added classes list state (in addition to those derived from students)
  const [customClasses, setCustomClasses] = useState<string[]>(() => {
    const key = `dugsiga_custom_classes_${settings?.schoolName || "default"}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : [];
  });

  // Unique list of all classes - NO default classes as requested, each school sets up its own classes
  const classesList = useMemo(() => {
    const fromStudents = students.map((s) => s.class).filter(Boolean);
    const combined = Array.from(new Set([...fromStudents, ...customClasses]));
    return combined.filter((c) => 
      c.toLowerCase().includes(searchClassQuery.toLowerCase())
    );
  }, [students, customClasses, searchClassQuery]);

  // Handle Adding New Class
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (!trimmed) return;
    if (classesList.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showToast("This class is already registered!", "warning");
      return;
    }
    const updated = [...customClasses, trimmed];
    setCustomClasses(updated);
    const key = `dugsiga_custom_classes_${settings?.schoolName || "default"}`;
    localStorage.setItem(key, JSON.stringify(updated));
    setNewClassName("");
    setShowAddClassModal(false);
    showToast(`Class "${trimmed}" has been successfully added!`, "success");
  };

  // Stats for each class
  const classStats = useMemo(() => {
    const stats: Record<string, {
      studentCount: number;
      attendanceRate: number;
      feesRatio: string;
      feesPaidPercent: number;
      genderRatio: { boys: number; girls: number };
    }> = {};

    classesList.forEach((className) => {
      const classStudents = students.filter((s) => s.class === className);
      const activeStudents = classStudents.filter((s) => s.status === "active");
      
      // Attendance Calculation
      let presentCount = 0;
      let evaluatedCount = 0;
      activeStudents.forEach((student) => {
        const match = attendance.find((r) => r.studentId === student.id);
        if (match) {
          evaluatedCount++;
          if (match.status === "Present" || match.status === "Late") {
            presentCount++;
          }
        }
      });
      const attendanceRate = evaluatedCount > 0 ? Math.round((presentCount / evaluatedCount) * 100) : 100;

      // Fees Calculation
      let totalInvoices = 0;
      let paidInvoices = 0;
      classStudents.forEach((student) => {
        const studentFees = fees[student.id] || [];
        totalInvoices += studentFees.length;
        paidInvoices += studentFees.filter((f) => f.status === "Paid").length;
      });
      const feesRatio = `${paidInvoices}/${totalInvoices}`;
      const feesPaidPercent = totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 100;

      // Gender Breakdown
      const boys = classStudents.filter((s) => s.gender?.toLowerCase() === "male" || s.gender?.toLowerCase() === "lab" || s.gender?.toLowerCase() === "boy").length;
      const girls = classStudents.filter((s) => s.gender?.toLowerCase() === "female" || s.gender?.toLowerCase() === "dhedig" || s.gender?.toLowerCase() === "girl").length;

      stats[className] = {
        studentCount: classStudents.length,
        attendanceRate,
        feesRatio,
        feesPaidPercent,
        genderRatio: { boys, girls }
      };
    });

    return stats;
  }, [classesList, students, attendance, fees]);

  // If inside class details dashboard
  if (selectedClass) {
    const classStudents = students.filter((s) => s.class === selectedClass);
    const stats = classStats[selectedClass] || { studentCount: 0, attendanceRate: 100, feesRatio: "0/0", feesPaidPercent: 100, genderRatio: { boys: 0, girls: 0 } };

    return (
      <div className="fade-in space-y-6">
        {/* Navigation header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedClass(null)}
              className="btn btn-secondary p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Class Explorer
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white font-heading">
                {selectedClass}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => openAddStudentToClass(selectedClass)}
              className="btn btn-primary text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 justify-center w-full md:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add Student to Class
            </button>
          </div>
        </div>

        {/* Small Class Summary Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl">
              <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Class Students</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{stats.studentCount} Students</p>
            </div>
          </div>

          <div className="card bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Today's Attendance</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{stats.attendanceRate}%</p>
            </div>
          </div>

          <div className="card bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl">
              <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium font-heading">Fees Progress</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{stats.feesRatio} Paid ({stats.feesPaidPercent}%)</p>
            </div>
          </div>

          <div className="card bg-white dark:bg-[#1e293b] p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium font-heading">Gender Ratio</p>
              <p className="text-lg font-bold text-gray-800 dark:text-white">{stats.genderRatio.boys} Boys / {stats.genderRatio.girls} Girls</p>
            </div>
          </div>
        </div>

        {/* Module Tab Selector */}
        <div className="flex border-b border-gray-100 dark:border-gray-800/80 gap-1 overflow-x-auto pb-px">
          <button
            onClick={() => setClassDetailTab("students")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              classDetailTab === "students"
                ? "border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Class Students ({stats.studentCount})
          </button>
          
          <button
            onClick={() => setClassDetailTab("attendance")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              classDetailTab === "attendance"
                ? "border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Attendance
          </button>

          <button
            onClick={() => setClassDetailTab("fees")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              classDetailTab === "fees"
                ? "border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Fees & Finance
          </button>

          <button
            onClick={() => setClassDetailTab("reports")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 shrink-0 ${
              classDetailTab === "reports"
                ? "border-[#4f46e5] text-[#4f46e5] dark:text-[#818cf8]"
                : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            Class Analytics
          </button>
        </div>

        {/* Tab Content Areas */}
        <div className="space-y-4">
          {/* TAB: STUDENTS */}
          {classDetailTab === "students" && (
            <div className="card bg-white dark:bg-[#1e293b] p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50 dark:border-gray-800/60 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading">
                  Enrolled Students in {selectedClass}
                </h3>
                <span className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full font-bold">
                  {classStudents.length} total
                </span>
              </div>
              <div className="table-container m-0">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Gender</th>
                      <th>Guardian Phone</th>
                      <th>Status</th>
                      <th>Date Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center text-gray-400 dark:text-gray-500 py-12">
                          No students enrolled in this class yet. Click "Add Student to Class" to get started!
                        </td>
                      </tr>
                    ) : (
                      classStudents.map((student) => (
                        <tr key={student.id}>
                          <td className="font-semibold text-gray-900 dark:text-white">
                            {student.fullName}
                          </td>
                          <td className="capitalize">{student.gender || "Male"}</td>
                          <td>{student.guardianPhone || "-"}</td>
                          <td>
                            <span className={`badge ${student.status === "active" ? "badge-success" : "badge-danger"}`}>
                              {student.status}
                            </span>
                          </td>
                          <td className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                            {student.createdAt || "-"}
                          </td>
                          <td>
                            <button
                              onClick={() => onNavigate("students")}
                              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer bg-transparent border-0"
                            >
                              Manage Student →
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: ATTENDANCE */}
          {classDetailTab === "attendance" && (
            <div className="space-y-4">
              <div className="card bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading">
                    Attendance Sheet for {selectedClass}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Attendance marking status is synchronized. Go to the primary Attendance tab to update dates and save changes.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("attendance")}
                  className="btn btn-secondary text-xs flex items-center gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  Open Attendance Registry
                </button>
              </div>

              <div className="card bg-white dark:bg-[#1e293b] p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="table-container m-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.filter((s) => s.status === "active").length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-center text-gray-400 dark:text-gray-500 py-12">
                            No active students found in this class to mark.
                          </td>
                        </tr>
                      ) : (
                        classStudents
                          .filter((s) => s.status === "active")
                          .map((student) => {
                            const match = attendance.find((r) => r.studentId === student.id);
                            const currentStatus = match ? match.status : "Present";
                            return (
                              <tr key={student.id}>
                                <td className="font-semibold text-gray-900 dark:text-white">
                                  {student.fullName}
                                </td>
                                <td>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    currentStatus === "Present" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400" :
                                    currentStatus === "Absent" ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400" :
                                    currentStatus === "Late" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400" :
                                    "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400"
                                  }`}>
                                    {currentStatus}
                                  </span>
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

          {/* TAB: FEES & FINANCE */}
          {classDetailTab === "fees" && (
            <div className="space-y-4">
              <div className="card bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white font-heading">
                    Fees & Invoices for {selectedClass}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Manage monthly payment sheets and balance summaries for each student.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate("fees")}
                  className="btn btn-secondary text-xs flex items-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  Go to Main Finance Center
                </button>
              </div>

              <div className="card bg-white dark:bg-[#1e293b] p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="table-container m-0">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Invoices Issued</th>
                        <th>Total Amount Paid</th>
                        <th>Latest Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-gray-400 dark:text-gray-500 py-12">
                            No students found in this class.
                          </td>
                        </tr>
                      ) : (
                        classStudents.map((student) => {
                          const studentInvoices = fees[student.id] || [];
                          const totalPaid = studentInvoices.reduce((sum, f) => sum + Number(f.paidAmount || 0), 0);
                          const lastInvoice = studentInvoices[studentInvoices.length - 1];

                          return (
                            <tr key={student.id}>
                              <td className="font-semibold text-gray-900 dark:text-white">
                                {student.fullName}
                              </td>
                              <td className="text-sm font-semibold">{studentInvoices.length} invoices</td>
                              <td className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {settings.currency} {totalPaid.toLocaleString()}
                              </td>
                              <td>
                                {lastInvoice ? (
                                  <span className={`badge ${
                                    lastInvoice.status === "Paid" ? "badge-success" : 
                                    lastInvoice.status === "Unpaid" ? "badge-danger" : "badge-warning"
                                  }`}>
                                    {lastInvoice.status} ({lastInvoice.month})
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">None (No invoice)</span>
                                )}
                              </td>
                              <td>
                                <button
                                  onClick={() => openAddFeeForStudent(student.id, student.fullName)}
                                  className="text-xs font-bold text-[#4f46e5] dark:text-[#818cf8] hover:underline cursor-pointer bg-transparent border-0"
                                >
                                  + Create Invoice
                                </button>
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

          {/* TAB: REPORTS */}
          {classDetailTab === "reports" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Gender Breakdown Chart */}
              <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h4 className="text-base font-bold text-gray-800 dark:text-white mb-4 font-heading">
                  Gender Distribution
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>Boys</span>
                      <span>{stats.genderRatio.boys} Students ({stats.studentCount > 0 ? Math.round((stats.genderRatio.boys / stats.studentCount) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-3.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-full rounded-full transition-all" 
                        style={{ width: `${stats.studentCount > 0 ? (stats.genderRatio.boys / stats.studentCount) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>Girls</span>
                      <span>{stats.genderRatio.girls} Students ({stats.studentCount > 0 ? Math.round((stats.genderRatio.girls / stats.studentCount) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-3.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-500 h-full rounded-full transition-all" 
                        style={{ width: `${stats.studentCount > 0 ? (stats.genderRatio.girls / stats.studentCount) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance and Fees Progress Chart */}
              <div className="card bg-white dark:bg-[#1e293b] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h4 className="text-base font-bold text-gray-800 dark:text-white mb-4 font-heading">
                  Performance Analytics
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>Attendance Rate</span>
                      <span>{stats.attendanceRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-3.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all" 
                        style={{ width: `${stats.attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                      <span>Fee Collection Progress</span>
                      <span>{stats.feesPaidPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-3.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full transition-all" 
                        style={{ width: `${stats.feesPaidPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      {/* Top Section */}
      <div className="topbar flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white font-heading">
            Classes Directory
          </h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Manage class structures, monitor daily attendance sheets, collect invoices, and view analytics reports.
          </p>
        </div>
        <button
          onClick={() => setShowAddClassModal(true)}
          className="btn btn-primary flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add New Class
        </button>
      </div>

      {/* Filter and Search */}
      <div className="card bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-3.5 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchClassQuery}
            onChange={(e) => setSearchClassQuery(e.target.value)}
            className="form-input pl-11"
            placeholder="Search classes or grade levels..."
          />
        </div>
      </div>

      {/* Add Class Modal Popover */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 max-w-md w-full border border-gray-100 dark:border-gray-800 shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Create New Class</h3>
              <button 
                onClick={() => setShowAddClassModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddClass} className="space-y-4">
              <div>
                <label className="block text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g., Grade 10-A, Year 5"
                  className="form-input"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="btn btn-secondary flex-1 py-2.5 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 py-2.5 rounded-xl text-sm"
                >
                  Create Class
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Classes Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classesList.length === 0 ? (
          <div className="col-span-full text-center py-16 card bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 rounded-3xl">
            <Info className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-semibold text-lg">No classes created yet.</p>
            <p className="text-sm text-gray-400 mt-1">Schools must create their own classes. Add your first class using the button above.</p>
          </div>
        ) : (
          classesList.map((className) => {
            const stats = classStats[className] || { studentCount: 0, attendanceRate: 100, feesRatio: "0/0", feesPaidPercent: 100, genderRatio: { boys: 0, girls: 0 } };
            
            return (
              <motion.div
                key={className}
                whileHover={{ y: -4, scale: 1.01 }}
                className="card bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-800 rounded-3xl shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between h-56 group cursor-pointer"
                onClick={() => {
                  setSelectedClass(className);
                  setClassDetailTab("students");
                }}
              >
                <div>
                  {/* Top line */}
                  <div className="flex justify-between items-start">
                    <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1 rounded-lg">
                      Class
                    </span>
                    <span className="text-xs font-bold text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gray-400" />
                      {stats.studentCount} Students
                    </span>
                  </div>

                  {/* Class Name Title */}
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all font-heading">
                    {className}
                  </h3>
                </div>

                {/* Short stats block */}
                <div className="border-t border-gray-50 dark:border-gray-800/60 pt-4 mt-4 grid grid-cols-2 gap-4 text-xs font-semibold text-gray-400 dark:text-gray-500">
                  <div>
                    <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Attendance</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {stats.attendanceRate}%
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-gray-400 mb-0.5">Fees</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 font-heading">
                      <DollarSign className="w-3.5 h-3.5" />
                      {stats.feesRatio} Paid ({stats.feesPaidPercent}%)
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
