"use client";

import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { PlusIcon, TrashIcon, UploadIcon } from "lucide-react";

interface LLMProvider {
  name: string;
  type: "OpenAI" | "Ollama";
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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [settings, setSettings] = useState<LLMSettings>(emptySettings);

  useEffect(() => {
    if (open) {
      const loadSettings = async () => {
        try {
          const data = await invoke<LLMSettings>("get_llm_settings");
          setSettings(data);
        } catch (error) {
          console.error("Error loading settings:", error);
          setSettings(emptySettings);
        }
      };
      loadSettings();
    }
  }, [open]);

  const handleSave = async () => {
    try {
      await invoke("set_llm_settings", { settings });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Error saving settings");
    }
  };

  const handleImport = async () => {
    try {
      const filePath = await openDialog({
        multiple: false,
        filters: [
          {
            name: "JSON",
            extensions: ["json"],
          },
        ],
      });

      if (!filePath) return;

      await invoke("import_llm_settings", { filePath });
      const data = await invoke<LLMSettings>("get_llm_settings");
      setSettings(data);
    } catch (error) {
      console.error("Error importing settings:", error);
      alert("Error importing settings");
    }
  };

  const addProvider = (type: "OpenAI" | "Ollama") => {
    const newProvider: LLMProvider = {
      name: `New ${type} Provider`,
      type,
      model: "",
      baseURL: "",
      apiKey: "",
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
        p.name === name ? { ...p, ...updates } : p,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Button onClick={() => addProvider("OpenAI")} size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add OpenAI
              </Button>
              <Button
                onClick={() => addProvider("Ollama")}
                size="sm"
                variant="outline"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Ollama
              </Button>
            </div>

            <div className="space-y-4">
              {settings.providers.map((provider, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {provider.name}
                        <Badge
                          variant={
                            provider.type === "OpenAI" ? "default" : "secondary"
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
                      {provider.type === "OpenAI" && (
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
          <Button variant="outline" onClick={handleImport}>
            <UploadIcon className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
