import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker, unregisterServiceWorker } from './register';

interface FakeServiceWorker {
  state: string;
  postMessage: ReturnType<typeof vi.fn>;
  addEventListener: (type: 'statechange', cb: () => void) => void;
  trigger: () => void;
}

interface FakeRegistration {
  installing: FakeServiceWorker | null;
  waiting: FakeServiceWorker | null;
  unregister: ReturnType<typeof vi.fn>;
  addEventListener: (type: 'updatefound', cb: () => void) => void;
  triggerUpdateFound: () => void;
}

function createFakeWorker(state = 'installing'): FakeServiceWorker {
  const listeners = new Set<() => void>();
  return {
    state,
    postMessage: vi.fn(),
    addEventListener: (_type, cb) => listeners.add(cb),
    trigger: () => listeners.forEach((cb) => cb()),
  };
}

function createFakeRegistration(opts: {
  waiting?: FakeServiceWorker | null;
  installing?: FakeServiceWorker | null;
} = {}): FakeRegistration {
  const updateListeners = new Set<() => void>();
  return {
    installing: opts.installing ?? null,
    waiting: opts.waiting ?? null,
    unregister: vi.fn().mockResolvedValue(true),
    addEventListener: (_type, cb) => updateListeners.add(cb),
    triggerUpdateFound: () => updateListeners.forEach((cb) => cb()),
  };
}

function setServiceWorker(value: unknown) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value,
    configurable: true,
  });
}

// Navigator.prototype 上の serviceWorker descriptor。
// 後続テストが汚染されないよう、各 afterEach で復元するために初回起動時に保存。
const navigatorProto = Object.getPrototypeOf(navigator) as Navigator;
const swProtoDescriptor = Object.getOwnPropertyDescriptor(
  navigatorProto,
  'serviceWorker',
);

function deleteServiceWorker() {
  // 'serviceWorker' in navigator が false になるよう、prototype と instance の
  // 両方から消す。afterEach で必ず復元する。
  Reflect.deleteProperty(navigatorProto, 'serviceWorker');
  Reflect.deleteProperty(navigator, 'serviceWorker');
}

function restoreServiceWorkerDescriptors(
  swDescriptor: PropertyDescriptor | undefined,
) {
  if (swProtoDescriptor) {
    Object.defineProperty(navigatorProto, 'serviceWorker', swProtoDescriptor);
  } else {
    Reflect.deleteProperty(navigatorProto, 'serviceWorker');
  }
  if (swDescriptor) {
    Object.defineProperty(navigator, 'serviceWorker', swDescriptor);
  } else {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  }
}

describe('registerServiceWorker', () => {
  const swDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    restoreServiceWorkerDescriptors(swDescriptor);
  });

  it('returns null when serviceWorker is unsupported', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    deleteServiceWorker();
    const result = await registerServiceWorker();
    expect(result).toBeNull();
  });

  it('does not register in development by default', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const register = vi.fn();
    setServiceWorker({ register, getRegistrations: vi.fn() });
    const result = await registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('registers in development when force=true', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const reg = createFakeRegistration();
    const register = vi.fn().mockResolvedValue(reg);
    setServiceWorker({ register, getRegistrations: vi.fn() });

    const onSuccess = vi.fn();
    const result = await registerServiceWorker({ force: true, onSuccess });
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(onSuccess).toHaveBeenCalledWith(reg);
    expect(result).toBe(reg);
  });

  it('sends SKIP_WAITING when a waiting worker exists at registration', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const waiting = createFakeWorker('installed');
    const reg = createFakeRegistration({ waiting });
    const register = vi.fn().mockResolvedValue(reg);
    setServiceWorker({ register, getRegistrations: vi.fn() });

    await registerServiceWorker();
    expect(waiting.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('fires onUpdate when a new worker becomes installed with an existing controller', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const installing = createFakeWorker('installing');
    const reg = createFakeRegistration();
    const register = vi.fn().mockResolvedValue(reg);
    setServiceWorker({
      register,
      controller: {},
      getRegistrations: vi.fn(),
    });

    const onUpdate = vi.fn();
    await registerServiceWorker({ onUpdate });

    reg.installing = installing;
    reg.triggerUpdateFound();
    installing.state = 'installed';
    installing.trigger();

    expect(onUpdate).toHaveBeenCalledWith(reg);
    expect(installing.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('returns null and warns when registration throws', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const register = vi.fn().mockRejectedValue(new Error('boom'));
    setServiceWorker({ register, getRegistrations: vi.fn() });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await registerServiceWorker();
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe('unregisterServiceWorker', () => {
  const swDescriptor = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');

  afterEach(() => {
    restoreServiceWorkerDescriptors(swDescriptor);
  });

  it('returns false when serviceWorker is unsupported', async () => {
    deleteServiceWorker();
    expect(await unregisterServiceWorker()).toBe(false);
  });

  it('unregisters all registrations', async () => {
    const reg1 = { unregister: vi.fn().mockResolvedValue(true) };
    const reg2 = { unregister: vi.fn().mockResolvedValue(true) };
    setServiceWorker({
      getRegistrations: vi.fn().mockResolvedValue([reg1, reg2]),
    });
    expect(await unregisterServiceWorker()).toBe(true);
    expect(reg1.unregister).toHaveBeenCalled();
    expect(reg2.unregister).toHaveBeenCalled();
  });
});
