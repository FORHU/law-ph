export type Dictionary<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
  ? readonly Dictionary<U>[]
  : { [K in keyof T]: Dictionary<T[K]> };

export const en = {
  common: {
    notice: 'Notice',
    ok: 'OK',
    cancel: 'Cancel',
    back: 'Back',
    return: 'Return',
    processing: 'Processing...',
    brand: {
      part1: 'ilove',
      part2: 'lawyer',
    },
  },
  notFound: {
    title: 'Page Not Found',
    description: "The page you're looking for isn't here. The page may have been moved, deleted, or never existed in the first place.",
    returnHome: 'Return to the Homepage',
  },
  sidebar: {
    chat: 'Chat',
    newChat: 'New Chat',
    search: 'Search',
    cases: 'Cases',
    documents: 'Documents',
    transcribe: 'Transcribe',
    calendar: 'Calendar',
    library: 'Library',
    bookmarks: 'Bookmarks',
    recent: 'RECENT',
    consultations: 'Consultations',
    cases_tab: 'Cases',
    noRecentConsultations: 'No recent consultations.',
    noRecentCases: 'No recent cases.',
    yourAccount: 'Your Account',
    profileSettings: 'Profile Settings',
    generalConfig: 'General Config',
    logOut: 'Log Out',
    closeSidebar: 'Close Sidebar',
  },
  settings: {
    appointmentDefaults: 'Appointment Defaults',
    appointmentDefaultsDesc: 'Default duration when creating a new event',
    workingHours: 'Working Hours',
    workingHoursDesc: 'Events outside these hours will be flagged as off-schedule',
    startOfDay: 'Start of Day',
    endOfDay: 'End of Day',
    notifications: 'Notifications',
    emailAlerts: 'Email alerts for new appointments',
    emailAlertsDesc: 'Get notified when a client books or cancels',
    browserNotifications: 'Browser notifications',
    browserNotificationsDesc: 'Show in-app alerts for upcoming events',
    languageAndRegion: 'Language & Region',
    languageAndRegionDesc: 'Preferred language for the interface',
    saveChanges: 'Save Changes',
    saved: 'Saved!',
    generalConfigTitle: 'General Config',
    generalConfigSubtitle: 'Customize your workspace preferences',
    profileTitle: 'Profile Settings',
    profileSubtitle: 'Manage your account and connected services',
    googleConnectedTitle: 'Google Account Connected',
    googleConnectedDesc: 'Your Google Calendar and Gmail are now linked.',
    displayName: 'Display Name',
    emailAddress: 'Email Address',
    connectedAccounts: 'Connected',
    connectedAccountsAccent: 'Accounts',
    connectedAccountsDesc: 'Link external services to let the AI assistant access your calendar and emails.',
    googleCalendarAndGmail: 'Google Calendar & Gmail',
    checking: 'Checking...',
    connected: 'Connected',
    notConnected: 'Not connected',
    redirecting: 'Redirecting...',
    connectGoogle: 'Connect Google',
    googlePermissionDesc: 'Connecting Google grants the AI assistant read access to your Gmail and full access to your Google Calendar so it can book consultations and check schedules on your behalf. You can revoke access at any time from your',
    googleAccountSettings: 'Google Account settings',
  },
  landing: {
    nav: {
      whyChoose: 'Why Choose',
      howItWorks: 'How It Works',
      capabilities: 'Capabilities',
      resources: 'Resources',
      faq: 'FAQ',
    },
    hero: {
      titlePrefix: 'Navigate',
      titleAccent: 'Philippine Law',
      titleSuffix: 'with AI Precision',
      subtitle: 'AI-powered legal assistance built for Philippine law.',
      startConsultation: 'Start Quick Consultation',
      learnHowItWorks: 'Learn How It Works',
    },
    whyChoose: {
      heading: 'Why Choose',
      headingAccent: 'ilovelawyer?',
      description:
        'Traditional legal consultations can be fragmented and opaque. ilovelawyer provides immediate, professional guidance when precision is paramount.',
      items: [
        { title: '24/7 Availability', desc: 'Professional guidance at any hour.' },
        { title: 'Instant Responses', desc: 'Quick access to current legal codes.' },
        { title: 'Verified Knowledge', desc: 'Based on current legal codes and precedents.' },
        { title: 'Affordable Access', desc: 'Professional legal guidance at an affordable price.' },
      ],
      responseTime: 'Response Time',
      startConsultation: 'Start Consultation',
    },
    howItWorks: {
      eyebrow: 'Simple Process',
      heading: 'How It Works',
      description: 'Getting legal guidance has never been easier. Follow these simple steps to start your consultation.',
      steps: [
        { title: 'Ask Your Question', desc: 'Type your legal question in plain language.' },
        { title: 'AI Analysis', desc: 'Our AI searches through Philippine legal codes.' },
        { title: 'Receive Guidance', desc: 'Receive cited legal information with references.' },
        { title: 'Take Action', desc: 'Use insights to make informed decisions.' },
      ],
    },
    demo: {
      eyebrow: 'Live Preview',
      heading: 'AI Legal Consultation in Action',
      description: 'See how our AI provides instant, accurate legal guidance based on Philippine law.',
      userMessage: 'What are the legal requirements for terminating a lease early under the Civil Code?',
      aiSummaryLabel: 'AI Summary',
      aiResponse:
        'Under the Civil Code of the Philippines, particularly Article 1673, a lessor cannot arbitrarily terminate a lease agreement prior to the expiration of the stipulated period. All terminations must follow proper legal procedures...',
      startYourConsultation: 'Start Your Consultation',
    },
    capabilities: {
      eyebrow: 'POWERFUL FEATURES',
      heading: 'Comprehensive Legal Capabilities',
      description: 'Empowering you with tools designed for the complexities of the Philippine legal system.',
      documentReview: {
        title: 'Document',
        titleAccent: 'Review',
        desc: 'Analyze contracts and legal documents with AI-driven precision. Our system identifies potential legal risks and ensures compliance.',
        bullets: [
          'Contract analysis and risk assessment',
          'Compliance checking with PH regulations',
          'Clause-by-clause breakdown',
          'Automated redlining and suggestions',
        ],
        cta: 'Try Document Review',
        analysisComplete: 'Analysis Complete',
      },
      secondary: [
        {
          title: 'Legal',
          accent: 'Research',
          desc: 'Access instant citations from Republic Acts and Batas Pambansa. Our AI instantly searches decades of legal documentation.',
          cta: 'Start Research',
        },
        {
          title: 'Jurisprudential',
          accent: 'Archives',
          desc: 'Simplify complex case law with AI-generated summaries of landmark SC decisions, making case law immediately accessible.',
          cta: 'Browse Case Library',
        },
      ],
    },
    trust: {
      heading: 'Built on Trust & Security',
      description: 'Legal matters require absolute confidentiality. We prioritize your data security and privacy above all else.',
      readPrivacyPolicy: 'Read Our Privacy Policy',
      items: [
        { title: 'AES-256 Encryption', desc: 'Military-grade encryption protects all your data in transit and at rest.' },
        { title: 'Zero Knowledge Architecture', desc: 'Your conversations and documents are encrypted end-to-end.' },
        { title: 'No Third-Party Sharing', desc: 'We never share your data with third parties without explicit consent.' },
        { title: 'DPA Compliant', desc: 'Fully compliant with the Philippine Data Privacy Act of 2012 (R.A. 10173).' },
      ],
      badgeText: 'Your privacy is our priority. We use industry-standard security to protect all sensitive information.',
    },
    resources: {
      badge: 'Citizen Archives',
      heading: 'Legal',
      headingAccent: 'Resources',
      description: 'Direct access to official government portals and verified legal assistance programs in the Philippines.',
      accessPortal: 'Access Portal',
      items: [
        {
          title: 'Official Gazette',
          desc: 'The official journal of the Republic of the Philippines featuring newly enacted laws, executive orders, and proclamations.',
          badge: 'OFFICIAL',
        },
        {
          title: 'Integrated Bar of the Philippines',
          desc: 'Find accredited lawyers, legal resources, and information about the Philippine legal profession.',
          badge: 'PROFESSIONAL',
        },
        {
          title: 'Security and Exchange Commission',
          desc: 'Responsible for the oversight and regulation of the financial services industry within the Philippines.',
          badge: 'OFFICIAL',
        },
      ],
    },
    faq: {
      eyebrow: 'Common Questions',
      heading: 'Frequently Asked Questions',
      items: [
        {
          question: 'Is ilovelawyer a replacement for a licensed lawyer?',
          answer:
            "No, ilovelawyer is an AI legal information tool designed to assist with research and document verification. It provides information based on Republic Acts, Batas Pambansa, various Codes, and jurisprudence. We strongly recommend consulting with a member of the Integrated Bar of the Philippines (IBP) for sensitive legal matters.",
        },
        {
          question: "Which Philippine laws are included in the AI's knowledge base?",
          answer:
            'Our knowledge base includes the Civil Code, Revised Penal Code, Family Code, Labor Code, and thousands of Supreme Court decisions up to the latest public records.',
        },
        {
          question: 'How secure is the information I share?',
          answer:
            'We use industry-standard AES-256 encryption and follow strict Data Privacy Act (R.A. 10173) guidelines to ensure your information remains confidential.',
        },
        {
          question: 'Can the AI help me draft legal documents like affidavits?',
          answer:
            'Yes, ilovelawyer can provide templates and draft initial versions of common legal documents, which you should then review with a licensed professional.',
        },
        {
          question: 'Is there a cost to use ilovelawyer?',
          answer: 'We offer both free basic access and premium subscription tiers for advanced research and document review capabilities.',
        },
      ],
    },
    footer: {
      tagline: 'AI-powered legal assistance built for Philippine law.',
      legal: 'Legal',
      privacyPolicy: 'Privacy Policy',
      termsOfService: 'Terms of Service',
      ethicalAiCharter: 'Ethical AI Charter',
      compliance: 'Compliance',
      followUs: 'Follow Us',
      builtFor: 'Built for Philippine Law',
      allRightsReserved: 'All rights reserved.',
    },
  },
  auth: {
    login: {
      title: 'Secure Sign In',
      subtitle: 'Access your legal AI consultation platform',
      emailLabel: 'Email Address',
      emailPlaceholder: 'your.email@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      forgotPassword: 'Forgot password?',
      verifying: 'Verifying Credentials...',
      submit: 'Log In',
      newToPlatform: 'New to the platform?',
      signUpHere: 'Sign Up Here',
      privacyStandards: 'Privacy Standards',
      agreePrefix: 'By signing in, you agree to our',
      legalTerms: 'Legal Terms',
      and: '&',
      dataPrivacyPolicy: 'Data Privacy Policy',
      googleCancelled: 'Google sign-in was cancelled.',
      googleFailed: 'Google sign-in failed. Please try again.',
      signInFailed: 'Sign in failed',
      genericError: 'An error occurred during sign in',
    },
    signup: {
      title: 'Create Account',
      subtitle: 'Set up your account to access intelligent legal assistance.',
      fullNameLabel: 'Full Name',
      fullNamePlaceholder: 'Your full name',
      emailLabel: 'Email Address',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Create a secure password',
      confirmPasswordLabel: 'Confirm Password',
      confirmPasswordPlaceholder: 'Confirm your password',
      passwordsNoMatch: 'Passwords do not match',
      emailTaken: 'This email is already registered. Please sign in instead.',
      signUpFailed: 'Sign up failed',
      genericError: 'An error occurred during sign up',
      agreePrefix: 'I agree to the',
      terms: 'Terms',
      and: 'and',
      privacyPolicy: 'Privacy Policy',
      readBothTooltip: 'Please read and scroll through both the Terms and Privacy Policy first',
      readBothDocuments: 'Read both documents to continue',
      creatingAccount: 'Creating Account...',
      createAccount: 'CREATE ACCOUNT',
      alreadyAuthorized: 'Already authorized?',
      signIn: 'Sign in',
    },
    forgotPassword: {
      title: 'Reset Password',
      subtitle: 'Enter your email address to reset your password.',
      emailLabel: 'EMAIL ADDRESS',
      emailPlaceholder: 'name@gmail.com',
      ratifying: 'RATIFYING REQUEST...',
      sendResetLink: 'SEND PASSWORD RESET LINK',
      rememberedPassword: 'Remembered your password?',
      signIn: 'Sign in',
      protocolInitiated: 'Protocol Initiated',
      sentInstructionsPrefix: 'We sent recovery instructions to',
      sentInstructionsSuffix: 'Please check your inbox.',
      transmissionIssues: 'Transmission Issues?',
      checkSpam: 'Check your spam folder.',
      waitBeforeRetry: 'Wait 1 minute before trying again.',
      retryAlternative: 'Retry Alternative Identifier',
      returnToAuthenticator: 'Return to Authenticator',
      returnToLogin: 'Return to login',
      failedToSend: 'Failed to send reset email',
      genericError: 'An unexpected error occurred. Please try again.',
    },
    updatePassword: {
      title: 'Update Password',
      subtitle: 'Secure your account with a new password',
      newPasswordLabel: 'NEW PASSWORD',
      newPasswordPlaceholder: 'Enter your new password',
      updating: 'UPDATING...',
      submit: 'Update Password',
      updated: 'Password Updated',
      updatedDesc: 'Your password has been changed successfully. Redirecting to login...',
      secureUpdate: 'Secure Update',
      failedToUpdate: 'Failed to update password',
      genericError: 'An error occurred during password update',
      returnToLogin: 'Return to login',
    },
    logout: {
      logout: 'Logout',
      confirmTitle: 'Confirm Logout',
      confirmDesc: "Are you sure you want to sign out? You'll need to login again to access your consultations and legal documents.",
      confirm: 'Confirm Logout',
      signingOut: 'Signing out...',
      signingOutDesc: 'Please wait while we secure your legal session.',
    },
    loading: {
      checkingSession: 'Checking session...',
    },
    googleConnect: {
      badge: 'Calendar Access Required',
      title: 'Connect Google Calendar',
      desc: 'To schedule or manage events, please authorize access to your calendar.',
      linkAccount: 'Link Account',
      doneConnecting: 'Done connecting?',
      connectedSuccessfully: "I've Connected Successfully",
    },
    googleButton: {
      redirecting: 'Redirecting...',
      continueWithGoogle: 'Continue with Google',
    },
    signupSuccess: {
      title: 'Thank you for signing up!',
      checkEmail: 'Check your email to confirm',
      descPrefix: "We've sent a verification link to",
      descSuffix: 'Please check your inbox (and spam folder) to activate your account.',
      goToLogin: 'Go to Login',
    },
    errorPage: {
      title: 'Sorry, something went wrong.',
      codeErrorPrefix: 'Code error:',
      unspecified: 'An unspecified error occurred.',
    },
  },
  legal: {
    common: {
      lastUpdatedLabel: 'Last updated:',
      lastUpdatedDate: 'June 1, 2026',
      scrollToAcknowledge: 'Scroll to the bottom to acknowledge',
      readSuffix: 'read',
      iHaveReadThis: 'I have read this',
    },
    modalTitles: {
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      ethicalAi: 'Ethical AI Charter',
      compliance: 'Compliance',
    },
    terms: {
      intro:
        'These Terms of Service govern your access to and use of the ilovelawyer platform operated by Law-PH. By creating an account, you confirm that you have read, understood, and agree to be bound by these terms.',
      sections: [
        {
          title: 'Nature of the Service',
          blocks: [
            { kind: 'p', text: 'ilovelawyer is an AI-powered legal assistance platform designed to help users understand legal concepts, draft documents, and navigate legal processes in the Philippines. The platform is intended as an informational and organizational tool only.', items: [], emphasis: false },
            { kind: 'p', text: 'ilovelawyer does not provide legal advice, does not create an attorney-client relationship, and is not a substitute for consultation with a licensed attorney. Always consult a qualified lawyer for matters that may affect your legal rights.', items: [], emphasis: true },
          ],
        },
        {
          title: 'Eligibility',
          blocks: [
            { kind: 'p', text: 'You must be at least 18 years of age and capable of entering into a binding agreement to use this platform. By registering, you represent and warrant that you meet these requirements.', items: [], emphasis: false },
          ],
        },
        {
          title: 'User Accounts',
          blocks: [
            { kind: 'p', text: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately of any unauthorized use of your account.', items: [], emphasis: false },
            { kind: 'p', text: 'You agree to provide accurate and complete information when creating your account and to keep this information up to date.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Acceptable Use',
          blocks: [
            { kind: 'p', text: 'You agree not to use the platform to:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'Upload or transmit unlawful, harmful, or fraudulent content',
              'Attempt to gain unauthorized access to other user accounts or system infrastructure',
              'Use the service to harass, threaten, or deceive any person',
              'Reverse-engineer, scrape, or exploit the platform or its AI systems',
              'Violate any applicable Philippine or international law',
            ], emphasis: false },
          ],
        },
        {
          title: 'AI-Generated Content Disclaimer',
          blocks: [
            { kind: 'p', text: 'Responses generated by the AI may contain errors, omissions, or outdated information. The platform makes no warranties regarding the accuracy, completeness, or fitness for purpose of any AI-generated content. You assume full responsibility for how you act on information provided by the platform.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Intellectual Property',
          blocks: [
            { kind: 'p', text: 'All platform software, design, branding, and content (excluding user-submitted content) is the exclusive property of Law-PH and is protected under applicable intellectual property laws. You may not reproduce, distribute, or create derivative works without written permission.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Termination',
          blocks: [
            { kind: 'p', text: 'We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that violates these Terms or is otherwise harmful to the platform, other users, or third parties.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Limitation of Liability',
          blocks: [
            { kind: 'p', text: 'To the maximum extent permitted by law, Law-PH shall not be liable for any indirect, incidental, special, or consequential damages arising out of your use of or inability to use the platform, even if we have been advised of the possibility of such damages.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Changes to These Terms',
          blocks: [
            { kind: 'p', text: 'We may update these Terms from time to time. Continued use of the platform after changes are posted constitutes your acceptance of the revised Terms. We will notify registered users of material changes via email or an in-app notice.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Governing Law',
          blocks: [
            { kind: 'p', text: 'These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes shall be subject to the exclusive jurisdiction of the courts of Metro Manila.', items: [], emphasis: false },
          ],
        },
      ],
    },
    privacy: {
      intro:
        'This Privacy Policy explains how Law-PH collects, uses, stores, and protects your personal information when you use the ilovelawyer platform. We are committed to safeguarding your privacy in accordance with the Philippine Data Privacy Act of 2012 (Republic Act No. 10173) and its implementing rules and regulations.',
      sections: [
        {
          title: 'Information We Collect',
          blocks: [
            { kind: 'p', text: 'Information you provide directly:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'Full name and email address when you register',
              'Messages, documents, and files you upload or submit through the platform',
              'Case details, notes, and other content you create within the platform',
              'Audio recordings you submit for transcription',
            ], emphasis: false },
            { kind: 'p', text: 'Information collected automatically:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'Browser type, device type, and operating system',
              'IP address and approximate geographic location',
              'Pages visited, features used, and timestamps of activity',
              'Authentication session tokens',
            ], emphasis: false },
          ],
        },
        {
          title: 'How We Use Your Information',
          blocks: [
            { kind: 'p', text: 'We process your data solely for the following purposes:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'Providing and personalizing the ilovelawyer platform features',
              'Processing your queries through our AI engine to generate responses',
              'Storing your cases, documents, and transcriptions in your account',
              'Sending you account-related notifications and security alerts',
              'Diagnosing technical issues and improving platform performance',
              'Complying with legal obligations and responding to lawful requests',
            ], emphasis: false },
            { kind: 'p', text: 'We do not sell, rent, or trade your personal information to third parties for marketing purposes.', items: [], emphasis: true },
          ],
        },
        {
          title: 'Data Storage and Security',
          blocks: [
            { kind: 'p', text: 'Your data is stored on secure cloud infrastructure (including AWS S3 for uploaded files). We implement industry-standard security measures including:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'Encryption of data in transit (TLS/HTTPS)',
              'Encryption of sensitive data at rest',
              'Hashed and salted password storage — we never store your password in plain text',
              'Role-based access controls limiting who can access your data',
              'Session expiry and secure token handling',
            ], emphasis: false },
            { kind: 'p', text: 'While we take every reasonable precaution, no system is completely immune to security risks. We encourage you to use a strong, unique password and to log out when using shared devices.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Third-Party Services',
          blocks: [
            { kind: 'p', text: 'We use trusted third-party services to operate the platform, including:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'AWS (Amazon Web Services) — cloud storage and AI transcription',
              'Anthropic Claude API — AI language model powering legal query responses',
              'Google OAuth — optional sign-in via Google account',
              'Supabase / PostgreSQL — secure database infrastructure',
            ], emphasis: false },
            { kind: 'p', text: 'These providers are bound by their own privacy policies and data processing agreements. We only share the minimum data necessary for each service to function.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Your Rights Under the Data Privacy Act',
          blocks: [
            { kind: 'p', text: 'As a data subject under RA 10173, you have the right to:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'Access — request a copy of the personal data we hold about you',
              'Correction — request correction of inaccurate or incomplete data',
              'Erasure — request deletion of your account and associated data',
              'Object — object to processing of your data in certain circumstances',
              'Portability — request a structured, machine-readable copy of your data',
              'Complaint — lodge a complaint with the National Privacy Commission (NPC)',
            ], emphasis: false },
            { kind: 'p', text: 'To exercise any of these rights, contact us at privacy@ilovelawyer.com. We will respond within 15 business days.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Data Retention',
          blocks: [
            { kind: 'p', text: 'We retain your account data for as long as your account remains active. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention records).', items: [], emphasis: false },
            { kind: 'p', text: 'Uploaded audio files and transcriptions are retained until you delete them from your account or delete your account entirely.', items: [], emphasis: false },
          ],
        },
        {
          title: "Children's Privacy",
          blocks: [
            { kind: 'p', text: 'The platform is not directed to persons under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal data, please contact us immediately so we may delete it.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Changes to This Policy',
          blocks: [
            { kind: 'p', text: 'We may revise this Privacy Policy periodically. When we do, we will update the "Last Updated" date above and notify registered users via email or an in-app notice. Your continued use of the platform after any changes constitutes acceptance of the revised policy.', items: [], emphasis: false },
          ],
        },
      ],
    },
    ethicalAi: {
      intro:
        'ilovelawyer is built on a commitment to responsible, transparent, and human-centered AI. This charter outlines the principles that govern how our AI systems are developed and used within the platform.',
      sections: [
        {
          title: 'AI as a Tool, Not a Lawyer',
          blocks: [
            { kind: 'p', text: 'Our AI provides legal information — not legal advice. It does not create an attorney-client relationship, cannot represent you in any legal proceeding, and should not be used as a substitute for a licensed attorney. Always consult a qualified lawyer for decisions that affect your legal rights.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Transparency of AI Outputs',
          blocks: [
            { kind: 'p', text: 'Every AI-generated response is clearly labeled as such. Where applicable, the platform cites the source documents, case references, or statutes used to generate a response so users can verify information independently.', items: [], emphasis: false },
            { kind: 'p', text: 'We do not hide the limitations of AI. When the system is uncertain or lacks sufficient information, it is designed to say so rather than fabricate an answer.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Accuracy and Currency of Information',
          blocks: [
            { kind: 'p', text: 'Our legal knowledge base is built from official Philippine legal sources — the Official Gazette, the Supreme Court E-Library, and government agency publications. However, laws and jurisprudence change. Users are responsible for verifying that any information obtained is current and applicable to their specific situation.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Non-Discrimination',
          blocks: [
            { kind: 'p', text: "ilovelawyer is committed to equal access to legal information regardless of a user's background, beliefs, or circumstances. Our AI is designed to serve all users impartially and without bias. We actively monitor and address any discriminatory patterns in AI outputs.", items: [], emphasis: false },
          ],
        },
        {
          title: 'Human Oversight',
          blocks: [
            { kind: 'p', text: 'AI interactions on this platform are subject to human review for quality, safety, and legal accuracy. No AI system is fully autonomous — our team maintains oversight of how the system performs and intervenes when necessary.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Data Minimization',
          blocks: [
            { kind: 'p', text: 'We collect only the data necessary to provide the service. Queries submitted to the AI are used to generate responses and improve the platform — they are never sold to third parties or used for advertising purposes.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Continuous Improvement',
          blocks: [
            { kind: 'p', text: 'We treat AI ethics as an ongoing commitment, not a one-time checklist. We regularly review our systems, update our knowledge base, and respond to user feedback to ensure the platform remains accurate, fair, and beneficial to those who rely on it.', items: [], emphasis: false },
          ],
        },
      ],
    },
    compliance: {
      intro:
        'ilovelawyer operates in full compliance with applicable Philippine laws and regulations. This page outlines the legal framework governing the platform and the responsibilities of both the operator and the user.',
      sections: [
        {
          title: 'Data Privacy Act of 2012 (RA 10173)',
          blocks: [
            { kind: 'p', text: 'All personal data collected and processed by the platform is handled in accordance with Republic Act No. 10173 and its Implementing Rules and Regulations. We are committed to the principles of transparency, legitimate purpose, and proportionality in all data processing activities.', items: [], emphasis: false },
            { kind: 'p', text: 'Users have the right to access, correct, and erase their personal data at any time. Requests may be directed to privacy@ilovelawyer.com.', items: [], emphasis: false },
          ],
        },
        {
          title: 'National Privacy Commission (NPC)',
          blocks: [
            { kind: 'p', text: 'As a personal information controller operating in the Philippines, we comply with all NPC advisories, circulars, and guidelines on data privacy. Users may lodge complaints with the NPC if they believe their data privacy rights have been violated.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Electronic Commerce Act (RA 8792)',
          blocks: [
            { kind: 'p', text: 'All electronic transactions, documents, and agreements on this platform are governed by Republic Act No. 8792. Digital records and communications made through ilovelawyer are recognized as valid and legally binding under this Act.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Cybercrime Prevention Act (RA 10175)',
          blocks: [
            { kind: 'p', text: 'Unauthorized access to the platform, misuse of user accounts, or any activity that constitutes a cybercrime under Republic Act No. 10175 is strictly prohibited. Violations will be reported to the appropriate authorities.', items: [], emphasis: false },
          ],
        },
        {
          title: 'IBP Guidelines on Legal Technology',
          blocks: [
            { kind: 'p', text: 'ilovelawyer does not engage in the practice of law. The platform is a legal information tool and operates within the boundaries set by the Integrated Bar of the Philippines (IBP) regarding the use of technology in legal services. No unauthorized practice of law occurs through this platform.', items: [], emphasis: false },
          ],
        },
        {
          title: 'AI Regulation and Responsible Use',
          blocks: [
            { kind: 'p', text: 'We monitor developments in Philippine and international AI regulation and commit to adapting our platform as the regulatory landscape evolves. We support the responsible deployment of AI in the legal sector and participate in relevant consultations and industry discussions.', items: [], emphasis: false },
          ],
        },
        {
          title: 'Contact for Compliance Concerns',
          blocks: [
            { kind: 'p', text: 'For any compliance-related inquiries, please contact us at compliance@ilovelawyer.com. We will respond within 10 business days.', items: [], emphasis: false },
          ],
        },
      ],
    },
  },
} as const;
