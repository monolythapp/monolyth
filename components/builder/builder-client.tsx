"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Search,
  Sparkles,
  Save,
  Send,
  FileSignature,
  Eye,
  ArrowLeft,
  FolderOpen,
  Brain,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleApiError } from "@/lib/handle-api-error";
import { logBuilderEvent } from "@/lib/telemetry/builder";
import { analyzeItem } from "@/lib/ai/analyze";
import type { AnalyzeResult } from "@/lib/ai/schemas";
import { getBrowserSupabaseClient } from "@/lib/supabase-browser";

type TemplateOption = {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  default_prompt?: string | null;
};

type ClauseOption = {
  id: string;
  name: string;
  category?: string | null;
  body: string;
};

interface BuilderClientProps {
  templates: TemplateOption[];
  clauses: ClauseOption[];
}

// Map database categories to bolt design categories
function mapCategoryToBoltCategory(category: string | null | undefined): string {
  if (!category) return "Core Operational Contracts";
  
  const cat = category.toLowerCase();
  if (cat.includes("contract") || cat.includes("nda") || cat.includes("employment") || cat.includes("service") || cat.includes("consulting") || cat.includes("independent")) {
    return "Core Operational Contracts";
  }
  if (cat.includes("sales") || cat.includes("purchase") || cat.includes("partnership") || cat.includes("joint") || cat.includes("commercial") || cat.includes("deal")) {
    return "Commercial & Deal-Making";
  }
  if (cat.includes("corporate") || cat.includes("finance") || cat.includes("llc") || cat.includes("shareholder") || cat.includes("convertible") || cat.includes("safe")) {
    return "Corporate & Finance";
  }
  return "Core Operational Contracts";
}

// Group templates by bolt category
function groupTemplatesByCategory(templates: TemplateOption[]) {
  const grouped: Record<string, TemplateOption[]> = {
    "Core Operational Contracts": [],
    "Commercial & Deal-Making": [],
    "Corporate & Finance": [],
  };

  templates.forEach((template) => {
    const boltCategory = mapCategoryToBoltCategory(template.category);
    if (!grouped[boltCategory]) {
      grouped[boltCategory] = [];
    }
    grouped[boltCategory].push(template);
  });

  return Object.entries(grouped).filter(([_, items]) => items.length > 0);
}

export function BuilderClient({ templates, clauses }: BuilderClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  const safeTemplates = Array.isArray(templates) ? templates : [];
  const safeClauses = Array.isArray(clauses) ? clauses : [];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedClauseIds, setSelectedClauseIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Analyze state
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const analyzingRef = useRef(false);

  // Send for Signature modal state
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sending, setSending] = useState(false);

  const selectedTemplate = safeTemplates.find((t) => t.id === selectedTemplateId);

  const groupedTemplates = useMemo(() => {
    const filtered = searchQuery
      ? safeTemplates.filter(
          (t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : safeTemplates;
    return groupTemplatesByCategory(filtered);
  }, [safeTemplates, searchQuery]);

  const toggleClause = (id: string) => {
    setSelectedClauseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError("Please select a template first.");
      return;
    }
    if (!instructions.trim()) {
      setError("Please add some instructions or context.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      logBuilderEvent("builder_generate", {
        templateId: selectedTemplate.id,
        templateName: selectedTemplate.name,
        clauseCount: selectedClauseIds.length,
      });

      const includedClauses = safeClauses.filter((c) =>
        selectedClauseIds.includes(c.id)
      );

      const clauseText =
        includedClauses.length > 0
          ? includedClauses
              .map(
                (c, idx) =>
                  `${idx + 1}. ${c.name}${
                    c.category ? ` [${c.category}]` : ""
                  }\n${c.body}`
              )
              .join("\n\n")
          : "No specific clauses selected. Use standard boilerplate where appropriate.";

      const stub = [
        `DRAFT VERSION 1 – ${selectedTemplate.name}`,
        "",
        "Scenario / instructions:",
        instructions.trim(),
        "",
        "Clauses to reflect:",
        clauseText,
        "",
        "[TODO: Replace this stub with full AI-generated contract text in Week 5.]",
      ].join("\n");

      setGeneratedContent(stub);
      setError(null);

      // Log doc_generated event (best-effort, don't block on failure)
      try {
        const currentUserId = (await getBrowserSupabaseClient().auth.getUser()).data.user?.id;
        if (currentUserId) {
          const response = await fetch("/api/activity/log-doc-generated", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": currentUserId,
            },
            body: JSON.stringify({
              templateId: selectedTemplate.id,
              contentLength: stub.length,
            }),
          });
          if (!response.ok) {
            // Silently fail - logging is best-effort
            const status = response.status;
            if (status === 401 || status === 403) {
              // Auth errors are logged but don't show toast for background logging
              console.warn("[builder] Auth error logging doc_generated event", { status });
            }
          }
        }
      } catch {
        // Ignore errors - logging is best-effort
      }
    } catch (err) {
      const errorMessage = (err as Error).message ?? "Failed to generate Version 1.";
      setError(errorMessage);
      logBuilderEvent("builder_generate_failed", {
        error: errorMessage,
      });
      
      const status = errorMessage.includes("401") ? 401 : errorMessage.includes("403") ? 403 : 500;
      handleApiError({
        status,
        errorMessage,
        toast,
        context: "builder",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToVault = async () => {
    if (!selectedTemplate) {
      setError("Please select a template first.");
      return;
    }
    if (!generatedContent.trim()) {
      setError("Please generate Version 1 content first.");
      return;
    }

    setError(null);
    setSaving(true);

    // Get current user ID to pass to API for auth
    let currentUserId: string | null = null;
    try {
      const sb = getBrowserSupabaseClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        currentUserId = user.id;
      }
    } catch {
      // Ignore errors, will fall back to cookie-based auth
    }

    try {
      const title = documentTitle.trim() || `${selectedTemplate.name} — ${new Date().toISOString().slice(0, 10)}`;
      const content = generatedContent;

      const response = await fetch("/api/documents/versions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(currentUserId && { "x-user-id": currentUserId }),
        },
        body: JSON.stringify({
          title,
          content,
          templateId: selectedTemplate.id,
        }),
      });

      let data: any = null;
      let rawBody: string | null = null;
      
      // Clone response before reading to preserve body for error handling
      const responseClone = response.clone();
      
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get raw body for debugging
        try {
          rawBody = await responseClone.text();
          console.warn("[builder] Save to Vault: failed to parse JSON response", {
            status: response.status,
            rawBodyPreview: rawBody.substring(0, 200),
          });
        } catch (textError) {
          console.warn("[builder] Save to Vault: failed to read response body", {
            jsonError: jsonError instanceof Error ? jsonError.message : String(jsonError),
            textError: textError instanceof Error ? textError.message : String(textError),
          });
        }
      }

      if (!response.ok || !data?.ok) {
        const status = response.status;
        const baseMessage = data?.error ?? "Failed to save to Vault";
        const details = data?.details;

        let detailsSuffix = "";
        if (details) {
          const parts: string[] = [];
          if (details.code) parts.push(`code=${details.code}`);
          if (details.message) parts.push(details.message);
          if (parts.length) {
            detailsSuffix = ` (${parts.join(" - ")})`;
          }
        }

        const errorMessage = `${baseMessage}${detailsSuffix}`;

        // If we don't have rawBody yet, try to get it from the cloned response
        if (!rawBody) {
          try {
            rawBody = await responseClone.text();
          } catch {
            // ignore
          }
        }

        // Create error details with proper serialization
        const errorDetails: Record<string, unknown> = {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          details: details ?? null,
          data: data ?? null,
        };
        
        if (rawBody) {
          errorDetails.rawBody = rawBody;
        }

        // Log with JSON.stringify to ensure proper serialization
        console.error("[builder] Save to Vault error", JSON.stringify(errorDetails, null, 2));

        handleApiError({
          status,
          errorMessage,
          toast,
          context: "builder",
        });
        return;
      }

      setSavedDocumentId(data.documentId ?? null);
      toast({
        title: "Saved to Vault",
        description: "Document has been saved successfully.",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorDetails = {
        message: errorMessage,
        name: error instanceof Error ? error.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      };
      console.error("[builder] Save to Vault unexpected error", errorDetails);
      
      const isAuthError = errorMessage.includes("Authentication required") || 
                         errorMessage.includes("401") || 
                         errorMessage.includes("403");
      
      if (isAuthError) {
        toast({
          title: "Session expired",
          description: "Please sign in again to continue.",
          variant: "destructive",
        });
      } else {
        const status = errorMessage.includes("401") ? 401 : errorMessage.includes("403") ? 403 : 500;
        handleApiError({
          status,
          errorMessage,
          toast,
          context: "builder",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToDrafts = async () => {
    // Save to Drafts is the same as Save to Vault, but we can add a draft flag if needed
    // For now, it's the same operation
    await handleSaveToVault();
  };

  const handleAnalyze = async () => {
    if (!generatedContent.trim()) {
      setError("Please generate document content first.");
      return;
    }

    if (analyzingRef.current) {
      return;
    }

    setAnalyzeError(null);
    setAnalyzeResult(null);
    setAnalyzing(true);
    analyzingRef.current = true;

    try {
      const payload = {
        itemId: savedDocumentId || "builder-draft",
        title: documentTitle.trim() || selectedTemplate?.name || "Untitled Document",
        snippet: generatedContent.slice(0, 500) + (generatedContent.length > 500 ? "..." : ""),
        metadata: {
          source: "builder",
          kind: "text/plain",
          template: selectedTemplate?.name,
        },
      };
      const res = await analyzeItem(payload);
      setAnalyzeResult(res);
      toast({
        title: "Analyze complete",
        description: "Document analysis finished successfully.",
      });
    } catch (err) {
      const errorMessage = (err as Error).message ?? "Analyze failed";
      setAnalyzeError(errorMessage);
      
      const status = errorMessage.includes("401") ? 401 : errorMessage.includes("403") ? 403 : 500;
      handleApiError({
        status,
        errorMessage,
        toast,
        context: "builder",
      });
    } finally {
      setAnalyzing(false);
      analyzingRef.current = false;
    }
  };

  const handleSendForSignature = async () => {
    if (!recipientEmail || !recipientName) {
      toast({
        title: "Missing information",
        description: "Please fill in recipient name and email",
        variant: "destructive",
      });
      return;
    }

    if (!savedDocumentId) {
      toast({
        title: "Document not saved",
        description: "Please save the document to Vault first before sending for signature.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const response = await fetch("/api/sign/documenso", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: savedDocumentId,
          recipient: {
            email: recipientEmail,
            name: recipientName,
          },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        let data: { ok?: boolean; error?: string; envelopeId?: string } = {};
        try {
          data = await response.json();
        } catch {
          // Ignore JSON parse errors
        }
        
        const errorMessage = data.error ?? "Failed to send for signature";
        
        handleApiError({
          status,
          errorMessage,
          toast,
          context: "builder",
        });
        return;
      }

      const data = (await response.json()) as { ok: boolean; error?: string; envelopeId?: string };

      if (!data.ok) {
        const errorMessage = data.error ?? "Failed to send for signature";
        handleApiError({
          status: 500,
          errorMessage,
          toast,
          context: "builder",
        });
        return;
      }

      toast({
        title: "Document sent for signature",
        description: "Document has been sent successfully.",
      });
      setSignModalOpen(false);
      setRecipientName("");
      setRecipientEmail("");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[builder] Send for signature unexpected error", {
        message: errorMessage,
        name: error instanceof Error ? error.name : typeof error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      const status = errorMessage.includes("401") ? 401 : errorMessage.includes("403") ? 403 : 500;
      handleApiError({
        status,
        errorMessage,
        toast,
        context: "builder",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Templates */}
      <div className="w-80 border-r bg-sidebar overflow-auto">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Templates</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/activity")}
                className="text-xs"
              >
                View activity
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/builder/draft")}
                className="text-xs"
              >
                <FolderOpen className="h-3 w-3 mr-1" />
                View Drafts
              </Button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-4 space-y-6">
            {groupedTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchQuery ? "No templates found matching your search." : "No templates available."}
              </div>
            ) : (
              groupedTemplates.map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    {category}
                  </h3>
                  <div className="space-y-1">
                    {categoryTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setSelectedTemplateId(template.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedTemplateId === template.id
                            ? "bg-sidebar-active text-primary"
                            : "hover:bg-sidebar-active/50"
                        }`}
                      >
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {template.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Builder Interface */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedTemplate ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md space-y-4">
              <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold mb-2">Start Building</h2>
                <p className="text-muted-foreground">
                  Select a template from the sidebar to begin creating your document.
                  Mono will help you draft, review, and refine the content.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-mono" />
                <span>AI-assisted document generation</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Header Bar */}
            <div className="border-b p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplateId("")}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <div>
                    <Badge variant="outline">{selectedTemplate.name}</Badge>
                    <h1 className="text-2xl font-bold mt-2">New Document</h1>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => router.push("/builder/draft")}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    View Drafts
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyze}
                    disabled={analyzing || !generatedContent.trim()}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    {analyzing ? "Analyzing..." : "Analyze"}
                  </Button>
                  <Button variant="outline" size="sm" disabled={!generatedContent.trim()}>
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveToDrafts}
                    disabled={saving || !generatedContent.trim()}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setSignModalOpen(true)}
                    disabled={!generatedContent.trim() || !savedDocumentId}
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Send for Signature
                  </Button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {error && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {savedDocumentId && (
                  <div className="rounded-md border border-green-500/40 bg-green-500/5 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                    ✓ Saved to Vault (document ID: {savedDocumentId})
                  </div>
                )}

                {/* AI-Assisted Generation */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-mono" />
                          AI-Assisted Generation
                        </CardTitle>
                        <CardDescription>
                          Describe what you need and Mono will draft the document for you
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-4 w-4 text-mono" />
                        <span>Ask Mono about building</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Step 2: Clauses */}
                    {safeClauses.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Clauses (optional)</label>
                        <ScrollArea className="h-32 rounded-md border p-2 bg-muted/40">
                          <div className="space-y-1">
                            {safeClauses.map((c) => (
                              <label
                                key={c.id}
                                className="flex items-start gap-2 text-xs cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5"
                                  checked={selectedClauseIds.includes(c.id)}
                                  onChange={() => toggleClause(c.id)}
                                />
                                <span>
                                  <span className="font-medium">{c.name}</span>
                                  {c.category && (
                                    <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                                      ({c.category})
                                    </span>
                                  )}
                                </span>
                              </label>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Step 3: Instructions */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Instructions / Scenario</label>
                      <Textarea
                        placeholder="Example: Create an NDA between Acme Corp and my company for a partnership discussion about cloud infrastructure. Standard terms, mutual confidentiality, 2 year duration."
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="min-h-[120px]"
                      />
                    </div>

                    <Button
                      onClick={handleGenerate}
                      disabled={loading}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {loading ? "Generating..." : "Generate Document"}
                    </Button>
                  </CardContent>
                </Card>

                {/* Document Content */}
                <Card>
                  <CardHeader>
                    <CardTitle>Document Content</CardTitle>
                    <CardDescription>
                      Edit and refine your document
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Document Title
                      </label>
                      <Input
                        placeholder="Enter document title..."
                        value={documentTitle}
                        onChange={(e) => setDocumentTitle(e.target.value)}
                      />
                    </div>

                    <Tabs defaultValue="editor" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="editor">Editor</TabsTrigger>
                        <TabsTrigger value="preview">Preview</TabsTrigger>
                      </TabsList>
                      <TabsContent value="editor" className="space-y-4">
                        <Textarea
                          className="w-full min-h-[400px] font-mono text-sm"
                          placeholder="Version 1 content will appear here after generation. You can edit it before saving."
                          value={generatedContent}
                          onChange={(e) => setGeneratedContent(e.target.value)}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {savedDocumentId
                              ? "Saved to Vault. You can generate again to create a new version."
                              : "Edit the content above, then save to Vault."}
                          </p>
                          <Button
                            onClick={handleSaveToVault}
                            disabled={saving || !generatedContent.trim()}
                          >
                            {saving ? "Saving..." : "Save to Vault"}
                          </Button>
                        </div>
                      </TabsContent>
                      <TabsContent value="preview">
                        <div className="border rounded-lg p-8 bg-background min-h-[400px]">
                          {generatedContent ? (
                            <div className="prose max-w-none whitespace-pre-wrap">
                              {generatedContent}
                            </div>
                          ) : (
                            <p className="text-muted-foreground italic text-center py-20">
                              Preview will appear here after generation...
                            </p>
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>

                {/* Analyze Results */}
                {(analyzeResult || analyzeError) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-mono" />
                        Analysis Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analyzeError && (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive mb-4">
                          AI error: {analyzeError}
                        </div>
                      )}
                      {analyzeResult && (
                        <div className="space-y-4">
                          {analyzeResult.summary && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Summary</h4>
                              <p className="text-sm text-muted-foreground">{analyzeResult.summary}</p>
                            </div>
                          )}
                          {analyzeResult.entities && analyzeResult.entities.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Key Entities</h4>
                              <div className="flex flex-wrap gap-2">
                                {analyzeResult.entities.map((entity, i) => (
                                  <Badge key={i} variant="secondary">
                                    {entity.label}: {entity.value}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {analyzeResult.dates && analyzeResult.dates.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Important Dates</h4>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {analyzeResult.dates.map((date, i) => (
                                  <li key={i}>{date}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {analyzeResult.nextAction && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Suggested Next Action</h4>
                              <p className="text-sm text-muted-foreground">{analyzeResult.nextAction}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Quick Actions */}
                {generatedContent.trim() && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      <Button variant="outline" className="justify-start">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Review & Tighten Language
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Add Missing Clauses
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Check for Legal Issues
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Sparkles className="h-4 w-4 mr-2" />
                        Simplify Complex Terms
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Send for Signature Modal */}
      <Dialog open={signModalOpen} onOpenChange={setSignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send for Signature</DialogTitle>
            <DialogDescription>
              Send this document to a recipient for electronic signature via Documenso
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipientName">Recipient Name</Label>
              <Input
                id="recipientName"
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="john@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSignModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendForSignature} disabled={sending || !recipientName || !recipientEmail}>
              {sending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
