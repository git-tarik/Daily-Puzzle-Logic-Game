import React from 'react';

const PrivacyPolicy = () => {
  return (
    <section className="max-w-3xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-3">Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Effective date: February 14, 2026</p>

      <div className="space-y-4 text-sm md:text-base leading-7 text-gray-700 dark:text-gray-200">
        <p>
          Logic Looper collects only the data needed to authenticate users, save gameplay progress, and maintain
          leaderboard functionality.
        </p>
        <p>
          Authentication providers may include Google and Truecaller. Based on the selected method, we may store
          identifiers such as email, Google ID, phone number, and display name.
        </p>
        <p>
          Guest mode stores gameplay information locally in your browser storage and does not require account creation.
        </p>
        <p>
          We use your data to provide login, save streaks/scores, prevent abuse, and improve game quality. We do not sell
          personal data.
        </p>
        <p>
          Data may be processed by trusted infrastructure providers used by this app (for example hosting, database, and
          analytics services).
        </p>
        <p>
          You can request data deletion by contacting the app owner. If you no longer use the service, you may also clear
          local browser storage for guest data removal.
        </p>
        <p>
          For privacy requests, contact: <a className="text-indigo-600 dark:text-indigo-400 underline" href="mailto:support@logiclooper.dev">support@logiclooper.dev</a>
        </p>
      </div>
    </section>
  );
};

export default PrivacyPolicy;
