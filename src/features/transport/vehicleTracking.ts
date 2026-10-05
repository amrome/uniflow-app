// Live vehicle tracking: simulated positions for 2 golf carts (on campus) and 2 shuttle buses
// (between SAB Station and the university gate). In production these would come from GPS hardware
// via Supabase realtime; here they loop along hand-drawn routes at realistic speeds.

import { CAMPUS_CENTER, SAB_STATION, type LngLat } from './campusMapData';

// ── Types ────────────────────────────────────────────────────────────────────

export type VehicleType = 'cart' | 'bus';
export type VehicleStatus = 'moving' | 'stopped' | 'arriving';

export type Vehicle = {
  id: string;
  type: VehicleType;
  /** Display name (bilingual). */
  name: { en: string; ar: string };
  /** Current position [lng, lat]. */
  position: LngLat;
  /** Heading in degrees (0 = north, 90 = east). */
  heading: number;
  status: VehicleStatus;
  /** Metres per second: carts ~10 km/h, buses ~40 km/h. */
  speed: number;
  /** Current human-readable location. */
  near: { en: string; ar: string };
  /** Simulated ETA to the campus center, in minutes. */
  etaMin: number;
  /** Accent colour for this vehicle's marker. */
  color: string;
};

// ── Route waypoints ──────────────────────────────────────────────────────────
// Each route is a loop: the vehicle drives from point 0 → 1 → 2 → … → last → 0 → …
// Coordinates traced from OpenStreetMap roads on the campus and the public road to SABB.

/** Golf cart route 1: loops around the main campus ring road (clockwise). */
const CART_ROUTE_1: LngLat[] = [
  [46.59180, 24.86330], // south-west corner
  [46.59220, 24.86270], // south side
  [46.59310, 24.86260], // south-east
  [46.59420, 24.86310], // east gate area
  [46.59450, 24.86360], // north-east
  [46.59400, 24.86410], // north side
  [46.59310, 24.86400], // north-west
  [46.59220, 24.86380], // west side
];

/** Golf cart route 2: smaller loop around the western buildings. */
const CART_ROUTE_2: LngLat[] = [
  [46.59050, 24.86240], // far west
  [46.59100, 24.86200], // south-west parking
  [46.59170, 24.86220], // south
  [46.59200, 24.86280], // center-south
  [46.59180, 24.86330], // center
  [46.59120, 24.86310], // west
];

/** Shuttle bus route: campus main gate ↔ SAB Station via the public road. */
const BUS_ROUTE: LngLat[] = [
  [46.59400, 24.86310], // campus main gate
  [46.59500, 24.86200], // exit road
  [46.59700, 24.85900], // Al Imam Saud Bin Faisal road
  [46.60100, 24.85400], // mid-way
  [46.60600, 24.84500], // approach
  [46.61000, 24.83700], // near station
  [46.61400, 24.83200], // SAB Station entrance
  SAB_STATION,           // SAB Station
];

// ── Named zones (for the "near" label) ───────────────────────────────────────

type Zone = { center: LngLat; radius: number; en: string; ar: string };

const ZONES: Zone[] = [
  { center: [46.59400, 24.86360], radius: 0.0012, en: 'Near Main Gate', ar: 'قرب البوابة الرئيسية' },
  { center: [46.59300, 24.86350], radius: 0.0010, en: 'Near Main Building', ar: 'قرب المبنى الرئيسي' },
  { center: [46.59180, 24.86300], radius: 0.0012, en: 'Near College of Engineering', ar: 'قرب كلية الهندسة' },
  { center: [46.59100, 24.86250], radius: 0.0012, en: 'Near Soccer Field', ar: 'قرب ملعب كرة القدم' },
  { center: [46.59250, 24.86400], radius: 0.0010, en: 'Near Library', ar: 'قرب المكتبة' },
  { center: CAMPUS_CENTER, radius: 0.003, en: 'On campus', ar: 'في الحرم الجامعي' },
  { center: SAB_STATION, radius: 0.003, en: 'Near SAB Station', ar: 'قرب محطة ساب' },
];

function nearestZone(pos: LngLat): { en: string; ar: string } {
  const [lng, lat] = pos;
  for (const z of ZONES) {
    const d = Math.hypot(lng - z.center[0], lat - z.center[1]);
    if (d < z.radius) return { en: z.en, ar: z.ar };
  }
  // Between campus and station
  return { en: 'En route', ar: 'في الطريق' };
}

// ── Simulation engine ────────────────────────────────────────────────────────

/** Interpolate between two points by fraction t ∈ [0, 1]. */
function lerp(a: LngLat, b: LngLat, t: number): LngLat {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Bearing from a → b in degrees (0 = north). */
function bearing(a: LngLat, b: LngLat): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

/** Approximate distance between two LngLat points, in "coordinate units" (good enough for interpolation). */
function dist(a: LngLat, b: LngLat): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** Rough ETA in minutes from a position to the campus center, assuming avg 30 km/h for buses, 8 km/h for carts. */
function estimateEta(pos: LngLat, type: VehicleType): number {
  // ~111 km per degree at this latitude
  const km = Math.hypot((pos[0] - CAMPUS_CENTER[0]) * 95, (pos[1] - CAMPUS_CENTER[1]) * 111);
  const speed = type === 'bus' ? 30 : 8; // km/h
  return Math.max(1, Math.round((km / speed) * 60));
}

type SimState = {
  route: LngLat[];
  /** Index of the waypoint the vehicle just left. */
  segment: number;
  /** 0–1 progress along the current segment. */
  progress: number;
  /** Speed in coordinate-units per tick. */
  speed: number;
  /** true = forward through waypoints, false = reverse (for bus ping-pong). */
  forward: boolean;
  /** Whether the route should ping-pong (bus) or loop (cart). */
  pingPong: boolean;
  /** Ticks to wait at a waypoint (simulates a stop). */
  waitTicks: number;
};

function initSim(route: LngLat[], startSegment: number, speed: number, pingPong: boolean): SimState {
  return {
    route,
    segment: startSegment % route.length,
    progress: 0,
    speed,
    forward: true,
    pingPong,
    waitTicks: 0,
  };
}

function tickSim(s: SimState): { position: LngLat; heading: number; status: VehicleStatus } {
  // Waiting at a stop
  if (s.waitTicks > 0) {
    s.waitTicks--;
    const a = s.route[s.segment];
    const next = s.forward
      ? s.route[(s.segment + 1) % s.route.length]
      : s.route[(s.segment - 1 + s.route.length) % s.route.length];
    return { position: a, heading: bearing(a, next), status: s.waitTicks > 0 ? 'stopped' : 'arriving' };
  }

  const from = s.route[s.segment];
  const nextIdx = s.forward
    ? (s.segment + 1) % s.route.length
    : (s.segment - 1 + s.route.length) % s.route.length;
  const to = s.route[nextIdx];
  const segLen = dist(from, to);
  const step = segLen > 0 ? s.speed / segLen : 1;
  s.progress += step;

  if (s.progress >= 1) {
    s.segment = nextIdx;
    s.progress = 0;
    // At each end of a ping-pong route, pause and reverse
    if (s.pingPong && (s.segment === 0 || s.segment === s.route.length - 1)) {
      s.forward = !s.forward;
      s.waitTicks = 8; // ~4 seconds pause at terminals
    }
    // Loop routes: short pause every 3 segments
    if (!s.pingPong && s.segment % 3 === 0) {
      s.waitTicks = 3;
    }
    return { position: s.route[s.segment], heading: bearing(from, to), status: 'arriving' };
  }

  const position = lerp(from, to, s.progress);
  return { position, heading: bearing(from, to), status: 'moving' };
}

// ── Public API ───────────────────────────────────────────────────────────────

const TICK_MS = 500;
// Speeds in coordinate-unit per tick (tuned for visual smoothness at 2 Hz).
const CART_SPEED = 0.00008;
const BUS_SPEED = 0.00035;

let sims: SimState[] | null = null;
let vehicles: Vehicle[] = [];
let listeners: Set<(v: Vehicle[]) => void> = new Set();
let timer: ReturnType<typeof setInterval> | null = null;

function makeVehicles(): Vehicle[] {
  return [
    {
      id: 'cart-1',
      type: 'cart',
      name: { en: 'Golf Cart 1', ar: 'عربة جولف 1' },
      position: CART_ROUTE_1[0],
      heading: 0,
      status: 'moving',
      speed: 10,
      near: { en: 'On campus', ar: 'في الحرم الجامعي' },
      etaMin: 1,
      color: '#2E7D33',
    },
    {
      id: 'cart-2',
      type: 'cart',
      name: { en: 'Golf Cart 2', ar: 'عربة جولف 2' },
      position: CART_ROUTE_2[0],
      heading: 0,
      status: 'moving',
      speed: 10,
      near: { en: 'On campus', ar: 'في الحرم الجامعي' },
      etaMin: 1,
      color: '#1565C0',
    },
    {
      id: 'bus-1',
      type: 'bus',
      name: { en: 'SAB Shuttle 1', ar: 'حافلة ساب 1' },
      position: BUS_ROUTE[0],
      heading: 0,
      status: 'moving',
      speed: 40,
      near: { en: 'Near Main Gate', ar: 'قرب البوابة الرئيسية' },
      etaMin: 1,
      color: '#F68938',
    },
    {
      id: 'bus-2',
      type: 'bus',
      name: { en: 'SAB Shuttle 2', ar: 'حافلة ساب 2' },
      position: BUS_ROUTE[BUS_ROUTE.length - 1],
      heading: 180,
      status: 'moving',
      speed: 40,
      near: { en: 'Near SAB Station', ar: 'قرب محطة ساب' },
      etaMin: 8,
      color: '#F68938',
    },
  ];
}

function tick() {
  if (!sims) return;
  for (let i = 0; i < sims.length; i++) {
    const { position, heading, status } = tickSim(sims[i]);
    vehicles[i] = {
      ...vehicles[i],
      position,
      heading,
      status,
      near: nearestZone(position),
      etaMin: estimateEta(position, vehicles[i].type),
    };
  }
  // Clone so React sees a new reference.
  const snapshot = [...vehicles];
  listeners.forEach((fn) => fn(snapshot));
}

/** Start the simulation. Returns the initial vehicle list. */
export function startTracking(): Vehicle[] {
  if (!sims) {
    vehicles = makeVehicles();
    sims = [
      initSim(CART_ROUTE_1, 0, CART_SPEED, false),
      initSim(CART_ROUTE_2, 3, CART_SPEED, false),
      initSim(BUS_ROUTE, 0, BUS_SPEED, true),
      initSim(BUS_ROUTE, BUS_ROUTE.length - 1, BUS_SPEED, true),
    ];
    // Start bus 2 heading toward campus
    sims[3].forward = false;
  }
  if (!timer) timer = setInterval(tick, TICK_MS);
  return vehicles;
}

/** Stop the simulation (e.g. when the map screen unmounts). */
export function stopTracking() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

/** Subscribe to position updates. Returns an unsubscribe function. */
export function onVehicleUpdate(fn: (v: Vehicle[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Get the current vehicle list without subscribing. */
export function getVehicles(): Vehicle[] {
  return vehicles;
}

/** All vehicle route polylines, for drawing on the map. */
export function getRoutes(): { id: string; type: VehicleType; color: string; path: LngLat[] }[] {
  return [
    { id: 'cart-route-1', type: 'cart', color: '#2E7D33', path: [...CART_ROUTE_1, CART_ROUTE_1[0]] },
    { id: 'cart-route-2', type: 'cart', color: '#1565C0', path: [...CART_ROUTE_2, CART_ROUTE_2[0]] },
    { id: 'bus-route', type: 'bus', color: '#F68938', path: BUS_ROUTE },
  ];
}
