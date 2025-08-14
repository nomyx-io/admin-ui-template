export function createChainSelector(React: any) {
    // Import the component directly (it has its own React import)
    const { ChainSelector } = require('./ChainSelector');
    
    // Return the component directly
    return ChainSelector;
}