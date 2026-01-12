import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Mountain, AlertTriangle, Snowflake, Cloud, MessageSquare, Loader2, FileText, TrendingUp, Compass } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ReportResponse, ChatMessage } from "@shared/schema";
import { MetricCard } from "@/components/metric-card";
import { DataTable } from "@/components/data-table";
import { SummaryCard } from "@/components/summary-card";
import { ChatInterface } from "@/components/chat-interface";
import { AspectChart } from "@/components/aspect-chart";
import { ElevationChart } from "@/components/elevation-chart";
import { ProgressTracker } from "@/components/progress-tracker";
import { ThemeToggle } from "@/components/theme-toggle";

interface ProgressState {
  stage: string;
  progress: number;
  message: string;
}

export default function Home() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reportData, setReportData] = useState<ReportResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ stage: "", progress: 0, message: "" });
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const connectSSE = useCallback(() => {
    // Generate new session ID for this request
    sessionIdRef.current = crypto.randomUUID();
    
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/progress/${sessionIdRef.current}`);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);
      } catch (e) {
        console.error("Failed to parse progress event:", e);
      }
    };
    
    eventSource.onerror = () => {
      eventSource.close();
    };
    
    return sessionIdRef.current;
  }, []);

  const fetchReports = async (date: string) => {
    setIsLoading(true);
    setProgress({ stage: "connecting", progress: 0, message: "Connecting..." });
    
    const sessionId = connectSSE();
    
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Session-Id": sessionId,
        },
        body: JSON.stringify({ date }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json() as ReportResponse;
      setReportData(data);
      setChatMessages([]);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setProgress({ stage: "error", progress: 0, message: "Failed to fetch reports" });
    } finally {
      setIsLoading(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: reportData?.aggregatedData,
          summaries: reportData?.summaries,
        }),
      });
      if (!response.ok) throw new Error("Chat request failed");
      return response.json() as Promise<{ response: string }>;
    },
    onSuccess: (data, message) => {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      };
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };
      setChatMessages((prev) => [...prev, userMessage, assistantMessage]);
    },
  });

  const handleSubmit = () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    fetchReports(dateStr);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setIsCalendarOpen(false);
    }
  };

  const handleSendMessage = (message: string) => {
    if (!reportData) return;
    chatMutation.mutate(message);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-md">
              <Mountain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-medium text-foreground">CAIC Field Report Aggregator</h1>
              <p className="text-sm text-muted-foreground">Aggregate and analyze avalanche field observations</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Control Panel */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Select Date</span>
              </div>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    data-testid="button-date-picker"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    disabled={(date) => date > new Date()}
                  />
                </PopoverContent>
              </Popover>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                data-testid="button-fetch-reports"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Fetch Reports
                  </>
                )}
              </Button>
              {reportData && (
                <div className="text-sm text-muted-foreground ml-auto">
                  Showing data for: <span className="font-medium text-foreground">{format(new Date(reportData.date), "MMMM d, yyyy")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loading State with Progress */}
        {isLoading && (
          <Card>
            <CardContent className="p-6">
              <ProgressTracker
                progress={progress.progress}
                stage={progress.stage}
                message={progress.message}
              />
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {progress.stage === "error" && !isLoading && (
          <Card className="border-destructive/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <p className="font-medium">Failed to fetch reports. Please try again.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {reportData && reportData.aggregatedData.totalReports === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Reports Available</h3>
              <p className="text-muted-foreground">
                No field reports were submitted for {format(new Date(reportData.date), "MMMM d, yyyy")}. Try selecting a different date.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {reportData && reportData.aggregatedData.totalReports > 0 && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard
                title="Total Reports"
                value={reportData.aggregatedData.totalReports}
                icon={FileText}
                description="Field reports submitted"
                testId="metric-total-reports"
              />
              <MetricCard
                title="Reports with Avalanches"
                value={reportData.aggregatedData.reportsWithAvalanches}
                icon={AlertTriangle}
                description="Reports containing avalanche observations"
                variant="warning"
                testId="metric-reports-with-avalanches"
              />
              <MetricCard
                title="Total Avalanches"
                value={reportData.aggregatedData.totalAvalanches}
                icon={TrendingUp}
                description="Individual avalanches observed"
                variant="danger"
                testId="metric-total-avalanches"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Compass className="h-5 w-5 text-muted-foreground" />
                    Avalanches by Aspect
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AspectChart data={reportData.aggregatedData.avalanchesByAspect} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <Mountain className="h-5 w-5 text-muted-foreground" />
                    Avalanches by Elevation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ElevationChart data={reportData.aggregatedData.avalanchesByElevation} />
                </CardContent>
              </Card>
            </div>

            {/* Instability Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium">Cracking Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable 
                    data={reportData.aggregatedData.crackingCounts} 
                    title="Cracking Level"
                    testIdPrefix="cracking"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium">Collapsing Observations</CardTitle>
                </CardHeader>
                <CardContent>
                  <DataTable 
                    data={reportData.aggregatedData.collapsingCounts} 
                    title="Collapsing Level"
                    testIdPrefix="collapsing"
                  />
                </CardContent>
              </Card>
            </div>

            {/* AI Summaries */}
            <div className="space-y-6">
              <h2 className="text-xl font-medium flex items-center gap-2">
                <Snowflake className="h-5 w-5 text-primary" />
                AI-Synthesized Summaries
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SummaryCard
                  title="Observation Themes"
                  content={reportData.summaries.observationSummary}
                  icon={FileText}
                  testId="summary-observation"
                />
                <SummaryCard
                  title="Snowpack Summary"
                  content={reportData.summaries.snowpackSummary}
                  icon={Snowflake}
                  testId="summary-snowpack"
                />
                <SummaryCard
                  title="Weather Summary"
                  content={reportData.summaries.weatherSummary}
                  icon={Cloud}
                  testId="summary-weather"
                />
              </div>
            </div>

            {/* Chat Interface */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  Ask About Today's Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChatInterface
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  isLoading={chatMutation.isPending}
                  disabled={!reportData}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Initial State - Show prompt to fetch */}
        {!reportData && !isLoading && progress.stage !== "error" && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Mountain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">Ready to Aggregate Reports</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Select a date and click "Fetch Reports" to aggregate field observations from the CAIC API with AI-powered summaries.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
