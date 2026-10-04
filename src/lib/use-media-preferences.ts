"use client";

import { useSyncExternalStore } from "react";

type NetworkInformation = { saveData?: boolean };

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function getSaveData() {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  return Boolean(connection?.saveData) || window.matchMedia("(prefers-reduced-data: reduce)").matches;
}

const noopSubscribe = () => () => {};

/** True when the user prefers reduced motion. Server render assumes reduced (static). */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => true);
}

/** True when the browser reports Save-Data. Server render assumes true (no autoplay). */
export function useSaveData() {
  return useSyncExternalStore(noopSubscribe, getSaveData, () => true);
}

/** Autoplaying or previewing video is allowed only with motion and without Save-Data. */
export function useMotionMediaAllowed() {
  const reduced = usePrefersReducedMotion();
  const saveData = useSaveData();
  return !reduced && !saveData;
}

/** True on devices with a fine pointer that can hover (desktop mice, trackpads). */
export function useCanHover() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    () => false,
  );
}
