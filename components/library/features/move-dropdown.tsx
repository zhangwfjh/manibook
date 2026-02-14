"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoveIcon } from "lucide-react";
import { DOCTYPE_OPTION_KEYS } from "@/components/library/types";

interface BulkMoveDropdownProps {
  onBulkMove: (doctype: string, category: string) => void;
}

export function BulkMoveDropdown({ onBulkMove }: BulkMoveDropdownProps) {
  const t = useTranslations("features.moveDropdown");
  const tCommon = useTranslations("common");
  const [selectedDoctype, setSelectedDoctype] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const doctypes = DOCTYPE_OPTION_KEYS.map(opt => ({
    value: opt.value,
    label: tCommon(opt.labelKey.replace("common.", ""))
  }));

  const handleApply = () => {
    const category = selectedMainCategory
      ? selectedSubCategory
        ? `${selectedMainCategory} > ${selectedSubCategory}`
        : selectedMainCategory
      : "";

    if (selectedDoctype || category) {
      onBulkMove(selectedDoctype || "", category || "");
      setSelectedDoctype("");
      setSelectedMainCategory("");
      setSelectedSubCategory("");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoveIcon className="h-4 w-4 mr-2" />
          {t("move")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4">
        <DropdownMenuLabel>{t("moveDocuments")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-4">
          <div>
            <Label htmlFor="doctype" className="text-sm font-medium">
              {t("documentType")}
            </Label>
            <Select value={selectedDoctype} onValueChange={setSelectedDoctype}>
              <SelectTrigger id="doctype" className="w-full mt-1">
                <SelectValue placeholder={t("selectDoctype")} />
              </SelectTrigger>
              <SelectContent>
                {doctypes.map((doctype) => (
                  <SelectItem key={doctype.value} value={doctype.value}>
                    {doctype.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("category")}</Label>

            <div>
              <Label
                htmlFor="main-category"
                className="text-xs text-muted-foreground"
              >
                {t("mainCategory")}
              </Label>
              <Input
                id="main-category"
                value={selectedMainCategory}
                onChange={(e) => setSelectedMainCategory(e.target.value)}
                placeholder={t("enterMainCategory")}
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="sub-category"
                className="text-xs text-muted-foreground"
              >
                {t("subCategory")}
              </Label>
              <Input
                id="sub-category"
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                placeholder={t("enterSubCategory")}
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleApply}
            disabled={!selectedDoctype && !selectedMainCategory}
            className="w-full"
          >
            {t("applyChanges")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
