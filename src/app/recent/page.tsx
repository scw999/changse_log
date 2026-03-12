import { RecordExplorer } from "@/components/archive/record-explorer";
import { PageHeader } from "@/components/ui/page-header";

export default function RecentPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Inbox / Recent"
        title="최근 저장된 기록을 한 흐름으로 다시 훑어보기"
        description="가장 최근에 남긴 기록부터 오래된 기록까지 정렬하고, 태그·평점·중요도·지역 기준으로 빠르게 탐색할 수 있습니다."
      />
      <RecordExplorer
        emptyTitle="최근 기록이 아직 없습니다"
        emptyDescription="새 기록을 추가하면 여기에서 전체 아카이브 타임라인을 확인할 수 있습니다."
      />
    </div>
  );
}
