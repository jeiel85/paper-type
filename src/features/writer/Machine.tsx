import type { RefObject } from 'react';

export type MachineRefs = {
  carriageBack: RefObject<HTMLDivElement | null>;
  carriageFront: RefObject<HTMLDivElement | null>;
  body: RefObject<HTMLDivElement | null>;
  guide: RefObject<HTMLDivElement | null>;
  ribbon: RefObject<HTMLDivElement | null>;
  typebar: RefObject<HTMLDivElement | null>;
};

/** Typebars fan out over this angle range around the pivot (degrees). */
export const FAN_HALF_ANGLE = 62;
export const FAN_BARS = 29;
/** Distance from the top edge of the machine body down to the typebar pivot. */
export const FAN_PIVOT_DEPTH = 210;
const FAN_OUTER = 188;
const FAN_INNER = 96;

export const fanAngle = (slot: number) => -FAN_HALF_ANGLE + (slot * 2 * FAN_HALF_ANGLE) / (FAN_BARS - 1);

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: 200 + r * Math.sin(a), y: FAN_PIVOT_DEPTH - r * Math.cos(a) };
};

function Fan() {
  const outerL = polar(FAN_OUTER + 10, -FAN_HALF_ANGLE - 4);
  const outerR = polar(FAN_OUTER + 10, FAN_HALF_ANGLE + 4);
  const innerL = polar(FAN_INNER - 12, -FAN_HALF_ANGLE - 4);
  const innerR = polar(FAN_INNER - 12, FAN_HALF_ANGLE + 4);
  const segment = `M${outerL.x} ${outerL.y} A${FAN_OUTER + 10} ${FAN_OUTER + 10} 0 0 1 ${outerR.x} ${outerR.y} L${innerR.x} ${innerR.y} A${FAN_INNER - 12} ${FAN_INNER - 12} 0 0 0 ${innerL.x} ${innerL.y} Z`;
  return (
    <svg className="fan" viewBox={`0 0 400 ${FAN_PIVOT_DEPTH}`} width="400" height={FAN_PIVOT_DEPTH} aria-hidden="true">
      <defs>
        <linearGradient id="bar" x1="0" x2="1">
          <stop offset="0" stopColor="#5b5650" />
          <stop offset="0.5" stopColor="#b9b2a7" />
          <stop offset="1" stopColor="#4a4642" />
        </linearGradient>
      </defs>
      <path d={segment} fill="#0d0b0a" stroke="#3b3632" strokeWidth="1" />
      {Array.from({ length: FAN_BARS }, (_, i) => {
        const deg = fanAngle(i);
        const a = polar(FAN_INNER, deg);
        const b = polar(FAN_OUTER, deg);
        const slug = polar(FAN_OUTER + 3, deg);
        return (
          <g key={i}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="url(#bar)" strokeWidth="2.4" strokeLinecap="round" />
            <rect x={slug.x - 4} y={slug.y - 3} width="8" height="6" rx="1" fill="#8f897f" transform={`rotate(${deg} ${slug.x} ${slug.y})`} />
          </g>
        );
      })}
    </svg>
  );
}

/**
 * The typewriter around the sheet: platen and knobs behind the paper, the paper
 * curling into the machine, the body with the typebar basket, and the card
 * guide + ribbon at the strike point. Purely decorative (aria-hidden); the
 * writer positions the parts imperatively in its layout pass.
 */
export function Machine({ refs }: { refs: MachineRefs }) {
  return (
    <>
      <div className="carriage carriage-back" ref={refs.carriageBack} aria-hidden="true">
        <div className="platen">
          <span className="knob knob-left" />
          <span className="knob knob-right" />
        </div>
      </div>
      <div className="carriage carriage-front" ref={refs.carriageFront} aria-hidden="true">
        <div className="paper-curl" />
      </div>
      <div className="machine-body" ref={refs.body} aria-hidden="true">
        <Fan />
      </div>
      <div className="guide" ref={refs.guide} aria-hidden="true">
        <div className="ribbon" ref={refs.ribbon} />
        <div className="card-holder" />
      </div>
      <div className="typebar" ref={refs.typebar} aria-hidden="true">
        <span className="typebar-slug" />
      </div>
    </>
  );
}
