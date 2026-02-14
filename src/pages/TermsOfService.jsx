import React from 'react';

const TermsOfService = () => {
  return (
    <section className="max-w-3xl mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-3">Terms of Service</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Effective date: February 14, 2026</p>

      <div className="space-y-4 text-sm md:text-base leading-7 text-gray-700 dark:text-gray-200">
        <p>
          By using Logic Looper, you agree to use the service lawfully and not attempt to abuse, disrupt, or manipulate
          gameplay, scoring, or authentication systems.
        </p>
        <p>
          You are responsible for maintaining the security of your account and any credentials used to access the service.
        </p>
        <p>
          We may suspend or terminate access if fraudulent, abusive, or harmful behavior is detected.
        </p>
        <p>
          The service is provided on an &quot;as is&quot; basis without warranties of uninterrupted availability. We may
          update, modify, or discontinue features at any time.
        </p>
        <p>
          To the maximum extent permitted by law, the service owner is not liable for indirect, incidental, or
          consequential damages arising from use of the platform.
        </p>
        <p>
          Continued use after updates to these terms means you accept the revised terms.
        </p>
        <p>
          For legal inquiries, contact: <a className="text-indigo-600 dark:text-indigo-400 underline" href="mailto:support@logiclooper.dev">support@logiclooper.dev</a>
        </p>
      </div>
    </section>
  );
};

export default TermsOfService;
