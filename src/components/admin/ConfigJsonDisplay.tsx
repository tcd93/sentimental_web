"use client";

import React from "react";
import { ConfigData } from "../../lib/types/admin/types";
import { monoDarkTheme, JsonEditor } from "json-edit-react";

type ConfigJsonDisplayProps = {
  cleanedDataForDisplay: Partial<ConfigData>;
};

const ConfigJsonDisplay: React.FC<ConfigJsonDisplayProps> = ({ cleanedDataForDisplay }) => {
  return (
    <div className="px-6 pb-6 p-4">
      {cleanedDataForDisplay ? (
        <div className="max-h-45 overflow-y-auto scrollbar scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          <JsonEditor
            data={cleanedDataForDisplay}
            enableClipboard={true}
            searchText=""
            viewOnly={true}
            theme={monoDarkTheme}
            minWidth={"100%"}
          />
        </div>
      ) : (
        <pre className="p-3 bg-gray-800 overflow-x-auto text-sm text-gray-300 max-h-60 overflow-y-auto scrollbar scrollbar-thumb-gray-700 scrollbar-track-gray-800">
          No data available
        </pre>
      )}
    </div>
  );
};

export default ConfigJsonDisplay;
