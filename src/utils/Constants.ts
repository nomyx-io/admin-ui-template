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
}

enum NomyxAction {
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
