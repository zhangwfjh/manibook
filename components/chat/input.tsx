"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Send, Paperclip } from "lucide-react";
import { useRef } from "react";

const BadgeButton = () => (
  <InputGroupButton
    variant="secondary"
    size="xs"
    onClick={() => {
      // if (fileInputRef.current) {
      //   fileInputRef.current.click();
      // }
    }}
  >
    <Paperclip className="h-4 w-4" />
  </InputGroupButton>
);

export default function Input() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files: FileList | null = event.target.files;
    if (files && files.length > 0) {
      event.target.value = "";
    }
  };

  return (
    <InputGroup>
      <div className="block-start flex pl-1">
        abc
        <BadgeButton />
      </div>
      <InputGroupTextarea placeholder="Ask, Search or Chat..." />
      <InputGroupAddon align="block-end" className="justify-between">
        <InputGroupButton
          variant="outline"
          className="rounded-full"
          size="icon-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip />
        </InputGroupButton>
        <InputGroupButton
          variant="default"
          className="rounded-full"
          size="icon-xs"
        >
          <Send />
        </InputGroupButton>
      </InputGroupAddon>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv,.md,.json,.yaml,.yml"
        title="Upload documents"
      />
    </InputGroup>
  );
}
