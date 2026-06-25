// src/pages/Profile/Step1Personal.jsx
import React, { useState } from 'react';
import Button from '../../components/ui/Button';

export default function Step1Personal({ profile, setProfile }) {
  const provinces = [
    "Eastern Cape","Free State","Gauteng","KwaZulu-Natal",
    "Limpopo","Mpumalanga","Northern Cape","North West","Western Cape"
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Personal Information</h2>

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="First Name"
          value={profile.firstName}
          onChange={(e) => setProfile({...profile, firstName: e.target.value})}
          className="input flex-1"
        />
        <input
          type="text"
          placeholder="Last Name"
          value={profile.lastName}
          onChange={(e) => setProfile({...profile, lastName: e.target.value})}
          className="input flex-1"
        />
      </div>

      <select
        value={profile.province}
        onChange={(e) => setProfile({...profile, province: e.target.value})}
        className="input w-full"
      >
        <option value="">Select Province</option>
        {provinces.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}