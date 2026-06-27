export const SA_SUBJECTS = [
  "Afrikaans Home Language",
  "Afrikaans First Additional Language",
  "English Home Language",
  "English First Additional Language",
  "IsiZulu Home Language",
  "IsiXhosa Home Language",
  "Sesotho Home Language",
  "Setswana Home Language",
  "Sepedi Home Language",
  "Tshivenda Home Language",
  "Xitsonga Home Language",
  "isiNdebele Home Language",
  "SiSwati Home Language",
  "Life Orientation",
  "Mathematics",
  "Mathematical Literacy",
  "Physical Sciences",
  "Life Sciences",
  "History",
  "Geography",
  "Accounting",
  "Business Studies",
  "Economics",
  "Computer Applications Technology",
  "Information Technology",
  "Engineering Graphics and Design",
  "Visual Arts",
  "Dramatic Arts",
  "Music",
  "Dance Studies",
  "Design",
  "Agricultural Sciences",
  "Agricultural Technology",
  "Hospitality Studies",
  "Tourism",
  "Consumer Studies",
  "Civil Technology",
  "Electrical Technology",
  "Mechanical Technology",
  "Technical Mathematics",
  "Technical Sciences",
  "Religion Studies",
];

export const CAREER_INTERESTS = [
  { id: "tech",        label: "Technology & Computers"   },
  { id: "health",      label: "Health & Medicine"         },
  { id: "business",    label: "Business & Finance"        },
  { id: "engineering", label: "Engineering"               },
  { id: "arts",        label: "Arts & Design"             },
  { id: "sciences",    label: "Natural Sciences"          },
  { id: "social",      label: "Education & Social Work"   },
  { id: "law",         label: "Law & Justice"             },
  { id: "agriculture", label: "Agriculture & Environment" },
  { id: "media",       label: "Media & Communications"    },
];

export const SA_UNIVERSITIES = [
  "University of Cape Town (UCT)",
  "University of the Witwatersrand (Wits)",
  "Stellenbosch University",
  "University of Pretoria (UP)",
  "University of KwaZulu-Natal (UKZN)",
  "University of Johannesburg (UJ)",
  "Rhodes University",
  "North-West University (NWU)",
  "University of the Western Cape (UWC)",
  "University of South Africa (UNISA)",
  "University of Limpopo",
  "University of Fort Hare",
  "University of the Free State (UFS)",
  "Walter Sisulu University",
  "Durban University of Technology (DUT)",
  "Tshwane University of Technology (TUT)",
  "Cape Peninsula University of Technology (CPUT)",
  "Vaal University of Technology (VUT)",
  "Central University of Technology (CUT)",
  "Mangosuthu University of Technology (MUT)",
];

export const SA_PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape",
  "Limpopo", "Mpumalanga", "North West", "Free State", "Northern Cape",
];

export const PERSONALITY_TYPES = {
  tech: {
    type: "Innovator",
    emoji: "💡",
    tagline: "You build what others can only imagine.",
    summary: "You are drawn to technology and systems, likely curious, logical, and energised by solving complex problems. Careers in software development, data science, artificial intelligence, cybersecurity, or digital innovation could feel like a natural home. South Africa's tech sector is growing fast, and people who think the way you do are exactly what it needs.",
  },
  engineering: {
    type: "Builder",
    emoji: "🏗️",
    tagline: "You turn ideas into reality.",
    summary: "You enjoy practical challenges and want to see real-world results from your work. Engineering, construction, architecture, manufacturing, mechatronics, or applied technical trades may suit you perfectly. You are at your best when making something tangible, something you can point to and say you built it.",
  },
  health: {
    type: "Healer",
    emoji: "🌿",
    tagline: "You make a direct difference in people's lives.",
    summary: "You care deeply about people's wellbeing and have the patience and empathy to show up for others. Medicine, nursing, physiotherapy, pharmacy, psychology, occupational therapy, or public health could all align with who you are. Your impact is human and immediate, and that is what drives you.",
  },
  sciences: {
    type: "Analyst",
    emoji: "📊",
    tagline: "You need to understand the why behind everything.",
    summary: "You are driven by facts, evidence, and deep understanding. You are not satisfied with surface-level answers. Chemistry, physics, actuarial science, statistics, biotechnology, environmental science, or academic research could be where you truly shine. You see patterns that others miss.",
  },
  business: {
    type: "Strategist",
    emoji: "🎯",
    tagline: "You think three moves ahead.",
    summary: "You think in terms of goals, resources, and results. Likely ambitious and effective with both numbers and people. Business management, finance, economics, marketing, entrepreneurship, accounting, or supply chain management could align well with how your mind works. You are wired to build, grow, and lead.",
  },
  arts: {
    type: "Creator",
    emoji: "🎨",
    tagline: "You see the world differently.",
    summary: "You express ideas in ways others cannot, visually, musically, or through story. You see possibilities where others see blank space. Architecture, graphic design, fashion, film, music production, interior design, game design, or digital media could be where your talent finds its full expression.",
  },
  social: {
    type: "People Person",
    emoji: "🤝",
    tagline: "You lift people up wherever you go.",
    summary: "You connect easily with others and find meaning in helping, teaching, or leading. Patient, empathetic, and energised by human connection. Social work, education, psychology, human resources, counselling, community development, or public service could feel deeply fulfilling for someone with your approach to the world.",
  },
  law: {
    type: "Advocate",
    emoji: "⚖️",
    tagline: "You stand for what is right.",
    summary: "You have a sharp sense of justice and a mind built for argument and logic. Articulate, principled, and persuasive when you believe in something. Law, politics, criminology, human rights, public administration, or policy research could suit you well. You want to change systems, not just work within them.",
  },
  agriculture: {
    type: "Steward",
    emoji: "🌱",
    tagline: "You care for the planet and its people.",
    summary: "You are grounded and connected to the natural world. Agricultural sciences, environmental management, conservation, food technology, or sustainability roles could be a great fit. South Africa needs people who understand land, climate, and food systems, and you could be one of them.",
  },
  media: {
    type: "Storyteller",
    emoji: "✍️",
    tagline: "Your words and ideas move people.",
    summary: "You are creative and expressive, and you know how to capture attention. Journalism, broadcasting, digital marketing, public relations, content creation, film, photography, or advertising could be where you belong. You are not just good with ideas, you know how to share them in ways that resonate.",
  },
  default: {
    type: "Explorer",
    emoji: "🌟",
    tagline: "Your path is wide open, and that is a real advantage.",
    summary: "You keep an open mind and you are willing to discover new things. You have not settled on one path yet, and that is a strength, not a limitation. Consulting, project management, education, interdisciplinary research, or entrepreneurship could all be great fits. The most interesting careers are often found by people who explore widely before committing.",
  },
};

export const SCREEN_PROGRESS = [15, 28, 40, 50, 58, 65, 72, 78, 82, 86, 89, 92, 95, 98, 100];

export function getAchievementLevel(mark) {
  const m = Number(mark);
  if (m >= 80) return { level: 7, color: "#059669" };
  if (m >= 70) return { level: 6, color: "#0284c7" };
  if (m >= 60) return { level: 5, color: "#7c3aed" };
  if (m >= 50) return { level: 4, color: "#d97706" };
  if (m >= 40) return { level: 3, color: "#ea580c" };
  if (m >= 30) return { level: 2, color: "#dc2626" };
  return          { level: 1, color: "#9ca3af" };
}

export function computeAPS(subjectsData) {
  let total = 0;
  for (const s of subjectsData) {
    if (s.subject === "Life Orientation") continue;
    total += getAchievementLevel(s.mark).level;
  }
  return total;
}

export function computePersonality(interests) {
  if (!interests || interests.length === 0) return PERSONALITY_TYPES.default;
  return PERSONALITY_TYPES[interests[0]] ?? PERSONALITY_TYPES.default;
}
