/**
 * Command Palette Onboarding Component
 * First-time user tutorial for command palette features
 */

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  CommandLineIcon,
  MagnifyingGlassIcon,
  RocketLaunchIcon,
  SparklesIcon,
  KeyIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tip: string;
  example?: string;
}

const onboardingSteps: OnboardingStep[] = [
  {
    title: 'Welcome to Command Palette',
    description: 'Navigate and perform actions faster than ever with keyboard shortcuts. Skip the mouse and become a power user!',
    icon: RocketLaunchIcon,
    tip: 'Press Cmd+K (Mac) or Ctrl+K (Windows) to open the command palette anytime.',
    example: '⌘K or Ctrl+K'
  },
  {
    title: 'Search Everything',
    description: 'Type to search across all available commands. Find navigation, actions, and tools instantly.',
    icon: MagnifyingGlassIcon,
    tip: 'Start typing to filter commands. Use keywords like "create", "export", or "score".',
    example: 'Try: "create event" or "export scores"'
  },
  {
    title: 'Keyboard Shortcuts',
    description: 'Many commands have dedicated keyboard shortcuts for even faster access.',
    icon: KeyIcon,
    tip: 'Look for keyboard shortcut hints on the right side of each command.',
    example: '⌘+E to go to Events, ⌘+P for Profile'
  },
  {
    title: 'Context-Aware Commands',
    description: 'The command palette shows relevant commands based on the page you\'re on.',
    icon: SparklesIcon,
    tip: 'Commands change based on context. On the scoring page, you\'ll see scoring-specific actions.',
    example: 'Try opening the palette on different pages!'
  },
  {
    title: 'Favorites & Recent',
    description: 'Your most-used commands and recent selections are highlighted for quick access.',
    icon: CommandLineIcon,
    tip: 'Star your favorite commands to keep them at the top. Recent commands appear automatically.',
    example: 'Click the star icon next to any command'
  }
];

interface CommandPaletteOnboardingProps {
  onComplete: () => void;
  isAuthenticated: boolean;
}

const CommandPaletteOnboarding: React.FC<CommandPaletteOnboardingProps> = ({
  onComplete,
  isAuthenticated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [hasShownAfterLogin, setHasShownAfterLogin] = useState(false);

  useEffect(() => {
    // Only show onboarding after successful login
    if (!isAuthenticated) {
      setHasShownAfterLogin(false);
      return;
    }

    // Check if user has seen onboarding or disabled it
    const hasSeenOnboarding = localStorage.getItem('commandPaletteOnboardingSeen');
    const isDisabled = localStorage.getItem('commandPaletteOnboardingDisabled');

    if (!hasSeenOnboarding && !isDisabled && !hasShownAfterLogin) {
      // Show onboarding after a brief delay following login
      setTimeout(() => {
        setIsOpen(true);
        setHasShownAfterLogin(true);
      }, 1500);
    }
  }, [isAuthenticated, hasShownAfterLogin]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('commandPaletteOnboardingSeen', 'true');
    if (dontShowAgain) {
      localStorage.setItem('commandPaletteOnboardingDisabled', 'true');
    }
    setIsOpen(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('commandPaletteOnboardingSeen', 'true');
    if (dontShowAgain) {
      localStorage.setItem('commandPaletteOnboardingDisabled', 'true');
    }
    setIsOpen(false);
  };

  const step = onboardingSteps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === onboardingSteps.length - 1;

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog onClose={handleSkip} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Dialog panel */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-2xl">
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-4">
                  <Icon className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              {/* Content */}
              <div className="text-center mb-8">
                <Dialog.Title className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {step.title}
                </Dialog.Title>
                <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                  {step.description}
                </p>

                {/* Tip box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                    💡 Pro Tip
                  </p>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {step.tip}
                  </p>
                </div>

                {/* Example */}
                {step.example && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Example
                    </p>
                    <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                      {step.example}
                    </code>
                  </div>
                )}
              </div>

              {/* Progress indicators */}
              <div className="flex justify-center gap-2 mb-8">
                {onboardingSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-8 bg-blue-600'
                        : index < currentStep
                        ? 'w-2 bg-blue-400'
                        : 'w-2 bg-gray-300 dark:bg-gray-600'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>

              {/* Don't show again checkbox */}
              <div className="flex items-center justify-center mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Don't show this again
                  </span>
                </label>
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Skip tutorial
                </button>

                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrevious}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    >
                      <ArrowLeftIcon className="h-4 w-4" />
                      Previous
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {isLastStep ? 'Get Started' : 'Next'}
                    {!isLastStep && <ArrowRightIcon className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Step counter */}
              <div className="text-center mt-4">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of {onboardingSteps.length}
                </p>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CommandPaletteOnboarding;
