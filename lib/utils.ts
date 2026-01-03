import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import crypto from 'crypto'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function computeSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}
