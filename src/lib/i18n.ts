export type SupportedLang = 'en' | 'hi' | 'te';

export const LANGUAGE_OPTIONS: Array<{ code: SupportedLang; label: string; nativeLabel: string }> = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' },
];

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrator',
  regional_admin: 'Regional Administrator',
  dept_officer: 'Government Department Officer',
  farmer: 'Farmer',
  citizen: 'Citizen',
  msme_owner: 'MSME Business Owner',
  student_seeker: 'Student / Job Seeker',
  employer: 'Employer',
  training_institution: 'Training Institution',
  public_visitor: 'Public Visitor',
};

interface Dictionary {
  brandTitle: string;
  navOverview: string;
  navSectors: string;
  navImpact: string;
  navOpportunities: string;
  navWorkspace: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  overviewHeading: string;
  sectorsHeading: string;
  aiHeading: string;
  impactHeading: string;
  opportunitiesHeading: string;
  evidenceHeading: string;
  communityHeading: string;
  aboutHeading: string;
  contactHeading: string;
  signIn: string;
  signOut: string;
  openAiAssistant: string;
}

export const TRANSLATIONS: Record<SupportedLang, Dictionary> = {
  en: {
    brandTitle: 'The Rise of New India',
    navOverview: 'Overview',
    navSectors: 'Sectors',
    navImpact: 'Impact',
    navOpportunities: 'Opportunities',
    navWorkspace: 'Workspace',
    heroTitle: 'A unified regional platform for civic trust, rural prosperity, and urban resilience.',
    heroSubtitle:
      'Starting with Indore and Madhya Pradesh, connecting farmers, citizens, MSMEs, students, and civic departments through verifiable records and responsible AI.',
    heroPrimaryCta: 'Enter Regional Workspace',
    heroSecondaryCta: 'Explore Five Sectors',
    overviewHeading: 'Built for district reality, architected for all of Bharat',
    sectorsHeading: 'Five integrated development sectors',
    aiHeading: 'Multilingual AI intelligence with clear human safeguards',
    impactHeading: 'Regional impact and live activity telemetry',
    opportunitiesHeading: 'Skill pathways and regional opportunities',
    evidenceHeading: 'Documented regional frameworks and operational proof',
    communityHeading: 'Participate in your district development cycle',
    aboutHeading: 'About the initiative and DPDP Act 2023 privacy charter',
    contactHeading: 'Contact regional coordination desk',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    openAiAssistant: 'Ask Regional AI',
  },
  hi: {
    brandTitle: 'The Rise of New India',
    navOverview: 'सारांश',
    navSectors: 'क्षेत्र',
    navImpact: 'प्रभाव',
    navOpportunities: 'अवसर',
    navWorkspace: 'कार्यक्षेत्र',
    heroTitle: 'नागरिक विश्वास, ग्रामीण समृद्धि और शहरी सशक्तिकरण का एकीकृत मंच।',
    heroSubtitle:
      'इंदौर और मध्य प्रदेश से शुरुआत करते हुए, किसानों, नागरिकों, MSME उद्यमों, छात्रों और विभागों को पारदर्शी डेटा और जिम्मेदार AI से जोड़ना।',
    heroPrimaryCta: 'क्षेत्रीय कार्यक्षेत्र खोलें',
    heroSecondaryCta: 'पाँच मुख्य क्षेत्र देखें',
    overviewHeading: 'जिला स्तर के लिए निर्मित, संपूर्ण भारत के लिए विस्तार योग्य',
    sectorsHeading: 'पाँच एकीकृत विकास क्षेत्र',
    aiHeading: 'स्पष्ट सुरक्षा मानकों के साथ बहुभाषी AI सहायता',
    impactHeading: 'क्षेत्रीय प्रभाव और वास्तविक गतिविधि डैशबोर्ड',
    opportunitiesHeading: 'कौशल विकास और क्षेत्रीय रोजगार अवसर',
    evidenceHeading: 'प्रलेखित क्षेत्रीय ढांचा और कार्यप्रणाली',
    communityHeading: 'अपने जिले के विकास में सहभागी बनें',
    aboutHeading: 'पहल के बारे में और DPDP अधिनियम 2023 गोपनीयता नीति',
    contactHeading: 'क्षेत्रीय समन्वय डेस्क से संपर्क करें',
    signIn: 'साइन इन करें',
    signOut: 'साइन आउट',
    openAiAssistant: 'क्षेत्रीय AI से पूछें',
  },
  te: {
    brandTitle: 'The Rise of New India',
    navOverview: 'అవలోకనం',
    navSectors: 'రంగాలు',
    navImpact: 'ప్రభావం',
    navOpportunities: 'అవకాశాలు',
    navWorkspace: 'వర్క్‌స్పేస్',
    heroTitle: 'పౌర విశ్వాసం, గ్రామీణ అభ్యున్నతి మరియు నగర స్థిరత్వం కోసం సమగ్ర డిజిటల్ వేదిక.',
    heroSubtitle:
      'ఇండోర్ మరియు మధ్యప్రదేశ్‌తో ప్రారంభమై, రైతులు, పౌరులు, MSMEలు, విద్యార్థులు మరియు ప్రభుత్వ విభాగాలను బాధ్యతాయుతమైన AIతో అనుసంధానిస్తుంది.',
    heroPrimaryCta: 'ప్రాంతీయ వర్క్‌స్పేస్ తెరవండి',
    heroSecondaryCta: 'ఐదు రంగాలను చూడండి',
    overviewHeading: 'జిల్లా స్థాయి అవసరాల కోసం రూపొందించబడింది, భారతదేశమంతటికీ విస్తరించగలదు',
    sectorsHeading: 'ఐదు సమగ్ర అభివృద్ధి రంగాలు',
    aiHeading: 'స్పష్టమైన భద్రతా నియమాలతో బహుభాషా AI సహాయకుడు',
    impactHeading: 'ప్రాంతీయ ప్రభావం మరియు ప్రత్యక్ష డేటా విశ్లేషణ',
    opportunitiesHeading: 'నైపుణ్య అభివృద్ధి మరియు ఉపాధి అవకాశాలు',
    evidenceHeading: 'నమోదు చేయబడిన ప్రాంతీయ పనితీరు ఆధారాలు',
    communityHeading: 'మీ జిల్లా అభివృద్ధిలో భాగస్వాములు కండి',
    aboutHeading: 'ఈ కార్యక్రమం గురించి మరియు DPDP చట్టం 2023 గోప్యతా నియమావళి',
    contactHeading: 'ప్రాంతీయ సమన్వయ డెస్క్‌ను సంప్రదించండి',
    signIn: 'సైన్ ఇన్',
    signOut: 'సైన్ అవుట్',
    openAiAssistant: 'ప్రాంతీయ AIని అడగండి',
  },
};
