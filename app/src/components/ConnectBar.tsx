import { useConnect, useConnection, useConnectors, useDisconnect, useSwitchChain } from "wagmi";
import { targetChain } from "../config";
import { friendlyError } from "../lib/errors";
import { shortAddress } from "../lib/format";

export function ConnectBar() {
  const { address, isConnected, chainId } = useConnection();
  const connectors = useConnectors();
  const connect = useConnect();
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();

  const wrongNetwork = isConnected && chainId !== targetChain.id;

  return (
    <header className="bar">
      <h1>Showcase NFT</h1>
      <div className="bar-actions">
        {isConnected && address ? (
          <>
            <span className="pill">{shortAddress(address)}</span>
            <button className="ghost" onClick={() => disconnect.mutate()}>
              Disconnect
            </button>
          </>
        ) : (
          connectors.map((connector) => (
            <button key={connector.uid} onClick={() => connect.mutate({ connector, chainId: targetChain.id })} disabled={connect.isPending}>
              {connect.isPending ? "Connecting…" : `Connect ${connector.name}`}
            </button>
          ))
        )}
      </div>
      {connect.error && <p className="notice error">{friendlyError(connect.error)}</p>}
      {wrongNetwork && (
        <p className="notice warn">
          Your wallet is on the wrong network.{" "}
          <button onClick={() => switchChain.mutate({ chainId: targetChain.id })} disabled={switchChain.isPending}>
            Switch to {targetChain.name}
          </button>
          {switchChain.error && <span> {friendlyError(switchChain.error)}</span>}
        </p>
      )}
    </header>
  );
}
