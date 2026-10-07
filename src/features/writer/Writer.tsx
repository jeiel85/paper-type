import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { TypewriterSound } from '../../core/audio/typewriterSound';
import { diffText } from '../../core/document/change';
import { EditHistory, type EditKind, type Selection } from '../../core/document/history';
import { createNote, inkSeedOf, type Note } from '../../core/document/note';
import { debugEnabled, logInputEvent, PerfMonitor, type PerfStats } from '../../core/perf/debug';
import { Autosave, type SaveState } from '../../core/storage/autosave';
import { DEFAULT_PREFS, loadLatestNote, loadPrefs, saveNote, savePrefs, type WriterPrefs } from '../../core/storage/db';
import { clearSnapshot, pickRecoveredText, readSnapshot, writeSnapshot } from '../../core/storage/recovery';
import { InkLayer } from './InkLayer';
import { editKindFor, motionFor, soundFor, type Motion } from './inputKinds';
import { FAN_BARS, FAN_PIVOT_DEPTH, fanAngle, Machine, type MachineRefs } from './Machine';
import { StatusBar } from './StatusBar';

type Boot = { note: Note; text: string; recovered: boolean; prefs: WriterPrefs; storageOk: boolean };

async function boot(): Promise<Boot> {
  const snapshot = readSnapshot();
  let stored: Note | undefined;
  let prefs = DEFAULT_PREFS;
  let storageOk = true;
  try {
    stored = await loadLatestNote();
    prefs = await loadPrefs();
  } catch (error) {
    // IndexedDB blocked or broken: keep writing in memory and rely on the recovery snapshot.
    console.warn('PaperType: IndexedDB unavailable', error);
    storageOk = false;
  }
  let note = stored ?? createNote();
  if (!stored && snapshot) {
    // Keep the snapshot's identity so later snapshots and saves stay on the same note.
    note = { ...note, id: snapshot.noteId, writerSettings: { ...note.writerSettings, inkSeed: snapshot.noteId } };
  }
  const { text, recovered } = pickRecoveredText(stored, snapshot);
  return { note: { ...note, text }, text, recovered, prefs, storageOk };
}

export function Writer() {
  const [state, setState] = useState<Boot | null>(null);
  useEffect(() => {
    let alive = true;
    void boot().then((b) => alive && setState(b));
    return () => {
      alive = false;
    };
  }, []);
  if (!state) return <div className="desk" aria-busy="true" />;
  return <WriterSurface {...state} />;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function offsetWithin(el: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

const PAPER_GUTTER = 16;

type Point = { x: number; y: number };

const lastCodePoint = (data: string | null) => {
  const chars = Array.from(data ?? '');
  return chars.length ? chars[chars.length - 1]!.codePointAt(0)! : 0;
};

/** One key strike: a typebar swings up from the basket to the strike point while the ribbon lifts. */
function strike(parts: MachineRefs, codePoint: number, pivot: Point, target: Point, lineHeight: number) {
  const bar = parts.typebar.current;
  if (bar) {
    const length = Math.hypot(target.x - pivot.x, pivot.y - target.y);
    const hit = (Math.atan2(target.x - pivot.x, pivot.y - target.y) * 180) / Math.PI;
    const rest = fanAngle(codePoint % FAN_BARS);
    bar.style.height = `${length}px`;
    const at = `translate(${pivot.x - 1.5}px, ${pivot.y - length}px)`;
    bar.animate(
      [
        // Accelerates into the paper, then falls back to the basket.
        { transform: `${at} rotate(${rest}deg)`, opacity: 0, easing: 'ease-in' },
        { transform: `${at} rotate(${(rest + hit) / 2}deg)`, opacity: 1, offset: 0.3, easing: 'ease-in' },
        { transform: `${at} rotate(${hit}deg)`, opacity: 1, offset: 0.5, easing: 'ease-out' },
        { transform: `${at} rotate(${rest}deg)`, opacity: 0 },
      ],
      { duration: 140 },
    );
  }
  parts.ribbon.current?.animate(
    [
      { transform: 'translateY(0)', easing: 'ease-out' },
      { transform: `translateY(${-lineHeight * 0.55}px)`, offset: 0.45, easing: 'ease-in' },
      { transform: 'translateY(0)' },
    ],
    { duration: 140 },
  );
}
const BELL_AT = 0.88;

function WriterSurface({ note: initialNote, text: initialText, recovered, prefs: initialPrefs, storageOk }: Boot) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const typeAreaRef = useRef<HTMLDivElement>(null);
  const machine: MachineRefs = {
    carriageBack: useRef<HTMLDivElement>(null),
    carriageFront: useRef<HTMLDivElement>(null),
    body: useRef<HTMLDivElement>(null),
    guide: useRef<HTMLDivElement>(null),
    ribbon: useRef<HTMLDivElement>(null),
    typebar: useRef<HTMLDivElement>(null),
  };
  const machineRef = useRef(machine);

  const noteRef = useRef(initialNote);
  const docTextRef = useRef(initialText);
  const selRef = useRef<Selection>({ start: initialText.length, end: initialText.length });
  const composingRef = useRef(false);
  const pendingKindRef = useRef<EditKind | null>(null);
  const motionRef = useRef<Motion>('none');
  const reviewRef = useRef(0);
  const typedRef = useRef(false);
  /** Code point of the key striking now, or null when the last input was not a character key. */
  const strikeRef = useRef<number | null>(null);
  const strikeCountRef = useRef(0);
  const pivotDepthRef = useRef(FAN_PIVOT_DEPTH);
  const bellLineRef = useRef('');

  const history = useMemo(() => new EditHistory(), []);
  const sound = useMemo(() => new TypewriterSound(), []);

  const [viewText, setViewText] = useState(initialText);
  const [caret, setCaret] = useState(initialText.length);
  const [composition, setComposition] = useState<{ start: number; end: number } | null>(null);
  /** The glyph just struck (it ends at `at`), stamped in with a short animation. */
  const [fresh, setFresh] = useState<{ at: number; n: number } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>(recovered ? 'dirty' : 'clean');
  const [prefs, setPrefs] = useState(initialPrefs);
  const [systemReducedMotion, setSystemReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const [notice, setNotice] = useState<string | null>(
    recovered ? '저장되지 않았던 글을 복구했어요.' : storageOk ? null : '브라우저 저장소를 열 수 없어 임시 저장만 돼요. 중요한 글은 따로 복사해 두세요.',
  );
  const [perf, setPerf] = useState<PerfStats | null>(null);

  const reduceMotion = prefs.reduceMotion || systemReducedMotion;
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  sound.enabled = prefs.sound;

  const snapshotNow = useCallback(() => {
    const ta = taRef.current;
    writeSnapshot({
      noteId: noteRef.current.id,
      text: ta ? ta.value : docTextRef.current,
      savedAt: new Date().toISOString(),
    });
  }, []);

  const autosave = useMemo(
    () =>
      new Autosave({
        save: async () => {
          const updated: Note = { ...noteRef.current, text: docTextRef.current, updatedAt: new Date().toISOString() };
          await saveNote(updated);
          noteRef.current = updated;
        },
        onStateChange: (s) => {
          setSaveState(s);
          if (s === 'clean') clearSnapshot();
        },
        onError: (error) => {
          console.warn('PaperType: save failed', error);
          snapshotNow();
        },
      }),
    [snapshotNow],
  );

  const perfMonitor = useMemo(() => (debugEnabled ? new PerfMonitor(setPerf) : null), []);

  // ---- carriage / paper motion (docs/02 §5.1) ----------------------------------------
  const layout = useCallback(() => {
    const paper = paperRef.current;
    const typeArea = typeAreaRef.current;
    const parts = machineRef.current;
    const back = parts.carriageBack.current;
    const front = parts.carriageFront.current;
    const body = parts.body.current;
    const guide = parts.guide.current;
    const marker = typeArea?.querySelector<HTMLElement>('[data-caret]');
    if (!paper || !typeArea || !back || !front || !body || !guide || !marker) return;

    const vv = window.visualViewport;
    const vw = window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const vTop = vv?.offsetTop ?? 0;
    const lineHeight = parseFloat(getComputedStyle(typeArea).lineHeight) || 32;

    const m = offsetWithin(marker, paper);
    const caretX = m.x;
    const caretCenterY = m.y + (marker.offsetHeight || lineHeight) / 2;

    const paperWidth = paper.offsetWidth;
    const paperLeft = (vw - paperWidth) / 2;
    const strikeX = vw / 2;
    const strikeY = vTop + clamp(vh * 0.55, 120, Math.max(120, vh - 170));

    // The caret stays on the strike point and the carriage moves instead, as far as the
    // sheet can go without leaving the screen (docs/02 §5.1). Wide screens therefore
    // behave like a real typewriter; narrow ones fall back to the hybrid behaviour.
    const reduced = reduceMotionRef.current;
    const tx = reduced
      ? 0
      : clamp(
          strikeX - (paperLeft + caretX),
          -Math.max(0, paperLeft - PAPER_GUTTER),
          Math.max(0, vw - PAPER_GUTTER - (paperLeft + paperWidth)),
        );
    const maxReview = Math.max(0, caretCenterY - lineHeight);
    reviewRef.current = clamp(reviewRef.current, 0, maxReview);
    const ty = strikeY - caretCenterY + reviewRef.current;

    const motion = motionRef.current;
    const transition =
      reduced || motion === 'none' || motion === 'review'
        ? 'none'
        : motion === 'return'
          ? 'transform 320ms cubic-bezier(.2,.75,.25,1)'
          : 'transform 90ms ease-out';
    const carriageX = paperLeft + tx;
    const platenTop = strikeY + lineHeight * 0.62;
    const bodyTop = platenTop + 30;

    paper.style.transition = transition;
    paper.style.transform = `translate3d(${carriageX}px, ${ty}px, 0)`;
    for (const el of [back, front]) {
      el.style.transition = transition;
      el.style.transform = `translate3d(${carriageX}px, ${platenTop}px, 0)`;
      el.style.width = `${paperWidth}px`;
    }
    body.style.transform = `translate3d(0, ${bodyTop}px, 0)`;
    if (motion === 'none') {
      // Re-measure the pivot only on resize/initial layout: CSS scales the fan on small screens.
      const fan = body.querySelector<SVGSVGElement>('.fan');
      if (fan) pivotDepthRef.current = fan.getBoundingClientRect().bottom - body.getBoundingClientRect().top;
    }
    const caretScreenX = carriageX + caretX;
    guide.style.transition = transition;
    guide.style.transform = `translate3d(${caretScreenX}px, ${strikeY}px, 0)`;

    const struck = strikeRef.current;
    strikeRef.current = null;
    if (struck !== null && !reduced) {
      strike(
        parts,
        struck,
        { x: strikeX, y: bodyTop + pivotDepthRef.current },
        { x: caretScreenX - lineHeight * 0.3, y: strikeY },
        lineHeight,
      );
    }

    if (typedRef.current) {
      typedRef.current = false;
      const lineWidth = typeArea.clientWidth;
      const lineKey = `${Math.round(m.y)}`;
      if (caretX - typeArea.offsetLeft > lineWidth * BELL_AT && bellLineRef.current !== lineKey) {
        bellLineRef.current = lineKey;
        sound.play('bell');
      }
    }
    motionRef.current = 'none';
  }, [sound]);

  useLayoutEffect(layout, [layout, viewText, caret, composition, fresh, reduceMotion]);

  // ---- editing -------------------------------------------------------------------------
  const commitFromTextarea = useCallback(
    (kind: EditKind) => {
      const ta = taRef.current;
      if (!ta) return;
      const next = ta.value;
      const after = { start: ta.selectionStart, end: ta.selectionEnd };
      const change = diffText(docTextRef.current, next);
      pendingKindRef.current = null;
      setComposition(null);
      setViewText(next);
      setCaret(after.end);
      if (!change) {
        selRef.current = after;
        return;
      }
      history.record(change, kind, selRef.current, after, performance.now());
      docTextRef.current = next;
      selRef.current = after;
      if (change.inserted !== '') typedRef.current = true;
      autosave.markDirty();
    },
    [autosave, history],
  );

  const applyProgrammatic = useCallback(
    (text: string, selection: Selection) => {
      const ta = taRef.current;
      if (!ta) return;
      ta.value = text;
      ta.setSelectionRange(selection.start, selection.end);
      docTextRef.current = text;
      selRef.current = selection;
      motionRef.current = 'key';
      reviewRef.current = 0;
      setViewText(text);
      setCaret(selection.end);
      autosave.markDirty();
    },
    [autosave],
  );

  const undo = useCallback(() => {
    if (composingRef.current) return;
    const r = history.undo(docTextRef.current);
    if (r) applyProgrammatic(r.text, r.selection);
  }, [applyProgrammatic, history]);

  const redo = useCallback(() => {
    if (composingRef.current) return;
    const r = history.redo(docTextRef.current);
    if (r) applyProgrammatic(r.text, r.selection);
  }, [applyProgrammatic, history]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(ta.value.length, ta.value.length);

    const onBeforeInput = (e: InputEvent) => {
      logInputEvent(e);
      perfMonitor?.markInput();
      if (e.inputType === 'historyUndo' || e.inputType === 'historyRedo') {
        e.preventDefault();
        if (e.inputType === 'historyUndo') undo();
        else redo();
        return;
      }
      pendingKindRef.current = editKindFor(e.inputType);
      motionRef.current = motionFor(e.inputType);
      reviewRef.current = 0;
      const s = soundFor(e.inputType, e.data);
      if (s) sound.play(s);
      // Only character keys swing a typebar; space, Backspace and Enter move the carriage.
      strikeRef.current = s === 'key' ? lastCodePoint(e.data) : null;
    };

    const onInput = (e: Event) => {
      logInputEvent(e);
      // Render the typed glyph within this event's task. State set from a native
      // listener would otherwise be scheduled for a later task, sometimes a frame late.
      flushSync(() => {
        setFresh(strikeRef.current !== null ? { at: ta.selectionEnd, n: ++strikeCountRef.current } : null);
        if (composingRef.current) {
          // Preview only: the uncommitted composition is neither saved nor recorded (docs/04 §3).
          const change = diffText(docTextRef.current, ta.value);
          setViewText(ta.value);
          setCaret(ta.selectionEnd);
          setComposition(change ? { start: change.from, end: change.from + change.inserted.length } : null);
          return;
        }
        commitFromTextarea(pendingKindRef.current ?? 'other');
      });
    };

    const onCompositionStart = (e: CompositionEvent) => {
      logInputEvent(e);
      composingRef.current = true;
    };

    const onCompositionEnd = (e: CompositionEvent) => {
      logInputEvent(e);
      composingRef.current = false;
      // Chrome has the final value now; Firefox follows with one more input event, which diffs to nothing.
      commitFromTextarea('insert');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229) return;
      const mod = e.ctrlKey || e.metaKey;
      if (!mod || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || (key === 'y' && !e.metaKey)) {
        e.preventDefault();
        redo();
      }
    };

    const onSelectionChange = () => {
      if (document.activeElement !== ta || composingRef.current) return;
      if (ta.value !== docTextRef.current) return; // an edit is about to be committed
      const sel = { start: ta.selectionStart, end: ta.selectionEnd };
      if (sel.start !== selRef.current.start || sel.end !== selRef.current.end) {
        // The caret moved without typing: the next edit starts a new undo group.
        history.seal();
        selRef.current = sel;
        motionRef.current = 'key';
        reviewRef.current = 0;
        setCaret(sel.end);
      }
    };

    // overflow:hidden textareas can still scroll to reveal the caret; the paper moves instead.
    const onScroll = () => {
      if (ta.scrollTop !== 0) ta.scrollTop = 0;
    };

    ta.addEventListener('beforeinput', onBeforeInput);
    ta.addEventListener('input', onInput);
    ta.addEventListener('compositionstart', onCompositionStart);
    ta.addEventListener('compositionupdate', logInputEvent);
    ta.addEventListener('compositionend', onCompositionEnd);
    ta.addEventListener('keydown', onKeyDown);
    ta.addEventListener('select', onSelectionChange);
    ta.addEventListener('keyup', onSelectionChange);
    ta.addEventListener('pointerup', onSelectionChange);
    ta.addEventListener('scroll', onScroll);
    document.addEventListener('selectionchange', onSelectionChange);
    return () => {
      ta.removeEventListener('beforeinput', onBeforeInput);
      ta.removeEventListener('input', onInput);
      ta.removeEventListener('compositionstart', onCompositionStart);
      ta.removeEventListener('compositionupdate', logInputEvent);
      ta.removeEventListener('compositionend', onCompositionEnd);
      ta.removeEventListener('keydown', onKeyDown);
      ta.removeEventListener('select', onSelectionChange);
      ta.removeEventListener('keyup', onSelectionChange);
      ta.removeEventListener('pointerup', onSelectionChange);
      ta.removeEventListener('scroll', onScroll);
      document.removeEventListener('selectionchange', onSelectionChange);
    };
  }, [commitFromTextarea, history, perfMonitor, redo, sound, undo]);

  // ---- persistence lifecycle (docs/03 §6, R4) -----------------------------------------
  useEffect(() => {
    if (recovered) autosave.markDirty();
    const onHide = () => {
      if (composingRef.current) commitFromTextarea('insert'); // reconcile with the native value first
      if (autosave.hasUnsavedChanges) snapshotNow();
      void autosave.flush();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onHide);
      autosave.dispose();
    };
  }, [autosave, commitFromTextarea, recovered, snapshotNow]);

  // ---- environment ----------------------------------------------------------------------
  useEffect(() => {
    const relayout = () => {
      motionRef.current = 'none';
      layout();
    };
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const onMedia = () => setSystemReducedMotion(!!media?.matches);
    const unlock = () => sound.unlock();
    window.addEventListener('resize', relayout);
    window.visualViewport?.addEventListener('resize', relayout);
    window.visualViewport?.addEventListener('scroll', relayout);
    document.fonts?.addEventListener('loadingdone', relayout);
    void document.fonts?.ready.then(relayout);
    media?.addEventListener('change', onMedia);
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
    perfMonitor?.start();
    // Warm up audio while idle so the first keystroke does not pay for it.
    const warm = () => {
      sound.prepare();
      // Run each strike animation once, invisibly, so the first real key does not pay
      // for creating their compositor layers.
      const parts = machineRef.current;
      for (const el of [parts.typebar.current, parts.ribbon.current]) {
        el?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(1px)' }], { duration: 16 });
      }
    };
    const idleId = 'requestIdleCallback' in window ? window.requestIdleCallback(warm, { timeout: 1500 }) : null;
    const timerId = idleId === null ? window.setTimeout(warm, 300) : null;
    return () => {
      if (idleId !== null) window.cancelIdleCallback(idleId);
      if (timerId !== null) window.clearTimeout(timerId);
      window.removeEventListener('resize', relayout);
      window.visualViewport?.removeEventListener('resize', relayout);
      window.visualViewport?.removeEventListener('scroll', relayout);
      document.fonts?.removeEventListener('loadingdone', relayout);
      media?.removeEventListener('change', onMedia);
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
      perfMonitor?.stop();
    };
  }, [layout, perfMonitor, sound]);

  // ---- reviewing earlier lines: wheel / vertical drag -----------------------------------
  const dragRef = useRef<{ id: number; y: number; review: number; moved: boolean } | null>(null);
  const review = (value: number) => {
    reviewRef.current = value;
    motionRef.current = 'review';
    layout();
  };
  const onWheel = (e: ReactWheelEvent) => review(reviewRef.current - e.deltaY);
  const onPointerDown = (e: ReactPointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    if (e.pointerType === 'touch') dragRef.current = { id: e.pointerId, y: e.clientY, review: reviewRef.current, moved: false };
    if (e.target !== taRef.current) {
      // Clicking the desk or blank paper keeps the writing focus.
      e.preventDefault();
      taRef.current?.focus({ preventScroll: true });
    }
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== e.pointerId) return;
    const dy = e.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) < 8) return;
    drag.moved = true;
    review(drag.review + dy);
  };
  const onPointerEnd = () => {
    dragRef.current = null;
  };

  const updatePrefs = (patch: Partial<WriterPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next).catch((error) => console.warn('PaperType: could not store settings', error));
    taRef.current?.focus({ preventScroll: true });
  };

  const charCount = useMemo(() => {
    let n = 0;
    for (const ch of viewText) if (ch !== '\n') n++;
    return n;
  }, [viewText]);

  return (
    <div
      className="desk"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <div className="paper" ref={paperRef}>
        <div className="type-area" ref={typeAreaRef}>
          <InkLayer
            text={viewText}
            inkSeed={inkSeedOf(noteRef.current)}
            caret={caret}
            composition={composition}
            fresh={fresh}
          />
          <textarea
            ref={taRef}
            className="type-input"
            defaultValue={initialText}
            aria-label="본문"
            placeholder="여기에 첫 문장을 타이핑해 보세요."
            spellCheck={false}
            autoComplete="off"
            rows={1}
          />
        </div>
      </div>
      <Machine refs={machine} />
      <StatusBar
        saveState={saveState}
        onRetry={() => void autosave.flush()}
        notice={notice}
        onDismissNotice={() => setNotice(null)}
        sound={prefs.sound}
        onToggleSound={() => updatePrefs({ sound: !prefs.sound })}
        reduceMotion={prefs.reduceMotion}
        systemReducedMotion={systemReducedMotion}
        onToggleMotion={() => updatePrefs({ reduceMotion: !prefs.reduceMotion })}
      />
      <div className="char-count" aria-live="off">
        {charCount.toLocaleString('ko-KR')}자
      </div>
      {perf && (
        <div className="perf-hud" aria-hidden="true">
          {perf.fps} fps · input→frame {perf.inputLatencyMs ?? '–'} ms · long tasks {perf.longTasks}
        </div>
      )}
    </div>
  );
}
