import { useState, useCallback } from "react";

export function usePostComposer() {
  const [postText, setPostText] = useState("");
  const [postType, setPostType] = useState("normal");
  const [postPhoto, setPostPhoto] = useState(null);
  const [postEventDate, setPostEventDate] = useState("");
  const [postExpiry, setPostExpiry] = useState("none");
  const [postNeedTags, setPostNeedTags] = useState([]);
  const [chainPostId, setChainPostId] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [postPhase, setPostPhase] = useState("form");
  const [postTimestamps, setPostTimestamps] = useState([]);
  const [isFrozen, setIsFrozen] = useState(false);

  const resetForm = useCallback(() => {
    setPostText("");
    setPostType("normal");
    setPostPhoto(null);
    setPostEventDate("");
    setPostExpiry("none");
    setPostNeedTags([]);
    setChainPostId(null);
    setIsPosting(false);
    setPostPhase("form");
  }, []);

  const startPosting = useCallback((chainId = null) => {
    setChainPostId(chainId);
    setIsPosting(true);
    setPostPhase("form");
  }, []);

  const freeze = useCallback((durationMs = 30000) => {
    setIsFrozen(true);
    setTimeout(() => setIsFrozen(false), durationMs);
  }, []);

  const addTimestamp = useCallback((now) => {
    setPostTimestamps((prev) => [...prev, now].filter((t) => now - t < 30000));
  }, []);

  return {
    postText,
    setPostText,
    postType,
    setPostType,
    postPhoto,
    setPostPhoto,
    postEventDate,
    setPostEventDate,
    postExpiry,
    setPostExpiry,
    postNeedTags,
    setPostNeedTags,
    chainPostId,
    setChainPostId,
    isPosting,
    setIsPosting,
    postPhase,
    setPostPhase,
    postTimestamps,
    setPostTimestamps,
    addTimestamp,
    isFrozen,
    setIsFrozen,
    resetForm,
    startPosting,
    freeze,
  };
}