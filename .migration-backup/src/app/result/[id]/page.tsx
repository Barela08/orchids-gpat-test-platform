"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Answer {
  questionId: string;
  questionNumber: number;
  selectedAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  subject: string;
}

interface Result {
  _id: string;
  userName: string;
  year: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  percentage: number;
  timeTaken: number;
  answers: Answer[];
  completedAt: string;
}

export default function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    fetchResult();
  }, [resolvedParams.id]);

  const fetchResult = async () => {
    try {
      const res = await fetch(`/api/test/results/${resolvedParams.id}`);
      const data = await res.json();
      setResult(data.result);
      setQuestions(data.questions);
    } catch (error) {
      console.error("Failed to fetch result:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
        <Card className="bg-white/10 backdrop-blur border-white/20 p-8 text-center">
          <p className="text-white text-xl mb-4">Result not found</p>
          <Button onClick={() => router.push("/dashboard")} className="bg-emerald-500 hover:bg-emerald-600">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
          <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
            <CardHeader>
              <CardTitle className="text-2xl text-white text-center">Test Result - {result.year}</CardTitle>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-white/10 rounded-xl">
                <p className={`text-4xl font-bold ${result.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>
                  {result.percentage}%
                </p>
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
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAnswers(!showAnswers)}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  {showAnswers ? "Hide Answers" : "Show Answers"}
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {showAnswers && (
          <div className="space-y-4">
            {questions.map((q, i) => {
              const answer = result.answers.find((a) => a.questionNumber === q.questionNumber);
              return (
                <Card key={q._id} className={`bg-white/10 backdrop-blur border-2 ${
                  answer?.isCorrect ? "border-green-500/50" : answer?.selectedAnswer ? "border-red-500/50" : "border-yellow-500/50"
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        answer?.isCorrect ? "bg-green-500" : answer?.selectedAnswer ? "bg-red-500" : "bg-yellow-500"
                      } text-white`}>
                        Q{q.questionNumber}
                      </span>
                      <span className="text-emerald-200 text-sm">{q.subject}</span>
                    </div>
                    <p className="text-white mb-4 whitespace-pre-wrap">{q.questionText}</p>
                    <div className="space-y-2">
                        {(["a", "b", "c", "d"] as const).map((opt) => (
                          <div
                            key={opt}
                            className={`p-3 rounded-lg ${
                              answer?.correctAnswer === opt
                                ? "bg-green-500/30 border border-green-500"
                                : answer?.selectedAnswer === opt && !answer?.isCorrect
                                ? "bg-red-500/30 border border-red-500"
                                : "bg-white/5"
                            }`}
                          >
                            <span className="text-white">
                              <span className="font-semibold mr-2">{opt.toUpperCase()}.</span>
                              {q.options[opt]}
                              {answer?.correctAnswer === opt && <span className="ml-2 text-green-400">(Correct)</span>}
                              {answer?.selectedAnswer === opt && answer?.selectedAnswer !== answer?.correctAnswer && (
                                <span className="ml-2 text-red-400">(Your Answer)</span>
                              )}
                            </span>
                          </div>
                        ))}
                    </div>
                    {!answer?.selectedAnswer && (
                      <p className="text-yellow-400 text-sm mt-2">Not Answered</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
