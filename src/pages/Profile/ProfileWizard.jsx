// src/pages/Profile/ProfileWizard.jsx - REDESIGNED
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

import Step1Personal from "./Step1Personal";
import Step2Contact from "./Step2Contact";
import Step3Academics from "./Step3Academics";
import Step4Interests from "./Step4Interests";
import Step5Uploads from "./Step5Uploads";
import Step6Review from "./Step6Review";

export default function ProfileWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    province: "",
    school: "",
    highestGrade: "",
    subjectsMarks: {},
    manualResults: "",
  });

  const [sessionUser, setSessionUser] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [progressPercentage, setProgressPercentage] = useState(0);

  const steps = [
    { id: 1, title: "Personal", icon: "👤" },
    { id: 2, title: "Contact", icon: "📱" },
    { id: 3, title: "Education", icon: "🏫" },
    { id: 4, title: "Subjects", icon: "📚" },
    { id: 5, title: "Documents", icon: "📄" },
    { id: 6, title: "Review", icon: "✅" },
  ];

  // Calculate progress based on filled fields
  useEffect(() => {
    let filled = 0;
    const total = 8; // Number of key fields
    
    if (profile.firstName) filled++;
    if (profile.lastName) filled++;
    if (profile.email) filled++;
    if (profile.phone) filled++;
    if (profile.province) filled++;
    if (profile.school) filled++;
    if (profile.highestGrade) filled++;
    if (Object.keys(profile.subjectsMarks).length > 0) filled++;
    
    const percentage = Math.round((filled / total) * 100);
    setProgressPercentage(percentage);
  }, [profile]);

  const nextStep = () => setCurrentStep((s) => Math.min(s + 1, steps.length));
  const prevStep = () => setCurrentStep((s) => Math.max(s - 1, 1));

  // Load session and existing profile
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session ?? null;

        if (!mounted) return;

        if (!session?.user) {
          setLoading(false);
          return;
        }

        setSessionUser(session.user);

        // Fetch existing profile
        const { data: prof, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (error) {
          console.warn("Profile fetch error:", error);
        }

        if (prof) {
          setProfile({
            firstName: prof.first_name || "",
            lastName: prof.last_name || "",
            email: prof.email || "",
            phone: prof.phone || "",
            province: prof.province || "",
            school: prof.school || "",
            highestGrade: prof.highest_grade || "",
            subjectsMarks: prof.subjects_marks || {},
            manualResults: prof.manual_results || "",
          });

          if (prof.is_completed) {
            setSaved(true);
            setCurrentStep(6);
          }
        }
      } catch (err) {
        console.error("init profile error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Handle Submit
  const handleSubmit = async () => {
    setSaveError("");
    setSaveSuccess(false);

    if (!sessionUser?.id) {
      setSaveError("Your session has expired. Please refresh the page and try again.");
      return;
    }

    if (!profile.firstName || !profile.lastName || !profile.email) {
      setSaveError("Please fill in your First Name, Last Name, and Email before saving.");
      setCurrentStep(1);
      return;
    }

    const payload = {
      user_id: sessionUser.id,
      first_name: profile.firstName || null,
      last_name: profile.lastName || null,
      full_name: `${(profile.firstName || "").trim()} ${(profile.lastName || "").trim()}`.trim() || null,
      email: profile.email || null,
      phone: profile.phone || null,
      province: profile.province || null,
      school: profile.school || null,
      highest_grade: profile.highestGrade || null,
      subjects_marks: Object.keys(profile.subjectsMarks || {}).length ? profile.subjectsMarks : null,
      manual_results: profile.manualResults || null,
      is_completed: true,
      updated_at: new Date().toISOString(),
    };

    try {
      setSaving(true);

      const { error } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (error) {
        console.error("Profile save error:", error);
        setSaveError("Could not save your profile. Please try again.");
        return;
      }

      setSaved(true);
      setSaveSuccess(true);
      setCurrentStep(6);

    } catch (err) {
      console.error("Unexpected save error:", err);
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const stepComponents = {
    1: <Step1Personal profile={profile} setProfile={setProfile} />,
    2: <Step2Contact profile={profile} setProfile={setProfile} />,
    3: <Step3Academics profile={profile} setProfile={setProfile} />,
    4: <Step4Interests profile={profile} setProfile={setProfile} />,
    5: <Step5Uploads profile={profile} setProfile={setProfile} onBack={prevStep} />,
    6: <Step6Review profile={profile} setProfile={setProfile} />,
  };

  const handleStepClick = (stepId) => {
    if (stepId <= currentStep || saved) {
      setCurrentStep(stepId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="max-w-4xl mx-auto w-full">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="flex gap-4">
              <div className="h-12 bg-gray-200 rounded w-32"></div>
              <div className="h-12 bg-gray-200 rounded w-32 ml-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Complete Your Profile 📝
              </h1>
              <p className="text-gray-600 mt-2">
                This information helps us personalize your experience and generate your CAO Assistant.
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Skip for now
            </button>
          </div>

          {/* PROGRESS BAR */}
          <div className="bg-white rounded-2xl p-6 shadow border border-gray-100 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Profile Completion</h2>
                <p className="text-sm text-gray-600">
                  Complete your profile to unlock all features
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600">{progressPercentage}%</span>
                <p className="text-sm text-gray-500">Complete</p>
              </div>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            <div className="mt-4 text-sm text-gray-600">
              {progressPercentage < 50 && "Keep going! You're making good progress."}
              {progressPercentage >= 50 && progressPercentage < 100 && "Almost there! Just a few more details."}
              {progressPercentage === 100 && "🎉 Perfect! Your profile is complete."}
            </div>
          </div>
        </div>

        {/* STEPPER */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8">
          {/* STEPPER HEADER */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-xl">{steps[currentStep - 1]?.icon}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Step {currentStep}: {steps[currentStep - 1]?.title}
                  </h2>
                  <p className="text-gray-600 text-sm">
                    {currentStep} of {steps.length} steps
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="bg-green-100 text-green-600 text-sm font-semibold px-3 py-1 rounded-full">
                    ✓ Saved
                  </span>
                )}
                <div className="text-sm text-gray-500">
                  Step <span className="font-bold">{currentStep}</span> of {steps.length}
                </div>
              </div>
            </div>
          </div>

          {/* STEPPER STEPS */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex justify-between relative">
              {steps.map((step, index) => {
                const isCompleted = step.id < currentStep;
                const isCurrent = step.id === currentStep;
                const isUpcoming = step.id > currentStep;
                
                return (
                  <div key={step.id} className="flex flex-col items-center relative z-10">
                    <button
                      onClick={() => handleStepClick(step.id)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-400'
                      } ${isUpcoming ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                      disabled={isUpcoming && !saved}
                    >
                      {isCompleted ? '✓' : step.icon}
                    </button>
                    <span className={`mt-2 text-sm font-medium ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      {step.title}
                    </span>
                    <span className="text-xs text-gray-400 mt-1">Step {step.id}</span>
                  </div>
                );
              })}
              
              {/* CONNECTION LINE */}
              <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200 -z-10">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500"
                  style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* STEP CONTENT */}
          <div className="p-6 md:p-8">
            {stepComponents[currentStep]}
          </div>

          {/* NAVIGATION BUTTONS */}
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                {currentStep === 6 ? "Review your information" : "Complete this section to continue"}
              </div>
              
              <div className="flex gap-4 w-full sm:w-auto">
                {currentStep > 1 && (
                  <button
                    onClick={prevStep}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors w-full sm:w-auto"
                  >
                    ← Back
                  </button>
                )}
                
                {currentStep < 6 ? (
                  <button
                    onClick={nextStep}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity w-full sm:w-auto"
                  >
                    Continue →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl font-semibold transition-all w-full sm:w-auto bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving…
                      </div>
                    ) : saved ? (
                      '✓ Update Profile'
                    ) : (
                      'Save Profile'
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {saveError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <span className="text-red-500 text-lg flex-shrink-0">⚠</span>
                <p className="text-red-700 text-sm">{saveError}</p>
              </div>
            )}

            {currentStep === 6 && !saved && !saveError && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-600 text-lg flex-shrink-0">!</span>
                  <p className="text-yellow-700 text-sm">
                    Click <strong>"Save Profile"</strong> to save your information and unlock all features.
                  </p>
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <span className="text-green-600 text-xl flex-shrink-0">✅</span>
                  <div>
                    <p className="text-green-800 font-medium">Profile saved!</p>
                    <p className="text-green-700 text-sm mt-1">
                      What would you like to do next?
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate("/eligibility")}
                        className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Check Eligibility →
                      </button>
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="border border-gray-300 text-gray-700 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-gray-50"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* TIPS SECTION */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border border-blue-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
            <span className="text-2xl">💡</span>
            Why Complete Your Profile?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <span className="text-blue-600">🎯</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Personalized Matches</h4>
              <p className="text-sm text-gray-600">
                Get course recommendations based on your subjects and marks
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <span className="text-purple-600">⚡</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">CAO Assistant</h4>
              <p className="text-sm text-gray-600">
                Auto-fill CAO applications with your saved information
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <span className="text-green-600">📊</span>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">Eligibility Check</h4>
              <p className="text-sm text-gray-600">
                See exactly which courses you qualify for based on your marks
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER NOTE */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Your information is secure and only used to personalize your experience</p>
          <p className="mt-1">Need help? Contact support@txi.ac.za</p>
        </div>
      </div>
    </div>
  );
}