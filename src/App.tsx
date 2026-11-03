import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Stepper } from './components/Stepper';
import { Footer } from './components/Footer';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { UploadView } from './views/UploadView';
import { TranscribeView } from './views/TranscribeView';
import { ReviewView } from './views/ReviewView';
import { ExportView } from './views/ExportView';
import { LiveView } from './views/LiveView';
import { AboutView } from './views/AboutView';
import { HowItWorksView } from './views/HowItWorksView';
import { Correction, Flag, Recording, Segment, SpeakerRoleMapping, Step } from './types';
import { AppStorage } from './services/storage';

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

  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [showAbout, setShowAbout] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

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

  const handleLoadLiveRecording = (rec: Recording, liveSegments: Segment[]) => {
    AppStorage.setRecording(rec);
    AppStorage.setSegments(liveSegments);
    setRecording(rec);
    setSegments(liveSegments);
    setCurrentStep('review');
  };

  const hasRecording = recording !== null;
  const hasTranscript = segments.length > 0;

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
      />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-w-0 max-w-6xl mx-auto px-4 md:px-8 py-4">
        {/* Header with Brand Logo */}
        <Header />

        {/* Takeover Views */}
        {showAbout ? (
          <AboutView onBack={() => setShowAbout(false)} />
        ) : showHowItWorks ? (
          <HowItWorksView onBack={() => setShowHowItWorks(false)} />
        ) : (
          <>
            {/* 4-Step Stepper (hidden if on 'live' mode) */}
            {currentStep !== 'live' && (
              <Stepper
                currentStep={currentStep}
                onSelectStep={(step) => setCurrentStep(step)}
                hasRecording={hasRecording}
                hasTranscript={hasTranscript}
              />
            )}

            {/* Step Views */}
            <div className="flex-1">
              {currentStep === 'upload' && (
                <UploadView
                  reviewer={reviewer}
                  recording={recording}
                  onRecordingChange={handleRecordingChange}
                  onNavigateToTranscribe={() => setCurrentStep('transcribe')}
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
                />
              )}

              {currentStep === 'live' && (
                <LiveView
                  reviewer={reviewer}
                  onBackToWorkflow={() => setCurrentStep('upload')}
                  onLoadLiveRecording={handleLoadLiveRecording}
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
    </div>
  );
};
