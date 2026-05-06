import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface YearData { year: string; count: number; }
interface SubjectData { subject: string; chapterCount: number; questionCount: number; }
interface ChapterData { chapter: string; count: number; }
interface TestResult {
  _id: string; testLabel: string; testType: string;
  percentage: number; correctAnswers: number; totalQuestions: number;
  timeTaken: number; completedAt: string;
}

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<'subject' | 'year'>('subject');
  const [years, setYears] = useState<YearData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [chapters, setChapters] = useState<ChapterData[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/");
    if (!isLoading && user?.role === "admin") setLocation("/admin");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user) {
      Promise.all([
        apiFetch("/api/questions/years").then(r => r.json()),
        apiFetch("/api/questions/subjects").then(r => r.json()),
        apiFetch(`/api/test/results`).then(r => r.json()),
      ]).then(([y, s, r]) => {
        setYears(Array.isArray(y) ? y : []);
        setSubjects(Array.isArray(s) ? s : []);
        setResults(Array.isArray(r) ? r : []);
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [user]);

  useEffect(() => {
    if (selectedSubject) {
      apiFetch(`/api/questions/chapters?subject=${encodeURIComponent(selectedSubject)}`)
        .then(r => r.json()).then(data => setChapters(Array.isArray(data) ? data : []));
    }
  }, [selectedSubject]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  if (isLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {user?.name}</h1>
            <p className="text-emerald-200">GPAT Practice Dashboard</p>
          </div>
          <Button onClick={logout} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">Logout</Button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => { setTab('subject'); setSelectedSubject(null); }}
            className={`px-5 py-2 rounded-full font-semibold transition-all ${tab === 'subject' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >Subject / Chapter-wise</button>
          <button
            onClick={() => { setTab('year'); setSelectedSubject(null); }}
            className={`px-5 py-2 rounded-full font-semibold transition-all ${tab === 'year' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
          >Year-wise</button>
        </div>

        {/* Subject Tab */}
        {tab === 'subject' && !selectedSubject && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Select a Subject</h2>
            {subjects.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="py-8 text-center"><p className="text-white/70">No subjects available yet.</p></CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map(s => (
                  <Card key={s.subject} onClick={() => setSelectedSubject(s.subject)}
                    className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                    <CardHeader><CardTitle className="text-white text-lg">{s.subject}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-emerald-200 text-sm">{s.chapterCount} Chapters · {s.questionCount} Questions</p>
                      <Button className="mt-3 w-full bg-emerald-500 hover:bg-emerald-600">View Chapters →</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chapter Tab */}
        {tab === 'subject' && selectedSubject && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setSelectedSubject(null)} className="text-emerald-300 hover:text-white transition-colors">← Back</button>
              <h2 className="text-xl font-semibold text-white">{selectedSubject} — Chapters</h2>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button onClick={() => setLocation(`/test?subject=${encodeURIComponent(selectedSubject)}&testType=subject`)}
                className="bg-teal-500 hover:bg-teal-600">
                Start Full Subject Test ({subjects.find(s => s.subject === selectedSubject)?.questionCount} Qs)
              </Button>
            </div>
            {chapters.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="py-8 text-center"><p className="text-white/70">No chapters found.</p></CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chapters.map(c => (
                  <Card key={c.chapter} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all">
                    <CardHeader><CardTitle className="text-white text-base">{c.chapter}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-emerald-200 text-sm mb-3">{c.count} Questions</p>
                      <Button onClick={() => setLocation(`/test?subject=${encodeURIComponent(selectedSubject)}&chapter=${encodeURIComponent(c.chapter)}&testType=chapter`)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600">Start Test</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Year Tab */}
        {tab === 'year' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Year-wise Tests</h2>
            {years.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur border-white/20">
                <CardContent className="py-8 text-center"><p className="text-white/70">No year-wise tests available yet.</p></CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {years.map(y => (
                  <Card key={y.year} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all">
                    <CardHeader><CardTitle className="text-white text-xl">{y.year}</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-emerald-200 mb-4">{y.count} Questions</p>
                      <Button onClick={() => setLocation(`/test?year=${encodeURIComponent(y.year)}&testType=year`)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600">Start Test</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test History */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Your Test History</h2>
          {results.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="py-8 text-center"><p className="text-white/70">No tests taken yet. Start your first test!</p></CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map(r => (
                <Card key={r._id} className="bg-white/10 backdrop-blur border-white/20">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-white font-semibold">{r.testLabel}</h3>
                        <p className="text-emerald-200 text-sm capitalize">{r.testType}-wise · {new Date(r.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${r.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>{r.percentage}%</p>
                          <p className="text-white/60 text-xs">Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white text-lg">{r.correctAnswers}/{r.totalQuestions}</p>
                          <p className="text-white/60 text-xs">Correct</p>
                        </div>
                        <div className="text-center">
                          <p className="text-white text-lg">{formatTime(r.timeTaken)}</p>
                          <p className="text-white/60 text-xs">Time</p>
                        </div>
                        <Button onClick={() => setLocation(`/result/${r._id}`)} variant="outline" size="sm" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                          Answer Sheet
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
