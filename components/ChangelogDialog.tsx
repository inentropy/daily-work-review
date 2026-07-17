"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CHANGELOG, CURRENT_VERSION_LABEL } from "@/lib/changelog";

export function ChangelogDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  return (
    <>
      <button
        className="changelog-trigger"
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
      >
        <span>{CURRENT_VERSION_LABEL}</span>
        <small>查看更新日志</small>
        <b aria-hidden="true">↗</b>
      </button>

      {isOpen && (
        <div className="changelog-backdrop" onMouseDown={() => setIsOpen(false)}>
          <section
            className="changelog-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="changelog-header">
              <div>
                <p>PRODUCT NOTES</p>
                <h2 id={titleId}>更新日志</h2>
                <span>记录日迹的每一次成长与变化。</span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="关闭更新日志"
              >
                ×
              </button>
            </header>

            <div className="changelog-current">
              <span>当前版本</span>
              <strong>{CURRENT_VERSION_LABEL}</strong>
              <small>遵循语义化版本：功能更新、体验优化和问题修复都会留下记录</small>
            </div>

            <div className="changelog-list">
              {CHANGELOG.map((release, index) => (
                <article className="changelog-release" key={release.version}>
                  <div className="changelog-version">
                    <span>{index === 0 ? "CURRENT" : "HISTORY"}</span>
                    <strong>{release.version}</strong>
                    <time dateTime={release.date}>{release.date}</time>
                  </div>
                  <div className="changelog-content">
                    <h3>{release.title}</h3>
                    <p>{release.summary}</p>
                    <ul>
                      {release.changes.map((change) => (
                        <li key={`${change.type}-${change.text}`}>
                          <span data-type={change.type}>{change.type}</span>
                          <p>{change.text}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
