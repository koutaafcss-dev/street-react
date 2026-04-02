import { useState, useRef, useCallback } from "react";

/**
 * useUiShellState
 * モーダル・サイドバー・バナー・ストレージ警告など
 * UI表示系の state を管理する。
 * App.jsx から切り出すことで、UI制御ロジックが局所化できる。
 */
export function useUiShellState() {
  // toast
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // モーダル群
  const [showNotif, setShowNotif] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showTutorial, setShowTutorial] = useState(
    () => !localStorage.getItem("zenTutorialDone")
  );
  const [showDigest, setShowDigest] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showOpening, setShowOpening] = useState(
    () => !localStorage.getItem("zenOpeningDone")
  );

  // プロフィール編集モーダル群
  const [showNickEdit, setShowNickEdit] = useState(false);
  const [showBioEdit, setShowBioEdit] = useState(false);
  const [showTagsEdit, setShowTagsEdit] = useState(false);
  const [showHeaderEdit, setShowHeaderEdit] = useState(false);
  const [showAvatarEdit, setShowAvatarEdit] = useState(false);

  // バナー・警告
  const [newBannerCount, setNewBannerCount] = useState(0);
  const [storageWarning, setStorageWarning] = useState(false);

  // グループパネル
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState(null);

  // 位置情報設定
  const [showLocationSettings, setShowLocationSettings] = useState(false);

  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem("zenTutorialDone", "1");
  }, []);

  const closeOpening = useCallback(() => {
    setShowOpening(false);
    localStorage.setItem("zenOpeningDone", "1");
  }, []);

  return {
    // toast
    toast, showToast,
    // モーダル
    showNotif, setShowNotif,
    showSidebar, setShowSidebar,
    showTutorial, setShowTutorial, closeTutorial,
    showDigest, setShowDigest,
    showStorage, setShowStorage,
    showTerms, setShowTerms,
    showGuide, setShowGuide,
    showOpening, setShowOpening, closeOpening,
    // プロフィール編集モーダル
    showNickEdit, setShowNickEdit,
    showBioEdit, setShowBioEdit,
    showTagsEdit, setShowTagsEdit,
    showHeaderEdit, setShowHeaderEdit,
    showAvatarEdit, setShowAvatarEdit,
    // バナー
    newBannerCount, setNewBannerCount,
    storageWarning, setStorageWarning,
    // グループ
    showGroupPanel, setShowGroupPanel,
    currentGroupId, setCurrentGroupId,
    // 位置情報設定
    showLocationSettings, setShowLocationSettings,
  };
}
