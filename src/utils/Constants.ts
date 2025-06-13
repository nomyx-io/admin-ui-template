enum NomyxEvent {
  ClaimTopicAdded = "ClaimTopicAdded",
  ClaimTopicRemoved = "ClaimTopicRemoved",
  TrustedIssuerAdded = "TrustedIssuerAdded",
  TrustedIssuerRemoved = "TrustedIssuerRemoved",
  ClaimTopicsUpdated = "ClaimTopicsUpdated",
  ClaimRequested = "ClaimRequested",
  ClaimAdded = "ClaimAdded",
  ClaimRemoved = "ClaimRemoved",
  IdentityAdded = "IdentityAdded",
  IdentityRemoved = "IdentityRemoved",
  IdentityCountryUpdated = "IdentityCountryUpdated",
  WalletLinked = "WalletLinked",
  WalletUnlinked = "WalletUnlinked",
  // New events for Address Book and Transactions
  AddressBookEntryAdded = "AddressBookEntryAdded",
  AddressBookEntryUpdated = "AddressBookEntryUpdated",
  AddressBookEntryRemoved = "AddressBookEntryRemoved",
  TransactionRecorded = "TransactionRecorded",
  TransactionStatusUpdated = "TransactionStatusUpdated",
}

enum NomyxAction {
  // Existing actions
  CreateClaimTopic,
  ViewClaimTopic,
  CreateTrustedIssuer,
  RemoveTrustedIssuer,
  UpdateClaimTopics,
  CreateIdentity,
  CreatePendingIdentity,
  ViewIdentity,
  ViewPendingIdentity,
  RemoveIdentity,
  RemoveUser,
  EditClaims,
  AddClaims,

  // New Address Book actions
  CreateAddressBookEntry,
  ViewAddressBookEntry,
  EditAddressBookEntry,
  DeleteAddressBookEntry,

  // New Transaction History actions
  ViewTransaction,
  ExportTransaction,
  ExportAllTransactions,

  // New utility actions
  ClearFilters,
  RefreshData,
  ImportData,

  //Functions Claims
  SetFunctionClaims,
  UpdateFunctionClaims,
  DeleteFunctionClaims,
}

enum WalletPreference {
  MANAGED,
  PRIVATE,
}

enum LoginPreference {
  USERNAME_PASSWORD,
  WALLET,
}

export { NomyxEvent, NomyxAction, WalletPreference, LoginPreference };
