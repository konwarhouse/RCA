import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/error-boundary";
import Home from "@/pages/home";
import AnalysisDetail from "@/pages/analysis-detail";
import AdminSettings from "@/pages/admin-settings";
import NewInvestigation from "@/pages/new-investigation";
import InvestigationType from "@/pages/investigation-type";
import EvidenceCollection from "@/pages/evidence-collection";
import EvidenceLibraryAdmin from "@/pages/evidence-library-admin";
import EvidenceLibraryManagement from "@/pages/evidence-library-management";
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
      <Route path="/admin/evidence-library" component={EvidenceLibraryAdmin} />
      <Route path="/admin/evidence-management" component={EvidenceLibraryManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
