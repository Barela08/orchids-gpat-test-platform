import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface YearData {
  year: string;
  count: number;
}

interface TestResult {
  _id: string;
  year: string;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeTaken: number;
  completedAt: string;
}

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [years, setYears] = useState<YearData[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) setLocation("/");
    if (!isLoading && user?.role === "admin") setLocation("/admin");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const [yearsRes, resultsRes] = await Promise.all([
            fetch("/api/questions/years"),
            fetch(`/api/test/results?userId=${user.id}`)
          ]);
          setYears(await yearsRes.json());
          setResults(await resultsRes.json());
        } catch (error) {
          console.error("Failed to fetch data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {user?.name}</h1>
            <p className="text-emerald-200">GPAT Practice Dashboard</p>
          </div>
          <Button onClick={logout} variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
            Logout
          </Button>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Available Tests</h2>
          {years.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="py-8 text-center">
                <p className="text-white/70">No tests available yet. Admin will add questions soon.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {years.map((y) => (
                <Card key={y.year} className="bg-white/10 backdrop-blur border-white/20 hover:bg-white/20 transition-all cursor-pointer">
                  <CardHeader>
                    <CardTitle className="text-white text-xl">{y.year}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-emerald-200 mb-4">{y.count} Questions</p>
                    <Button onClick={() => setLocation(`/test?year=${y.year}`)} className="w-full bg-emerald-500 hover:bg-emerald-600">
                      Start Test
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Your Test History</h2>
          {results.length === 0 ? (
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardContent className="py-8 text-center">
                <p className="text-white/70">No tests taken yet. Start your first test!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <Card key={r._id} className="bg-white/10 backdrop-blur border-white/20">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-white font-semibold">{r.year}</h3>
                        <p className="text-emerald-200 text-sm">
                          {new Date(r.completedAt).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className={`text-2xl font-bold ${r.percentage >= 50 ? "text-green-400" : "text-red-400"}`}>
                            {r.percentage}%
                          </p>
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
                        <Button
                          onClick={() => setLocation(`/result/${r._id}`)}
                          variant="outline"
                          size="sm"
                          className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                        >
                          View Details
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
