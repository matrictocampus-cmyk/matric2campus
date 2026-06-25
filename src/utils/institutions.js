// src/utils/institutions.js

/**
 * Example function to fetch eligible institutions based on a profile.
 * Replace the hardcoded data with real API calls if needed.
 */
export async function fetchEligibleInstitutions(profile) {
  // profile can include gradeAverage, preferredField, subjectsMarks, etc.
  // For now we return dummy data for demonstration
  return [
    { id: "inst-1", name: "Tech University", program: "Computer Science" },
    { id: "inst-2", name: "Commerce College", program: "Business Administration" },
    { id: "inst-3", name: "Science Institute", program: "Physics & Chemistry" },
  ];
}
