export const WIZARD_STEPS = [
  {
    id: 'userType',
    question: "What brings you to ilovelawyer today?",
    options: [
      "Individual seeking legal guidance",
      "Business owner or representative",
      "Law student or researcher",
      "Legal professional"
    ]
  },
  {
    id: 'legalArea',
    question: "What type of legal matter are you dealing with?",
    options: [
      "Constitutional Law (Supreme Law, Government Structure, Fundamental Rights)",
      "Civil Law (Family, Property, Contracts, Succession)",
      "Criminal Law (Crimes and Penalties under the Revised Penal Code)",
      "Commercial Law (Business, Insurance, Banking, Corporate Matters)",
      "Labor Law (Employer-Employee Relations, Rights, Standards)",
      "Remedial Law (Rules of Court, Evidence, Procedures)",
      "Taxation Law (Government Revenue Collection)",
      "Special Laws (Republic Acts on Specific Issues (Environment, IP, Cybercrime, etc.))",
      "Islamic Law (Personal/Family/Property Relations for Muslims in the Philippines)",
      "Other legal matter"
    ]
  },
  {
    id: 'consultationHistory',
    question: "Have you consulted with a lawyer about this matter before?",
    options: [
      "No, this is my first time seeking legal help",
      "Yes, I currently have legal representation",
      "Yes, I consulted a lawyer in the past",
      "Looking for a second opinion"
    ]
  },
  {
    id: 'primaryGoal',
    question: "What is your primary goal for this consultation?",
    options: [
      "Understand my legal rights and options",
      "Get help with legal documents",
      "Find legal representation",
      "Resolve a legal dispute",
      "Prevent future legal issues"
    ]
  },
  {
    id: 'urgency',
    question: "How urgent is your legal situation?",
    options: [
      "Immediate - I have a court date or deadline within days",
      "Urgent - Need help within 1-2 weeks",
      "Moderate - Can wait 2-4 weeks",
      "Low - Just gathering information for now"
    ]
  }
];

export const LEGAL_SUB_CATEGORIES: Record<string, string[]> = {
  "Constitutional Law": ["Bill of Rights", "Citizenship", "Election Laws", "Government Powers", "Other"],
  "Civil Law": ["Family Disputes – adoption, annulment, custody, support", "Property Disputes – land titles, real estate, inheritance", "Contracts & Obligations", "Torts & Damages", "Succession & Wills", "Other"],
  "Criminal Law": ["Crimes against Persons (Murder, Homicide, Physical Injuries)", "Crimes against Property (Theft, Robbery)", "Crimes against Chastity", "Drug-related Offenses", "Cybercrime", "Other"],
  "Commercial Law": ["Corporate & Business – incorporation, mergers, contract disputes", "Banking & Finance", "Insurance", "Intellectual Property", "Transportation Law", "Other"],
  "Labor Law": ["Labor Disputes – illegal dismissal, wage disputes, collective bargaining", "Employee Benefits", "Overseas Employment", "Union Matters", "Other"],
  "Remedial Law": ["Litigation – handling civil/criminal cases", "Special Proceedings", "Evidence", "Alternatives to Dispute Resolution", "Other"],
  "Taxation Law": ["Income Tax", "Estate Tax", "VAT & Percentage Tax", "Tax Remedies", "Other"],
  "Special Laws": ["Environmental Law", "Housing & Land Use", "Consumer Protection", "Data Privacy", "Other"],
  "Islamic Law": ["Personal Status", "Inheritance", "Property Relations", "Other"]
};
