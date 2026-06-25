import React, { useState } from 'react'
import Button from '../../components/ui/Button'


export default function Step3Academics({ profile, setProfile }) {
  const grades = ["Grade 9","Grade 10","Grade 11","Matric"];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Education Information</h2>

      <input
        type="text"
        placeholder="School Name"
        value={profile.school}
        onChange={(e) => setProfile({...profile, school: e.target.value})}
        className="input w-full"
      />

      <select
        value={profile.highestGrade}
        onChange={(e) => setProfile({...profile, highestGrade: e.target.value})}
        className="input w-full"
      >
        <option value="">Select Highest Grade</option>
        {grades.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
    </div>
  );
}