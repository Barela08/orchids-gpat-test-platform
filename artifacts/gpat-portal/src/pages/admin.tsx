import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TestResult {
  _id: string;
  userId: string;
  userName: string;
  year: string;
  percentage: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
}

interface YearData {
  year: string;
  count: number;
}

interface Student {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface StudentResults {
  student: Student;
  results: TestResult[];
}

export default function AdminPage() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [results, setResults] = useState<TestResult[]>([]);
  const [years, setYears] = useState<YearData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadText, setUploadText] = useState("");
  const [uploadYear, setUploadYear] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentResults | null>(null);
  const [loadingStudentResults, setLoadingStudentResults] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/");
    if (!isLoading && user?.role !== "admin") setLocation("/dashboard");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user?.role === "admin") fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [resultsRes, yearsRes, studentsRes] = await Promise.all([
        fetch("/api/test/results"),
        fetch("/api/questions/years"),
        fetch("/api/students")
      ]);
      setResults(await resultsRes.json());
      setYears(await yearsRes.json());
      const studentsData = await studentsRes.json();
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const deleteYear = async (year: string) => {
    if (deleting) return;
    setDeleting(year);
    try {
      const res = await fetch(`/api/questions?year=${encodeURIComponent(year)}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleting(null);
    }
  };

  const deleteStudent = async (studentId: string) => {
    if (deleting) return;
    setDeleting(studentId);
    try {
      const res = await fetch(`/api/students?id=${studentId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        if (selectedStudent?.student._id === studentId) setSelectedStudent(null);
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setDeleting(null);
    }
  };

  const viewStudentResults = async (student: Student) => {
    setLoadingStudentResults(true);
    try {
      const res = await fetch(`/api/test/results?userId=${student._id}`);
      const studentResults = await res.json();
      setSelectedStudent({ student, results: Array.isArray(studentResults) ? studentResults : [] });
    } catch (error) {
      console.error("Failed to fetch student results:", error);
    } finally {
      setLoadingStudentResults(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const parseQuestions = (text: string, year: string) => {
    const questions = [];
    const blocks = text.split(/(?=Q\d+[\.\)]|(?:^|\n)\d+[\.\)])/gi).filter((b) => b.trim());
    let questionCounter = 1;

    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter((l) => l);
      if (lines.length < 2) continue;

      let questionText = "";
      const options = { a: "", b: "", c: "", d: "" };
      let correctAnswer: "a" | "b" | "c" | "d" = "a";
      let subject = "General";

      for (const line of lines) {
        const qMatch = line.match(/^(?:Q?\d+[\.\)])\s*(.+)/i);
        if (qMatch && !questionText) { questionText = qMatch[1].trim(); continue; }

        const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/i);
        if (optMatch) {
          const opt = optMatch[1].toLowerCase() as "a" | "b" | "c" | "d";
          let optText = optMatch[2];
          if (optText.includes("*") || optText.toLowerCase().includes("(correct)")) {
            correctAnswer = opt;
            optText = optText.replace(/\*|\(correct\)/gi, "").trim();
          }
          options[opt] = optText;
          continue;
        }

        const answerMatch = line.match(/(?:✅\s*)?Answer:\s*([A-Da-d])(?:[\.\)]?\s*(.*))?/i);
        if (answerMatch) { correctAnswer = answerMatch[1].toLowerCase() as "a" | "b" | "c" | "d"; continue; }

        const subjectMatch = line.match(/^Subject:\s*(.+)/i);
        if (subjectMatch) { subject = subjectMatch[1].trim(); continue; }

        if (questionText && !line.match(/^[A-Da-d][\.\)]/i)) questionText += " " + line;
      }

      if (questionText && options.a && options.b) {
        questions.push({ questionNumber: questionCounter++, questionText, options, correctAnswer, subject, year });
      }
    }
    return questions;
  };

  const handleUpload = async () => {
    if (!uploadText.trim() || !uploadYear.trim()) {
      setUploadMessage("Please enter year and questions");
      return;
    }
    setUploading(true);
    setUploadMessage("");
    try {
      const questions = parseQuestions(uploadText, uploadYear);
      if (questions.length === 0) {
        setUploadMessage("No valid questions found. Check format.");
        setUploading(false);
        return;
      }
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questions)
      });
      const data = await res.json();
      setUploadMessage(`Successfully uploaded ${data.count} questions for year ${uploadYear}`);
      setUploadText("");
      fetchData();
    } catch (error) {
      console.error("Upload error:", error);
      setUploadMessage("Failed to upload questions");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-purple-200">GPAT Exam Management</p>
          </div>
          <Button onClick={logout} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
            Logout
          </Button>
        </div>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="bg-white/10">
            <TabsTrigger value="results" className="data-[state=active]:bg-purple-500">Student Results</TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-purple-500">Students</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-purple-500">Questions</TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-purple-500">Upload Questions</TabsTrigger>
          </TabsList>

          <TabsContent value="results">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader><CardTitle className="text-white">All Student Results</CardTitle></CardHeader>
              <CardContent>
                {results.length === 0 ? (
                  <p className="text-white/70 text-center py-8">No test results yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left p-3">Student</th>
                          <th className="text-left p-3">Level/Year</th>
                          <th className="text-center p-3">Score</th>
                          <th className="text-center p-3">Correct</th>
                          <th className="text-center p-3">Wrong</th>
                          <th className="text-center p-3">Skipped</th>
                          <th className="text-center p-3">Time</th>
                          <th className="text-left p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => (
                          <tr key={r._id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-3">{r.userName}</td>
                            <td className="p-3">{r.year}</td>
                            <td className={`p-3 text-center font-bold ${r.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>
                              {r.percentage}%
                            </td>
                            <td className="p-3 text-center text-green-400">{r.correctAnswers}</td>
                            <td className="p-3 text-center text-red-400">{r.wrongAnswers}</td>
                            <td className="p-3 text-center text-yellow-400">{r.unanswered}</td>
                            <td className="p-3 text-center">{formatTime(r.timeTaken)}</td>
                            <td className="p-3 text-sm text-purple-200">
                              {new Date(r.completedAt).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader><CardTitle className="text-white">All Students</CardTitle></CardHeader>
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-white/70 text-center py-8">No students registered yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                      <thead>
                        <tr className="border-b border-white/20">
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Email</th>
                          <th className="text-left p-3">Registered</th>
                          <th className="text-center p-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s) => (
                          <tr key={s._id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-3">{s.name}</td>
                            <td className="p-3">{s.email}</td>
                            <td className="p-3 text-sm text-purple-200">
                              {new Date(s.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric"
                              })}
                            </td>
                            <td className="p-3 text-center space-x-2">
                              <Button size="sm" onClick={() => viewStudentResults(s)} disabled={loadingStudentResults} className="bg-blue-500 hover:bg-blue-600">
                                View Results
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => deleteStudent(s._id)} disabled={deleting === s._id} className="bg-red-500 hover:bg-red-600">
                                {deleting === s._id ? "..." : "Delete"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedStudent && (
              <Card className="bg-white/10 backdrop-blur border-white/20 mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white">{selectedStudent.student.name} - Results</CardTitle>
                    <p className="text-purple-200 text-sm">{selectedStudent.student.email}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setSelectedStudent(null)} className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                    Close
                  </Button>
                </CardHeader>
                <CardContent>
                  {selectedStudent.results.length === 0 ? (
                    <p className="text-white/70 text-center py-8">No test results for this student</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-white">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left p-3">Level/Year</th>
                            <th className="text-center p-3">Score</th>
                            <th className="text-center p-3">Correct</th>
                            <th className="text-center p-3">Wrong</th>
                            <th className="text-center p-3">Skipped</th>
                            <th className="text-center p-3">Time</th>
                            <th className="text-left p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedStudent.results.map((r) => (
                            <tr key={r._id} className="border-b border-white/10 hover:bg-white/5">
                              <td className="p-3">{r.year}</td>
                              <td className={`p-3 text-center font-bold ${r.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>
                                {r.percentage}%
                              </td>
                              <td className="p-3 text-center text-green-400">{r.correctAnswers}</td>
                              <td className="p-3 text-center text-red-400">{r.wrongAnswers}</td>
                              <td className="p-3 text-center text-yellow-400">{r.unanswered}</td>
                              <td className="p-3 text-center">{formatTime(r.timeTaken)}</td>
                              <td className="p-3 text-sm text-purple-200">
                                {new Date(r.completedAt).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="questions">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader><CardTitle className="text-white">Question Bank</CardTitle></CardHeader>
              <CardContent>
                {years.length === 0 ? (
                  <p className="text-white/70 text-center py-8">No questions uploaded yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {years.map((y) => (
                      <div key={y.year} className="bg-white/10 p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-white">{y.year}</h3>
                          <p className="text-purple-200">{y.count} Questions</p>
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => deleteYear(y.year)} disabled={deleting === y.year} className="bg-red-500 hover:bg-red-600">
                          {deleting === y.year ? "..." : "Delete"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader><CardTitle className="text-white">Upload Questions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-white text-sm mb-2 block">Level / Year</label>
                  <Input
                    placeholder="e.g., Level 1 or 2024"
                    value={uploadYear}
                    onChange={(e) => setUploadYear(e.target.value)}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50"
                  />
                </div>
                <div>
                  <label className="text-white text-sm mb-2 block">Questions (Paste in format below)</label>
                  <Textarea
                    placeholder={`Format Example:\n\n1. What is the capital of India?\na) Mumbai\nb) Delhi*\nc) Chennai\nd) Kolkata\nSubject: Geography\nAnswer: b\n\nNote: Mark correct answer with * or write Answer: a/b/c/d`}
                    value={uploadText}
                    onChange={(e) => setUploadText(e.target.value)}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 min-h-[400px] font-mono text-sm"
                  />
                </div>
                {uploadMessage && (
                  <p className={`text-sm ${uploadMessage.includes("Successfully") ? "text-green-400" : "text-red-400"}`}>
                    {uploadMessage}
                  </p>
                )}
                <Button onClick={handleUpload} disabled={uploading} className="w-full bg-purple-500 hover:bg-purple-600">
                  {uploading ? "Uploading..." : "Upload Questions"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
