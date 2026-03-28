import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { testRunnerAPI } from '../services/api';
import {
  PlayIcon,
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface TestFile {
  name: string;
  path: string;
  category: string;
  description: string;
}

interface TestRun {
  id: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  output: string;
  startTime: string;
  endTime?: string;
  testFile?: string;
  testPattern?: string;
}

const TestRunnerPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [testPattern, setTestPattern] = useState<string>('');
  const [selectedRun, setSelectedRun] = useState<TestRun | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const testPatternInputId = 'test-runner-pattern';

  const canAccessTests = user?.role === 'SUPER_ADMIN';

  // Fetch available test files
  const { data: testFiles = [], isLoading: filesLoading } = useQuery<TestFile[]>(
      'test-files',
      async () => {
      const response = await testRunnerAPI.getFiles();
      return response.data.data || [];
    },
    {
      enabled: canAccessTests,
      retry: 1,
      onError: (err) => console.error('Test files fetch failed:', err),
    }
  );

  // Fetch test runs
  const { data: testRuns = [], refetch: refetchRuns } = useQuery<TestRun[]>(
      'test-runs',
      async () => {
      const response = await testRunnerAPI.getRuns();
      return response.data.data || [];
    },
    {
      enabled: canAccessTests,
      refetchInterval: autoRefresh ? 3000 : false, // Auto-refresh every 3 seconds
      retry: 1,
      onError: (err) => console.error('Test runs fetch failed:', err),
    }
  );

  // Start test run mutation
  const startTestMutation = useMutation(
    async (data: { testFile: string; testPattern?: string }) => {
      const response = await testRunnerAPI.startRun(data);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('test-runs');
        // Auto-select the new run
        setTimeout(() => {
          refetchRuns();
        }, 1000);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to start test run');
      },
    }
  );

  // Delete test run mutation
  const deleteTestMutation = useMutation(
    async (runId: string) => {
      await testRunnerAPI.deleteRun(runId);
    },
    {
      onSuccess: () => {
        toast.success('Test run deleted');
        queryClient.invalidateQueries('test-runs');
        if (selectedRun && testRuns.find(r => r.id === selectedRun.id)) {
          setSelectedRun(null);
        }
      },
      onError: () => {
        toast.error('Failed to delete test run');
      },
    }
  );

  // Bulk cleanup mutation
  const bulkCleanupMutation = useMutation(
    async () => {
      await testRunnerAPI.cleanupRuns();
    },
    {
      onSuccess: () => {
        toast.success('Completed test runs cleared');
        queryClient.invalidateQueries('test-runs');
        setSelectedRun(null);
      },
      onError: () => {
        toast.error('Failed to clear test runs');
      },
    }
  );

  const handleStartTest = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one test file');
      return;
    }

    toast.success(`Starting ${selectedFiles.length} test suite${selectedFiles.length !== 1 ? 's' : ''}...`);

    // Run tests sequentially
    selectedFiles.forEach((testFile, index) => {
      setTimeout(() => {
        startTestMutation.mutate({
          testFile,
          testPattern: testPattern || undefined,
        });
      }, index * 500); // Stagger by 500ms to avoid race conditions
    });

    // Clear selections after queuing all tests
    setTimeout(() => {
      setSelectedFiles([]);
      setTestPattern('');
    }, selectedFiles.length * 500 + 500);
  };

  const toggleFileSelection = (filePath: string) => {
    setSelectedFiles(prev =>
      prev.includes(filePath)
        ? prev.filter(f => f !== filePath)
        : [...prev, filePath]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(testFiles.map(f => f.path));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const handleViewRun = async (runId: string) => {
    try {
      const response = await testRunnerAPI.getRun(runId);
      setSelectedRun(response.data.data);
    } catch {
      toast.error('Failed to fetch test run details');
    }
  };

  // Group test files by category
  const groupedFiles = testFiles.reduce((acc, file) => {
    if (!acc[file.category]) {
      acc[file.category] = [];
    }
    acc[file.category].push(file);
    return acc;
  }, {} as Record<string, TestFile[]>);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <ArrowPathIcon className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case 'queued':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'running':
        return <span className={`${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}>Running</span>;
      case 'completed':
        return <span className={`${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`}>Completed</span>;
      case 'failed':
        return <span className={`${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`}>Failed</span>;
      case 'queued':
        return <span className={`${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`}>Queued</span>;
      default:
        return <span className={`${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200`}>Unknown</span>;
    }
  };

  if (!canAccessTests) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            Access Denied
          </h2>
          <p className="text-red-800 dark:text-red-200">
            Host-level test execution is restricted to super administrators. Use the separate UAT IDs page for tenant-scoped manual validation identifiers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cgr-page-container p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BeakerIcon className="h-8 w-8 text-blue-600" />
            Test Runner
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Execute and monitor E2E test suites
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Auto-refresh
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Test Selection & Execution */}
        <div className="space-y-6">
          {/* Test File Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Select Test Suites
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAllFiles}
                  className="text-xs px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearAllFiles}
                  className="text-xs px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mb-3 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {selectedFiles.length} test suite{selectedFiles.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}

            {filesLoading ? (
              <div className="flex items-center justify-center py-12">
                <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedFiles).map(([category, files]) => (
                  <div key={category}>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">
                      {category} Tests
                    </h3>
                    <div className="space-y-2">
                      {files.map((file) => (
                        <label
                          key={file.path}
                          className={`flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                            selectedFiles.includes(file.path)
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedFiles.includes(file.path)}
                            onChange={() => toggleFileSelection(file.path)}
                            className="text-blue-600 focus:ring-blue-500 mt-1 rounded"
                          />
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {file.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {file.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Test Pattern */}
            <div className="mt-4">
              <label htmlFor={testPatternInputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Pattern (optional)
              </label>
              <input
                id={testPatternInputId}
                type="text"
                value={testPattern}
                onChange={(e) => setTestPattern(e.target.value)}
                placeholder="e.g., should create"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Filter tests by name pattern (uses grep -g option)
              </p>
            </div>

            {/* Run Button */}
            <button
              onClick={handleStartTest}
              disabled={selectedFiles.length === 0 || startTestMutation.isLoading}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {startTestMutation.isLoading ? (
                <>
                  <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayIcon className="h-5 w-5" />
                  Run {selectedFiles.length > 0 ? `${selectedFiles.length} Test${selectedFiles.length !== 1 ? 's' : ''}` : 'Tests'}
                </>
              )}
            </button>
          </div>

          {/* Test Output */}
          {selectedRun && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Test Output
                </h2>
                {getStatusBadge(selectedRun.status)}
              </div>

              <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {selectedRun.output || 'Waiting for output...'}
                </pre>
              </div>

              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                <p>Test File: {selectedRun.testFile}</p>
                {selectedRun.testPattern && (
                  <p>Pattern: {selectedRun.testPattern}</p>
                )}
                <p>Started: {new Date(selectedRun.startTime).toLocaleString()}</p>
                {selectedRun.endTime && (
                  <p>Ended: {new Date(selectedRun.endTime).toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Test Run History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Recent Test Runs
            </h2>
            <div className="flex items-center gap-2">
              {testRuns.filter(r => r.status === 'completed' || r.status === 'failed').length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear all completed and failed test runs?')) {
                      bulkCleanupMutation.mutate();
                    }
                  }}
                  disabled={bulkCleanupMutation.isLoading}
                  className="text-xs px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                >
                  Clear Completed
                </button>
              )}
              <button
                onClick={() => refetchRuns()}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {testRuns.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No test runs yet
              </p>
            ) : (
              testRuns.map((run) => (
                <button
                  type="button"
                  key={run.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedRun?.id === run.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleViewRun(run.id)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(run.status)}
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {run.testFile?.split('/').pop() || 'Unknown'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTestMutation.mutate(run.id);
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(run.startTime).toLocaleString()}
                  </div>

                  {run.testPattern && (
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Pattern: {run.testPattern}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestRunnerPage;
