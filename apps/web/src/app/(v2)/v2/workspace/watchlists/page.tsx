import { WorkspaceWatchlists } from "@/components/v2/workspace/workspace-panels";

export default function WatchlistsPage() {
  return (
    <div>
      <h1 className="type-h1">Watchlists</h1>
      <div className="mt-4">
        <WorkspaceWatchlists />
      </div>
    </div>
  );
}
