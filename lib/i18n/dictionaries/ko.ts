import { en, type Dictionary } from './en';

export const ko: Dictionary<typeof en> = {
  common: {
    notice: '알림',
    ok: '확인',
    cancel: '취소',
    back: '뒤로',
    return: '돌아가기',
    processing: '처리 중...',
    brand: {
      part1: '아이러브',
      part2: '로이어',
    },
  },
  notFound: {
    title: '페이지를 찾을 수 없습니다',
    description: '찾으시는 페이지가 존재하지 않습니다. 페이지가 이동되었거나 삭제되었거나 처음부터 존재하지 않았을 수 있습니다.',
    returnHome: '홈페이지로 돌아가기',
  },
  sidebar: {
    chat: '채팅',
    newChat: '새 채팅',
    search: '검색',
    cases: '사건',
    documents: '문서',
    transcribe: '음성 변환',
    calendar: '캘린더',
    library: '라이브러리',
    bookmarks: '북마크',
    recent: '최근 항목',
    consultations: '상담',
    cases_tab: '사건',
    noRecentConsultations: '최근 상담이 없습니다.',
    noRecentCases: '최근 사건이 없습니다.',
    yourAccount: '내 계정',
    profileSettings: '프로필 설정',
    generalConfig: '일반 설정',
    logOut: '로그아웃',
    closeSidebar: '사이드바 닫기',
  },
  settings: {
    appointmentDefaults: '일정 기본값',
    appointmentDefaultsDesc: '새 일정을 만들 때 기본 소요 시간',
    workingHours: '근무 시간',
    workingHoursDesc: '이 시간 외의 일정은 일정 외로 표시됩니다',
    startOfDay: '시작 시간',
    endOfDay: '종료 시간',
    notifications: '알림',
    emailAlerts: '새 일정에 대한 이메일 알림',
    emailAlertsDesc: '고객이 예약하거나 취소할 때 알림을 받습니다',
    browserNotifications: '브라우저 알림',
    browserNotificationsDesc: '다가오는 일정에 대한 인앱 알림 표시',
    languageAndRegion: '언어 및 지역',
    languageAndRegionDesc: '인터페이스에 사용할 언어',
    saveChanges: '변경사항 저장',
    saved: '저장되었습니다!',
    generalConfigTitle: '일반 설정',
    generalConfigSubtitle: '작업 환경을 사용자에 맞게 설정하세요',
    profileTitle: '프로필 설정',
    profileSubtitle: '계정 및 연결된 서비스를 관리하세요',
    googleConnectedTitle: 'Google 계정이 연결되었습니다',
    googleConnectedDesc: 'Google 캘린더와 Gmail이 이제 연결되었습니다.',
    displayName: '표시 이름',
    emailAddress: '이메일 주소',
    connectedAccounts: '연결된',
    connectedAccountsAccent: '계정',
    connectedAccountsDesc: '외부 서비스를 연결하면 AI 어시스턴트가 캘린더와 이메일에 접근할 수 있습니다.',
    googleCalendarAndGmail: 'Google 캘린더 및 Gmail',
    checking: '확인 중...',
    connected: '연결됨',
    notConnected: '연결되지 않음',
    redirecting: '이동 중...',
    connectGoogle: 'Google 연결',
    googlePermissionDesc: 'Google을 연결하면 AI 어시스턴트가 Gmail에 대한 읽기 권한과 Google 캘린더에 대한 전체 권한을 얻어 귀하를 대신하여 상담을 예약하고 일정을 확인할 수 있습니다. 언제든지 아래 링크에서 접근 권한을 취소할 수 있습니다:',
    googleAccountSettings: 'Google 계정 설정',
  },
  landing: {
    nav: {
      whyChoose: '선택 이유',
      howItWorks: '이용 방법',
      capabilities: '기능',
      resources: '자료실',
      faq: '자주 묻는 질문',
    },
    hero: {
      titlePrefix: '필리핀 법률을',
      titleAccent: 'AI 정밀함',
      titleSuffix: '으로 탐색하세요',
      subtitle: '필리핀 법률을 위해 구축된 AI 기반 법률 지원 서비스.',
      startConsultation: '빠른 상담 시작',
      learnHowItWorks: '이용 방법 알아보기',
    },
    whyChoose: {
      heading: '선택하는 이유',
      headingAccent: 'ilovelawyer?',
      description:
        '전통적인 법률 상담은 단편적이고 불투명할 수 있습니다. ilovelawyer는 정확성이 가장 중요할 때 즉각적이고 전문적인 안내를 제공합니다.',
      items: [
        { title: '24시간 이용 가능', desc: '언제든지 전문적인 안내를 받으세요.' },
        { title: '즉각적인 응답', desc: '최신 법률 코드에 빠르게 접근하세요.' },
        { title: '검증된 지식', desc: '최신 법률 코드와 판례를 기반으로 합니다.' },
        { title: '합리적인 이용료', desc: '합리적인 가격의 전문 법률 안내.' },
      ],
      responseTime: '응답 시간',
      startConsultation: '상담 시작',
    },
    howItWorks: {
      eyebrow: '간단한 절차',
      heading: '이용 방법',
      description: '법률 안내를 받는 것이 이보다 쉬울 수 없습니다. 아래의 간단한 단계를 따라 상담을 시작하세요.',
      steps: [
        { title: '질문하기', desc: '쉬운 말로 법률 질문을 입력하세요.' },
        { title: 'AI 분석', desc: 'AI가 필리핀 법률 코드를 검색합니다.' },
        { title: '안내 받기', desc: '참고 자료가 포함된 법률 정보를 받으세요.' },
        { title: '행동하기', desc: '얻은 통찰력으로 현명한 결정을 내리세요.' },
      ],
    },
    demo: {
      eyebrow: '실시간 미리보기',
      heading: '실제 작동하는 AI 법률 상담',
      description: 'AI가 필리핀 법률을 기반으로 즉각적이고 정확한 법률 안내를 제공하는 방법을 확인하세요.',
      userMessage: '민법상 임대차 계약을 조기에 해지하기 위한 법적 요건은 무엇인가요?',
      aiSummaryLabel: 'AI 요약',
      aiResponse:
        '필리핀 민법, 특히 제1673조에 따르면 임대인은 약정된 기간이 만료되기 전에 임의로 임대차 계약을 해지할 수 없습니다. 모든 해지는 적절한 법적 절차를 따라야 합니다...',
      startYourConsultation: '상담 시작하기',
    },
    capabilities: {
      eyebrow: '강력한 기능',
      heading: '포괄적인 법률 기능',
      description: '필리핀 법률 시스템의 복잡성을 위해 설계된 도구로 여러분에게 힘을 실어드립니다.',
      documentReview: {
        title: '문서',
        titleAccent: '검토',
        desc: 'AI 기반 정밀도로 계약서와 법률 문서를 분석합니다. 잠재적인 법적 위험을 식별하고 규정 준수를 보장합니다.',
        bullets: [
          '계약 분석 및 위험 평가',
          '필리핀 규정 준수 확인',
          '조항별 세부 분석',
          '자동 수정 표시 및 제안',
        ],
        cta: '문서 검토 체험하기',
        analysisComplete: '분석 완료',
      },
      secondary: [
        {
          title: '법률',
          accent: '리서치',
          desc: '공화국법 및 바타스 팜반사의 즉각적인 인용에 접근하세요. AI가 수십 년간의 법률 문서를 즉시 검색합니다.',
          cta: '리서치 시작하기',
        },
        {
          title: '판례',
          accent: '아카이브',
          desc: '대법원 판결에 대한 AI 생성 요약으로 복잡한 판례법을 간소화하여 즉시 접근할 수 있도록 합니다.',
          cta: '판례 자료실 보기',
        },
      ],
    },
    trust: {
      heading: '신뢰와 보안 기반',
      description: '법률 문제는 절대적인 기밀성을 요구합니다. 우리는 데이터 보안과 개인정보 보호를 무엇보다 우선시합니다.',
      readPrivacyPolicy: '개인정보처리방침 보기',
      items: [
        { title: 'AES-256 암호화', desc: '군사급 암호화로 전송 및 저장 중인 모든 데이터를 보호합니다.' },
        { title: '제로 지식 아키텍처', desc: '대화 내용과 문서는 종단 간 암호화됩니다.' },
        { title: '제3자 공유 없음', desc: '명시적 동의 없이는 제3자와 데이터를 공유하지 않습니다.' },
        { title: 'DPA 준수', desc: '2012년 필리핀 개인정보보호법(R.A. 10173)을 완전히 준수합니다.' },
      ],
      badgeText: '고객님의 개인정보 보호가 저희의 최우선 과제입니다. 모든 민감한 정보를 업계 표준 보안으로 보호합니다.',
    },
    resources: {
      badge: '시민 자료실',
      heading: '법률',
      headingAccent: '자료실',
      description: '필리핀의 공식 정부 포털과 검증된 법률 지원 프로그램에 직접 접근하세요.',
      accessPortal: '포털 접속',
      items: [
        {
          title: '관보 (Official Gazette)',
          desc: '새로 제정된 법률, 행정명령, 포고령을 다루는 필리핀 공화국의 공식 저널입니다.',
          badge: '공식',
        },
        {
          title: '필리핀 통합변호사회',
          desc: '공인 변호사, 법률 자료 및 필리핀 법조계에 대한 정보를 찾아보세요.',
          badge: '전문가',
        },
        {
          title: '증권거래위원회',
          desc: '필리핀 내 금융 서비스 산업에 대한 감독 및 규제를 담당합니다.',
          badge: '공식',
        },
      ],
    },
    faq: {
      eyebrow: '자주 묻는 질문',
      heading: '자주 묻는 질문',
      items: [
        {
          question: 'ilovelawyer가 정식 변호사를 대체할 수 있나요?',
          answer:
            '아니요, ilovelawyer는 리서치와 문서 검증을 지원하도록 설계된 AI 법률 정보 도구입니다. 공화국법, 바타스 팜반사, 각종 법전 및 판례를 기반으로 정보를 제공합니다. 민감한 법률 문제의 경우 필리핀 통합변호사회(IBP) 회원과 상담하는 것을 강력히 권장합니다.',
        },
        {
          question: 'AI의 지식 기반에는 어떤 필리핀 법률이 포함되어 있나요?',
          answer:
            '저희 지식 기반에는 민법, 개정형법, 가족법, 노동법 및 최신 공개 기록까지의 수천 건의 대법원 판결이 포함되어 있습니다.',
        },
        {
          question: '제가 공유하는 정보는 얼마나 안전한가요?',
          answer:
            '업계 표준 AES-256 암호화를 사용하며 엄격한 개인정보보호법(R.A. 10173) 지침을 준수하여 정보의 기밀성을 보장합니다.',
        },
        {
          question: 'AI가 진술서와 같은 법률 문서 초안 작성을 도와줄 수 있나요?',
          answer:
            '네, ilovelawyer는 일반적인 법률 문서의 템플릿과 초안을 제공할 수 있으며, 이후 정식 전문가와 함께 검토하는 것이 좋습니다.',
        },
        {
          question: 'ilovelawyer 이용에 비용이 드나요?',
          answer: '무료 기본 이용과 고급 리서치 및 문서 검토 기능을 위한 프리미엄 구독 등급을 모두 제공합니다.',
        },
      ],
    },
    footer: {
      tagline: '필리핀 법률을 위해 구축된 AI 기반 법률 지원 서비스.',
      legal: '법적 고지',
      privacyPolicy: '개인정보처리방침',
      termsOfService: '이용약관',
      ethicalAiCharter: '윤리적 AI 헌장',
      compliance: '컴플라이언스',
      followUs: '팔로우하기',
      builtFor: '필리핀 법률을 위해 제작됨',
      allRightsReserved: '모든 권리 보유.',
    },
  },
  auth: {
    login: {
      title: '보안 로그인',
      subtitle: '법률 AI 상담 플랫폼에 접속하세요',
      emailLabel: '이메일 주소',
      emailPlaceholder: 'your.email@example.com',
      passwordLabel: '비밀번호',
      passwordPlaceholder: '비밀번호를 입력하세요',
      forgotPassword: '비밀번호를 잊으셨나요?',
      verifying: '자격 증명 확인 중...',
      submit: '로그인',
      newToPlatform: '처음 방문하셨나요?',
      signUpHere: '여기서 가입하기',
      privacyStandards: '개인정보 보호 기준',
      agreePrefix: '로그인하면 다음에 동의하는 것으로 간주됩니다:',
      legalTerms: '이용약관',
      and: '및',
      dataPrivacyPolicy: '개인정보처리방침',
      googleCancelled: 'Google 로그인이 취소되었습니다.',
      googleFailed: 'Google 로그인에 실패했습니다. 다시 시도해 주세요.',
      signInFailed: '로그인에 실패했습니다',
      genericError: '로그인 중 오류가 발생했습니다',
    },
    signup: {
      title: '계정 생성',
      subtitle: '지능형 법률 지원을 이용하려면 계정을 설정하세요.',
      fullNameLabel: '이름',
      fullNamePlaceholder: '이름을 입력하세요',
      emailLabel: '이메일 주소',
      emailPlaceholder: 'you@example.com',
      passwordLabel: '비밀번호',
      passwordPlaceholder: '안전한 비밀번호를 만드세요',
      confirmPasswordLabel: '비밀번호 확인',
      confirmPasswordPlaceholder: '비밀번호를 다시 입력하세요',
      passwordsNoMatch: '비밀번호가 일치하지 않습니다',
      emailTaken: '이미 등록된 이메일입니다. 로그인해 주세요.',
      signUpFailed: '회원가입에 실패했습니다',
      genericError: '회원가입 중 오류가 발생했습니다',
      agreePrefix: '다음에 동의합니다:',
      terms: '이용약관',
      and: '및',
      privacyPolicy: '개인정보처리방침',
      readBothTooltip: '먼저 이용약관과 개인정보처리방침을 모두 읽고 스크롤해 주세요',
      readBothDocuments: '계속하려면 두 문서를 모두 읽어주세요',
      creatingAccount: '계정 생성 중...',
      createAccount: '계정 생성',
      alreadyAuthorized: '이미 계정이 있으신가요?',
      signIn: '로그인',
    },
    forgotPassword: {
      title: '비밀번호 재설정',
      subtitle: '비밀번호를 재설정하려면 이메일 주소를 입력하세요.',
      emailLabel: '이메일 주소',
      emailPlaceholder: 'name@gmail.com',
      ratifying: '요청 처리 중...',
      sendResetLink: '비밀번호 재설정 링크 보내기',
      rememberedPassword: '비밀번호가 기억나셨나요?',
      signIn: '로그인',
      protocolInitiated: '요청이 접수되었습니다',
      sentInstructionsPrefix: '복구 안내를 다음 주소로 전송했습니다:',
      sentInstructionsSuffix: '받은편지함을 확인해 주세요.',
      transmissionIssues: '메일을 받지 못하셨나요?',
      checkSpam: '스팸 폴더를 확인해 주세요.',
      waitBeforeRetry: '다시 시도하기 전에 1분 정도 기다려 주세요.',
      retryAlternative: '다른 이메일로 다시 시도',
      returnToAuthenticator: '로그인 화면으로 돌아가기',
      returnToLogin: '로그인으로 돌아가기',
      failedToSend: '재설정 이메일 전송에 실패했습니다',
      genericError: '예기치 않은 오류가 발생했습니다. 다시 시도해 주세요.',
    },
    updatePassword: {
      title: '비밀번호 변경',
      subtitle: '새 비밀번호로 계정을 보호하세요',
      newPasswordLabel: '새 비밀번호',
      newPasswordPlaceholder: '새 비밀번호를 입력하세요',
      updating: '변경 중...',
      submit: '비밀번호 변경',
      updated: '비밀번호가 변경되었습니다',
      updatedDesc: '비밀번호가 성공적으로 변경되었습니다. 로그인 화면으로 이동합니다...',
      secureUpdate: '보안 업데이트',
      failedToUpdate: '비밀번호 변경에 실패했습니다',
      genericError: '비밀번호 변경 중 오류가 발생했습니다',
      returnToLogin: '로그인으로 돌아가기',
    },
    logout: {
      logout: '로그아웃',
      confirmTitle: '로그아웃 확인',
      confirmDesc: '정말 로그아웃하시겠습니까? 상담 내역과 법률 문서에 접근하려면 다시 로그인해야 합니다.',
      confirm: '로그아웃 확인',
      signingOut: '로그아웃 중...',
      signingOutDesc: '법률 세션을 안전하게 종료하는 중입니다.',
    },
    loading: {
      checkingSession: '세션 확인 중...',
    },
    googleConnect: {
      badge: '캘린더 접근 권한 필요',
      title: 'Google 캘린더 연결',
      desc: '일정을 예약하거나 관리하려면 캘린더 접근 권한을 허용해 주세요.',
      linkAccount: '계정 연결',
      doneConnecting: '연결이 완료되었나요?',
      connectedSuccessfully: '연결이 완료되었습니다',
    },
    googleButton: {
      redirecting: '이동 중...',
      continueWithGoogle: 'Google로 계속하기',
    },
    signupSuccess: {
      title: '가입해 주셔서 감사합니다!',
      checkEmail: '이메일을 확인하여 인증하세요',
      descPrefix: '다음 주소로 인증 링크를 보냈습니다:',
      descSuffix: '받은편지함(및 스팸 폴더)을 확인하여 계정을 활성화해 주세요.',
      goToLogin: '로그인하러 가기',
    },
    errorPage: {
      title: '문제가 발생했습니다.',
      codeErrorPrefix: '오류 코드:',
      unspecified: '알 수 없는 오류가 발생했습니다.',
    },
  },
  legal: {
    common: {
      lastUpdatedLabel: '최종 업데이트:',
      lastUpdatedDate: '2026년 6월 1일',
      scrollToAcknowledge: '끝까지 스크롤하면 확인 처리됩니다',
      readSuffix: '읽음',
      iHaveReadThis: '확인했습니다',
    },
    modalTitles: {
      terms: '이용약관',
      privacy: '개인정보처리방침',
      ethicalAi: '윤리적 AI 헌장',
      compliance: '컴플라이언스',
    },
    terms: {
      intro:
        '이 이용약관은 Law-PH가 운영하는 ilovelawyer 플랫폼에 대한 귀하의 접근 및 이용을 규율합니다. 계정을 생성함으로써 귀하는 본 약관을 읽고, 이해했으며, 이에 구속되는 것에 동의함을 확인하는 것입니다.',
      sections: [
        {
          title: '서비스의 성격',
          blocks: [
            { kind: 'p', text: 'ilovelawyer는 사용자가 법률 개념을 이해하고, 문서를 작성하며, 필리핀의 법적 절차를 탐색할 수 있도록 돕기 위해 설계된 AI 기반 법률 지원 플랫폼입니다. 본 플랫폼은 정보 제공 및 관리 도구로서만 사용하도록 의도되었습니다.', items: [], emphasis: false },
            { kind: 'p', text: 'ilovelawyer는 법률 자문을 제공하지 않으며, 변호사-의뢰인 관계를 형성하지 않고, 정식 변호사와의 상담을 대체하지 않습니다. 귀하의 법적 권리에 영향을 미칠 수 있는 사안에 대해서는 항상 자격을 갖춘 변호사와 상담하시기 바랍니다.', items: [], emphasis: true },
          ],
        },
        {
          title: '이용 자격',
          blocks: [
            { kind: 'p', text: '본 플랫폼을 이용하려면 만 18세 이상이어야 하며 구속력 있는 계약을 체결할 능력이 있어야 합니다. 등록함으로써 귀하는 이러한 요건을 충족함을 진술하고 보증합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '사용자 계정',
          blocks: [
            { kind: 'p', text: '귀하는 계정 자격 증명의 기밀성을 유지하고 귀하의 계정에서 발생하는 모든 활동에 대해 책임을 집니다. 계정의 무단 사용을 발견한 경우 즉시 당사에 통지해야 합니다.', items: [], emphasis: false },
            { kind: 'p', text: '귀하는 계정 생성 시 정확하고 완전한 정보를 제공하고 이를 최신 상태로 유지하는 데 동의합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '허용되는 이용',
          blocks: [
            { kind: 'p', text: '귀하는 다음의 목적으로 플랫폼을 이용하지 않을 것에 동의합니다:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              '불법적이거나 유해하거나 사기성 콘텐츠를 업로드 또는 전송하는 행위',
              '다른 사용자 계정이나 시스템 인프라에 무단으로 접근을 시도하는 행위',
              '서비스를 이용하여 타인을 괴롭히거나 위협하거나 기만하는 행위',
              '플랫폼 또는 그 AI 시스템을 리버스 엔지니어링, 스크래핑, 악용하는 행위',
              '적용 가능한 필리핀 또는 국제 법률을 위반하는 행위',
            ], emphasis: false },
          ],
        },
        {
          title: 'AI 생성 콘텐츠에 관한 면책조항',
          blocks: [
            { kind: 'p', text: 'AI가 생성한 응답에는 오류, 누락 또는 오래된 정보가 포함될 수 있습니다. 본 플랫폼은 AI가 생성한 콘텐츠의 정확성, 완전성 또는 목적 적합성에 대해 어떠한 보증도 하지 않습니다. 귀하는 플랫폼이 제공하는 정보에 따라 행동한 결과에 대한 전적인 책임을 집니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '지적 재산권',
          blocks: [
            { kind: 'p', text: '사용자가 제출한 콘텐츠를 제외한 모든 플랫폼 소프트웨어, 디자인, 브랜딩 및 콘텐츠는 Law-PH의 독점적 자산이며 관련 지적재산권법에 의해 보호됩니다. 서면 허가 없이 이를 복제, 배포하거나 2차적 저작물을 작성할 수 없습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '계정 해지',
          blocks: [
            { kind: 'p', text: '당사는 본 약관을 위반하거나 플랫폼, 다른 사용자 또는 제3자에게 해를 끼치는 행위에 대해 사전 통지 여부와 관계없이 언제든지 귀하의 계정을 정지하거나 해지할 권리를 보유합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '책임의 제한',
          blocks: [
            { kind: 'p', text: '법이 허용하는 최대 범위 내에서, Law-PH는 그러한 손해의 가능성에 대해 사전에 고지받았다 하더라도, 귀하의 플랫폼 이용 또는 이용 불가로 인해 발생하는 간접적, 부수적, 특별 또는 결과적 손해에 대해 책임을 지지 않습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '본 약관의 변경',
          blocks: [
            { kind: 'p', text: '당사는 수시로 본 약관을 업데이트할 수 있습니다. 변경 사항이 게시된 후에도 플랫폼을 계속 이용하는 것은 변경된 약관에 대한 동의로 간주됩니다. 당사는 중대한 변경 사항이 있을 경우 이메일 또는 인앱 알림을 통해 등록된 사용자에게 통지합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '준거법',
          blocks: [
            { kind: 'p', text: '본 약관은 필리핀 공화국의 법률에 따라 규율되고 해석됩니다. 모든 분쟁은 메트로 마닐라 법원의 전속 관할에 따릅니다.', items: [], emphasis: false },
          ],
        },
      ],
    },
    privacy: {
      intro:
        '본 개인정보처리방침은 귀하가 ilovelawyer 플랫폼을 이용할 때 Law-PH가 귀하의 개인정보를 수집, 이용, 저장 및 보호하는 방식을 설명합니다. 당사는 2012년 필리핀 개인정보보호법(공화국법 제10173호) 및 그 시행규칙에 따라 귀하의 개인정보를 보호할 것을 약속합니다.',
      sections: [
        {
          title: '수집하는 정보',
          blocks: [
            { kind: 'p', text: '귀하가 직접 제공하는 정보:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              '등록 시 성명 및 이메일 주소',
              '플랫폼을 통해 업로드하거나 제출하는 메시지, 문서 및 파일',
              '플랫폼 내에서 작성하는 사건 세부정보, 메모 및 기타 콘텐츠',
              '음성 변환을 위해 제출하는 오디오 녹음',
            ], emphasis: false },
            { kind: 'p', text: '자동으로 수집되는 정보:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              '브라우저 유형, 기기 유형 및 운영체제',
              'IP 주소 및 대략적인 지리적 위치',
              '방문한 페이지, 사용한 기능 및 활동 시각',
              '인증 세션 토큰',
            ], emphasis: false },
          ],
        },
        {
          title: '정보 이용 방법',
          blocks: [
            { kind: 'p', text: '당사는 다음 목적으로만 귀하의 데이터를 처리합니다:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'ilovelawyer 플랫폼 기능의 제공 및 개인화',
              'AI 엔진을 통한 문의 처리 및 응답 생성',
              '귀하의 계정에 사건, 문서 및 녹취록 저장',
              '계정 관련 알림 및 보안 경고 발송',
              '기술적 문제 진단 및 플랫폼 성능 개선',
              '법적 의무 준수 및 적법한 요청에 대한 대응',
            ], emphasis: false },
            { kind: 'p', text: '당사는 마케팅 목적으로 귀하의 개인정보를 제3자에게 판매, 대여 또는 거래하지 않습니다.', items: [], emphasis: true },
          ],
        },
        {
          title: '데이터 저장 및 보안',
          blocks: [
            { kind: 'p', text: '귀하의 데이터는 안전한 클라우드 인프라(업로드된 파일의 경우 AWS S3 포함)에 저장됩니다. 당사는 다음을 포함한 업계 표준 보안 조치를 시행합니다:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              '전송 중 데이터 암호화(TLS/HTTPS)',
              '저장된 민감 데이터의 암호화',
              '해시 및 솔트 처리된 비밀번호 저장 — 비밀번호를 평문으로 저장하지 않습니다',
              '데이터 접근 권한을 제한하는 역할 기반 접근 제어',
              '세션 만료 및 안전한 토큰 처리',
            ], emphasis: false },
            { kind: 'p', text: '당사는 합리적인 모든 예방 조치를 취하지만, 어떠한 시스템도 보안 위험으로부터 완전히 자유로울 수는 없습니다. 강력하고 고유한 비밀번호를 사용하고 공용 기기 이용 시 로그아웃할 것을 권장합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '제3자 서비스',
          blocks: [
            { kind: 'p', text: '당사는 플랫폼 운영을 위해 다음을 포함한 신뢰할 수 있는 제3자 서비스를 이용합니다:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              'AWS(Amazon Web Services) — 클라우드 저장 및 AI 음성 변환',
              'Anthropic Claude API — 법률 문의 응답을 생성하는 AI 언어 모델',
              'Google OAuth — Google 계정을 통한 선택적 로그인',
              'Supabase / PostgreSQL — 안전한 데이터베이스 인프라',
            ], emphasis: false },
            { kind: 'p', text: '이러한 제공업체는 자체 개인정보처리방침 및 데이터 처리 계약의 적용을 받습니다. 당사는 각 서비스가 기능하는 데 필요한 최소한의 데이터만 공유합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '개인정보보호법에 따른 귀하의 권리',
          blocks: [
            { kind: 'p', text: 'RA 10173에 따른 정보주체로서 귀하는 다음의 권리를 가집니다:', items: [], emphasis: false },
            { kind: 'list', text: '', items: [
              '접근권 — 당사가 보유한 귀하의 개인정보 사본 요청',
              '정정권 — 부정확하거나 불완전한 데이터의 정정 요청',
              '삭제권 — 계정 및 관련 데이터의 삭제 요청',
              '이의제기권 — 특정 상황에서 데이터 처리에 대한 이의 제기',
              '이동권 — 구조화되고 기계 판독이 가능한 형식의 데이터 사본 요청',
              '불만제기권 — 국가개인정보보호위원회(NPC)에 불만 제기',
            ], emphasis: false },
            { kind: 'p', text: '이러한 권리를 행사하려면 privacy@ilovelawyer.com으로 문의하시기 바랍니다. 영업일 기준 15일 이내에 응답해 드립니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '데이터 보관',
          blocks: [
            { kind: 'p', text: '당사는 귀하의 계정이 활성 상태인 동안 계정 데이터를 보관합니다. 계정을 삭제하는 경우, 법률에 따라 보관이 요구되거나 정당한 사업상 목적(예: 사기 방지 기록)이 있는 경우를 제외하고 30일 이내에 귀하의 개인정보를 삭제합니다.', items: [], emphasis: false },
            { kind: 'p', text: '업로드된 오디오 파일 및 녹취록은 귀하가 계정에서 삭제하거나 계정을 완전히 삭제할 때까지 보관됩니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '아동의 개인정보 보호',
          blocks: [
            { kind: 'p', text: '본 플랫폼은 만 18세 미만을 대상으로 하지 않습니다. 당사는 미성년자로부터 고의로 개인정보를 수집하지 않습니다. 미성년자가 당사에 개인정보를 제공했다고 판단되는 경우, 삭제 조치를 취할 수 있도록 즉시 당사에 연락해 주시기 바랍니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '본 방침의 변경',
          blocks: [
            { kind: 'p', text: '당사는 본 개인정보처리방침을 주기적으로 개정할 수 있습니다. 개정 시 위의 "최종 업데이트" 일자를 갱신하고 이메일 또는 인앱 알림을 통해 등록된 사용자에게 통지합니다. 변경 후에도 플랫폼을 계속 이용하는 것은 개정된 방침에 대한 동의로 간주됩니다.', items: [], emphasis: false },
          ],
        },
      ],
    },
    ethicalAi: {
      intro:
        'ilovelawyer는 책임감 있고 투명하며 인간 중심적인 AI에 대한 약속을 바탕으로 구축되었습니다. 본 헌장은 당사의 AI 시스템이 플랫폼 내에서 개발되고 사용되는 방식을 규율하는 원칙을 제시합니다.',
      sections: [
        {
          title: 'AI는 도구일 뿐, 변호사가 아닙니다',
          blocks: [
            { kind: 'p', text: '당사의 AI는 법률 정보를 제공하는 것이지 법률 자문을 제공하는 것이 아닙니다. 이는 변호사-의뢰인 관계를 형성하지 않으며, 어떠한 법적 절차에서도 귀하를 대리할 수 없고, 정식 변호사를 대체하는 용도로 사용되어서는 안 됩니다. 귀하의 법적 권리에 영향을 미치는 결정에 대해서는 항상 자격을 갖춘 변호사와 상담하시기 바랍니다.', items: [], emphasis: false },
          ],
        },
        {
          title: 'AI 결과물의 투명성',
          blocks: [
            { kind: 'p', text: '모든 AI 생성 응답은 그와 같이 명확히 표시됩니다. 해당되는 경우, 플랫폼은 사용자가 독립적으로 정보를 검증할 수 있도록 응답 생성에 사용된 원문서, 판례 참조 또는 법령을 인용합니다.', items: [], emphasis: false },
            { kind: 'p', text: '당사는 AI의 한계를 숨기지 않습니다. 시스템이 확신하지 못하거나 충분한 정보가 없는 경우, 답을 지어내는 대신 그렇다고 밝히도록 설계되어 있습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '정보의 정확성 및 최신성',
          blocks: [
            { kind: 'p', text: '당사의 법률 지식 기반은 관보, 대법원 전자도서관 및 정부 기관 간행물 등 필리핀의 공식 법률 자료를 기반으로 구축되었습니다. 그러나 법률과 판례는 변화합니다. 사용자는 얻은 정보가 자신의 특정 상황에 최신이며 적용 가능한지 확인할 책임이 있습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '비차별',
          blocks: [
            { kind: 'p', text: 'ilovelawyer는 사용자의 배경, 신념 또는 상황과 관계없이 법률 정보에 대한 평등한 접근을 보장하는 데 전념합니다. 당사의 AI는 모든 사용자에게 공정하고 편향 없이 서비스를 제공하도록 설계되었습니다. 당사는 AI 결과물의 차별적 패턴을 적극적으로 모니터링하고 시정합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '인간의 감독',
          blocks: [
            { kind: 'p', text: '본 플랫폼의 AI 상호작용은 품질, 안전 및 법적 정확성을 위한 인간 검토의 대상입니다. 어떠한 AI 시스템도 완전히 자율적이지 않으며, 당사 팀은 시스템의 작동 방식을 지속적으로 감독하고 필요시 개입합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '데이터 최소화',
          blocks: [
            { kind: 'p', text: '당사는 서비스 제공에 필요한 데이터만 수집합니다. AI에 제출된 문의는 응답 생성 및 플랫폼 개선에 사용되며, 제3자에게 판매되거나 광고 목적으로 사용되는 일은 결코 없습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '지속적인 개선',
          blocks: [
            { kind: 'p', text: '당사는 AI 윤리를 일회성 점검이 아닌 지속적인 약속으로 여깁니다. 당사는 정기적으로 시스템을 검토하고, 지식 기반을 업데이트하며, 사용자 피드백에 응답하여 플랫폼이 이를 신뢰하는 사람들에게 정확하고 공정하며 유익하게 유지되도록 합니다.', items: [], emphasis: false },
          ],
        },
      ],
    },
    compliance: {
      intro:
        'ilovelawyer는 적용 가능한 필리핀 법률 및 규정을 완전히 준수하여 운영됩니다. 이 페이지는 플랫폼을 규율하는 법적 프레임워크와 운영자 및 사용자 양측의 책임을 설명합니다.',
      sections: [
        {
          title: '2012년 개인정보보호법(RA 10173)',
          blocks: [
            { kind: 'p', text: '플랫폼이 수집 및 처리하는 모든 개인정보는 공화국법 제10173호 및 그 시행규칙에 따라 처리됩니다. 당사는 모든 데이터 처리 활동에서 투명성, 정당한 목적 및 비례성의 원칙을 준수할 것을 약속합니다.', items: [], emphasis: false },
            { kind: 'p', text: '사용자는 언제든지 자신의 개인정보에 접근, 정정 및 삭제할 권리를 가집니다. 요청은 privacy@ilovelawyer.com으로 보내실 수 있습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '국가개인정보보호위원회(NPC)',
          blocks: [
            { kind: 'p', text: '필리핀에서 운영되는 개인정보 관리자로서, 당사는 개인정보 보호에 관한 모든 NPC 권고, 회람 및 지침을 준수합니다. 사용자는 자신의 개인정보 보호 권리가 침해되었다고 판단되는 경우 NPC에 민원을 제기할 수 있습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '전자상거래법(RA 8792)',
          blocks: [
            { kind: 'p', text: '본 플랫폼에서 이루어지는 모든 전자 거래, 문서 및 계약은 공화국법 제8792호의 적용을 받습니다. ilovelawyer를 통해 이루어진 디지털 기록 및 통신은 본 법에 따라 유효하고 법적 구속력이 있는 것으로 인정됩니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '사이버범죄 방지법(RA 10175)',
          blocks: [
            { kind: 'p', text: '플랫폼에 대한 무단 접근, 사용자 계정의 오용, 또는 공화국법 제10175호에 따른 사이버범죄를 구성하는 모든 행위는 엄격히 금지됩니다. 위반 행위는 관계 당국에 신고됩니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '법률 기술에 관한 IBP 지침',
          blocks: [
            { kind: 'p', text: 'ilovelawyer는 법률 업무를 수행하지 않습니다. 본 플랫폼은 법률 정보 도구이며 법률 서비스에서의 기술 이용에 관해 필리핀 통합변호사회(IBP)가 정한 범위 내에서 운영됩니다. 본 플랫폼을 통해 무단 법률 업무 수행은 발생하지 않습니다.', items: [], emphasis: false },
          ],
        },
        {
          title: 'AI 규제 및 책임 있는 이용',
          blocks: [
            { kind: 'p', text: '당사는 필리핀 및 국제 AI 규제 동향을 모니터링하며 규제 환경이 변화함에 따라 플랫폼을 조정할 것을 약속합니다. 당사는 법률 분야에서의 책임 있는 AI 도입을 지지하며 관련 협의 및 업계 논의에 참여합니다.', items: [], emphasis: false },
          ],
        },
        {
          title: '컴플라이언스 관련 문의',
          blocks: [
            { kind: 'p', text: '컴플라이언스 관련 문의 사항은 compliance@ilovelawyer.com으로 연락해 주시기 바랍니다. 영업일 기준 10일 이내에 응답해 드립니다.', items: [], emphasis: false },
          ],
        },
      ],
    },
  },
};
