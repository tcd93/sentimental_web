import React from "react";

type SourceTabsProps = {
  sources: ("reddit" | "steam")[];
  activeSource: "reddit" | "steam";
  setActiveSource: (source: "reddit" | "steam") => void;
  setSearchTerm: (term: string) => void;
};

const SourceTabs: React.FC<SourceTabsProps> = ({
  sources,
  activeSource,
  setActiveSource,
  setSearchTerm,
}) => (
  <div className="border-b border-gray-700 p-0">
    <div className="flex items-center overflow-x-auto">
      {sources.map((source) => (
        <button
          key={source}
          className={`py-3 px-6 font-medium whitespace-nowrap ${
            activeSource === source
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-gray-400 hover:text-gray-200"
          }`}
          onClick={() => {
            setActiveSource(source);
            setSearchTerm("");
          }}
        >
          {source}
        </button>
      ))}
    </div>
  </div>
);

export default SourceTabs;
