"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Question {
  _id: string;
  questionNumber: number;
  questionText: string;
  options: { a: string; b: string; c: string; d: string };
  subject: string;
}

function TestContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = searchParams.get("year");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime] = useState(new Date());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (year) {
      fetchQuestions();
    }
  }, [year]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/questions?year=${year}`);
      const data = await res.json();
      setQuestions(data);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    if (!confirm("Are you sure you want to submit the test?")) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          userName: user?.name,
          year,
          answers,
          startedAt: startTime.toISOString(),
          timeTaken: timeElapsed
        })
      });

      const data = await res.json();
      router.push(`/result/${data.result.id}`);
    } catch (error) {
      console.error("Failed to submit:", error);
      alert("Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
        <Card className="bg-white/10 backdrop-blur border-white/20 p-8 text-center">
          <p className="text-white text-xl mb-4">No questions available for {year}</p>
          <Button onClick={() => router.push("/dashboard")} className="bg-emerald-500 hover:bg-emerald-600">
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
      <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white/10 backdrop-blur rounded-xl p-4">
            <div>
              <h1 className="text-xl font-bold text-white">{year}</h1>
              <p className="text-emerald-200 text-sm">Question {currentIndex + 1} of {questions.length}</p>
            </div>
            <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-mono text-white">{formatTime(timeElapsed)}</p>
              <p className="text-emerald-200 text-xs">Time Elapsed</p>
            </div>
            <div className="text-center">
              <p className="text-xl text-white">{answeredCount}/{questions.length}</p>
              <p className="text-emerald-200 text-xs">Answered</p>
            </div>
          </div>
        </div>

        <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                Q{currentQuestion.questionNumber}
              </span>
              <span className="text-emerald-200 text-sm">{currentQuestion.subject}</span>
            </div>
            <p className="text-white text-lg mb-6 whitespace-pre-wrap">{currentQuestion.questionText}</p>

            <div className="space-y-3">
              {(["a", "b", "c", "d"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleAnswer(currentQuestion._id, opt)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    answers[currentQuestion._id] === opt
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  <span className="font-semibold mr-3">{opt.toUpperCase()}.</span>
                  {currentQuestion.options[opt]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 mb-6 bg-white/10 backdrop-blur rounded-xl p-4">
          {questions.map((q, i) => (
            <button
              key={q._id}
              onClick={() => setCurrentIndex(i)}
              className={`w-10 h-10 rounded-lg font-semibold text-sm transition-all ${
                i === currentIndex
                  ? "bg-emerald-500 text-white"
                  : answers[q._id]
                  ? "bg-green-500 text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex justify-between gap-4">
          <Button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20"
          >
            Previous
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {submitting ? "Submitting..." : "Submit Test"}
          </Button>
          <Button
            onClick={() => setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))}
            disabled={currentIndex === questions.length - 1}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    }>
      <TestContent />
    </Suspense>
  );
}
