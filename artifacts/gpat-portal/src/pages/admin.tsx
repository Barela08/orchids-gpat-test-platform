import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Answer {
  questionId: string; questionNumber: number; questionText: string;
  options: { a: string; b: string; c: string; d: string };
  subject: string; chapter: string; selectedAnswer: string | null;
  correctAnswer: string; isCorrect: boolean;
}
interface TestResult {
  _id: string; userId: string; userName: string; testLabel: string;
  testType: string; year?: string; subject?: string; chapter?: string;
  percentage: number; correctAnswers: number; wrongAnswers: number;
  unanswered: number; totalQuestions: number; timeTaken: number;
  completedAt: string; answers?: Answer[];
}
interface SubjectData { subject: string; chapterCount: number; questionCount: number; }
interface ChapterData { chapter: string; count: number; }
interface Student { _id: string; name: string; email: string; createdAt: string; }

interface ContentCategory {
  _id: string; name: string; description: string; subject: string;
  createdAt: string; updatedAt: string;
}
interface ContentChapter {
  _id: string; name: string; description: string; subject: string;
  categoryId: string | ContentCategory;
  pdfUrl: string | null; pdfOriginalName: string | null;
  videoUrl: string | null; videoLink: string | null;
  thumbnailUrl: string | null; createdAt: string;
}
interface Analytics {
  totalUsers: number; totalQuestions: number; totalSubjects: number;
  totalCategories: number; totalChapters: number; activeUsersToday: number;
  mostViewedChapters: { _id: string; chapterName: string; subject: string; totalViews: number; totalTimeSpent: number }[];
  totalWatchTime: number;
}
interface ActivityStat {
  _id: string; userName: string; totalTime: number; lastActive: string;
  sessionCount: number; chapterViewsCount: number;
}

// ─── Chapter Entry for multi-upload ──────────────────────────────────────────
interface ChapterEntry {
  id: number; name: string; description: string;
  categoryId: string; videoLink: string;
  pdf: File | null; video: File | null; thumbnail: File | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [results, setResults] = useState<TestResult[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [resultFilter, setResultFilter] = useState<'all' | 'wrong' | 'correct' | 'unanswered'>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Upload Q state
  const [uploadText, setUploadText] = useState("");
  const [uploadSubject, setUploadSubject] = useState("");
  const [uploadChapter, setUploadChapter] = useState("");
  const [uploadYear, setUploadYear] = useState("");
  const [uploadMode, setUploadMode] = useState<'subject' | 'year'>('subject');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  // Content state
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [contentChapters, setContentChapters] = useState<ContentChapter[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStat[]>([]);

  // Category form
  const [catFormSubject, setCatFormSubject] = useState("");
  const [catFormName, setCatFormName] = useState("");
  const [catFormDesc, setCatFormDesc] = useState("");
  const [catFormMsg, setCatFormMsg] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [editingCat, setEditingCat] = useState<ContentCategory | null>(null);
  const [filterSubject, setFilterSubject] = useState("");

  // Chapter multi-upload state
  const [chapterSubject, setChapterSubject] = useState("");
  const [chapterEntries, setChapterEntries] = useState<ChapterEntry[]>([
    { id: 1, name: "", description: "", categoryId: "", videoLink: "", pdf: null, video: null, thumbnail: null }
  ]);
  const [chapterMsg, setChapterMsg] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);
  const nextId = useRef(2);

  // Edit chapter
  const [editingChapter, setEditingChapter] = useState<ContentChapter | null>(null);
  const [editChapterName, setEditChapterName] = useState("");
  const [editChapterDesc, setEditChapterDesc] = useState("");
  const [editChapterVideoLink, setEditChapterVideoLink] = useState("");
  const [editChapterMsg, setEditChapterMsg] = useState("");
  const [editChapterSaving, setEditChapterSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/");
    if (!isLoading && user?.role !== "admin") setLocation("/dashboard");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchData();
      fetchContent();
      fetchAnalytics();
      fetchActivity();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [r, s, st] = await Promise.all([
        apiFetch("/api/test/results"), apiFetch("/api/questions/subjects"), apiFetch("/api/students"),
      ]);
      setResults(await r.json());
      setSubjects(await s.json());
      const sd = await st.json();
      setStudents(Array.isArray(sd) ? sd : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchContent = async () => {
    try {
      const [catRes, chapRes] = await Promise.all([
        apiFetch("/api/content/categories"),
        apiFetch("/api/content/chapters"),
      ]);
      setCategories(await catRes.json());
      setContentChapters(await chapRes.json());
    } catch (e) { console.error(e); }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await apiFetch("/api/analytics");
      setAnalytics(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchActivity = async () => {
    try {
      const res = await apiFetch("/api/activity/stats");
      setActivityStats(await res.json());
    } catch (e) { console.error(e); }
  };

  // ── Results ────────────────────────────────────────────────────────────────
  const viewResultDetail = async (result: TestResult) => {
    setLoadingResult(true); setResultFilter('all');
    try {
      const res = await apiFetch(`/api/test/results/${result._id}`);
      const data = await res.json();
      setSelectedResult(data.result);
    } catch (e) { console.error(e); } finally { setLoadingResult(false); }
  };

  const deleteSubject = async (subject: string) => {
    if (deleting || !confirm(`Delete all questions for subject "${subject}"?`)) return;
    setDeleting(subject);
    try {
      const res = await apiFetch(`/api/questions?subject=${encodeURIComponent(subject)}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(null); }
  };

  const deleteChapter = async (subject: string, chapter: string) => {
    if (deleting || !confirm(`Delete all questions for "${subject} › ${chapter}"?`)) return;
    setDeleting(`${subject}-${chapter}`);
    try {
      const res = await apiFetch(`/api/questions?subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(null); }
  };

  const deleteStudent = async (id: string) => {
    if (deleting) return;
    setDeleting(id);
    try {
      const res = await apiFetch(`/api/students?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); } finally { setDeleting(null); }
  };

  // ── Question upload ────────────────────────────────────────────────────────
  const parseQuestions = (text: string, subject: string, chapter: string, year?: string) => {
    const questions: object[] = [];
    const blocks = text.split(/(?=Q\d+[\.\)]|(?:^|\n)\d+[\.\)])/gi).filter(b => b.trim());
    let counter = 1;
    for (const block of blocks) {
      const lines = block.split("\n").map(l => l.trim()).filter(l => l);
      if (lines.length < 2) continue;
      let questionText = ""; const options = { a: "", b: "", c: "", d: "" };
      let correctAnswer: "a" | "b" | "c" | "d" = "a"; let qSubject = subject;
      for (const line of lines) {
        const qMatch = line.match(/^(?:Q?\d+[\.\)])\s*(.+)/i);
        if (qMatch && !questionText) { questionText = qMatch[1].trim(); continue; }
        const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/i);
        if (optMatch) {
          const opt = optMatch[1].toLowerCase() as "a" | "b" | "c" | "d"; let optText = optMatch[2];
          if (optText.includes("*") || optText.toLowerCase().includes("(correct)")) {
            correctAnswer = opt; optText = optText.replace(/\*|\(correct\)/gi, "").trim();
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
      const questions = parseQuestions(uploadText, uploadSubject.trim() || "General", uploadChapter.trim() || "General", uploadMode === 'year' ? uploadYear.trim() : undefined);
      if (questions.length === 0) { setUploadMessage("No valid questions found. Check format."); return; }
      const res = await apiFetch("/api/questions", { method: "POST", body: JSON.stringify(questions) });
      const data = await res.json();
      setUploadMessage(`✓ Successfully uploaded ${data.count} questions`);
      setUploadText(""); fetchData();
    } catch { setUploadMessage("Failed to upload questions"); }
    finally { setUploading(false); }
  };

  // ── Category CRUD ──────────────────────────────────────────────────────────
  const saveCategory = async () => {
    if (!catFormName.trim() || !catFormSubject.trim()) { setCatFormMsg("Name and Subject are required"); return; }
    setCatSaving(true); setCatFormMsg("");
    try {
      const url = editingCat ? `/api/content/categories/${editingCat._id}` : "/api/content/categories";
      const method = editingCat ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify({ name: catFormName.trim(), description: catFormDesc.trim(), subject: catFormSubject.trim() }) });
      const data = await res.json();
      if (!res.ok) { setCatFormMsg(data.error || "Failed"); return; }
      setCatFormMsg(editingCat ? "✓ Category updated" : "✓ Category created");
      setCatFormName(""); setCatFormDesc(""); setCatFormSubject(""); setEditingCat(null);
      fetchContent();
    } catch { setCatFormMsg("Network error"); }
    finally { setCatSaving(false); }
  };

  const startEditCat = (cat: ContentCategory) => {
    setEditingCat(cat); setCatFormName(cat.name); setCatFormDesc(cat.description); setCatFormSubject(cat.subject); setCatFormMsg("");
  };

  const deleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}" and all its chapters?`)) return;
    await apiFetch(`/api/content/categories/${id}`, { method: "DELETE" });
    fetchContent();
  };

  // ── Chapter multi-upload ───────────────────────────────────────────────────
  const addChapterEntry = () => {
    setChapterEntries(prev => [...prev, { id: nextId.current++, name: "", description: "", categoryId: "", videoLink: "", pdf: null, video: null, thumbnail: null }]);
  };

  const removeChapterEntry = (id: number) => {
    setChapterEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateEntry = (id: number, field: keyof ChapterEntry, value: string | File | null) => {
    setChapterEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const uploadChapters = async () => {
    if (!chapterSubject.trim()) { setChapterMsg("Subject is required"); return; }
    for (const entry of chapterEntries) {
      if (!entry.name.trim()) { setChapterMsg("All chapter names are required"); return; }
      if (!entry.categoryId) { setChapterMsg("Select a category for each chapter"); return; }
    }
    setChapterSaving(true); setChapterMsg("");
    let successCount = 0; const errors: string[] = [];
    for (const entry of chapterEntries) {
      const fd = new FormData();
      fd.append("name", entry.name.trim());
      fd.append("description", entry.description.trim());
      fd.append("subject", chapterSubject.trim());
      fd.append("categoryId", entry.categoryId);
      fd.append("videoLink", entry.videoLink.trim());
      if (entry.pdf) fd.append("pdf", entry.pdf);
      if (entry.video) fd.append("video", entry.video);
      if (entry.thumbnail) fd.append("thumbnail", entry.thumbnail);
      try {
        const token = localStorage.getItem("gpat_token");
        const res = await fetch("/api/content/chapters", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
        if (res.ok) successCount++;
        else { const d = await res.json(); errors.push(`"${entry.name}": ${d.error}`); }
      } catch { errors.push(`"${entry.name}": network error`); }
    }
    if (errors.length === 0) {
      setChapterMsg(`✓ Uploaded ${successCount} chapter(s) successfully`);
      setChapterEntries([{ id: nextId.current++, name: "", description: "", categoryId: "", videoLink: "", pdf: null, video: null, thumbnail: null }]);
      setChapterSubject("");
    } else {
      setChapterMsg(`${successCount} uploaded. Errors: ${errors.join("; ")}`);
    }
    setChapterSaving(false);
    fetchContent();
  };

  const deleteContentChapter = async (id: string, name: string) => {
    if (!confirm(`Delete chapter "${name}"?`)) return;
    await apiFetch(`/api/content/chapters/${id}`, { method: "DELETE" });
    fetchContent();
  };

  // ── Edit Chapter ───────────────────────────────────────────────────────────
  const startEditChapter = (ch: ContentChapter) => {
    setEditingChapter(ch); setEditChapterName(ch.name); setEditChapterDesc(ch.description); setEditChapterVideoLink(ch.videoLink || ""); setEditChapterMsg("");
  };

  const saveEditChapter = async () => {
    if (!editingChapter) return;
    if (!editChapterName.trim()) { setEditChapterMsg("Name is required"); return; }
    setEditChapterSaving(true); setEditChapterMsg("");
    const fd = new FormData();
    fd.append("name", editChapterName.trim());
    fd.append("description", editChapterDesc.trim());
    fd.append("videoLink", editChapterVideoLink.trim());
    const catId = typeof editingChapter.categoryId === "string" ? editingChapter.categoryId : editingChapter.categoryId._id;
    fd.append("categoryId", catId);
    fd.append("subject", editingChapter.subject);
    try {
      const token = localStorage.getItem("gpat_token");
      const res = await fetch(`/api/content/chapters/${editingChapter._id}`, { method: "PUT", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const data = await res.json();
      if (!res.ok) { setEditChapterMsg(data.error || "Failed"); }
      else { setEditChapterMsg("✓ Updated"); setEditingChapter(null); fetchContent(); }
    } catch { setEditChapterMsg("Network error"); }
    finally { setEditChapterSaving(false); }
  };

  const filteredAnswers = selectedResult?.answers?.filter(a => {
    if (resultFilter === 'wrong') return !a.isCorrect && a.selectedAnswer;
    if (resultFilter === 'correct') return a.isCorrect;
    if (resultFilter === 'unanswered') return !a.selectedAnswer;
    return true;
  }) || [];

  const filteredCategories = filterSubject ? categories.filter(c => c.subject === filterSubject) : categories;
  const allSubjects = [...new Set(categories.map(c => c.subject))];

  if (isLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-purple-200">GPAT Exam Management</p>
          </div>
          <Button onClick={logout} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">Logout</Button>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="bg-white/10 flex-wrap h-auto gap-1">
            <TabsTrigger value="analytics" className="data-[state=active]:bg-purple-500">📊 Analytics</TabsTrigger>
            <TabsTrigger value="categories" className="data-[state=active]:bg-purple-500">📁 Categories</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-purple-500">📚 Chapters</TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-purple-500">📝 Results</TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-purple-500">👥 Students</TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:bg-purple-500">⏱ Activity</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-purple-500">❓ Question Bank</TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-purple-500">⬆ Upload Q</TabsTrigger>
          </TabsList>

          {/* ── Analytics Tab ─────────────────────────────────────────────── */}
          <TabsContent value="analytics">
            <div className="space-y-6">
              {analytics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Total Students", value: analytics.totalUsers, icon: "👥", color: "from-blue-500/20 to-blue-600/20 border-blue-500/30" },
                      { label: "Subjects", value: analytics.totalSubjects, icon: "📖", color: "from-green-500/20 to-green-600/20 border-green-500/30" },
                      { label: "Categories", value: analytics.totalCategories, icon: "📁", color: "from-yellow-500/20 to-yellow-600/20 border-yellow-500/30" },
                      { label: "Content Chapters", value: analytics.totalChapters, icon: "📚", color: "from-pink-500/20 to-pink-600/20 border-pink-500/30" },
                      { label: "Total Questions", value: analytics.totalQuestions, icon: "❓", color: "from-purple-500/20 to-purple-600/20 border-purple-500/30" },
                      { label: "Active Today", value: analytics.activeUsersToday, icon: "🟢", color: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30" },
                      { label: "Total Watch Time", value: formatTime(analytics.totalWatchTime), icon: "⏱", color: "from-orange-500/20 to-orange-600/20 border-orange-500/30" },
                      { label: "Students Tracked", value: activityStats.length, icon: "📈", color: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/30" },
                    ].map((stat) => (
                      <Card key={stat.label} className={`bg-gradient-to-br ${stat.color} border backdrop-blur`}>
                        <CardContent className="p-4">
                          <div className="text-2xl mb-1">{stat.icon}</div>
                          <div className="text-2xl font-bold text-white">{stat.value}</div>
                          <div className="text-xs text-white/70 mt-1">{stat.label}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {analytics.mostViewedChapters.length > 0 && (
                    <Card className="bg-white/10 backdrop-blur border-white/20">
                      <CardHeader><CardTitle className="text-white">🔥 Most Viewed Chapters</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {analytics.mostViewedChapters.map((ch, i) => (
                            <div key={ch._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                              <span className="text-white/50 font-bold w-6">#{i + 1}</span>
                              <div className="flex-1">
                                <p className="text-white font-medium">{ch.chapterName}</p>
                                <p className="text-purple-300 text-xs">{ch.subject}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-white font-semibold">{ch.totalViews} views</p>
                                <p className="text-white/50 text-xs">{formatTime(ch.totalTimeSpent)} watch time</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-400 border-t-transparent" /></div>
              )}
            </div>
          </TabsContent>

          {/* ── Categories Tab ────────────────────────────────────────────── */}
          <TabsContent value="categories">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Form */}
              <Card className="bg-white/10 backdrop-blur border-white/20 lg:col-span-2">
                <CardHeader><CardTitle className="text-white">{editingCat ? "✏️ Edit Category" : "➕ New Category"}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-white/80 text-sm block mb-1">Subject *</label>
                    <Input value={catFormSubject} onChange={e => setCatFormSubject(e.target.value)} placeholder="e.g., Pharmacology" className="bg-white/10 border-white/30 text-white placeholder:text-white/40" />
                  </div>
                  <div>
                    <label className="text-white/80 text-sm block mb-1">Category Name *</label>
                    <Input value={catFormName} onChange={e => setCatFormName(e.target.value)} placeholder="e.g., Basic Pharmacology" className="bg-white/10 border-white/30 text-white placeholder:text-white/40" />
                  </div>
                  <div>
                    <label className="text-white/80 text-sm block mb-1">Description</label>
                    <Textarea value={catFormDesc} onChange={e => setCatFormDesc(e.target.value)} placeholder="Brief description..." rows={3} className="bg-white/10 border-white/30 text-white placeholder:text-white/40" />
                  </div>
                  {catFormMsg && <p className={`text-sm font-medium ${catFormMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{catFormMsg}</p>}
                  <div className="flex gap-2">
                    <Button onClick={saveCategory} disabled={catSaving} className="flex-1 bg-purple-500 hover:bg-purple-600">
                      {catSaving ? "Saving..." : editingCat ? "Update" : "Create"}
                    </Button>
                    {editingCat && (
                      <Button variant="outline" onClick={() => { setEditingCat(null); setCatFormName(""); setCatFormDesc(""); setCatFormSubject(""); setCatFormMsg(""); }} className="bg-white/10 border-white/30 text-white hover:bg-white/20">Cancel</Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* List */}
              <Card className="bg-white/10 backdrop-blur border-white/20 lg:col-span-3">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-white">All Categories ({filteredCategories.length})</CardTitle>
                    <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="bg-white/10 border border-white/30 text-white text-sm rounded-lg px-2 py-1">
                      <option value="">All Subjects</option>
                      {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredCategories.length === 0 ? (
                    <p className="text-white/50 text-center py-8">No categories yet. Create one!</p>
                  ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                      {filteredCategories.map(cat => (
                        <div key={cat._id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-white font-medium">{cat.name}</p>
                              <Badge className="bg-purple-500/30 text-purple-200 text-xs border-0">{cat.subject}</Badge>
                            </div>
                            {cat.description && <p className="text-white/50 text-xs mt-0.5 truncate">{cat.description}</p>}
                            <p className="text-white/30 text-xs mt-0.5">
                              {contentChapters.filter(ch => {
                                const cid = typeof ch.categoryId === "string" ? ch.categoryId : ch.categoryId._id;
                                return cid === cat._id;
                              }).length} chapter(s)
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => startEditCat(cat)} className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-7 px-2 text-xs">Edit</Button>
                            <Button size="sm" variant="destructive" onClick={() => deleteCategory(cat._id, cat.name)} className="h-7 px-2 text-xs">Del</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Content Chapters Tab ──────────────────────────────────────── */}
          <TabsContent value="content">
            <div className="space-y-6">
              {/* Upload Form */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader><CardTitle className="text-white">📤 Upload Multiple Chapters</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="max-w-sm">
                    <label className="text-white/80 text-sm block mb-1">Subject *</label>
                    <Input value={chapterSubject} onChange={e => setChapterSubject(e.target.value)} placeholder="e.g., Pharmacology" className="bg-white/10 border-white/30 text-white placeholder:text-white/40" />
                  </div>

                  <div className="space-y-4">
                    {chapterEntries.map((entry, idx) => (
                      <div key={entry.id} className="p-4 rounded-xl border border-white/20 bg-white/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-300 font-semibold text-sm">Chapter {idx + 1}</span>
                          {chapterEntries.length > 1 && (
                            <button onClick={() => removeChapterEntry(entry.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">✕ Remove</button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-white/70 text-xs block mb-1">Chapter Name *</label>
                            <Input value={entry.name} onChange={e => updateEntry(entry.id, "name", e.target.value)} placeholder="e.g., Drug Receptors" className="bg-white/10 border-white/30 text-white placeholder:text-white/40 h-9" />
                          </div>
                          <div>
                            <label className="text-white/70 text-xs block mb-1">Category *</label>
                            <select
                              value={entry.categoryId}
                              onChange={e => updateEntry(entry.id, "categoryId", e.target.value)}
                              className="w-full bg-white/10 border border-white/30 text-white text-sm rounded-lg px-2 py-2 h-9"
                            >
                              <option value="">— Select Category —</option>
                              {(chapterSubject ? categories.filter(c => c.subject === chapterSubject) : categories).map(c => (
                                <option key={c._id} value={c._id}>{c.name} ({c.subject})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="text-white/70 text-xs block mb-1">Description</label>
                          <Textarea value={entry.description} onChange={e => updateEntry(entry.id, "description", e.target.value)} placeholder="Chapter description..." rows={2} className="bg-white/10 border-white/30 text-white placeholder:text-white/40 text-sm" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-white/70 text-xs block mb-1">Video Link (YouTube/Drive)</label>
                            <Input value={entry.videoLink} onChange={e => updateEntry(entry.id, "videoLink", e.target.value)} placeholder="https://..." className="bg-white/10 border-white/30 text-white placeholder:text-white/40 h-9 text-sm" />
                          </div>
                          <div>
                            <label className="text-white/70 text-xs block mb-1">Thumbnail Image</label>
                            <input type="file" accept="image/*" onChange={e => updateEntry(entry.id, "thumbnail", e.target.files?.[0] || null)} className="w-full text-white/70 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-500 file:text-white file:text-xs" />
                          </div>
                          <div>
                            <label className="text-white/70 text-xs block mb-1">PDF File (max 100MB)</label>
                            <input type="file" accept=".pdf,application/pdf" onChange={e => updateEntry(entry.id, "pdf", e.target.files?.[0] || null)} className="w-full text-white/70 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-500 file:text-white file:text-xs" />
                          </div>
                          <div>
                            <label className="text-white/70 text-xs block mb-1">Video File (max 100MB)</label>
                            <input type="file" accept="video/*" onChange={e => updateEntry(entry.id, "video", e.target.files?.[0] || null)} className="w-full text-white/70 text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-purple-500 file:text-white file:text-xs" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button onClick={addChapterEntry} variant="outline" className="w-full border-dashed border-white/30 text-white hover:bg-white/10 bg-transparent">
                    ➕ Add More Chapter
                  </Button>

                  {chapterMsg && <p className={`text-sm font-medium ${chapterMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{chapterMsg}</p>}

                  <Button onClick={uploadChapters} disabled={chapterSaving} className="w-full bg-purple-500 hover:bg-purple-600 font-semibold">
                    {chapterSaving ? "Uploading..." : `Upload ${chapterEntries.length} Chapter(s)`}
                  </Button>
                </CardContent>
              </Card>

              {/* Chapter list */}
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardHeader><CardTitle className="text-white">All Content Chapters ({contentChapters.length})</CardTitle></CardHeader>
                <CardContent>
                  {contentChapters.length === 0 ? (
                    <p className="text-white/50 text-center py-8">No chapters uploaded yet</p>
                  ) : (
                    <div className="space-y-3">
                      {/* Group by subject */}
                      {[...new Set(contentChapters.map(c => c.subject))].map(subj => (
                        <div key={subj}>
                          <p className="text-purple-300 font-semibold text-sm mb-2 uppercase tracking-wide">{subj}</p>
                          <div className="space-y-2 pl-2">
                            {contentChapters.filter(c => c.subject === subj).map(ch => (
                              <div key={ch._id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                                {editingChapter?._id === ch._id ? (
                                  <div className="space-y-2">
                                    <Input value={editChapterName} onChange={e => setEditChapterName(e.target.value)} className="bg-white/10 border-white/30 text-white h-8 text-sm" />
                                    <Textarea value={editChapterDesc} onChange={e => setEditChapterDesc(e.target.value)} rows={2} className="bg-white/10 border-white/30 text-white text-sm" />
                                    <Input value={editChapterVideoLink} onChange={e => setEditChapterVideoLink(e.target.value)} placeholder="Video link..." className="bg-white/10 border-white/30 text-white h-8 text-sm" />
                                    {editChapterMsg && <p className={`text-xs ${editChapterMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{editChapterMsg}</p>}
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={saveEditChapter} disabled={editChapterSaving} className="bg-purple-500 hover:bg-purple-600 h-7 text-xs">
                                        {editChapterSaving ? "..." : "Save"}
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingChapter(null)} className="bg-white/10 border-white/30 text-white h-7 text-xs">Cancel</Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-white font-medium text-sm">{ch.name}</p>
                                        {typeof ch.categoryId === "object" && ch.categoryId && (
                                          <Badge className="bg-indigo-500/30 text-indigo-200 text-xs border-0">{ch.categoryId.name}</Badge>
                                        )}
                                      </div>
                                      {ch.description && <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{ch.description}</p>}
                                      <div className="flex gap-2 mt-1 flex-wrap">
                                        {ch.pdfUrl && <span className="text-xs bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">📄 PDF</span>}
                                        {ch.videoUrl && <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">🎬 Video</span>}
                                        {ch.videoLink && <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">🔗 Link</span>}
                                        {ch.thumbnailUrl && <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">🖼 Thumb</span>}
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button size="sm" variant="outline" onClick={() => startEditChapter(ch)} className="bg-white/10 border-white/30 text-white hover:bg-white/20 h-7 px-2 text-xs">Edit</Button>
                                      <Button size="sm" variant="destructive" onClick={() => deleteContentChapter(ch._id, ch.name)} className="h-7 px-2 text-xs">Del</Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Results Tab ───────────────────────────────────────────────── */}
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
                        <div key={r._id} onClick={() => viewResultDetail(r)}
                          className={`p-3 rounded-xl cursor-pointer transition-all border ${selectedResult?._id === r._id ? 'bg-purple-500/30 border-purple-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-semibold">{r.userName}</p>
                              <p className="text-purple-200 text-sm">{r.testLabel} <span className="capitalize">({r.testType})</span></p>
                              <p className="text-white/50 text-xs">{new Date(r.completedAt).toLocaleString("en-IN")}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-2xl font-bold ${r.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>{r.percentage}%</p>
                              <p className="text-white/60 text-xs">{r.correctAnswers}/{r.totalQuestions}</p>
                              <p className="text-white/60 text-xs">{formatTime(r.timeTaken)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

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
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold text-white ${a.isCorrect ? "bg-green-500" : a.selectedAnswer ? "bg-red-500" : "bg-yellow-500"}`}>Q{a.questionNumber} {a.isCorrect ? "✓" : a.selectedAnswer ? "✗" : "—"}</span>
                            <span className="text-purple-300 text-xs">{a.subject} › {a.chapter}</span>
                          </div>
                          <p className="text-white text-sm mb-2">{a.questionText}</p>
                          <div className="space-y-1">
                            {(["a", "b", "c", "d"] as const).map(opt => (
                              <div key={opt} className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm ${a.correctAnswer === opt ? "bg-green-500/25 border border-green-400" : a.selectedAnswer === opt && a.correctAnswer !== opt ? "bg-red-500/25 border border-red-400" : "bg-white/5"}`}>
                                <span className="font-bold text-white">{opt.toUpperCase()}.</span>
                                <span className="text-white flex-1">{a.options?.[opt] ?? ""}</span>
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

          {/* ── Students Tab ──────────────────────────────────────────────── */}
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

          {/* ── Activity Tab ──────────────────────────────────────────────── */}
          <TabsContent value="activity">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-lg">User Activity Tracking</h2>
                <Button variant="outline" size="sm" onClick={fetchActivity} className="bg-white/10 border-white/30 text-white hover:bg-white/20">🔄 Refresh</Button>
              </div>
              {activityStats.length === 0 ? (
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardContent className="py-12 text-center"><p className="text-white/50">No activity data yet. Students need to log in and use the portal.</p></CardContent>
                </Card>
              ) : (
                <Card className="bg-white/10 backdrop-blur border-white/20">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-white">
                        <thead>
                          <tr className="border-b border-white/20">
                            <th className="text-left p-4">Student</th>
                            <th className="text-center p-4">Total Time</th>
                            <th className="text-center p-4">Sessions</th>
                            <th className="text-center p-4">Chapter Views</th>
                            <th className="text-center p-4">Last Active</th>
                            <th className="text-center p-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activityStats.map(stat => {
                            const isRecent = Date.now() - new Date(stat.lastActive).getTime() < 5 * 60 * 1000;
                            return (
                              <tr key={stat._id} className="border-b border-white/10 hover:bg-white/5">
                                <td className="p-4 font-medium">{stat.userName}</td>
                                <td className="p-4 text-center text-purple-200">{formatTime(stat.totalTime)}</td>
                                <td className="p-4 text-center">{stat.sessionCount}</td>
                                <td className="p-4 text-center">{stat.chapterViewsCount}</td>
                                <td className="p-4 text-center text-white/60 text-sm">{timeAgo(stat.lastActive)}</td>
                                <td className="p-4 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isRecent ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/50"}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isRecent ? "bg-green-400" : "bg-white/30"}`} />
                                    {isRecent ? "Online" : "Offline"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* ── Question Bank Tab ─────────────────────────────────────────── */}
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

          {/* ── Upload Q Tab ──────────────────────────────────────────────── */}
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
                    <p className="text-purple-300 text-xs mt-1">Year-wise questions — add "Subject: X" lines in the question text if needed.</p>
                  </div>
                )}
                <div>
                  <label className="text-white text-sm mb-2 block">Paste Questions</label>
                  <Textarea
                    placeholder={`Format:\n\n1. Which drug is a beta blocker?\na) Amlodipine\nb) Atenolol*\nc) Ramipril\nd) Losartan\nAnswer: b`}
                    value={uploadText} onChange={e => setUploadText(e.target.value)}
                    className="bg-white/10 border-white/30 text-white placeholder:text-white/50 min-h-[350px] font-mono text-sm" />
                </div>
                {uploadMessage && <p className={`text-sm font-medium ${uploadMessage.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{uploadMessage}</p>}
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

// ─── SubjectAccordion (unchanged) ────────────────────────────────────────────

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
      try {
        const res = await apiFetch(`/api/questions/chapters?subject=${encodeURIComponent(subject.subject)}`);
        setChapters(await res.json());
        setLoaded(true);
      } catch (e) { console.error(e); }
    }
    setOpen(!open);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10">
      <div className="flex items-center justify-between p-4 bg-white/5 cursor-pointer hover:bg-white/10 transition-all" onClick={toggle}>
        <div className="flex items-center gap-3">
          <span className="text-purple-300 text-lg">{open ? "▼" : "▶"}</span>
          <div>
            <p className="text-white font-semibold">{subject.subject}</p>
            <p className="text-white/50 text-xs">{subject.chapterCount} chapters · {subject.questionCount} questions</p>
          </div>
        </div>
        <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onDeleteSubject(subject.subject); }}
          disabled={deleting === subject.subject} className="bg-red-500 hover:bg-red-600 h-7 text-xs">
          {deleting === subject.subject ? "..." : "Delete All"}
        </Button>
      </div>
      {open && (
        <div className="p-4 space-y-2 bg-white/2">
          {chapters.map(ch => (
            <div key={ch.chapter} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="text-white font-medium">{ch.chapter}</p>
                <p className="text-white/50 text-xs">{ch.count} questions</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => onDeleteChapter(subject.subject, ch.chapter)}
                disabled={deleting === `${subject.subject}-${ch.chapter}`} className="bg-red-500/80 hover:bg-red-600 h-7 text-xs">
                {deleting === `${subject.subject}-${ch.chapter}` ? "..." : "Delete"}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
