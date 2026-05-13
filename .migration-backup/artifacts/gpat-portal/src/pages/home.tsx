import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const { user, login, register, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/init-admin").catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === "admin") {
        setLocation("/admin");
      } else {
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const result = await login(formData.email, formData.password);
      if (!result.success) {
        setError(result.error || "Login failed");
      }
    } else {
      if (!formData.name) {
        setError("Name is required");
        setLoading(false);
        return;
      }
      const result = await register(formData.name, formData.email, formData.password);
      if (result.success) {
        const loginResult = await login(formData.email, formData.password);
        if (!loginResult.success) {
          setError("Registration successful. Please login.");
          setIsLogin(true);
        }
      } else {
        setError(result.error || "Registration failed");
      }
    }
    setLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">GPAT</h1>
          <p className="text-emerald-200 text-lg font-medium">Graduate Pharmacy Aptitude Test</p>
          <p className="text-emerald-300/70 text-sm mt-1">Online Practice Portal</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-white text-center">
              {isLogin ? "Welcome Back" : "Create Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-white/10 border-white/30 text-white placeholder:text-white/50 h-12"
                />
              )}
              <Input
                type="text"
                placeholder="Email / Username"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 h-12"
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-white/10 border-white/30 text-white placeholder:text-white/50 h-12"
                required
              />
              {error && (
                <p className="text-red-300 text-sm text-center bg-red-500/20 py-2 rounded-lg">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-lg transition-all"
              >
                {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(""); }}
                className="text-emerald-200 hover:text-white transition-colors"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </CardContent>
        </Card>

        <footer className="mt-8 text-center text-emerald-300/60 text-sm">
          <p>Developed by <span className="text-emerald-200 font-medium">Nilesh Barela</span></p>
        </footer>
      </div>
    </div>
  );
}
