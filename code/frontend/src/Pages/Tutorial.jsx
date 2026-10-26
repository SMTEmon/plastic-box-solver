import React, { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "../Layout/AppShell";
import TutorialStagePicker from "../Components/TutorialStagePicker";
import TutorialWorkspace from "../Components/TutorialWorkspace";
import { useTutorialStore } from "../store/tutorialStore";

export default function Tutorial() {
  const [searchParams] = useSearchParams();
  const selectedStageId = useTutorialStore((s) => s.selectedStageId);
  const selectStage = useTutorialStore((s) => s.selectStage);

  // Sync ?stage=... URL param if navigated with a specific stage
  useEffect(() => {
    const stageParam = searchParams.get("stage");
    if (stageParam && stageParam !== selectedStageId) {
      selectStage(stageParam);
    }
  }, [searchParams, selectStage, selectedStageId]);

  return (
    <AppShell title="Tutorials">
      {selectedStageId ? <TutorialWorkspace /> : <TutorialStagePicker />}
    </AppShell>
  );
}
