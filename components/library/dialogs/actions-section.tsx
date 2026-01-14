import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  TrashIcon,
  EditIcon,
  SaveIcon,
  XIcon,
  BookOpenIcon,
  RefreshCwIcon,
} from "lucide-react";


interface ActionsSectionProps {
  isEditing: boolean;
  isGenerating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onGenerateMetadata: () => void;
}

export function ActionsSection({
  isEditing,
  isGenerating,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  onOpen,
  onGenerateMetadata,
}: ActionsSectionProps) {
  const handleSave = useCallback(() => {
    onSave();
  }, [onSave]);

  return (
    <div className="flex justify-between items-center pt-4 border-t">
      <Button
        variant="destructive"
        onClick={onDelete}
        disabled={isEditing}
      >
        <TrashIcon className="h-4 w-4 mr-2" />
        Delete
      </Button>

      <div className="flex gap-2">
        {isEditing ? (
          <>
            <Button
              variant="outline"
              onClick={onGenerateMetadata}
              disabled={isGenerating}
            >
              <RefreshCwIcon
                className={`h-4 w-4 mr-2 ${
                  isGenerating ? "animate-spin" : ""
                }`}
              />
              Generate
            </Button>
            <Button variant="outline" onClick={onCancel}>
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <SaveIcon className="h-4 w-4 mr-2" />
              Save
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={onEdit}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button onClick={onOpen}>
              <BookOpenIcon className="h-4 w-4 mr-2" />
              Open
            </Button>
          </>
        )}
      </div>
    </div>
  );
}