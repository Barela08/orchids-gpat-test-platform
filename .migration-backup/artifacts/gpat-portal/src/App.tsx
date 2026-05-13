import { Switch, Route, Router as WouterRouter } from "wouter";
import { AuthProvider } from "@/lib/auth-context";
import HomePage from "@/pages/home";
import DashboardPage from "@/pages/dashboard";
import TestPage from "@/pages/test";
import ResultPage from "@/pages/result";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/test" component={TestPage} />
      <Route path="/result/:id" component={ResultPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </AuthProvider>
  );
}

export default App;
