import { Helmet } from "react-helmet";

const CSPMeta = () => (
  <Helmet>
    <meta
      httpEquiv="Content-Security-Policy"
      content={`
        default-src 'self';
        script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com https://code.jquery.com https://cdn.plaid.com;
        style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
        img-src 'self' data: blob: ${process.env.REACT_APP_PARSE_SERVER_URL} https://explorer-api.walletconnect.com/;
        font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;
        connect-src 'self' ${process.env.REACT_APP_PARSE_SERVER_URL} http://localhost:8337 ws://localhost:3000 wss://localhost:3000 wss://relay.walletconnect.org https://relay.walletconnect.org wss://relay.walletconnect.com https://relay.walletconnect.com https://api.web3modal.com https://pulse.walletconnect.com https://rpc.walletconnect.com https://rpc.walletconnect.org https://registry.walletconnect.com https://explorer-api.walletconnect.com https://notify.walletconnect.com https://base-mainnet.g.alchemy.com https://base-sepolia.g.alchemy.com https://opt-sepolia.g.alchemy.com https://rpc-plume-testnet-1.t.conduit.xyz https://rpc-plume-mainnet-1.t.conduit.xyz https://sepolia.basescan.org https://basescan.org https://optimistic.etherscan.io https://sepolia-optimism.etherscan.io wss://www.walletlink.org/rpc https://imagedelivery.net https://walletconnect.com https://walletconnect.org;
        frame-src 'self' https://verify.walletconnect.org https://verify.walletconnect.com https://inquiry.withpersona.com;
        child-src 'self' https://verify.walletconnect.org https://verify.walletconnect.com https://inquiry.withpersona.com;
        worker-src 'self' blob:;
        manifest-src 'self';
        media-src 'self';
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        upgrade-insecure-requests;
      `}
    />
  </Helmet>
);

export default CSPMeta;
