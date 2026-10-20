import { useEffect } from 'react';
import type { SaveState } from '../../core/storage/autosave';

type Props = {
  saveState: SaveState;
  onRetry: () => void;
  notice: string | null;
  onDismissNotice: () => void;
  sound: boolean;
  onToggleSound: () => void;
  reduceMotion: boolean;
  systemReducedMotion: boolean;
  onToggleMotion: () => void;
  charCount: number;
};

const LABEL: Record<SaveState, string> = {
  clean: '저장됨',
  dirty: '저장 대기',
  saving: '저장 중…',
  error: '저장 안 됨',
};

/** Quiet by default; only a failed save is shown loudly (docs/02 §2, §11). */
export function StatusBar(props: Props) {
  const { saveState, notice, onDismissNotice } = props;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onDismissNotice, 8000);
    return () => clearTimeout(t);
  }, [notice, onDismissNotice]);

  return (
    <header className="topbar">
      <div className="brand">
        Paper<span>Type</span>
      </div>
      <div className="topbar-right">
        {/* Up here rather than at the bottom: with a virtual keyboard open the bottom edge is the strike point. */}
        <span className="char-count">{props.charCount.toLocaleString('ko-KR')}자</span>
        <div className={`save save-${saveState}`} role="status" aria-live="polite">
          <span className="save-dot" aria-hidden="true" />
          <span className="save-label">{LABEL[saveState]}</span>
          {saveState === 'error' && (
            <button type="button" className="text-button" onClick={props.onRetry}>
              다시 시도
            </button>
          )}
        </div>
        <button
          type="button"
          className="icon-button"
          aria-pressed={props.sound}
          aria-label={props.sound ? '소리 끄기' : '소리 켜기'}
          title={props.sound ? '소리 끄기' : '소리 켜기'}
          onClick={props.onToggleSound}
        >
          <SoundIcon on={props.sound} />
        </button>
        <button
          type="button"
          className="icon-button"
          aria-pressed={props.reduceMotion || props.systemReducedMotion}
          disabled={props.systemReducedMotion}
          aria-label={props.systemReducedMotion ? '시스템 설정으로 움직임이 줄어 있음' : props.reduceMotion ? '움직임 켜기' : '움직임 줄이기'}
          title={props.systemReducedMotion ? '시스템 설정으로 움직임이 줄어 있어요' : props.reduceMotion ? '움직임 켜기' : '움직임 줄이기'}
          onClick={props.onToggleMotion}
        >
          <MotionIcon reduced={props.reduceMotion || props.systemReducedMotion} />
        </button>
        <a
          className="icon-button repo-link"
          href="https://github.com/jeiel85/paper-type"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub 저장소 열기 (새 탭)"
          title="소스 코드 · GitHub"
        >
          <GitHubIcon />
        </a>
      </div>
      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" className="text-button" onClick={onDismissNotice} aria-label="알림 닫기">
            닫기
          </button>
        </div>
      )}
    </header>
  );
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      {on ? (
        <>
          <path d="M15.5 9a4 4 0 0 1 0 6" />
          <path d="M18 6.5a7.5 7.5 0 0 1 0 11" />
        </>
      ) : (
        <path d="M16 9.5l5 5M21 9.5l-5 5" />
      )}
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function MotionIcon({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="5" width="10" height="14" rx="1.5" />
      {reduced ? <path d="M4 12h2M18 12h2" /> : <path d="M2.5 9.5 5 12l-2.5 2.5M21.5 9.5 19 12l2.5 2.5" />}
    </svg>
  );
}
