"use client";

import { useEffect, useRef, useState } from "react";
import { CommandItem } from "@/lib/slashCommands";

interface Props {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export default function SlashCommandPopup({ items, command }: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + items.length) % items.length);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % items.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (items[selectedIndex]) {
          command(items[selectedIndex]);
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [selectedIndex, items, command]);

  if (items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="z-50 w-64 bg-[#111111] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1"
    >
      {items.map((item, index) => (
        <button
          key={item.title}
          onClick={() => command(item)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? "bg-white/10 text-white"
              : "text-gray-400 hover:bg-white/5 hover:text-white"
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-gray-300 shrink-0">
            {item.icon}
          </div>
          <div>
            <p className="text-sm font-medium text-white">{item.title}</p>
            <p className="text-xs text-gray-600">{item.description}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
