"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";

interface AssistantMessageProps {
  content: string;
  isStreaming: boolean;
  messageId: string;
}

/**
 * Renders assistant message as staggered paragraphs.
 * - Committed paragraphs (followed by \n\n) get their own bubble
 * - In-progress paragraph (still being typed) grows in place
 * - Previously seen paragraphs don't re-animate
 */
export function AssistantMessage({ content, isStreaming, messageId }: AssistantMessageProps) {
  // Track how many paragraphs we've "seen" to prevent re-animation
  const seenCountRef = useRef(0);
  const prevContentLengthRef = useRef(0);

  // Split content into paragraphs
  const allParagraphs = content.split("\n\n").filter(p => p.trim().length > 0);

  // If streaming, the last paragraph might be incomplete
  // Only treat it as "in progress" if content is actively growing
  const isActivelyStreaming = isStreaming && content.length > prevContentLengthRef.current;

  // Committed = complete paragraphs, InProgress = currently being typed
  const committed = isStreaming && allParagraphs.length > 0
    ? allParagraphs.slice(0, -1)
    : allParagraphs;
  const inProgress = isStreaming && allParagraphs.length > 0
    ? allParagraphs[allParagraphs.length - 1]
    : null;

  // Determine which paragraphs are new (should animate)
  const newStartIndex = seenCountRef.current;

  // Update refs after render
  useEffect(() => {
    seenCountRef.current = committed.length;
    prevContentLengthRef.current = content.length;
  });

  // Reset seen count when message ID changes (new message)
  useEffect(() => {
    seenCountRef.current = 0;
    prevContentLengthRef.current = 0;
  }, [messageId]);

  // If no content yet, show nothing
  if (allParagraphs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {/* Committed paragraphs - each gets its own bubble */}
      {committed.map((para, i) => {
        const isNew = i >= newStartIndex;
        const staggerDelay = isNew ? (i - newStartIndex) * 0.1 : 0;

        return (
          <motion.div
            key={`${messageId}-${i}-${para.slice(0, 15).replace(/\s/g, "")}`}
            initial={isNew ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.2,
              delay: staggerDelay,
              ease: "easeOut"
            }}
            className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 text-sm"
          >
            <p className="whitespace-pre-wrap leading-relaxed">{para}</p>
          </motion.div>
        );
      })}

      {/* In-progress paragraph - grows in place */}
      {inProgress && (
        <motion.div
          key={`${messageId}-inprogress`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="max-w-[85%] px-4 py-3 rounded-2xl rounded-bl-md bg-slate-100 text-slate-800 text-sm"
        >
          <p className="whitespace-pre-wrap leading-relaxed">
            {inProgress}
            {isActivelyStreaming && (
              <motion.span
                animate={{ opacity: [1, 0.3] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-1.5 h-4 ml-0.5 bg-slate-400 align-middle rounded-sm"
              />
            )}
          </p>
        </motion.div>
      )}

      {/* Typing indicator when waiting for more content */}
      {isStreaming && !inProgress && (
        <div className="flex gap-1 px-2 py-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
              className="w-2 h-2 rounded-full bg-slate-300"
            />
          ))}
        </div>
      )}
    </div>
  );
}
