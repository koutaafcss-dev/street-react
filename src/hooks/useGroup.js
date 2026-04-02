import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp,
  getDocs,
  deleteField,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * useGroup
 *
 * VIALE のグループ機能を扱う hook。
 *
 * 今回の追加ポイント:
 * - 1つの投稿に複数地点を持てるようにした
 * - 旧データとの互換のため lat / lng も残す
 * - primaryLocation / locations / locationCount を保存する
 */
export function useGroup(currentUser) {
  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [activeGroupId, setActiveGroupId] = useState(null);
  const [activeGroupData, setActiveGroupData] = useState(null);

  const [groupPosts, setGroupPosts] = useState([]);
  const [groupPostsLoading, setGroupPostsLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setMyGroups([]);
      setGroupsLoading(false);
      return;
    }

    setGroupsLoading(true);

    const q = query(
      collection(db, "groups"),
      where("memberIds", "array-contains", currentUser),
      limit(100)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        rows.sort((a, b) => {
          const aTime =
            typeof a?.createdAt?.toMillis === "function"
              ? a.createdAt.toMillis()
              : a?.createdAt?.seconds
              ? a.createdAt.seconds * 1000
              : 0;
          const bTime =
            typeof b?.createdAt?.toMillis === "function"
              ? b.createdAt.toMillis()
              : b?.createdAt?.seconds
              ? b.createdAt.seconds * 1000
              : 0;
          return bTime - aTime;
        });

        setMyGroups(rows);
        setGroupsLoading(false);

        if (activeGroupId && !rows.some((group) => group.id === activeGroupId)) {
          setActiveGroupId(null);
        }
      },
      (err) => {
        console.error("groups snapshot error:", err);
        setGroupsLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, activeGroupId]);

  useEffect(() => {
    if (!activeGroupId) {
      setActiveGroupData(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "groups", activeGroupId),
      (snap) => {
        if (!snap.exists()) {
          setActiveGroupData(null);
          return;
        }
        setActiveGroupData({ id: snap.id, ...snap.data() });
      },
      (err) => {
        console.error("active group snapshot error:", err);
        setActiveGroupData(null);
      }
    );

    return () => unsub();
  }, [activeGroupId]);

  useEffect(() => {
    if (!activeGroupId || !currentUser) {
      setGroupPosts([]);
      setGroupPostsLoading(false);
      return;
    }

    setGroupPostsLoading(true);

    const q = query(
      collection(db, "groups", activeGroupId, "posts"),
      orderBy("timestamp", "desc"),
      limit(200)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          _isGroup: true,
          _groupId: activeGroupId,
        }));

        setGroupPosts(rows);
        setGroupPostsLoading(false);
      },
      (err) => {
        console.error("group posts snapshot error:", err);
        setGroupPosts([]);
        setGroupPostsLoading(false);
      }
    );

    return () => unsub();
  }, [activeGroupId, currentUser]);

  const isAdmin = useCallback(
    (groupData) => groupData?.members?.[currentUser]?.role === "admin",
    [currentUser]
  );

  const canPostAnnouncement = useCallback(
    (groupData) => {
      if (!groupData || !currentUser) return false;
      const announceRole = groupData?.settings?.announceRole || "admin";
      if (announceRole === "all") return !!groupData?.members?.[currentUser];
      return groupData?.members?.[currentUser]?.role === "admin";
    },
    [currentUser]
  );

  const makeInviteCode = useCallback(() => {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }, []);

  const normalizeLocations = useCallback((postData) => {
    if (Array.isArray(postData?.locations) && postData.locations.length > 0) {
      return postData.locations
        .map((loc, index) => ({
          id: loc?.id || `loc-${index + 1}`,
          lat: typeof loc?.lat === "number" ? loc.lat : null,
          lng: typeof loc?.lng === "number" ? loc.lng : null,
          label: typeof loc?.label === "string" ? loc.label.trim() : "",
        }))
        .filter((loc) => typeof loc.lat === "number" && typeof loc.lng === "number");
    }

    if (typeof postData?.lat === "number" && typeof postData?.lng === "number") {
      return [
        {
          id: "loc-1",
          lat: postData.lat,
          lng: postData.lng,
          label: typeof postData?.locationLabel === "string" ? postData.locationLabel.trim() : "",
        },
      ];
    }

    return [];
  }, []);

  const createGroup = useCallback(
    async ({ name, description = "", areaLabel = "" }) => {
      if (!currentUser) throw new Error("ログインが必要です");
      if (!name?.trim()) throw new Error("グループ名が必要です");

      const inviteCode = makeInviteCode();

      const payload = {
        name: name.trim(),
        description: description.trim(),
        createdBy: currentUser,
        createdAt: serverTimestamp(),
        inviteCode,
        memberIds: [currentUser],
        members: {
          [currentUser]: {
            role: "admin",
            joinedAt: Date.now(),
          },
        },
        settings: {
          announceRole: "admin",
        },
        boardType: "circular",
        visibility: "private",
        areaLabel: areaLabel?.trim?.() || "",
      };

      const ref = await addDoc(collection(db, "groups"), payload);
      return ref.id;
    },
    [currentUser, makeInviteCode]
  );

  const joinByInviteCode = useCallback(
    async (code) => {
      if (!currentUser) throw new Error("ログインが必要です");
      if (!code?.trim()) throw new Error("招待コードが必要です");

      const q = query(
        collection(db, "groups"),
        where("inviteCode", "==", code.trim().toUpperCase()),
        limit(1)
      );

      const result = await getDocs(q);

      if (result.empty) {
        throw new Error("招待コードが見つかりません");
      }

      const target = result.docs[0];
      const groupRef = target.ref;
      const groupData = target.data();

      if (groupData?.memberIds?.includes(currentUser)) {
        return target.id;
      }

      await updateDoc(groupRef, {
        memberIds: arrayUnion(currentUser),
        [`members.${currentUser}`]: {
          role: "member",
          joinedAt: Date.now(),
        },
      });

      return target.id;
    },
    [currentUser]
  );

  const leaveGroup = useCallback(
    async (groupId) => {
      if (!currentUser || !groupId) return;

      await updateDoc(doc(db, "groups", groupId), {
        memberIds: arrayRemove(currentUser),
        [`members.${currentUser}`]: deleteField(),
      });

      if (activeGroupId === groupId) {
        setActiveGroupId(null);
      }
    },
    [currentUser, activeGroupId]
  );

  const addGroupPost = useCallback(
    async (groupId, postData) => {
      if (!currentUser || !groupId) {
        throw new Error("投稿できません");
      }

      const groupRole =
        activeGroupData?.id === groupId &&
        activeGroupData?.members?.[currentUser]?.role === "admin"
          ? "admin"
          : "member";

      const locations = normalizeLocations(postData);
      const primary = locations[0] || null;

      const payload = {
        text: postData?.text?.trim?.() || "",
        postType: postData?.postType || "normal",
        needTags: Array.isArray(postData?.needTags) ? postData.needTags : [],
        tags: Array.isArray(postData?.tags) ? postData.tags : [],
        photo: postData?.photo || null,
        lat: primary ? primary.lat : null,
        lng: primary ? primary.lng : null,
        primaryLocation: primary
          ? {
              lat: primary.lat,
              lng: primary.lng,
              label: primary.label || "",
            }
          : null,
        locations,
        locationCount: locations.length,
        userId: currentUser,
        authorRole: groupRole,
        timestamp: Date.now(),
        createdAt: serverTimestamp(),
        likes: 0,
        likedBy: [],
        helpedBy: [],
        comments: [],
        reports: 0,
        reportedBy: [],
        hidden: false,
        isAnnounce: !!postData?.isAnnounce,
        isArchived: !!postData?.isArchived,
        expiresAt:
          typeof postData?.expiresAt === "number" ? postData.expiresAt : null,
      };

      const ref = await addDoc(collection(db, "groups", groupId, "posts"), payload);
      return ref.id;
    },
    [currentUser, activeGroupData, normalizeLocations]
  );

  const deleteGroupPost = useCallback(
    async (groupId, postId) => {
      if (!currentUser || !groupId || !postId) return;
      await deleteDoc(doc(db, "groups", groupId, "posts", postId));
    },
    [currentUser]
  );

  const regenerateInviteCode = useCallback(
    async (groupId) => {
      if (!currentUser || !groupId) return null;
      const newCode = makeInviteCode();
      await updateDoc(doc(db, "groups", groupId), { inviteCode: newCode });
      return newCode;
    },
    [currentUser, makeInviteCode]
  );

  const updateGroupSettings = useCallback(
    async (groupId, settings) => {
      if (!currentUser || !groupId) return;
      await updateDoc(doc(db, "groups", groupId), { settings });
    },
    [currentUser]
  );

  const kickMember = useCallback(
    async (groupId, targetUserId) => {
      if (!currentUser || !groupId || !targetUserId) return;
      await updateDoc(doc(db, "groups", groupId), {
        memberIds: arrayRemove(targetUserId),
        [`members.${targetUserId}`]: deleteField(),
      });
    },
    [currentUser]
  );

  const promoteToAdmin = useCallback(
    async (groupId, targetUserId) => {
      if (!currentUser || !groupId || !targetUserId) return;
      await updateDoc(doc(db, "groups", groupId), {
        [`members.${targetUserId}.role`]: "admin",
      });
    },
    [currentUser]
  );

  const updateGroupPostMeta = useCallback(
    async (groupId, postId, patch) => {
      if (!currentUser || !groupId || !postId) return;
      await updateDoc(doc(db, "groups", groupId, "posts", postId), patch);
    },
    [currentUser]
  );

  const toggleAnnouncePost = useCallback(
    async (groupId, postId, nextValue) => {
      await updateGroupPostMeta(groupId, postId, {
        isAnnounce: !!nextValue,
      });
    },
    [updateGroupPostMeta]
  );

  const toggleArchivePost = useCallback(
    async (groupId, postId, nextValue) => {
      await updateGroupPostMeta(groupId, postId, {
        isArchived: !!nextValue,
        hidden: !!nextValue,
      });
    },
    [updateGroupPostMeta]
  );

  return {
    myGroups,
    groupsLoading,

    activeGroupId,
    setActiveGroupId,
    activeGroupData,

    groupPosts,
    groupPostsLoading,

    isAdmin,
    canPostAnnouncement,

    createGroup,
    joinByInviteCode,
    leaveGroup,
    addGroupPost,
    deleteGroupPost,
    regenerateInviteCode,
    updateGroupSettings,
    kickMember,
    promoteToAdmin,
    updateGroupPostMeta,
    toggleAnnouncePost,
    toggleArchivePost,
  };
}
