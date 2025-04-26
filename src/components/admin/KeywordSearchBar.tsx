import React from "react";

type KeywordSearchBarProps = {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
};

const KeywordSearchBar: React.FC<KeywordSearchBarProps> = ({ searchTerm, setSearchTerm }) => (
  <div className="mb-4">
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Search keywords..."
      className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
    />
  </div>
);

export default KeywordSearchBar;
