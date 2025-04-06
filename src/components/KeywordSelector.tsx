"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react" // Using lucide-react for icons

import { cn } from "@/lib/utils" // Assuming you have a utility for classnames
import { Button } from "@/components/ui/button" // Assuming you have a Button component
import {
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
} from "@/components/ui/command" // Assuming you have Command components (often used with cmdk)
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover" // Assuming you have Popover components

interface KeywordSelectorProps {
  keywords: string[];
  selectedKeyword: string | null;
  onKeywordSelect: (keyword: string | null) => void;
  loading: boolean;
  className?: string;
}

export function KeywordSelector({
  keywords,
  selectedKeyword,
  onKeywordSelect,
  loading,
  className,
}: KeywordSelectorProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className={cn(className)}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
              "w-[300px] justify-between",
              "h-9",
              "bg-gray-700 border-gray-600 hover:bg-gray-600 text-gray-100",
              "focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-900",
              "text-sm",
              className
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
        className="w-[300px] p-0 bg-gray-800 border border-gray-700 text-gray-200 shadow-xl" 
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