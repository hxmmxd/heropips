import { Skeleton } from "@heropips/ui";

export default function ChatLoading() {
  return (
    <div className="ap-panel ap-chat" aria-busy="true" aria-label="Loading chat" role="status">
      <div className="ap-panel-head">
        <Skeleton style={{ width: 150, height: 18 }} />
      </div>
      <div className="ap-chat-scroll">
        <Skeleton style={{ width: "55%", height: 44, alignSelf: "flex-start" }} />
        <Skeleton style={{ width: "40%", height: 44, alignSelf: "flex-end" }} />
        <Skeleton style={{ width: "60%", height: 44, alignSelf: "flex-start" }} />
        <Skeleton style={{ width: "35%", height: 44, alignSelf: "flex-end" }} />
      </div>
      <div className="ap-chat-composer">
        <Skeleton style={{ height: 44, flex: 1 }} />
        <Skeleton style={{ width: 90, height: 44, borderRadius: "var(--r-full)" }} />
      </div>
    </div>
  );
}
