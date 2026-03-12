"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImagePlus, Save, Trash2, Undo2, X } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { CATEGORY_META, REVISIT_LABELS } from "@/lib/archive/config";
import { useArchive } from "@/lib/archive/context";
import { ArchiveImage, ArchiveRecord, CategoryKey, RevisitIntent, SourceType } from "@/lib/archive/types";
import {
  cloneRecord,
  createActivityDetails,
  createContentDetails,
  createEmptyRecord,
  createPlaceDetails,
  createThoughtDetails,
  createWordDetails,
  normalizeTags,
} from "@/lib/archive/utils";

const ratingOptions = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];

export function AdminEditor() {
  const {
    records,
    isRemote,
    userEmail,
    upsertRecord,
    deleteRecord,
    resetRecords,
    uploadImages,
    updateImages,
    removeImage,
  } = useArchive();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ArchiveRecord>(() => createDraft("thoughts"));
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const selected = records.find((record) => record.id === selectedId);
    if (selected) {
      setDraft(cloneRecord(selected));
    }
  }, [records, selectedId]);

  function selectRecord(record: ArchiveRecord) {
    setSelectedId(record.id);
    setDraft(cloneRecord(record));
    setMessage("");
  }

  function createNew(category: CategoryKey = draft.category) {
    setSelectedId(null);
    setDraft(createDraft(category));
    setMessage("");
  }

  function updateDraft<Key extends keyof ArchiveRecord>(key: Key, value: ArchiveRecord[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function switchCategory(category: CategoryKey) {
    setDraft((current) => ({
      ...createDraft(category),
      id: current.id || crypto.randomUUID(),
      title: current.title,
      body: current.body,
      summary: current.summary,
      notes: current.notes,
      tags: current.tags,
      importance: current.importance,
      sourceType: current.sourceType,
      createdAt: current.createdAt,
      eventDate: current.eventDate,
      images: current.images ?? [],
    }));
  }

  async function saveDraft() {
    try {
      const next: ArchiveRecord = {
        ...draft,
        id: draft.id || crypto.randomUUID(),
        createdAt: draft.createdAt || new Date().toISOString(),
        eventDate: draft.eventDate || new Date().toISOString().slice(0, 10),
        tags: normalizeTags(draft.tags),
        images: draft.images ?? [],
      };

      await upsertRecord(next);
      setSelectedId(next.id);
      setDraft(cloneRecord(next));
      setMessage(isRemote ? "Supabase에 기록을 저장했습니다." : "로컬 저장소에 기록을 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기록 저장 중 오류가 발생했습니다.");
    }
  }

  async function deleteDraftRecord() {
    if (!draft.id) {
      createNew(draft.category);
      return;
    }

    if (!window.confirm("이 기록을 삭제할까요?")) {
      return;
    }

    try {
      await deleteRecord(draft.id);
      createNew(draft.category);
      setMessage("기록을 삭제했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "기록 삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setIsUploading(true);
    setMessage("");

    try {
      const recordId = draft.id || crypto.randomUUID();
      const nextDraft: ArchiveRecord = {
        ...draft,
        id: recordId,
        createdAt: draft.createdAt || new Date().toISOString(),
        eventDate: draft.eventDate || new Date().toISOString().slice(0, 10),
        images: draft.images ?? [],
      };

      await upsertRecord(nextDraft);
      const uploaded = await uploadImages(recordId, Array.from(files));

      setDraft((current) => ({
        ...current,
        id: recordId,
        images: [...(current.images ?? []), ...uploaded].sort((a, b) => a.sortOrder - b.sortOrder),
      }));
      setMessage(`${uploaded.length}개의 이미지를 업로드했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveImage(imageId: string) {
    if (!draft.id) {
      return;
    }

    try {
      await removeImage(draft.id, imageId);
      setDraft((current) => ({
        ...current,
        images: (current.images ?? []).filter((image) => image.id !== imageId),
      }));
      setMessage("이미지를 제거했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 제거 중 오류가 발생했습니다.");
    }
  }

  function updateImage(imageId: string, patch: Partial<ArchiveImage>) {
    setDraft((current) => ({
      ...current,
      images: (current.images ?? []).map((image) =>
        image.id === imageId ? { ...image, ...patch } : image,
      ),
    }));
  }

  function moveImage(imageId: string, direction: "left" | "right") {
    setDraft((current) => {
      const images = [...(current.images ?? [])];
      const index = images.findIndex((image) => image.id === imageId);

      if (index < 0) {
        return current;
      }

      const nextIndex = direction === "left" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= images.length) {
        return current;
      }

      const [target] = images.splice(index, 1);
      images.splice(nextIndex, 0, target);

      return {
        ...current,
        images: images.map((image, sortIndex) => ({ ...image, sortOrder: sortIndex })),
      };
    });
  }

  async function saveImages() {
    if (!draft.id || !draft.images) {
      return;
    }

    try {
      await updateImages(draft.id, draft.images);
      setMessage("이미지 메타데이터와 정렬 순서를 저장했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "이미지 정보 저장 중 오류가 발생했습니다.");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Admin / Record Editor"
        title="관리자 기록 편집기"
        description="개인 기록을 직접 편집하고, 이미지와 세부 메타데이터를 함께 관리합니다."
      >
        <div className="rounded-[28px] border border-white/80 bg-white/80 px-4 py-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Storage Mode</p>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            {isRemote
              ? "현재 로그인 계정의 Supabase 데이터를 편집 중입니다."
              : "현재는 로컬 모드입니다. 로그인하면 개인 Supabase 기록과 이미지를 편집합니다."}
          </p>
          {userEmail ? <p className="mt-2 text-xs text-stone-500">{userEmail}</p> : null}
        </div>
      </PageHeader>

      {message ? <div className="soft-panel px-4 py-4 text-sm text-stone-700">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[0.78fr_1.22fr]">
        <SectionCard
          title="기록 목록"
          description="기존 기록을 선택하거나 새 기록 초안을 시작하세요."
          action={
            <button
              type="button"
              onClick={() => createNew("thoughts")}
              className="rounded-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700"
            >
              새 기록
            </button>
          }
        >
          <div className="space-y-3">
            {records.map((record) => (
              <button
                key={record.id}
                type="button"
                onClick={() => selectRecord(record)}
                className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                  selectedId === record.id
                    ? "border-stone-900 bg-stone-900 text-white shadow-lg shadow-stone-900/10"
                    : "border-white/80 bg-white/80 text-stone-700 hover:bg-white"
                }`}
              >
                <p className="text-xs uppercase tracking-[0.28em] opacity-70">{record.subcategory}</p>
                <p className="mt-2 font-medium leading-6">{record.title}</p>
                <p className="mt-2 text-sm leading-6 opacity-80">{record.summary}</p>
              </button>
            ))}
          </div>

          {!isRemote ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void resetRecords()}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700"
              >
                <Undo2 className="h-4 w-4" />
                시드 데이터 복원
              </button>
            </div>
          ) : null}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard
            title={draft.id ? "기록 편집" : "새 기록"}
            description="공통 필드와 카테고리별 세부 필드를 채워 저장합니다."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="카테고리">
                <select
                  value={draft.category}
                  onChange={(event) => switchCategory(event.target.value as CategoryKey)}
                  className="field"
                >
                  {Object.entries(CATEGORY_META).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="세부 유형">
                <select
                  value={draft.subcategory}
                  onChange={(event) => updateDraft("subcategory", event.target.value)}
                  className="field"
                >
                  {CATEGORY_META[draft.category].subcategories.map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="제목" className="md:col-span-2">
                <input
                  value={draft.title}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  className="field"
                  placeholder="기록 제목"
                />
              </Field>

              <Field label="요약" className="md:col-span-2">
                <textarea
                  value={draft.summary}
                  onChange={(event) => updateDraft("summary", event.target.value)}
                  className="field min-h-24"
                  placeholder="한두 문장 요약"
                />
              </Field>

              <Field label="본문" className="md:col-span-2">
                <textarea
                  value={draft.body}
                  onChange={(event) => updateDraft("body", event.target.value)}
                  className="field min-h-40"
                  placeholder="구조화된 본문"
                />
              </Field>

              <Field label="태그">
                <input
                  value={draft.tags.join(", ")}
                  onChange={(event) => updateDraft("tags", parseList(event.target.value))}
                  className="field"
                  placeholder="기록, 장소, 회고"
                />
              </Field>

              <Field label="이벤트 날짜">
                <input
                  type="date"
                  value={draft.eventDate?.slice(0, 10) ?? ""}
                  onChange={(event) => updateDraft("eventDate", event.target.value)}
                  className="field"
                />
              </Field>

              <Field label="중요도">
                <select
                  value={String(draft.importance)}
                  onChange={(event) => updateDraft("importance", Number(event.target.value))}
                  className="field"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="입력 출처">
                <select
                  value={draft.sourceType}
                  onChange={(event) => updateDraft("sourceType", event.target.value as SourceType)}
                  className="field"
                >
                  <option value="assistant">창세봇 저장</option>
                  <option value="telegram">텔레그램</option>
                  <option value="manual">수동 입력</option>
                  <option value="imported">가져오기</option>
                </select>
              </Field>

              <Field label="보조 메모" className="md:col-span-2">
                <textarea
                  value={draft.notes ?? ""}
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  className="field min-h-24"
                />
              </Field>
            </div>

            <div className="mt-6">
              <TypeFields draft={draft} setDraft={setDraft} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveDraft()}
                className="inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 text-sm text-white"
              >
                <Save className="h-4 w-4" />
                저장하기
              </button>
              <button
                type="button"
                onClick={() => void deleteDraftRecord()}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm text-stone-700"
              >
                <Trash2 className="h-4 w-4" />
                삭제하기
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="이미지"
            description={
              isRemote
                ? "기록별 이미지를 업로드하고 캡션, alt text, 정렬 순서를 함께 저장합니다."
                : "이미지 업로드는 로그인 후 Supabase 모드에서 사용할 수 있습니다."
            }
          >
            <div className="space-y-4">
              <label
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-3 text-sm ${
                  isRemote ? "border-stone-200 bg-white text-stone-700" : "border-stone-200 bg-stone-100 text-stone-400"
                }`}
              >
                <ImagePlus className="h-4 w-4" />
                이미지 추가
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!isRemote || isUploading}
                  onChange={(event) => void handleUpload(event.target.files)}
                  className="hidden"
                />
              </label>

              {isUploading ? <p className="text-sm text-stone-500">이미지를 업로드하는 중입니다...</p> : null}

              {draft.images && draft.images.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {draft.images.map((image) => (
                    <div key={image.id} className="rounded-[24px] border border-stone-100 bg-white/80 p-3">
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-stone-100">
                        <Image
                          src={image.url}
                          alt={image.altText || draft.title || "record image"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>

                      <div className="mt-3 space-y-3">
                        <input
                          value={image.caption ?? ""}
                          onChange={(event) => updateImage(image.id, { caption: event.target.value })}
                          className="field"
                          placeholder="캡션"
                        />
                        <input
                          value={image.altText ?? ""}
                          onChange={(event) => updateImage(image.id, { altText: event.target.value })}
                          className="field"
                          placeholder="alt text"
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => moveImage(image.id, "left")}
                            className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600"
                          >
                            왼쪽
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(image.id, "right")}
                            className="rounded-full border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600"
                          >
                            오른쪽
                          </button>
                          {isRemote ? (
                            <button
                              type="button"
                              onClick={() => void handleRemoveImage(image.id)}
                              className="rounded-full border border-stone-200 bg-white p-2 text-stone-500"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[22px] border border-dashed border-stone-200 bg-stone-50/80 px-4 py-6 text-sm text-stone-500">
                  아직 연결된 이미지가 없습니다.
                </div>
              )}

              {draft.images && draft.images.length > 0 ? (
                <button
                  type="button"
                  onClick={() => void saveImages()}
                  className="rounded-full border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700"
                >
                  이미지 정보 저장
                </button>
              ) : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function TypeFields({
  draft,
  setDraft,
}: Readonly<{
  draft: ArchiveRecord;
  setDraft: React.Dispatch<React.SetStateAction<ArchiveRecord>>;
}>) {
  const updateThought = (patch: Partial<NonNullable<ArchiveRecord["thought"]>>) =>
    setDraft((current) => ({
      ...current,
      thought: { ...(current.thought ?? createThoughtDetails()), ...patch },
    }));

  const updateWord = (patch: Partial<NonNullable<ArchiveRecord["word"]>>) =>
    setDraft((current) => ({
      ...current,
      word: { ...(current.word ?? createWordDetails()), ...patch },
    }));

  const updateContent = (patch: Partial<NonNullable<ArchiveRecord["content"]>>) =>
    setDraft((current) => ({
      ...current,
      content: { ...(current.content ?? createContentDetails()), ...patch },
    }));

  const updatePlace = (patch: Partial<NonNullable<ArchiveRecord["place"]>>) =>
    setDraft((current) => ({
      ...current,
      place: { ...(current.place ?? createPlaceDetails()), ...patch },
    }));

  const updateActivity = (patch: Partial<NonNullable<ArchiveRecord["activity"]>>) =>
    setDraft((current) => ({
      ...current,
      activity: { ...(current.activity ?? createActivityDetails()), ...patch },
    }));

  if (draft.category === "thoughts") {
    const detail = draft.thought ?? createThoughtDetails();

    return (
      <SectionCard title="생각 상세 필드" description="리플렉션과 메모 구조">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="생각 유형">
            <input value={detail.thoughtType} onChange={(e) => updateThought({ thoughtType: e.target.value })} className="field" />
          </Field>
          <Field label="한 줄 생각">
            <input value={detail.oneLineThought} onChange={(e) => updateThought({ oneLineThought: e.target.value })} className="field" />
          </Field>
          <Field label="확장 메모" className="md:col-span-2">
            <textarea value={detail.expandedNote} onChange={(e) => updateThought({ expandedNote: e.target.value })} className="field min-h-28" />
          </Field>
          <ToggleField label="액션 필요" checked={detail.actionNeeded} onChange={(checked) => updateThought({ actionNeeded: checked })} />
          <ToggleField label="다시 볼 가치" checked={detail.worthRevisiting} onChange={(checked) => updateThought({ worthRevisiting: checked })} />
        </div>
      </SectionCard>
    );
  }

  if (draft.category === "words") {
    const detail = draft.word ?? createWordDetails();

    return (
      <SectionCard title="단어 상세 필드" description="어휘, 표현, 조어 구조">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="단어">
            <input value={detail.term} onChange={(e) => updateWord({ term: e.target.value })} className="field" />
          </Field>
          <Field label="의미">
            <input value={detail.meaning} onChange={(e) => updateWord({ meaning: e.target.value })} className="field" />
          </Field>
          <Field label="예문" className="md:col-span-2">
            <textarea value={detail.example} onChange={(e) => updateWord({ example: e.target.value })} className="field min-h-24" />
          </Field>
          <Field label="저장 이유" className="md:col-span-2">
            <textarea value={detail.whySaved} onChange={(e) => updateWord({ whySaved: e.target.value })} className="field min-h-24" />
          </Field>
        </div>
      </SectionCard>
    );
  }

  if (draft.category === "content") {
    const detail = draft.content ?? createContentDetails();

    return (
      <SectionCard title="콘텐츠 상세 필드" description="영화, 책, 드라마, 영상 구조">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="콘텐츠 유형">
            <input value={detail.contentType} onChange={(e) => updateContent({ contentType: e.target.value })} className="field" />
          </Field>
          <Field label="원제">
            <input value={detail.titleOriginal ?? ""} onChange={(e) => updateContent({ titleOriginal: e.target.value })} className="field" />
          </Field>
          <Field label="평점">
            <select value={String(detail.rating)} onChange={(e) => updateContent({ rating: Number(e.target.value) })} className="field">
              {ratingOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="재방문 의도">
            <select value={detail.revisitIntent} onChange={(e) => updateContent({ revisitIntent: e.target.value as RevisitIntent })} className="field">
              {Object.entries(REVISIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="한 줄 리뷰" className="md:col-span-2">
            <textarea value={detail.oneLineReview} onChange={(e) => updateContent({ oneLineReview: e.target.value })} className="field min-h-24" />
          </Field>
          <Field label="기억 포인트" className="md:col-span-2">
            <textarea value={detail.memorablePoints.join(", ")} onChange={(e) => updateContent({ memorablePoints: parseList(e.target.value) })} className="field min-h-24" />
          </Field>
          <Field label="아쉬운 점" className="md:col-span-2">
            <textarea value={(detail.weakPoints ?? []).join(", ")} onChange={(e) => updateContent({ weakPoints: parseList(e.target.value) })} className="field min-h-24" />
          </Field>
          <Field label="기억 문장" className="md:col-span-2">
            <textarea value={detail.memorableQuote ?? ""} onChange={(e) => updateContent({ memorableQuote: e.target.value })} className="field min-h-24" />
          </Field>
        </div>
      </SectionCard>
    );
  }

  if (draft.category === "places") {
    const detail = draft.place ?? createPlaceDetails();

    return (
      <SectionCard title="장소 상세 필드" description="장소 리뷰와 재방문 구조">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="장소명">
            <input value={detail.placeName} onChange={(e) => updatePlace({ placeName: e.target.value })} className="field" />
          </Field>
          <Field label="지역">
            <input value={detail.area} onChange={(e) => updatePlace({ area: e.target.value })} className="field" />
          </Field>
          <Field label="주소">
            <input value={detail.address ?? ""} onChange={(e) => updatePlace({ address: e.target.value })} className="field" />
          </Field>
          <Field label="장소 유형">
            <input value={detail.placeType} onChange={(e) => updatePlace({ placeType: e.target.value })} className="field" />
          </Field>
          <Field label="방문일">
            <input type="date" value={detail.visitDate?.slice(0, 10) ?? ""} onChange={(e) => updatePlace({ visitDate: e.target.value })} className="field" />
          </Field>
          <Field label="평점">
            <select value={String(detail.rating)} onChange={(e) => updatePlace({ rating: Number(e.target.value) })} className="field">
              {ratingOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
          <Field label="한 줄 리뷰" className="md:col-span-2">
            <textarea value={detail.oneLineReview} onChange={(e) => updatePlace({ oneLineReview: e.target.value })} className="field min-h-24" />
          </Field>
          <Field label="재방문 의도">
            <select value={detail.revisitIntent} onChange={(e) => updatePlace({ revisitIntent: e.target.value as RevisitIntent })} className="field">
              {Object.entries(REVISIT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="함께한 사람">
            <input value={detail.withWhom ?? ""} onChange={(e) => updatePlace({ withWhom: e.target.value })} className="field" />
          </Field>
          <Field label="분위기 메모" className="md:col-span-2">
            <textarea value={detail.atmosphereNote ?? ""} onChange={(e) => updatePlace({ atmosphereNote: e.target.value })} className="field min-h-24" />
          </Field>
          <Field label="가격 메모" className="md:col-span-2">
            <textarea value={detail.priceNote ?? ""} onChange={(e) => updatePlace({ priceNote: e.target.value })} className="field min-h-24" />
          </Field>
        </div>
      </SectionCard>
    );
  }

  const detail = draft.activity ?? createActivityDetails();

  return (
    <SectionCard title="활동 상세 필드" description="운동, 산책, 트래킹 기록 구조">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="활동 유형">
          <input value={detail.activityType} onChange={(e) => updateActivity({ activityType: e.target.value })} className="field" />
        </Field>
        <Field label="위치">
          <input value={detail.location} onChange={(e) => updateActivity({ location: e.target.value })} className="field" />
        </Field>
        <Field label="거리 (km)">
          <input type="number" step="0.1" value={detail.distanceKm ?? 0} onChange={(e) => updateActivity({ distanceKm: Number(e.target.value) })} className="field" />
        </Field>
        <Field label="시간 (분)">
          <input type="number" value={detail.durationMinutes ?? 0} onChange={(e) => updateActivity({ durationMinutes: Number(e.target.value) })} className="field" />
        </Field>
        <Field label="난이도">
          <select value={String(detail.difficulty)} onChange={(e) => updateActivity({ difficulty: Number(e.target.value) })} className="field">
            {[1, 2, 3, 4, 5].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="만족도">
          <select value={String(detail.satisfactionRating)} onChange={(e) => updateActivity({ satisfactionRating: Number(e.target.value) })} className="field">
            {ratingOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </Field>
        <Field label="컨디션 메모" className="md:col-span-2">
          <textarea value={detail.physicalConditionNote ?? ""} onChange={(e) => updateActivity({ physicalConditionNote: e.target.value })} className="field min-h-24" />
        </Field>
        <Field label="활동 요약" className="md:col-span-2">
          <textarea value={detail.summary} onChange={(e) => updateActivity({ summary: e.target.value })} className="field min-h-24" />
        </Field>
      </div>
    </SectionCard>
  );
}

function Field({
  label,
  className,
  children,
}: Readonly<{ label: string; className?: string; children: React.ReactNode }>) {
  return (
    <label className={className}>
      <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-stone-500">{label}</span>
      {children}
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <label className="inline-flex items-center gap-3 rounded-[20px] border border-stone-100 bg-stone-50/80 px-4 py-4 text-sm text-stone-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400"
      />
      {label}
    </label>
  );
}

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createDraft(category: CategoryKey) {
  return {
    ...createEmptyRecord(category),
    id: crypto.randomUUID(),
  };
}
