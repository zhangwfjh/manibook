"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  EyeIcon,
  FileTextIcon,
  PlusIcon,
  TrashIcon,
  PaletteIcon,
  GlobeIcon,
  SparklesIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import type { LLMSettings, Jobs } from "@/lib/llm-types";
import {
  listProviders,
  supportsVision,
  supportsText,
  formatContext,
} from "@/lib/models-dev";
import type { ModelsDevProvider, ModelsDevModel } from "@/lib/models-dev";
import { useTheme, COLOR_THEMES, MODE_THEMES, type ColorTheme, type ThemeMode } from "@/lib/theme";

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
  const [activeTab, setActiveTab] = useState("appearance");
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
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
    if (expandedProvider === providerId) {
      setExpandedProvider(null);
    }
  };

  const addNewProvider = () => {
    if (!selectedNewProvider) return;
    setApiKey(selectedNewProvider, "");
    setSelectedNewProvider("");
    setShowAddProvider(false);
    setExpandedProvider(selectedNewProvider);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-10">
            <TabsTrigger value="appearance" className="gap-2">
              <PaletteIcon className="h-4 w-4" />
              {t("appearance")}
            </TabsTrigger>
            <TabsTrigger value="model" className="gap-2">
              <SparklesIcon className="h-4 w-4" />
              {t("model")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="mt-6">
            <AppearanceSettings t={t} />
          </TabsContent>

          <TabsContent value="model" className="mt-6 space-y-6">
            {/* API Keys */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">{t("models")}</h3>
                {unconfiguredProviders.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setShowAddProvider(!showAddProvider)}
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    {t("add")}
                  </Button>
                )}
              </div>

              {showAddProvider && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed bg-muted/30">
                  <Select value={selectedNewProvider} onValueChange={setSelectedNewProvider}>
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder={t("addNewProvider")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {unconfiguredProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <span>{provider.name}</span>
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            {Object.keys(provider.models).length}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8" onClick={addNewProvider} disabled={!selectedNewProvider}>
                    {t("add")}
                  </Button>
                </div>
              )}

              {configuredProviders.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {t("noProvidersConfigured")}
                </div>
              ) : (
                <div className="space-y-2">
                  {configuredProviders.map((provider) => (
                    <div key={provider.id} className="rounded-lg border">
                      <button
                        type="button"
                        className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedProvider(expandedProvider === provider.id ? null : provider.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">{provider.name}</span>
                          {settings.api_keys[provider.id] && (
                            <Badge variant="secondary" className="text-[10px]">
                              {t("configured")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {Object.keys(provider.models).length} {t("modelsLabel")}
                          </span>
                          <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform ${expandedProvider === provider.id ? "rotate-180" : ""}`} />
                        </div>
                      </button>
                      {expandedProvider === provider.id && (
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                          <Input
                            type="password"
                            value={settings.api_keys[provider.id] || ""}
                            onChange={(e) => setApiKey(provider.id, e.target.value)}
                            placeholder={t("apiKeyPlaceholder", { provider: provider.name })}
                            className="h-8 text-sm"
                          />
                          <div className="flex items-center justify-between">
                            {provider.doc && (
                              <a
                                href={provider.doc}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-primary hover:underline"
                              >
                                {t("docs")}
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={() => removeApiKey(provider.id)}
                            >
                              <TrashIcon className="h-3 w-3 mr-1" />
                              {t("remove")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task Assignment */}
            {configuredProviders.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">{t("taskAssignment")}</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-[auto_1fr] items-start gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground mt-2">
                        <FileTextIcon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{t("metadataExtraction")}</label>
                        <Select
                          value={settings.jobs.metadata_extraction}
                          onValueChange={(value) => updateJob("metadata_extraction", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectModel")} />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {getTextModels().map(({ provider, model }) => (
                              <SelectItem key={`${provider.id}/${model.id}`} value={`${provider.id}/${model.id}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs">{provider.name}</span>
                                  <span>/</span>
                                  <span>{model.name}</span>
                                  {model.limit && (
                                    <Badge variant="outline" className="text-[10px] ml-auto">
                                      {formatContext(model.limit)}
                                    </Badge>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-[auto_1fr] items-start gap-4">
                      <div className="flex items-center gap-2 text-muted-foreground mt-2">
                        <EyeIcon className="h-4 w-4" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">{t("imageTextExtraction")}</label>
                        <Select
                          value={settings.jobs.image_text_extraction}
                          onValueChange={(value) => updateJob("image_text_extraction", value)}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectVisionModel")} />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {getVisionModels().map(({ provider, model }) => (
                              <SelectItem key={`${provider.id}/${model.id}`} value={`${provider.id}/${model.id}`}>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs">{provider.name}</span>
                                  <span>/</span>
                                  <span>{model.name}</span>
                                  <Badge variant="outline" className="text-[10px]">{t("vision")}</Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleImport}>
            {t("import")}
          </Button>
          <Button onClick={handleSave}>{t("saveSettings")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const LOCALES = [
  { value: "en", label: "English" },
  { value: "zh-CN", label: "中文" },
] as const;

function AppearanceSettings({ t }: { t: (key: string, params?: Record<string, string | number>) => string }) {
  const { mode, colorTheme, setFullTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleModeChange = (newMode: ThemeMode) => {
    if (colorTheme) {
      setFullTheme(`${newMode}-${colorTheme}`);
    }
  };

  const handleColorChange = (newColor: ColorTheme) => {
    if (mode) {
      setFullTheme(`${mode}-${newColor}`);
    }
  };

  const handleLocaleChange = (newLocale: string) => {
    localStorage.setItem("locale", newLocale);
    router.replace(pathname, { locale: newLocale });
  };

  const getColorSwatch = (color: string) => {
    const colors: Record<string, string> = {
      slate: "bg-slate-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      purple: "bg-purple-500",
      rose: "bg-rose-500",
      orange: "bg-orange-500",
    };
    return colors[color] || "bg-slate-500";
  };

  const getModeIcon = (m: string) => {
    switch (m) {
      case "light": return <SunIcon className="h-4 w-4" />;
      case "dark": return <MoonIcon className="h-4 w-4" />;
      default: return <MonitorIcon className="h-4 w-4" />;
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-8 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-20 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Theme Mode */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t("themeMode")}</label>
        <div className="flex gap-2">
          {MODE_THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => handleModeChange(theme.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                (mode || "system") === theme.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-transparent hover:border-muted-foreground/30"
              )}
            >
              {getModeIcon(theme.value)}
              <span>{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Theme */}
      <div className="space-y-3">
        <label className="text-sm font-medium">{t("colorTheme")}</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => handleColorChange(theme.value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all",
                colorTheme === theme.value
                  ? "border-primary bg-primary/5"
                  : "border-transparent hover:border-muted-foreground/30 bg-muted/50"
              )}
            >
              <div className={cn("h-4 w-4 rounded-full", getColorSwatch(theme.value))} />
              <span className="text-sm">{theme.label}</span>
              {colorTheme === theme.value && (
                <CheckIcon className="h-3 w-3 text-primary" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="space-y-3">
        <label className="text-sm font-medium flex items-center gap-2">
          <GlobeIcon className="h-4 w-4" />
          {t("language")}
        </label>
        <div className="flex gap-2">
          {LOCALES.map((loc) => (
            <button
              key={loc.value}
              type="button"
              onClick={() => handleLocaleChange(loc.value)}
              className={cn(
                "px-4 py-2 rounded-lg border transition-all",
                locale === loc.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/50 border-transparent hover:border-muted-foreground/30"
              )}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
