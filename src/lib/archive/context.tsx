"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

import { seedRecords } from "@/lib/archive/mock-data";
import { fetchRemoteArchiveRecords, deleteRemoteImage, deleteRemoteArchiveRecord, upsertRemoteArchiveRecord, uploadRemoteRecordImages } from "@/lib/archive/supabase-store";
import { readRecordsFromStorage, writeRecordsToStorage } from "@/lib/archive/storage";
import { ArchiveContextValue, ArchiveRecord } from "@/lib/archive/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { sortRecords } from "@/lib/archive/utils";

const ArchiveContext = createContext<ArchiveContextValue | null>(null);

function createSeedSnapshot() {
  return sortRecords(structuredClone(seedRecords), "newest");
}

function createLocalSnapshot() {
  if (typeof window === "undefined") {
    return createSeedSnapshot();
  }

  const stored = readRecordsFromStorage();
  return stored && stored.length > 0 ? sortRecords(stored, "newest") : createSeedSnapshot();
}

export function ArchiveProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [records, setRecords] = useState<ArchiveRecord[]>(createLocalSnapshot);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isRemote, setIsRemote] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      const fallback = createLocalSnapshot();

      if (!isSupabaseConfigured()) {
        setRecords(fallback);
        setIsRemote(false);
        setIsReady(true);
        return;
      }

      const client = createSupabaseBrowserClient();
      const {
        data: { user: currentUser },
      } = await client.auth.getUser();

      if (ignore) {
        return;
      }

      setUser(currentUser);

      if (!currentUser) {
        setRecords(fallback);
        setIsRemote(false);
        setIsReady(true);
        return;
      }

      try {
        const remoteRecords = await fetchRemoteArchiveRecords(client, currentUser);
        if (!ignore) {
          setRecords(remoteRecords);
          setIsRemote(true);
        }
      } catch {
        if (!ignore) {
          setRecords(fallback);
          setIsRemote(false);
        }
      } finally {
        if (!ignore) {
          setIsReady(true);
        }
      }
    }

    void bootstrap();

    if (!isSupabaseConfigured()) {
      return () => {
        ignore = true;
      };
    }

    const client = createSupabaseBrowserClient();
    const { data: subscription } = client.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setRecords(createLocalSnapshot());
        setIsRemote(false);
        setIsReady(true);
        return;
      }

      void fetchRemoteArchiveRecords(client, nextUser)
        .then((remoteRecords) => {
          if (!ignore) {
            setRecords(remoteRecords);
            setIsRemote(true);
            setIsReady(true);
          }
        })
        .catch(() => {
          if (!ignore) {
            setRecords(createLocalSnapshot());
            setIsRemote(false);
            setIsReady(true);
          }
        });
    });

    return () => {
      ignore = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<ArchiveContextValue>(() => {
    const setLocalRecords = (nextRecords: ArchiveRecord[]) => {
      const sorted = sortRecords(nextRecords, "newest");
      setRecords(sorted);
      writeRecordsToStorage(sorted);
    };

    const refreshRemote = async (currentUser: User) => {
      const client = createSupabaseBrowserClient();
      const remoteRecords = await fetchRemoteArchiveRecords(client, currentUser);
      setRecords(remoteRecords);
      setIsRemote(true);
    };

    return {
      records,
      isReady,
      isAuthenticated: Boolean(user),
      isRemote,
      userEmail: user?.email ?? null,
      upsertRecord: async (record) => {
        if (user && isSupabaseConfigured()) {
          const client = createSupabaseBrowserClient();
          await upsertRemoteArchiveRecord(client, user, record);
          await refreshRemote(user);
          return;
        }

        setLocalRecords([record, ...records.filter((item) => item.id !== record.id)]);
      },
      deleteRecord: async (recordId) => {
        if (user && isSupabaseConfigured()) {
          const record = records.find((item) => item.id === recordId);

          if (!record) {
            return;
          }

          const client = createSupabaseBrowserClient();
          await deleteRemoteArchiveRecord(client, user, record);
          await refreshRemote(user);
          return;
        }

        setLocalRecords(records.filter((record) => record.id !== recordId));
      },
      resetRecords: async () => {
        const seed = createSeedSnapshot();
        setLocalRecords(seed);
      },
      uploadImages: async (recordId, files) => {
        if (!user || !isSupabaseConfigured()) {
          throw new Error("이미지 업로드는 로그인 후 사용할 수 있습니다.");
        }

        const client = createSupabaseBrowserClient();
        const targetRecord = records.find((record) => record.id === recordId);
        const existingImages = targetRecord?.images ?? [];
        const uploaded = await uploadRemoteRecordImages(client, user, recordId, existingImages, files);
        await refreshRemote(user);
        return uploaded;
      },
      removeImage: async (recordId, imageId) => {
        if (!user || !isSupabaseConfigured()) {
          throw new Error("이미지 삭제는 로그인 후 사용할 수 있습니다.");
        }

        const targetRecord = records.find((record) => record.id === recordId);
        const targetImage = targetRecord?.images?.find((image) => image.id === imageId);

        if (!targetImage) {
          return;
        }

        const client = createSupabaseBrowserClient();
        await deleteRemoteImage(client, user, targetImage);
        await refreshRemote(user);
      },
      signOut: async () => {
        if (!isSupabaseConfigured()) {
          return;
        }

        const client = createSupabaseBrowserClient();
        await client.auth.signOut();
      },
    };
  }, [isReady, isRemote, records, user]);

  return <ArchiveContext.Provider value={value}>{children}</ArchiveContext.Provider>;
}

export function useArchive() {
  const value = useContext(ArchiveContext);

  if (!value) {
    throw new Error("useArchive must be used within ArchiveProvider");
  }

  return value;
}
