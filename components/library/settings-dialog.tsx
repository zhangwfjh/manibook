"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SettingsIcon, PlusIcon, TrashIcon } from "lucide-react";

interface LLMProvider {
  name: string;
  type: "openai-compatible" | "ollama";
  model: string;
  baseURL: string;
  apiKey?: string;
}

interface LLMSettings {
  providers: LLMProvider[];
  jobs: {
    metadataExtraction: string; // provider name
    imageTextExtraction: string; // provider name
  };
}

const emptySettings: LLMSettings = {
  providers: [],
  jobs: {
    metadataExtraction: "",
    imageTextExtraction: "",
  },
};

export function SettingsDialog() {
  const [settings, setSettings] = useState<LLMSettings>(emptySettings);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/llm-settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        console.error("Failed to load settings");
        setSettings(emptySettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setSettings(emptySettings);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/llm-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setOpen(false);
      } else {
        console.error("Failed to save settings");
        alert("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  const addProvider = (type: "openai-compatible" | "ollama") => {
    const newProvider: LLMProvider = {
      name: `New ${
        type === "openai-compatible" ? "OpenAI-Compatible" : "Ollama"
      } Provider`,
      type,
      model: "",
      baseURL: "",
      apiKey: type === "openai-compatible" ? "" : undefined,
    };
    setSettings((prev) => ({
      ...prev,
      providers: [...prev.providers, newProvider],
    }));
  };

  const updateProvider = (name: string, updates: Partial<LLMProvider>) => {
    setSettings((prev) => ({
      ...prev,
      providers: prev.providers.map((p) =>
        p.name === name ? { ...p, ...updates } : p
      ),
    }));
  };

  const deleteProvider = (name: string) => {
    setSettings((prev) => ({
      ...prev,
      providers: prev.providers.filter((p) => p.name !== name),
      jobs: {
        metadataExtraction:
          prev.jobs.metadataExtraction === name
            ? ""
            : prev.jobs.metadataExtraction,
        imageTextExtraction:
          prev.jobs.imageTextExtraction === name
            ? ""
            : prev.jobs.imageTextExtraction,
      },
    }));
  };

  const updateJob = (job: keyof LLMSettings["jobs"], providerName: string) => {
    setSettings((prev) => ({
      ...prev,
      jobs: {
        ...prev.jobs,
        [job]: providerName,
      },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SettingsIcon className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-175 max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LLM Configuration</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="providers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="jobs">Job Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            <div className="flex gap-2">
              <Button
                onClick={() => addProvider("openai-compatible")}
                size="sm"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add OpenAI-Compatible
              </Button>
              <Button
                onClick={() => addProvider("ollama")}
                size="sm"
                variant="outline"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Ollama
              </Button>
            </div>

            <div className="space-y-4">
              {settings.providers.map((provider) => (
                <Card key={provider.name}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {provider.name}
                        <Badge
                          variant={
                            provider.type === "openai-compatible"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {provider.type}
                        </Badge>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProvider(provider.name)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={provider.name}
                          onChange={(e) =>
                            updateProvider(provider.name, {
                              name: e.target.value,
                            })
                          }
                          placeholder="Provider name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Model</Label>
                        <Input
                          value={provider.model}
                          onChange={(e) =>
                            updateProvider(provider.name, {
                              model: e.target.value,
                            })
                          }
                          placeholder="Model name"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Base URL</Label>
                        <Input
                          value={provider.baseURL}
                          onChange={(e) =>
                            updateProvider(provider.name, {
                              baseURL: e.target.value,
                            })
                          }
                          placeholder="Base URL"
                        />
                      </div>
                      {provider.type === "openai-compatible" && (
                        <div className="space-y-1">
                          <Label className="text-xs">API Key</Label>
                          <Input
                            type="password"
                            value={provider.apiKey || ""}
                            onChange={(e) =>
                              updateProvider(provider.name, {
                                apiKey: e.target.value,
                              })
                            }
                            placeholder="API Key"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Metadata Extraction</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={settings.jobs.metadataExtraction}
                    onValueChange={(value) =>
                      updateJob("metadataExtraction", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider for metadata extraction" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.providers.map((provider) => (
                        <SelectItem key={provider.name} value={provider.name}>
                          {provider.name} ({provider.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for extracting document metadata (title, authors,
                    categories, etc.)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Image Text Extraction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={settings.jobs.imageTextExtraction}
                    onValueChange={(value) =>
                      updateJob("imageTextExtraction", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider for image text extraction" />
                    </SelectTrigger>
                    <SelectContent>
                      {settings.providers.map((provider) => (
                        <SelectItem key={provider.name} value={provider.name}>
                          {provider.name} ({provider.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for extracting text from document cover images
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
