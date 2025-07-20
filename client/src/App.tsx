import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AnalysisDetail from "@/pages/analysis-detail";
import AdminSettings from "@/pages/admin-settings";
import NewInvestigation from "@/pages/new-investigation";
import InvestigationType from "@/pages/investigation-type";
import EvidenceCollection from "@/pages/evidence-collection";
import NotFound from "@/pages/not-found";


function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/new" component={NewInvestigation} />
      <Route path="/investigation/:id/type" component={InvestigationType} />
      <Route path="/investigation/:id/evidence" component={EvidenceCollection} />
      <Route path="/investigation/:id" component={AnalysisDetail} />
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
