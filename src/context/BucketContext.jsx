import React, { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "txi_bucket_v1";

const defaultState = {
  selectedPackage: null,
  bucket: [],
};

const BucketContext = createContext(null);

export function useBucket() {
  return useContext(BucketContext);
}

export function BucketProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : defaultState;
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setPackage = (pkg) => {
    setState({
      selectedPackage: pkg,
      bucket: [],
    });
  };

  const usedForType = (type) =>
    state.bucket.filter((c) => c.type === type).length;

  const canAddCourseForType = (type) => {
    if (!state.selectedPackage) return false;
    const limit = state.selectedPackage.limits[type] || 0;
    return usedForType(type) < limit;
  };

  const addCourse = (course) => {
    if (!state.selectedPackage) {
      return { ok: false, reason: "No package selected" };
    }

    if (!canAddCourseForType(course.type)) {
      return { ok: false, reason: "Limit reached for this institution type" };
    }

    if (state.bucket.some((c) => c.id === course.id)) {
      return { ok: false, reason: "Course already added" };
    }

    setState((prev) => ({
      ...prev,
      bucket: [...prev.bucket, course],
    }));

    return { ok: true };
  };

  const removeCourse = (id) => {
    setState((prev) => ({
      ...prev,
      bucket: prev.bucket.filter((c) => c.id !== id),
    }));
  };

  return (
    <BucketContext.Provider
      value={{
        state,
        setPackage,
        addCourse,
        removeCourse,
        canAddCourseForType,
        usedForType,
      }}
    >
      {children}
    </BucketContext.Provider>
  );
}
