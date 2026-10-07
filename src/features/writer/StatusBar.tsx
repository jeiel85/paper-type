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

function MotionIcon({ reduced }: { reduced: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="5" width="10" height="14" rx="1.5" />
      {reduced ? <path d="M4 12h2M18 12h2" /> : <path d="M2.5 9.5 5 12l-2.5 2.5M21.5 9.5 19 12l2.5 2.5" />}
    </svg>
  );
}
