"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
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
import { UploadIcon, RefreshCwIcon, KeyIcon, EyeIcon, FileTextIcon, PlusIcon, TrashIcon } from "lucide-react";
import type { LLMSettings, Jobs } from "@/lib/llm-types";
import {
  listProviders,
  clearCache,
  supportsVision,
  supportsText,
  formatCost,
  formatContext,
} from "@/lib/models-dev";
import type { ModelsDevProvider, ModelsDevModel } from "@/lib/models-dev";

const emptySettings: LLMSettings = {
  api_keys: {},
  jobs: {
    metadata_extraction: "",
    image_text_extraction: "",
  },
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const t = useTranslations("dialogs.settings");
  const [settings, setSettings] = useState<LLMSettings>(emptySettings);
  const [providers, setProviders] = useState<ModelsDevProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("api-keys");
  const [selectedNewProvider, setSelectedNewProvider] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadSettings();
      loadProviders();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const data = await invoke<LLMSettings>("get_llm_settings");
      setSettings(data);
    } catch (error) {
      console.error("Error loading settings:", error);
      setSettings(emptySettings);
    }
  };

  const loadProviders = async () => {
    setLoading(true);
    try {
      const data = await listProviders();
      setProviders(data);
    } catch (error) {
      console.error("Error loading providers:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshModels = async () => {
    setLoading(true);
    try {
      clearCache();
      await loadProviders();
    } catch (error) {
      console.error("Error refreshing models:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await invoke("set_llm_settings", { settings });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      alert(`Error saving settings: ${error}`);
    }
  };

  const handleImport = async () => {
    try {
      const filePath = await openDialog({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!filePath) return;
      await invoke("import_llm_settings", { filePath });
      await loadSettings();
    } catch (error) {
      console.error("Error importing settings:", error);
      alert(`Error importing settings: ${error}`);
    }
  };

  const setApiKey = (providerId: string, key: string) => {
    setSettings((prev) => ({
      ...prev,
      api_keys: { ...prev.api_keys, [providerId]: key },
    }));
  };

  const removeApiKey = (providerId: string) => {
    setSettings((prev) => {
      const newKeys = { ...prev.api_keys };
      delete newKeys[providerId];
      return { ...prev, api_keys: newKeys };
    });
  };

  const addNewProvider = () => {
    if (!selectedNewProvider) return;
    setApiKey(selectedNewProvider, "");
    setSelectedNewProvider("");
  };

  const updateJob = (job: keyof Jobs, modelId: string) => {
    setSettings((prev) => ({
      ...prev,
      jobs: { ...prev.jobs, [job]: modelId },
    }));
  };

  const configuredProviders = providers.filter((p) => settings.api_keys.hasOwnProperty(p.id));
  const unconfiguredProviders = providers.filter((p) => !settings.api_keys.hasOwnProperty(p.id));

  const getConfiguredModels = (): { provider: ModelsDevProvider; model: ModelsDevModel }[] => {
    return configuredProviders.flatMap((provider) =>
      Object.values(provider.models).map((model) => ({ provider, model }))
    );
  };

  const getTextModels = () => getConfiguredModels().filter(({ model }) => supportsText(model));
  const getVisionModels = () => getConfiguredModels().filter(({ model }) => supportsVision(model));
  const hasApiKey = (providerId: string): boolean => !!settings.api_keys[providerId];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("title")}
            <Button variant="ghost" size="sm" onClick={refreshModels} disabled={loading}>
              <RefreshCwIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="api-keys" className="flex items-center gap-2">
              <KeyIcon className="h-4 w-4" />
              {t("apiKeys")} ({configuredProviders.length})
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <FileTextIcon className="h-4 w-4" />
              {t("jobs")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys" className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              {t("configureApiKeys")}
            </div>

            <div className="space-y-3">
              {configuredProviders.map((provider) => (
                <Card key={provider.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        {provider.name}
                        {hasApiKey(provider.id) && (
                          <Badge variant="default" className="text-xs">{t("configured")}</Badge>
                        )}
                      </CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => removeApiKey(provider.id)}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-xs">{t("apiKeyLabel", { env: provider.env[0] || "" })}</Label>
                      <Input
                        type="password"
                        value={settings.api_keys[provider.id] || ""}
                        onChange={(e) => setApiKey(provider.id, e.target.value)}
                        placeholder={t("apiKeyPlaceholder", { provider: provider.name })}
                      />
                      <div className="text-xs text-muted-foreground">
                        {t("modelsAvailable", { count: Object.keys(provider.models).length })}
                        {provider.doc && (
                          <a href={provider.doc} target="_blank" rel="noopener noreferrer" className="ml-2 underline">{t("docs")}</a>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {unconfiguredProviders.length > 0 && (
              <Card className="border-dashed">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Select value={selectedNewProvider} onValueChange={setSelectedNewProvider}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={t("addNewProvider")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {unconfiguredProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            <div className="flex items-center gap-2">
                              <span>{provider.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {t("modelsCount", { count: Object.keys(provider.models).length })}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={addNewProvider} disabled={!selectedNewProvider}>
                      <PlusIcon className="h-4 w-4 mr-1" /> {t("add")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {configuredProviders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t("noProvidersConfigured")}
              </div>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            {configuredProviders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t("configureProviderFirst")}
              </div>
            ) : (
              <>
                <div className="text-sm text-muted-foreground mb-4">
                  {t("selectModelsForTasks")}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileTextIcon className="h-4 w-4" /> {t("metadataExtraction")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={settings.jobs.metadata_extraction}
                      onValueChange={(value) => updateJob("metadata_extraction", value)}
                    >
                      <SelectTrigger><SelectValue placeholder={t("selectModelForMetadata")} /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {getTextModels().map(({ provider, model }) => (
                          <SelectItem key={`${provider.id}/${model.id}`} value={`${provider.id}/${model.id}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{provider.name}</span>
                              <span>/</span>
                              <span>{model.name}</span>
                              {model.limit && <Badge variant="outline" className="text-xs ml-2">{formatContext(model.limit)} {t("ctx")}</Badge>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {t("metadataExtractionDesc")}
                    </div>
                    {settings.jobs.metadata_extraction && (
                      <ModelInfo modelId={settings.jobs.metadata_extraction} providers={providers} hasApiKey={hasApiKey} t={t} />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <EyeIcon className="h-4 w-4" /> {t("imageTextExtraction")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Select
                      value={settings.jobs.image_text_extraction}
                      onValueChange={(value) => updateJob("image_text_extraction", value)}
                    >
                      <SelectTrigger><SelectValue placeholder={t("selectVisionModel")} /></SelectTrigger>
                      <SelectContent className="max-h-64">
                        {getVisionModels().map(({ provider, model }) => (
                          <SelectItem key={`${provider.id}/${model.id}`} value={`${provider.id}/${model.id}`}>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{provider.name}</span>
                              <span>/</span>
                              <span>{model.name}</span>
                              <Badge variant="outline" className="text-xs ml-2">{t("vision")}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      {t("imageTextExtractionDesc")}
                    </div>
                    {settings.jobs.image_text_extraction && (
                      <ModelInfo modelId={settings.jobs.image_text_extraction} providers={providers} hasApiKey={hasApiKey} t={t} />
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleImport}>
            <UploadIcon className="h-4 w-4 mr-2" /> {t("import")}
          </Button>
          <Button onClick={handleSave}>{t("saveSettings")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModelInfo({ modelId, providers, hasApiKey, t }: {
  modelId: string;
  providers: ModelsDevProvider[];
  hasApiKey: (providerId: string) => boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const slashIndex = modelId.indexOf("/");
  if (slashIndex === -1) {
    return <div className="text-xs text-destructive">{t("invalidModelId", { modelId })}</div>;
  }

  const providerId = modelId.slice(0, slashIndex);
  const modelKey = modelId.slice(slashIndex + 1);

  const provider = providers.find(p => p.id === providerId);
  const model = provider?.models[modelKey];

  if (!provider || !model) {
    return <div className="text-xs text-destructive">{t("modelNotFound", { modelId })}</div>;
  }

  const apiKeySet = hasApiKey(provider.id);

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {model.limit && <Badge variant="outline">{formatContext(model.limit)} {t("context")}</Badge>}
      {model.cost && <Badge variant="outline">{formatCost(model.cost)}</Badge>}
      {!apiKeySet && <Badge variant="destructive">{t("apiKeyNotSet", { provider: provider.name })}</Badge>}
    </div>
  );
}
