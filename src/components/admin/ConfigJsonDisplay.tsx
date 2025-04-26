import React from "react";
import { ConfigData } from "../../lib/types/admin/types";

type ConfigJsonDisplayProps = {
  cleanedDataForDisplay: Partial<ConfigData>;
  configData: ConfigData;
};

const ConfigJsonDisplay: React.FC<ConfigJsonDisplayProps> = ({ cleanedDataForDisplay, configData }) => (
  <div className="px-6 pb-6">
    <pre className="p-3 bg-gray-800 overflow-x-auto text-sm text-gray-300 max-h-60 overflow-y-auto scrollbar scrollbar-thumb-gray-700 scrollbar-track-gray-800">
      {cleanedDataForDisplay
        ? JSON.stringify({ source: cleanedDataForDisplay }, null, 2)
        : configData && configData.source
        ? "No valid keywords defined."
        : "Loading..."}
    </pre>
  </div>
);

export default ConfigJsonDisplay;
