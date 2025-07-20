import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AnalysisDetail from "@/pages/analysis-detail";
import AdminSettings from "@/pages/admin-settings";
import NewAnalysis from "@/pages/new-analysis";
import InteractiveEvidenceForm from "@/pages/interactive-evidence-form";
import ISO14224EvidenceForm from "@/pages/iso14224-evidence-form";
import TestEvidence from "@/pages/test-evidence";
import NotFound from "@/pages/not-found";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/new" component={NewAnalysis} />
      <Route path="/test-evidence" component={TestEvidence} />
      <Route path="/evidence/:id" component={ISO14224EvidenceForm} />
      <Route path="/evidence-legacy/:id" component={InteractiveEvidenceForm} />
      <Route path="/analysis/:id" component={AnalysisDetail} />
      <Route path="/admin" component={AdminSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
