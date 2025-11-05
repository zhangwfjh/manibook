import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { DockMenu } from "@/components/dock-menu";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Welcome to Shagent</EmptyTitle>
          <EmptyDescription>
            This is Shaun&#39;s personal AI assistant.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
      <DockMenu />
    </div>
  );
}
