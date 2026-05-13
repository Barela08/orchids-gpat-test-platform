import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface Result {
  _id: string;
  userName: string;
  testLabel: string;
  testType: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  percentage: number;
  timeTaken: number;
  answers: Answer[];
  completedAt: string;
}

type Filter = 'all' | 'wrong' | 'correct' | 'unanswered';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!isLoading && !user) setLocation("/");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (id) {
      apiFetch(`/api/test/results/${id}`)
        .then(r => r.json())
        .then(data => setResult(data.result))
        .catch(err => console.error("Failed to fetch result:", err))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  const optionLabel = (opt: string) => opt.toUpperCase();

  if (isLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
    </div>
  );

  if (!result) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
      <Card className="bg-white/10 backdrop-blur border-white/20 p-8 text-center">
        <p className="text-white text-xl mb-4">Result not found</p>
        <Button onClick={() => setLocation("/dashboard")} className="bg-emerald-500 hover:bg-emerald-600">Back to Dashboard</Button>
      </Card>
    </div>
  );

  const filteredAnswers = result.answers.filter(a => {
    if (filter === 'wrong') return !a.isCorrect && a.selectedAnswer;
    if (filter === 'correct') return a.isCorrect;
    if (filter === 'unanswered') return !a.selectedAnswer;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Score Summary */}
        <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="text-2xl text-white text-center">{result.testLabel}</CardTitle>
            <p className="text-emerald-200 text-center text-sm capitalize">{result.testType}-wise Test · {new Date(result.completedAt).toLocaleString("en-IN")}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-white/10 rounded-xl">
                <p className={`text-4xl font-bold ${result.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>{result.percentage}%</p>
                <p className="text-emerald-200 text-sm">Score</p>
              </div>
              <div className="text-center p-4 bg-white/10 rounded-xl">
                <p className="text-4xl font-bold text-green-400">{result.correctAnswers}</p>
                <p className="text-emerald-200 text-sm">Correct</p>
              </div>
              <div className="text-center p-4 bg-white/10 rounded-xl">
                <p className="text-4xl font-bold text-red-400">{result.wrongAnswers}</p>
                <p className="text-emerald-200 text-sm">Wrong</p>
              </div>
              <div className="text-center p-4 bg-white/10 rounded-xl">
                <p className="text-4xl font-bold text-yellow-400">{result.unanswered}</p>
                <p className="text-emerald-200 text-sm">Unanswered</p>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 bg-white/10 rounded-xl">
              <div>
                <p className="text-white"><span className="text-emerald-200">Total Questions:</span> {result.totalQuestions}</p>
                <p className="text-white"><span className="text-emerald-200">Time Taken:</span> {formatTime(result.timeTaken)}</p>
              </div>
              <Button onClick={() => setLocation(user?.role === "admin" ? "/admin" : "/dashboard")}
                variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                ← Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Answer Sheet */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white mb-3">Answer Sheet</h2>
          <div className="flex gap-2 flex-wrap mb-4">
            {(['all', 'wrong', 'correct', 'unanswered'] as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all capitalize ${filter === f
                  ? f === 'wrong' ? 'bg-red-500 text-white' : f === 'correct' ? 'bg-green-500 text-white' : f === 'unanswered' ? 'bg-yellow-500 text-white' : 'bg-emerald-500 text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {f === 'all' ? `All (${result.answers.length})` : f === 'wrong' ? `Wrong (${result.wrongAnswers})` : f === 'correct' ? `Correct (${result.correctAnswers})` : `Unanswered (${result.unanswered})`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredAnswers.map(a => (
            <Card key={a.questionId} className={`backdrop-blur border-2 ${a.isCorrect ? "bg-green-900/20 border-green-500/40" : a.selectedAnswer ? "bg-red-900/20 border-red-500/40" : "bg-yellow-900/20 border-yellow-500/40"}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${a.isCorrect ? "bg-green-500" : a.selectedAnswer ? "bg-red-500" : "bg-yellow-500"}`}>
                    Q{a.questionNumber} {a.isCorrect ? "✓" : a.selectedAnswer ? "✗" : "—"}
                  </span>
                  <span className="text-emerald-200 text-sm">{a.subject}</span>
                  {a.chapter && <span className="text-teal-300 text-sm">› {a.chapter}</span>}
                </div>
                <p className="text-white mb-4 whitespace-pre-wrap">{a.questionText}</p>
                <div className="space-y-2">
                  {(["a", "b", "c", "d"] as const).map(opt => {
                    const isCorrect = a.correctAnswer === opt;
                    const isSelected = a.selectedAnswer === opt;
                    return (
                      <div key={opt} className={`p-3 rounded-lg flex items-start gap-2 ${isCorrect ? "bg-green-500/25 border border-green-400" : isSelected && !isCorrect ? "bg-red-500/25 border border-red-400" : "bg-white/5"}`}>
                        <span className="font-bold text-white min-w-[24px]">{optionLabel(opt)}.</span>
                        <span className="text-white flex-1">{a.options?.[opt] ?? ""}</span>
                        <span className="text-sm font-semibold ml-2 shrink-0">
                          {isCorrect && <span className="text-green-300">✓ Correct</span>}
                          {isSelected && !isCorrect && <span className="text-red-300">✗ Your Answer</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {!a.selectedAnswer && <p className="text-yellow-400 text-sm mt-2 font-medium">Not Attempted</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
