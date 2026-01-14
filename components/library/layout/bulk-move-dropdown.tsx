import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoveIcon } from "lucide-react";

interface BulkMoveDropdownProps {
  selectedCount: number;
  onBulkMove: (doctype: string, category: string) => void;
}

export function BulkMoveDropdown({
  selectedCount,
  onBulkMove,
}: BulkMoveDropdownProps) {
  const [selectedDoctype, setSelectedDoctype] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  // Fixed doctype options
  const doctypes = ["Book", "Paper", "Report", "Manual", "Others"];

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
          Move ({selectedCount})
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-4">
        <DropdownMenuLabel>Move Documents</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="space-y-4">
          <div>
            <Label htmlFor="doctype" className="text-sm font-medium">
              Document Type
            </Label>
            <select
              id="doctype"
              value={selectedDoctype}
              onChange={(e) => setSelectedDoctype(e.target.value)}
              className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="">Select doctype...</option>
              {doctypes.map((doctype) => (
                <option key={doctype} value={doctype}>
                  {doctype}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Category</Label>

            <div>
              <Label
                htmlFor="main-category"
                className="text-xs text-muted-foreground"
              >
                Main Category
              </Label>
              <Input
                id="main-category"
                value={selectedMainCategory}
                onChange={(e) => setSelectedMainCategory(e.target.value)}
                placeholder="Enter main category..."
                className="mt-1"
              />
            </div>

            <div>
              <Label
                htmlFor="sub-category"
                className="text-xs text-muted-foreground"
              >
                Sub Category
              </Label>
              <Input
                id="sub-category"
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                placeholder="Enter subcategory..."
                className="mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleApply}
            disabled={!selectedDoctype && !selectedMainCategory}
            className="w-full"
          >
            Apply Changes
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
