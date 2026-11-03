import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Stepper } from './components/Stepper';
import { Footer } from './components/Footer';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';
import { DashboardView } from './views/DashboardView';
import { UploadView } from './views/UploadView';
import { TranscribeView } from './views/TranscribeView';
import { ReviewView } from './views/ReviewView';
import { ExportView } from './views/ExportView';
import { LiveView } from './views/LiveView';
import { HistoryView } from './views/HistoryView';
import { AboutView } from './views/AboutView';
import { HowItWorksView } from './views/HowItWorksView';
import { Correction, Flag, Recording, Segment, SpeakerRoleMapping, Step } from './types';
import { AppStorage } from './services/storage';
import { ApiClient } from './services/apiClient';

export const App: React.FC = () => {
  const [reviewer, setReviewer] = useState<string>(() => AppStorage.getReviewer());
  const [mockMode, setMockMode] = useState<boolean>(() => AppStorage.getMockMode());
  const [recording, setRecording] = useState<Recording | null>(() => AppStorage.getRecording());
  const [segments, setSegments] = useState<Segment[]>(() => AppStorage.getSegments());
  const [flags, setFlags] = useState<Flag[]>(() => AppStorage.getFlags());
  const [corrections, setCorrections] = useState<Correction[]>(() => AppStorage.getCorrections());
  const [speakerRoles, setSpeakerRoles] = useState<SpeakerRoleMapping[]>(() =>
    AppStorage.getSpeakerRoles()
  );

  const [currentStep, setCurrentStep] = useState<Step>('dashboard');
  const [showAbout, setShowAbout] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', title?: string) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      setToasts((prev) => [...prev, { id, message, type, title }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync reviewer to storage
  const handleReviewerChange = (name: string) => {
    setReviewer(name);
    AppStorage.setReviewer(name);
  };

  const handleMockModeChange = (val: boolean) => {
    setMockMode(val);
    AppStorage.setMockMode(val);
  };

  const handleRecordingChange = (rec: Recording | null) => {
    setRecording(rec);
    if (!rec) {
      setSegments([]);
      setFlags([]);
      setCorrections([]);
      setSpeakerRoles([]);
      setCurrentStep('upload');
    } else {
      setSegments(AppStorage.getSegments());
      setFlags(AppStorage.getFlags());
      setCorrections(AppStorage.getCorrections());
      setSpeakerRoles(AppStorage.getSpeakerRoles());
    }
  };

  const handleSelectSession = async (rec: Recording) => {
    setRecording(rec);
    AppStorage.setRecording(rec);
    try {
      const transcript = await ApiClient.getTranscript(rec.id);
      if (transcript && transcript.segments) {
        setSegments(transcript.segments as any);
        AppStorage.setSegments(transcript.segments as any);
      }
      const [fetchedFlags, fetchedCorrections, fetchedRoles] = await Promise.all([
        ApiClient.getFlags(rec.id),
        ApiClient.getHistory(rec.id),
        ApiClient.getSpeakerRoles(rec.id),
      ]);
      setFlags(fetchedFlags as any);
      AppStorage.setFlags(fetchedFlags as any);
      setCorrections(fetchedCorrections as any);
      AppStorage.setCorrections(fetchedCorrections as any);
      setSpeakerRoles(fetchedRoles as any);
      AppStorage.setSpeakerRoles(fetchedRoles as any);
    } catch {
      // Fallback to storage
      setSegments(AppStorage.getSegments());
      setFlags(AppStorage.getFlags());
      setCorrections(AppStorage.getCorrections());
      setSpeakerRoles(AppStorage.getSpeakerRoles());
    }
  };

  const handleLoadLiveRecording = (rec: Recording, liveSegments: Segment[]) => {
    AppStorage.setRecording(rec);
    AppStorage.setSegments(liveSegments);
    setRecording(rec);
    setSegments(liveSegments);
    addToast('Live microphone session saved to review desk.', 'success');
    setCurrentStep('review');
  };

  const hasRecording = recording !== null;
  const hasTranscript = segments.length > 0;
  const isWorkflowStep = ['upload', 'transcribe', 'review', 'export'].includes(currentStep);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAF7F0] text-[#1F2A24]">
      {/* Sidebar Navigation & Reviewer settings */}
      <Sidebar
        reviewer={reviewer}
        onReviewerChange={handleReviewerChange}
        mockMode={mockMode}
        onMockModeChange={handleMockModeChange}
        currentStep={currentStep}
        onNavigate={(step) => {
          setShowAbout(false);
          setShowHowItWorks(false);
          setCurrentStep(step);
        }}
        onOpenDiagnostics={() => setShowDiagnostics(true)}
        onOpenAbout={() => {
          setShowAbout(true);
          setShowHowItWorks(false);
        }}
        onOpenHowItWorks={() => {
          setShowHowItWorks(true);
          setShowAbout(false);
        }}
        hasRecording={hasRecording}
        hasTranscript={hasTranscript}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-w-0 max-w-6xl mx-auto px-4 md:px-8 py-6">
        {/* Takeover Views */}
        {showAbout ? (
          <AboutView onBack={() => setShowAbout(false)} />
        ) : showHowItWorks ? (
          <HowItWorksView onBack={() => setShowHowItWorks(false)} />
        ) : (
          <>
            {/* 4-Step Stepper (active during sequential transcription pipeline) */}
            {isWorkflowStep && (
              <Stepper
                currentStep={currentStep}
                onSelectStep={(step) => setCurrentStep(step)}
                hasRecording={hasRecording}
                hasTranscript={hasTranscript}
              />
            )}

            {/* Step Views */}
            <div className="flex-1">
              {currentStep === 'dashboard' && (
                <DashboardView
                  reviewer={reviewer}
                  onNavigate={(step) => setCurrentStep(step)}
                  onSelectSession={handleSelectSession}
                  onNotify={addToast}
                />
              )}

              {currentStep === 'upload' && (
                <UploadView
                  reviewer={reviewer}
                  recording={recording}
                  onRecordingChange={handleRecordingChange}
                  onNavigateToTranscribe={() => setCurrentStep('transcribe')}
                  onNotify={addToast}
                />
              )}

              {currentStep === 'transcribe' && (
                <TranscribeView
                  reviewer={reviewer}
                  recording={recording}
                  segments={segments}
                  onSegmentsChange={(newSegments) => {
                    setSegments(newSegments);
                    AppStorage.setSegments(newSegments);
                  }}
                  mockMode={mockMode}
                  onMockModeChange={handleMockModeChange}
                  onNavigateToUpload={() => setCurrentStep('upload')}
                  onNavigateToReview={() => setCurrentStep('review')}
                  onNotify={addToast}
                />
              )}

              {currentStep === 'review' && (
                <ReviewView
                  reviewer={reviewer}
                  recording={recording}
                  segments={segments}
                  onSegmentsChange={(newSegments) => {
                    setSegments(newSegments);
                    AppStorage.setSegments(newSegments);
                  }}
                  flags={flags}
                  onFlagsChange={(newFlags) => {
                    setFlags(newFlags);
                    AppStorage.setFlags(newFlags);
                  }}
                  corrections={corrections}
                  onCorrectionsChange={(newCorrections) => {
                    setCorrections(newCorrections);
                    AppStorage.setCorrections(newCorrections);
                  }}
                  speakerRoles={speakerRoles}
                  onSpeakerRolesChange={(newRoles) => {
                    setSpeakerRoles(newRoles);
                    AppStorage.setSpeakerRoles(newRoles);
                  }}
                  onNavigateToUpload={() => setCurrentStep('upload')}
                  onNavigateToTranscribe={() => setCurrentStep('transcribe')}
                  onNavigateToExport={() => setCurrentStep('export')}
                  onNotify={addToast}
                />
              )}

              {currentStep === 'export' && (
                <ExportView
                  reviewer={reviewer}
                  recording={recording}
                  segments={segments}
                  flags={flags}
                  corrections={corrections}
                  onNavigateToUpload={() => setCurrentStep('upload')}
                  onNavigateToTranscribe={() => setCurrentStep('transcribe')}
                  onNotify={addToast}
                />
              )}

              {currentStep === 'live' && (
                <LiveView
                  reviewer={reviewer}
                  onBackToWorkflow={() => setCurrentStep('upload')}
                  onLoadLiveRecording={handleLoadLiveRecording}
                  onNotify={addToast}
                />
              )}

              {currentStep === 'history' && (
                <HistoryView
                  reviewer={reviewer}
                  onNavigate={(step) => setCurrentStep(step)}
                  onSelectSession={handleSelectSession}
                  onNotify={addToast}
                />
              )}
            </div>

            {/* Site Footer */}
            <Footer
              onOpenAbout={() => setShowAbout(true)}
              onOpenHowItWorks={() => setShowHowItWorks(true)}
            />
          </>
        )}
      </main>

      {/* Diagnostics Modal */}
      <DiagnosticsModal
        isOpen={showDiagnostics}
        onClose={() => setShowDiagnostics(false)}
      />

      {/* Global Accessible Notification Toasts */}
      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
