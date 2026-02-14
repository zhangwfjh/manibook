"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Document, formatFileSize, getFormatIcon } from "@/lib/library";

interface DialogFileInfoProps {
  document: Document;
}

export function FileInfo({ document }: DialogFileInfoProps) {
  const t = useTranslations("detailSections");
  const { metadata } = document;

  return (
    <Card className="max-w-full">
      <CardContent>
        <Label className="text-sm font-medium text-muted-foreground">
          {t("fileInfo.title")}
        </Label>
        <Table className="mt-3 max-w-full">
          <TableBody>
            <TableRow>
              <TableCell className="w-1/6 min-w-24 font-medium">
                {t("fileInfo.filename")}
              </TableCell>
              <TableCell className="max-w-0">
                {document.url.split("/").pop()}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="w-1/6 min-w-24 font-medium">
                {t("fileInfo.filePath")}
              </TableCell>
              <TableCell className="max-w-0">{document.url}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="w-1/6 min-w-24 font-medium">
                {t("fileInfo.fileSize")}
              </TableCell>
              <TableCell className="max-w-0">
                <div className="flex items-center gap-2">
                  {metadata.filesize && metadata.filetype && (
                    <>
                      <Tooltip>
                        <TooltipTrigger>
                          {React.createElement(
                            getFormatIcon(metadata.filetype),
                            {
                              className: "h-4 w-4 text-muted-foreground",
                            },
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("fileInfo.fileFormat", { format: metadata.filetype?.toUpperCase() })}
                        </TooltipContent>
                      </Tooltip>
                      <span>{formatFileSize(metadata.filesize)}</span>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="w-1/6 min-w-24 font-medium">
                {t("fileInfo.format")}
              </TableCell>
              <TableCell className="max-w-0">
                <div className="flex items-center gap-2">
                  {metadata.filetype && (
                    <>
                      <Tooltip>
                        <TooltipTrigger>
                          {React.createElement(
                            getFormatIcon(metadata.filetype),
                            {
                              className: "h-4 w-4 text-muted-foreground",
                            },
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("fileInfo.fileFormat", { format: metadata.filetype?.toUpperCase() })}
                        </TooltipContent>
                      </Tooltip>
                      <span className="uppercase">{metadata.filetype}</span>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
