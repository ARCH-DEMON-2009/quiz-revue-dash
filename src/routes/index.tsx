import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * This file handles direct navigation to /src/routes/index.tsx
 * by redirecting to the home page.
 */
const RoutesIndex = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default RoutesIndex;
