import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const CohortDataExporter = ({ cohortId, cohortName }) => {
  const [isExporting, setIsExporting] = useState(null);
  const [error, setError] = useState(null);

  const exportData = async (exportType) => {
    setIsExporting(exportType);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('export-cohort-data', {
        body: {
          cohort_id: cohortId,
          export_type: exportType
        }
      });

      if (error) throw error;

      // Create blob and download
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const cleanCohortName = cohortName.replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${cleanCohortName}_${exportType}_${timestamp}.csv`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err) {
      console.error('Export error:', err);
      setError(`Failed to export ${exportType}: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  const exportButtons = [
    {
      type: 'challenges_reflections',
      label: 'Challenges & Reflections',
      description: 'Complete challenge completion data with reflection text',
      icon: '📝'
    },
    {
      type: 'surveys',
      label: 'Survey Data',
      description: 'Pre and post-survey responses with AI usage metrics',
      icon: '📊'
    },
    {
      type: 'analytics',
      label: 'Analytics & Performance',
      description: 'User journey analytics, completion rates, and progress metrics',
      icon: '📈'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Export Cohort Data
        </h3>
        <p className="text-gray-600">
          Download CSV files for <strong>{cohortName}</strong> cohort data
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Export Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {exportButtons.map((button) => (
          <div
            key={button.type}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{button.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">
                  {button.label}
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  {button.description}
                </p>
                <button
                  onClick={() => exportData(button.type)}
                  disabled={isExporting === button.type}
                  className={`
                    w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${isExporting === button.type
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-gray-900 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                    }
                  `}
                >
                  {isExporting === button.type ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Exporting...
                    </div>
                  ) : (
                    <>
                      <svg className="inline w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <div className="flex">
          <svg className="h-5 w-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Export Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Files include complete data for all participants in this cohort</li>
                <li>Reflection text is included where available</li>
                <li>Survey data includes both pre and post-survey responses</li>
                <li>Analytics include completion rates, streaks, and progress metrics</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CohortDataExporter;