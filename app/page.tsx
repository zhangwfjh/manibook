import { ModeToggle } from "@/components/theme-toggle";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <div className="absolute right-4 top-4">
        <ModeToggle />
      </div>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Welcome to shagent</EmptyTitle>
          <EmptyDescription>
            This is Shaun&#39;s personal AI assistant.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}
