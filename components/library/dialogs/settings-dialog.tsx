"use client";

import { useState, useEffect, type ReactNode } from "react";
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
import {
  useTheme,
  COLOR_THEMES,
  MODE_THEMES,
  type ColorTheme,
  type ThemeMode,
} from "@/lib/theme";

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
  const [activeTab, setActiveTab] = useState("appearance");
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [selectedNewProvider, setSelectedNewProvider] = useState<string>("");

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
    try {
      const data = await listProviders();
      setProviders(data);
    } catch (error) {
      console.error("Error loading providers:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (open) {
        await loadSettings();
        await loadProviders();
      }
    };

    loadData();
  }, [open]);

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

  const configuredProviders = providers.filter((p) =>
    settings.api_keys.hasOwnProperty(p.id),
  );
  const unconfiguredProviders = providers.filter(
    (p) => !settings.api_keys.hasOwnProperty(p.id),
  );

  const getConfiguredModels = (): {
    provider: ModelsDevProvider;
    model: ModelsDevModel;
  }[] => {
    return configuredProviders.flatMap((provider) =>
      Object.values(provider.models).map((model) => ({ provider, model })),
    );
  };

  const getTextModels = () =>
    getConfiguredModels().filter(({ model }) => supportsText(model));
  const getVisionModels = () =>
    getConfiguredModels().filter(({ model }) => supportsVision(model));

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
                  <Select
                    value={selectedNewProvider}
                    onValueChange={setSelectedNewProvider}
                  >
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder={t("addNewProvider")} />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {unconfiguredProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <span>{provider.name}</span>
                          <Badge
                            variant="secondary"
                            className="ml-2 text-[10px]"
                          >
                            {Object.keys(provider.models).length}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={addNewProvider}
                    disabled={!selectedNewProvider}
                  >
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
                        onClick={() =>
                          setExpandedProvider(
                            expandedProvider === provider.id
                              ? null
                              : provider.id,
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-sm">
                            {provider.name}
                          </span>
                          {settings.api_keys[provider.id] && (
                            <Badge variant="secondary" className="text-[10px]">
                              {t("configured")}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {Object.keys(provider.models).length}{" "}
                            {t("modelsLabel")}
                          </span>
                          <ChevronDownIcon
                            className={`h-4 w-4 text-muted-foreground transition-transform ${expandedProvider === provider.id ? "rotate-180" : ""}`}
                          />
                        </div>
                      </button>
                      {expandedProvider === provider.id && (
                        <div className="px-3 pb-3 pt-0 space-y-3 border-t">
                          <Input
                            type="password"
                            value={settings.api_keys[provider.id] || ""}
                            onChange={(e) =>
                              setApiKey(provider.id, e.target.value)
                            }
                            placeholder={t("apiKeyPlaceholder", {
                              provider: provider.name,
                            })}
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
                        <label className="text-sm font-medium">
                          {t("metadataExtraction")}
                        </label>
                        <Select
                          value={settings.jobs.metadata_extraction}
                          onValueChange={(value) =>
                            updateJob("metadata_extraction", value)
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectModel")} />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {getTextModels().map(({ provider, model }) => (
                              <SelectItem
                                key={`${provider.id}/${model.id}`}
                                value={`${provider.id}/${model.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs">
                                    {provider.name}
                                  </span>
                                  <span>/</span>
                                  <span>{model.name}</span>
                                  {model.limit && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] ml-auto"
                                    >
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
                        <label className="text-sm font-medium">
                          {t("imageTextExtraction")}
                        </label>
                        <Select
                          value={settings.jobs.image_text_extraction}
                          onValueChange={(value) =>
                            updateJob("image_text_extraction", value)
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("selectVisionModel")} />
                          </SelectTrigger>
                          <SelectContent className="max-h-48">
                            {getVisionModels().map(({ provider, model }) => (
                              <SelectItem
                                key={`${provider.id}/${model.id}`}
                                value={`${provider.id}/${model.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground text-xs">
                                    {provider.name}
                                  </span>
                                  <span>/</span>
                                  <span>{model.name}</span>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {t("vision")}
                                  </Badge>
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

function AppearanceSettings({
  t,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { mode, colorTheme, setFullTheme } = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // Using setTimeout to push the state update to the next microtask
    // this avoids the "Calling setState synchronously within an effect" error
    const timer = setTimeout(() => setHasMounted(true), 0);
    return () => clearTimeout(timer);
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

  const getModeIcon = (m: string): ReactNode => {
    switch (m) {
      case "light":
        return <SunIcon className="h-4 w-4" />;
      case "dark":
        return <MoonIcon className="h-4 w-4" />;
      default:
        return <MonitorIcon className="h-4 w-4" />;
    }
  };

  if (!hasMounted) {
    return (
      <div className="space-y-8 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Theme Mode */}
      <section>
        <SectionHeader icon={<SunIcon className="h-3.5 w-3.5" />} label={t("themeMode")} />
        <div className="grid grid-cols-3 gap-2">
          {MODE_THEMES.map((theme) => {
            const selected = (mode || "system") === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                onClick={() => handleModeChange(theme.value)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex flex-col items-center gap-2 rounded-xl border p-3 outline-none transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/60",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {getModeIcon(theme.value)}
                </span>
                <span className="text-xs font-medium">{theme.label}</span>
                {selected && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Color Theme */}
      <section>
        <SectionHeader icon={<PaletteIcon className="h-3.5 w-3.5" />} label={t("colorTheme")} />
        <div className="grid grid-cols-2 gap-2.5">
          {COLOR_THEMES.map((theme) => {
            const selected = colorTheme === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                onClick={() => handleColorChange(theme.value)}
                aria-pressed={selected}
                className={cn(
                  "group relative flex flex-col gap-2 rounded-xl border p-2.5 text-left outline-none transition-colors",
                  selected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/60",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <ThemePreview value={theme.value} />
                <div className="px-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium leading-tight">{theme.label}</span>
                    {selected && (
                      <CheckIcon className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={3} />
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] leading-tight text-muted-foreground">
                    {theme.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Language */}
      <section>
        <SectionHeader icon={<GlobeIcon className="h-3.5 w-3.5" />} label={t("language")} />
        <div className="grid grid-cols-2 gap-2">
          {LOCALES.map((loc) => {
            const selected = locale === loc.value;
            return (
              <button
                key={loc.value}
                type="button"
                onClick={() => handleLocaleChange(loc.value)}
                aria-pressed={selected}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium outline-none transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/60",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                {loc.label}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* Editorial section divider — icon chip, label, trailing rule. */
function SectionHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/*
 * Live theme preview — a miniature app shell (sidebar + main + chart row)
 * rendered in BOTH light and dark, each half scoped with the theme's own
 * CSS variables via [data-color] + .dark. The preview is always faithful to
 * globals.css because it inherits the exact tokens the real UI uses.
 */
function ThemePreview({ value }: { value: ColorTheme }) {
  return (
    <div className="grid h-12 w-full grid-cols-2 overflow-hidden rounded-md ring-1 ring-inset ring-border/70">
      <ThemeShell value={value} dark={false} />
      <ThemeShell value={value} dark={true} />
    </div>
  );
}

/* One half of the split preview — scoped to a single theme + mode. */
function ThemeShell({ value, dark }: { value: ColorTheme; dark: boolean }) {
  return (
    <div
      data-color={value}
      className={cn(
        "flex h-full w-full overflow-hidden",
        dark && "dark",
      )}
    >
      {/* sidebar */}
      <div className="flex w-[28%] flex-col gap-1 bg-sidebar p-1.5">
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        <div className="mt-0.5 h-1 w-full rounded-full bg-sidebar-accent" />
        <div className="h-1 w-3/4 rounded-full bg-muted-foreground/40" />
        <div className="h-1 w-1/2 rounded-full bg-muted-foreground/25" />
      </div>
      {/* main */}
      <div className="flex flex-1 flex-col gap-1 bg-background p-1.5">
        <div className="h-2 w-full rounded-sm bg-primary" />
        <div className="flex gap-1">
          <div className="h-3 flex-1 rounded-sm border border-border bg-card" />
          <div className="h-3 flex-1 rounded-sm border border-border bg-card" />
        </div>
        <div className="mt-auto flex gap-0.5">
          <div className="h-1 flex-1 rounded-full bg-chart-1" />
          <div className="h-1 flex-1 rounded-full bg-chart-2" />
          <div className="h-1 flex-1 rounded-full bg-chart-3" />
        </div>
      </div>
    </div>
  );
}
