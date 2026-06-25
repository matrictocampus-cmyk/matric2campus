import React, { useState } from 'react'
import Button from '../../components/ui/Button'


export default function Step2Contact({ profile, setProfile }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Contact Information</h2>

      <input
        type="email"
        placeholder="Email Address"
        value={profile.email}
        onChange={(e) => setProfile({...profile, email: e.target.value})}
        className="input w-full"
      />
      <input
        type="text"
        placeholder="Phone Number"
        value={profile.phone}
        onChange={(e) => setProfile({...profile, phone: e.target.value})}
        className="input w-full"
      />
    </div>
  );
}