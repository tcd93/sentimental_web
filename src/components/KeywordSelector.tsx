import { Check, ChevronsUpDown } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ListState } from "@/lib/types/ListState"
import { cn } from "@/lib/utils"
import { DailySentimentData } from "@/lib/types/DailySentimentData"

interface KeywordSelectorProps {
  dailyDataState: ListState<DailySentimentData>;
  selectedKeyword: string | null;
  onKeywordSelect: (keyword: string | null) => void;
}

const calculateKeywordsList = (
  data: DailySentimentData[]
): string[] => {
  return [...new Set(data.map((item) => item.keyword))].sort();
};

export function KeywordSelector({
  dailyDataState,
  selectedKeyword,
  onKeywordSelect,
}: KeywordSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const { data: dailyData, loading, error } = dailyDataState;

  if (error) {
    return (
      <Button
        variant="outline"
        className={cn(
          "w-full sm:w-[300px] justify-between",
          "h-9",
          "bg-gray-700 border-gray-600 text-gray-100",
          "text-sm",
          "z-10"
        )}
        disabled
      >
        <span className="truncate text-red-400">Error: {error}</span>
      </Button>
    );
  }

  const keywords = calculateKeywordsList(dailyData);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className="z-10">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
              "w-full sm:w-[300px] justify-between",
              "h-9",
              "bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-100",
              "focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900",
              "text-sm",
              "z-10"
          )}
          disabled={loading || keywords.length === 0}
        >
          <span className="truncate"> 
            {loading
                ? "Loading keywords..."
                : selectedKeyword
                ? selectedKeyword
                : keywords.length === 0
                ? "No keywords available"
                : "Select keyword..."}
           </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-full sm:w-[300px] p-0 bg-gray-800 border border-gray-700 text-gray-200 shadow-xl" 
        sideOffset={4}
      >
        <Command className="bg-gray-800">
          <CommandInput 
             placeholder="Search keyword..." 
             className="h-9 focus:ring-0 focus:border-blue-500 border-t-0 border-x-0 border-b border-gray-700 bg-gray-800 placeholder-gray-400 text-gray-200 caret-blue-400" 
          />
          <CommandList className="max-h-[200px]"> 
              <CommandEmpty className="py-6 text-center text-sm text-gray-400">No keyword found.</CommandEmpty>
              <CommandGroup>
                {keywords.map((keyword) => (
                  <CommandItem
                    key={keyword}
                    value={keyword}
                    onSelect={(currentValue: string) => {
                      onKeywordSelect(currentValue === selectedKeyword ? null : currentValue)
                      setOpen(false)
                    }}
                    className="text-sm cursor-pointer text-gray-200 hover:bg-gray-700/80 aria-selected:bg-blue-600/50 aria-selected:text-white rounded-sm mx-1 px-2 py-1.5"
                  >
                    {keyword}
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedKeyword === keyword ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}