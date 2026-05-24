import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("q", searchTerm);
    if (location) params.set("location", location);
    navigate(`/search?${params.toString()}`);
  };

  return {
    searchTerm,
    setSearchTerm,
    location,
    setLocation,
    handleSearch,
  };
};
