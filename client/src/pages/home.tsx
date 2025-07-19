import { useState } from "react";
import { Brain, Activity, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import UploadSection from "@/components/upload-section";
import DashboardSection from "@/components/dashboard-section";
import HistorySection from "@/components/history-section";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Brain className="text-primary-foreground text-sm" size={16} />
                </div>
                <h1 className="text-xl font-bold text-foreground">RCA Intelligence</h1>
                <Badge className="enterprise-gradient text-white text-xs px-2 py-1 font-medium">
                  AI-Powered
                </Badge>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-accent rounded-full"></span>
                <span>System Active</span>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => setLocation('/admin')}
                className="text-sm font-medium"
              >
                <Users className="w-4 h-4 mr-2" />
                Admin Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span>Upload & Analyze</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <Activity className="w-4 h-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Analysis History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <UploadSection />
          </TabsContent>

          <TabsContent value="dashboard">
            <DashboardSection />
          </TabsContent>

          <TabsContent value="history">
            <HistorySection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
