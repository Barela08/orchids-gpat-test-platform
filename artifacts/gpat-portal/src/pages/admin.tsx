import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Answer {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  subject: string;
  chapter: string;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

interface TestResult {
  _id: string;
  userId: string;
  userName: string;
  testLabel: string;
  testType: string;
  year?: string;
  subject?: string;
  chapter?: string;
  percentage: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
  answers?: Answer[];
}

interface SubjectData { subject: string; chapterCount: number; questionCount: number; }
interface ChapterData { chapter: string; count: number; }
interface Student { _id: string; name: string; email: string; createdAt: string; }

export default function AdminPage() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [results, setResults] = useState<TestResult[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadText, setUploadText] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadChapter, setUploadChapter] = useState("");
  const [uploadYear, setUploadYear] = useState("");
  const [uploadMode, setUploadMode] = useState<'subject' | 'year'>('subject');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // Detail view state
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [resultFilter, setResultFilter] = useState<'all' | 'wrong' | 'correct' | 'unanswered'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/");
    if (!isLoading && user?.role !== "admin") setLocation("/dashboard");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user?.role === "admin") fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [resultsRes, subjectsRes, studentsRes] = await Promise.all([
        apiFetch("/api/test/results"),
        apiFetch("/api/questions/subjects"),
        apiFetch("/api/students"),
      ]);
      setResults(await resultsRes.json());
      setSubjects(await subjectsRes.json());
      const studentsData = await studentsRes.json();
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewResultDetail = async (result: TestResult) => {
    setLoadingResult(true);
    setResultFilter('all');
    try {
      const res = await apiFetch(`/api/test/results/${result._id}`);
      const data = await res.json();
      setSelectedResult(data.result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingResult(false);
    }
  };

  const deleteSubject = async (subject: string) => {
    if (deleting) return;
    if (!confirm(`Delete all questions for subject "${subject}"?`)) return;
    setDeleting(subject);
    try {
      const res = await apiFetch(`/api/questions?subject=${encodeURIComponent(subject)}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(null); }
  };

  const deleteChapter = async (subject: string, chapter: string) => {
    if (deleting) return;
    if (!confirm(`Delete all questions for "${subject} › ${chapter}"?`)) return;
    setDeleting(`${subject}-${chapter}`);
    try {
      const res = await apiFetch(`/api/questions?subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(null); }
  };

  const deleteStudent = async (studentId: string) => {
    if (deleting) return;
    setDeleting(studentId);
    try {
      const res = await apiFetch(`/api/students?id=${studentId}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(null); }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const parseQuestions = (text: string, subject: string, chapter: string, year?: string) => {
    const questions: object[] = [];
    const blocks = text.split(/(?=Q\d+[\.\)]|(?:^|\n)\d+[\.\)])/gi).filter(b => b.trim());
    let counter = 1;
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length < 2) continue;
      let questionText = "";
      const options = { a: "", b: "", c: "", d: "" };
      let correctAnswer: "a" | "b" | "c" | "d" = "a";
      let qSubject = subject;
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
          options[opt] = optText; continue;
        }
        const answerMatch = line.match(/(?:✅\s*)?Answer:\s*([A-Da-d])/i);
        if (answerMatch) { correctAnswer = answerMatch[1].toLowerCase() as "a" | "b" | "c" | "d"; continue; }
        const subjectMatch = line.match(/^Subject:\s*(.+)/i);
        if (subjectMatch) { qSubject = subjectMatch[1].trim(); continue; }
        if (questionText && !line.match(/^[A-Da-d][\.\)]/i)) questionText += " " + line;
      }
      if (questionText && options.a && options.b) {
        questions.push({ questionNumber: counter++, questionText, options, correctAnswer, subject: qSubject, chapter, ...(year ? { year } : {}) });
      }
    }
    return questions;
  };

  const handleUpload = async () => {
    const hasSubject = uploadMode === 'subject' && uploadSubject.trim() && uploadChapter.trim();
    const hasYear = uploadMode === 'year' && uploadYear.trim();
    if (!uploadText.trim() || (!hasSubject && !hasYear)) {
      setUploadMessage(uploadMode === 'subject' ? "Please enter Subject, Chapter and questions" : "Please enter Year and questions");
      return;
    }
    setUploading(true); setUploadMessage("");
    try {
      const questions = parseQuestions(
        uploadText,
        uploadSubject.trim() || "General",
        uploadChapter.trim() || "General",
        uploadMode === 'year' ? uploadYear.trim() : undefined
      );
      if (questions.length === 0) { setUploadMessage("No valid questions found. Check format."); return; }
      const res = await apiFetch("/api/questions", { method: "POST", body: JSON.stringify(questions) });
      const data = await res.json();
      setUploadMessage(`✓ Successfully uploaded ${data.count} questions`);
      setUploadText(""); fetchData();
    } catch (e) {
      setUploadMessage("Failed to upload questions");
    } finally { setUploading(false); }
  };

  const filteredAnswers = selectedResult?.answers?.filter(a => {
    if (resultFilter === 'wrong') return !a.isCorrect && a.selectedAnswer;
    if (resultFilter === 'correct') return a.isCorrect;
    if (resultFilter === 'unanswered') return !a.selectedAnswer;
    return true;
  }) || [];

  if (isLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-purple-200">GPAT Exam Management</p>
          </div>
          <Button onClick={logout} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">Logout</Button>
        </div>

        <Tabs defaultValue="results" className="space-y-6">
          <TabsList className="bg-white/10 flex-wrap h-auto gap-1">
            <TabsTrigger value="results" className="data-[state=active]:bg-purple-500">Student Results</TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-purple-500">Students</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-purple-500">Question Bank</TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-purple-500">Upload Questions</TabsTrigger>
          </TabsList>

          {/* Results Tab */}
          <TabsContent value="results">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader><CardTitle className="text-white">All Student Results</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  {results.length === 0 ? (
                    <p className="text-white/70 text-center py-8">No test results yet</p>
                  ) : (
                    <div className="space-y-2">
                      {results.map(r => (
                        <div key={r._id}
                          onClick={() => viewResultDetail(r)}
                          className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedResult?._id === r._id ? 'bg-purple-500/30 border-purple-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-semibold">{r.userName}</p>
                              <p className="text-purple-200 text-sm">{r.testLabel} <span className="capitalize">({r.testType})</span></p>
                              <p className="text-white/50 text-xs">{new Date(r.completedAt).toLocaleString("en-IN")}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${r.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>{r.percentage}%</p>
                              <p className="text-white/60 text-xs">{r.correctAnswers}/{r.totalQuestions} correct</p>
                              <p className="text-white/60 text-xs">{formatTime(r.timeTaken)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Answer Sheet Panel */}
              <div>
                {loadingResult && (
                  <Card className="bg-white/10 backdrop-blur border-white/20">
                    <CardContent className="py-16 flex justify-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-400 border-t-transparent" />
                    </CardContent>
                  </Card>
                )}
                {selectedResult && !loadingResult && (
                  <Card className="bg-white/10 backdrop-blur border-white/20">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-white">{selectedResult.userName}</CardTitle>
                          <p className="text-purple-200 text-sm">{selectedResult.testLabel}</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-green-400">{selectedResult.correctAnswers} Correct</span>
                            <span className="text-red-400">{selectedResult.wrongAnswers} Wrong</span>
                            <span className="text-yellow-400">{selectedResult.unanswered} Unanswered</span>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setSelectedResult(null)} className="bg-white/10 border-white/30 text-white hover:bg-white/20">✕</Button>
                      </div>
                      <div className="flex gap-2 flex-wrap mt-3">
                        {(['all', 'wrong', 'correct', 'unanswered'] as const).map(f => (
                          <button key={f} onClick={() => setResultFilter(f)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${resultFilter === f
                              ? f === 'wrong' ? 'bg-red-500 text-white' : f === 'correct' ? 'bg-green-500 text-white' : f === 'unanswered' ? 'bg-yellow-500 text-white' : 'bg-purple-500 text-white'
                              : 'bg-white/10 text-white hover:bg-white/20'}`}>
                            {f === 'all' ? `All (${selectedResult.answers?.length || 0})` : f === 'wrong' ? `Wrong (${selectedResult.wrongAnswers})` : f === 'correct' ? `Correct (${selectedResult.correctAnswers})` : `Unanswered (${selectedResult.unanswered})`}
                          </button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
                      {filteredAnswers.map(a => (
                        <div key={a.questionId} className={`p-3 rounded-xl border ${a.isCorrect ? "bg-green-900/20 border-green-500/40" : a.selectedAnswer ? "bg-red-900/20 border-red-500/40" : "bg-yellow-900/20 border-yellow-500/40"}`}>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${a.isCorrect ? "bg-green-500" : a.selectedAnswer ? "bg-red-500" : "bg-yellow-500"}`}>
                              Q{a.questionNumber} {a.isCorrect ? "✓" : a.selectedAnswer ? "✗" : "—"}
                            </span>
                            <span className="text-purple-300 text-xs">{a.subject} › {a.chapter}</span>
                          </div>
                          <p className="text-white text-sm mb-2">{a.questionText}</p>
                          <div className="space-y-1">
                            {(["a", "b", "c", "d"] as const).map(opt => (
                              <div key={opt} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm ${a.correctAnswer === opt ? "bg-green-500/25 border border-green-400" : a.selectedAnswer === opt && a.correctAnswer !== opt ? "bg-red-500/25 border border-red-400" : "bg-white/5"}`}>
                                <span className="font-bold text-white">{opt.toUpperCase()}.</span>
                                <span className="text-white flex-1">{a.options[opt]}</span>
                                {a.correctAnswer === opt && <span className="text-green-300 text-xs shrink-0">✓ Correct</span>}
                                {a.selectedAnswer === opt && a.correctAnswer !== opt && <span className="text-red-300 text-xs shrink-0">✗ Answered</span>}
                              </div>
                            ))}
                          </div>
                          {!a.selectedAnswer && <p className="text-yellow-400 text-xs mt-1">Not attempted</p>}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
                {!selectedResult && !loadingResult && (
                  <Card className="bg-white/10 backdrop-blur border-white/20">
                    <CardContent className="py-16 text-center">
                      <p className="text-white/50">Click on any result to see the answer sheet</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader><CardTitle className="text-white">All Students ({students.length})</CardTitle></CardHeader>
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
                        {students.map(s => (
                          <tr key={s._id} className="border-b border-white/10 hover:bg-white/5">
                            <td className="p-3">{s.name}</td>
                            <td className="p-3">{s.email}</td>
                            <td className="p-3 text-sm text-purple-200">{new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
                            <td className="p-3 text-center">
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
          </TabsContent>

          {/* Question Bank Tab */}
          <TabsContent value="questions">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader><CardTitle className="text-white">Question Bank by Subject & Chapter</CardTitle></CardHeader>
              <CardContent>
                {subjects.length === 0 ? (
                  <p className="text-white/70 text-center py-8">No questions uploaded yet</p>
                ) : (
                  <div className="space-y-4">
                    {subjects.map(s => (
                      <SubjectAccordion key={s.subject} subject={s} onDeleteSubject={deleteSubject} onDeleteChapter={deleteChapter} deleting={deleting} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader><CardTitle className="text-white">Upload Questions</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setUploadMode('subject')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${uploadMode === 'subject' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>Subject / Chapter-wise</button>
                  <button onClick={() => setUploadMode('year')} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${uploadMode === 'year' ? 'bg-purple-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>Year-wise</button>
                </div>

                {uploadMode === 'subject' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white text-sm mb-2 block">Subject *</label>
                      <Input placeholder="e.g., Pharmacology" value={uploadSubject} onChange={e => setUploadSubject(e.target.value)} className="bg-white/10 border-white/30 text-white placeholder:text-white/50" />
                    </div>
                    <div>
                      <label className="text-white text-sm mb-2 block">Chapter *</label>
                      <Input placeholder="e.g., Drug Receptors" value={uploadChapter} onChange={e => setUploadChapter(e.target.value)} className="bg-white/10 border-white/30 text-white placeholder:text-white/50" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-white text-sm mb-2 block">Year *</label>
                    <Input placeholder="e.g., 2024" value={uploadYear} onChange={e => setUploadYear(e.target.value)} className="bg-white/10 border-white/30 text-white placeholder:text-white/50" />
                    <p className="text-purple-300 text-xs mt-1">Year-wise questions will also need Subject and Chapter tags — add "Subject: X" lines in the question text if needed.</p>
                  </div>
                )}

                <div>
                  <label className="text-white text-sm mb-2 block">Paste Questions</label>
                  <Textarea
                    placeholder={`Format:\n\n1. Which drug is a beta blocker?\na) Amlodipine\nb) Atenolol*\nc) Ramipril\nd) Losartan\nAnswer: b\n\n2. Next question...\n\nNote: Mark correct answer with * or "Answer: a/b/c/d"`}
                    value={uploadText} onChange={e => setUploadText(e.target.value)}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 min-h-[350px] font-mono text-sm" />
                </div>
                {uploadMessage && (
                  <p className={`text-sm font-medium ${uploadMessage.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{uploadMessage}</p>
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

function SubjectAccordion({ subject, onDeleteSubject, onDeleteChapter, deleting }: {
  subject: SubjectData;
  onDeleteSubject: (s: string) => void;
  onDeleteChapter: (s: string, c: string) => void;
  deleting: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [loaded, setLoaded] = useState(false);

  const toggle = async () => {
    if (!open && !loaded) {
      const res = await apiFetch(`/api/questions/chapters?subject=${encodeURIComponent(subject.subject)}`);
      const data = await res.json();
      setChapters(Array.isArray(data) ? data : []);
      setLoaded(true);
    }
    setOpen(o => !o);
  };

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/10 transition-all" onClick={toggle}>
        <div>
          <h3 className="text-white font-semibold">{subject.subject}</h3>
          <p className="text-purple-200 text-sm">{subject.chapterCount} Chapters · {subject.questionCount} Questions</p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); onDeleteSubject(subject.subject); }}
            disabled={deleting === subject.subject} className="bg-red-500 hover:bg-red-600">
            {deleting === subject.subject ? "..." : "Delete All"}
          </Button>
          <span className="text-white">{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {chapters.map(c => (
            <div key={c.chapter} className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-3">
              <div>
                <p className="text-white text-sm font-medium">{c.chapter}</p>
                <p className="text-purple-300 text-xs">{c.count} Questions</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => onDeleteChapter(subject.subject, c.chapter)}
                disabled={deleting === `${subject.subject}-${c.chapter}`} className="bg-red-500 hover:bg-red-600 text-xs">
                {deleting === `${subject.subject}-${c.chapter}` ? "..." : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
