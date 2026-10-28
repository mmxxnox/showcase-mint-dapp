import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { rpcUrl, targetChain, walletConnectProjectId } from "./config";

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [
    injected(),
    ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId })] : []),
  ],
  transports: { [targetChain.id]: http(rpcUrl) } as Record<number, ReturnType<typeof http>>,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
