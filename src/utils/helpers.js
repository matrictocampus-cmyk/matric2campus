export function formatDate(dateStr) {
const d = new Date(dateStr)
return d.toLocaleDateString()
}

// Grade-specific subjects
export const grade9Subjects = [
  "English-Home Language",
  "English-First Additional Languange",
  "IsiZulu-Home Language",
  "IsiZulu-First Additional Language",
  "IsiXhosa-Home Language",
  "IsiXhosa-First Additional Language",
  "Afrikaans-Home Language",
  "Afrikaans-First Additional Language",
  "Mathematics",
  "Life Orientation (LO)",
  "Natural Sciences",
  "Social Sciences",
  "Technology",
  "Economic and Management Sciences (EMS)",
  "Arts and Culture",
  "Consumer Studies",
  
];

export const highSchoolSubjects = [
  "English-Home Language",
  "English-First Additional Languange",
  "IsiZulu-Home Language",
  "IsiZulu-First Additional Language",
  "IsiXhosa-Home Language",
  "IsiXhosa-First Additional Language",
  "Afrikaans-Home Language",
  "Afrikaans-First Additional Language",
  "Pure Mathematics",
  "Mathematical Literacy",
  "Life Orientation (LO)",
  "Physical Science",
  "Life Science",
  "Accounting",
  "Business Studies",
  "Economics",
  "History",
  "Geography",
  "Computer Applications Technology (CAT)",
  "Information Technology (IT)",
  "Tourism",
  "Engineering Graphics and Design (EGD)",
  "Economic and Management Science (EMS)",
  "Technology",
  "Arts and Culture",
  "Consumer Studies",
  "Creative Arts / Music / Drama / Visual Arts",
];

// APS mapping
export const grades = [
  { label: "0-29%", level: 1 },
  { label: "30-39%", level: 2 },
  { label: "40-49%", level: 3 },
  { label: "50-59%", level: 4 },
  { label: "60-69%", level: 5 },
  { label: "70-79%", level: 6 },
  { label: "80-100%", level: 7 },
];
