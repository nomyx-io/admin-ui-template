export function createConnectButton(React: any) {
    // Import the component directly (it has its own React import)
    const { ConnectButton } = require('./ConnectButton');
    
    // Return the component directly
    return ConnectButton;
}