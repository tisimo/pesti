import React, { useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

type ScrollPositionMap = Record<string, number>;

const ScrollManager: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = useRef<ScrollPositionMap>({});
  const previousKeyRef = useRef(location.key);

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      const previousMode = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => {
        window.history.scrollRestoration = previousMode;
      };
    }
    return;
  }, []);

  useLayoutEffect(() => {
    const previousKey = previousKeyRef.current;
    if (previousKey && previousKey !== location.key) {
      positionsRef.current[previousKey] = window.scrollY;
    }

    if (navigationType === "POP") {
      const savedPosition = positionsRef.current[location.key] ?? 0;
      window.scrollTo(0, savedPosition);
    } else {
      window.scrollTo(0, 0);
    }

    previousKeyRef.current = location.key;
  }, [location.key, navigationType]);

  return null;
};

export default ScrollManager;
