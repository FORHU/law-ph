"use client";
import React, { useEffect, useRef, useState } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import { GitGraph } from "lucide-react";

export interface TimelineData {
  title: string;
  date?: string;
  description: string;
  status?: string;
  requires_previous?: boolean;
}

export const Timeline = ({ data }: { data: TimelineData[] }) => {
  const [localData, setLocalData] = useState<TimelineData[]>(data);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [lockedAlert, setLockedAlert] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    setLocalData(data);
  }, [data]);

  const updateStatus = (index: number, newStatus: string) => {
    setLocalData((prev) => {
      const newData = [...prev];
      const updatedItem = { ...newData[index], status: newStatus };

      // Auto-stamp today's date whenever they manually mark a task as completed!
      if (
        newStatus === "completed" &&
        (!updatedItem.date || updatedItem.date.trim() === "")
      ) {
        updatedItem.date = new Date().toISOString().split("T")[0];
      } else if (newStatus === "pending") {
        updatedItem.date = ""; // Optional: Clear date if demoted back to pending
      }

      newData[index] = updatedItem;
      return newData;
    });
  };

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setHeight(rect.height);
    }
  }, [ref, data]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 10%", "end 50%"],
  });

  const heightTransform = useTransform(scrollYProgress, [0, 1], [0, height]);
  const opacityTransform = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <div className="w-full font-sans" ref={containerRef}>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <GitGraph className="text-[#E0A7C2]" /> Case Timeline
      </h2>

      <div
        ref={ref}
        className="relative border-l-2 border-[#8B4564]/20 ml-[4.5rem] md:ml-[6rem] pb-8"
      >
        <div className="space-y-8">
          {(() => {
            let lastDate = "";

            return localData.map((item, i) => {
              const showDate = item.date && item.date !== lastDate;
              if (item.date) lastDate = item.date;

              let computedStatus = item.status?.toLowerCase() || "pending";

              // Smart Locking Logic: If this step requires the previous step to be completed
              if (
                item.requires_previous &&
                i > 0 &&
                computedStatus === "pending"
              ) {
                const prevStatus =
                  localData[i - 1].status?.toLowerCase() || "pending";
                if (prevStatus !== "completed") {
                  computedStatus = "locked";
                }
              }

              const isCompleted = computedStatus === "completed";
              const isLocked = computedStatus === "locked";

              return (
                <div
                  key={i}
                  className={`relative pl-6 md:pl-8 flex w-full ${openDropdown === i || lockedAlert === i ? "z-[100]" : "z-10"}`}
                >
                  {showDate && (
                    <div className="absolute -left-[4.5rem] md:-left-[6rem] top-1.5 w-[3.5rem] md:w-[5rem] text-right pr-2 md:pr-4">
                      <span className="text-[10px] md:text-[11px] font-bold text-[#E0A7C2] block leading-tight break-words">
                        {item.date}
                      </span>
                    </div>
                  )}

                  {/* Outer circle dot */}
                  <div
                    className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-2 border-[#1A1A1A] z-20 flex items-center justify-center ${
                      isCompleted
                        ? "bg-[#10B981]"
                        : isLocked
                          ? "bg-[#2A2A2A] border-gray-600"
                          : "bg-[#8B4564]/50"
                    }`}
                  >
                    {isLocked && (
                      <svg
                        className="w-2 h-2 text-gray-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6H8V6a2 2 0 114 0v2z" />
                      </svg>
                    )}
                  </div>

                  {/* Card content */}
                  <div
                    className={`flex-1 p-5 rounded-xl shadow-none border ${isLocked ? "bg-[#1A1A1A] border-transparent opacity-60" : "bg-[#2A2A2A] border-white/5"}`}
                  >
                    <div className="flex justify-between items-start mb-2 relative">
                      <h3
                        className={`font-semibold text-base md:text-lg ${isLocked ? "text-gray-500" : "text-white"}`}
                      >
                        {item.title}
                      </h3>

                      {isCompleted ? (
                        <span className="text-[10px] md:text-xs px-2 py-1 flex-shrink-0 ml-2 rounded-full uppercase tracking-wider font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                          {item.status || "COMPLETED"}
                        </span>
                      ) : isLocked ? (
                        <div className="relative">
                          <button
                            onClick={() => {
                              setLockedAlert(i);
                              setTimeout(() => setLockedAlert(null), 3500);
                            }}
                            className="text-[10px] md:text-xs px-2 py-1.5 flex-shrink-0 ml-2 rounded-full uppercase tracking-wider font-semibold bg-[#1A1A1A] text-gray-500 border border-gray-700 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/40 transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 2a4 4 0 00-4 4v2H5a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zm2 6H8V6a2 2 0 114 0v2z" />
                            </svg>
                            LOCKED
                          </button>

                          {lockedAlert === i && (
                            <div className="absolute right-0 top-full mt-2 w-52 bg-[#2A1A1A] border border-red-500/30 rounded-xl p-3 shadow-2xl z-[100] animate-in fade-in zoom-in-95 duration-200">
                              <p className="text-[11px] leading-relaxed text-red-200 font-medium">
                                Action strictly required: You must mark{" "}
                                <strong className="text-red-400 font-bold">
                                  "
                                  {localData[i - 1]?.title ||
                                    "the previous step"}
                                  "
                                </strong>{" "}
                                as completed before this unlocks.
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setOpenDropdown(openDropdown === i ? null : i)
                            }
                            className="text-[10px] md:text-xs px-2 py-1.5 flex-shrink-0 rounded-full uppercase tracking-wider font-semibold cursor-pointer outline-none transition-all flex items-center gap-1 border bg-[#1A1A1A] text-gray-400 border-white/10 hover:bg-white/5 hover:text-white"
                          >
                            {item.status || "PENDING"}
                            <svg
                              className={`w-3 h-3 transition-transform duration-200 ${openDropdown === i ? "rotate-180" : ""}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          {openDropdown === i && (
                            <div className="absolute right-0 top-full mt-2 w-32 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200">
                              <button
                                onClick={() => {
                                  updateStatus(i, "pending");
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-gray-400 hover:bg-white/5 transition-colors border-b border-white/5"
                              >
                                Pending
                              </button>
                              <button
                                onClick={() => {
                                  updateStatus(i, "completed");
                                  setOpenDropdown(null);
                                }}
                                className="w-full text-left px-4 py-2.5 text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#10B981] hover:bg-[#10B981]/10 transition-colors"
                              >
                                Completed
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <p
                      className={`text-sm leading-relaxed mt-2 ${isLocked ? "text-gray-600" : "text-gray-300"}`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            });
          })()}
        </div>

        {/* Aceternity Animated Line Overlay */}
        <div
          style={{ height: height + "px" }}
          className="absolute left-[-2px] top-0 overflow-hidden w-[2px] z-10"
        >
          <motion.div
            style={{ height: heightTransform, opacity: opacityTransform }}
            className="absolute inset-x-0 top-0 w-[2px] bg-gradient-to-b from-[#E0A7C2] via-[#8B4564] to-transparent rounded-full shadow-[0_0_15px_rgba(224,167,194,0.5)]"
          />
        </div>
      </div>
    </div>
  );
};
