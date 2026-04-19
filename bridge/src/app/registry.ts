import { ReceiverProvider } from "../providers/base.provider";

export class ProviderRegistry {
  private providers = new Map<string, ReceiverProvider>();
  private activeProvider: ReceiverProvider | null = null;

  register(provider: ReceiverProvider): void {
    this.providers.set(provider.id, provider);
  }

  list(): ReceiverProvider[] {
    return Array.from(this.providers.values());
  }

  get(id: string): ReceiverProvider | undefined {
    return this.providers.get(id);
  }

  async initAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.init();
    }
  }

  setActive(id: string): void {
    const candidate = this.providers.get(id) || null;
    if (candidate && !candidate.isAvailable()) {
      this.activeProvider = null;
      return;
    }
    this.activeProvider = candidate;
  }

  getActive(): ReceiverProvider | null {
    return this.activeProvider;
  }
}